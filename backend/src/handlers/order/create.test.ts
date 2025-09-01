import { validationResult } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import pool from '../../db/connection';
import { AuthRequest } from '../../middleware/auth';
import { createError } from '../../middleware/errorHandler';
import { publishToQueue } from '../../services/rabbitmq';
import redisClient from '../../services/redis';
import { getStockKey, getUniqueOrderKey } from '../../utils';
import { create, ERROR_MESSAGES } from './create';

jest.mock('express-validator', () => ({
    validationResult: jest.fn(),
}));
jest.mock('../../db/connection');
jest.mock('../../services/redis');
jest.mock('../../services/rabbitmq');
jest.mock('../../utils', () => ({
    getStockKey: jest.fn(),
    getUniqueOrderKey: jest.fn(),
}));
jest.mock('../../middleware/errorHandler');
jest.mock('uuid', () => ({
    v4: jest.fn(),
}));

const mockRes = () => {
    const res: any = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

const mockNext = jest.fn();
// Common mock variables to avoid magic strings
const USER_ID = 'user-1';
const PRODUCT_ID = 'prod-1';
const ORDER_ID = 'order-uuid';
const RESERVED_TOKEN = 'token-1';
const UNIQUE_ORDER_KEY = 'unique-order-key';
const STOCK_KEY = 'stock-key';
const QUEUE_NAME = 'order_queue';
const DB_ERROR_MESSAGE = 'DB error';

describe('create order handler', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (getStockKey as jest.Mock).mockReturnValue(STOCK_KEY);
        (getUniqueOrderKey as jest.Mock).mockReturnValue(UNIQUE_ORDER_KEY);
        (validationResult as unknown as jest.Mock).mockReturnValue({
            isEmpty: () => true,
            array: () => [],
        });
        (pool.query as jest.Mock).mockResolvedValue({ rows: [{}] });
        (uuidv4 as jest.Mock).mockImplementation(() => ORDER_ID);
        (redisClient.lLen as jest.Mock).mockResolvedValue(1);
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    it('should return 400 if stock does not exist', async () => {
        (redisClient.lLen as jest.Mock).mockResolvedValue(0);

        const req: any = { user: { id: USER_ID }, body: { productId: PRODUCT_ID } };
        const res = mockRes();

        await create(req, res, mockNext);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: ERROR_MESSAGES.PRODUCT_SOLD_OUT });
    });

    it('should return 400 if already purchased', async () => {
        (redisClient.get as jest.Mock).mockResolvedValue(ORDER_ID);

        const req: any = { user: { id: USER_ID }, body: { productId: PRODUCT_ID } };
        const res = mockRes();

        await create(req, res, mockNext);

        expect(redisClient.get).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: ERROR_MESSAGES.ALREADY_PURCHASED });
    });

    it('should return 400 if sale is not active', async () => {
        (redisClient.get as jest.Mock).mockResolvedValue(null);
        (pool.query as jest.Mock).mockResolvedValue({ rows: [] });

        const req: any = { user: { id: USER_ID }, body: { productId: PRODUCT_ID } };
        const res = mockRes();

        await create(req, res, mockNext);

        expect(pool.query).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: ERROR_MESSAGES.SALE_NOT_ACTIVE });
    });

    it('should return 400 if product sold out when reserving token', async () => {
        (redisClient.get as jest.Mock).mockResolvedValue(null);
        (redisClient.lPop as jest.Mock).mockResolvedValue(null);

        const req = { user: { id: USER_ID }, body: { productId: PRODUCT_ID } } as AuthRequest;
        const res = mockRes();

        await create(req, res, mockNext);

        expect(redisClient.lPop).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: ERROR_MESSAGES.PRODUCT_SOLD_OUT });
    });

    it('should create order and return order info', async () => {
        (redisClient.get as jest.Mock).mockResolvedValue(null);
        (redisClient.lPop as jest.Mock).mockResolvedValue(RESERVED_TOKEN);
        (redisClient.set as jest.Mock).mockResolvedValue('OK');
        (publishToQueue as jest.Mock).mockResolvedValue(undefined);

        const req: any = { user: { id: USER_ID }, body: { productId: PRODUCT_ID } };
        const res = mockRes();

        await create(req, res, mockNext);

        expect(redisClient.set).toHaveBeenCalledWith(UNIQUE_ORDER_KEY, ORDER_ID);
        expect(publishToQueue).toHaveBeenCalledWith(
            QUEUE_NAME,
            expect.objectContaining({
                order_id: ORDER_ID,
                product_id: PRODUCT_ID,
                user_id: USER_ID,
                reserved_token: RESERVED_TOKEN,
            })
        );
        expect(res.json).toHaveBeenCalledWith({
            oder_id: ORDER_ID,
            product_id: PRODUCT_ID,
            status: 'pending',
        });
    });

    it('should call next with error on exception', async () => {
        (pool.query as jest.Mock).mockRejectedValue(new Error(DB_ERROR_MESSAGE));
        (createError as jest.Mock).mockReturnValue('custom-error');

        const req: any = { user: { id: USER_ID }, body: { productId: PRODUCT_ID } };
        const res = mockRes();

        await create(req, res, mockNext);

        expect(mockNext).toHaveBeenCalledWith('custom-error');
    });
});
