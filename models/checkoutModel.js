const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CartItemSchema = new Schema({
    productId: {
        type: Schema.Types.ObjectId,
        ref: 'Product',
        required: false
    },
    productImages: {
        type: [String],
        required: false
    },
    brandName: {
        type: String,
        required: false
    },
    productName: {
        type: String,
        required: false
    },
    quantity: {
        type: Number,
        required: false
    },
    price: {
        type: Number,
        required: false
    },
    selectedColor: {
        type: String,
        required: false
    },
    selectedSize: {
        type: String,
        required: false
    }
});

const CheckoutSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    cartItems: [CartItemSchema],
    subtotal: {
        type: Number,
        required: true
    },
    tax: {
        type: Number,
        required: true
    },
    total: {
        type: Number,
        required: true
    },
    appliedCouponAmount : {
        type: Number,
        default: 0
    },
    coupon: {
        type: Schema.Types.ObjectId,
        ref: 'Coupon',
        required: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Checkout = mongoose.model('Checkout', CheckoutSchema);

module.exports = Checkout;
