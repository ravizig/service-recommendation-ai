/**
 * rateLimit.js
 *
 * Policy for rate limiting API requests
 * Uses sliding window algorithm with per-API-key tracking
 */

const { RATE_LIMITING } = sails.config.constants;

// In-memory storage for rate limiting (per API key)
// In production, consider using Redis for distributed rate limiting
const rateLimitStore = new Map();

module.exports = async function (req, res, proceed) {
  // Get configuration
  const windowMs = RATE_LIMITING.WINDOW_MS || 60000; // 60 seconds
  const maxRequests = RATE_LIMITING.MAX_REQUESTS || 100;

  // Get API key from request (set by auth policy)
  const apiKey = req.apiKey || req.get('X-API-Key') || 'anonymous';

  // Get current timestamp
  const now = Date.now();

  // Get or initialize rate limit data for this API key
  if (!rateLimitStore.has(apiKey)) {
    rateLimitStore.set(apiKey, {
      requests: [],
      resetTime: now + windowMs,
    });
  }

  const rateLimitData = rateLimitStore.get(apiKey);

  // Remove requests outside the current window
  rateLimitData.requests = rateLimitData.requests.filter(
    (timestamp) => now - timestamp < windowMs
  );

  // Check if limit is exceeded
  if (rateLimitData.requests.length >= maxRequests) {
    // Calculate retry-after time
    const oldestRequest = rateLimitData.requests[0];
    const retryAfter = Math.ceil((windowMs - (now - oldestRequest)) / 1000);

    // Log rate limit exceeded
    sails.log.warn('Rate limit exceeded', {
      apiKey: apiKey.substring(0, 8) + '...',
      requests: rateLimitData.requests.length,
      maxRequests: maxRequests,
      windowMs: windowMs,
      ip: req.ip,
      path: req.path,
    });

    // Set rate limit headers
    res.set({
      'X-RateLimit-Limit': maxRequests,
      'X-RateLimit-Remaining': 0,
      'X-RateLimit-Reset': new Date(oldestRequest + windowMs).toISOString(),
      'Retry-After': retryAfter,
    });

    return res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: `Rate limit exceeded. Maximum ${maxRequests} requests per ${windowMs / 1000} seconds.`,
        retryAfter: retryAfter,
      },
      timestamp: Date.now(),
    });
  }

  // Add current request to the window
  rateLimitData.requests.push(now);

  // Calculate remaining requests
  const remaining = maxRequests - rateLimitData.requests.length;

  // Set rate limit headers
  res.set({
    'X-RateLimit-Limit': maxRequests,
    'X-RateLimit-Remaining': remaining,
    'X-RateLimit-Reset': new Date(
      rateLimitData.requests[0] + windowMs
    ).toISOString(),
  });

  // Clean up old entries periodically (every 100 requests)
  if (Math.random() < 0.01) {
    // 1% chance
    cleanupRateLimitStore(windowMs);
  }

  // Request is within limits, proceed
  return proceed();
};

/**
 * Clean up rate limit store by removing expired entries
 */
function cleanupRateLimitStore(windowMs) {
  const now = Date.now();
  let removedCount = 0;

  for (const [apiKey, data] of rateLimitStore.entries()) {
    // Remove entries with no recent requests
    if (
      data.requests.length === 0 ||
      now - data.requests[data.requests.length - 1] > windowMs * 2
    ) {
      rateLimitStore.delete(apiKey);
      removedCount++;
    }
  }

  if (removedCount > 0) {
    sails.log.debug(`Cleaned up ${removedCount} expired rate limit entries`);
  }
}
