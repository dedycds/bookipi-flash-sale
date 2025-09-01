import type { NextFunction, Request, Response } from 'express';
import pool from '../../db/connection';
import { FLASH_SALE_REDIS_KEY } from '../../globals';
import { createError } from '../../middleware/errorHandler';
import redisClient from '../../services/redis';
import { getStockKey } from '../../utils';
import { get } from './get';

jest.mock('../../db/connection');
jest.mock('../../services/redis');
jest.mock('../../utils');
jest.mock('../../middleware/errorHandler');

// Mock constants (avoid magic strings)
const MOCK_STOCK_KEY_PROD1 = 'stock:prod1';
const MOCK_STOCK_KEY_PROD2 = 'stock:prod2';
const MOCK_STOCK_KEY_PROD3 = 'stock:prod3';
const MOCK_ERROR = 'error';

const MOCK_SALE = {
    flash_sale_id: 'fs1',
    start_date: new Date(Date.now() + 10000), // upcoming
    end_date: new Date(Date.now() + 20000),
    product_id: 'prod1',
    quantity: 10,
    price_in_cent: 1000,
    name: 'Product 1',
};

const MOCK_ACTIVE_SALE = {
    flash_sale_id: 'fs2',
    start_date: new Date(Date.now() - 10000), // active
    end_date: new Date(Date.now() + 10000),
    product_id: 'prod2',
    quantity: 5,
    price_in_cent: 2000,
    name: 'Product 2',
};

const MOCK_ENDED_SALE = {
    flash_sale_id: 'fs3',
    start_date: new Date(Date.now() - 20000), // ended
    end_date: new Date(Date.now() - 10000),
    product_id: 'prod3',
    quantity: 2,
    price_in_cent: 3000,
    name: 'Product 3',
};

describe('get sale handler', () => {
    let req: Partial<Request>;
    let res: Partial<Response>;
    let next: NextFunction;

    beforeEach(() => {
        req = {};
        res = {
            json: jest.fn(),
        };
        next = jest.fn();
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    it('should return sale from cache and status upcoming', async () => {
        (redisClient.get as jest.Mock).mockResolvedValue(JSON.stringify(MOCK_SALE));
        (redisClient.LLEN as jest.Mock).mockResolvedValue(7);
        (getStockKey as jest.Mock).mockReturnValue(MOCK_STOCK_KEY_PROD1);

        await get(req as Request, res as Response, next);

        expect(redisClient.get).toHaveBeenCalledWith(FLASH_SALE_REDIS_KEY);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                flash_sale_id: MOCK_SALE.flash_sale_id,
                product_id: MOCK_SALE.product_id,
                name: MOCK_SALE.name,
                status: 'upcoming',
                remaining_stock: 7,
            })
        );
    });

    it('should return sale from cache and status active', async () => {
        (redisClient.get as jest.Mock).mockResolvedValue(JSON.stringify(MOCK_ACTIVE_SALE));
        (redisClient.LLEN as jest.Mock).mockResolvedValue(3);
        (getStockKey as jest.Mock).mockReturnValue(MOCK_STOCK_KEY_PROD2);

        await get(req as Request, res as Response, next);

        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                flash_sale_id: MOCK_ACTIVE_SALE.flash_sale_id,
                product_id: MOCK_ACTIVE_SALE.product_id,
                status: 'active',
                remaining_stock: 3,
            })
        );
    });

    it('should return sale from cache and status ended', async () => {
        (redisClient.get as jest.Mock).mockResolvedValue(JSON.stringify(MOCK_ENDED_SALE));
        (redisClient.LLEN as jest.Mock).mockResolvedValue(0);
        (getStockKey as jest.Mock).mockReturnValue(MOCK_STOCK_KEY_PROD3);

        await get(req as Request, res as Response, next);

        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                flash_sale_id: MOCK_ENDED_SALE.flash_sale_id,
                product_id: MOCK_ENDED_SALE.product_id,
                status: 'ended',
                remaining_stock: 0,
            })
        );
    });

    it('should fetch sale from DB if not cached', async () => {
        (redisClient.get as jest.Mock).mockResolvedValue(null);
        (pool.query as jest.Mock).mockResolvedValue({ rows: [MOCK_SALE] });
        (redisClient.set as jest.Mock).mockResolvedValue(undefined);
        (redisClient.LLEN as jest.Mock).mockResolvedValue(5);
        (getStockKey as jest.Mock).mockReturnValue(MOCK_STOCK_KEY_PROD1);

        await get(req as Request, res as Response, next);

        expect(pool.query).toHaveBeenCalled();
        expect(redisClient.set).toHaveBeenCalledWith(
            FLASH_SALE_REDIS_KEY,
            JSON.stringify(MOCK_SALE)
        );
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                flash_sale_id: MOCK_SALE.flash_sale_id,
                product_id: MOCK_SALE.product_id,
                remaining_stock: 5,
            })
        );
    });

    it('should call next with error if no sale found in DB', async () => {
        (redisClient.get as jest.Mock).mockResolvedValue(null);
        (pool.query as jest.Mock).mockResolvedValue({ rows: [] });
        (createError as jest.Mock).mockReturnValue(MOCK_ERROR);

        await get(req as Request, res as Response, next);

        expect(next).toHaveBeenCalledWith(MOCK_ERROR);
        expect(res.json).not.toHaveBeenCalled();
    });

    it('should call next with error on exception', async () => {
        (redisClient.get as jest.Mock).mockRejectedValue(new Error('Redis error'));
        (createError as jest.Mock).mockReturnValue(MOCK_ERROR);

        await get(req as Request, res as Response, next);

        expect(next).toHaveBeenCalledWith(MOCK_ERROR);
        expect(res.json).not.toHaveBeenCalled();
    });
});
