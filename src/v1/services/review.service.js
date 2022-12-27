'use strict'
const {
  DISCUSS,
  COMBUCK
} = require('../models/review.model')

class CommentService {

  // Bucket service

  static putCommentBucket = async({
    discuss_id = 0,
    page = 1,
    isDEL = 'NO',
    comment = {},
    limit = 5
  }) => {
    try {
      if(isDEL === "YES"){
        await COMBUCK.deleteMany()
        await DISCUSS.deleteMany()
      } 

      //1. put a comment to collection
      const comment = await COMBUCK.updateOne({
        discuss_id,
        page,
        count: {$lt: limit}
      })
    } catch (error) {
      
    }
  }

  static listCommentBucket = async () => {
    try {
      
    } catch (error) {
      
    }
  }

  //end

}

module.exports = CommentService