/**
 * circuit-breaker.js
 *
 * Circuit breaker pattern implementation for OpenAI API calls
 * Prevents overwhelming the API when it's experiencing issues
 */

// Circuit breaker state management (in-memory)
const circuitState = {
  status: 'CLOSED', // CLOSED, OPEN, HALF_OPEN
  failureCount: 0,
  lastFailureTime: null,
  successCount: 0,
};

module.exports = {
  friendlyName: 'Circuit breaker',

  description: 'Execute a function with circuit breaker protection',

  inputs: {
    fn: {
      type: 'ref',
      description: 'Async function to execute',
      required: true,
    },
    args: {
      type: 'ref',
      description: 'Arguments to pass to the function',
      required: false,
      defaultsTo: [],
    },
    threshold: {
      type: 'number',
      description: 'Number of failures before opening circuit',
      defaultsTo: 3,
    },
    timeout: {
      type: 'number',
      description: 'Timeout in milliseconds before attempting to close circuit',
      defaultsTo: 60000, // 60 seconds
    },
  },

  exits: {
    success: {
      description: 'Function executed successfully',
    },
    circuitOpen: {
      description: 'Circuit is open, request rejected',
    },
    error: {
      description: 'Function execution failed',
    },
  },

  fn: async function (inputs, exits) {
    const { fn, args, threshold, timeout } = inputs;

    let currentTime = Date.now();

    // Check if circuit is OPEN
    if (circuitState.status === 'OPEN') {
      const timeSinceFailure = currentTime - circuitState.lastFailureTime;

      // If timeout has passed, transition to HALF_OPEN
      if (timeSinceFailure >= timeout) {
        circuitState.status = 'HALF_OPEN';
        circuitState.successCount = 0;
        sails.log.info('Circuit breaker: Transitioning to HALF_OPEN state');
      } else {
        // Circuit still open, reject request
        sails.log.warn('Circuit breaker: Circuit is OPEN, rejecting request');
        return exits.circuitOpen({
          message: 'Service temporarily unavailable due to repeated failures',
          retryAfter: Math.ceil((timeout - timeSinceFailure) / 1000), // seconds
        });
      }
    }

    try {
      // Execute the function
      const result = await fn(...args);

      // On success, handle circuit state
      if (circuitState.status === 'HALF_OPEN') {
        circuitState.successCount++;

        // After one successful call in HALF_OPEN, close the circuit
        if (circuitState.successCount >= 1) {
          circuitState.status = 'CLOSED';
          circuitState.failureCount = 0;
          circuitState.lastFailureTime = null;
          sails.log.info(
            'Circuit breaker: Circuit CLOSED after successful recovery'
          );
        }
      } else if (circuitState.status === 'CLOSED') {
        // Reset failure count on success in CLOSED state
        if (circuitState.failureCount > 0) {
          circuitState.failureCount = 0;
        }
      }

      return exits.success(result);
    } catch (error) {
      console.log('error: ', error);
      // On failure, update circuit state
      circuitState.failureCount++;
      circuitState.lastFailureTime = currentTime;

      sails.log.error('Circuit breaker: Function execution failed', {
        failureCount: circuitState.failureCount,
        error: error.message,
      });

      // If in HALF_OPEN and fails, immediately OPEN again
      if (circuitState.status === 'HALF_OPEN') {
        circuitState.status = 'OPEN';
        sails.log.warn(
          'Circuit breaker: Returning to OPEN state after failure in HALF_OPEN'
        );
      }
      // If failures exceed threshold, OPEN the circuit
      else if (circuitState.failureCount >= threshold) {
        circuitState.status = 'OPEN';
        sails.log.error(
          `Circuit breaker: OPENED after ${circuitState.failureCount} failures`
        );
      }

      return exits.error(error);
    }
  },
};
