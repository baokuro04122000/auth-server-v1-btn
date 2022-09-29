const JWT = require('jsonwebtoken')
const createError = require('http-errors')
const Message = require('../lang/en')
const redis = require('../databases/init.redis')
var that = module.exports = {
  signAccessToken : (payload) => {
    return new Promise( (resolve, reject) => {
      if(payload.exp){
        delete payload['exp']
        delete payload['iat']
      }
      const secret = process.env.ACCESS_TOKEN_SECRET
      const options = {
        expiresIn: process.env.ACCESS_TOKEN_EXPIRED
      }
      JWT.sign(payload, secret, options, (err, token) => {
        if(err) return reject({
          status:400,
          "errors":{
            message: err
          }
        })
        return resolve(token)
      })
    })
  },

  verifyAccessToken : (req, res, next) => {
    const token = req.cookies.access_token;
    if(token){
      JWT.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, payload) => {
        if(err){
          if(err.name === "JsonWebTokenError"){
            return next(createError.Unauthorized())
          }
          return next(createError.Unauthorized(err.message))
        }
        req.payload = payload
        next()
      })
    }else{
      return next(createError.Unauthorized())
    }
  },

  signRefreshToken : (payload) => {
    return new Promise((resolve, reject) => {
      if(payload.exp){
        delete payload['exp']
        delete payload['iat']
      }
      const secret = process.env.REFRESH_TOKEN_SECRET
      const options = {
        expiresIn:process.env.REFRESH_TOKEN_EXPIRED
      }
      JWT.sign(payload, secret, options, (err, token) => {
        if(err) return reject({
          status:400,
          message:err
        })
        redis.set(token,payload._id.toString(),'EX',Number(process.env.REFRESH_TOKEN_REDIS_EXPIRED)).then((data)=>{
          console.log("data:::",data)
        }).catch(err => console.log(err)) 
        return resolve(token)
      })
    })
  },
  isAuthSeller: async (req, res, next) => {
    const token = req.cookies.access_token
    if(token){
      JWT.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, payload) => {
        if(err){
          if(err.name === "JsonWebTokenError"){
            return next(createError.Unauthorized())
          }
          return next(createError.Unauthorized(err.message))
        }
        if(!(payload.role === "seller")){
         return next(createError.Unauthorized(Message.invalid_permission))
        }
        req.payload = payload
        next()
      })
    }else{
      return next(createError.Unauthorized())
    }
  }
}
