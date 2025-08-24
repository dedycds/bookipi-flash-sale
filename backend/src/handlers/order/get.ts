import type { NextFunction, Response } from 'express';
import pool from '../../db/connection';
import type { AuthRequest } from '../../middleware/auth';
import { createError } from '../../middleware/errorHandler';

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
                user_id = $1
            ORDER BY created_at DESC`,
            [id]
        );

        res.status(200).json(result.rows);
    } catch (error: unknown) {
        console.error('getOrder', error);
        return next(createError('Internal error', 500));
    }
}
