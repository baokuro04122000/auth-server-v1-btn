const productModel = require('../models/product.model')
const categoryModel = require('../models/category.model')
const Message = require('../lang/en')
const APIFeatures = require('../utils/apiFeatures')
const createError = require('http-errors')
const _ = require('lodash')
const {errorResponse} = require('../utils')

var that = module.exports = {
  addProduct: (product) => {
    return new Promise(async (resolve, reject) => {
      try {
        const categoryExisted = await categoryModel.findById(product.category).lean()
        if(_.isEmpty(categoryExisted)){
          return reject(errorResponse(401, Message.category_not_exist))  
        }
        await new productModel(product).save().lean()
        return resolve({
          data:{
            message:Message.add_product_success
          }
        })
      } catch (error) {
        console.log(error)
        return reject(errorResponse(500,createError.InternalServerError().message))
      }
    })
  },
  getProducts: (query, limit) => {
    return new Promise(async (resolve, reject) => {
      try {
        const apiFeaturesCountDocuments = new APIFeatures(productModel, query)
        .search()
        .filter()
        .query
        .countDocuments()

        const totalProduct = await apiFeaturesCountDocuments;

        const apiFeatures = new APIFeatures(productModel, query)
        .search()
        .filter()
        .pagination(limit)
        .query
        .populate('sellerId sellerId.info')
        .populate('category category.name')
        .lean()

        const products = await apiFeatures

        if(_.isEmpty(products)){
          return reject(errorResponse(404, Message.product_empty))
        }
        
        const productPayload = products.map((product) => {
          let specs = {}
          product.specs.forEach(element => {
            specs[element.k]= element.v
          })
          
          return {
            _id: product._id,
            name: product.name,
            seller: product.sellerId,
            slug:product.slug,
            price:product.price,
            discountPercent:product.discountPercent,
            summary:product.summary,
            description:product.description,
            category: product.category,
            quantity: product.quantity,
            productPictures:product.productPictures,
            specs:specs
          }
        })
        return resolve({
          data:productPayload,
          totalProduct
        })
      } catch (error) {
       console.log(error)
       return reject(errorResponse(500, createError.InternalServerError().message)) 
      }
    })
  },
  getProductBySlug: (slug) => {
    return new Promise(async (resolve, reject) => {
      try {
        const product = await productModel
        .findOne({slug})
        .populate('sellerId sellerId.info')
        .populate('category')
        .lean();
        if(_.isEmpty(product)){
          return reject(errorResponse(404, Message.product_not_found))
        }
        let specs = {}
        product.specs.forEach(element => {
          specs[element.k]= element.v
        })
        product.specs = specs;
        return resolve({
          data:{
            ...product
          }
        })
      } catch (error) {
        console.log(error)
        return reject(errorResponse(500, createError.InternalServerError().message))
      }
    })
  },
  updateProduct: (product, slug, sellerId) => {
    return new Promise(async (resolve, reject) => {
      try {
        const producted = await productModel.findOneAndUpdate({
          $and:[
            {slug: slug},
            {sellerId: sellerId}
          ]
        },{
          $set:{
            name:product.name,
            price:product.price,
            category:product.category,
            discountPercent:product.discountPercent,
            summary: product.summary,
            description: product.description,
            quantity: product.quantity,
            productPictures: product.productPictures,
            specs:product.specs
          }
        }, {new: true})
        if(_.isEmpty(producted)){
          return reject(errorResponse(404, Message.product_not_found))
        }
        return resolve({
          data:{
            message:Message.update_success
          }
        })
      } catch (error) {
        console.log(error)
        return reject(errorResponse(500, createError.InternalServerError().message))
      }
    })
  },
  deleteProductById: (id, sellerId) => {
    return new Promise(async (resolve, reject) => {
      try {
        const product = await productModel.findOne({
          $and:[
            {_id: id},
            {sellerId: sellerId}
          ]
        })
        if(_.isEmpty(product)){
          return reject(errorResponse(404, Message.product_not_found))
        }
        if(product.meta.totalOrder !== 0){
          return reject(errorResponse(402, Message.product_order))
        }
        if(product.meta.totalSold !== 0){
          return reject(errorResponse(403, Message.product_sold))
        }
        const deleted = await product.remove()
        console.log(deleted)
        return resolve({
          data: {
            message: Message.delete_success
          }
        })
      } catch (error) {
        console.log(error)
        return reject(errorResponse(500, createError.InternalServerError().message))
      }
    
    })
  }
}