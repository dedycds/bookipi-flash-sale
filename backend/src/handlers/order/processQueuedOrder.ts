import pool from '../../db/connection';
import redisClient from '../../services/redis';
import { getStockKey, getUniqueOrderKey } from '../../utils';
import { Order } from './types';

/**
 * Processes an order that has been queued for execution.
 *
 * Workflow:
 * 1. Insert the order into the database with status "completed".
 * 2. If the DB insert fails, clean up Redis by:
 *    - Releasing the reserved stock token back into the stock list.
 *    - Removing the pending order key for the user/product combo.
 *
 * This ensures consistency between Redis (stock + pending orders) and the database.
 */
export async function processQueuedOrder(order: Order) {
    const { order_id, product_id, user_id, reserved_token } = order;
    try {
        // Attempt to create the order in the database.
        await pool.query(
            `INSERT INTO orders
            (order_id, product_id, user_id, reserved_token, status)
            VALUES ($1, $2, $3, $4, $5)`,
            [order_id, product_id, user_id, reserved_token, 'completed']
        );
    } catch (error) {
        console.error('Fail to create order - clean up the redis', error);

        // If DB insert fails:
        // 1. Push the reserved token back to Redis stock list
        await redisClient.lPush(getStockKey(product_id), reserved_token);

        // 2. Remove the user’s pending order key from Redis
        await redisClient.del(getUniqueOrderKey({ product_id, user_id }));
    }
}
