const cartController = require('../controllers/cart.controller')
const { 
  isAuthMobile
} = require('../middlewares/jwt.middleware')
const validation = require('../middlewares/validation.middleware')
const { 
  addToCartSchema,
  removeCartItemSchema
} = require('../validations/product.validation')
module.exports = cartRouter= (router) => {
  router.post('/cart/add-to-cart',isAuthMobile,validation(addToCartSchema),  cartController.addToCart)
  router.get('/cart/get-cart-items',isAuthMobile, cartController.getCartItems)
  router.post('/cart/remove-item',isAuthMobile, validation(removeCartItemSchema), cartController.removeItem)
  router.post('/cart/add-multiple-items',isAuthMobile, cartController.addMultipleItem)
}
