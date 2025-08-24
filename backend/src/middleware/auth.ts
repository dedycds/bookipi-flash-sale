import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
    user?: {
        id: string;
        email: string;
    };
}

export const authMiddleware = (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Response | void => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({ error: 'Access token required' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any;
        req.user = {
            id: decoded.id,
            email: decoded.email,
        };

        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid token' });
    }
};
