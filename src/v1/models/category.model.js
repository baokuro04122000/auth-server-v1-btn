const mongoose = require("mongoose");
const categorySchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        slug: {
            type: String,
            required: true,
            unique: true,
            index:true
        },
        categoryImage: {
            type: String
        },
        isDisabled: false
    },
    { 
      collection:"categories",
      timestamps: true
     }
);

module.exports = mongoose.model("categories", categorySchema);