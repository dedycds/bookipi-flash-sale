import { Router } from 'express';
import { body } from 'express-validator';
import { create, get } from '../handlers/order';

// validation middleware
const validateOrder = [body('productId').isUUID()];

/** Router */
const router = Router();

// get existing order
router.get('/', get);

// order creation
router.post('/', validateOrder, create);

export default router;
