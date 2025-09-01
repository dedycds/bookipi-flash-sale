import bcrypt from 'bcryptjs';
import type { NextFunction, Response } from 'express';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import pool from '../../db/connection';
import type { AuthRequest } from '../../middleware/auth';
import { createError } from '../../middleware/errorHandler';

/**
 * Controller: create a new user account
 *
 * Workflow:
 *  1. Validate if the email already exists in the database.
 *  2. If user exists → return 409 conflict.
 *  3. If not → hash password and insert user into the database.
 *  4. Generate a JWT for the new user.
 *  5. Return user details and token in response.
 *
 * Error Handling:
 *  - Logs error and passes a 500 error to next middleware.
 */
export async function create(
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<Response | void> {
    try {
        const { email, password } = req.body;

        /** Step 1: Check if user already exists in DB */
        const existingUser = await pool.query('SELECT user_id FROM users WHERE email = $1', [
            email,
        ]);

        if (existingUser.rows.length > 0) {
            // User found → conflict response
            return res.status(409).json({ error: 'User already exists' });
        }

        /** Step 2: Create new user record */
        const userId = uuidv4(); // generate unique UUID for user_id
        const hashedPassword = await bcrypt.hash(password, 12); // securely hash password

        // Insert user into DB and return minimal user details
        const result = await pool.query(
            'INSERT INTO users (user_id, email, password) VALUES ($1, $2, $3) RETURNING user_id, email',
            [userId, email, hashedPassword]
        );

        const created = result.rows[0];

        /** Step 3: Issue JWT for authentication */
        const token = jwt.sign(
            { id: created.user_id, email: created.email },
            process.env.JWT_SECRET || 'fallback-secret', // use secret from env or fallback
            { expiresIn: '24h' } // token expires in 24 hours
        );

        /** Step 4: Respond with created user info + token */
        return res.status(201).json({
            user_id: userId,
            email: email,
            token: token,
        });
    } catch (error) {
        // Log and forward error to central error handler
        console.error(error);
        next(createError('Failed to create user', 500));
    }
}
