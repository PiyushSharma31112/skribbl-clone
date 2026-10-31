import { Router } from 'express';
import { listRecentGames } from '../controllers/gameController.js';
import { validateHistoryLimit } from '../middleware/validateHistoryLimit.js';

const router = Router();

router.get('/', validateHistoryLimit, listRecentGames);

export default router;
