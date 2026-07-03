/**
 * Route Mappings
 * (sails.config.routes)
 *
 * Your routes tell Sails what to do each time it receives a request.
 *
 * For more information on configuring custom routes, check out:
 * https://sailsjs.com/anatomy/config/routes-js
 */

module.exports.routes = {
  /***************************************************************************
   *                                                                          *
   * AI Queue Recommendation Engine API Routes                               *
   *                                                                          *
   ***************************************************************************/

  // Health check endpoint (no authentication required)
  'GET /hc': 'RecommendationController.healthCheck',

  // Main recommendation endpoint
  'POST /recommend-service': 'RecommendationController.recommendService',

  // Embedding synchronization endpoint
  'POST /embeddings/sync': 'RecommendationController.syncEmbeddings',

  // Create a new service and generate its embedding
  'POST /services': 'RecommendationController.createService',
};
