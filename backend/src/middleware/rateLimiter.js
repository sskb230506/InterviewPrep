const rateLimits = new Map();

// Periodic cleanup of expired rate limit entries to avoid memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [ip, requests] of rateLimits.entries()) {
    const activeRequests = requests.filter((time) => now - time < 15 * 60 * 1000);
    if (activeRequests.length === 0) {
      rateLimits.delete(ip);
    } else {
      rateLimits.set(ip, activeRequests);
    }
  }
}, 10 * 60 * 1000).unref();

export function createRateLimiter({ windowMs, max, message }) {
  return (req, res, next) => {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const now = Date.now();

    if (!rateLimits.has(ip)) {
      rateLimits.set(ip, []);
    }

    const requests = rateLimits.get(ip);
    const activeRequests = requests.filter((time) => now - time < windowMs);

    const remaining = Math.max(0, max - activeRequests.length);
    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', remaining);

    if (activeRequests.length >= max) {
      const oldestActive = activeRequests[0];
      const resetTime = oldestActive + windowMs;
      const retryAfterSeconds = Math.ceil((resetTime - now) / 1000);

      res.setHeader('Retry-After', retryAfterSeconds);
      res.status(429).json(message || { error: 'Too many requests, please try again later.' });
      return;
    }

    activeRequests.push(now);
    rateLimits.set(ip, activeRequests);
    next();
  };
}

export const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // generous for local dev; tighten in production
  message: { error: 'Too many login or registration attempts. Please try again after 15 minutes.' },
});

export const llmLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,
  message: { error: 'Rate limit exceeded for AI generation. Please try again after 15 minutes.' },
});
