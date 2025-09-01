import type { NextFunction, Response } from 'express';
import jwt from 'jsonwebtoken';
import { authMiddleware, AuthRequest } from './auth';

jest.mock('jsonwebtoken');

const MOCK_SECRET = 'test-secret';
const MOCK_USER = { id: 'user-123', email: 'test@example.com' };
const MOCK_TOKEN = 'valid.jwt.token';
const ERROR_ACCESS_TOKEN_REQUIRED = { error: 'Access token required' };
const ERROR_INVALID_TOKEN = { error: 'Invalid token' };

describe('authMiddleware', () => {
    let req: Partial<AuthRequest>;
    let res: Partial<Response>;
    let next: NextFunction;

    beforeEach(() => {
        req = { headers: {} };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
        next = jest.fn();

        process.env.JWT_SECRET = MOCK_SECRET;
        jest.clearAllMocks();
    });

    it('should return 401 if no Authorization header is provided', () => {
        authMiddleware(req as AuthRequest, res as Response, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith(ERROR_ACCESS_TOKEN_REQUIRED);
        expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 if token verification fails', () => {
        req.headers = { authorization: `Bearer ${MOCK_TOKEN}` };
        (jwt.verify as jest.Mock).mockImplementation(() => {
            throw new Error('Invalid token');
        });

        authMiddleware(req as AuthRequest, res as Response, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith(ERROR_INVALID_TOKEN);
        expect(next).not.toHaveBeenCalled();
    });

    it('should attach user to request and call next if token is valid', () => {
        req.headers = { authorization: `Bearer ${MOCK_TOKEN}` };
        (jwt.verify as jest.Mock).mockReturnValue(MOCK_USER);

        authMiddleware(req as AuthRequest, res as Response, next);

        expect(jwt.verify).toHaveBeenCalledWith(MOCK_TOKEN, MOCK_SECRET);
        expect(req.user).toEqual(MOCK_USER);
        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
    });
});
