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
}

export async function get(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<Response | void> {
    try {
        let sale: SaleProduct;

        const cachedFlashSale = await redisClient.get(FLASH_SALE_REDIS_KEY);
        if (cachedFlashSale) {
            sale = JSON.parse(cachedFlashSale) as SaleProduct;
        } else {
            // Get current flash sale
            const saleResult = await pool.query<SaleProduct>(`
                SELECT fs.flash_sale_id, fs.start_date, fs.end_date, p.product_id, p.quantity
                FROM flash_sales fs
                INNER JOIN products p ON fs.product_id = p.product_id
                LIMIT 1
            `);
            if (saleResult.rows.length === 0) {
                return next(createError('Flash sale not found', 500));
            }
            sale = saleResult.rows[0];
            await redisClient.set(FLASH_SALE_REDIS_KEY, JSON.stringify(sale));
        }

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

        // // Get remaining stock from Redis
        const remainingStock = await redisClient.LLEN(getStockKey(sale.product_id));
        const stockCount = remainingStock;

        return res.json({
            productId: sale.product_id,
            status,
            remainingStock: stockCount,
            startDate: sale.start_date,
            endDate: sale.end_date,
        });
    } catch (error) {
        console.error(error);
        return next(createError('Failed to fetch sale status', 500));
    }
}
