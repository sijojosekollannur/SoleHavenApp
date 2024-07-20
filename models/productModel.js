const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema({
    discount: {
        type: Number,
        required: true,
        min: 0,
        max: 100
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        required: true
    }
}, { _id: false });

const productSchema = new mongoose.Schema({
    productImages: {
        type: [String],
        required: true
    },
    brandName: {
        type: String,
        required: true,
        maxlength: 100
    },
    productName: {
        type: String,
        required: true,
        maxlength: 100
    },
    productCategory: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    isDeleted: {
        type: Boolean,
        default: false
    },
    price: {
        type: Number,
        required: true,
        min: 0,
        max: 100000
    },
    discountPrice: {
        type: Number,
        default: 0,
    },
    isFeatured: {
        type: Boolean,
        default: false, 
    },
    sizeInch: {
        type: [Number],
        required: true
    },
    color: {
        type: [String],
        required: true
    },
    stock: {
        type: Number,
        required: true,
        min: 0
    },
    starRating: {
        type: Number,
        required: true,
        min: 0.5,
        max: 5
    },
    highlights: {
        type: [String],
        required: false
    },
    specifications: {
        type: Object,
        required: false
    },
    reviews: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Review'
    }],
    offers: [offerSchema]
}, { timestamps: true });

// Add text index on brandName, productName, and highlights
productSchema.index({ brandName: 'text', productName: 'text', highlights: 'text' });

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
