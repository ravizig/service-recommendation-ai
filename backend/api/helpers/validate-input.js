/**
 * validate-input.js
 *
 * Helper for validating API request inputs using JOI
 */

const { JOI } = sails.config.constants;

module.exports = {
  friendlyName: 'Validate input',

  description: 'Validate request inputs against defined schemas',

  inputs: {
    data: {
      type: 'ref',
      description: 'The data to validate',
      required: true,
    },
    schema: {
      type: 'string',
      description: 'Schema name to validate against',
      required: true,
    },
  },

  exits: {
    success: {
      description: 'Validation successful',
    },
    invalid: {
      description: 'Validation failed',
    },
  },

  fn: async function (inputs, exits) {
    // Define validation schemas
    const schemas = {
      // Schema for recommend-service endpoint
      recommendService: JOI.object({
        symptoms: JOI.string().trim().min(10).max(8000).required().messages({
          'string.empty': 'Query is required',
          'string.min': 'Query must be at least 10 characters',
          'string.max': 'Query must not exceed 8000 characters',
          'any.required': 'Symptoms are required',
        }),

        patientAge: JOI.number().integer().min(0).max(150).optional().messages({
          'number.min': 'Patient age must be 0 or greater',
          'number.max': 'Patient age must not exceed 150',
        }),

        metadata: JOI.object().optional(),
      }),

      // Schema for embeddings sync endpoint
      embeddingsSync: JOI.object({
        force: JOI.boolean().optional().default(false),
      }),

      // Schema for create service endpoint
      createService: JOI.object({
        name: JOI.string().trim().min(2).max(200).required().messages({
          'string.empty': 'Service name is required',
          'string.min': 'Service name must be at least 2 characters',
          'string.max': 'Service name must not exceed 200 characters',
          'any.required': 'Service name is required',
        }),
        nameAr: JOI.string()
          .trim()
          .min(2)
          .max(200)
          .optional()
          .allow('')
          .messages({
            'string.min': 'Arabic name must be at least 2 characters',
            'string.max': 'Arabic name must not exceed 200 characters',
          }),
        description: JOI.string().trim().min(10).max(8000).required().messages({
          'string.empty': 'Description is required',
          'string.min': 'Description must be at least 10 characters',
          'string.max': 'Description must not exceed 8000 characters',
          'any.required': 'Description is required',
        }),
        servingTime: JOI.number()
          .integer()
          .min(1)
          .max(480)
          .optional()
          .messages({
            'number.min': 'Serving time must be at least 1 minute',
            'number.max': 'Serving time must not exceed 480 minutes',
          }),
        merchantID: JOI.string().trim().min(1).required().messages({
          'string.empty': 'Merchant ID is required',
          'string.min': 'Merchant ID is required',
          'any.required': 'Merchant ID is required',
        }),
      }),
    };

    // Get the requested schema
    const validationSchema = schemas[inputs.schema];

    if (!validationSchema) {
      return exits.invalid({
        code: 'INVALID_SCHEMA',
        message: `Schema '${inputs.schema}' not found`,
      });
    }

    // Validate the data
    const { error, value } = validationSchema.validate(inputs.data, {
      abortEarly: false, // Return all errors, not just the first
      stripUnknown: true, // Remove unknown fields
    });

    // If validation fails, return error details
    if (error) {
      const details = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
        type: detail.type,
      }));

      return exits.invalid({
        code: 'VALIDATION_ERROR',
        message: 'Input validation failed',
        details: details,
      });
    }

    // Return validated and sanitized data
    return exits.success(value);
  },
};
