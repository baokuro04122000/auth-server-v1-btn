const {Schema, model} = require('mongoose')

const discussSchema  = new Schema({
  discuss_id: Number,
  page: Number,
  count: Number,
  posted: Date,
  text: String,
  file: Array,
  score: Number,
  meta:Object,
  comment_likes:Array
},{
  collection: 'comments',
  timestamps: true
})

const commentBucketSchema = new Schema({
  discuss_id,
  page: Number,
  count: Number,
  comments: [discussSchema]
},{
  collection: 'commentBucket'
})



module.exports.DISCUSS = model('comments', discussSchema)
module.exports.COMBUCK = model('commentBucket', commentBucketSchema)