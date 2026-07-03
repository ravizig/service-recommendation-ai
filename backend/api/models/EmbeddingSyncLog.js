/**
 * EmbeddingSyncLog.js
 *
 * Model for tracking embedding synchronization operations
 *
 * @description :: Logs the history of embedding sync operations
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
  attributes: {
    // Primary key
    id: {
      type: 'string',
      required: true,
    },
    // When the sync process started
    syncStartedAt: {
      type: 'number',
      required: true,
    },
    // When the sync process completed
    syncCompletedAt: {
      type: 'ref',
    },
    // Total number of services processed
    servicesProcessed: {
      type: 'number',
      defaultsTo: 0,
    },
    // Number of services with embeddings updated
    servicesUpdated: {
      type: 'number',
      defaultsTo: 0,
    },
    // Number of services that failed to process
    servicesFailed: {
      type: 'number',
      defaultsTo: 0,
    },
    // Current status of the sync operation
    status: {
      type: 'string',
      isIn: ['inprogress', 'completed', 'failed'],
      defaultsTo: 'inprogress',
    },
    // Error message if sync failed
    errorMessage: {
      type: 'string',
    },
  },
};
