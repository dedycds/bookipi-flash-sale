import type { NextFunction, Response } from 'express';
import pool from '../../db/connection';
import { PRODUCT_ID } from '../../globals';
import type { AuthRequest } from '../../middleware/auth';
import { createError } from '../../middleware/errorHandler';
import redisClient from '../../services/redis';
import { getUniqueOrderKey } from '../../utils';
import type { Order } from './types';

/**
 * GET /orders
 *
 * Retrieves the most recent order for the authenticated user.
 *
 * Workflow:
 * 1. Query the database for orders matching the current user and product.
 * 2. If no orders exist in the DB, check Redis for a pending order (not yet persisted).
 * 3. Return either:
 *    - The most recent DB order.
 *    - A pending order from Redis.
 *    - `null` if no order is found at all.
 *
 * Error Handling:
 * - Logs unexpected errors and passes a standardized error object to `next()`.
 */
export async function get(
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<Response | void> {
    try {
        // Get the authenticated user ID from the request
        const { id } = req.user || {};

        // Query the database for existing orders of this product for the user
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

        // If no DB orders are found, check Redis for a "pending" order
        if (result.rowCount === 0) {
            const existingOrder = await redisClient.get(
                getUniqueOrderKey({ product_id: PRODUCT_ID, user_id: id || '' })
            );

            // If no Redis entry either, return null (no orders at all)
            if (!existingOrder) {
                return res.json(null);
            }

            // Return the pending Redis order
            return res.status(200).json({
                order_id: existingOrder,
                product_id: PRODUCT_ID,
                user_id: id,
                status: 'pending',
            });
        }

        // Return the most recent order found in the database
        return res.status(200).json(result.rows[0]);
    } catch (error: unknown) {
        // Log the error for debugging and return a standardized error response
        console.error('getOrder', error);
        return next(createError('Internal error', 500));
    }
}
