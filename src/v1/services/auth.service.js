const Message = require('../lang/en')
const userModel = require('../models/users.model')
const sellerModel = require('../models/sellers.model')
const adminModel = require('../models/admins.model')
const otpModel = require('../models/otp.model')
const tokenModel = require('../models/token.model')
const {
  handlerRequest,
  errorResponse,
  generateOtp
} = require('../utils')
const bcrypt = require('bcrypt')
const _ = require('lodash')
const redis = require('../databases/init.redis')
const createError = require('http-errors')
const jwtService = require('./jwt.service')
const qs = require('qs')
const axios = require('axios')
const { v4: uuidv4 } = require('uuid');



var that = module.exports = {
  userRegisterWeb: (user) => {
    return new Promise(async (resolve, reject)=> {
      const checkExisted = await userModel.findOne({
        $or:[
          {$and:[
            {"local.email": user.email},
            {"google.email":user.email}
          ]},
          {"local.email": user.email}
        ]
      }) 
      // when account is existed in database
      if(!_.isEmpty(checkExisted)) {
        return reject(errorResponse(400, Message.email_existed))
      }
      //when google is existed
      const verifyToken = uuidv4()
      const salt = await bcrypt.genSalt(10)
      const hashPassword = await bcrypt.hash(user.password, salt)
      let err, data
        [err, data] = await handlerRequest(userModel.findOneAndUpdate(
        {"google.email":user.email},
        {$set:{
            "local.email":user.email,
            "local.password":hashPassword,
            "local.verifyToken":verifyToken,
            "info.firstName":user.firstName,
            "info.lastName":user.lastName,
            "info.gender":user.gender 
          }
        },{
          new: true
        }
      ))
      if(err) {
        return reject(errorResponse(500, createError[500]))
      }
      if(_.isEmpty(data)){
        
        [err, data] = await handlerRequest(
          new userModel({
            local:{
              email:user.email,
              password:user.password,
              verifyToken: verifyToken
            },
            info:{
              firstName:user.firstName,
              lastName:user.lastName,
              gender:user.gender
            }
          }).save()  
        )
        if(err){
          console.log(err)
          return reject(errorResponse(500, createError.InternalServerError().message))
        }
        redis.publish('send_mail',JSON.stringify({
          email: data.local.email,
          _id:data._id,
          verifyToken:data.local.verifyToken,
          name: data.info.firstName + data.info.lastName
        }))
        return resolve({
          data:{
            message: Message.register_success
          }
        })
      }
      redis.publish('send_mail',JSON.stringify({
        email: user.email,
        _id:data._id,
        verifyToken:verifyToken,
        name: user.name
      }))
      return resolve({
        data:{
          message: Message.register_success
        }
      })
      
    })
  },
  userRegisterMobile: (user) => {
    return new Promise(async (resolve, reject)=> {
      const checkExisted = await userModel.findOne({
        $or:[
          {$and:[
            {"local.email": user.email},
            {"google.email":user.email}
          ]},
          {"local.email": user.email}
        ]
      }) 
      // when account is existed in database
      if(!_.isEmpty(checkExisted)) {
        return reject(errorResponse(400, Message.email_existed))
      }
      
      //when google is existed
      const otp = generateOtp(6)
      const salt = await bcrypt.genSalt(10)
      const hashPassword = await bcrypt.hash(user.password, salt)
      let err, data
        [err, data] = await handlerRequest(userModel.findOneAndUpdate(
        {"google.email":user.email},
        {$set:{
            "local.email":user.email,
            "local.password":hashPassword,
            "info.firstName":user.firstName,
            "info.lastName":user.lastName,
            "info.gender":user.gender 
          }
        },{
          new: true
        }
      ))
       
      if(err) {
        return reject(errorResponse(500, createError.InternalServerError().message))
      }
      if(_.isEmpty(data)){
        [err, data] = await handlerRequest(
          new userModel({
            local:{
              email:user.email,
              password:user.password,
            },
            info:{
              firstName:user.firstName,
              lastName:user.lastName,
              gender:user.gender
            }
          }).save()
        )
        if(err){
          console.log(err)
          return reject(errorResponse(500, createError.InternalServerError().message))
        }
        try {
          (await otpModel.find({user: data._id})).map((otp) => otp.remove())
          await new otpModel({
            user:data._id,
            generatedOtp:otp
           }).save()
           console.log(otp)
          redis.publish('send_otp_register_mobile',JSON.stringify({
            email: user.email,
            otp:otp,
            name:user.firstName + user.lastName
          }))
          return resolve({
            data:{
              message: Message.register_success
            },
            userId: data._id
          })
        } catch (error) {
          console.log(error)
          return reject(errorResponse(500, createError.InternalServerError().message))
        }
      }
      try {
        (await otpModel.find({user: data._id})).map((otp) => otp.remove())
        await new otpModel({
          user:data._id,
          generatedOtp:otp
         }).save()


        redis.publish('send_otp_register_mobile',JSON.stringify({
          email: user.email,
          otp:otp,
          name:user.firstName + user.lastName
        }))
        
        return resolve({
          data:{
            message: Message.register_success
          },
          userId: data._id
        })
      } catch (error) {
        console.log(error)
        return reject(errorResponse(500, createError.InternalServerError().message))
      }      
    })
  }
  ,
  userLogin: (email, password) => {
    return new Promise(async (resolve, reject)=> {
      try {
        const account = await userModel
        .findOne(
          {
          "local.email":email
          })
        .populate('seller')
        if(_.isEmpty(account)){
          return reject(errorResponse(401, Message.login_wrong))
        }
        const user = new userModel({"local.password": account.local.password})
        const checkPassword = await user.isCheckPassword(password)
        if(!checkPassword){
          return reject(errorResponse(401, Message.login_wrong))
        }
        
        if(!account.local.verified){
          return reject(errorResponse(401, Message.account_inactive))
        }

        if(account.status === "blocked"){
          return reject(errorResponse(401, Message.account_locked))
        }

        if(account.role === "user"){
          const payload = {
            _id: account._id,
            nickName: account.info.nickName,
            firstName:account.info.firstName,
            lastName:account.info.lastName,
            profilePicture: account.info.avatar,
            role: account.role,
            meta:account.meta,
            special:account.specs,
            typeLogin:"local"
          }
          try {
            const access_token = await jwtService.signAccessToken(payload)
            const refresh_token = await jwtService.signRefreshToken(payload)
            return resolve({
              data: payload,
              access_token,
              refresh_token
            })  
          } catch (error) {
            console.log(error)
            return reject(errorResponse(401, createError.InternalServerError().message))
          }
        }
        if(account.role === "shipper"){
          const payload = {
            _id: account._id,
            nickName: account.info.nickName,
            firstName:account.info.firstName,
            lastName:account.info.lastName,
            profilePicture: account.info.avatar,
            role: account.role,
            meta:account.meta,
            special:account.specs,
            typeLogin:"local"
          }
          try {
            const access_token = await jwtService.signAccessToken(payload)
            const refresh_token = await jwtService.signRefreshToken(payload)
            return resolve({
              data: payload,
              access_token,
              refresh_token
            })  
          } catch (error) {
            console.log(error)
            return reject(errorResponse(401, createError.InternalServerError().message))
          }
        }
        if(account.role === "admin"){
          const payload = {
            _id: account._id,
            nickName: account.info.nickName,
            firstName:account.info.firstName,
            lastName:account.info.lastName,
            profilePicture: account.info.avatar,
            role: account.role,
            meta:account.meta,
            special:account.specs,
            typeLogin:"local"
          }
          try {
            const access_token = await jwtService.signAccessToken(payload)
            const refresh_token = await jwtService.signRefreshToken(payload)
            return resolve({
              data: payload,
              access_token,
              refresh_token
            })  
          } catch (error) {
            console.log(error)
            return reject(errorResponse(401, createError.InternalServerError().message))
          }
        }
        const payload = {
          _id: account._id,
          email:account.local.email,
          nickName: account.info.nickName,
          firstName:account.info.firstName,
          lastName:account.info.lastName,
          profilePicture: account.info.avatar,
          role: account.role,
          meta:account.meta,
          seller:account.seller,
          special:account.specs,
          typeLogin:"local"
        }
        const access_token = await jwtService.signAccessToken(payload)
        const refresh_token = await jwtService.signRefreshToken(payload)
        return resolve({
          data: payload,
          access_token,
          refresh_token
        })
      } catch (error) {
        console.log(error)
        return reject(errorResponse(500, createError.InternalServerError().message))
      }
    })
  },
  sellerRegisterRequest:(userId) => {
    return new Promise(async (resolve, reject) => {
      try {
        const token = uuidv4();
        
        const user = await userModel.findOne({
          _id: userId
        }).lean()
        
        if(_.isEmpty(user)){
            return reject(errorResponse(404, Message.user_not_found))
        }
        
        const createToken = await new tokenModel({
          user: userId,
          generatedToken: token
        }).save()
        
        if(_.isEmpty(createToken)){
          return reject(errorResponse(404, Message.user_not_found))
        }
        
        redis.publish('send_mail',JSON.stringify({
          email: user.local.email,
          _id:user._id,
          verifyToken:createToken.generatedToken,
          name: user.info.firstName + user.info.lastName,
          type:"register_seller"
        }))
        return resolve({
          data:{
            message:Message.register_seller_send_mail
          }
        })

      } catch (error) {
        console.log(error)
        return reject(errorResponse(500, createError.InternalServerError().message))
      }
    })
  },
  checkSellerRegisterRequest: (token) => {
    return new Promise(async (resolve, reject) => {
      try {
        const isExisted = await tokenModel.findOne({
          generatedToken:token
        }).lean()
        if(_.isEmpty(isExisted)){
          return reject(errorResponse(400, Message.token_register_not_match))
        }
        return resolve({
          data: {
            message: Message.token_valid
          }
        })
      } catch (error) {
        console.log(error)
        return reject(errorResponse(400, createError.InternalServerError()))
      }
    })
  },
  sellerRegister: (seller) => {
    return new Promise(async (resolve, reject) => {
      try {
        const tokenValid = await tokenModel.findOne({
            generatedToken: seller.token
        })
        if(_.isEmpty(tokenValid)){
          return reject(errorResponse(400, Message.token_invalid))
        }
        const nameExisted = await sellerModel.findOne({
          "info.name":seller.name
        }).lean()
        if(!_.isEmpty(nameExisted)){
          return reject(errorResponse(400, Message.name_existed))
        }
        
        [err, data] = await handlerRequest(
          new sellerModel({
            userId:tokenValid.user,
            info:{
              name: seller.name,
              phone: seller.phone,
            },
            slogan: seller.slogan,
            logo:seller.logo,
            proof:seller.proof
          }).save()
        )
        if(err){
          console.log(err)
          return reject(errorResponse(500, createError.InternalServerError().message))
        }
        await userModel.findOneAndUpdate({
          _id: tokenValid.user,
        }, {
          $set:{
            "seller":data._id,
            "role":"seller"
          }
        })
        tokenValid.remove()
        return resolve({
          data:{
            message: data.info.name + Message.seller_create_success
          }
        })
      } catch (error) {
        console.log(error)
        return reject(errorResponse(400, error))
      }
    })
  }
  ,
  loginAdmin: ({email, password}) => {
    return new Promise(async (resolve, reject) => {
      const checkExist = await adminModel.find({email})
      console.log(checkExist)
      
    })
  },
  activeAccount: (token) => {
    return new Promise(async (resolve, reject) => {
        try {
          const existed = await tokenModel.findOne({generatedToken: token})
          if(_.isEmpty(existed)){
            return reject(errorResponse(400, Message.verify_token_not_match))
          }
          await userModel.findOneAndUpdate(
            { $and:[
              {_id: existed.user},
              {"local.verified": {$ne: true}}
            ] },
            {"local.verified": true}
          )
          existed.remove()
          return resolve({
            data:{
              message:Message.active_success
            }
          })
        } catch (error) {
          console.log(error)
          return reject(errorResponse(400, Message.server_wrong))
        }
    })
  },
  getGoogleOAuthTokens: (code) => {
    return new Promise(async (resolve, reject) => {
      const url = process.env.GOOGLE_OAUTH_TOKEN
      const values = {
        code,
        client_id:process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri:process.env.GOOGLE_OAUTH_REDIRECT_URL,
        grant_type:'authorization_code'
      }
      try {
        const {data} = await axios.post(url, qs.stringify(values),
        {
          headers:{
            'Content-Type':'application/x-www-form-urlencoded'
          }
        })
        return resolve(data)
      } catch (error) {
        console.log(error.response.data.error)
        return reject(errorResponse(400, error.response.data.error))
      }
    })
  },
  getGoogleUser: (id_token, access_token) => {
    return new Promise(async (resolve, reject) => {
      try {
        const {data} = await axios.get(
          `https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=${access_token}`,
        {
          headers:{
            Authorization: `Bearer ${id_token}`
          }
        })
        return resolve(data)
      } catch (error) {
        console.log(error.response.data.error)
        return reject(errorResponse(400, error.response.data.error))
      }
    })
  },
  googleLogin: (googleUser) => {
    return new Promise(async (resolve, reject) => {
      try {
        if(!googleUser.verified_email){
          return reject({
            status: 203,
            "errors":{
              message:Message.account_inactive
            }
          })
        }
        const accountExisted = await userModel.findOne({
          $or:[
            {"google.uid":googleUser.id},
            {"local.email":googleUser.email}
          ]
        })

        //account not exists
        if(_.isEmpty(accountExisted)){
          const createUser = new userModel({
            google:{
              uid:googleUser.id,
              email:googleUser.email,
              picture:googleUser.picture,
              name:googleUser.name
            }
          })
          const created = await createUser.save()
          const payload = {
            _id: created._id,
            email:created.google.email,
            name:created.google.name,
            profilePicture:created.google.picture,
            role:created.role,
            meta:created.meta,
            special:created.special,
            typeLogin:"google"
          }
          try {
            const access_token = await jwtService.signAccessToken(payload)
            const refresh_token = await jwtService.signRefreshToken(payload)
            return resolve({
              data: payload,
              access_token,
              refresh_token
            })  
          } catch (error) {
            console.log(error)
            return reject(errorResponse(400, createError.InternalServerError().message))
          }
        }
        
        //account is existed
        if(accountExisted.status === "blocked"){
          return reject(errorResponse(401, Message.account_locked))
        }
        const updatedAccount = await userModel.findOneAndUpdate({
          $or:[
            {"google.uid":googleUser.id},
            {"local.email":googleUser.email}
          ]
        },{
          $set:{
            "google.uid":googleUser.id,
            "google.email":googleUser.email,
            "google.picture":googleUser.picture,
            "google.name":googleUser.name
          }
        },
        {
          upsert: true,
          new: true,
        })
          
        if(updatedAccount.role === "user"){
          const payload = {
            _id: updatedAccount._id,
            email:googleUser.email,
            name: googleUser.name,
            profilePicture: googleUser.picture,
            role: updatedAccount.role,
            meta:updatedAccount.meta,
            special:updatedAccount.special,
            typeLogin:"google"
          }
          try {
            const access_token = await jwtService.signAccessToken(payload)
            const refresh_token = await jwtService.signRefreshToken(payload)
            return resolve({
              data: payload,
              access_token,
              refresh_token
            })  
          } catch (error) {
            console.log(error)
            return reject(errorResponse(400, createError.InternalServerError().message))
          }
          
        }
        const payload = {
          _id: updatedAccount._id,
          email:googleUser.email,
          name: googleUser.name,
          profilePicture: googleUser.picture,
          role: updatedAccount.role,
          meta:updatedAccount.meta,
          seller:updatedAccount.seller,
          special:updatedAccount.special,
          typeLogin:"google"
        }
        const access_token = await jwtService.signAccessToken(payload)
        const refresh_token = await jwtService.signRefreshToken(payload)
        return resolve({
          data: payload,
          access_token,
          refresh_token
        })
      } catch (error) {
        console.log(error)
        return reject(errorResponse(400, createError.InternalServerError().message))
      }
    })
  },
  sendEmailResetPassword: (email, page) => {
    return new Promise(async (resolve, reject) => {
      try {
        const getUser = await userModel.findOne({
          "local.email":email
        }).lean()
        if(_.isEmpty(getUser)){
          return reject({
            status: 400,
            "errors":{
              message:Message.email_not_exists
            }
          })
        }
        if(!getUser.local.verified) {
          return reject(errorResponse(400, Message.account_inactive))
        }
        const otp = generateOtp(6);
        console.log(otp)
        (await otpModel.find({user: getUser._id})).map((value) => value.remove())
        await new otpModel({
          user: getUser._id,
          generatedOtp: otp
        }).save()
        redis.publish('send_otp_reset_password',JSON.stringify({
          email: email,
          otp:otp,
          name: getUser.info.firstName + getUser.info.lastName
        }))
        return resolve({
          data:{
            message:Message.send_mail_reset_success
          },
          userId: getUser._id
        })
      } catch (error) {
        console.log(error)
        return reject(errorResponse(500, createError.InternalServerError().message))
      }
    })
  },
  OTPCode: (userId,otp) => {
    return new Promise(async (resolve, reject) => {
      try {
        const existed = await otpModel.findOne({
          user: userId
        })
        if(_.isEmpty(existed)){
          return reject(errorResponse(400, Message.otp_expired))
        }
        const valid = await existed.isCheckOtp(otp)
        if(!valid) return reject(errorResponse(400, Message.otp_invalid))
        const verifyToken = uuidv4()
        const createToken = await new tokenModel({
          user: userId,
          generatedToken: verifyToken
        }).save()
        existed.remove()
        return resolve({
          data:{
            token:createToken.generatedToken
          },
          userId: userId
        })
      } catch (error) {
        console.log(error)
        return reject(errorResponse(500, createError.InternalServerError().message))   
      }
    })
  },
  resetPassword: (userId,token, password) => {
    return new Promise(async (resolve, reject) => {
      try {
        const existed = await tokenModel.findOne({
          $and: [
            {user: userId},
            {generatedToken: token}
          ]
        })
        if(_.isEmpty(existed)){
          return reject(errorResponse(400, Message.token_invalid))
        }
        const salt = await bcrypt.genSalt(10)
        const hashPassword = await bcrypt.hash(password, salt)
        await userModel.updateOne({
          _id: userId
        },{
          $set:{
            "local.password":hashPassword
          }
        })
        existed.remove()
        return resolve({
          data:{
            message:Message.reset_password_success
          }
        })
      } catch (error) {
        console.log(error)
        return reject(errorResponse(500, createError.InternalServerError().message))
      }
    })
  },
  OTPCodeMobile: (userId,otp) => {
    return new Promise(async (resolve, reject) => {
      try {
        const existed = await otpModel.findOne({
          user: userId
        })
        
        if(_.isEmpty(existed)){
          return reject(errorResponse(400, Message.otp_expired))
        }
        console.log(otp)
        const valid = await existed.isCheckOtp(otp)
        console.log(valid)
        if(!valid) return reject(errorResponse(400, Message.otp_invalid))
        const activated = await userModel.updateOne({
          _id: userId          
        }, {
          $set:{
            "local.verified": true
          }
        },{
          new: true
        })
        if(_.isEmpty(activated)){
          return reject(errorResponse(500, createError.InternalServerError().message))
        }
        existed.remove()
        return resolve({
          data:{
            message:Message.active_success
          }
        })
      } catch (error) {
        console.log(error)
        return reject(errorResponse(500, createError.InternalServerError().message))   
      }
    })
  },
  registerSendOTPAgain: (userId) => {
    return new Promise(async (resolve, reject) => {
      try {
        const user = await userModel.findOne({_id: userId}).lean()
        if(_.isEmpty(user)) return reject(errorResponse(404, createError.NotFound().message))
        const otp = await otpModel.findOne({user: userId})
        const genOtp = generateOtp(6);
        await  new otpModel({
          user: userId,
          generatedOtp: genOtp
        }).save()
        redis.publish('send_otp_reset_password',JSON.stringify({
          email: user.local.email,
          otp:genOtp,
          name: user.info.firstName + user.info.lastName
        }))
        if(!_.isEmpty(otp)){
          otp.remove()
        }
        return resolve({
          data: {
            message: Message.send_otp_register_again
          }
        })
      } catch (error) {
        console.log(error)
        return reject(errorResponse(500, createError.InternalServerError().message))
      }
    })
  }
}