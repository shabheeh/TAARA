const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('./Models/userModel'); // Adjust the path as necessary

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "https://taarafashion.shop/googleAuth"
  },
  async (accessToken, refreshToken, profile, done) => {

    try {
      const { id, emails, name } = profile;
  
      // Find the user by email
      let user = await User.findOne({ email: emails[0].value });
  
      if (user) {
        // Check if user is listed
        if (user.isBlocked) {
          return done(null, false, { message: 'Your account is restricted from logging in.' });
        }
  
        // Update existing user with new google data
        // user.googleId = id;
        user.firstName = name.givenName;
        user.lastName = name.familyName || '';
  
        await user.save();
      } else {
        // Create a new user if one doesn't exist
        user = new User({
          // googleId: id,
          firstName: name.givenName,
          lastName: name.familyName || '',
          email: emails[0].value,
          dateOfJoined: new Date().toLocaleDateString('en-GB'),
          isBlocked: false  
        });
  
        await user.save();
      }
  
      done(null, user);

    } catch (error) {
      done(error, null);
    }

  }));
  
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });
  
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

module.exports = passport;