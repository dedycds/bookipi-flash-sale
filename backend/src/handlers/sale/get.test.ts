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

const mockSale = {
    flash_sale_id: 'fs1',
    start_date: new Date(Date.now() + 10000), // upcoming
    end_date: new Date(Date.now() + 20000),
    product_id: 'prod1',
    quantity: 10,
};

const mockActiveSale = {
    flash_sale_id: 'fs2',
    start_date: new Date(Date.now() - 10000), // active
    end_date: new Date(Date.now() + 10000),
    product_id: 'prod2',
    quantity: 5,
};

const mockEndedSale = {
    flash_sale_id: 'fs3',
    start_date: new Date(Date.now() - 20000), // ended
    end_date: new Date(Date.now() - 10000),
    product_id: 'prod3',
    quantity: 2,
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
        (redisClient.get as jest.Mock).mockResolvedValue(JSON.stringify(mockSale));
        (redisClient.LLEN as jest.Mock).mockResolvedValue(7);
        (getStockKey as jest.Mock).mockReturnValue('stock:prod1');

        await get(req as Request, res as Response, next);

        expect(redisClient.get).toHaveBeenCalledWith(FLASH_SALE_REDIS_KEY);
        expect(res.json).toHaveBeenCalledWith({
            productId: mockSale.product_id,
            status: 'upcoming',
            remainingStock: 7,
            startDate: mockSale.start_date.toISOString(),
            endDate: mockSale.end_date.toISOString(),
        });
    });

    it('should return sale from cache and status active', async () => {
        (redisClient.get as jest.Mock).mockResolvedValue(JSON.stringify(mockActiveSale));
        (redisClient.LLEN as jest.Mock).mockResolvedValue(3);
        (getStockKey as jest.Mock).mockReturnValue('stock:prod2');

        await get(req as Request, res as Response, next);

        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                productId: mockActiveSale.product_id,
                status: 'active',
                remainingStock: 3,
            })
        );
    });

    it('should return sale from cache and status ended', async () => {
        (redisClient.get as jest.Mock).mockResolvedValue(JSON.stringify(mockEndedSale));
        (redisClient.LLEN as jest.Mock).mockResolvedValue(0);
        (getStockKey as jest.Mock).mockReturnValue('stock:prod3');

        await get(req as Request, res as Response, next);

        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                productId: mockEndedSale.product_id,
                status: 'ended',
                remainingStock: 0,
            })
        );
    });

    it('should fetch sale from DB if not cached', async () => {
        (redisClient.get as jest.Mock).mockResolvedValue(null);
        (pool.query as jest.Mock).mockResolvedValue({ rows: [mockSale] });
        (redisClient.set as jest.Mock).mockResolvedValue(undefined);
        (redisClient.LLEN as jest.Mock).mockResolvedValue(5);
        (getStockKey as jest.Mock).mockReturnValue('stock:prod1');

        await get(req as Request, res as Response, next);

        expect(pool.query).toHaveBeenCalled();
        expect(redisClient.set).toHaveBeenCalledWith(
            FLASH_SALE_REDIS_KEY,
            JSON.stringify(mockSale)
        );
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                productId: mockSale.product_id,
                remainingStock: 5,
            })
        );
    });

    it('should call next with error if no sale found in DB', async () => {
        (redisClient.get as jest.Mock).mockResolvedValue(null);
        (pool.query as jest.Mock).mockResolvedValue({ rows: [] });
        (createError as jest.Mock).mockReturnValue('error');

        await get(req as Request, res as Response, next);

        expect(next).toHaveBeenCalledWith('error');
        expect(res.json).not.toHaveBeenCalled();
    });

    it('should call next with error on exception', async () => {
        (redisClient.get as jest.Mock).mockRejectedValue(new Error('Redis error'));
        (createError as jest.Mock).mockReturnValue('error');

        await get(req as Request, res as Response, next);

        expect(next).toHaveBeenCalledWith('error');
        expect(res.json).not.toHaveBeenCalled();
    });
});
