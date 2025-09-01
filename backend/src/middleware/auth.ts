import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

// Extend Express Request type to include user info after authentication
export interface AuthRequest extends Request {
    user?: {
        id: string;
        email: string;
    };
}

/**
 * Middleware to authenticate requests using a JWT token.
 * - Extracts the token from the `Authorization` header.
 * - Verifies the token with the server's secret.
 * - Attaches decoded user information to `req.user` if valid.
 * - Returns 401 Unauthorized response if token is missing or invalid.
 */
export const authMiddleware = (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Response | void => {
    try {
        // Extract token from Authorization header (format: "Bearer <token>")
        const token = req.headers.authorization?.replace('Bearer ', '');

        // Reject request if no token is provided
        if (!token) {
            return res.status(401).json({ error: 'Access token required' });
        }

        // Verify token using secret key (fallback used for safety in development)
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any;

        // Attach decoded user info to request for downstream handlers
        req.user = {
            id: decoded.id,
            email: decoded.email,
        };

        // Proceed to next middleware/route handler
        next();
    } catch (error) {
        // Handle invalid/expired token errors
        return res.status(401).json({ error: 'Invalid token' });
    }
};
