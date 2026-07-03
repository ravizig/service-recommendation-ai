/**
 * Test Hugging Face API Connection
 *
 * This script tests the Hugging Face API connection and model availability
 *
 * Usage: node scripts/test-huggingface.js
 */

const { AXIOS, HUGGINGFACE } = require('../config/constants').constants;

const HUGGINGFACE_API_KEY = HUGGINGFACE.API_KEY;
const HUGGINGFACE_API_URL = HUGGINGFACE.API_URL;

async function testHuggingFaceConnection() {
  console.log('🧪 Testing Hugging Face API Connection...\n');

  if (!HUGGINGFACE_API_KEY) {
    console.error('❌ HUGGINGFACE_API_KEY not found in environment variables');
    console.error('   Please add it to your .env file');
    process.exit(1);
  }

  console.log('✅ API Key found:', HUGGINGFACE_API_KEY.substring(0, 8) + '...');
  console.log('📡 API URL:', HUGGINGFACE_API_URL);
  console.log('\n🔄 Sending test request...\n');

  try {
    const response = await AXIOS.post(
      HUGGINGFACE_API_URL,
      {
        inputs: 'Hello! Can you help me?',
        parameters: {
          max_new_tokens: 100,
          temperature: 0.7,
          top_p: 0.9,
          return_full_text: false,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${HUGGINGFACE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 60000,
      }
    );

    console.log('✅ SUCCESS! Model is responding\n');
    console.log('📝 Response:');
    console.log(JSON.stringify(response.data, null, 2));
    console.log('\n✨ Hugging Face integration is working correctly!');
    process.exit(0);
  } catch (error) {
    if (error.response) {
      const status = error.response.status;
      const errorData = error.response.data;

      console.error(`❌ HTTP Error ${status}\n`);

      if (status === 401) {
        console.error('🔐 Authentication failed');
        console.error('   - Check your HUGGINGFACE_API_KEY is valid');
        console.error(
          '   - Get a token from: https://huggingface.co/settings/tokens'
        );
      } else if (status === 403) {
        console.error('🚫 Access forbidden');
        console.error('   - Your token may not have the required permissions');
        console.error("   - Ensure the token has 'Read' access");
      } else if (status === 503) {
        console.log('⏳ Model is loading...');
        if (errorData?.estimated_time) {
          console.log(`   Estimated time: ${errorData.estimated_time} seconds`);
        }
        console.log('   - This is normal for the first request');
        console.log('   - Wait a moment and try again');
        console.log('   - Or run this script again in a few seconds');
      } else if (status === 404) {
        console.error('🔍 Model not found');
        console.error('   - Check the HUGGINGFACE_API_URL is correct');
        console.error('   - Current URL:', HUGGINGFACE_API_URL);
      } else {
        console.error('Error details:', JSON.stringify(errorData, null, 2));
      }
    } else if (error.code === 'ECONNABORTED') {
      console.error('⏱️  Request timeout');
      console.error('   - The model may be taking too long to respond');
      console.error('   - Try increasing the timeout in your configuration');
    } else {
      console.error('❌ Unexpected error:', error.message);
    }

    process.exit(1);
  }
}

// Run the test
testHuggingFaceConnection();
