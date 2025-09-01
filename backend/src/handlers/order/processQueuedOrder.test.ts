import pool from '../../db/connection';
import redisClient from '../../services/redis';
import { getStockKey, getUniqueOrderKey } from '../../utils';
import { processQueuedOrder } from './processQueuedOrder';
import { Order } from './types';

jest.mock('../../db/connection');
jest.mock('../../services/redis');
jest.mock('../../utils');

const MOCK_ORDER: Order = {
    order_id: 'order123',
    product_id: 'prod456',
    user_id: 'user789',
    reserved_token: 'tokenABC',
    status: 'pending',
    created_at: new Date(),
};

const MOCK_STOCK_KEY = 'stock:prod456';
const MOCK_ORDER_KEY = 'order:prod456:user789';

describe('processQueuedOrder', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (getStockKey as jest.Mock).mockReturnValue(MOCK_STOCK_KEY);
        (getUniqueOrderKey as jest.Mock).mockReturnValue(MOCK_ORDER_KEY);
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    it('should insert order successfully and skip redis cleanup', async () => {
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

    it('should clean up redis if DB insert fails', async () => {
        (pool.query as jest.Mock).mockRejectedValueOnce(new Error('DB error'));
        (redisClient.lPush as jest.Mock).mockResolvedValueOnce(undefined);
        (redisClient.del as jest.Mock).mockResolvedValueOnce(undefined);

        await processQueuedOrder(MOCK_ORDER);

        expect(redisClient.lPush).toHaveBeenCalledWith(MOCK_STOCK_KEY, MOCK_ORDER.reserved_token);
        expect(redisClient.del).toHaveBeenCalledWith(MOCK_ORDER_KEY);
    });
});
