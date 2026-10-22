const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const asyncHandler = require('../middleware/async-handler');
const validate = require('../middleware/validate');
const { createUserSchema } = require('../validators/auth.validator');
const { createStoreSchema } = require('../validators/admin.validator');
const controller = require('../controllers/admin.controller');

router.use(authenticate, authorize('ADMIN'));
router.get('/dashboard', asyncHandler(controller.getDashboard));
router.post('/users', validate(createUserSchema), asyncHandler(controller.createUser));
router.get('/users', asyncHandler(controller.listUsers));
router.get('/users/:id', asyncHandler(controller.getUserDetails));
router.post('/stores', validate(createStoreSchema), asyncHandler(controller.createStore));
router.get('/stores', asyncHandler(controller.listStores));

module.exports = router;
