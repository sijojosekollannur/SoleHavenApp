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

const categorySchema = new mongoose.Schema({
  categoryName: {
    type: String,
    required: true,
    maxlength: 100
  },
  isActive: {
    type: Boolean,
    default: true  
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  offers: [offerSchema]

});

const Category = mongoose.model('Category', categorySchema);

module.exports = Category;
