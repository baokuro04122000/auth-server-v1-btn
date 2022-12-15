const productModel = require('../models/product.model')
const categoryModel = require('../models/category.model')
const Message = require('../lang/en')
const APIFeatures = require('../utils/apiFeatures')
const createError = require('http-errors')
const _ = require('lodash')
const {errorResponse, convertSpecsInProduct} = require('../utils')



const productResponse = (product) => {
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
    variants:product.variants,
    discountPercent:product.discountPercent,
    summary:product.summary,
    description:product.description,
    category: product.category,
    quantity: product.quantity,
    productPictures:product.productPictures,
    specs:specs
  }
}

const quickProductRequest = (product) => ({
  name:product.name,
  summary: product.summary,
  quantity:product.quantity,
  discountPercent: product.discountPercent,
  price: product.price
}) 

var that = module.exports = {
  addProduct: (product) => {
    return new Promise(async (resolve, reject) => {
      try {
        const categoryExisted = await categoryModel.findById(product.category).lean()
        if(_.isEmpty(categoryExisted)){
          return reject(errorResponse(401, Message.category_not_exist))  
        }
        await new productModel(product).save()
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
        const apiFeaturesCountDocuments = new APIFeatures(productModel, query) // (1)
        .search()
        .filter()
        .query
        .countDocuments()

        const apiFeatures = new APIFeatures(productModel, query) // (2)
        .search()
        .filter()
        .pagination(limit)
        .query
        .populate({
          path: 'sellerId',
          select: "info"
        })
        .populate('category category.name')
        .lean()
        const [totalProduct, products] = await Promise.all([apiFeaturesCountDocuments,apiFeatures]) // (3)

        if(_.isEmpty(products)){
          return reject(errorResponse(404, Message.product_empty))
        }
        
        const productPayload = products.map((product) => productResponse(product))
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
        .populate({
          path: 'sellerId',
          select:"-proof -isDisabled -updatedAt -specs"
        })
        .populate({
          path:'category',
          select:'name categoryImage slug'
        })
        .lean();
        if(_.isEmpty(product)){
          return reject(errorResponse(404, Message.product_not_found))
        }
        product.specs = convertSpecsInProduct(product);
        return resolve({
          data:{
            ...product,
            seller: product.sellerId,
            sellerId: product.sellerId._id
          }
        })
      } catch (error) {
        console.log(error)
        return reject(errorResponse(500, createError.InternalServerError().message))
      }
    })
  },
  getProductByCategorySlug: (queryStr) => {
    return new Promise((resolve, reject) => {
      categoryModel.findOne({slug: queryStr.slug}).exec(async (error, category)=>{
        
        if(error){
          return reject(errorResponse(500, createError.InternalServerError().message))
        }
        if(_.isEmpty(category)) return reject(errorResponse(404, Message.category_not_exist))
        const query = new APIFeatures(productModel.find({
          category: category._id
        }), queryStr)
        .filter()
        .pagination(queryStr.limit)
        .query
        .populate({
          path:'category',
          select:'name categoryImage slug'
        })
        .populate({
          path: 'sellerId',
          select:"-proof -isDisabled -updatedAt -specs"
        })
        .lean()

        try {
          const products = await query
          if(_.isEmpty(products)) return reject(errorResponse(404, Message.category_not_products))
          
          const apiFeaturesCountDocuments = new APIFeatures(productModel.find({
            category: category._id
          }), queryStr)
          .filter()
          .query
          .countDocuments()
          const totalProduct = await apiFeaturesCountDocuments

          const productList = products.map((product) => productResponse(product))

          return resolve({
            data: productList,
            totalProduct
          })

        } catch (error) {
          console.log(error)
          return reject(errorResponse(500, createError.InternalServerError().message))
        } 
    })
    })
  },
  searchFeature: (keyword) => {
    return new Promise(async (resolve, reject) => {
      console.log(keyword)
       
      const resultCategory =  categoryModel.find({
        name: {
          $regex: (keyword.length > 1) ? keyword : '^' + keyword,
          $options: "i",
        }
      })
      .select("slug name categoryImage")
      .lean()
      
      const resultProduct =  productModel.find({
        name: {
          $regex: (keyword.length > 1) ? keyword : '^' + keyword,
          $options: "i",
        }
      })
      .select("name slug")
      .lean()
      try {
        const [categories, products] = await Promise.all([resultCategory, resultProduct])
        const payload = [
          ...categories.map((category) => {
            return {
              ...category, type: "category"
            }
          }),
           ...products.map((product) => {
            return {
              ...product, type: "product"
            }
          })]
        return resolve({
          data: payload
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
  quickUpdateProduct: (sellerId, productId, productChanged) => {
    return new Promise(async (resolve, reject) => {
      try {
        const updated = await productModel.findOneAndUpdate({
          $and:[
            {sellerId: sellerId},
            {_id: productId}
         ]
        }, {
          $set: quickProductRequest(productChanged)
        },{
          new: true
        }).updateOne({
          "specs":{$elemMatch: {k: 'author'}}
        },{
          $set:{
            "specs.$.v":productChanged.author 
          }
        })

        if(_.isEmpty(updated)){
          return reject(errorResponse(403, Message.product_not_found))
        }

        return resolve({
          data: {
            message: Message.update_success
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