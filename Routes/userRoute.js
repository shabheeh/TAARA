const express = require('express');
const app = express()
const path = require('path');
const passport = require('passport');


// Static path set
// app.use(express.static(path.join(__dirname, '../Public/User',)))

// Set view engine
app.set('view engine', 'ejs');
app.set('views', './Views/User');
app.use(express.static('Public/User'));


const userController = require("../Controllers/userController");
const authUser = require("../Middlewares/authUser")

app.get('/', userController.loadHome)

app.get('/authentication', authUser.isLogout, userController.authentication)
app.post('/signup', userController.insertUser)
app.get('/user-account', authUser.isLogin, userController.userAccount)
app.get('/otpVerify', authUser.isLogout, userController.loadOtp) 
app.post('/otpVerify', userController.verifyOtp)
app.post('/resendOtp', userController.resendOtp)
app.post('/signin', userController.verifySignIn)
app.get('/forgotPass', authUser.isLogout, userController.forgotPass)
app.post('/forgotPass', userController.forgotPassVerify)


app.get('/products/men', )


app.get('/auth/google', passport.authenticate('google', {
    scope: ['profile', 'email']
  }));
  
app.get('/googleAuth', passport.authenticate('google', { failureRedirect: '/authentication' }), (req, res) => {

    req.session.user = req.user
    console.log(req.session.user)
    res.redirect('/');
});


app.get('/reset/:token', userController.resetPass)
app.post('/reset/:token', userController.resetPassVerify)


module.exports = app;  
