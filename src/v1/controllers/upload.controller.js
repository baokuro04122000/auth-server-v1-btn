const _ = require('lodash')
const Message =  require('../lang/en')
const {
  deleteFileList
} = require('../services/upload.service')
var that = module.exports = {
  deleteListFile:async (req, res) => {
    const {fileList, token} = req.body
    if(_.isEmpty(fileList)){
      return res.json({
        data: {
          message:Message.file_list_empty
        }
      })
    }
    try {
      const payload = await deleteFileList(fileList, token)
      res.json(payload)
    } catch (error) {
      res.status(error.status).json(error)
    }    
  }
}