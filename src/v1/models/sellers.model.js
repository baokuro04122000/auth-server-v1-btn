const {Schema, model} = require('mongoose')
const sellerSchema = new Schema({
    sellerId:{type:Schema.Types.ObjectId},
    info:{
      name:{
        type: String,
        required:  true,
        unique:true,
        index: true
      },
      phone:{
        type: String,
        min:9,
        max:11
      },
      address:[
        {location: {type: String, min:5, max:150}}
      ]
    },
    logo: {
      link: {type: String, },
      fileId:{type: String, default: null}
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
    proof:[
      {
        link:{type: String},
        fileId:{type: String}
      }
    ],
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
        type:String
      }
    },
    socialLinks:{
      facebook:{type: String,min:10, max:150},
      instagram:{type: String, min:10, max:150},
      youtube:{type:String, min:10, max:150},
      linkedin:{type:String, min:10, max:150}
    },
    specs:{type:Array, default:[]},
    isDisabled: false
}
,{
  collection: 'sellers',
  timestamps:true
})


module.exports = model('sellers', sellerSchema)