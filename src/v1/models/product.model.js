const { Schema, model } = require('mongoose')

const productSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
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
      required: true,
      trim: true
  },
  productPictures: [
    {type: string}
  ],
  
  release_date: Date,
  specs:{ type: Array, default: []}
}, {
  collection: 'products',
  timestamps: true
})

module.exports = model('products', productSchema)