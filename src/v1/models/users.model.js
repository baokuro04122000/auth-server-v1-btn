const mongoose = require('mongoose')
const bcrypt = require('bcrypt')
const userSchema = new mongoose.Schema({
  gender:{type:String,default:"male"},
  phone:{type:String,default:null},
  address:{type:String,default:null},
  local: {
    email:{
      type: String, 
      unique: true,
      trim:true,
      lowercase: true,
      index:true
    },
    verifyToken:{type: String, expires:Number(process.env.VERIFY_TOKEN_EMAIL_EXPIRED), index:true},
    verified: {type: Boolean, default: false},
    verifyCode:{type:Number, expires:Number(process.env.VERIFY_CODE_FORGOT_PASSWORD_EXPIRED), index: true},
    password:{type: String},
  },
  google:{
    uid:{type: String, index: true},
    name:{type:String},
    email:{type: String, trim:true, unique:true, index:true},
    picture:{type:String}
  },
  name:{
    type: String
  },
  profilePicture: {
    type: String
  },
  status: {
    type: String, 
    enum: ['normal','blocked'], 
    default: "normal"
  },
  role:{
    type: String, 
    enum:["user","seller"], 
    default: "user"
  },
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Seller'
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
  special:{
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

module.exports = mongoose.model('Users', userSchema)