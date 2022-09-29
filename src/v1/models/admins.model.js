const {Schema, model} = require('mongoose')

const adminSchema = new Schema({
  email:{type: String, required: true},
  password: {type: String, required: true},
  role:{type:String, required: true}

},{
  collection: 'admins',
  timestamps:true
})

module.exports = model('Admins', adminSchema)