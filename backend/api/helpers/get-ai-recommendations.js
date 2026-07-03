/**
 * get-ai-recommendations.js
 *
 * Helper for AI-powered reasoning using Hugging Face Inference Client
 */

const { InferenceClient } = sails.config.constants;

module.exports = {
  friendlyName: 'Get AI recommendations',

  description:
    'Get AI-powered service recommendations using Hugging Face Inference Client',

  inputs: {
    symptoms: {
      type: 'string',
      required: true,
      description: 'Patient symptoms',
    },
    matchedServices: {
      type: 'ref',
      required: true,
      description: 'Services from vector search',
    },
    patientAge: {
      type: 'number',
      description: 'Patient age (optional)',
    },
  },

  exits: {
    success: {
      description: 'AI recommendations generated',
    },
  },

  fn: async function (inputs) {
    const { HUGGINGFACE } = sails.config.constants;

    try {
      const { symptoms, matchedServices, patientAge } = inputs;

      sails.log.debug('Getting AI recommendations from Hugging Face');

      const startTime = Date.now();

      // Build context and prompts
      const prompts = sails.config.prompts;
      const systemPrompt = prompts.systemPrompt;
      const userPrompt = prompts.userPromptTemplate(
        symptoms,
        matchedServices,
        patientAge
      );

      console.log('userPrompt: ', userPrompt);
      // Retry logic
      const maxRetries = HUGGINGFACE.RETRIES || 2;
      let lastError;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          sails.log.debug(
            `Hugging Face API call attempt ${attempt}/${maxRetries}`
          );

          // Initialize Hugging Face Inference Client
          const client = new InferenceClient(HUGGINGFACE.API_KEY);

          // Call chat completion API
          const chatCompletion = await client.chatCompletion({
            model: HUGGINGFACE.MODEL_WITH_PROVIDER,
            messages: [
              {
                role: 'system',
                content: systemPrompt,
              },
              {
                role: 'user',
                content: userPrompt,
              },
            ],
            temperature: HUGGINGFACE.TEMPERATURE || 0.3,
            max_tokens: HUGGINGFACE.MAX_TOKENS || 1000,
            top_p: HUGGINGFACE.TOP_P || 0.9,
          });

          // Extract content from response
          const content = chatCompletion.choices[0].message.content;

          sails.log.debug('Hugging Face response received', {
            contentLength: content.length,
          });

          // Parse response
          let jsonStr = content.trim();

          // Remove markdown code blocks if present
          jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '');

          // Find JSON object in the text
          const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            jsonStr = jsonMatch[0];
          }

          // Parse JSON
          const parsed = JSON.parse(jsonStr);

          // Validate structure
          if (
            !parsed.recommendations ||
            !Array.isArray(parsed.recommendations)
          ) {
            throw new Error('Invalid recommendations structure in response');
          }

          // Validate each recommendation
          const validatedRecommendations = [];
          for (const rec of parsed.recommendations) {
            if (!rec.name) {
              continue;
            }

            // Find matching service from matched services
            const matchingService = matchedServices.find(
              (s) =>
                s.name.toLowerCase() === rec.name.toLowerCase() ||
                s.id === rec.id
            );

            if (!matchingService) {
              continue;
            }

            // Build validated recommendation
            validatedRecommendations.push({
              serviceId: matchingService.id,
              serviceName: matchingService.name,
              serviceNameAr: matchingService.nameAr,
              serviceDescription: matchingService.description,
              servingTime: matchingService.servingTime,
              merchantID: matchingService.merchantID,
            });
          }

          console.log('validatedRecommendations: ', validatedRecommendations);

          if (validatedRecommendations.length === 0) {
            throw new Error('No valid recommendations found in response');
          }

          const duration = Date.now() - startTime;

          sails.log.info('AI recommendations generated successfully', {
            duration,
            count: validatedRecommendations.length,
            model: HUGGINGFACE.MODEL,
          });

          return {
            recommendations: validatedRecommendations,
            duration,
          };
        } catch (error) {
          lastError = error;

          // Handle specific errors
          if (error.message && error.message.includes('loading')) {
            sails.log.warn(
              `Model is loading (attempt ${attempt}/${maxRetries})`,
              {
                error: error.message,
              }
            );
            // Wait longer for model to load
            if (attempt < maxRetries) {
              const waitTime = 20000; // 20 seconds
              await new Promise((resolve) => setTimeout(resolve, waitTime));
            }
          } else {
            sails.log.warn(
              `Hugging Face API error (attempt ${attempt}/${maxRetries})`,
              {
                error: error.message,
              }
            );
            if (attempt < maxRetries) {
              await new Promise((resolve) => setTimeout(resolve, 2000));
            }
          }
        }
      }

      // All retries failed
      sails.log.error('All Hugging Face API attempts failed', {
        error: lastError.message,
      });

      return false;
    } catch (error) {
      sails.log.error('Get AI recommendations helper failed', {
        error: error.message,
        stack: error.stack,
      });
      return false;
    }
  },
};
