import { Router } from 'express';
import { body } from 'express-validator';
import { create, get } from '../handlers/order';
import { inputErrorValidator } from '../middleware/inputErrorValidator';

// validation middleware
const validateOrder = [body('productId').isUUID().notEmpty()];

/** Router */
const router = Router();

// get existing order
router.get('/', get);

// order creation
router.post('/', validateOrder, inputErrorValidator, create);

export default router;
