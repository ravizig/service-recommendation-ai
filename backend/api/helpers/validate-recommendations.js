/**
 * validate-recommendations.js
 *
 * Helper for applying deterministic business rules to service recommendations
 */

module.exports = {
  friendlyName: 'Validate recommendations',

  description: 'Validate and adjust recommendations based on business rules',

  inputs: {
    recommendations: {
      type: 'ref',
      required: true,
      description: 'Array of AI-generated recommendations',
    },
    symptoms: {
      type: 'string',
      required: true,
      description: 'Patient symptoms text',
    },
    patientAge: {
      type: 'number',
      description: 'Patient age (optional)',
    },
  },

  exits: {
    success: {
      description: 'Recommendations validated',
    },
  },

  fn: async function (inputs) {
    try {
      const { recommendations, symptoms, patientAge } = inputs;

      sails.log.debug('Validating recommendations with rule engine');

      const rulesApplied = [];
      const warnings = [];
      let modifiedRecommendations = [...recommendations];

      // Apply emergency overrides
      const emergencyResult = await applyEmergencyOverrides(
        modifiedRecommendations,
        symptoms
      );
      modifiedRecommendations = emergencyResult.recommendations;
      if (emergencyResult.ruleApplied) {
        rulesApplied.push('emergency_override');
      }

      // Apply age-based rules
      if (patientAge !== undefined && patientAge !== null) {
        const ageResult = await applyAgeRules(
          modifiedRecommendations,
          patientAge
        );
        modifiedRecommendations = ageResult.recommendations;
        rulesApplied.push(...ageResult.rulesApplied);
      }

      // Apply specialty-specific rules
      const specialtyResult = await applySpecialtyRules(
        modifiedRecommendations,
        symptoms
      );
      modifiedRecommendations = specialtyResult.recommendations;
      rulesApplied.push(...specialtyResult.rulesApplied);

      sails.log.info('Rule validation completed', {
        rulesApplied: rulesApplied,
        warningsCount: warnings.length,
      });

      return {
        recommendations: modifiedRecommendations,
        rulesApplied: rulesApplied,
        warnings: warnings,
      };
    } catch (error) {
      sails.log.error('Validate recommendations helper failed', {
        error: error.message,
      });
      return false;
    }
  },
};

// Helper functions
async function applyEmergencyOverrides(recommendations, symptoms) {
  try {
    const rules = sails.config.rules;
    const emergencyKeywords = rules.emergencyKeywords || [];

    const symptomsLower = symptoms.toLowerCase();
    const emergencyDetected = emergencyKeywords.some((keyword) =>
      symptomsLower.includes(keyword.toLowerCase())
    );

    if (!emergencyDetected) {
      return { recommendations, ruleApplied: false };
    }

    sails.log.warn('Emergency symptoms detected');

    const hasEmergency = recommendations.some(
      (rec) =>
        rec.serviceName && rec.serviceName.toLowerCase().includes('emergency')
    );

    if (hasEmergency) {
      recommendations.sort((a, b) => {
        const aIsEmergency = a.serviceName.toLowerCase().includes('emergency');
        const bIsEmergency = b.serviceName.toLowerCase().includes('emergency');
        if (aIsEmergency && !bIsEmergency) return -1;
        if (!aIsEmergency && bIsEmergency) return 1;
        return 0;
      });

      recommendations = recommendations.map((rec) => {
        if (rec.serviceName.toLowerCase().includes('emergency')) {
          return {
            ...rec,
            priority: 'Critical',
            estimatedWait: 'Immediate',
            confidence: Math.max(rec.confidence, 0.95),
          };
        }
        return rec;
      });
    } else {
      const emergencyService = await Service.findOne({
        name: { contains: 'Emergency' },
        status: 'active',
      });

      if (emergencyService) {
        recommendations.unshift({
          serviceId: emergencyService.id,
          serviceName: emergencyService.name,
          serviceDescription: emergencyService.description,
          specialty: emergencyService.specialty,
          confidence: 0.95,
          priority: 'Critical',
          estimatedWait: 'Immediate',
          reasoning:
            'Critical emergency symptoms detected. Immediate medical evaluation required.',
        });
      }
    }

    return { recommendations, ruleApplied: true };
  } catch (error) {
    return { recommendations, ruleApplied: false };
  }
}

