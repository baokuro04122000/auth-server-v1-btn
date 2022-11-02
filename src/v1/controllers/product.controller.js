const createError = require('http-errors')
const productService = require('../services/product.service')
const _ = require('lodash')
const {generateOtp} = require('../utils')
var that = module.exports = {
  addProduct: async (req, res) => {
    const product = req.body
    const slug = generateOtp(8)
    console.log(product)
    try {
      const payload = await productService.addProduct({
        name: product.name,
        slug : slug,
        sellerId:req.payload.seller._id,
        price: product.price,
        discountPercent: product.discountPercent,
        summary: product.summary,
        description: product.description,
        category: product.category,
        quantity: product.quantity,
        productPictures: _.isEmpty(product.productPictures)
        ? [
          {
            fileLink:'',
            fileId:''
          }
        ]: product.productPictures,
        description:product.description,
        specs: [
          {k:'author', v:product.author},
          {k:'printLength', v: product.printLength},
          {k:'publisher', v:product.publisher},
          {k:'language', v:product.language},
          {k:'city', v:product.city},
          {k:'publicationDate', v:product.publicationDate},
        ]
      })
      return res.json(payload)
    } catch (error) {
      return res.status(error.status).json(error)
    }
  },
  getProducts:async (req, res) => {
    const limit = req.query.limit 
      ? req.query.limit == 5 ? req.query.limit : req.query.limit == 10
      ? req.query.limit : process.env.RES_PER_PAGE
      : process.env.RES_PER_PAGE
    try {
      const payload = await productService.getProducts(req.query, limit)
      return res.json(payload)
    } catch (error) {
      return res.status(error.status).json(error)
    }
  },
  getSingleProduct:async (req, res) => {
    const {slug} = req.params;
    try {
      const payload = await productService.getProductBySlug(slug)
      res.json(payload)
    } catch (error) {
      res.status(error.status).json(error)
    }
  },
  updateProduct: async (req, res) => {
    const { product, slug } = req.body
    try {
      const payload = await productService.updateProduct({
        name: product.name,
        price: product.price,
        discountPercent: product.discountPercent,
        summary: product.summary,
        description: product.description,
        category: product.category,
        quantity: product.quantity,
        productPictures: _.isEmpty(product.productPictures)
        ? [
          {
            fileLink:'',
            fileId:''
          }
        ]: product.productPictures,
        description:product.description,
        specs: [
          {k:'author', v:product.author},
          {k:'printLenth', v: product.printLength},
          {k:'publisher', v:product.publisher},
          {k:'language', v:product.language},
          {k:'city', v:product.city},
          {k:'publicationDate', v:product.publicationDate},
        ]
      }, slug, req.payload.seller._id)
      res.json(payload)
    } catch (error) {
      res.status(error.status).json(error)
    }
  },
  deleteProduct: async (req, res) => {
    console.log('here')
    const {id} = req.params
    try {
      const payload = await productService.deleteProductById(id, req.payload.seller._id)
      res.json(payload)
    } catch (error) {
      res.status(error.status).json(error)
    }
  }
}