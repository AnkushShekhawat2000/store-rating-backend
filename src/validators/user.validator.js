const { z } = require('zod');

const ratingSchema = z
  .object({
    value: z.number({ invalid_type_error: 'Rating must be a number' })
      .int('Rating must be a whole number')
      .min(1, 'Rating min 1')
      .max(5, 'Rating max 5'),
  })
  .strict();

module.exports = { ratingSchema };
