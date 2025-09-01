/**
 * Flash Sale Order Creation Handler
 * ---------------------------------
 * This controller handles incoming purchase requests during a flash sale event.
 * It performs the following steps:
 *   1. Verify available stock in Redis (acts as an inventory token bucket).
 *   2. Prevent duplicate purchases by checking existing orders.
 *   3. Confirm that the flash sale is currently active from the database.
 *   4. Reserve stock atomically by removing one token from Redis.
 *   5. Generate a new order ID and mark order as pending.
 *   6. Store unique order mapping in Redis to avoid duplicates.
 *   7. Publish order creation event to RabbitMQ for asynchronous processing.
 *   8. Respond with order details to the client.
 *
 * Error Handling:
 * - Returns proper 400 responses for invalid requests, sold-out products,
 *   inactive sales, and duplicate purchases.
 * - On unexpected failures, logs error and passes a 500 error to Express.
 */

import type { NextFunction, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../../db/connection';
import type { AuthRequest } from '../../middleware/auth';
import { createError } from '../../middleware/errorHandler';
import { publishToQueue } from '../../services/rabbitmq';
import redisClient from '../../services/redis';
import { getStockKey, getUniqueOrderKey } from '../../utils';

export const ERROR_MESSAGES = {
    PRODUCT_SOLD_OUT: 'Product sold out',
    ALREADY_PURCHASED: 'Already purchased',
    SALE_NOT_ACTIVE: 'Sale is not active',
};

export async function create(
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<Response | void> {
    try {
        // Extract userId from request (authenticated user)
        const { id: userId } = req.user || {};
        const { productId } = req.body;

        // Check if stock exists in Redis list (acts as inventory counter)
        const stockCount = await redisClient.lLen(getStockKey(productId));
        if (!stockCount) {
            return res.status(400).json({ error: ERROR_MESSAGES.PRODUCT_SOLD_OUT });
        }

        // Prevent duplicate purchases by checking if order already exists for user & product
        const existingOrder = await redisClient.get(
            getUniqueOrderKey({ product_id: productId, user_id: userId || '' })
        );
        if (existingOrder) {
            return res.status(400).json({ error: ERROR_MESSAGES.ALREADY_PURCHASED });
        }

        // Verify if product sale is currently active in database
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
            return res.status(400).json({ error: ERROR_MESSAGES.SALE_NOT_ACTIVE });
        }

        // Attempt to reserve stock token by popping from Redis list
        const reserved = await redisClient.lPop(getStockKey(productId));
        if (!reserved) {
            return res.status(400).json({ error: ERROR_MESSAGES.PRODUCT_SOLD_OUT });
        }

        // Generate order ID and set initial status
        const orderId = uuidv4();
        const status = 'pending';

        // Save order reference in Redis to prevent duplicate purchases
        await redisClient.set(
            getUniqueOrderKey({ product_id: productId, user_id: userId || '' }),
            orderId
        );

        // Publish order creation event to RabbitMQ for async processing
        await publishToQueue('order_queue', {
            order_id: orderId,
            product_id: productId,
            user_id: userId,
            reserved_token: reserved,
            timestamp: new Date().toISOString(),
        });

        // Respond to client with order details
        return res.status(200).json({
            oder_id: orderId,
            product_id: productId,
            status,
        });
    } catch (error) {
        // Log and handle unexpected errors
        console.error('Purchase attempt error:', error);
        return next(createError('Purchase attempt failed', 500));
    }
}
