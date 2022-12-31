const notificationModel = require('../models/notification.model')
const {
  errorResponse
} = require('../utils')
const createError = require('http-errors')
const Message = require('../lang/en')
var that = module.exports = {
  getAll: ({
    userId,
    queryStr
  }) => new Promise(async (resolve, reject) => {
    try {
      const currentPage = Number(queryStr.currentPage) || 1;
      const limit = Number(queryStr.limit) || 10
      const skip = limit * (currentPage - 1)
      const list = await notificationModel.find({
        user: userId
      }).sort({
        createdAt: -1
      }).skip(skip)
      .limit(limit)
      .lean()

      return resolve({
        data:list
      })
    } catch (error) {
      console.log(error)
      return reject(errorResponse(500, createError.InternalServerError().message))
    }
  }),
  updateStatusRead: ({
    userId, 
    notificationId,
    status
  }) => new Promise(async (resolve, reject) => {
    try {
      const updated = await notificationModel.updateOne({
        user: userId,
        _id: notificationId
      },{
        $set:{
          status: status
        }
      })
      if(updated.modifiedCount){
        return resolve({
          data:{
            message:Message.update_success
          }
        })
      }
    } catch (error) {
      console.log(error)
      return reject(errorResponse(500, createError.InternalServerError().message))
    }
  })
}