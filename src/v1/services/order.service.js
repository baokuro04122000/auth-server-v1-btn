const userModel = require('../models/users.model')
const deliveryModel = require('../models/deliveryInfo.model')
const {
  errorResponse,
  totalPriceProduct,
  convertSpecsInProduct,
  getPaginatedItems
} = require('../utils')
const APIFeatures = require('../utils/apiFeatures')
const Message = require('../lang/en')
const createError = require('http-errors')
const _ = require('lodash')
const productModel = require('../models/product.model')
const inventoryModel = require('../models/inventory.model')
const shippingCompanyModel = require('../models/shippingCompany.model')
const shippingModel = require('../models/shipping.model')
const orderModel = require('../models/order.model')
const redis = require('../databases/init.redis')
const mongoose = require('mongoose')
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
  },
  addOrder: (userId, order) => {
    return new Promise(async (resolve, reject) => {
      try {
        const address = await deliveryModel.findOne({
          user: userId,
          "address._id":order.addressId
        })
        .select("address")
        .lean()
  
        if(!address) return reject(errorResponse(404, Message.addressId_not_found))
        const addressSend = address.address.find((item) => item._id.toString() === order.addressId)
        const shipping = [...order.items]
        const shippingList = _.uniqBy(shipping, function (e) {
            return e.shippingCode;
        });
        const list =  shippingList.map((shipping) => shippingModel.findOne({
          code:Number(shipping.shippingCode)
        })
        .select('price code')
        .lean())
        
        const shippingCostList = await Promise.all(list)
        shippingCostList.forEach((item) => {
          if(!item) return reject(errorResponse(404, Message.shipping_code_not_found))
        })
        const products = order.items.map((item) => {
          return productModel.findOne({
            _id: item.productId
          })
          .select("price quantity maxOrder discountPercent name")
          .lean()
        })


        const productList = await Promise.all(products)
        productList.forEach((item) => {
          if(!item) return reject(errorResponse(404, Message.product_not_found))
        })

        const mergeDataProducts = order.items.map((item) => {
          const product = productList.find((product) => product._id.toString() === item.productId)
          const shippingCost = shippingCostList.find((shipping)=> shipping.code === item.shippingCode)
          if((Number(product.quantity) - Number(item.quantity)) <= 0){
            return reject(errorResponse(408, product.name + Message.out_of_stock))
          } 
          return {
            product: product._id,
            discount: product.discountPercent,
            quantity: item.quantity,
            shippingCode: item.shippingCode,
            shippingCost:shippingCost.price,
            price: product.price,
            totalPaid: totalPriceProduct(product.price, item.quantity, product.discountPercent)+shippingCost.price ,
            orderStatus: {
              type: "ordered",
              date: Date.now(),
              isCompleted: false
            }
          }
        })
        if(order.paymentType === 'cod'){
          const orderPayload = {
            user: userId,
            address: addressSend,
            totalAmount: mergeDataProducts.reduce((total, current) => total + current.totalPaid, 0),
            items: mergeDataProducts,
            paymentStatus: "pending",
            paymentType:order.paymentType,
            shippingCost: mergeDataProducts.reduce((total, current) => total + current.shippingCost, 0),
            orderStatus: {
              type: "ordered",
              date: Date.now(),
              isCompleted: false
            }
          }
          const ordered = await new orderModel(orderPayload).save()
          const updateQuantity = ordered.items.map((item) => {
            return productModel.findOneAndUpdate({
              _id: item.product
            },{
              $inc:{quantity:- Number(item.quantity)}
            }, {
              new: true
            })
            .select("quantity sellerId")
            .lean()
          })

          //update quantity of product
          const updatedProduct = await Promise.all(updateQuantity)

          const checkInventoryExisted = ordered.items.map((item) => {
            return inventoryModel.exists({
              product: item.product
            })
          
          })
          
          // check product exists in inventory
          const inventories = await Promise.all(checkInventoryExisted)
          
          
          const createInventory = inventories.map((exists, index) => {
            const reservation = {
              order: ordered._id,
              user: userId,
              quantity: ordered.items[index].quantity
            }

            if(!_.isEmpty(exists)){
              return inventoryModel.findOneAndUpdate({
                product: ordered.items[index].product
              },
              {
                $push: {
                  reservations: reservation
                } 
              },
              {
                new: true
              }).lean()
            }

            return new inventoryModel({
              product: ordered.items[index].product,
              sellerId: updatedProduct[index].sellerId,
              reservations:[
                {
                  order: ordered._id,
                  user: userId,
                  quantity: ordered.items[index].quantity
                }
              ]
            }).save()
          })

          const createdInventory = await Promise.all(createInventory)


          userModel.findOne({_id: userId}).lean().exec((err, user)=>{
            if(err) return reject(errorResponse(500, createError.InternalServerError().message))
            redis.publish('order_success',JSON.stringify({
              email: user.local.email ? user.local.email : user.google.email,
              orderId:ordered._id,
              name: user.local.email ? user.info.firstName + " " + user.info.lastName : user.google.name,
              totalPaid: ordered.totalAmount,
              totalShippingCost: ordered.shippingCost
            }))
          })

          return resolve({
            data:{
              orderId: ordered._id
            }
          })  
        }else{
          return reject(errorResponse(501, 'the server is developing this function'))
        }
      } catch (error) {
        console.log(error)
            return reject(errorResponse(500, createError.InternalServerError().message))
      }
            
    })
  },
  getOrderById: (userId, orderId) => {
    return new Promise(async (resolve, reject) => {
      try {
        const order = await orderModel.findOne({
          $and:[
            {_id: orderId},
            {user: userId}
          ]
        })
        .populate({
          path:"items.product",
          select:"name sellerId category summary productPictures specs -_id",
          populate:[
            {
              path: "sellerId",
              select: "info type logo -_id"
            },
            {
              path:"category",
              select:"name -_id"
            }
          ]
        }).lean()

        if(_.isEmpty(order)) return reject(errorResponse(404, createError.NotFound().message))
        const items = order.items.map((item) => {
          return {
            ...item,
            product:{
              ...item.product,
              specs: convertSpecsInProduct(item.product)
            },
            orderStatus: item.orderStatus
          }
        })

        const payload = {
          ...order,
          orderStatus: order.orderStatus.pop(),
          items: items
        }

        return resolve({
          data:{
            order: payload
          }
        })
      } catch (error) {
        console.log(error)
        return reject(errorResponse(500, createError.InternalServerError().message))
      }
    })
  },
  getAllOrders: ( userId, queryStr ) => {
    return new Promise(async (resolve, reject) => {
      try {
        const countDocument = orderModel.find({
          user: userId
        }).countDocuments()

        const list = new APIFeatures(orderModel.find({
          user: userId
        })
        .select("totalAmount items.product items.orderStatus orderStatus")
        .populate({
          path:'items.product',
          select: "name productPictures"
        })
        .sort({
          "createdAt":-1
        }), queryStr)
        .pagination(queryStr.limit)
        .query
        .lean()

        const [totalOrders, orders] = await Promise.all([countDocument, list])

        console.log(orders)

        const orderList = orders.map((order) => {
          return {
            ...order,
            quantity: order.items.length,
            items: order.items.map((item) => ({
              ...item,
              orderStatus: item.orderStatus.pop()
            })),
            orderStatus: order.orderStatus.pop()
          }
        })
        const payload = {
          totalOrders: totalOrders,
          data:{
            orders: orderList
          }
        }
        return resolve(payload)
      } catch (error) {
        console.log(error)
        return reject(errorResponse(500, createError.InternalServerError().message))
      }
    })
  },
  getAllOrderedByUser: ( userId , page, limit) => {
    return new Promise(async (resolve, reject) => {
      try {
        const ordered =await orderModel.aggregate([
          {$match:{user:new mongoose.Types.ObjectId(userId)}},
          {
            $project:{
              items: {$filter: {
                input: '$items',
                as: 'item',
                cond: {$and:[
                  {$eq: ['$$item.isDeleted',false]},
                  {$eq: ['$$item.isCancel',false]},
                  {$in:[{"$size":"$$item.orderStatus"},[1,2]]}

                ]}
                }
              },
              address: 1,
              paymentType:1,
              createdAt: 1
            }
          },
          {$sort:{createdAt: -1}},
          { "$match": { "items.0": { "$exists": true } } },
          { $unwind: "$items" },
          {
            $lookup: {
              from: "products",
              localField: "items.product",
              foreignField: "_id",
              pipeline : [
                { $project: {
                  name:1,
                  productPictures: 1,
                  quantity: 1,
                }}
              ],
              as: "product"
           }
          },
          {
            $unwind: "$product"
          },
          { $set: {
            "items.product": "$product"
          }},
          { $group: {
            _id: "$_id",
            address:{"$first":"$address"},
            paymentType:{"$first":"$paymentType"},
            items: { $push: "$items" }
          }}
        ])
        if(_.isEmpty(ordered)) return reject(errorResponse(404, createError.NotFound().message))
        let payload = []
        
        ordered.forEach((item) => {
          let reservations = []
          item.items.forEach((order) =>{
              if(!_.isEmpty(order)) {
                reservations = [...reservations, {...order,
                  orderId: item._id,
                  address: item.address,
                  paymentType: item.paymentType
                }]
              }
          })
          payload = [...payload, ...reservations]
        })
        return resolve(getPaginatedItems(payload, page, limit))
      } catch (error) {
        console.log(error)
        return reject(errorResponse(500, createError.InternalServerError().message))
      }
    })
  },
  getAllOrdersCancelByUser: (userId, page, limit) => {
    return new Promise(async (resolve, reject) => {
      try {
        const ordered =await orderModel.aggregate([
          {$match:{user:new mongoose.Types.ObjectId(userId)}},
          {
            $project:{
              items: {$filter: {
                input: '$items',
                as: 'item',
                cond: {$and:[
                  {$eq: ['$$item.isCancel',true]}

                ]}
                }
              },
              address: 1,
              paymentType:1,
              createdAt: 1
            }
          },
          {$sort:{createdAt: -1}},
          { "$match": { "items.0": { "$exists": true } } },
          { $unwind: "$items" },
          {
            $lookup: {
              from: "products",
              localField: "items.product",
              foreignField: "_id",
              pipeline : [
                { $project: {
                  name:1,
                  productPictures: 1,
                  quantity: 1,
                }}
              ],
              as: "product"
           }
          },
          {
            $unwind: "$product"
          },
          { $set: {
            "items.product": "$product"
          }},
          { $group: {
            _id: "$_id",
            address:{"$first":"$address"},
            paymentType:{"$first":"$paymentType"},
            items: { $push: "$items" }
          }}
        ])
        if(_.isEmpty(ordered)) return reject(errorResponse(404, createError.NotFound().message))
        let payload = []
        
        ordered.forEach((item) => {
          let reservations = []
          item.items.forEach((order) =>{
              if(!_.isEmpty(order)) {
                reservations = [...reservations, {...order,
                  orderId: item._id,
                  address: item.address,
                  paymentType: item.paymentType
                }]
              }
          })
          payload = [...payload, ...reservations]
        })
        return resolve(getPaginatedItems(payload, page, limit))
      } catch (error) {
        console.log(error)
        return reject(errorResponse(500, createError.InternalServerError().message))
      }
    })
  },
  
  getAllOrdersShippingByUser: (userId, page, limit) => {
    return new Promise(async (resolve, reject) => {
      try {
        const ordered =await orderModel.aggregate([
          {$match:{user:new mongoose.Types.ObjectId(userId)}},
          {
            $project:{
              items: {$filter: {
                input: '$items',
                as: 'item',
                cond: {$and:[
                  {$eq: ['$$item.isCancel',false]},
                  {$eq:['$$item.isDeleted',false]},
                  {$eq:[{"$size":"$$item.orderStatus"}, 4]}
                ]}
                }
              },
              address: 1,
              paymentType:1,
              createdAt: 1
            }
          },
          { "$match": { "items.0": { "$exists": true } } },
          {$sort:{createdAt: -1}},
          { $unwind: "$items" },
          {
            $lookup: {
              from: "products",
              localField: "items.product",
              foreignField: "_id",
              pipeline : [
                { $project: {
                  name:1,
                  productPictures: 1,
                  quantity: 1,
                }}
              ],
              as: "product"
           }
          },
          {
            $unwind: "$product"
          },
          { $set: {
            "items.product": "$product"
          }},
          { $group: {
            _id: "$_id",
            address:{"$first":"$address"},
            paymentType:{"$first":"$paymentType"},
            items: { $push: "$items" }
          }}
        ])
        if(_.isEmpty(ordered)) return reject(errorResponse(404, createError.NotFound().message))
        let payload = []
        
        ordered.forEach((item) => {
          let reservations = []
          item.items.forEach((order) =>{
              if(_.isEmpty(order) === false && order.orderStatus.at(-1).isCompleted === false) {
                reservations = [...reservations, {...order,
                  orderId: item._id,
                  address: item.address,
                  paymentType: item.paymentType
                }]
              }
          })
          payload = [...payload, ...reservations]
        })
        if(_.isEmpty(payload)) return reject(errorResponse(404, createError.NotFound().message))
        return resolve(getPaginatedItems(payload, page, limit))
      } catch (error) {
        console.log(error)
        return reject(errorResponse(500, createError.InternalServerError().message))
      }
    })
  },
  getAllOrdersCompletedByUser: (userId, page, limit) => {
    return new Promise(async (resolve, reject) => {
      try {
        const ordered =await orderModel.aggregate([
          {$match:{user:new mongoose.Types.ObjectId(userId)}},
          {
            $project:{
              items: {$filter: {
                input: '$items',
                as: 'item',
                cond: {$and:[
                  {$eq: ['$$item.isCancel',false]},
                  {$eq:['$$item.isDeleted',false]},
                  {$eq:[{"$size":"$$item.orderStatus"}, 4]}
                ]}
                }
              },
              address: 1,
              paymentType:1,
              createdAt: 1
            }
          },
          { "$match": { "items.0": { "$exists": true } } },
          {$sort:{createdAt: -1}},
          { $unwind: "$items" },
          {
            $lookup: {
              from: "products",
              localField: "items.product",
              foreignField: "_id",
              pipeline : [
                { $project: {
                  name:1,
                  productPictures: 1,
                  quantity: 1,
                }}
              ],
              as: "product"
           }
          },
          {
            $unwind: "$product"
          },
          { $set: {
            "items.product": "$product"
          }},
          { $group: {
            _id: "$_id",
            address:{"$first":"$address"},
            paymentType:{"$first":"$paymentType"},
            items: { $push: "$items" }
          }}
        ])
        if(_.isEmpty(ordered)) return reject(errorResponse(404, createError.NotFound().message))
        let payload = []
        
        ordered.forEach((item) => {
          let reservations = []
          item.items.forEach((order) =>{
              if(_.isEmpty(order) === false && order.orderStatus.at(-1).isCompleted === true) {
                reservations = [...reservations, {...order,
                  orderId: item._id,
                  address: item.address,
                  paymentType: item.paymentType
                }]
              }
          })
          payload = [...payload, ...reservations]
        })
        if(_.isEmpty(payload)) return reject(errorResponse(404, createError.NotFound().message))
        return resolve(getPaginatedItems(payload, page, limit))
      } catch (error) {
        console.log(error)
        return reject(errorResponse(500, createError.InternalServerError().message))
      }
    })
  },
  cancelOrderItemByUser: (userId, orderItemId) => {
    return new Promise(async (resolve, reject) => {
      try {
        const orderItem = await orderModel.findOneAndUpdate({
          $and:[
            {user: userId},
            {items:{$elemMatch: {
              $and:[
                {_id: orderItemId},
                {isCancel: false},
                {isDeleted: false},
                {"orderStatus.0.isCompleted":false}
              ]
            }}}
          ]
        },{
          $set:{
            "items.$.isCancel":true
          }
        },{
          new:true
        }).lean()
        if(!orderItem) return reject(errorResponse(404, createError.NotFound().message))
        await userModel.findOneAndUpdate({
          _id: userId
        }, {
          $inc:{"meta.totalCancel": 1} 
        },{
          new: true
        }).lean()

        return resolve({
          data:{
            message:Message.cancel_order_success
          }
        })
      } catch (error) {
        console.log(error)
        return reject(errorResponse(500, createError.InternalServerError().message))
      }
    })
  },
  cancelOrderByUser: (userId, orderId) => {
    return new Promise(async (resolve, reject) => {
      try {
        const order = await orderModel.findOneAndUpdate({
          $and:[
            {user: userId},
            {_id: orderId},
            { items:{$elemMatch: {
              $and:[
                {"isCancel": false},
                {"isDeleted": false},
                {"orderStatus.0.isCompleted":false}
              ]
              }}
            }
          ]
        },{
          $set:{
            "items.$[].isCancel":true
          }
        },{
          new: true
        }).lean()
        
        if(!order) return reject(errorResponse(404, createError.NotFound().message))
        const user = await userModel.findOneAndUpdate({
          user: userId
        }, {
          $inc:{"meta.totalCancel": order.items.length}
        },{
          new: true
        }).lean()
        
        return resolve({
          data:{
            message: Message.cancel_order_success
          }
        })
      } catch (error) {
        console.log(error)
        return reject(errorMessage(500, createError.InternalServerError().message))
      }
    })
  }
  ,
  // seller processing orders
  getOrdersNotDone: (sellerId, queryStr) =>  {
    return new Promise(async (resolve, reject) => {
      try {
       
        const productOrdered =await inventoryModel
        .aggregate([
          {
            $match:{sellerId: new mongoose.Types.ObjectId(sellerId)}
          },
          {
            $lookup: {
              from: "orders",
              localField: "reservations.order",
              foreignField:"_id",
              let:{productId: "$product"},
              pipeline : [
                { $project: {
                  user:1,
                  items: {$filter: {
                      input: '$items',
                      as: 'item',
                      cond: {$and:[
                        {$eq: ['$$item.product', "$$productId"]},
                        {$eq: ['$$item.isDeleted',false]},
                        {$eq: ['$$item.isCancel',false]}
                      ]}
                  }},
                  address: 1,
                  user: 1,
                  paymentType: 1
                }},
                {
                  $lookup:{
                    from: "users",
                    localField:"user",
                    foreignField:"_id",
                    pipeline:[
                      {
                        $project:{
                          info:1,
                          meta:1
                        }
                      }
                    ],
                    as: "user"
                  }
                },
                {$unwind: "$user"}
              ],
              as: "orders"
            }
          },
          {
            $lookup: {
              from: "products",
              localField: "product",
              foreignField:"_id",
              pipeline : [
                { $project: {
                  name:1,
                  productPictures: 1,
                  quantity: 1,
                }}
              ],
              as: "product"
            }
          },
          {
            $unwind: "$product"
          },
          {
            $project:{
              "reservations":0
            }
          },
          {
            $sort : { "reservations.createdAt": -1 }
          }
        ])
        let payload = []
        productOrdered.map((item) => {
          let reservations = []
          item.orders.forEach((order) =>{
              if(!_.isEmpty(order.items)) {
                reservations = [...reservations, {...order,
                  product: item.product
                }]
              }
          })
          if(_.isEmpty(reservations)) return
          payload = [...payload, ...reservations]
          return
        })

        return resolve(getPaginatedItems(payload, queryStr.currentPage, queryStr.limit))
        
      } catch (error) {
        console.log(error)
        return reject(errorResponse(500, createError.InternalServerError().message))
      }
    })
  },
  updateStatusOrderBySeller: (sellerId, orderId) => {
    return new Promise(async (resolve,reject) => {
      try {
        console.log("sellerId::", sellerId)
        console.log("orderId:::", orderId)
        const updated = await orderModel.aggregate([
          {$match: {
            "items":{$elemMatch: {_id:new mongoose.Types.ObjectId(orderId)}}
          }},
          {
            $project:{
              items:{
                $filter:{
                  input:"$items",
                  as: 'item',
                  cond: {$and:[
                    {$eq: ['$$item._id', new mongoose.Types.ObjectId(orderId)]},
                    {$eq:['$$item.isDeleted', false]} ,
                    {$eq:['$$item.isCancel', false]}                
                  ]}
                  
                }
              }
            }
          }
        ])
        
        if(_.isEmpty(updated)) return reject(errorResponse(404, createError.NotFound().message))
        if(_.isEmpty(updated.at(0).items)) return reject(errorResponse(405, Message.order_deleted))
        
        const product = await productModel.findOne({
          _id: updated.at(0).items.at(0).product
        })
        .select("sellerId")
        .lean()

        if(!product.sellerId === sellerId){
          return reject(errorResponse(403, Message.product_not_owner))
        }
        
        const currentStatus = updated.at(0).items.at(0).orderStatus.at(-1).type
        if(currentStatus !== "ordered" && currentStatus !== "packed"){
          return reject(errorResponse(403, Message.update_order_status_permission))
        }
        
        let orderStatusUpdate = []
        const orderStatus = updated.at(0).items.at(0).orderStatus
        if(orderStatus.at(-1).type === "ordered"){
          orderStatusUpdate = [
            {...orderStatus.at(-1), isCompleted: true, date: Date.now()}, 
            {...orderStatus.at(-1), type:"packed", date: Date.now(), isCompleted: false}
          ]
        }
        if(orderStatus.at(-1).type === "packed"){          
          orderStatusUpdate = [
            {...orderStatus.at(0)}, 
            {...orderStatus.at(-1), date: Date.now(), isCompleted: true},
            {...orderStatus.at(-1), type: "shipped", date: Date.now(), isCompleted: false}
          ]
        }

        const updateStatus = await orderModel.updateOne({
          items:{$elemMatch:{_id: orderId}}
        },{
          $set:{
            "items.$.orderStatus":orderStatusUpdate
          }
        },{
          new: true
        })
        
        return resolve({
          data:{
            orderStatus: orderStatusUpdate
          }
        })
        
      } catch (error) {
        console.log(error)
        return reject(errorResponse(500, createError.InternalServerError().message))
      }
    })
  },
  updateStatusOrderByShipper: (orderId) => {
    return new Promise(async (resolve, reject) => {
      try {
        const updated = await orderModel.aggregate([
          {$match: {
            "items":{$elemMatch: {_id:new mongoose.Types.ObjectId(orderId)}}
          }},
          {
            $project:{
              items:{
                $filter:{
                  input:"$items",
                  as: 'item',
                  cond: {$and:[
                    {$eq: ['$$item._id', new mongoose.Types.ObjectId(orderId)]}
                  ]}
                  
                }
              }
            }
          }
        ])
        if(_.isEmpty(updated)) return reject(errorResponse(404, createError.NotFound().message))
        const currentStatus = updated.at(0).items.at(0).orderStatus.at(-1)
        if(!(currentStatus.type === "shipped" || currentStatus.type === "delivered")){
          return reject(errorResponse(403, createError.Unauthorized().message))
        }
        if(currentStatus.type === "delivered" && currentStatus.isCompleted === true){
          return reject(errorResponse(403, Message.done_order))
        }

        let orderStatusUpdate = []
        const orderStatus = updated.at(0).items.at(0).orderStatus
        if(orderStatus.at(-1).type === "shipped"){
          orderStatusUpdate = [
            orderStatus.at(0),
            orderStatus.at(1),
            {...orderStatus.at(-1), isCompleted: true, date: Date.now()}, 
            {...orderStatus.at(-1), type:"delivered", date: Date.now(), isCompleted: false}
          ]
        }
        if(orderStatus.at(-1).type === "delivered"){          
          orderStatusUpdate = [
            orderStatus.at(0),
            orderStatus.at(1),
            orderStatus.at(2),
            {...orderStatus.at(-1), type: "delivered", date: Date.now(), isCompleted: true}
          ]
        }

        const updateStatus = await orderModel.updateOne({
          items:{$elemMatch:{_id: orderId}}
        },{
          $set:{
            "items.$.orderStatus":orderStatusUpdate
          }
        },{
          new: true
        })
        
        return resolve({
          data:{
            orderStatus: orderStatusUpdate
          }
        })

      } catch (error) {
        console.log(error)
        return reject(errorResponse(500, createError.InternalServerError().message))
      }
    })
  },
  // shipper processing orders
  getOrdersShipping:(shipperId, page, limit) => {
    return new Promise(async (resolve, reject) => {
      try {
        const shippingCode = await shippingModel.find({
          user: shipperId
        })
        .select("-_id code")
        .lean()
        const codeList = shippingCode.map((code) => {
          return code.code
        })
        
        const orders = await orderModel.aggregate([
          {$match: {"items": {$elemMatch: {shippingCode: {"$in": codeList}}}}},
          {
            $project:{
              items: {$filter: {
                input: '$items',
                as: 'item',
                cond: {$and:[
                  {$eq: ['$$item.isCancel',false]},
                  {$eq:['$$item.isDeleted',false]},
                  {$gte:[{"$size":"$$item.orderStatus"}, 3]}
                ]}
                }
              },
              address: 1,
              paymentType:1,
              createdAt: 1
            }
          },
          { "$match": { "items.0": { "$exists": true } } },
          {$sort:{createdAt: -1}},
          { $unwind: "$items" },
          {
            $lookup: {
              from: "products",
              localField: "items.product",
              foreignField: "_id",
              pipeline : [
                { $project: {
                  name:1,
                  productPictures: 1,
                  quantity: 1,
                }}
              ],
              as: "product"
           }
          },
          {
            $unwind: "$product"
          },
          { $set: {
            "items.product": "$product"
          }},
          { $group: {
            _id: "$_id",
            address:{"$first":"$address"},
            paymentType:{"$first":"$paymentType"},
            items: { $push: "$items" }
          }}
        ])

        if(_.isEmpty(orders)) return reject(errorResponse(404, createError.NotFound().message))
        let payload = []
        
        orders.forEach((item) => {
          let reservations = []
          item.items.forEach((order) =>{
              if(_.isEmpty(order) === false && order.orderStatus.at(-1).isCompleted === false) {
                reservations = [...reservations, {...order,
                  orderId: item._id,
                  address: item.address,
                  paymentType: item.paymentType
                }]
              }
          })
          payload = [...payload, ...reservations]
        })

        if(_.isEmpty(payload)) return reject(errorResponse(404, createError.NotFound().message))
        return resolve(getPaginatedItems(payload, page, limit))
      } catch (error) {
        console.log(error)
        return reject(errorResponse(500, createError.InternalServerError().message))
      }
    })
  }
}