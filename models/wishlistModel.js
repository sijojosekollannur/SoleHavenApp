// models/wishlistModel.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Define the schema for a wishlist item
const wishlistItemSchema = new Schema({
    product: {
        type: Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    dateAdded: {
        type: Date,
        default: Date.now
    }
});

// Define the schema for the wishlist
const wishlistSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    items: [wishlistItemSchema]
});

// Create the model from the schema
const Wishlist = mongoose.model('Wishlist', wishlistSchema);

module.exports = Wishlist;
