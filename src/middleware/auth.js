const jwt = require('jsonwebtoken');
const { z } = require('zod');

const tokenPayloadSchema = z.object({
  id: z.number().int().positive(),
  role: z.enum(['ADMIN', 'USER', 'STORE_OWNER']),
});

const authenticate = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token missing' });
  }

  try {
    const payload = jwt.verify(header.slice('Bearer '.length), process.env.JWT_SECRET);
    const parsed = tokenPayloadSchema.safeParse(payload);
    if (!parsed.success) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
    req.user = parsed.data;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

const authorize = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Access denied' });
  }
  next();
};

module.exports = { authenticate, authorize };
