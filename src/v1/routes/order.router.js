const orderController = require('../controllers/order.controller')
const { isAuthMobile } = require('../middlewares/jwt.middleware')
const validation = require('../middlewares/validation.middleware')
const {
  addDeliveryInfoSchema,
  updateDeliveryInfoSchema
} = require('../validations/order.validation')
module.exports = orderRouter= (router) => {
  // delivery info
  router.post('/delivery/add', isAuthMobile,validation(addDeliveryInfoSchema), orderController.addDeliveryInfo)
  router.get('/delivery/get', isAuthMobile, orderController.getUserDeliveryInfo)
  router.post('/delivery/delete', isAuthMobile, orderController.deleteDeliveryInfo)
  router.put('/delivery/update', isAuthMobile,validation(updateDeliveryInfoSchema), orderController.updateDeliveryInfo)
  router.put('/delivery/set-default', isAuthMobile, orderController.setDefaultDeliveryInfo)
}
