import bcrypt from 'bcryptjs';
import type { NextFunction, Response } from 'express';
import { validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import pool from '../../db/connection';
import type { AuthRequest } from '../../middleware/auth';
import { createError } from '../../middleware/errorHandler';

export async function create(
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<Response | void> {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email, password } = req.body;

        // Check if user already exists
        const existingUser = await pool.query('SELECT user_id FROM users WHERE email = $1', [
            email,
        ]);

        if (existingUser.rows.length > 0) {
            return res.status(409).json({ error: 'User already exists' });
        }

        // Create new user
        const userId = uuidv4();
        const hashedPassword = await bcrypt.hash(password, 12);

        const result = await pool.query(
            'INSERT INTO users (user_id, email, password) VALUES ($1, $2, $3) RETURNING user_id, email',
            [userId, email, hashedPassword]
        );

        const created = result.rows[0];

        // Sign JWT for the newly created user
        const token = jwt.sign(
            { id: created.user_id, email: created.email },
            process.env.JWT_SECRET || 'fallback-secret',
            { expiresIn: '24h' }
        );

        return res.status(201).json({ user_id: userId, email: email, token: token });
    } catch (error) {
        console.error(error);
        next(createError('Failed to create user', 500));
    }
}
