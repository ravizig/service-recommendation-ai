/**
 * sync-embeddings.js
 *
 * Script to manually trigger embedding synchronization
 * Usage: node scripts/sync-embeddings.js [--force]
 */

const { AXIOS, API_DATA } = require('../config/constants').constants;

// Check for --force flag
const force = process.argv.includes('--force');

async function syncEmbeddings() {
  try {
    const response = await AXIOS.post(
      `${API_DATA.API_URL}/embeddings/sync`,
      { force: force },
      {
        headers: {
          'X-API-Key': API_DATA.VALID_API_KEYS[0] || '',
          'Content-Type': 'application/json',
        },
        // timeout: 300000, // 5 minutes timeout (embedding sync can take time)
      }
    );

    if (response.data.success) {
      const sync = response.data.sync;

      if (sync.queuesUpdated > 0) {
      } else if (sync.queuesProcessed === 0) {
      } else {
      }
    } else {
      process.exit(1);
    }
  } catch (error) {
    if (error.response) {
    } else if (error.code === 'ECONNREFUSED') {
    }

    process.exit(1);
  }
}

// Display usage if --help flag
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  process.exit(0);
}

// Run sync
syncEmbeddings();
