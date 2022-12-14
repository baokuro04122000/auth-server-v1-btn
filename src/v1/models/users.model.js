const mongoose = require('mongoose')
const bcrypt = require('bcrypt')
const userSchema = new mongoose.Schema({
  contact:{
    address: {type: String, min:3, max:50},
    phone:{type:String,default:null, min:10, max:11}
  },
  local: {
    email:{
      type: String, 
      unique: true,
      trim:true,
      lowercase: true,
      index:true
    },
    verified: {type: Boolean, default: false},
    password:{type: String},
  },
  google:{
    uid:{type: String},
    name:{type:String},
    email:{type: String, trim:true, unique:true, index: true},
    picture:{type:String}
  },
  info:{
    firstName:{type: String, min:2, max:30, required:true},
    lastName:{type:String, min:2, max:30, required:true},
    nickName:{type:String, min:2, max:50, default:''},
    gender:{
      type:String,
      min:3,
      max:15,
      enum: ['nam','nu','male','female','other'],
      default:'male'
    },
    birthDay:{type:String, min:6, max:8},
    language:{type:String, default:'en'},
    avatar:{type:String}
  },
  status: {
    type: String, 
    enum: ['normal','blocked'], 
    default: "normal"
  },
  role:{
    type: String, 
    enum:["user","seller","shipper"], 
    default: "user"
  },
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'sellers'
  },
  meta: {
    totalBuy:{
      type: Number, 
      default: 0
    },
    totalCancel: {
      type: Number, 
      default: 0
    },
  },
  specs:{
    type: Array,  
    default: []
  }
},{
  collection: 'users',
  timestamps:true
})

userSchema.pre('save', async function(next){
  try {
    if(this.local.password){
      const salt = await bcrypt.genSalt(10)
      const hashPassword = await bcrypt.hash(this.local.password, salt)
      this.local.password = hashPassword
    }
    next()
  } catch (error) {
    next(error)
  }
})

userSchema.methods.isCheckPassword = async function(password){
  try {
    return await bcrypt.compare(password, this.local.password)
  } catch (error) {
    console.log(error)
  }
}

userSchema.methods.hashPassword = async (password) => {
  try {
    if(password){
      const salt = await bcrypt.genSalt(10)
      const hashPassword = await bcrypt.hash(password, salt)
      return Promise.resolve(hashPassword)
    }
  } catch (error) {
    return Promise.reject({
      status: 500,
      errors:{
        message:"Internal Server Error"
      }
    })
  }
}

module.exports = mongoose.model('users', userSchema)