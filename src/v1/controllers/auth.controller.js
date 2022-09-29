const authService = require('../services/auth.service')
const JWT = require('jsonwebtoken')
const jwtService = require('../services/jwt.service')
const redis = require('../databases/init.redis')
const Message = require('../lang/en')
var that  = module.exports = {
  userLogin: async (req, res) => {
    console.log(req.body)
    const { email, password } = req.body
    try {
      const {data, access_token, refresh_token} = await authService.userLogin(email, password)
      res.cookie('access_token', access_token, {
        origin:process.env.CLIENT_ENDPOINT,
        expires: new Date(Date.now() + Number(process.env.ACCESS_TOKEN_EXPIRED_BY_SECOND)),
        httpOnly: true,
        sameSite:"strict",
        //secure: true
      })
      .cookie('refresh_token', refresh_token, {
        origin:process.env.CLIENT_ENDPOINT,
        expires: new Date(Date.now() + Number(process.env.REFRESH_TOKEN_REDIS_EXPIRED)),
        sameSite:"strict",
        httpOnly: true,
        //secure: true
      })
      .send({
        data,
        access_token
      })
      
    } catch (error) {
      console.log(error)
      res.status(error.status).json(error)
    }
  },
  userRegister: async (req, res) => {
    const user = req.body
    try {
      const data = await authService.userRegister(user) 
      res
      .cookie('active_account', false,
      {
        httpOnly: false,
        maxAge:process.env.ACTIVE_ACCOUNT_COOKIE_EXPIRED
      })
      .json(data)
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
  sellerRegister: async (req, res) => {
    const {
      email,
      password,
      brand
    } = req.body
  },
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
      res.cookie('access_token', data.access_token, {
        origin:process.env.CLIENT_ENDPOINT,
        expires: new Date(Date.now() + Number(process.env.ACCESS_TOKEN_EXPIRED_BY_SECOND)),
        httpOnly: true,
        sameSite:"strict",
        //secure: true;
      })
      res.cookie('refresh_token', data.refresh_token, {
        origin:process.env.CLIENT_ENDPOINT,
        expires: new Date(Date.now() + Number(process.env.REFRESH_TOKEN_REDIS_EXPIRED)),
        sameSite:"strict",
        httpOnly: true,
        //secure: true;
      })
      res.redirect(`${process.env.CLIENT_ENDPOINT}/auth/login`)
    } catch (error) {
      res.status(error.status).json(error)
    }
  },

  verifyRefreshToken :async (req,res) => {
    const refresh_token = req.cookies.refresh_token
    console.log(refresh_token)
    const checkRedis = await redis.get(refresh_token)
    JWT.verify(refresh_token, process.env.REFRESH_TOKEN_SECRET,async (err, payload) => {
      if(err){
        return res.status(400).json(err)
      }
      if(!(payload._id === checkRedis))  return res.status(400).json({
        status:400,
        "errors":{
          message: Message.token_expired
        }
      })
      try {
        const token = await jwtService.signAccessToken(payload)
        const refreshToken = await jwtService.signRefreshToken(payload)
        await redis.del(refresh_token)
        res.cookie('access_token', token, {
          origin:process.env.CLIENT_ENDPOINT,
          expires: new Date(Date.now() + Number(process.env.ACCESS_TOKEN_EXPIRED_BY_SECOND)),
          httpOnly: true,
          sameSite:"strict",
          //secure: true;
        })
        res.cookie('refresh_token', refreshToken, {
          origin:process.env.CLIENT_ENDPOINT,
          expires: new Date(Date.now() + Number(process.env.REFRESH_TOKEN_REDIS_EXPIRED)),
          sameSite:"strict",
          httpOnly: true,
          //secure: true;
        })
        res.json({data:payload, access_token:token})
      } catch (error) {
        console.log("erro:::",error)
        res.status(400).json({
          status: 400,
          "errors":{
            message:error
          }
        })
      }
    })
  },
  getCurrentUser: (req, res) => {
    const access_token = req.cookies.access_token
    console.log(access_token)
    if(access_token){
      JWT.verify(access_token, process.env.ACCESS_TOKEN_SECRET, (err, payload) => {
        if(err){
          if(err.name === "JsonWebTokenError"){
            return res.status(400).json({
              status:400,
              "errors":{
                message:createError.Unauthorized()
              }
            })
          }
          return res.status(400).json({
            status:400,
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
    res.status(404).json({
      status:400,
      "errors":{
        message:Message.token_not_found
      }
    })
  },
  logout:async (req, res) => {
    try {
      const refresh_token = req.cookies.refresh_token
      await redis.del(refresh_token)
      res.clearCookie('access_token')
      res.clearCookie('refresh_token')
      res.end({
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
  }
}