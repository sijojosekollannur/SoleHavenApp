// models/Order.js
const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    productImages: {
        type: [String],
        required: false
    },
    productName: {
        type: String,
        required: false
    },
    brandName: {
        type: String,
        required: false
    },
    color: {
        type: String,
        required: false
    },
    size: {
        type: String,
        required: false
    },
    quantity: {
        type: Number,
        required: true
    },
    price: {
        type: Number,
        required: true
    }
});

const orderSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false
    },
    checkoutId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Checkout',
        required: false
    },
    address: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Address',
        required: false
    },
    products: [productSchema],
    paymentMethod: {
        type: String,
        enum: ['Cash On Delivery','PayPal','Wallet'],
        default: 'Cash on Delivery'
    },
    paymentId: {
        type: String, 
        required: false 
    },
    paymentToken: {
        type: String,
        required: false
    },
    payerId: {
        type: String,
        required: false
    },
    subtotal: {
        type: Number,
        required:false
    },
    tax: {
        type: Number,
        required:false
    },
    totalAmount: {
        type: Number,
        required: true
    },
    orderStatus: {
        type: String,
        enum: ['Pending', 'Processing', 'Shipped', 'Delivered','Cancelled','Returned'],
        default: 'Pending'
    },
    orderDate: {
        type: Date,
        default: Date.now
    },
    appliedCouponAmount: {
        type: Number,
        default: 0
    },
    coupon: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Coupon',
        required: false
    },
    status: {
        type: String,
        enum: ['Paid', 'Unpaid','Pending'],
        default: 'Unpaid'
    }
});

const Order= mongoose.model('Order', orderSchema);
module.exports = Order;
