/**
 * RecommendationController.js
 *
 * Controller for service recommendation and health check endpoints
 */

const { RESPONSE_CODES, UUID, EMBEDDING, SCHEMAS } = sails.config.constants;

module.exports = {
  /**
   * @name healthCheck
   * @file RecommendationController.js
   * @param {Request} req
   * @param {Response} res
   * @description This method is used to check the health of server
   * @author Ravi Patel (Zignuts)
   */
  healthCheck: async function (req, res) {
    try {
      // Perform health checks
      const healthStatus = await sails.helpers.checkHealth();

      if (!healthStatus) {
        return res.serverError({
          status: RESPONSE_CODES.SERVICE_UNAVAILABLE,
          data: {},
          message: req.i18n.__('HEALTH_CHECK_ERROR'),
          errorCode: '',
          error: new Error('Health check returned null'),
        });
      }

      // Return appropriate status based on health
      if (healthStatus.status === 'healthy') {
        return res.ok({
          status: RESPONSE_CODES.OK,
          data: healthStatus,
          message: req.i18n.__('SYSTEM_HEALTHY'),
        });
      } else {
        return res.ok({
          status: RESPONSE_CODES.SERVICE_UNAVAILABLE,
          data: healthStatus,
          message: req.i18n.__('SYSTEM_UNHEALTHY'),
        });
      }
    } catch (error) {
      return res.serverError({
        status: RESPONSE_CODES.SERVICE_UNAVAILABLE,
        data: {},
        message: req.i18n.__('HEALTH_CHECK_ERROR'),
        errorCode: '',
        error: error,
      });
    }
  },

  /**
   * @name recommendService
   * @file RecommendationController.js
   * @param {Request} req
   * @param {Response} res
   * @description This method is used to recommend queue service
   * @author Ravi Patel (Zignuts)
   */
  recommendService: async function (req, res) {
    try {
      // Validate input
      const validatedData = await sails.helpers.validateInput.with({
        data: req.body,
        schema: SCHEMAS.RECOMMEND_SERVICE,
      });

      if (!validatedData) {
        return res.badRequest({
          status: RESPONSE_CODES.BAD_REQUEST,
          message: req.i18n.__('INVALID_INPUT'),
          data: {},
        });
      }

      // Extract validated data
      const { symptoms, patientAge, metadata } = validatedData;

      // Get recommendations using helper
      const result = await sails.helpers.getRecommendations.with({
        symptoms: symptoms,
        patientAge: patientAge,
        metadata: metadata,
      });

      if (!result) {
        return res.serverError({
          status: RESPONSE_CODES.SERVICE_UNAVAILABLE,
          data: {},
          message: req.i18n.__('SERVICE_UNAVAILABLE'),
          errorCode: '',
          error: new Error('Recommendation service unavailable'),
        });
      }

      // Return successful response
      return res.ok({
        status: RESPONSE_CODES.OK,
        data: {
          recommendations: result.recommendations,
          metadata: result.metadata,
        },
        message: req.i18n.__('RECOMMENDATION_SUCCESS'),
      });
    } catch (error) {
      // Check for specific error types
      if (error.message.includes('temporarily unavailable')) {
        return res.serverError({
          status: RESPONSE_CODES.SERVICE_UNAVAILABLE,
          data: {},
          message: req.i18n.__('SERVICE_UNAVAILABLE'),
          errorCode: '',
          error: error,
        });
      }

      // Generic server error
      return res.serverError({
        status: RESPONSE_CODES.SERVER_ERROR,
        data: {},
        message: req.i18n.__('RECOMMENDATION_FAILED'),
        errorCode: '',
        error: error,
      });
    }
  },

  /**
   * @name syncEmbeddings
   * @file RecommendationController.js
   * @param {Request} req
   * @param {Response} res
   * @description This method is used to recommend queue service
   * @author Ravi Patel (Zignuts)
   */
  syncEmbeddings: async function (req, res) {
    try {
      // Validate input
      const validatedData = await sails.helpers.validateInput.with({
        data: req.body,
        schema: SCHEMAS.EMBEDDINGS_SYNC,
      });

      if (!validatedData) {
        return res.badRequest({
          status: RESPONSE_CODES.BAD_REQUEST,
          message: req.i18n.__('INVALID_INPUT'),
          data: {},
        });
      }

      const { force } = validatedData;

      // Start sync process
      const syncResult = await sails.helpers.syncServiceEmbeddings.with({
        force: force,
      });
      console.log('syncResult: ', syncResult);

      if (!syncResult) {
        return res.serverError({
          status: RESPONSE_CODES.SERVER_ERROR,
          data: {},
          message: req.i18n.__('EMBEDDING_SYNC_FAILED'),
          errorCode: '',
          error: new Error('Sync returned null'),
        });
      }

      // Return successful response
      return res.ok({
        status: RESPONSE_CODES.OK,
        data: { sync: syncResult },
        message: req.i18n.__('EMBEDDING_SYNC_SUCCESS'),
      });
    } catch (error) {
      return res.serverError({
        status: RESPONSE_CODES.SERVER_ERROR,
        data: {},
        message: req.i18n.__('EMBEDDING_SYNC_FAILED'),
        errorCode: '',
        error: error,
      });
    }
  },

  /**
   * @name createService
   * @file RecommendationController.js
   * @param {Request} req
   * @param {Response} res
   * @description Create a new service and generate its embedding
   * @author Ravi Patel (Zignuts)
   */
  createService: async function (req, res) {
    try {
      // Validate input
      const validatedData = await sails.helpers.validateInput.with({
        data: req.body,
        schema: SCHEMAS.CREATE_SERVICE,
      });

      if (!validatedData) {
        return res.badRequest({
          status: RESPONSE_CODES.BAD_REQUEST,
          message: req.i18n.__('INVALID_INPUT'),
          data: {},
        });
      }

      const { name, nameAr, description, servingTime, merchantID } =
        validatedData;

      // Create the service record
      const service = await Service.create({
        id: UUID.v4(),
        name,
        nameAr: nameAr || null,
        description,
        servingTime: servingTime || null,
        merchantID,
        isDeleted: false,
      }).fetch();

      // Generate embedding from name + description
      const textToEmbed = `${name}. ${description}`.trim();

      const embedding = await sails.helpers.generateEmbedding.with({
        text: textToEmbed,
      });

      if (embedding) {
        // Persist embedding via raw SQL (pgvector requires casting)
        const embeddingStr = `[${embedding.join(',')}]`;
        await sails.sendNativeQuery(
          `UPDATE "service"
           SET "embeddingVector" = $1::vector,
               "embeddingGeneratedAt" = $2,
               "embeddingModel" = $3
           WHERE "id" = $4`,
          [embeddingStr, Date.now(), EMBEDDING.MODEL, service.id]
        );

        service.embeddingGeneratedAt = Date.now();
        service.embeddingModel = EMBEDDING.MODEL;
      }

      return res.ok({
        status: RESPONSE_CODES.CREATED,
        message: req.i18n.__('SERVICE_CREATED'),
        data: {
          service: {
            id: service.id,
            name: service.name,
            nameAr: service.nameAr,
            description: service.description,
            servingTime: service.servingTime,
            merchantID: service.merchantID,
            embeddingGenerated: !!embedding,
            embeddingModel: embedding ? EMBEDDING.MODEL : null,
          },
        },
      });
    } catch (error) {
      return res.serverError({
        status: RESPONSE_CODES.SERVER_ERROR,
        data: {},
        message: req.i18n.__('SERVICE_CREATE_FAILED'),
        errorCode: '',
        error: error,
      });
    }
  },
};
