import { Router } from 'express';
import { create, get } from '../handlers/order';

const router = Router();
// get existing order
router.get('/', get);

// order creation
router.post('/', create);

export default router;
