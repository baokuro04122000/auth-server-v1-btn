const {Schema, model} = require('mongoose')
const sellerSchema = new Schema({  
    name:{
      type: String,
      required:  true,
      unique:true,
      index: true
    },
    logo: {
      type: String, 
      required: true
    },
    slogan:{
      type:String
    }
    ,
    type: {
      type:String, 
      enum:["normal", "mall","global"], 
      default: "normal"
    },
    proof:{
      type: Array, 
      required: true, 
      default:[]
    },
    meta: {
      totalSold:{
        type: Number, 
        default: 0
      },
      totalProduct: {
        type: Number,  
        default: 0
      },
      totalEvaluation: {
        type: Number,  
        default: 0
      },
      ranking: {
        type: Number, 
        default: 0
      },
      title: {
        type:String, 
        required: false
      }
    },
    isDisabled: false
}
,{
  collection: 'sellers',
  timestamps:true
})


module.exports = model('Sellers', sellerSchema)