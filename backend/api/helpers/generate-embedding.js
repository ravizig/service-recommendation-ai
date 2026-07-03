/**
 * generate-embedding.js
 *
 * Helper for generating Hugging Face embeddings for text using Inference Client
 */

const { InferenceClient, EMBEDDING, HUGGINGFACE } = sails.config.constants;

module.exports = {
  friendlyName: 'Generate embedding',

  description:
    'Generate embedding for a single text using Hugging Face Inference Client',

  inputs: {
    text: {
      type: 'string',
      required: true,
      description: 'Text to generate embedding for',
    },
  },

  exits: {
    success: {
      description: 'Embedding generated successfully',
    },
  },

  fn: async function (inputs) {
    try {
      const { text } = inputs;

      // Validate text length
      if (text.length < EMBEDDING.MIN_TEXT_LENGTH) {
        sails.log.warn('Text too short for embedding generation', {
          textLength: text.length,
          minLength: EMBEDDING.MIN_TEXT_LENGTH,
        });
        return false;
      }

      if (text.length > EMBEDDING.MAX_TEXT_LENGTH) {
        sails.log.warn('Text too long for embedding generation', {
          textLength: text.length,
          maxLength: EMBEDDING.MAX_TEXT_LENGTH,
        });
        return false;
      }

      if (!HUGGINGFACE.API_KEY) {
        sails.log.error('Hugging Face API key not configured');
        return false;
      }

      // Retry logic with exponential backoff
      const maxRetries = HUGGINGFACE.RETRIES || 3;
      let lastError;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const startTime = Date.now();

          sails.log.debug(
            `Generating embedding (attempt ${attempt}/${maxRetries})`
          );

          // Initialize Hugging Face Inference Client
          const client = new InferenceClient(HUGGINGFACE.API_KEY);

          // Call feature extraction (embedding) API
          const embedding = await client.featureExtraction({
            model: HUGGINGFACE.EMBEDDING_MODEL,
            inputs: text,
          });

          const duration = Date.now() - startTime;

          // Validate embedding
          if (!Array.isArray(embedding) || embedding.length === 0) {
            throw new Error('Invalid embedding format received');
          }

          // Get embedding dimension
          const embeddingDimension = embedding.length;

          sails.log.info('Embedding generated successfully', {
            textLength: text.length,
            dimension: embeddingDimension,
            duration: duration,
            model: HUGGINGFACE.EMBEDDING_MODEL,
          });

          return embedding;
        } catch (error) {
          lastError = error;

          // Handle specific errors
          if (error.message && error.message.includes('loading')) {
            sails.log.warn(
              `Embedding model is loading (attempt ${attempt}/${maxRetries})`,
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
              `Embedding generation failed (attempt ${attempt}/${maxRetries})`,
              {
                error: error.message,
              }
            );
            if (attempt < maxRetries) {
              // Exponential backoff: 1s, 2s, 4s
              const backoffTime = Math.pow(2, attempt - 1) * 1000;
              await new Promise((resolve) => setTimeout(resolve, backoffTime));
            }
          }
        }
      }

      // All retries failed
      sails.log.error('All embedding generation attempts failed', {
        error: lastError.message,
        maxRetries: maxRetries,
      });

      return false;
    } catch (error) {
      sails.log.error('Generate embedding helper failed', {
        error: error.message,
        stack: error.stack,
      });
      return false;
    }
  },
};
