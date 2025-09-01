import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate, create } from '../handlers/user';
import { inputErrorValidator } from '../middleware/inputErrorValidator';

// Validation middleware
const validateRegistration = [
    body('email').isEmail().normalizeEmail().notEmpty(),
    body('password').isLength({ min: 6 }).notEmpty(),
];

const validateLogin = [
    body('email').isEmail().normalizeEmail().notEmpty(),
    body('password').notEmpty(),
];

/**
 * Router
 */
const router = Router();

// Register user
router.post('', validateRegistration, inputErrorValidator, create);

// Login user
router.post('/authenticate', validateLogin, inputErrorValidator, authenticate);

export default router;
