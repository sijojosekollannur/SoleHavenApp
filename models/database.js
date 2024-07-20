const mongoose = require('mongoose');
require('dotenv').config();

// MongoDB Connection
const connectDB = mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://sijojose099:BRQfHx6uqhuEMyDS@cluster0.wpd6kph.mongodb.net/SOLEHAVENAPP')
.then(() => {
  console.log("Connected to MongoDB");
}).catch(err => {
  console.error("Error connecting to MongoDB:", err);
});


module.exports = connectDB;