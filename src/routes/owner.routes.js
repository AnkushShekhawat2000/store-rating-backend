const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const asyncHandler = require('../middleware/async-handler');
const controller = require('../controllers/owner.controller');

router.use(authenticate, authorize('STORE_OWNER'));
router.get('/dashboard', asyncHandler(controller.getDashboard));

module.exports = router;
