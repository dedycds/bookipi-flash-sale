import { NextFunction, Request, Response } from 'express';
import { validationResult } from 'express-validator';

/**
 * Middleware: inputErrorValidator
 *
 * Purpose:
 * - Validates incoming request data using `express-validator`.
 * - If validation errors exist, responds with HTTP 400 and the list of errors.
 * - Otherwise, passes control to the next middleware/controller.
 *
 * Usage:
 * - Attach this middleware after defining validation rules
 *   in your Express route definitions.
 */
export function inputErrorValidator(
    req: Request,
    res: Response,
    next: NextFunction
): Response | void {
    // Run all validations and collect errors (if any)
    const errors = validationResult(req);

    // If there are validation errors, return 400 Bad Request with details
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    // If no errors, continue to the next middleware/handler
    return next();
}
