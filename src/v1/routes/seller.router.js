const sellerController = require('../controllers/seller.controller')

module.exports = sellerRouter= (router) => {
  router.get('/seller/info', sellerController.getDetailsSeller)
  router.get('/seller/categories', sellerController.getSellerCategories)
  router.get('/seller', sellerController.getProductsBySellerCategory)
}
