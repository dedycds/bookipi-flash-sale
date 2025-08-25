import pool from '../../db/connection';
import redisClient from '../../services/redis';
import { getStockKey, getUniqueOrderKey } from '../../utils';
import { Order } from './types';

export async function processQueuedOrder(order: Order) {
    const { order_id, product_id, user_id, reserved_token } = order;
    try {
        // Create order in database
        await pool.query(
            `INSERT INTO orders
            (order_id, product_id, user_id, reserved_token, status)
            VALUES ($1, $2, $3, $4, $5)`,
            [order_id, product_id, user_id, reserved_token, 'completed']
        );
    } catch (error) {
        console.error('Fail to create order - clean up the redis', error);
        // release the token
        await redisClient.lPush(getStockKey(product_id), reserved_token);
        // remove the order token check
        await redisClient.del(getUniqueOrderKey({ product_id, user_id }));
    }
}
