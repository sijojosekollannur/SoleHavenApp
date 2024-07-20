const mongoose = require('mongoose');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

// Define the ReferralOffer schema
const referralOfferSchema = new mongoose.Schema({
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

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  facebookId: {
    type: String,
    required:false,
  },
  googleId: {
    type: String,
    required:false,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },
  password: {
    type: String,
    required: function () {
      return this.email && !this.googleId && !this.facebookId;
    },
  },
  mobilenumber: {
    type: String,
    required: false,
  },
  addresses: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Address',
    },
  ],
  is_blocked: {
    type: Boolean,
    default: false,
  },
  is_verified: {
    type: Boolean,
    default: false,
  },
  is_admin: {
    type: Boolean,
    required: true,
    default: false,
  },
  wallet: {
    type: Number,
    required: false,
    default: 0
  },
  token: {
    type: String,
    default: '',
  },
  referralCode: {
    type: String,
    unique: true,
    sparse: true
  },
  referredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  referralCount: {
    type: Number,
    default: 0,
  },
  referralOffers: [referralOfferSchema]
});

// Generate a unique referral code for each user before saving
userSchema.pre('save', function(next) {
  if (!this.referralCode) {
    this.referralCode = uuidv4() ;
  }
  next();
});

userSchema.statics.findOrCreateWithEmail = async function ({ email, name, password }) {
  try {
    let user = await this.findOne({ email });

    if (!user) {
      user = await this.create({ email, name, password });
    }

    return user;
  } catch (error) {
    console.error('Error finding or creating user with email:', error);
    throw new Error('Error finding or creating user with email');
  }
};

userSchema.statics.findOrCreateWithFacebook = async function ({ facebookId, email, name }) {
  try {
    console.log('Finding user with Facebook ID:', facebookId);
    let user = await this.findOne({ facebookId });
    if (!user) {
      user = await this.findOne({ email }); // Check by email first to avoid duplicates
      if (user) {
        user.facebookId = facebookId;
        user.name = user.name || name; // Update name only if it's not already set
        await user.save();
      } else {
        user = await this.create({ facebookId, email, name });
      }
    }
    return user;
  } catch (error) {
    console.error('Error in findOrCreateWithFacebook:', error);
    throw new Error('Error finding or creating user with Facebook');
  }
};

userSchema.statics.findOrCreateWithGoogle = async function ({ googleId, email, name }) {
  try {
    console.log('Finding user with Google ID:', googleId);
    let user = await this.findOne({ googleId });
    if (!user) {
      user = await this.create({ googleId, email, name });
    }

    return user;
  } catch (error) {
    console.error('Error in findOrCreateWithGoogle:', error);
    throw new Error('Error finding or creating user with Google');
  }
};

const User = mongoose.model('User', userSchema);
module.exports = User;
