import { Router } from 'express';
import { get } from '../handlers/sale';

const router = Router();

// Get sale status
router.get('/', get);

export default router;
