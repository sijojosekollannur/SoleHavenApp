const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const couponSchema = new Schema({
    code: {
        type: String,
        required: true,
        unique: true
    },
    discountPercentage: {
        type: Number,
        required: true,
        min: 0,
        max: 100
    },
    validFrom: {
        type: Date,
        required: true
    },
    validUntil: {
        type: Date,
        required: true
    },
    usageLimit: {
        type: Number,
        default: 1
    },
    usedCount: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ['active', 'expired', 'used'],
        default: 'active'
    }
});

// Middleware to check coupon status before saving the document
couponSchema.pre('save', function (next) {
    const now = new Date();
    if (this.validUntil < now) {
        this.status = 'expired';
    } else if (this.usageLimit <= this.usedCount) {
        this.status = 'used';
    } else {
        this.status = 'active';
    }
    next();
});

const Coupon = mongoose.model('Coupon', couponSchema);
module.exports = Coupon;
