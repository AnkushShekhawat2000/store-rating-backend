const router = require('express').Router();
const { signup, login, updatePassword } = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth');
const asyncHandler = require('../middleware/async-handler');
const validate = require('../middleware/validate');
const {
  signupSchema,
  loginSchema,
  updatePasswordSchema,
} = require('../validators/auth.validator');

router.post('/signup', validate(signupSchema), asyncHandler(signup));
router.post('/login', validate(loginSchema), asyncHandler(login));
router.put(
  '/password',
  authenticate,
  validate(updatePasswordSchema),
  asyncHandler(updatePassword)
);

module.exports = router;
