const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Profile schema definition
const profileSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    username: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    firstName: {
        type: String
    },
    lastName: {
        type: String
    },
    dateOfBirth: {
        type: Date
    },
    gender: {
        type: String
    },
    phoneNumber: {
        type: String
    },
    addresses: [{
        type: Schema.Types.ObjectId,
        ref: 'Address'
    }],
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Middleware to update updatedAt field
profileSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

const Profile = mongoose.model('Profile', profileSchema);
module.exports = Profile;
