const cartModel = require('../models/cart.model')
const { errorResponse } = require('../utils')
const createError = require('http-errors')
const Message = require('../lang/en')
const _ = require('lodash')
const { totalPriceProduct, convertSpecsInProduct } = require('../utils')
var that = module.exports = {
  addToCart: (userId,cartItem) => {
    return new Promise(async (resolve, reject) => {
      try {
        const cart = await cartModel.findOne({ user: userId }).lean()
        if (!_.isEmpty(cart)) {
          const product = cartItem.product
          //const variant = cartItem.variant
          const item = cart.cartItems.find(c => c.product == product)
          let condition, update
          if (item) {
            condition = { $and:[
              {user: userId},
              {cartItems: {$elemMatch:{product: product}}}
            ]}
            update = {
                $set: {
                    "cartItems.$.quantity": cartItem.quantity,
                    "cartItems.$.wishlist": cartItem.wishlist
                }
            }
          } else {
            condition = { user: userId }
            update = {
                $push: {
                    cartItems: cartItem
                }
            }
          }
            cartModel.findOneAndUpdate(condition, update,
            { new: true, upsert: true, setDefaultsOnInsert: false })
            .exec((error, cart) => {
              console.log(error)
              if (error) return reject(errorResponse(500, createError.InternalServerError().message))
              if (!_.isEmpty(cart)) {
                  return resolve({
                    data: {
                      message: Message.add_cart_success
                    }
                  })
              }
            })
        } else {
          const cart = new cartModel({
            user: userId,
            cartItems: [cartItem]
          })
          cart.save((error, cart) => {
            if (error) return reject(errorResponse(500, createError.InternalServerError().message))
            if (cart) {
              return resolve({
                data: {
                  message:Message.add_cart_success
                }
              })
            }
          })
        }
      } catch (error) {
        console.log(error)
        return reject(errorResponse(500, createError.InternalServerError().message))
      }
    })
  },
  getCartItems: (userId) => {
    return new Promise(async (resolve, reject) => {
      console.log(userId)
      try {
        const cart = await cartModel.findOne({
          user: userId
        })
        .populate({
          path: 'cartItems.product',
          populate:[
            {
              path: "sellerId",
              select:"info -_id"
            },
            {
              path: "category",
              select:"name -_id"
            }
          ],
          select:"-description -summary"
        })   
        .lean()
        if(_.isEmpty(cart)){
          return resolve({
            data: []
          })
        }
        return resolve({
          data: {
            _id: cart._id,
            user: cart.user,
            cartItems:cart.cartItems.map((item) => ({
              ...item,
              product: {
                ...item.product,
                specs: convertSpecsInProduct(item.product), 
                productPictures: item.product.productPictures[0]
              },
              totalPrice: totalPriceProduct(item.product.price, item.quantity, item.product.discountPercent)
            }))
          }
        })
      } catch (error) {
        console.log(error)
        return reject(errorResponse(500, createError.InternalServerError().message))
      }
    })
  },
  removeCartItem: (userId, cartItem) => {
    return new Promise(async (resolve, reject) => {
      try {
        const cart = await cartModel.findOneAndUpdate({
          user: userId
        },{
          $pull: {
              cartItems: {
                  product: cartItem.product
              }
          }
        
        }, {new: true, upsert: true})
        .lean()
        if(_.isEmpty(cart)){
          return reject(errorResponse(404, createError.NotFound().message))
        }
        return resolve({
          data:{
            message:Message.delete_success
          }
        })
      } catch (error) {
        console.log(error)
        return reject(errorResponse(500, createError.InternalServerError().message))        
      }
    })
  },
  addMultipleItemToCart: (userId, cartItems) => {
    return new Promise((resolve, reject) => {
      cartModel.findOne({user: userId}).exec(async (error, cart) => {
        console.log(error)
        if(error) return reject(errorResponse(500, createError.InternalServerError().message))
        if(_.isEmpty(cart)) return reject(errorResponse(404, createError.NotFound().message))

        try {
          await Promise.all(cartItems.map((item) => {
            return that.addToCart(userId, item)
          }))
          return resolve({
            data:{
              message: Message.update_success
            }
          })    
        } catch (error) {
          console.log(error)     
        }
      })
    })
  }
}