import type { NextFunction, Response } from 'express';
import pool from '../../db/connection';
import { PRODUCT_ID } from '../../globals';
import type { AuthRequest } from '../../middleware/auth';
import { createError } from '../../middleware/errorHandler';
import redisClient from '../../services/redis';
import { getUniqueOrderKey } from '../../utils';

export interface Order {
    order_id: string;
    product_id: string;
    status: string;
    created_at: Date;
}
export async function get(
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<Response | void> {
    try {
        const { id } = req.user || {};

        const result = await pool.query<Order>(
            `SELECT
                order_id, product_id, status, created_at
            FROM orders
            WHERE
                user_id = $1 AND
                product_id = $2
            ORDER BY created_at DESC`,
            [id, PRODUCT_ID]
        );

        // when no order, check on redis to see pending order
        // otherwise return null
        if (result.rowCount === 0) {
            const existingOrder = await redisClient.get(
                getUniqueOrderKey({ product_id: PRODUCT_ID, user_id: id || '' })
            );

            if (!existingOrder) {
                return res.json(null);
            }

            return res.status(200).json({
                order_id: existingOrder,
                product_id: PRODUCT_ID,
                user_id: id,
                status: 'pending',
            });
        }

        return res.status(200).json(result.rows[0]);
    } catch (error: unknown) {
        console.error('getOrder', error);
        return next(createError('Internal error', 500));
    }
}
