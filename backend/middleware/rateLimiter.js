const rateLimit = require('express-rate-limit');

const aiRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  keyGenerator: (req) => {
    if (req.user) return `user:${req.user.id}`;
    return req.ip || 'unknown';
  },
  validate: { xForwardedForHeader: false, keyGeneratorIpFallback: false },
  message: { error: 'AI rate limit exceeded. Max 20 requests/hour.' }
});

module.exports = { aiRateLimiter };
