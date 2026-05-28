import { Router } from 'express';
import { getCumulativeMetrics } from '../database.js';
import { getActiveSessionCount } from '../services/session.js';

const router = Router();

/**
 * Lightweight JSON API for external dashboards or monitoring tools.
 * Does not expose any message content.
 */
router.get('/metrics', (_req, res) => {
  const metrics = getCumulativeMetrics();
  res.json({
    ...metrics,
    activeSessions: getActiveSessionCount(),
    timestamp: new Date().toISOString(),
  });
});

export default router;
