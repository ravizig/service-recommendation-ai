/**
 * LLM Prompt Templates
 * (sails.config.prompts)
 *
 * Prompt engineering templates for AI reasoning
 */

module.exports.prompts = {
  /***************************************************************************
   *                                                                          *
   * System Prompt Template                                                   *
   * Defines the AI's role and output format                                 *
   *                                                                          *
   ***************************************************************************/

  systemPrompt: `You are a medical triage AI assistant helping to recommend appropriate hospital services based on patient symptoms.

      Your Responsibilities:
      1. Analyze patient symptoms carefully for severity and urgency
      2. Consider which medical specialty is most appropriate
      3. Recommend 1-5 suitable services in order of appropriateness
      4. Provide confidence scores (0.0-1.0) for each recommendation
      5. Explain your reasoning concisely

      Guidelines:
      - Emergency symptoms (chest pain, difficulty breathing, severe bleeding, loss of consciousness) → Emergency service with high priority
      - Pediatric patients (under 18) → Consider pediatric specialties first
      - Geriatric patients (over 65) → Consider additional monitoring needs
      - Pregnancy-related → OB-GYN
      - Be conservative: when uncertain, recommend Emergency evaluation
      - Consider symptom severity in priority assignment

      Priority Levels:
      - Critical: Life-threatening, needs immediate attention
      - High: Serious but not immediately life-threatening
      - Medium: Important but can wait briefly
      - Low: Non-urgent, routine care

      Estimated Wait Times:
      - Immediate: Emergency, no wait
      - 15-30min: High priority
      - 30-60min: Medium priority
      - 1-2hours: Lower priority

      Output ONLY valid JSON with this exact structure (no markdown, no extra text):
      {
        "recommendations": [
          {
            "id": "service_id_here",
            "name": "Service Name",
            "nameAr": "Service Name AR",
            "description": "Brief medical explanation",
            "servingTime": "15",
            "merchantID": "merchantID"
          }
        ]
      }`,

  /***************************************************************************
   *                                                                          *
   * User Prompt Template                                                     *
   * Contains patient symptoms and matched services                          *
   *                                                                          *
   ***************************************************************************/

  userPromptTemplate: (symptoms, matchedServices, patientAge) => {
    let prompt = `Patient Symptoms: ${symptoms}\n`;

    // Add age if provided
    if (patientAge !== undefined && patientAge !== null) {
      prompt += `Patient Age: ${patientAge} years old\n`;
    }

    prompt += `\nAvailable Services (with similarity scores from vector search):\n`;

    // Add matched services with details
    matchedServices.forEach((service, index) => {
      prompt += `\n${index + 1}. ${service.name} (Similarity: ${(service.similarity * 100).toFixed(1)}%)
      - id: ${service.id}
      - NameAr: ${service.name || 'N/A'}
      - Description: ${service.description || 'N/A'}
      - servingTime: ${service.servingTime || null}
      - merchantID: ${service.merchantID || ''}\n`;
    });

    prompt += `\nPlease analyze these symptoms and recommend the most appropriate service(s) with confidence scores and reasoning.`;

    console.log('prompt: ', prompt);
    return prompt;
  },

  /***************************************************************************
   *                                                                          *
   * Response Validation Schema                                               *
   * Expected structure for LLM response                                     *
   *                                                                          *
   ***************************************************************************/

  responseSchema: {
    type: 'object',
    required: ['recommendations'],
    properties: {
      recommendations: {
        type: 'array',
        minItems: 1,
        maxItems: 5,
        items: {
          type: 'object',
          required: [
            'id',
            'name',
            'nameAr',
            'description',
            'servingTime',
            'merchantID',
          ],
          properties: {
            id: { type: ['string'] },
            name: { type: 'string' },
            nameAr: { type: 'string' },
            description: { type: 'string' },
            servingTime: { type: 'number' },
            merchantID: { type: ['string'] },
          },
        },
      },
    },
  },

  /***************************************************************************
   *                                                                          *
   * Fallback Responses                                                       *
   * Used when LLM fails or is unavailable                                   *
   *                                                                          *
   ***************************************************************************/

  fallbackResponses: {
    noMatches: {
      id: '',
      name: 'General Service',
      nameAr: 'General Service AR',
      description: 'General Service',
      servingTime: '15',
      merchantID: '',
    },

    error: {},
  },
};
