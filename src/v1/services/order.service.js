const userModel = require('../models/users.model')
const deliveryModel = require('../models/deliveryInfo.model')
const {errorResponse} = require('../utils')
const Message = require('../lang/en')
const createError = require('http-errors')
const _ = require('lodash')
var that = module.exports = {
  addDeliveryInfo: (userId, address) => {
    return new Promise(async (resolve, reject) => {
      try {
        const deliveryInfo =await deliveryModel.findOne({
          user: userId
        }).lean()
        if(_.isEmpty(deliveryInfo)){
          const delivery = new deliveryModel({
            user: userId,
            address:address
          })
          await delivery.save()
          return resolve({
            data: {
              message: Message.add_address_success
            }
          })
        }
        
        await deliveryModel.updateOne({
          user: userId
        }, {
          $push:{
            address: address
          }
        })
        return resolve({
          data: {
            message: Message.add_address_success
          }
        })
      } catch (error) {
        console.log(error)
        return reject(errorResponse(500, createError.InternalServerError().message))
      }
    })
  },
  getDeliveryInfoById: (userId) => {
    return new Promise(async (resolve, reject) => {
      try {
        const info = await deliveryModel.findOne({
          user: userId
        })
        .populate({
          path: 'user',
          select:'name info'
        })
        .lean()
        if(_.isEmpty(info)) return reject(errorResponse(404, createError.NotFound().message))
        console.log(info)
        return resolve({
          data: info
        })
      } catch (error) {
        console.log(error)
        return reject(errorResponse(500, createError.InternalServerError().message))
      }
    })
  },
  deleteDeliveryInfoByAddressId: (userId, addressId) => {
    return new Promise(async (resolve, reject) => {
      try {
        const removed = await deliveryModel.updateOne({
          user: userId
        }, {
          $pull:{
            address: {
              _id: addressId
            }
          }
        },{
          new: true
        })
        if(!removed.modifiedCount) return reject(errorResponse(404, createError.NotFound().message))  
        return resolve({
          data:{
            message: Message.delete_success
          }
        })

      } catch (error) {
        console.log(error)
        return reject(errorResponse(500, createError.InternalServerError().message))
      }
    })
  },
  updateDeliveryInfo: (userId, addressId, address) => {
    return new Promise(async (resolve, reject) => {
      try {
        const deliveryInfo = await deliveryModel.findOne({
          user: userId
        }).
        updateOne({
          address: {$elemMatch: {_id: addressId}}
        },{
          $set:{
            "address.$.name": address.name,
            "address.$.zipCode": address.zipCode,
            "address.$.phoneNumber": address.phoneNumber,
            "address.$.address": address.address
          }
        })
        if(!deliveryInfo.modifiedCount) return reject(errorResponse(404, createError.NotFound().message))
        return resolve({
          data:{
            message: Message.update_success
          }
        })
      } catch (error) {
        console.log(error)
        return reject(errorResponse(500, createError.InternalServerError().message))
      }
    })
  },
  setDefaultDeliveryInfo: (userId, addressId) => {
    return new Promise(async (resolve, reject) => {
      if(!addressId) return reject(errorResponse(403, Message.field_required))
      try {
        await deliveryModel.updateOne({
          user: userId
        },{
          $set:{
            "address.$[].isDefault": false
          }
        })

        const setDefault = await deliveryModel.updateOne({
          user: userId,
          "address._id": addressId
        }, {
          $set:{
            "address.$.isDefault": true
          }
        })
        if(!setDefault.modifiedCount) return reject(errorResponse(404, Message.addressId_not_found))
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
  }
}