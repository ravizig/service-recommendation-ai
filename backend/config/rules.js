/**
 * Business Rules Configuration
 * (sails.config.rules)
 *
 * Rules for queue recommendation validation and adjustment
 */

module.exports.rules = {
  /***************************************************************************
   *                                                                          *
   * Emergency Override Keywords                                              *
   * If symptoms contain these keywords, ensure Emergency is included         *
   *                                                                          *
   ***************************************************************************/

  emergencyKeywords: [
    'chest pain',
    'difficulty breathing',
    'severe bleeding',
    'loss of consciousness',
    'unconscious',
    'not breathing',
    'cardiac arrest',
    'stroke',
    'severe trauma',
    'severe head injury',
    'seizure',
    'overdose',
    'anaphylaxis',
    'severe allergic reaction',
  ],

  /***************************************************************************
   *                                                                          *
   * Age-Based Routing Rules                                                  *
   *                                                                          *
   ***************************************************************************/

  ageRules: {
    // Pediatric routing (children under 18)
    pediatric: {
      maxAge: 18,
      preferredQueues: ['Pediatric', 'Pediatrics'],
      scoreBoost: 0.1, // Add 0.1 to confidence for pediatric queues
    },

    // Geriatric considerations (seniors 65+)
    geriatric: {
      minAge: 65,
      // No preferred queues, just adds note to reasoning
    },
  },

  /***************************************************************************
   *                                                                          *
   * Specialty-Specific Routing Rules                                         *
   *                                                                          *
   ***************************************************************************/

  specialtyRules: [
    {
      specialty: 'Cardiology',
      keywords: [
        'chest pain',
        'heart palpitations',
        'irregular heartbeat',
        'rapid heartbeat',
        'heart racing',
      ],
      action: 'boostScore',
      scoreBoost: 0.05,
    },
    {
      specialty: 'Obstetrics/Gynecology',
      keywords: [
        'pregnancy',
        'pregnant',
        'contractions',
        'prenatal',
        'labor',
        'delivery',
      ],
      action: 'ensureIncluded',
    },
    {
      specialty: 'Orthopedics',
      keywords: [
        'fracture',
        'broken bone',
        'sprain',
        'dislocation',
        'joint pain',
        'sports injury',
      ],
      action: 'boostScore',
      scoreBoost: 0.05,
    },
    {
      specialty: 'Neurology',
      keywords: [
        'migraine',
        'severe headache',
        'numbness',
        'tingling',
        'stroke symptoms',
        'memory loss',
      ],
      action: 'boostScore',
      scoreBoost: 0.05,
    },
  ],
};
