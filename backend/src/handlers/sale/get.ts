import type { NextFunction, Request, Response } from 'express';
import pool from '../../db/connection';
import { FLASH_SALE_REDIS_KEY } from '../../globals';
import { createError } from '../../middleware/errorHandler';
import redisClient from '../../services/redis';
import { getStockKey } from '../../utils';

interface SaleProduct {
    flash_sale_id: string;
    start_date: Date;
    end_date: Date;
    product_id: string;
    quantity: number;
    price_in_cent: number;
    name: string;
}

/**
 * Flash Sale Status Handler
 * -------------------------
 * Retrieves flash sale details, including product info, timing, status,
 * and remaining stock. Uses Redis for caching to reduce DB load.
 *
 * Flow:
 * 1. Check Redis cache for existing flash sale data.
 * 2. If not cached, query PostgreSQL for current flash sale.
 * 3. Save flash sale data to Redis for future requests.
 * 4. Determine the current sale status (upcoming, active, ended).
 * 5. Fetch remaining stock from Redis list (inventory bucket).
 * 6. Respond with flash sale details and computed status.
 */
export async function get(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<Response | void> {
    try {
        let sale: SaleProduct;

        // Try to fetch flash sale details from Redis cache
        const cachedFlashSale = await redisClient.get(FLASH_SALE_REDIS_KEY);
        if (cachedFlashSale) {
            // Parse cached sale data
            sale = JSON.parse(cachedFlashSale) as SaleProduct;
        } else {
            // Query database for current flash sale (with product details)
            const saleResult = await pool.query<SaleProduct>(`
                SELECT
                    fs.flash_sale_id,
                    fs.start_date,
                    fs.end_date,
                    p.product_id,
                    p.quantity,
                    p.name,
                    p.price_in_cent
                FROM flash_sales fs
                INNER JOIN products p ON fs.product_id = p.product_id
                LIMIT 1
            `);

            // If no flash sale is found, return error
            if (saleResult.rows.length === 0) {
                return next(createError('Flash sale not found', 500));
            }

            // Use first flash sale result
            sale = saleResult.rows[0];

            // Cache the result in Redis for subsequent requests
            await redisClient.set(FLASH_SALE_REDIS_KEY, JSON.stringify(sale));
        }

        // Determine current sale status based on start and end times
        const now = new Date();
        const startDate = new Date(sale.start_date);
        const endDate = new Date(sale.end_date);

        let status: 'upcoming' | 'active' | 'ended';
        if (now < startDate) {
            status = 'upcoming';
        } else if (now >= startDate && now <= endDate) {
            status = 'active';
        } else {
            status = 'ended';
        }

        // Get remaining stock count from Redis list (inventory tokens)
        const remainingStock = await redisClient.LLEN(getStockKey(sale.product_id));

        // Respond with sale details, status, and stock
        return res.json({
            ...sale,
            status,
            remaining_stock: remainingStock,
        });
    } catch (error) {
        // Log error and forward to error handler
        console.error(error);
        return next(createError('Failed to fetch sale status', 500));
    }
}
