const { PRIORITY_LEVELS, WAIT_TIMES, OPENAI, HUGGINGFACE, CONFIDENCE } =
  sails.config.constants;

module.exports = {
  friendlyName: 'Get recommendations',

  description:
    'Get service recommendations based on symptoms using AI and vector similarity search',

  inputs: {
    symptoms: {
      type: 'string',
      required: true,
      description: 'Patient symptoms description',
    },

    patientAge: {
      type: 'number',
      description: 'Patient age for age-based routing',
    },

    metadata: {
      type: 'json',
      description: 'Additional metadata for the recommendation request',
    },
  },

  exits: {
    success: {
      description: 'Recommendations generated successfully',
    },

    error: {
      description: 'Failed to generate recommendations',
    },
  },

  fn: async function (inputs, exits) {
    const { PRIORITY_LEVELS, WAIT_TIMES, HUGGINGFACE, CONFIDENCE } =
      sails.config.constants;

    try {
      sails.log.info('Starting recommendation pipeline', {
        symptomsLength: inputs.symptoms.length,
        patientAge: inputs.patientAge,
      });

      const startTime = Date.now();
      const timing = {};

      // Sanitize input (remove PII)
      const sanitizedSymptoms = await sails.helpers.sanitizePii.with({
        text: inputs.symptoms,
      });

      // Generate embedding for symptoms
      sails.log.debug('Step 1: Generating embedding');
      const embeddingStart = Date.now();

      const embedding = await sails.helpers.circuitBreaker.with({
        fn: async () => {
          return await sails.helpers.generateEmbedding.with({
            text: inputs.symptoms,
          });
        },
        args: [],
        threshold: 3,
        threshold: 60000,
      });

      if (!embedding) {
        throw new Error('Embedding generation failed');
      }

      timing.embeddingTime = Date.now() - embeddingStart;

      // Vector similarity search
      sails.log.debug('Step 2: Performing vector search');
      const searchStart = Date.now();

      const matchedServices = await sails.helpers.searchSimilarServices.with({
        embedding: embedding,
        limit: 5,
        threshold: 0.5,
      });

      timing.searchTime = Date.now() - searchStart;

      console.log('matchedServices: ', matchedServices);

      // Check if we got any matches
      if (!matchedServices || matchedServices.length === 0) {
        sails.log.warn('No matching services found');

        return exits.success({
          recommendations: [],
          metadata: {
            ...timing,
            processingTime: Date.now() - startTime,
            timestamp: Date.now(),
            fallback: true,
          },
        });
      }

      sails.log.debug(`Found ${matchedServices.length} matching services`);

      // AI Reasoning with LangGraph
      sails.log.debug('Step 3: AI reasoning');
      const reasoningStart = Date.now();

      const aiResult = await sails.helpers.circuitBreaker.with({
        fn: async () => {
          return await sails.helpers.getAiRecommendations.with({
            symptoms: inputs.symptoms,
            matchedServices: matchedServices,
            patientAge: inputs.patientAge,
          });
        },
        args: [],
        threshold: 3,
        timeout: 60000,
      });

      timing.reasoningTime = Date.now() - reasoningStart;

      let recommendations = [];
      console.log('aiResult: ', aiResult);

      if (!aiResult || !aiResult.recommendations) {
        // Fallback to rule-based
        sails.log.warn('AI service unavailable, using fallback');
        recommendations = matchedServices.slice(0, 3).map((service) => ({
          serviceId: service.id,
          serviceName: service.name,
          serviceNameAr: service.nameAr,
          serviceDescription: service.description,
          servingTime: service.servingTime,
          merchantID: service.merchantID,
          confidence: Math.min(service.similarity * 0.75, 0.7),
          priority: PRIORITY_LEVELS.MEDIUM,
          estimatedWait: WAIT_TIMES.MEDIUM,
        }));
      } else {
        console.log('heyyyy');
        recommendations = aiResult.recommendations;
      }

      // Rule validation
      sails.log.debug('Step 4: Applying business rules');
      const validationStart = Date.now();

      const ruleResult = await sails.helpers.validateRecommendations.with({
        recommendations: recommendations,
        symptoms: inputs.symptoms,
        patientAge: inputs.patientAge,
      });

      if (!ruleResult) {
        throw new Error('Rule validation failed');
      }

      recommendations = ruleResult.recommendations;
      const rulesApplied = ruleResult.rulesApplied;
      const warnings = ruleResult.warnings;

      timing.validationTime = Date.now() - validationStart;

      // Confidence scoring
      sails.log.debug('Step 5: Calculating confidence scores');
      const scoringStart = Date.now();

      recommendations = await sails.helpers.calculateConfidence.with({
        recommendations: recommendations,
        matchedServices: matchedServices,
        rulesApplied: rulesApplied,
      });

      if (!recommendations) {
        throw new Error('Confidence calculation failed');
      }

      timing.scoringTime = Date.now() - scoringStart;

      // Add confidence warnings
      const warningThreshold = CONFIDENCE.WARNING_THRESHOLD || 0.6;

      recommendations = recommendations.map((rec) => {
        const warning =
          rec.confidence < warningThreshold
            ? `Low confidence score (${Math.round(rec.confidence * 100)}%). Consider manual review or additional information.`
            : null;

        return {
          ...rec,
          rulesApplied: rulesApplied,
          warnings: warning ? [warning, ...warnings] : warnings,
        };
      });

      // Calculate total processing time
      timing.processingTime = Date.now() - startTime;

      // Build final response
      const response = {
        recommendations: recommendations,
        metadata: {
          ...timing,
          timestamp: Date.now(),
          model: HUGGINGFACE.MODEL,
          embeddingModel: HUGGINGFACE.EMBEDDING_MODEL,
          matchedServicesCount: matchedServices.length,
        },
      };

      sails.log.info('Recommendation pipeline completed successfully', {
        recommendationsCount: recommendations.length,
        processingTime: timing.processingTime,
      });

      // Log sanitized version for audit
      sails.log.info('Recommendation request logged', {
        sanitizedSymptoms: sanitizedSymptoms.substring(0, 100),
        topRecommendation: recommendations[0]?.serviceName,
        topConfidence: recommendations[0]?.confidence,
        ...timing,
      });

      return exits.success(response);
    } catch (error) {
      sails.log.error('Recommendation pipeline failed', {
        error: error.message,
        stack: error.stack,
      });

      return exits.error(error);
    }
  },
};
