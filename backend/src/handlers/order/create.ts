import type { NextFunction, Response } from 'express';
import { validationResult } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import pool from '../../db/connection';
import type { AuthRequest } from '../../middleware/auth';
import { createError } from '../../middleware/errorHandler';
import type { Order } from './types';

export async function create(
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<Response | void> {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const { id: userId } = req.user || {};
        const { productId } = req.body;

        // Check if sale is active
        const saleResult = await pool.query(
            `
            SELECT
                fs.flash_sale_id, fs.start_date, fs.end_date
            FROM
                flash_sales fs
            WHERE
                fs.product_id = $1 AND fs.start_date <= NOW() AND fs.end_date >= NOW()
            `,
            [productId]
        );

        if (saleResult.rows.length === 0) {
            return res.status(400).json({ error: 'Sale is not active' });
        }

        // Check if user already purchased
        const existingOrder = await pool.query<Pick<Order, 'order_id'>>(
            'SELECT order_id FROM orders WHERE user_id = $1 AND product_id = $2',
            [userId, productId]
        );

        if (existingOrder.rows.length > 0) {
            return res.status(400).json({ error: 'Already purchased' });
        }

        // // Generate order ID and token
        const orderId = uuidv4();
        const reservedToken = uuidv4();
        const status = 'pending';

        // Create order in database
        await pool.query<Order>(
            'INSERT INTO orders (order_id, product_id, user_id, reserved_token, status) VALUES ($1, $2, $3, $4, $5)',
            [orderId, productId, userId, reservedToken, status]
        );

        // // Try to reserve stock token from Redis
        // const stockKey = `stock:${productId}`;
        // const reserved = await redisClient.decr(stockKey);

        // if (reserved < 0) {
        //     // Restore the token if we went below 0
        //     await redisClient.incr(stockKey);
        //     return res.status(400).json({ error: 'Product sold out' });
        // }

        // // Generate order ID and token
        // const orderId = uuidv4();
        // const reservedToken = uuidv4();

        // // Publish order creation task to queue
        // await publishToQueue('order_queue', {
        //     orderId,
        //     productId,
        //     userId,
        //     reservedToken,
        //     timestamp: new Date().toISOString(),
        // });

        res.json({
            oder_id: orderId,
            product_id: productId,
            status,
        });
    } catch (error) {
        console.error('Purchase attempt error:', error);
        return next(createError('Purchase attempt failed', 500));
    }
}
