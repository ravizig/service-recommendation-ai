/**
 * sync-service-embeddings.js
 *
 * Helper for synchronizing embeddings for all services
 */

const { SYNC_STATUS, UUID } = sails.config.constants;

module.exports = {
  friendlyName: 'Sync service embeddings',

  description: 'Synchronize embeddings for all services',

  inputs: {
    force: {
      type: 'boolean',
      defaultsTo: false,
      description: 'Force regeneration of all embeddings',
    },
  },

  exits: {
    success: {
      description: 'Sync completed',
    },
  },

  fn: async function (inputs) {
    try {
      const { force } = inputs;

      sails.log.info('Starting service embeddings synchronization', { force });

      const syncStartTime = Date.now();
      console.log('syncStartTime: ', syncStartTime);

      // Create sync log entry
      const syncLog = await EmbeddingSyncLog.create({
        id: UUID.v4(),
        syncStartedAt: Date.now(),
        status: SYNC_STATUS.IN_PROGRESS,
      }).fetch();

      console.log('syncLog: ', syncLog);

      let servicesProcessed = 0;
      let servicesUpdated = 0;
      let servicesFailed = 0;

      try {
        // Get all active services
        let services;
        if (force) {
          services = await Service.find({ isDeleted: false });
        } else {
          services = await Service.find({
            isDeleted: false,
            embeddingGeneratedAt: null,
          });
        }

        sails.log.info(`Found ${services.length} services to process`);

        // Process each service
        for (const service of services) {
          servicesProcessed++;

          try {
            // Skip if no description
            if (
              !service.description ||
              service.description.trim().length === 0
            ) {
              sails.log.warn(`Skipping service ${service.id}: No description`);
              continue;
            }

            const textToEmbed =
              `${service.name}. ${service.description || ''}`.trim();

            // Generate embedding
            const embedding = await sails.helpers.generateEmbedding.with({
              text: textToEmbed,
            });

            if (!embedding) {
              servicesFailed++;
              continue;
            }

            let updateQuery = `
                UPDATE
                  "service"
                SET
                  "embeddingVector" = $1,
                  "embeddingGeneratedAt" = $2,
                  "embeddingModel" = $3
                WHERE
                  "id" = $4`;

            // Update service with embedding using raw query (pgvector type)
            await sails.sendNativeQuery(updateQuery, [
              JSON.stringify(embedding),
              Date.now(),
              sails.config.constants.HUGGINGFACE.EMBEDDING_MODEL,
              service.id,
            ]);

            servicesUpdated++;
          } catch (error) {
            servicesFailed++;
            sails.log.error(
              `Failed to generate embedding for service ${service.id}`,
              {
                serviceName: service.name,
                error: error.message,
              }
            );
          }
        }

        // Calculate duration
        const syncDuration = Date.now() - syncStartTime;

        // Update sync log as completed
        await EmbeddingSyncLog.updateOne({ id: syncLog.id }).set({
          syncCompletedAt: Date.now(),
          servicesProcessed: servicesProcessed,
          servicesUpdated: servicesUpdated,
          servicesFailed: servicesFailed,
          status: SYNC_STATUS.COMPLETED,
        });

        const result = {
          servicesProcessed,
          servicesUpdated,
          servicesFailed,
          duration: syncDuration,
          startedAt: syncLog.syncStartedAt,
          completedAt: Date.now(),
        };

        sails.log.info('Service embeddings synchronization completed', result);

        return result;
      } catch (error) {
        // Update sync log as failed
        await EmbeddingSyncLog.updateOne({ id: syncLog.id }).set({
          syncCompletedAt: Date.now(),
          servicesProcessed: servicesProcessed,
          servicesUpdated: servicesUpdated,
          servicesFailed: servicesFailed,
          status: SYNC_STATUS.FAILED,
          errorMessage: error.message,
        });

        sails.log.error('Service embeddings synchronization failed', {
          error: error.message,
          servicesProcessed,
          servicesUpdated,
          servicesFailed,
        });

        return false;
      }
    } catch (error) {
      sails.log.error('Sync service embeddings helper failed', {
        error: error.message,
      });
      return false;
    }
  },
};
