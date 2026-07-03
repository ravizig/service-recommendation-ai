/**
 * test-recommendation.js
 *
 * Script to test the recommendation API
 * Usage: node scripts/test-recommendation.js
 */

const { AXIOS } = require('../config/constants').constants;

// Configuration
const API_URL = process.env.API_URL;
const API_KEY = process.env.VALID_API_KEYS?.split(',')[0];

// Test cases
const testCases = [
  {
    name: 'Emergency - Chest Pain',
    symptoms:
      'I have severe chest pain and feel dizzy. The pain started 30 minutes ago.',
    patientAge: 45,
  },
  {
    name: 'Pediatric - Child with Fever',
    symptoms: 'My child has a high fever of 103°F and is very tired.',
    patientAge: 6,
  },
  {
    name: 'Orthopedic - Broken Bone',
    symptoms:
      'I fell and hurt my ankle. It is swollen and I cannot walk on it.',
    patientAge: 32,
  },
  {
    name: 'Neurological - Headache',
    symptoms: 'I have a severe migraine headache with sensitivity to light.',
    patientAge: 28,
  },
  {
    name: 'General - Mild Symptoms',
    symptoms: 'I have a mild cough and slight fever for 2 days.',
    patientAge: 40,
  },
];

/**
 * Test a single recommendation request
 */
async function testRecommendation(testCase) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Test: ${testCase.name}`);
  console.log(`${'='.repeat(60)}`);
  console.log(`Symptoms: ${testCase.symptoms}`);
  console.log(`Patient Age: ${testCase.patientAge}`);
  console.log(`Expected Service: ${testCase.expectedService}`);
  console.log('');

  try {
    const startTime = Date.now();

    const response = await AXIOS.post(
      `${API_URL}/recommend-service`,
      {
        symptoms: testCase.symptoms,
        patientAge: testCase.patientAge,
      },
      {
        headers: {
          'X-API-Key': API_KEY,
          'Content-Type': 'application/json',
        },
        timeout: 30000, // 30 seconds
      }
    );

    const duration = Date.now() - startTime;

    if (response.data.success) {
      console.log('✅ Success!');
      console.log(`⏱️  Response Time: ${duration}ms`);
      console.log('');

      const recommendations = response.data.recommendations;
      console.log(`📋 Recommendations (${recommendations.length}):`);

      recommendations.forEach((rec, index) => {
        console.log(`\n${index + 1}. ${rec.queueName}`);
        console.log(`   Confidence: ${(rec.confidence * 100).toFixed(1)}%`);
        console.log(`   Priority: ${rec.priority}`);
        console.log(`   Wait Time: ${rec.estimatedWait}`);
        console.log(`   Reasoning: ${rec.reasoning}`);
        if (rec.rulesApplied && rec.rulesApplied.length > 0) {
          console.log(`   Rules Applied: ${rec.rulesApplied.join(', ')}`);
        }
      });

      // Check if expected queue is in top 3
      const topQueues = recommendations.slice(0, 3).map((r) => r.serviceName);
      if (
        topQueues.some((q) =>
          q.toLowerCase().includes(testCase.expectedService.toLowerCase())
        )
      ) {
        console.log(
          `\n✅ Expected service "${testCase.expectedService}" found in top 3 recommendations`
        );
      } else {
        console.log(
          `\n⚠️  Expected service "${testCase.expectedService}" NOT in top 3 recommendations`
        );
      }

      // Show metadata
      if (response.data.metadata) {
        console.log('\n📊 Performance Metrics:');
        console.log(`   Embedding: ${response.data.metadata.embeddingTime}ms`);
        console.log(`   Search: ${response.data.metadata.searchTime}ms`);
        console.log(`   Reasoning: ${response.data.metadata.reasoningTime}ms`);
        console.log(
          `   Validation: ${response.data.metadata.validationTime}ms`
        );
        console.log(`   Total: ${response.data.metadata.processingTime}ms`);
      }
    } else {
      console.log('❌ Request failed:', response.data.error);
    }
  } catch (error) {
    console.log('❌ Error:', error.message);

    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Error Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

/**
 * Test health check endpoint
 */
async function testHealthCheck() {
  console.log('\n' + '='.repeat(60));
  console.log('Testing Health Check Endpoint');
  console.log('='.repeat(60));

  try {
    const response = await AXIOS.get(`${API_URL}/health`);

    console.log(`\nStatus: ${response.data.status}`);
    console.log('\nServices:');
    Object.entries(response.data.services).forEach(([service, status]) => {
      const icon =
        status.status === 'connected' ||
        status.status === 'available' ||
        status.status === 'operational'
          ? '✅'
          : '❌';
      console.log(
        `${icon} ${service}: ${status.status} (${status.responseTime}ms)`
      );
    });

    if (response.data.system) {
      console.log('\nSystem Info:');
      console.log(`Node Version: ${response.data.system.nodeVersion}`);
      console.log(
        `Uptime: ${Math.floor(response.data.system.uptime / 60)} minutes`
      );
      console.log(
        `Memory Used: ${Math.round(response.data.system.memory.used / 1024 / 1024)}MB`
      );
    }
  } catch (error) {
    console.log('❌ Health check failed:', error.message);
  }
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('🧪 AI Queue Recommendation Engine - Test Suite');
  console.log(`API URL: ${API_URL}`);
  console.log(`API Key: ${API_KEY.substring(0, 8)}...`);

  // Test health check first
  await testHealthCheck();

  // Run each test case
  for (const testCase of testCases) {
    await testRecommendation(testCase);
    // Small delay between tests
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ All tests completed!');
  console.log('='.repeat(60));
}

// Run tests
runTests().catch((error) => {
  console.error('Test suite failed:', error);
  process.exit(1);
});
