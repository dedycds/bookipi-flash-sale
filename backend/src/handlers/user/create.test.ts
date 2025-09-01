import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import pool from '../../db/connection';
import { create } from './create';

jest.mock('bcryptjs');
jest.mock('jsonwebtoken');
jest.mock('uuid');
jest.mock('../../db/connection', () => ({
    query: jest.fn(),
}));
jest.mock('../../middleware/errorHandler', () => ({
    createError: jest.fn((msg, code) => ({ msg, code })),
}));

// ---- Mock constants (no magic strings) ----
const MOCK_EMAIL = 'test@example.com';
const MOCK_PASSWORD = 'securePassword123';
const MOCK_HASHED_PASSWORD = 'hashedPassword';
const MOCK_USER_ID = 'uuid-1234';
const MOCK_TOKEN = 'jwt-token';
const MOCK_JWT_SECRET = 'test-secret';

describe('create controller', () => {
    let req: any;
    let res: any;
    let next: jest.Mock;

    beforeEach(() => {
        req = {
            body: {
                email: MOCK_EMAIL,
                password: MOCK_PASSWORD,
            },
        };

        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };

        next = jest.fn();

        process.env.JWT_SECRET = MOCK_JWT_SECRET;

        (uuidv4 as jest.Mock).mockReturnValue(MOCK_USER_ID);
        (bcrypt.hash as jest.Mock).mockResolvedValue(MOCK_HASHED_PASSWORD);
        (jwt.sign as jest.Mock).mockReturnValue(MOCK_TOKEN);
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should return 409 if user already exists', async () => {
        (pool.query as jest.Mock).mockResolvedValueOnce({
            rows: [{ user_id: MOCK_USER_ID }],
        });

        await create(req, res, next);

        expect(pool.query).toHaveBeenCalledWith('SELECT user_id FROM users WHERE email = $1', [
            MOCK_EMAIL,
        ]);
        expect(res.status).toHaveBeenCalledWith(409);
        expect(res.json).toHaveBeenCalledWith({ error: 'User already exists' });
    });

    it('should create user, sign JWT, and return 201 with user details', async () => {
        (pool.query as jest.Mock)
            // First query → no existing user
            .mockResolvedValueOnce({ rows: [] })
            // Second query → inserting user
            .mockResolvedValueOnce({
                rows: [{ user_id: MOCK_USER_ID, email: MOCK_EMAIL }],
            });

        await create(req, res, next);

        expect(bcrypt.hash).toHaveBeenCalledWith(MOCK_PASSWORD, 12);

        expect(pool.query).toHaveBeenNthCalledWith(
            1,
            'SELECT user_id FROM users WHERE email = $1',
            [MOCK_EMAIL]
        );
        expect(pool.query).toHaveBeenNthCalledWith(
            2,
            'INSERT INTO users (user_id, email, password) VALUES ($1, $2, $3) RETURNING user_id, email',
            [MOCK_USER_ID, MOCK_EMAIL, MOCK_HASHED_PASSWORD]
        );

        expect(jwt.sign).toHaveBeenCalledWith(
            { id: MOCK_USER_ID, email: MOCK_EMAIL },
            MOCK_JWT_SECRET,
            { expiresIn: '24h' }
        );

        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith({
            user_id: MOCK_USER_ID,
            email: MOCK_EMAIL,
            token: MOCK_TOKEN,
        });
    });

    it('should call next with error if something goes wrong', async () => {
        const mockError = new Error('DB failure');
        (pool.query as jest.Mock).mockRejectedValueOnce(mockError);

        await create(req, res, next);

        expect(next).toHaveBeenCalledWith({
            msg: 'Failed to create user',
            code: 500,
        });
    });
});
