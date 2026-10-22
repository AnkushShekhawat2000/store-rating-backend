const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const asyncHandler = require('../middleware/async-handler');
const validate = require('../middleware/validate');
const { ratingSchema } = require('../validators/user.validator');
const controller = require('../controllers/user.controller');

router.use(authenticate, authorize('USER'));
router.get('/stores', asyncHandler(controller.listStores));
router.post(
  '/stores/:storeId/rating',
  validate(ratingSchema),
  asyncHandler(controller.submitRating)
);

module.exports = router;
