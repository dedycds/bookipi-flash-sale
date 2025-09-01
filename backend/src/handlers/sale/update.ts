import type { NextFunction, Request, Response } from 'express';
import pool from '../../db/connection';
import { FLASH_SALE_ID, FLASH_SALE_REDIS_KEY, PRODUCT_ID } from '../../globals';
import { createError } from '../../middleware/errorHandler';
import redisClient from '../../services/redis';
import { getStockKey } from '../../utils';
import { generateTokens } from '../../utils/generateTokens';

/**
 * Controller to update flash sale details (start/end dates and stock).
 *
 * Workflow:
 *  1. Verify the product exists in the database.
 *  2. Update the flash sale record with the new start/end dates.
 *  3. Refresh Redis state:
 *      - Clear cached flash sale metadata.
 *      - Clear old stock tokens.
 *      - Push new stock tokens (if quantity provided).
 *  4. Respond with updated flash sale details.
 *
 * Error handling:
 *  - If product does not exist, return 400 error.
 *  - If any DB or Redis operation fails, return 500 error.
 */
export async function update(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<Response | void> {
    try {
        const { start_date, end_date, quantity: input_quantity } = req.body;

        /** Step 1: Verify product exists in DB */
        const result = await pool.query<{ product_id: string; quantity: number }>(
            `SELECT product_id, quantity FROM products WHERE product_id = $1`,
            [PRODUCT_ID]
        );

        if (result.rowCount === 0) {
            // Product not found → forward 400 error
            return next(createError('Invalid product id', 400));
        }

        /** Step 2: Update flash sale metadata (dates only) */
        const updateFlashSaleQuery = pool.query(
            `
            UPDATE flash_sales
            SET start_date = $1, end_date = $2
            WHERE flash_sale_id = $3
            `,
            [start_date, end_date, FLASH_SALE_ID]
        );

        /** Step 3: Reset Redis cache and stock tokens */
        await Promise.all([
            updateFlashSaleQuery,
            // Clear cached flash sale metadata
            redisClient.del(FLASH_SALE_REDIS_KEY),
            // Clear old stock tokens
            redisClient.del(getStockKey(PRODUCT_ID)),
            // Push new tokens if quantity provided
            input_quantity
                ? redisClient.rPush(getStockKey(PRODUCT_ID), generateTokens(input_quantity))
                : Promise.resolve(),
        ]);

        /** Step 4: Return updated flash sale response */
        return res.json({
            product_id: PRODUCT_ID,
            start_date,
            end_date,
            flash_sale_id: FLASH_SALE_ID,
            quantity: input_quantity,
        });
    } catch (error) {
        // Any DB/Redis error is treated as 500
        console.error(error);
        return next(createError('Failed to create sale', 500));
    }
}
