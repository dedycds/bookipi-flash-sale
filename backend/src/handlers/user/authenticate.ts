import bcrypt from 'bcryptjs';
import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import pool from '../../db/connection';
import { createError } from '../../middleware/errorHandler';

/**
 * Authenticate a user by verifying email & password, then issuing a JWT.
 *
 * Workflow:
 *  1. Look up user in database by email.
 *  2. If user not found → return 401 Unauthorized.
 *  3. Compare provided password with hashed password in DB.
 *  4. If invalid password → return 401 Unauthorized.
 *  5. If valid → generate a JWT with 24h expiry.
 *  6. Return user data and token in response.
 *
 * Error handling:
 *  - Any unexpected DB/JWT error is forwarded as a 500.
 */
export async function authenticate(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<Response | void> {
    try {
        const { email, password } = req.body;

        /** Step 1: Find user by email in DB */
        const result = await pool.query(
            'SELECT user_id, email, password FROM users WHERE email = $1',
            [email]
        );

        /** Step 2: Handle case when no user is found */
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = result.rows[0];

        /** Step 3: Verify password using bcrypt */
        const isValidPassword = await bcrypt.compare(password, user.password);

        /** Step 4: If password invalid → return 401 Unauthorized */
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        /** Step 5: Create signed JWT with 24h expiry */
        const token = jwt.sign(
            { id: user.user_id, email: user.email },
            process.env.JWT_SECRET || 'fallback-secret', // fallback for dev env
            { expiresIn: '24h' }
        );

        /** Step 6: Return authenticated user data + token */
        return res.json({
            user_id: user.user_id,
            email: user.email,
            token,
        });
    } catch (error) {
        // Forward unexpected errors to error handler
        next(createError('Authentication failed', 500));
    }
}
