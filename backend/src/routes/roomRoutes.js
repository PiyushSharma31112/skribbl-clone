import { Router } from 'express';
import { listPublicRooms } from '../controllers/roomController.js';

const router = Router();

router.get('/', listPublicRooms);

export default router;
