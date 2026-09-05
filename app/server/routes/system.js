import { Router } from 'express';
import { GENRES, LIMITS } from '../constants.js';

export const systemRouter = Router();

systemRouter.get('/health', (req, res) => {
  res.json({ data: { status: 'ok', uptime: Math.round(process.uptime()) } });
});

systemRouter.get('/meta', (req, res) => {
  res.json({ data: { genres: GENRES, limits: LIMITS } });
});

// Test-support hook: resets the calling tenant only, never other tenants.
systemRouter.post('/test/reset', (req, res) => {
  const seed = req.body?.seed ?? true;
  req.store.reset({ seed: Boolean(seed) });
  res.status(204).end();
});
