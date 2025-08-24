import { Router } from 'express';
import { body } from 'express-validator';
import { get, update } from '../handlers/sale';

// Validation middleware
const validateUpdate = [body('start_date').isDate(), body('end_date').isDate()];

/** Router */
const router = Router();

// Get sale status
router.get('/', get);

// Update sale start and end date
router.post('/update', validateUpdate, update);

export default router;
