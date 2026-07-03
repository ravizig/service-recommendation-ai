/**
 * search-similar-services.js
 *
 * Helper for vector similarity search using pgvector
 */

const { EMBEDDING, VECTOR_SEARCH } = sails.config.constants;

module.exports = {
  friendlyName: 'Search similar services',

  description: 'Search for similar services using vector similarity',

  inputs: {
    embedding: {
      type: 'ref',
      required: true,
      description: 'The query embedding vector (1536 dimensions)',
    },
    limit: {
      type: 'number',
      defaultsTo: 5,
      description: 'Maximum number of results to return',
    },
    threshold: {
      type: 'number',
      defaultsTo: 0.5,
      description: 'Minimum similarity threshold (0.0 to 1.0)',
    },
  },

  exits: {
    success: {
      description: 'Search completed',
    },
  },

  fn: async function (inputs) {
    try {
      const { embedding, limit, threshold } = inputs;

      // Validate embedding
      if (!Array.isArray(embedding)) {
        return false;
      }

      if (embedding.length !== EMBEDDING.DIMENSION) {
        return false;
      }

      // Get configurations
      const searchLimit = limit || VECTOR_SEARCH.DEFAULT_LIMIT;
      const similarityThreshold = threshold || VECTOR_SEARCH.DEFAULT_THRESHOLD;

      sails.log.debug('Performing vector similarity search', {
        limit: searchLimit,
        threshold: similarityThreshold,
      });

      const startTime = Date.now();

      let query = `
          SELECT 
            s."id",
            s."name",
            s."nameAr",
            s."description",
            s."servingTime",
            s."merchantID",
            1 - (s."embeddingVector" <=> $1::vector) AS "similarity"
          FROM 
            "service" s
          WHERE
            s."embeddingVector" IS NOT NULL
            AND s."isDeleted" = FALSE
            AND 1 - (s."embeddingVector" <=> $1::vector) > $2
          ORDER BY s."embeddingVector" <=> $1::vector
          LIMIT $3 `;

      console.log('query: ', query);

      console.log('paramValues ', [
        JSON.stringify(embedding),
        similarityThreshold,
        searchLimit,
      ]);

      // Perform vector similarity search using raw SQL query
      const result = await sails.sendNativeQuery(query, [
        JSON.stringify(embedding),
        similarityThreshold,
        searchLimit,
      ]);

      const duration = Date.now() - startTime;

      // Extract rows from result
      const services = result.rows || [];

      sails.log.info('Vector search completed', {
        resultsCount: services.length,
        duration: duration,
        topSimilarity: services.length > 0 ? services[0].similarity : null,
      });

      // Format and return results
      return services.map((service) => ({
        id: service.id,
        name: service.name,
        nameAr: service.nameAr,
        description: service.description,
        servingTime: service.servingTime,
        merchantID: service.merchantID,
        similarity: parseFloat(service.similarity),
      }));
    } catch (error) {
      sails.log.error('Search similar services helper failed', {
        error: error.message,
      });
      return false;
    }
  },
};
