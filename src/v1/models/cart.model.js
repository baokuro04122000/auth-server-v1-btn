const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: "users",
    },
    cartItems: [{
        product: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: "products",
        },
        variant:{
            type: mongoose.Schema.Types.ObjectId,
            required: false,
            ref: "variants"
        },
        wishlist:{type: Boolean, default: false},
        quantity: { type: Number, default: 1, min:1 },
        modifiedOn: {type: Date, default: Date.now()}
    }]
}, { timestamps: true });


module.exports = mongoose.model('Cart', cartSchema);