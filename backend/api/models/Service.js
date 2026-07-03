/**
 * Service.js
 *
 * Model for merchant services/queues
 *
 * @description :: Represents a service/queue offered by a merchant
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
  attributes: {
    // Primary key
    id: {
      type: 'string',
      required: true,
    },
    // Service name in English
    name: {
      type: 'string',
    },
    // Service name in Arabic
    nameAr: {
      type: 'string',
    },
    // Serving time in minutes
    servingTime: {
      type: 'number',
    },
    // Soft delete flag
    isDeleted: {
      type: 'boolean',
      defaultsTo: false,
    },
    // Merchant identifier
    merchantID: {
      type: 'string',
      required: true,
    },
    // Service description
    description: {
      type: 'string',
    },
    // Vector embedding of the service description (stored as PostgreSQL vector type)
    embeddingVector: {
      type: 'ref',
    },
    // Timestamp when embedding was generated
    embeddingGeneratedAt: {
      type: 'number',
    },
    // Model used to generate the embedding
    embeddingModel: {
      type: 'string',
    },
  },
};
