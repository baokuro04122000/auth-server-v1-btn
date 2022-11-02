const categoryController = require('../controllers/category.controller')
const productController = require('../controllers/product.controller')
const { isAuthAdmin, isAuthSeller, verifyAccessToken } = require('../middlewares/jwt.middleware')
const validation = require('../middlewares/validation.middleware')
const productModel = require('../models/product.model')
const {
  addCategorySchema,
  addProductSchema,
  editProductSchema
} = require('../validations/product.validation')
module.exports = productRouter= (router) => {
  // category routes
  router.post('/admin/add-category',isAuthAdmin, validation(addCategorySchema), categoryController.addCategory)
  router.get('/categories', categoryController.getAllCategories)

  // product routes
  router.post('/seller/add-product', isAuthSeller,validation(addProductSchema),productController.addProduct)
  router.put('/seller/update-product', isAuthSeller, validation(editProductSchema), productController.updateProduct)
  router.delete('/seller/delete-product/:id', isAuthSeller, productController.deleteProduct)
  router.get('/products', productController.getProducts)
  
  router.get('/product/:slug', productController.getSingleProduct)

  router.get('/test',async (req, res) => {
    try {
      const product = await productModel.find({$text:{$search:'Jhon'}});
      console.log(product)
      res.json(product)
    } catch (error) {
      console.log(error)
      res.status(400).json(error)
    }
  })
}