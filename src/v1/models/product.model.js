const { Schema, model } = require('mongoose')


const productSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  sellerId:{
    type: Schema.Types.ObjectId,
    ref:'sellers',
    require:true
  },
  category:{
    type: Schema.Types.ObjectId,
    ref: 'categories',
    require:true
  },
  quantity:{
    type:Number,
    default:0
  },
  slug: {
    type: String,
    required: true,
    unique: true
  },
  price: {
    type: Number,
    required: true
  },
  discountPercent: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
      required: true
  },
  description: {
      type: String,
      default:''
  },
  summary:{
    type: String,
    default:'hello'
  },
  type:{type: String, default:'book'},
  productPictures: [
    {
      fileId:{type: String},
      fileLink:{type: String}
    }
  ],
  release_date: Date,
  meta:{
    totalSold: {type: Number, default: 0},
    totalOrder: {type: Number, default: 0},
    totalReview: {type: Number, default: 0}
  },
  specs:{
    type: Array,
    default: []
  }
}, {
  collection: 'products',
  timestamps: true
})

productSchema.index({"specs.k":1,"specs.v":1, name:'text', summary: "text" })

module.exports = model('products', productSchema)