const uploadController = require('../controllers/upload.controller')
const {isAuthSeller} = require('../middlewares/jwt.middleware')
module.exports = uploadRouter= (router) => {
  router.post('/auth/delete-files', uploadController.deleteListFile)
  router.post('/upload/delete-file', isAuthSeller, uploadController.deleteFilesBySeller)
}
