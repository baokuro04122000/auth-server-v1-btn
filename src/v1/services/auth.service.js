const Message = require('../lang/en')
const userModel = require('../models/users.model')
const adminModel = require('../models/admins.model')
const utils = require('../utils')
const _ = require('lodash')
const redis = require('../databases/init.redis')
const createError = require('http-errors')
const jwtService = require('./jwt.service')
const qs = require('qs')
const axios = require('axios')
const { v4: uuidv4 } = require('uuid');
var that = module.exports = {
  userRegister: (user) => {
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
      const createUser = new userModel({
        local:{
          email:user.email,
          password:user.password,
          verifyToken: uuidv4()
        },
        name:user.name,
        gender:user.gender
      })
      const [err, data] = await utils.handlerRequest(createUser.save())
      if(err){
        console.log(err)
        return reject({
          status:500,
          "errors":{
            message: createError[500]
          }
        })
      }
      redis.publish('send_mail',JSON.stringify({
        email: data.local.email,
        _id:data._id,
        verifyToken:data.local.verifyToken,
        name: data.name
      }))
      return resolve({
        status:200,
        data:{
          message: Message.register_success
        }
      })
    })
  },
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
          return reject({
            status:401,
            "errors": {
              "field": null,
              "message": Message.login_wrong
            }
          })
        }
        
        if(!account.local.verified){
          return reject({
            status: 401,
            "errors": {
              "field": null,
              "message": Message.account_inactive
            }
          })
        }
        if(account.status === "blocked"){
          return reject({
            status: 401,
            "errors": {
              "field": null,
              "message":Message.account_locked
            }
          })
        }
        
        if(account.role === "user"){
          const payload = {
            _id: account._id,
            email:account.local.email,
            name: account.name,
            profilePicture: account.profilePicture,
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
            return reject({
              status: 400,
              "errors":{
                message:error
              }
            })
          }
          
        }
        const payload = {
          _id: account._id,
          email:account.local.email,
          name: account.name,
          profilePicture: account.profilePicture,
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
        return reject({
          status:400,
          "errors":{
            message: createError.InternalServerError()
          }
        })
      }
    })
  },
  sellerRegister:() => {
    return new Promise(async (resolve, reject) => {

    })
  },
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
            return reject({
              status:400,
              "errors":{
                message:Message.verify_token_not_match
              }
            })
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
          return reject({
            status: 400,
            "errors":{
              message: Message.server_wrong
            }
          })
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
        return reject({
          status:400,
          "errors":{
            message:error.response.data.error
          }
        })
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
        return reject({
          status:400,
          "errors":{
            "message":error.response.data.error
          }
        })
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
            return reject({
              status: 400,
              "errors":{
                message:error
              }
            })
          }
        }
        
        //account is existed
        if(accountExisted.status === "blocked"){
          return reject({
            status: 201,
            "errors": {
              "field": null,
              "message":Message.account_locked
            }
          })
        }
        const updatedAccount = await userModel.findOneAndUpdate({
          $or:[
            {"google.uid":googleUser.id},
            {"local.email":googleUser.email}
          ]
        },{
          google:{
            uid:googleUser.id,
            email:googleUser.email,
            picture:googleUser.picture,
            name:googleUser.name
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
            return reject({
              status: 400,
              "errors":{
                message:error
              }
            })
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
        return reject({
          status:400,
          "errors":{
            message:error
          }
        })
      }
    })
  }
}