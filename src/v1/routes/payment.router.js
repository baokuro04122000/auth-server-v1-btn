const paymentController = require('../controllers/payment.controller')
module.exports = paymentRouter= (router) => {
  router.post('/pay/paypal-create', paymentController.createPayPalPayment)
  router.get('/pay/paypal-success', paymentController.paypalPaymentSuccess)
  router.get('/pay/paypal-cancel', paymentController.paypalPaymentCancel)
}
