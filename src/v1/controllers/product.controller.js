const createError = require('http-errors')
const productService = require('../services/product.service')
const _ = require('lodash')
const {generateOtp} = require('../utils')
const shortid = require("shortid");
const slugify = require("slugify");
var that = module.exports = {
  addProduct: async (req, res) => {
    const product = req.body
    const variants = product.variants 
      ? product.variants
      : {
        name: product.name + "-" + shortid.generate(),
        description: product.summary,
        quantity: product.quantity,
        image: _.isEmpty(product.productPictures)
          ? 
            {
              fileLink:'',
              fileId:''
            }
          : product.productPictures[0]
        }
    try {
      const payload = await productService.addProduct({
        name: product.name,
        slug : `${slugify(product.name)}-${shortid.generate()}`,
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
        variants,
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
  getProductByCategorySlug:async (req, res) => {
    try {
      console.log(req.query)
      const payload = await productService.getProductByCategorySlug(req.query)
      res.json(payload)
    } catch (error) {
      console.log(error)
      res.status(error.status).json(error)
    }
  },
  searchProducts:async (req, res) => {
    try {
      const payload = await productService.searchFeature(req.query.keyword)
      res.json(payload)
    } catch (error) {
      console.log(error)
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
  quickUpdateProduct:async (req, res) => {
    const { productId ,productChanged } = req.body
    console.log(productId, productChanged)
    const sellerId = req.payload.seller._id
    try {
      const payload = await productService.quickUpdateProduct(sellerId, productId, productChanged)
      res.json(payload)
    } catch (error) {
      console.log(error)
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