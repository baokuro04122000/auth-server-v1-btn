'use strict'
const {
  DISCUSS,
  COMBUCK
} = require('../models/review.model')
const permissionModel = require('../models/permission.model')
const createError = require('http-errors')
const Message = require('../lang/en')
const {
  errorResponse
} = require('../utils')
const LIMIT = 5
/**
 * 
 * page = 1; count = 5
 * page =2; count = 5
 * page = 3; count = 1
 * 
 */

var that = module.exports = {
  putCommentBucket: ({
    productId,
    page = 1,
    isDEL = 'NO',
    comment = {}
  }) => new Promise(async (resolve, reject) => {
    try {
      if(isDEL === "YES"){
        await COMBUCK.deleteMany()
        await DISCUSS.deleteMany()
      } 

      const permission = await permissionModel.exists({
        product: productId,
        "list.users":comment.user
      })
      if(!permission) return reject(errorResponse(403, Message.not_authorize_review))

      //1. put a comment to collection
      const comm = await COMBUCK.updateOne({
        product: productId,
        page,
        count: {$lt: LIMIT}
      },{
        $inc: {count: 1},
        $push: {
          comments: {
            ...comment,
            page: page
          }
        }
      })
      
      // if fail we remake
      if(!comm.modifiedCount){
        const discuss = await DISCUSS.updateOne({
          product: productId,
          page: page
        },{
          $inc: {page: 1}
        }
        ,{
          upsert: true
        })
       if(discuss){
         const comm = await COMBUCK.updateOne({
           product: productId,
           page: page + 1
         },{
           $inc: {count: 1},
           $push: {
             comments:{
              ...comment,
              page: page + 1
             }
           }
         }
         ,{
           upsert: true
         })
       }
      }
      return resolve({
        data: {
          message: Message.add_review_success
        }
      });
    } catch (error) {
      console.log(error)
      return reject(errorResponse(500, createError.InternalServerError().message))
    }
  }),
  listCommentBucket: (
    {
      page, 
      productId
    }
    ) => new Promise(async (resolve, reject) => {
      try {
        const reviews = await COMBUCK.findOne({
          product: productId,
          page: page
        })
        .populate({
          path:'comments.user',
          select:"info"
        })
        .lean()
        return resolve({
          data:reviews
        })
      } catch (error) {
        console.log(error)
        return reject(errorResponse(500, createError.InternalServerError().message))
      }
  }),
  checkPermission: ({
    userId,
    productId
  }) => new Promise(async (resolve, reject) => {
    try {
      const valid = await permissionModel.exists({
        product: productId,
        "list.user":userId
      })
      return resolve({
        data: valid
      })
    } catch (error) {
      console.log(error)
      return reject(errorResponse(500, createError.InternalServerError().message))
    }
  }),
  deleteBucketComment: ({
    userId,
    productId,
    page,
    discuss_id
  }) => new Promise(async (resolve, reject) => {
    
    try {
      const deleted = await COMBUCK.updateOne({
        product: productId,
        page
      },{
        $pull:{
          comments: {
            discuss_id,
            user: userId
          }},
        $inc: {count: -1}
      })
      if(deleted.modifiedCount){
        return resolve({
          data:{
            message: Message.delete_success
          }
        })
      }
      return reject(errorResponse(404, Message.product_not_found))
    } catch (error) {
      console.log(error)
      return reject(errorResponse(500, createError.InternalServerError().message))
    }
  }),
  updateBucketComment: ({
    productId,
    page,
    userId,
    discuss_id,
    comment
  }) => new Promise(async (resolve, reject) => {
    try {
      const updated = await COMBUCK.updateOne({
        product: productId,
        page,
        "comments":{$elemMatch:{
          discuss_id,
          user: userId
        }}
      },{
        $set:{
          "comments.$.text":comment.text,
          "comments.$.file":comment.file,
          "comments.$.rating":comment.rating
        }
      })
      if(updated.modifiedCount){
        return resolve({
          data:{
            message:Message.update_success
          }
        })
      }
      return reject(errorResponse(404, Message.product_not_found))
    } catch (error) {
      console.log(error)
      return reject(errorResponse(500, createError.InternalServerError().message))
    }
  })
}

