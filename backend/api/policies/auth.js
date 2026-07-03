/**
 * auth.js
 *
 * Policy for API key authentication
 * Validates the X-API-Key header against configured valid API keys
 */

const { API_DATA } = sails.config.constants;
module.exports = async function (req, res, proceed) {
  console.log('process.env.VALID_API_KEYS: ', process.env.VALID_API_KEYS);
  console.log('API_DATA: ', API_DATA);

  // Get API key from header
  const apiKey = req.get('X-API-Key');
  let currentTime = Date.now();

  // Check if API key is provided
  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'MISSING_API_KEY',
        message: 'API key is required. Please provide X-API-Key header.',
      },
      timestamp: currentTime,
    });
  }

  // Validate API key
  if (!API_DATA.VALID_API_KEYS.includes(apiKey)) {
    // Log authentication failure
    sails.log.warn('Authentication failed: Invalid API key', {
      providedKey: apiKey.substring(0, 8) + '...', // Log only first 8 chars
      ip: req.ip,
      path: req.path,
      timestamp: currentTime,
    });

    return res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_API_KEY',
        message: 'Invalid API key provided.',
      },
      timestamp: currentTime,
    });
  }

  // Store API key in request for use by rate limiter
  req.apiKey = apiKey;

  // Log successful authentication (debug level)
  sails.log.debug('Authentication successful', {
    apiKey: apiKey.substring(0, 8) + '...',
    path: req.path,
  });

  // API key is valid, proceed to next policy or controller
  return proceed();
};
