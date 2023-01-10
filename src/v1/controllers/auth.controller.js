const JWT = require('jsonwebtoken')
const _ = require('lodash')
const xssFilter = require('xss-filters')
const authService = require('../services/auth.service')
const jwtService = require('../services/jwt.service')
const redis = require('../databases/init.redis')
const createError = require('http-errors')
const {errorResponse} = require('../utils')
const { setCookies } = require('../utils')
const Message = require('../lang/en')
var that  = module.exports = {
  userLogin: async (req, res) => {
    const { email, password } = req.body
    try {
      const {data, access_token, refresh_token} = await authService.userLogin(xssFilter.inHTMLData(email), password)
      setCookies(res, 'access_token', access_token, Number(process.env.ACCESS_TOKEN_EXPIRED_BY_SECOND))
      setCookies(res, 'refresh_token', refresh_token, Number(process.env.REFRESH_TOKEN_REDIS_EXPIRED))
      res.send({
        data,
        access_token
      }) 
    } catch (error) {
      console.log(error)
      res.status(error.status).json(error)
    }
  },
  userLoginMobile: async (req, res) => {
    const { email, password } = req.body
    try {
      const {data, access_token, refresh_token} = await authService.userLogin(xssFilter.inHTMLData(email), password)
      res.send({
        data,
        access_token,
        refresh_token
      }) 
    } catch (error) {
      console.log(error)
      res.status(error.status).json(error)
    }
  },
  userRegisterWeb: async (req, res) => {
    const user = req.body
  
    try {
      const data = await authService.userRegisterWeb({
        email:xssFilter.inHTMLData(user.email),
        password:user.password,
        firstName:xssFilter.inHTMLData(user.firstName),
        gender:xssFilter.inHTMLData(user.gender),
        lastName:xssFilter.inHTMLData(user.lastName)
      })
      res.cookie('active_account', false,
      {
        httpOnly: false,
        maxAge:Number(process.env.ACTIVE_ACCOUNT_COOKIE_EXPIRED),
      })
      .json(data)
    } catch (error) {
      res.status(error.status).json(error)
    }
  },
  userRegisterMobile: async (req, res) => {
    const user = req.body
    try {
      const data = await authService.userRegisterMobile({
        email:xssFilter.inHTMLData(user.email),
        password:user.password,
        firstName:xssFilter.inHTMLData(user.firstName),
        gender:xssFilter.inHTMLData(user.gender),
        lastName:xssFilter.inHTMLData(user.lastName)
      })
      res.json(data)
    } catch (error) {
      res.status(error.status).json(error)
    }
  },
  adminLogin: async (req, res) => {
    const {
      email,
      password
    } = req.body
    await authService.checkRole({email, password})
  },
  sellerRegisterRequest: async (req, res) => {
    if((req.payload.role === "user")){
      try {
        const data = await authService.sellerRegisterRequest(req.payload._id)
        return res.json(data)
      } catch (error) {
        return res.status(error.status).json(error)
      }
    }
    res.status(400).json(errorResponse(400, createError.Unauthorized()))    
  },
  checkSellerRegisterRequest: async (req, res) => {
    const {token} = req.body
    try {
      const data = await authService.checkSellerRegisterRequest(token)
      res.json(data)
    } catch (error) {
      res.status(error.status).json(error)    
    }
  },
  sellerRegister:async (req, res) => {
    try {
      const {
        name,
        phone,
        fbLink,
        inLink,
        logo,
        proof,
        slogan,
        token
      } = req.body

      const seller = {
        name: xssFilter.inHTMLData(name),
        phone: xssFilter.inHTMLData(phone),
        slogan: xssFilter.inHTMLData(slogan),
        fbLink: fbLink ?  xssFilter.inHTMLData(fbLink).trim() : "",
        inLink: inLink ? xssFilter.inHTMLData(inLink).trim() : "",
        logo: _.isEmpty(logo) ? {
          fileLink:"https://vn-live-01.slatic.net/p/mdc/03b895db9c7b85ae98973b0941d66696.jpg",
        } : logo,
        proof: proof ? proof : [],
        token
      }
      const data = await authService.sellerRegister(seller)
      res.json(data)
    } catch (error) {
      console.log(error)
      res.status(error.status).json(error)
    }
  }
  ,
  activeAccount: async (req, res) => {
    try {
      const {token} = req.query
      await authService.activeAccount(token)
      res.cookie('active_account',true,{
        httpOnly:false,
        maxAge:Number(process.env.ACTIVE_ACCOUNT_COOKIE_EXPIRED)
      })
      res.redirect(process.env.REDIRECT_ACTIVE_SUCCESS)
    } catch (error) {
      res.status(500).json(error)
    }
  },
  googleLogin: async (req, res) => {
    try {
      const code = req.query.code
      const { id_token, access_token } = await authService.getGoogleOAuthTokens(code)
      const googleUser = await authService.getGoogleUser(id_token, access_token)
      const data = await authService.googleLogin(googleUser)
      setCookies(res,'access_token', data.access_token, Number(process.env.ACCESS_TOKEN_EXPIRED_BY_SECOND))
      setCookies(res,'refresh_token', data.refresh_token, Number(process.env.REFRESH_TOKEN_REDIS_EXPIRED))
      
      res.redirect(`${process.env.CLIENT_ENDPOINT}/auth/login`)
    } catch (error) {
      console.log(error)
      res.status(error.status).json(error)
    }
  },

  googleLoginMobile:async (req, res) => {
    try {
      const code = req.query.code
      const { id_token, access_token } = await authService.getGoogleOAuthTokens(code)
      const googleUser = await authService.getGoogleUser(id_token, access_token)
      const data = await authService.googleLogin(googleUser)
      res.json(data)
    } catch (error) {
      console.log(error)
      res.status(error.status).json(error)
    }
  },
  refreshToken :async (req,res) => {
    const refresh_token = req.cookies.refresh_token
    const checkRedis = await redis.get(refresh_token)
    if(!checkRedis){return res.status(404).json(errorResponse(404,Message.refresh_token_not_expired))}
    JWT.verify(refresh_token, process.env.REFRESH_TOKEN_SECRET,async (err, payload) => {
      if(err){
        console.log(err)
        return res.status(400).json(err)
      }
      if(!(payload._id === checkRedis))  return res.status(403).json(errorResponse(403,Message.token_expired))
      try {
        const token = await jwtService.signAccessToken(payload)
        const refreshToken = await jwtService.signRefreshToken(payload)
        await redis.del(refresh_token)
        setCookies(res,'access_token', token,Number(process.env.ACCESS_TOKEN_EXPIRED_BY_SECOND))
        setCookies(res, 'refresh_token', refreshToken, Number(process.env.REFRESH_TOKEN_REDIS_EXPIRED))
        res.json({data:payload, access_token:token})
      } catch (error) {
        console.log(error)
        res.status(500).json(errorResponse(500, createError.InternalServerError()))
      }
    })
  },
  refreshTokenMobile :async (req,res) => {
    const authorization = req.headers.authorization
    const refresh_token = authorization.slice(7,authorization.length)
    const checkRedis = await redis.get(refresh_token)
    if(!checkRedis){return res.status(404).json(errorResponse(404,Message.refresh_token_not_expired))}
    JWT.verify(refresh_token, process.env.REFRESH_TOKEN_SECRET,async (err, payload) => {
      if(err){
        console.log(err)
        return res.status(400).json(err)
      }
      if(!(payload._id === checkRedis))  return res.status(403).json(errorResponse(403,Message.token_expired))
      try {
        const token = await jwtService.signAccessToken(payload)
        const refreshToken = await jwtService.signRefreshToken(payload)
        await redis.del(refresh_token)
        res.json({data:payload, access_token:token, refreshToken})
      } catch (error) {
        console.log(error)
        res.status(500).json(errorResponse(500, createError.InternalServerError()))
      }
    })
  },
  getCurrentUser: (req, res) => {
    const access_token = req.cookies.access_token
    if(access_token){
      JWT.verify(access_token, process.env.ACCESS_TOKEN_SECRET, (err, payload) => {
        if(err){
          console.log('err::',err)
          if(err.name === "JsonWebTokenError"){
            return res.status(409).json({
              status:409,
              "errors":{
                message:createError.Unauthorized()
              }
            })
          }
          return res.status(409).json({
            status:409,
            "errors":{
              message:createError.Unauthorized(err.message)
            }
          })
        }
        return res.send({
          data:payload,
          access_token:access_token
        })
      })
    }
    res.status(400).json({
      status:400,
      "errors":{
        message:Message.token_not_found
      }
    })
  },
  logout:async (req, res) => {
    try {
      const refresh_token = req.cookies.refresh_token
      const x = await redis.del(refresh_token)
      console.log(x)
      setCookies(res,'access_token', null,0)
      setCookies(res, 'refresh_token', null, 0)
      res.send({
        data:{
          message: Message.logout_success
        }
      })  
    } catch (error) {
      console.log(error)
      res.status(400).json({
        status: 400,
        "errors":{
          message:Message.server_wrong
        }
      })
    }
  },
  emailResetPassword:async (req, res) => {
      const {email} = req.body
      try {
        const payload = await authService.sendEmailResetPassword(email, "seller")
        console.log(payload)
        res.json(payload)
      } catch (error) {
        res.status(error.status).json(error)
      }
},
  OTPCodeResetPassword:async (req, res) => {
    const {userId, otp} = req.body
    try {
      const payload = await authService.OTPCode(userId,Number(otp))
      console.log('here')
      console.log(payload)
      res.json(payload)
    } catch (error) {
      res.status(error.status).json(error)
    }
  },
  resetPassword: async (req, res) => {
    const {userId,token, password} = req.body
    try {
      const payload = await authService.resetPassword(userId,token, password)
      console.log(payload)
      res.json(payload)
    } catch (error) {
      res.status(error.status).json(error)
    }
  },
  OTPCodeRegisterMobile: async (req, res) => {
    const {userId, otp} = req.body
    try {
      const payload = await authService.OTPCodeMobile(userId,Number(otp))
      res.json(payload)
    } catch (error) {
      res.status(error.status).json(error)
    }
  },
  registerSendOTPAgain: async (req, res) => {
    const {userId} = req.body
    try {
      const payload = await authService.registerSendOTPAgain(userId)
      res.json(payload)
    } catch (error) {
      res.status(error.status).json(error)
    }
  }
}