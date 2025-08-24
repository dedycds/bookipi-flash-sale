import { Router } from 'express';
import { body } from 'express-validator';

import { authenticate, create } from '../handlers/user';

const router = Router();

// Validation middleware
const validateRegistration = [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
];

const validateLogin = [body('email').isEmail().normalizeEmail(), body('password').notEmpty()];

// Register user
router.post('', validateRegistration, create);

// Login user
router.post('/authenticate', validateLogin, authenticate);

export default router;
