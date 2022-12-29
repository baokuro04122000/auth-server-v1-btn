const reviewController = require('../controllers/review.controller')
const { isAuthMobile } = require('../middlewares/jwt.middleware')
const validation = require('../middlewares/validation.middleware')
const {
  addReviewSchema,
  checkPermissionSchema
} = require('../validations/review.validation')

module.exports = reviewRouter= (router) => {
  router.post('/review/add',isAuthMobile,validation(addReviewSchema), reviewController.addReview)
  router.post('/review/check-permission', isAuthMobile,validation(checkPermissionSchema), reviewController.checkPermission)
  router.get('/review/get', reviewController.getReviews)
}