async function applyAgeRules(recommendations, patientAge) {
  try {
    const rules = sails.config.rules.ageRules;
    const rulesApplied = [];

    // Pediatric rule
    if (patientAge < rules.pediatric.maxAge) {
      recommendations = recommendations.map((rec) => {
        const isPediatric = rules.pediatric.preferredQueues.some((name) =>
          rec.serviceName.toLowerCase().includes(name.toLowerCase())
        );

        if (isPediatric) {
          return {
            ...rec,
            confidence: Math.min(
              1.0,
              rec.confidence + rules.pediatric.scoreBoost
            ),
          };
        }
        return rec;
      });

      const hasPediatric = recommendations.some((rec) =>
        rules.pediatric.preferredQueues.some((name) =>
          rec.serviceName.toLowerCase().includes(name.toLowerCase())
        )
      );

      if (!hasPediatric) {
        const pediatricService = await Service.findOne({
          name: { contains: 'Pediatric' },
          status: 'active',
        });

        if (pediatricService) {
          recommendations.push({
            serviceId: pediatricService.id,
            serviceName: pediatricService.name,
            serviceDescription: pediatricService.description,
            specialty: pediatricService.specialty,
            confidence: 0.75,
            priority: 'Medium',
            estimatedWait: '30-60min',
            reasoning: `Patient is ${patientAge} years old. Pediatric evaluation recommended.`,
          });
        }
      }

      rulesApplied.push('pediatric_routing');
    }

    // Geriatric considerations
    if (patientAge >= rules.geriatric.minAge) {
      rulesApplied.push('geriatric_consideration');

      if (recommendations.length > 0) {
        recommendations[0] = {
          ...recommendations[0],
          reasoning:
            recommendations[0].reasoning +
            ' (Note: Patient age requires additional monitoring)',
        };
      }
    }

    return { recommendations, rulesApplied };
  } catch (error) {
    return { recommendations, rulesApplied: [] };
  }
}

async function applySpecialtyRules(recommendations, symptoms) {
  try {
    const rules = sails.config.rules.specialtyRules || [];
    const rulesApplied = [];
    const symptomsLower = symptoms.toLowerCase();

    for (const rule of rules) {
      const keywordMatch = rule.keywords.some((keyword) =>
        symptomsLower.includes(keyword.toLowerCase())
      );

      if (!keywordMatch) continue;

      const hasSpecialty = recommendations.some(
        (rec) =>
          rec.specialty &&
          rec.specialty.toLowerCase().includes(rule.specialty.toLowerCase())
      );

      if (rule.action === 'boostScore' && hasSpecialty) {
        recommendations = recommendations.map((rec) => {
          if (
            rec.specialty &&
            rec.specialty.toLowerCase().includes(rule.specialty.toLowerCase())
          ) {
            return {
              ...rec,
              confidence: Math.min(1.0, rec.confidence + rule.scoreBoost),
            };
          }
          return rec;
        });

        rulesApplied.push(`${rule.specialty.toLowerCase()}_boost`);
      }

      if (rule.action === 'ensureIncluded' && !hasSpecialty) {
        const specialtyService = await Service.findOne({
          specialty: { contains: rule.specialty },
          status: 'active',
        });

        if (specialtyService) {
          recommendations.push({
            serviceId: specialtyService.id,
            serviceName: specialtyService.name,
            serviceDescription: specialtyService.description,
            specialty: specialtyService.specialty,
            confidence: 0.8,
            priority: 'High',
            estimatedWait: '15-30min',
            reasoning: `Symptoms indicate ${rule.specialty} specialty required.`,
          });

          rulesApplied.push(`${rule.specialty.toLowerCase()}_added`);
        }
      }
    }

    recommendations.sort((a, b) => b.confidence - a.confidence);

    if (recommendations.length > 5) {
      recommendations = recommendations.slice(0, 5);
    }

    return { recommendations, rulesApplied };
  } catch (error) {
    return { recommendations, rulesApplied: [] };
  }
}

async function checkServiceAvailability(recommendations) {
  try {
    const warnings = [];
    const validRecommendations = [];

    for (const rec of recommendations) {
      const service = await Service.findOne({ id: rec.serviceId });

      if (!service) {
        warnings.push(`Service ${rec.serviceName} not found`);
        continue;
      }

      if (service.status !== 'active') {
        warnings.push(
          `Service ${rec.serviceName} is currently ${service.status}`
        );
        continue;
      }

      validRecommendations.push(rec);
    }

    if (warnings.length > 0) {
      sails.log.warn('Some services are unavailable', { warnings });
    }

    return { recommendations: validRecommendations, warnings };
  } catch (error) {
    return { recommendations, warnings: [] };
  }
}
