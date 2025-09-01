import pool from '../../db/connection';
import { FLASH_SALE_ID, FLASH_SALE_REDIS_KEY, PRODUCT_ID } from '../../globals';
import { createError } from '../../middleware/errorHandler';
import redisClient from '../../services/redis';
import { getStockKey } from '../../utils';
import { generateTokens } from '../../utils/generateTokens';
import { update } from './update';

jest.mock('../../db/connection');
jest.mock('../../services/redis');
jest.mock('../../utils');
jest.mock('../../utils/generateTokens');
jest.mock('../../middleware/errorHandler');

// --- Mock constants ---
const MOCK_START_DATE = '2025-09-01T00:00:00.000Z';
const MOCK_END_DATE = '2025-09-02T00:00:00.000Z';
const MOCK_INPUT_QUANTITY = 10;
const MOCK_DB_QUANTITY = 5;
const MOCK_STOCK_KEY = `stock:${PRODUCT_ID}`;
const MOCK_TOKENS = ['t1', 't2'];

const MOCK_PRODUCT_ROW = {
    product_id: PRODUCT_ID,
    quantity: MOCK_DB_QUANTITY,
};

const MOCK_ERROR_INVALID_PRODUCT = { msg: 'Invalid product id', code: 400 };
const MOCK_ERROR_FAILED_SALE = { msg: 'Failed to create sale', code: 500 };

const MOCK_REQ = {
    body: {
        start_date: MOCK_START_DATE,
        end_date: MOCK_END_DATE,
        quantity: MOCK_INPUT_QUANTITY,
    },
} as any;

const MOCK_RES = {
    json: jest.fn(),
    status: jest.fn().mockReturnThis(),
} as any;

const mockNext = jest.fn();

describe('update controller', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (getStockKey as jest.Mock).mockReturnValue(MOCK_STOCK_KEY);
        (generateTokens as jest.Mock).mockReturnValue(MOCK_TOKENS);
        (createError as jest.Mock).mockImplementation((msg, code) => ({ msg, code }));
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    it('should update flash sale and refresh redis successfully', async () => {
        // --- Mock DB responses ---
        (pool.query as jest.Mock).mockResolvedValueOnce({
            rowCount: 1,
            rows: [MOCK_PRODUCT_ROW],
        });
        (pool.query as jest.Mock).mockResolvedValueOnce({});

        // --- Mock Redis ---
        (redisClient.del as jest.Mock).mockResolvedValue(undefined);
        (redisClient.rPush as jest.Mock).mockResolvedValue(undefined);

        await update(MOCK_REQ, MOCK_RES, mockNext);

        // Validate DB queries
        expect(pool.query).toHaveBeenCalledWith(
            expect.stringContaining('SELECT product_id, quantity FROM products'),
            [PRODUCT_ID]
        );
        expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('UPDATE'), [
            MOCK_START_DATE,
            MOCK_END_DATE,
            FLASH_SALE_ID,
        ]);

        // Validate Redis calls
        expect(redisClient.del).toHaveBeenCalledWith(FLASH_SALE_REDIS_KEY);
        expect(redisClient.del).toHaveBeenCalledWith(MOCK_STOCK_KEY);
        expect(redisClient.rPush).toHaveBeenCalledWith(MOCK_STOCK_KEY, MOCK_TOKENS);

        // Validate response
        expect(MOCK_RES.json).toHaveBeenCalledWith({
            product_id: PRODUCT_ID,
            start_date: MOCK_START_DATE,
            end_date: MOCK_END_DATE,
            flash_sale_id: FLASH_SALE_ID,
            quantity: MOCK_INPUT_QUANTITY,
        });
    });

    it('should return error when product not found', async () => {
        (pool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 0 });

        await update(MOCK_REQ, MOCK_RES, mockNext);

        expect(mockNext).toHaveBeenCalledWith(MOCK_ERROR_INVALID_PRODUCT);
    });

    it('should return error when DB or Redis fails', async () => {
        (pool.query as jest.Mock).mockRejectedValueOnce(new Error('DB error'));

        await update(MOCK_REQ, MOCK_RES, mockNext);

        expect(mockNext).toHaveBeenCalledWith(MOCK_ERROR_FAILED_SALE);
    });

    it('should not push tokens when quantity is missing', async () => {
        const reqWithoutQuantity = {
            body: {
                start_date: MOCK_START_DATE,
                end_date: MOCK_END_DATE,
            },
        } as any;

        (pool.query as jest.Mock).mockResolvedValueOnce({
            rowCount: 1,
            rows: [MOCK_PRODUCT_ROW],
        });
        (pool.query as jest.Mock).mockResolvedValueOnce({});

        (redisClient.del as jest.Mock).mockResolvedValue(undefined);
        (redisClient.rPush as jest.Mock).mockResolvedValue(undefined);

        await update(reqWithoutQuantity, MOCK_RES, mockNext);

        // Ensure Redis reset happens
        expect(redisClient.del).toHaveBeenCalledWith(FLASH_SALE_REDIS_KEY);
        expect(redisClient.del).toHaveBeenCalledWith(MOCK_STOCK_KEY);

        // rPush should NOT be called since no quantity
        expect(redisClient.rPush).not.toHaveBeenCalled();

        expect(MOCK_RES.json).toHaveBeenCalledWith({
            product_id: PRODUCT_ID,
            start_date: MOCK_START_DATE,
            end_date: MOCK_END_DATE,
            flash_sale_id: FLASH_SALE_ID,
        });
    });
});
