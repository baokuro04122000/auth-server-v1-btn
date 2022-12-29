const mongoose = require("mongoose");
const permissionReviewSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "products",
    },
    list: [
      { user: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: "users",
        createdAt: {
          type: Date,
          default: Date.now()
        }
      }
      }
    ]
  },
  {timestamps: true }
);

module.exports = mongoose.model("permission", permissionReviewSchema);