/**
 * check-health.js
 *
 * Helper for checking the health status of system dependencies
 */

const { InferenceClient, HEALTH_STATUS } = sails.config.constants;

module.exports = {
  friendlyName: 'Check health',

  description: 'Perform comprehensive health check on all system components',

  inputs: {},

  exits: {
    success: {
      description: 'Health check completed',
    },
  },

  fn: async function () {
    try {
      sails.log.debug('Starting health check');

      let currentTime = Date.now();

      const healthStatus = {
        status: HEALTH_STATUS.HEALTHY,
        services: {},
        timestamp: currentTime,
      };

      // Check database
      const dbHealth = await checkDatabase();
      healthStatus.services.database = dbHealth;

      // Check Hugging Face API
      const huggingfaceHealth = await checkHuggingFace();
      healthStatus.services.huggingface = huggingfaceHealth;

      // Check pgvector
      const pgvectorHealth = await checkPgVector();
      healthStatus.services.pgvector = pgvectorHealth;

      // Determine overall status
      const allHealthy = Object.values(healthStatus.services).every(
        (service) =>
          service.status === HEALTH_STATUS.CONNECTED ||
          service.status === HEALTH_STATUS.AVAILABLE ||
          service.status === HEALTH_STATUS.OPERATIONAL
      );

      healthStatus.status = allHealthy
        ? HEALTH_STATUS.HEALTHY
        : HEALTH_STATUS.UNHEALTHY;

      // Add system information
      healthStatus.system = {
        nodeVersion: process.version,
        platform: process.platform,
        uptime: process.uptime(),
        memory: {
          used: process.memoryUsage().heapUsed,
          total: process.memoryUsage().heapTotal,
        },
      };

      sails.log.info('Health check completed', {
        status: healthStatus.status,
      });

      return healthStatus;
    } catch (error) {
      sails.log.error('Check health helper failed', {
        error: error.message,
      });
      return false;
    }
  },
};

// Helper functions
async function checkDatabase() {
  const startTime = Date.now();

  try {
    await sails.sendNativeQuery('SELECT 1');

    const responseTime = Date.now() - startTime;

    return {
      status: HEALTH_STATUS.CONNECTED,
      responseTime: responseTime,
    };
  } catch (error) {
    sails.log.error('Database health check failed', {
      error: error.message,
    });

    return {
      status: HEALTH_STATUS.DISCONNECTED,
      error: error.message,
      responseTime: Date.now() - startTime,
    };
  }
}

async function checkHuggingFace() {
  const startTime = Date.now();

  try {
    const config = sails.config.constants.HUGGINGFACE;

    if (!config.API_KEY) {
      return {
        status: HEALTH_STATUS.NOT_CONFIGURED,
        error: 'Hugging Face API key not configured',
      };
    }

    // Initialize Hugging Face Inference Client
    const client = new InferenceClient(config.API_KEY);

    // Simple test call to check API availability using feature extraction
    await client.featureExtraction({
      model: config.EMBEDDING_MODEL,
      inputs: 'health check test',
    });

    const responseTime = Date.now() - startTime;

    return {
      status: HEALTH_STATUS.AVAILABLE,
      responseTime: responseTime,
      embeddingModel: config.EMBEDDING_MODEL,
      textModel: config.MODEL,
    };
  } catch (error) {
    sails.log.error('Hugging Face health check failed', {
      error: error.message,
    });

    // Check if it's a model loading error
    if (error.message && error.message.includes('loading')) {
      return {
        status: HEALTH_STATUS.AVAILABLE,
        note: 'Model is loading',
        responseTime: Date.now() - startTime,
      };
    }

    return {
      status: HEALTH_STATUS.UNAVAILABLE,
      error: error.message,
      responseTime: Date.now() - startTime,
    };
  }
}

async function checkPgVector() {
  const { HEALTH_STATUS } = sails.config.constants;
  const startTime = Date.now();

  try {
    const extensionCheck = await sails.sendNativeQuery(`
      SELECT extname, extversion 
      FROM pg_extension 
      WHERE extname = 'vector';
    `);

    if (!extensionCheck.rows || extensionCheck.rows.length === 0) {
      return {
        status: HEALTH_STATUS.NOT_INSTALLED,
        error: 'pgvector extension not found',
        responseTime: Date.now() - startTime,
      };
    }

    // Check if index exists on service table
    const indexCheck = await sails.sendNativeQuery(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'service' 
        AND indexname = 'idxServiceEmbeddingVector';
    `);

    const indexExists = indexCheck.rows && indexCheck.rows.length > 0;

    const responseTime = Date.now() - startTime;

    return {
      status: HEALTH_STATUS.OPERATIONAL,
      version: extensionCheck.rows[0].extversion,
      indexExists: indexExists,
      responseTime: responseTime,
    };
  } catch (error) {
    sails.log.error('pgvector health check failed', {
      error: error.message,
    });

    return {
      status: HEALTH_STATUS.ERROR,
      error: error.message,
      responseTime: Date.now() - startTime,
    };
  }
}
