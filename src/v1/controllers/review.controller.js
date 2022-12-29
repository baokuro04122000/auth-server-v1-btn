const reviewService = require('../services/review.service')
const Message =  require('../lang/en')
const {
  generateOtp
} = require('../utils')
var that = module.exports = {
  addReview:async (req, res) => {
    const {page, comment, isDEL, productId} = req.body
    try {
      const payload = await reviewService.putCommentBucket({
        productId,
        page,
        isDEL,
        comment:{
          discuss_id: generateOtp(5),
          ...comment,
          user: req.payload._id
        }
      })
      return res.json(payload)
    } catch (error) {
      return res.status(error.status).json(error)
    }    
  },
  getReviews: async (req, res) => {
    const {productId, page} = req.query
    if(!(Number.isInteger(Number(page)) && Number(page) > 0)){
      return res.status(403).json({
        message:'Bad request!!!'
      })
    }
    if(!productId.toString()){
      return res.status(403).json({
        message:'Bad request!!!'
      }) 
    } 
    try {
      const payload =await reviewService.listCommentBucket({
        productId, page
      })
      res.json(payload)
    } catch (error) {
      res.status(error.status).json(error)
    }
  },
  checkPermission: async (req, res) => {
    const {productId} = req.body
    try {
      const payload = await reviewService.checkPermission({
        userId: req.payload._id,
        productId
      })
      res.json(payload)
    } catch (error) {
      res.status(error.status).json(error)
    }
  },
  delete: async (req, res) => {
    const {productId, discuss_id, page} = req.body
    
    try {
      const payload = await reviewService.deleteBucketComment({
        productId,
        discuss_id,
        userId: req.payload._id,
        page
      })
      res.json(payload)
    } catch (error) {
      res.status(error.status).json(error)
    }
  },
  update: async (req, res) => {
    const {productId, discuss_id, comment, page} = req.body
    try {
      const payload = await reviewService.updateBucketComment({
        productId, 
        discuss_id, 
        userId: req.payload._id,
        comment,
        page
      })
      res.json(payload)
    } catch (error) {
      res.status(error.status).json(error)
    }
  }
}