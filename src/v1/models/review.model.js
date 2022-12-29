const {Schema, model} = require('mongoose')

const commentSchema  = new Schema({
  user:{
    type: Schema.Types.ObjectId,
    ref: "users"
  },
  discuss_id:Number,
  page: Number,
  count: {
    type: Number,
    default: 1
  },
  posted: {
    type: Date,
    default: Date.now()
  },
  text: String,
  file: {
    type: Array,
    default: []
  },
  score: {
    type: Number,
    default: 1
  },
  rating: {
    type: Number,
    default: 0
  },
  meta:Object,
  comment_likes:{
    type: Array,
    default: []
  },
  comment_disLikes: {
    type: Array,
    default: []
  }
})

const commentBucketSchema = new Schema({
  product:{
    type: Schema.Types.ObjectId,
    ref:"products"
  },
  page: Number,
  count: Number,
  comments: [commentSchema]
},{
  collection: 'commentBucket'
})

const discussShema = new Schema({
  product:{
    type: Schema.Types.ObjectId,
    ref:"products"
  },
  page: Number,
  count: Number,
})


module.exports.DISCUSS = model('comments', discussShema)
module.exports.COMBUCK = model('commentBucket', commentBucketSchema)