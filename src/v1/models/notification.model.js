const mongoose = require("mongoose");


const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "users",
    },
    content:{
      type: String
    },
    image:{
      type: String
    },
    title:{
      type: String
    },
    status: {
      type: Boolean,
      default:false
    },
    type:{
      type: Object,
      required: true
    },
    specs:{
      type: Array,
      default: []
    }
  },
  { 
    timestamps: true,
    collection: 'notifications'
  }
);



module.exports = mongoose.model("notifications", notificationSchema);