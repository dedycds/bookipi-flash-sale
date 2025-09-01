import bcrypt from 'bcryptjs';
import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import pool from '../../db/connection';
import { createError } from '../../middleware/errorHandler';
import { authenticate } from './authenticate';

jest.mock('bcryptjs');
jest.mock('jsonwebtoken');
jest.mock('../../db/connection');
jest.mock('../../middleware/errorHandler');

const mockRequest = (body = {}) => ({ body }) as Request;
const mockResponse = () => {
    const res = {} as Response;
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};
const mockNext = jest.fn() as NextFunction;

// Shared mock values (no magic strings)
const MOCK_USER_ID = 'user-123';
const MOCK_EMAIL = 'test@example.com';
const MOCK_PASSWORD = 'plain-password';
const MOCK_HASHED_PASSWORD = 'hashed-password';
const MOCK_TOKEN = 'jwt-token-123';
const INVALID_CREDENTIALS_ERROR = { error: 'Invalid credentials' };

describe('authenticate controller', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should return 401 if user is not found', async () => {
        (pool.query as jest.Mock).mockResolvedValue({ rows: [] });

        const req = mockRequest({ email: MOCK_EMAIL, password: MOCK_PASSWORD });
        const res = mockResponse();

        await authenticate(req, res, mockNext);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith(INVALID_CREDENTIALS_ERROR);
    });

    it('should return 401 if password is invalid', async () => {
        (pool.query as jest.Mock).mockResolvedValue({
            rows: [{ user_id: MOCK_USER_ID, email: MOCK_EMAIL, password: MOCK_HASHED_PASSWORD }],
        });
        (bcrypt.compare as jest.Mock).mockResolvedValue(false);

        const req = mockRequest({ email: MOCK_EMAIL, password: 'wrong-password' });
        const res = mockResponse();

        await authenticate(req, res, mockNext);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith(INVALID_CREDENTIALS_ERROR);
    });

    it('should return user and token if authentication succeeds', async () => {
        (pool.query as jest.Mock).mockResolvedValue({
            rows: [{ user_id: MOCK_USER_ID, email: MOCK_EMAIL, password: MOCK_HASHED_PASSWORD }],
        });
        (bcrypt.compare as jest.Mock).mockResolvedValue(true);
        (jwt.sign as jest.Mock).mockReturnValue(MOCK_TOKEN);

        const req = mockRequest({ email: MOCK_EMAIL, password: MOCK_PASSWORD });
        const res = mockResponse();

        await authenticate(req, res, mockNext);

        expect(res.json).toHaveBeenCalledWith({
            user_id: MOCK_USER_ID,
            email: MOCK_EMAIL,
            token: MOCK_TOKEN,
        });
    });

    it('should call next with error if exception is thrown', async () => {
        const error = new Error('DB error');
        (pool.query as jest.Mock).mockRejectedValue(error);
        (createError as jest.Mock).mockReturnValue(error);

        const req = mockRequest({ email: MOCK_EMAIL, password: MOCK_PASSWORD });
        const res = mockResponse();

        await authenticate(req, res, mockNext);

        expect(mockNext).toHaveBeenCalledWith(error);
    });
});
