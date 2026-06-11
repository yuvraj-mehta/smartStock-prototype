import { conf } from '../config/config.js';

const getClientIp = (req) => req.ip || req.socket?.remoteAddress || 'anonymous';

const routeAwareKey = (req) => `${getClientIp(req)}:${req.method}:${req.baseUrl}${req.path}`;

export const createRateLimiter = ({
  windowMs,
  max,
  message = 'Too many requests, please try again later.',
  keyGenerator = getClientIp,
  now = () => Date.now(),
} = {}) => {
  const hits = new Map();

  return (req, res, next) => {
    const resolvedMax = Number(max);
    const resolvedWindowMs = Number(windowMs);

    if (!Number.isFinite(resolvedMax) || resolvedMax <= 0) {
      return next();
    }

    const safeWindowMs = Number.isFinite(resolvedWindowMs) && resolvedWindowMs > 0
      ? resolvedWindowMs
      : 15 * 60 * 1000;
    const timestamp = now();
    for (const [storedKey, storedBucket] of hits) {
      if (storedBucket.resetAt <= timestamp) {
        hits.delete(storedKey);
      }
    }

    const key = keyGenerator(req);
    const existing = hits.get(key);
    const bucket = existing && existing.resetAt > timestamp
      ? existing
      : { count: 0, resetAt: timestamp + safeWindowMs };

    bucket.count += 1;
    hits.set(key, bucket);

    const resetSeconds = Math.ceil(bucket.resetAt / 1000);
    const remaining = Math.max(resolvedMax - bucket.count, 0);

    res.setHeader('RateLimit-Limit', String(resolvedMax));
    res.setHeader('RateLimit-Remaining', String(remaining));
    res.setHeader('RateLimit-Reset', String(resetSeconds));

    if (bucket.count > resolvedMax) {
      res.setHeader('Retry-After', String(Math.ceil((bucket.resetAt - timestamp) / 1000)));
      return res.status(429).json({ message });
    }

    return next();
  };
};

export const globalRateLimiter = createRateLimiter(conf.rateLimits.global);

export const authRateLimiter = createRateLimiter({
  ...conf.rateLimits.auth,
  keyGenerator: routeAwareKey,
  message: 'Too many authentication attempts, please try again later.',
});

export const aiRateLimiter = createRateLimiter({
  ...conf.rateLimits.ai,
  keyGenerator: routeAwareKey,
  message: 'Too many AI requests, please try again later.',
});
