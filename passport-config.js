const passport = require('passport');
const mongoose = require('mongoose');
const FacebookStrategy = require('passport-facebook').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('./models/userModel'); // Adjust the path as necessary

module.exports = () => {
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (err) {
      done(err, null);
    }
  });

  passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: "http://localhost:3000/users/auth/facebook/callback",
    profileFields: ['id', 'emails', 'displayName'] // Request these fields
   },
async (accessToken, refreshToken, profile, done) => {
    try {
        const { id, emails, displayName } = profile;
        const email = emails[0].value;
        const name = displayName; // Use displayName directly as full name

        let user = await User.findOrCreateWithFacebook({ facebookId: id, email, name });

        return done(null, user);
    } catch (err) {
        console.error('Error in Facebook strategy:', err);
        return done(err, false, { message: 'Internal Server Error' });
    }
  }));


  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/users/auth/google/callback"
  },
  async (token, tokenSecret, profile, done) => {
    try {
      const { id, emails, name } = profile;
      const email = emails[0].value;
      const fullName = `${name.givenName} ${name.familyName}`;

      let user = await User.findOrCreateWithGoogle({ googleId: id, email, name: fullName });

      return done(null, user);
    } catch (err) {
      return done(err, false, { message: 'Internal Server Error' });
    }
  }));
};
