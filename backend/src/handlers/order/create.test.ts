import { validationResult } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import pool from '../../db/connection';
import { AuthRequest } from '../../middleware/auth';
import { createError } from '../../middleware/errorHandler';
import { publishToQueue } from '../../services/rabbitmq';
import redisClient from '../../services/redis';
import { getStockKey, getUniqueOrderKey } from '../../utils';
import { create } from './create';

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

describe('create order handler', () => {
    const userId = 'user-1';
    const productId = 'prod-1';
    const orderId = 'order-uuid';
    const reservedToken = 'token-1';

    beforeEach(() => {
        jest.clearAllMocks();
        (getStockKey as jest.Mock).mockReturnValue('stock-key');
        (getUniqueOrderKey as jest.Mock).mockReturnValue('unique-order-key');
        (validationResult as unknown as jest.Mock).mockReturnValue({
            isEmpty: () => true,
            array: () => [],
        });
        (pool.query as jest.Mock).mockResolvedValue({ rows: [{}] });
        (uuidv4 as jest.Mock).mockImplementation(() => orderId);
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    it('should return 400 if validation errors exist', async () => {
        (validationResult as unknown as jest.Mock).mockReturnValue({
            isEmpty: () => false,
            array: () => [{ msg: 'Invalid' }],
        });

        const req: any = { user: { id: userId }, body: { productId } };
        const res = mockRes();

        await create(req, res, mockNext);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ errors: [{ msg: 'Invalid' }] });
    });

    it('should return 400 if sale is not active', async () => {
        (pool.query as jest.Mock).mockResolvedValue({ rows: [] });

        const req: any = { user: { id: userId }, body: { productId } };
        const res = mockRes();

        await create(req, res, mockNext);

        expect(pool.query).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: 'Sale is not active' });
    });

    it('should return 400 if already purchased', async () => {
        (redisClient.get as jest.Mock).mockResolvedValue(orderId);

        const req: any = { user: { id: userId }, body: { productId } };
        const res = mockRes();

        await create(req, res, mockNext);

        expect(redisClient.get).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: 'Already purchased' });
    });

    it('should return 400 if product sold out', async () => {
        (redisClient.get as jest.Mock).mockResolvedValue(null);
        (redisClient.lPop as jest.Mock).mockResolvedValue(null);

        const req = { user: { id: userId }, body: { productId } } as AuthRequest;
        const res = mockRes();

        await create(req, res, mockNext);

        expect(redisClient.lPop).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: 'Product sold out' });
    });

    it('should create order and return order info', async () => {
        (redisClient.get as jest.Mock).mockResolvedValue(null);
        (redisClient.lPop as jest.Mock).mockResolvedValue(reservedToken);
        (redisClient.set as jest.Mock).mockResolvedValue('OK');
        (publishToQueue as jest.Mock).mockResolvedValue(undefined);

        const req: any = { user: { id: userId }, body: { productId } };
        const res = mockRes();

        await create(req, res, mockNext);

        expect(redisClient.set).toHaveBeenCalledWith('unique-order-key', orderId);
        expect(publishToQueue).toHaveBeenCalledWith(
            'order_queue',
            expect.objectContaining({
                order_id: orderId,
                product_id: productId,
                user_id: userId,
                reserved_token: reservedToken,
            })
        );
        expect(res.json).toHaveBeenCalledWith({
            oder_id: orderId,
            product_id: productId,
            status: 'pending',
        });
    });

    it('should call next with error on exception', async () => {
        (pool.query as jest.Mock).mockRejectedValue(new Error('DB error'));
        (createError as jest.Mock).mockReturnValue('custom-error');

        const req: any = { user: { id: userId }, body: { productId } };
        const res = mockRes();

        await create(req, res, mockNext);

        expect(mockNext).toHaveBeenCalledWith('custom-error');
    });
});
