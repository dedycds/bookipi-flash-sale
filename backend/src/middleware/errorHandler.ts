import { NextFunction, Request, Response } from 'express';

// Extend the built-in Error interface to include custom fields
// - statusCode: HTTP status code for the error
// - isOperational: whether this is an expected (operational) error vs a programming error
export interface AppError extends Error {
    statusCode?: number;
    isOperational?: boolean;
}

// Express error-handling middleware
// This function will catch errors thrown in routes or middleware and format the response
export const errorHandler = (err: AppError, req: Request, res: Response, next: NextFunction) => {
    // Default to 500 if no explicit status code is set
    const statusCode = err.statusCode || 500;

    // Use the provided error message, or fallback to a generic one
    const message = err.message || 'Internal Server Error';

    // Log error details to the server console
    console.error(`Error ${statusCode}: ${message}`);
    console.error(err.stack);

    // Send a JSON error response to the client
    // - In development, also include the stack trace for easier debugging
    res.status(statusCode).json({
        error: message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
};

// Utility function to create a standardized AppError
// - Assigns message and statusCode
// - Marks the error as "operational" so it can be distinguished from programming errors
export const createError = (message: string, statusCode: number = 500): AppError => {
    const error = new Error(message) as AppError;
    error.statusCode = statusCode;
    error.isOperational = true;
    return error;
};
