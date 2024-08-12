const express = require("express");
const router = express();
const path = require("path");
const passport = require('passport');


//        Set view and  static

router.set('views', path.join(__dirname, '..', 'Views', 'User'));
router.use(express.static(path.join(__dirname, '..', 'Public')));

//                     controllers
const userController = require("../Controllers/userController");
const productController = require('../Controllers/productController')
const cartController = require('../Controllers/cartController')
const orderController = require('../Controllers/orderController')

//             middlewares
const authUser = require("../Middlewares/authUser");



//                  landing page
router.get('/', authUser.authorization, userController.loadHome)

//                  user authentications
router.get('/authentication', authUser.isLogout, userController.authentication)
router.post('/signup', userController.insertUser)
router.get('/otpVerify', authUser.isLogout, userController.loadOtp) 
router.post('/otpVerify', userController.verifyOtp)
router.post('/resendOtp', userController.resendOtp)
router.post('/signin', userController.verifySignIn)
router.get('/forgotPass', authUser.isLogout, userController.forgotPass)
router.post('/forgotPass', userController.forgotPassVerify)
router.get('/reset/:token', userController.resetPass)
router.post('/reset/:token', userController.resetPassVerify)
router.post('/signout', userController.signout)

//                products grid and product viewing
router.get('/products/:title', authUser.authorization, productController.productsGrid)
router.get('/product/:id/variant/:variantId', authUser.authorization, productController.productView)


//                       user
router.get('/account', authUser.isLogin, authUser.isBlocked, userController.userAccount)
router.put('/profile', authUser.authorization, userController.updateProfile)
router.put('/password', authUser.authorization, userController.changePassword )
router.post('/address', authUser.authorization, userController.addAddress)
router.put('/address', userController.editAddress)
router.delete('/deleteAddress', userController.deleteAddress)

//                        cart
router.get('/cart', authUser.isLogin, authUser.isBlocked, cartController.cart)
router.post('/cart', authUser.authorization, cartController.addToCart)
router.delete('/cart/:variantId/:cartId', authUser.authorization, cartController.removeFromCart)
router.put('/cart/:variantId/:cartId', authUser.authorization, cartController.updateCart)
router.post('/toCheckout', authUser.authorization, cartController.proceedToCheckout)

//                       wishlist
router.get('/wishlist', authUser.isLogin, cartController.wishlist)
router.post('/wishlist', authUser.authorization, cartController.addToWishlist)
router.delete('/wishlist/:variantId/:wishlistId', authUser.authorization, cartController.removeFromWishlist)

//                              checkout
router.get('/checkout', authUser.isLogin, authUser.isBlocked, orderController.loadCheckout)
router.post('/coupon', authUser.authorization, orderController.validateCoupon)
router.post('/checkout', authUser.authorization, orderController.checkout)
router.get('/checkout/success/:orderId', authUser.isLogin, authUser.isBlocked, orderController.confirmOrder)

//                             order
router.post('/order', authUser.authorization , orderController.updateOrderStatus)
router.put('/order', authUser.authorization, orderController.updatePaymentStatus)
router.patch('/order', authUser.authorization, orderController.retryPayment)
router.get('/invoice/:orderId', authUser.authorization, orderController.generateInvoice)

//            404
// router.get('/404', userController.fourNotFour)

//            google auth 
router.get('/auth/google', passport.authenticate('google', {
    scope: ['profile', 'email']
  }));
  
router.get('/googleAuth', passport.authenticate('google', { failureRedirect: '/authentication' }), (req, res) => {

    req.session.user = req.user

    res.redirect('/');
});




module.exports = router;  
