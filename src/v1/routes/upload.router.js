const uploadController = require('../controllers/upload.controller')

module.exports = uploadRouter= (router) => {
  router.post('/auth/delete-files', uploadController.deleteListFile)
}