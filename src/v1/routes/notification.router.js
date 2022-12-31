const notificationController = require('../controllers/notification.controller')
const { isAuthMobile } = require('../middlewares/jwt.middleware')
const validation = require('../middlewares/validation.middleware')


module.exports = notificationRouter= (router) => {
  router.get('/notification/get',isAuthMobile, notificationController.get)
  router.put('/notification/update-read', isAuthMobile, notificationController.updateRead)
}
