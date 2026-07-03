/**
 * Policy Mappings
 * (sails.config.policies)
 *
 * Policies are simple functions which run **before** your actions.
 *
 * For more information on configuring policies, check out:
 * https://sailsjs.com/docs/concepts/policies
 */

module.exports.policies = {
  /***************************************************************************
   *                                                                          *
   * AI Queue Recommendation Engine - Policy Configuration                   *
   *                                                                          *
   * Policies are applied in the order listed                                *
   * 1. Authentication (auth) - Validates API key                            *
   * 2. Rate Limiting (rateLimit) - Enforces request limits                  *
   *                                                                          *
   ***************************************************************************/

  // Recommendation Controller
  RecommendationController: {
    healthCheck: true, // Health check - public access
    '*': ['auth', 'rateLimit'], // All other endpoints require auth and rate limiting
  },
};
