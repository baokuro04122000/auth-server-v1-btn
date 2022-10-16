const Message = require('../lang/en')
const userModel = require('../models/users.model')
const sellerModel = require('../models/sellers.model')
const adminModel = require('../models/admins.model')
const {
  handlerRequest,
  errorResponse
} = require('../utils')
const bcrypt = require('bcrypt')
const _ = require('lodash')
const redis = require('../databases/init.redis')
const createError = require('http-errors')
const jwtService = require('./jwt.service')
const qs = require('qs')
const axios = require('axios')
const { v4: uuidv4 } = require('uuid');
const otpGenerator = require('otp-generators')
const { token } = require('morgan')

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
        return reject({
          status:400,
          "errors":{
            "field":"email",
            "message":Message.email_existed
          }
        })
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
          return reject(errorResponse(500, createError[500]))
        }
        redis.publish('send_mail',JSON.stringify({
          email: data.local.email,
          _id:data._id,
          verifyToken:data.local.verifyToken,
          name: data.info.firstName + data.info.lastName
        }))
        return resolve({
          status:200,
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
        status:200,
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
      const otp = otpGenerator.generate(6,
        { alphabets: false, upperCase: false, specialChar: false })
      const salt = await bcrypt.genSalt(10)
      const hashPassword = await bcrypt.hash(user.password, salt)
      let err, data
        [err, data] = await handlerRequest(userModel.findOneAndUpdate(
        {"google.email":user.email},
        {$set:{
            "local.email":user.email,
            "local.password":hashPassword,
            "local.verifyCode":Number(otp),
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
              verifyCode: Number(otp)
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
          return reject(errorResponse(500, createError[500]))
        }
        
        redis.publish('send_otp_register_mobile',JSON.stringify({
          email: user.email,
          otp:otp,
          name:user.firstName + user.lastName
        }))
        return resolve({
          data:{
            message: Message.register_success
          }
        })
      }
      redis.publish('send_otp_register_mobile',JSON.stringify({
        email: email,
        otp:otp,
        name:user.firstName + user.lastName
      }))
      return resolve({
        data:{
          message: Message.register_success
        }
      })
      
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
          return reject({
            status: 401,
            "errors": {
              "field": null,
              "message": Message.login_wrong
            }
          })
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
            special:account.special,
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
            return reject(errorResponse(401, error))
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
          special:account.special,
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
        return reject(errorResponse(500, createError.InternalServerError()))
      }
    })
  },
  sellerRegisterRequest:(userId) => {
    return new Promise(async (resolve, reject) => {
      try {
        const token = uuidv4();
        const user = await userModel.findOneAndUpdate({
          "_id":userId
        }, {
          "verifyCodeSeller":token
        })
        if(_.isEmpty(user)){
          return reject(errorResponse(404, Message.user_not_found))
        }
        console.log(user.verifyCodeSeller)
        redis.publish('send_mail',JSON.stringify({
          email: user.local.email,
          _id:user._id,
          verifyToken:token,
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
        return reject(errorResponse(500, createError.InternalServerError()))
      }
    })
  },
  checkSellerRegisterRequest: (token) => {
    return new Promise(async (resolve, reject) => {
      try {
        const isExisted = await userModel.findOne({
          "verifyCodeSeller":token
        })
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
        const tokenValid = await userModel.findOne({
          "verifyCodeSeller":seller.token
        })
        if(_.isEmpty(tokenValid)){
          return reject(errorResponse(400, Message.token_invalid))
        }
        const nameExisted = await sellerModel.findOne({
          "info.name":seller.name
        })
        if(!_.isEmpty(nameExisted)){
          return reject(errorResponse(400, Message.name_existed))
        }
        
        [err, data] = await handlerRequest(
          new sellerModel({
            userId:tokenValid._id,
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
          return reject(errorResponse(500, createError.InternalServerError()))
        }
        await userModel.findOneAndUpdate({
          "verifyCodeSeller": seller.token,
        }, {
          $set:{
            "verifyCodeSeller":null,
            "seller":data._id,
            "role":"seller"
          }
        })
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
          const existed = await userModel.findOne({"local.verifyToken": token})
          if(_.isEmpty(existed)){
            return reject(errorResponse(400, Message.verify_token_not_match))
          }
          await userModel.findOneAndUpdate(
            { "local.verifyToken": token },
            {"local.verified": true, "local.verifyToken": null}
          )
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
            return reject(errorResponse(400, error))
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
            return reject(errorResponse(400, error))
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
        return reject(errorResponse(400, error))
      }
    })
  },
  sendEmailResetPassword: (email, page) => {
    return new Promise(async (resolve, reject) => {
      try {
        const getUser = await userModel.findOne({
          "local.email":email
        })
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
        if(page === 'user'){
          if(!(getUser.role === 'user')) {
            return reject(errorResponse(400, Message.page_unauthorized))
          }
          const otp = otpGenerator.generate(6, { 
            upperCaseAlphabets: false, 
            specialChars: false,
            upperCaseAlphabets:false 
          })
          await userModel.updateOne({
            "local.email":email
          },{
            $set:{
              "local.verifyCode": Number(otp)
            }
          })
          return resolve({
            data:{
              message:Message.send_mail_reset_success
            }
          })
        }
        //seller
        const otp = otpGenerator.generate(6,
        { alphabets: false, upperCase: false, specialChar: false })
        const updated = await userModel.updateOne({
          "local.email":email
        },{
          $set:{
            "local.verifyCode": Number(otp)
          }
        })
        redis.publish('send_otp_reset_password',JSON.stringify({
          email: email,
          otp:otp,
          name: getUser.info.firstName + getUser.info.lastName
        }))
        return resolve({
          data:{
            message:Message.send_mail_reset_success
          }
        })
      } catch (error) {
        console.log(error)
        return reject(errorResponse(500, error))
      }
    })
  },
  OTPCode: (otp) => {
    return new Promise(async (resolve, reject) => {
      try {
        const existed = await userModel.findOne({
          "local.verifyCode":otp
        })
        if(_.isEmpty(existed)){
          return reject(errorResponse(400, Message.otp_invalid))
        }
        const verifyToken = uuidv4()
        await userModel.updateOne({
          "local.verifyCode":otp
        },{
          $set:{
            "local.verifyCode":null,
            "local.verifyToken": verifyToken
          }
        })
        return resolve({
          data:{
            token:verifyToken
          }
        })
      } catch (error) {
        console.log(error)
        return reject(errorResponse(500, error))   
      }
    })
  },
  resetPassword: (token, password) => {
    return new Promise(async (resolve, reject) => {
      try {
        const existed = await userModel.findOne({
          "local.verifyToken": token
        })
        if(_.isEmpty(existed)){
          return reject(errorResponse(400, Message.token_invalid))
        }
        const salt = await bcrypt.genSalt(10)
        const hashPassword = await bcrypt.hash(password, salt)
        await userModel.updateOne({
          "local.verifyToken":token
        },{
          $set:{
            "local.verifyToken": null,
            "local.password":hashPassword
          }
        })
        return resolve({
          data:{
            message:Message.reset_password_success
          }
        })
      } catch (error) {
        console.log(error)
        return reject(errorResponse(500, error))
      }
    })
  },
  OTPCodeMobile: (email,otp) => {
    return new Promise(async (resolve, reject) => {
      try {
        const existed = await userModel.findOneAndUpdate({
          $and:[
            {"local.verifyCode":otp},
            {"local.email":email}
          ]
        },{
          $set:{
            "local.verified":true,
            "local.verifyCode":null
          }
        })
        if(_.isEmpty(existed)){
          return reject(errorResponse(400, Message.otp_invalid))
        }
        // temporary...
        return resolve({
          data:{
            message:Message.active_success
          }
        })
      } catch (error) {
        console.log(error)
        return reject(errorResponse(500, error))   
      }
    })
  }
}