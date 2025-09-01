import { NextFunction, Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { inputErrorValidator } from './inputErrorValidator';

// Mock express-validator's validationResult
jest.mock('express-validator', () => ({
    validationResult: jest.fn(),
}));

describe('inputErrorValidator middleware', () => {
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;
    let mockNext: NextFunction;

    beforeEach(() => {
        mockReq = {};
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
        mockNext = jest.fn();
        jest.clearAllMocks();
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    it('should return 400 with errors if validation fails', () => {
        const mockErrors = {
            isEmpty: () => false,
            array: () => [{ msg: 'Invalid email', param: 'email' }],
        };

        (validationResult as unknown as jest.Mock).mockReturnValue(mockErrors);

        inputErrorValidator(mockReq as Request, mockRes as Response, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({
            errors: [{ msg: 'Invalid email', param: 'email' }],
        });
        expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next if there are no validation errors', () => {
        const mockErrors = {
            isEmpty: () => true,
            array: () => [],
        };

        (validationResult as unknown as jest.Mock).mockReturnValue(mockErrors);

        inputErrorValidator(mockReq as Request, mockRes as Response, mockNext);

        expect(mockNext).toHaveBeenCalled();
        expect(mockRes.status).not.toHaveBeenCalled();
        expect(mockRes.json).not.toHaveBeenCalled();
    });
});
