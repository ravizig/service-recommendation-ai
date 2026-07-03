/**
 * sanitize-pii.js
 *
 * Helper for removing Personally Identifiable Information (PII) from text
 * Used before logging patient symptoms to ensure privacy compliance
 */

module.exports = {
  friendlyName: 'Sanitize PII',

  description:
    'Remove personally identifiable information from text for logging',

  inputs: {
    text: {
      type: 'string',
      description: 'Text to sanitize',
      required: true,
    },
  },

  exits: {
    success: {
      description: 'Text sanitized successfully',
    },
  },

  fn: async function (inputs, exits) {
    let sanitized = inputs.text;

    // Pattern definitions for PII detection
    const patterns = {
      // Email addresses: user@domain.com
      email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/gi,

      // Phone numbers: Various formats
      // (123) 456-7890, 123-456-7890, 123.456.7890, 1234567890
      phone: /\b(\+\d{1,2}\s?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g,

      // Social Security Numbers: 123-45-6789
      ssn: /\b\d{3}-\d{2}-\d{4}\b/g,

      // Credit card numbers (basic pattern)
      creditCard: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,

      // IP addresses (optional, for security)
      ip: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,

      // Common patterns like "My name is John Doe"
      namePattern:
        /\b(?:my name is|i am|i'm|this is)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/gi,
    };

    // Replacement strings
    const replacements = {
      email: '[EMAIL_REDACTED]',
      phone: '[PHONE_REDACTED]',
      ssn: '[SSN_REDACTED]',
      creditCard: '[CARD_REDACTED]',
      ip: '[IP_REDACTED]',
      namePattern: '$& [NAME_REDACTED]', // Keep the prefix, redact the name
    };

    // Apply all sanitization patterns
    for (const [key, pattern] of Object.entries(patterns)) {
      sanitized = sanitized.replace(pattern, replacements[key]);
    }

    // Remove any remaining potentially sensitive patterns
    // Remove strings that look like addresses (very basic)
    sanitized = sanitized.replace(
      /\b\d+\s+[A-Za-z]+\s+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr)\b/gi,
      '[ADDRESS_REDACTED]'
    );

    return exits.success(sanitized);
  },
};
