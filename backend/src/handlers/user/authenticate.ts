import bcrypt from 'bcryptjs';
import type { NextFunction, Request, Response } from 'express';
import { validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';
import pool from '../../db/connection';
import { createError } from '../../middleware/errorHandler';

export async function authenticate(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<Response | void> {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email, password } = req.body;

        // Find user
        const result = await pool.query(
            'SELECT user_id, email, password FROM users WHERE email = $1',
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = result.rows[0];

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Create JWT
        const token = jwt.sign(
            { id: user.user_id, email: user.email },
            process.env.JWT_SECRET || 'fallback-secret',
            { expiresIn: '24h' }
        );

        return res.json({
            user_id: user.user_id,
            email: user.email,
            token,
        });
    } catch (error) {
        next(createError('Authentication failed', 500));
    }
}
