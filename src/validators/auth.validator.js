const { z } = require('zod');

const name = z.string().min(20, 'Name min 20 characters').max(60, 'Name max 60 characters');
const email = z.string().email('Invalid email').max(254);
const address = z.string().max(400, 'Address max 400 characters');
const password = z
  .string()
  .min(8, 'Password min 8 characters')
  .max(16, 'Password max 16 characters')
  .regex(/[A-Z]/, 'At least one uppercase letter required')
  .regex(/[^A-Za-z0-9]/, 'At least one special character required');

const signupSchema = z.object({ name, email, address, password }).strict();
const loginSchema = z.object({ email, password: z.string().min(1) }).strict();
const updatePasswordSchema = z
  .object({ oldPassword: z.string().min(1), newPassword: password })
  .strict();
const createUserSchema = z
  .object({ name, email, address, password, role: z.enum(['ADMIN', 'USER', 'STORE_OWNER']) })
  .strict();

module.exports = { signupSchema, loginSchema, updatePasswordSchema, createUserSchema };
