/**
 * calculate-confidence.js
 *
 * Helper for calculating confidence scores for service recommendations
 */

const { CONFIDENCE } = sails.config.constants;

module.exports = {
  friendlyName: 'Calculate confidence',

  description: 'Calculate confidence scores for recommendations',

  inputs: {
    recommendations: {
      type: 'ref',
      required: true,
      description: 'Array of recommendations',
    },
    matchedServices: {
      type: 'ref',
      required: true,
      description: 'Services from vector search with similarity scores',
    },
    rulesApplied: {
      type: 'ref',
      defaultsTo: [],
      description: 'Rules that were applied',
    },
  },

  exits: {
    success: {
      description: 'Confidence scores calculated',
    },
  },

  fn: async function (inputs) {
    try {
      const { recommendations, matchedServices, rulesApplied } = inputs;

      // Get configuration weights
      const vectorWeight = CONFIDENCE.vectorWeight || 0.4;
      const llmWeight = CONFIDENCE.llmWeight || 0.6;

      const scoredRecommendations = [];

      for (const recommendation of recommendations) {
        // Find matching service from vector search to get similarity score
        const matchedService = matchedServices.find(
          (s) => s.id === recommendation.serviceId
        );
        const vectorSimilarity = matchedService
          ? matchedService.similarity
          : 0.5;

        // Get LLM confidence from recommendation
        const llmConfidence = recommendation.confidence || 0.5;

        // Calculate base confidence
        let baseConfidence =
          vectorSimilarity * vectorWeight + llmConfidence * llmWeight;

        // Apply adjustments
        let adjustments = 0;
        const adjustmentDetails = [];

        // Emergency rule adjustment
        if (rulesApplied.includes('emergency_override')) {
          adjustmentDetails.push({
            rule: 'emergency_override',
            adjustment: 0,
            reason: 'Emergency override maintains original confidence',
          });
        }

        // Age-based rule adjustment
        if (
          rulesApplied.includes('pediatric_routing') ||
          rulesApplied.includes('geriatric_consideration')
        ) {
          adjustments += 0.05;
          adjustmentDetails.push({
            rule: 'age_based',
            adjustment: 0.05,
            reason: 'Age-appropriate routing applied',
          });
        }

        // Specialty boost adjustment
        const specialtyBoosts = rulesApplied.filter((rule) =>
          rule.endsWith('_boost')
        );
        if (specialtyBoosts.length > 0) {
          adjustments += 0.03;
          adjustmentDetails.push({
            rule: 'specialty_boost',
            adjustment: 0.03,
            reason: `Specialty match detected: ${specialtyBoosts.join(', ')}`,
          });
        }

        // Low similarity cap
        const similarityThreshold = 0.6;
        if (vectorSimilarity < similarityThreshold) {
          const cap = 0.7;
          if (baseConfidence + adjustments > cap) {
            adjustments = cap - baseConfidence;
            adjustmentDetails.push({
              rule: 'low_similarity_cap',
              adjustment: adjustments,
              reason: `Vector similarity below ${similarityThreshold}, capping confidence at ${cap}`,
            });
          }
        }

        // Calculate final confidence
        let finalConfidence = baseConfidence + adjustments;

        // Ensure confidence is within bounds [0, 1]
        finalConfidence = Math.max(0, Math.min(1, finalConfidence));

        // Round to 2 decimal places
        finalConfidence = Math.round(finalConfidence * 100) / 100;

        scoredRecommendations.push({
          ...recommendation,
          confidence: finalConfidence,
          confidenceBreakdown: {
            vectorSimilarity: Math.round(vectorSimilarity * 100) / 100,
            llmConfidence: Math.round(llmConfidence * 100) / 100,
            adjustments: Math.round(adjustments * 100) / 100,
            finalScore: finalConfidence,
            details: adjustmentDetails,
          },
        });
      }

      // Sort by confidence (descending)
      scoredRecommendations.sort((a, b) => b.confidence - a.confidence);

      return scoredRecommendations;
    } catch (error) {
      return false;
    }
  },
};
