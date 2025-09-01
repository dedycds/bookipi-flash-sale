import { Router } from 'express';
import { body } from 'express-validator';
import { get, update } from '../handlers/sale';
import { inputErrorValidator } from '../middleware/inputErrorValidator';

// Validation middleware
const validateUpdate = [
    body('start_date').isISO8601().notEmpty(),
    body('end_date').isISO8601().notEmpty(),
    body('quantity').isInt(),
];

/** Router */
const router = Router();

// Get sale status
router.get('/', get);

// Update sale start and end date
router.post('/update', validateUpdate, inputErrorValidator, update);

export default router;
