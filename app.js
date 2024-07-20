const express = require('express');
const session = require('express-session');
const expressLayouts = require('express-ejs-layouts');
const passport = require('passport');
const bodyParser = require('body-parser');
const path = require('path');
require('dotenv').config();

const app = express();

// For parsing application/json
app.use(express.json());
app.use(bodyParser.json()); // If using body-parser

// For parsing application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.urlencoded({ extended: true }));


// DataBase Connection
const connectDB = require('./models/database');

// Secret key Creating In Config Folder
const Config = require('./config/config');

// Express middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(expressLayouts);


app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || Config.sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // Set secure: true if using https
}));

// Initialize Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Load Passport configuration
require('./passport-config')(passport);

// Routes
const userRoute = require('./routes/userRoutes');
const adminRoute = require('./routes/adminRoutes');
const paypalRoute = require('./routes/paypalRoutes');

app.use('/paypal',paypalRoute);

// Middleware to set layout for admin routes
app.use('/admin', (req, res, next) => {
  app.set('layout', 'layouts/adminLayouts');
  next();
}, adminRoute);

// Redirect '/' to '/users'
app.get('/', (req, res) => {
  res.redirect('/users');
});

// Middleware to set layout for user routes
app.use('/users', (req, res, next) => {
  app.set('layout', 'layouts/userLayouts');
  next();
}, userRoute)

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
