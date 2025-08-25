import type { NextFunction, Response } from 'express';
import { validationResult } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import pool from '../../db/connection';
import type { AuthRequest } from '../../middleware/auth';
import { createError } from '../../middleware/errorHandler';
import { publishToQueue } from '../../services/rabbitmq';
import redisClient from '../../services/redis';
import { getStockKey, getUniqueOrderKey } from '../../utils';

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

        // Check if stock exists
        const stockCount = await redisClient.lLen(getStockKey(productId));

        if (!stockCount) {
            return res.status(400).json({ error: 'Product sold out' });
        }

        const existingOrder = await redisClient.get(
            getUniqueOrderKey({ product_id: productId, user_id: userId || '' })
        );

        if (existingOrder) {
            return res.status(400).json({ error: 'Already purchased' });
        }

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

        // Try to reserve stock token from Redis
        const reserved = await redisClient.lPop(getStockKey(productId));

        if (!reserved) {
            return res.status(400).json({ error: 'Product sold out' });
        }

        // // Generate order ID and token
        const orderId = uuidv4();
        const status = 'pending';

        await redisClient.set(
            getUniqueOrderKey({ product_id: productId, user_id: userId || '' }),
            orderId
        );

        // Publish order creation task to queue
        await publishToQueue('order_queue', {
            order_id: orderId,
            product_id: productId,
            user_id: userId,
            reserved_token: reserved,
            timestamp: new Date().toISOString(),
        });

        return res.json({
            oder_id: orderId,
            product_id: productId,
            status,
        });
    } catch (error) {
        console.error('Purchase attempt error:', error);
        return next(createError('Purchase attempt failed', 500));
    }
}
