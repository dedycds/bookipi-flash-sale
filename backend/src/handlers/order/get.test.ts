import type { NextFunction, Response } from 'express';
import pool from '../../db/connection';
import { PRODUCT_ID } from '../../globals';
import { AuthRequest } from '../../middleware/auth';
import { createError } from '../../middleware/errorHandler';
import redisClient from '../../services/redis';
import { getUniqueOrderKey } from '../../utils';
import { get } from './get';

jest.mock('../../db/connection');
jest.mock('../../services/redis');
jest.mock('../../utils');
jest.mock('../../middleware/errorHandler');

const MOCK_USER_ID = 'user-123';
const MOCK_ORDER_ID = 'order-456';
const MOCK_PENDING_ORDER_ID = 'pending-order-789';
const MOCK_ORDER_KEY = `order:${MOCK_USER_ID}:${PRODUCT_ID}`;
const MOCK_STATUS_COMPLETED = 'completed';
const MOCK_STATUS_PENDING = 'pending';
const MOCK_ERROR_MESSAGE = 'DB error';
const MOCK_INTERNAL_ERROR = { msg: 'internal', code: 500 };

describe('get order handler', () => {
    let req: Partial<AuthRequest>;
    let res: Partial<Response>;
    let next: NextFunction;

    beforeEach(() => {
        req = {
            user: { id: MOCK_USER_ID } as AuthRequest['user'],
        };
        res = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis(),
        };
        next = jest.fn();
        jest.spyOn(console, 'error').mockImplementation(() => {});
        jest.clearAllMocks();
    });

    it('should return the most recent DB order', async () => {
        const dbOrder = {
            order_id: MOCK_ORDER_ID,
            product_id: PRODUCT_ID,
            status: MOCK_STATUS_COMPLETED,
            created_at: new Date(),
        };
        (pool.query as jest.Mock).mockResolvedValue({ rowCount: 1, rows: [dbOrder] });

        await get(req as any, res as Response, next);

        expect(pool.query).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(dbOrder);
    });

    it('should return pending order from Redis when no DB order exists', async () => {
        (pool.query as jest.Mock).mockResolvedValue({ rowCount: 0, rows: [] });
        (getUniqueOrderKey as jest.Mock).mockReturnValue(MOCK_ORDER_KEY);
        (redisClient.get as jest.Mock).mockResolvedValue(MOCK_PENDING_ORDER_ID);

        await get(req as any, res as Response, next);

        expect(redisClient.get).toHaveBeenCalledWith(MOCK_ORDER_KEY);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
            order_id: MOCK_PENDING_ORDER_ID,
            product_id: PRODUCT_ID,
            user_id: MOCK_USER_ID,
            status: MOCK_STATUS_PENDING,
        });
    });

    it('should return null when no DB order and no Redis entry', async () => {
        (pool.query as jest.Mock).mockResolvedValue({ rowCount: 0, rows: [] });
        (redisClient.get as jest.Mock).mockResolvedValue(null);

        await get(req as any, res as Response, next);

        expect(res.json).toHaveBeenCalledWith(null);
    });

    it('should call next with error on exception', async () => {
        (pool.query as jest.Mock).mockRejectedValue(new Error(MOCK_ERROR_MESSAGE));
        (createError as jest.Mock).mockReturnValue(MOCK_INTERNAL_ERROR);

        await get(req as any, res as Response, next);

        expect(next).toHaveBeenCalledWith(MOCK_INTERNAL_ERROR);
        expect(res.json).not.toHaveBeenCalled();
    });
});
