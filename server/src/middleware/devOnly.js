// devOnly middleware
//
// Gates dev-aid endpoints (token sync, env presence reports, tool catalog
// dumps, etc.) so they can't be hit on production. Returns 404 — not 403 —
// because we'd rather not advertise that a route exists at all to scanners.
//
// Override with ALLOW_DEV_ROUTES=true if you have a staging environment
// where you genuinely want them. Vercel production should NEVER set this.

export const devRoutesAllowed =
  process.env.NODE_ENV !== 'production' || process.env.ALLOW_DEV_ROUTES === 'true';

export const devOnly = (_req, res, next) => {
  if (!devRoutesAllowed) return res.status(404).json({ error: 'Not found' });
  next();
};
