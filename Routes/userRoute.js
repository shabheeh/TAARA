const express = require('express');
const app = express()
const path = require('path');
const passport = require('passport');


// Static path set
// app.use(express.static(path.join(__dirname, '../Public/User',)))

//        Set view engine and static
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'Views', 'User'));
app.use(express.static(path.join(__dirname, '..', 'Public')));

//                     controllers
const userController = require("../Controllers/userController");
const productController = require('../Controllers/productController')
const cartController = require('../Controllers/cartController')
const orderController = require('../Controllers/orderController')

//             middlewares
const authUser = require("../Middlewares/authUser")



//                  landing page
app.get('/', authUser.authorization, userController.loadHome)

//                  user authentications
app.get('/authentication', authUser.isLogout, userController.authentication)
app.post('/signup', userController.insertUser)
app.get('/otpVerify', authUser.isLogout, userController.loadOtp) 
app.post('/otpVerify', userController.verifyOtp)
app.post('/resendOtp', userController.resendOtp)
app.post('/signin', userController.verifySignIn)
app.get('/forgotPass', authUser.isLogout, userController.forgotPass)
app.post('/forgotPass', userController.forgotPassVerify)
app.get('/reset/:token', userController.resetPass)
app.post('/reset/:token', userController.resetPassVerify)
app.post('/signout', userController.signout)

//                products grid and product viewing
app.get('/products/:title', authUser.authorization, productController.productsGrid)
app.get('/product/:id/variant/:variantId', authUser.authorization, productController.product)


//                       user
app.get('/account', authUser.isLogin, authUser.isBlocked, userController.userAccount)
app.put('/profile', authUser.authorization, userController.updateProfile)
app.put('/password', authUser.authorization, userController.changePassword )
app.post('/address', authUser.authorization, userController.addAddress)
app.put('/address', userController.editAddress)
app.delete('/deleteAddress', userController.deleteAddress)

//                        cart
app.get('/cart', authUser.isLogin, authUser.isBlocked, cartController.cart)
app.post('/cart', authUser.authorization, cartController.addToCart)
app.delete('/cart/:index/:cartId', authUser.authorization, cartController.removeFromCart)
app.put('/cart/:index/:cartId', authUser.authorization, cartController.updateCart)

//                              checkout
app.get('/checkout', authUser.isLogin, authUser.isBlocked, orderController.loadCheckout)
app.post('/checkout', authUser.authorization, orderController.checkout)
app.get('/checkout/success/:orderId', authUser.isLogin, authUser.isBlocked, orderController.confirmOrder)

//                             order
app.put('/order/cancel', authUser.authorization , orderController.cancelOrder)

//            404
app.get('/404', userController.fourNotFour)

//            google auth 
app.get('/auth/google', passport.authenticate('google', {
    scope: ['profile', 'email']
  }));
  
app.get('/googleAuth', passport.authenticate('google', { failureRedirect: '/authentication' }), (req, res) => {

    req.session.user = req.user

    res.redirect('/');
});




module.exports = app;  
