const mongoose = require("mongoose");
const tokenSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "users",
    },
    generatedToken: {
      type: String,
      required: true,
      trim: true,
    },
    expireAt: {
      type: Date,
      default: Date.now,
      expires: '1d'  // set expire time is 24h
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("token", tokenSchema);