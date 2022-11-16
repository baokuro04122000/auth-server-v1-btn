const sellerModel = require('../models/sellers.model')
const productModel = require('../models/product.model')
const _ = require('lodash')
const createError = require('http-errors')
const {
  errorResponse,
  convertSpecsInProduct
} = require('../utils')
const Message = require('../lang/en')
const APIFeature = require('../utils/apiFeatures')
var that = module.exports = {
  getDeatilsSellerById: (sellerId) => {
    return new Promise(async (resolve, reject) => {
      if(!sellerId) return reject(errorResponse(404, createError.NotFound().message))
      try {
        const seller = await sellerModel.findOne({
          _id: sellerId
        })
        .select("-proof -userId")
        .lean()
        if(_.isEmpty(seller)) return reject(errorResponse(404, createError.NotFound().message))
        return resolve({
          data: seller
        })
      } catch (error) {
        console.log(error)
        return reject(errorResponse(500, createError.InternalServerError().message))        
      }
    })
  },
  getSellerCategories: (sellerId) => {
    return new Promise(async (resolve, reject) => {
      if(!sellerId) return reject(errorResponse(404, createError.NotFound().message))
      try {
        const categories = await productModel.find({
          sellerId: sellerId
        })
        .populate({
          path: 'category',
          select:'-specs'
        })
        .select('-_id category')
        .lean()
        if(_.isEmpty(categories)) return resolve({
          data: []
        })
        const list = _.uniqBy(categories, function (item) {
          return item.category._id;
        });
        return resolve({
          data: list
        })
      } catch (error) {
        console.log(error)
        return reject(errorResponse(500, createError.InternalServerError().message))
      }
    })
  },
  getProductsBySellerCategory: (queryStr) => {
    return new Promise(async (resolve, reject) => {
      if(!queryStr.sellerId) return reject(errorResponse(404, createError.NotFound().message))
      try {
        const countDocument = new APIFeature(
          productModel,queryStr
        )
        .sellerCategorySearch()
        .filter()
        .query
        .countDocuments()

        const products = new APIFeature(
          productModel,queryStr
        )
        .sellerCategorySearch()
        .filter()
        .pagination(queryStr.limit)
        .query
        .populate([
          {
            path:'category',
            select:'-_id -specs -categoryImage -isDisabled'
          }
        ])
        .select('-sellerId')
        .lean()
        const [totalProducts, productList] = await Promise.all([countDocument, products])
        const list = productList.map((product) =>({
          ...product,
          specs: convertSpecsInProduct(product)
        }))
        return resolve({
          data:{
            products: list,
            totalProducts: totalProducts
          }
        })
      } catch (error) {
        console.log(error)
        return reject(errorResponse(500, createError.InternalServerError().message))
      }
    })
  }
}