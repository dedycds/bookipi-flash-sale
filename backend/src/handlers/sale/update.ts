import type { NextFunction, Request, Response } from 'express';
import pool from '../../db/connection';
import { FLASH_SALE_ID, FLASH_SALE_REDIS_KEY, PRODUCT_ID } from '../../globals';
import { createError } from '../../middleware/errorHandler';
import redisClient from '../../services/redis';
import { getStockKey } from '../../utils';
import { generateTokens } from '../../utils/generateTokens';

export async function update(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<Response | void> {
    try {
        const { start_date, end_date } = req.body;

        const result = await pool.query<{ product_id: string; quantity: number }>(
            `SELECT product_id, quantity FROM products WHERE product_id = $1`,
            [PRODUCT_ID]
        );

        if (result.rowCount === 0) {
            return next(createError('Invalid product id', 400));
        }

        const { quantity } = result.rows[0];

        await pool.query(
            `
            UPDATE
                flash_sales
            SET
                start_date = $1,
                end_date = $2
            WHERE
                flash_sale_id = $3
            `,
            [start_date, end_date, FLASH_SALE_ID]
        );

        await redisClient.del(FLASH_SALE_REDIS_KEY);
        await redisClient.del(getStockKey(PRODUCT_ID));
        await redisClient.rPush(getStockKey(PRODUCT_ID), generateTokens(quantity));

        return res.json({
            product_id: PRODUCT_ID,
            start_date,
            end_date,
            flash_sale_id: FLASH_SALE_ID,
        });
    } catch (error) {
        console.error(error);
        return next(createError('Failed to create sale', 500));
    }
}
