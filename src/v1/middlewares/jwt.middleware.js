const JWT = require('jsonwebtoken')
const {errorResponse} = require('../utils')
const createError = require('http-errors')
const Message = require('../lang/en')
var that = module.exports = {

  verifyAccessToken : (req, res, next) => {
    const token = req.cookies.access_token;
    if(token){
      JWT.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, payload) => {
        if(err){
          if(err.name === "JsonWebTokenError"){
            return res.status(409).json(errorResponse(409, err.message))
          }
          return res.status(409).json(errorResponse(409,err.message))
        }
        req.payload = payload
        next()
      })
    }else{
      return res.status(404).json(errorResponse(404,createError.NotFound()))
    }
  },
  isAuthSeller: async (req, res, next) => {
    const token = req.cookies.access_token
    if(token){
      JWT.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, payload) => {
        if(err){
          if(err.name === "JsonWebTokenError"){
            return res.status(409).json(errorResponse(409,err.message))
          }
          return res.status(409).json(errorResponse(409,err.message))
        }
        if(!(payload.role === "seller")){
         return res.status(403).json(errorResponse(403, Message.invalid_permission))
        }
        req.payload = payload
        next()
      })
    }else{
      return res.status(403).json(errorResponse(403, createError.Unauthorized().message))
    }
  },
  isAuthAdmin: async (req, res, next) => {
    const token = req.cookies.access_token
    if(token){
      JWT.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, payload) => {
        if(err){
          if(err.name === "JsonWebTokenError"){
            return res.status(409).json(errorResponse(409,createError.Unauthorized()))
          }
          return res.status(409).json(errorResponse(409,createError.Unauthorized(err.message)))
        }
        if(!(payload.role === "admin")){
         return res.status(403).json(errorResponse(403, createError.Unauthorized(Message.invalid_permission)))
        }
        req.payload = payload
        next()
      })
    }else{
      return res.status(403).json(errorResponse(403, createError.Unauthorized().message))
    }
  }
}
