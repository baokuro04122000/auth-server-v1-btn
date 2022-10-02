const JWT = require('jsonwebtoken')
const createError = require('http-errors')
const Message = require('../lang/en')
var that = module.exports = {

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
