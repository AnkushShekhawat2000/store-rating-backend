const { z } = require('zod');

const createStoreSchema = z
  .object({
    name: z.string().min(1, 'Store name required').max(100),
    email: z.string().email('Invalid email').max(254),
    address: z.string().max(400, 'Address max 400 characters'),
    ownerId: z.number().int().positive(),
  })
  .strict();

module.exports = { createStoreSchema };
