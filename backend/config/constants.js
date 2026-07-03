/**
 * Constants
 * (sails.config.constants)
 *
 * Global constants used throughout the application
 */

const { InferenceClient } = require('@huggingface/inference');

const JOI = require('joi');
const AXIOS = require('axios');
const UUID = require('uuid');

// Response Codes for API responses
const RESPONSE_CODES = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
  SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
};

// Health Status
const HEALTH_STATUS = {
  HEALTHY: 'healthy',
  UNHEALTHY: 'unhealthy',
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  AVAILABLE: 'available',
  UNAVAILABLE: 'unavailable',
  OPERATIONAL: 'operational',
  NOT_CONFIGURED: 'not_configured',
  NOT_INSTALLED: 'not_installed',
  ERROR: 'error',
};

// Sync Status
const SYNC_STATUS = {
  INPROGRESS: 'inProgress',
  COMPLETED: 'completed',
  FAILED: 'failed',
};

// Embedding Configuration
const EMBEDDING = {
  DIMENSION: 384, // all-MiniLM-L6-v2 produces 384-dimensional embeddings
  MIN_TEXT_LENGTH: 10,
  MAX_TEXT_LENGTH: 8000,
  MODEL: 'sentence-transformers/all-MiniLM-L6-v2',
};

// Default Wait Times
const WAIT_TIMES = {
  IMMEDIATE: 'Immediate',
  FAST: '15-30min',
  MEDIUM: '30-60min',
  SLOW: '60-120min',
};

// Priority Levels
const PRIORITY_LEVELS = {
  CRITICAL: 'Critical',
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
};

// Confidence Scoring Configuration
const CONFIDENCE = {
  VECTOR_WEIGHT: parseFloat(process.env.CONFIDENCE_VECTOR_WEIGHT),
  LLM_WEIGHT: parseFloat(process.env.CONFIDENCE_LLM_WEIGHT),
  WARNING_THRESHOLD: parseFloat(process.env.CONFIDENCE_WARNING_THRESHOLD),
};

// Hugging Face Configuration (using Hugging Face Inference Client)
const HUGGINGFACE = {
  API_KEY: process.env.HUGGINGFACE_API_KEY,
  // Text Generation Model
  MODEL: process.env.HUGGINGFACE_MODEL,
  MODEL_WITH_PROVIDER: process.env.HUGGINGFACE_MODEL_WITH_PROVIDER,
  TEMPERATURE: parseFloat(process.env.HUGGINGFACE_TEMPERATURE),
  MAX_TOKENS: parseInt(process.env.HUGGINGFACE_MAX_TOKENS),
  TOP_P: parseFloat(process.env.HUGGINGFACE_TOP_P),
  // Embedding Model
  EMBEDDING_MODEL: process.env.HUGGINGFACE_EMBEDDING_MODEL,
  TIMEOUT: 60000, // 60 seconds for model inference
  RETRIES: 3,
};

// Vector Search Configuration
const VECTOR_SEARCH = {
  LIMIT: 5,
  SIMILARITY_THRESHOLD: 0.5,
};

const SCHEMAS = {
  RECOMMEND_SERVICE: 'recommendService',
  EMBEDDINGS_SYNC: 'embeddingsSync',
  CREATE_SERVICE: 'createService',
};

const API_DATA = {
  API_URL: process.env.API_URL,
  VALID_API_KEYS: process.env.VALID_API_KEYS.split(',') || [],
};

// Rate Limiting Configuration
const RATE_LIMITING = {
  WINDOW_MS: 60000,
  MAX_REQUESTS: 100,
};

module.exports.constants = {
  InferenceClient,
  JOI,
  AXIOS,
  UUID,
  RESPONSE_CODES,
  HEALTH_STATUS,
  SYNC_STATUS,
  EMBEDDING,
  WAIT_TIMES,
  PRIORITY_LEVELS,
  CONFIDENCE,
  HUGGINGFACE,
  VECTOR_SEARCH,
  SCHEMAS,
  API_DATA,
  RATE_LIMITING,
};
