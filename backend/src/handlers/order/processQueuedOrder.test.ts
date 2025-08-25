import pool from '../../db/connection';
import redisClient from '../../services/redis';
import { getStockKey, getUniqueOrderKey } from '../../utils';
import { processQueuedOrder } from './processQueuedOrder';
import { Order } from './types';

jest.mock('../../../src/db/connection');
jest.mock('../../../src/services/redis');
jest.mock('../../utils');

const MOCK_ORDER = {
    order_id: 'order123',
    product_id: 'prod456',
    user_id: 'user789',
    reserved_token: 'tokenABC',
} as Order;

const MOCK_STOCK_KEY = 'stock:prod456';
const MOCK_ORDER_KEY = 'order:prod456:user789';

describe('processQueuedOrder', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (getStockKey as jest.Mock).mockReturnValue(MOCK_STOCK_KEY);
        (getUniqueOrderKey as jest.Mock).mockReturnValue(MOCK_ORDER_KEY);
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    it('should insert order and not call redis cleanup on success', async () => {
        (pool.query as jest.Mock).mockResolvedValueOnce({});
        (redisClient.lPush as jest.Mock).mockResolvedValueOnce(undefined);
        (redisClient.del as jest.Mock).mockResolvedValueOnce(undefined);

        await processQueuedOrder(MOCK_ORDER);

        expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO orders'), [
            MOCK_ORDER.order_id,
            MOCK_ORDER.product_id,
            MOCK_ORDER.user_id,
            MOCK_ORDER.reserved_token,
            'completed',
        ]);
        expect(redisClient.lPush).not.toHaveBeenCalled();
        expect(redisClient.del).not.toHaveBeenCalled();
    });

    it('should call redis cleanup methods on DB error', async () => {
        (pool.query as jest.Mock).mockRejectedValueOnce(new Error('DB error'));
        (redisClient.lPush as jest.Mock).mockResolvedValueOnce(undefined);
        (redisClient.del as jest.Mock).mockResolvedValueOnce(undefined);

        await processQueuedOrder(MOCK_ORDER);

        expect(redisClient.lPush).toHaveBeenCalledWith(MOCK_STOCK_KEY, MOCK_ORDER.reserved_token);
        expect(redisClient.del).toHaveBeenCalledWith(MOCK_ORDER_KEY);
    });
});
