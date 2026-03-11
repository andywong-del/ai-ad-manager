import { Router } from 'express';
import * as tokenService from '../services/tokenService.js';

const router = Router();

router.post('/token', async (req, res, next) => {
  const { shortLivedToken } = req.body;
  if (!shortLivedToken) {
    return res.status(400).json({ error: 'shortLivedToken is required' });
  }
  try {
    const result = await tokenService.exchangeToken(shortLivedToken);
    res.json({
      longLivedToken: result.longLivedToken,
      expiresAt: result.expiresAt,
      tokenType: result.tokenType
    });
  } catch (err) {
    const metaError = err.response?.data?.error;
    const error = new Error(metaError?.message || 'Token exchange failed');
    error.status = 502;
    next(error);
  }
});

export default router;
