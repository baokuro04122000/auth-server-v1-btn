const sellerService = require('../services/seller.service')
var that = module.exports = {
  getDetailsSeller: async (req, res) => {
    const {sellerId} = req.query
    try {
      const payload = await sellerService.getDeatilsSellerById(sellerId)
      res.json(payload)     
    } catch (error) {
      res.status(error.status).json(error)
    }
  },
  getSellerCategories: async (req, res) => {
    const {sellerId} = req.query
    try {
      const payload = await sellerService.getSellerCategories(sellerId)
      res.json(payload)    
    } catch (error) {
      res.status(error.status).json(error)
    }
  },
  getProductsBySellerCategory: async (req, res) => {
    try {
      const payload = await sellerService.getProductsBySellerCategory(req.query)
      res.json(payload)
    } catch (error) {
      res.status(error.status).json(error)
    }
  }
}