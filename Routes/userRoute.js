const express = require("express");
const router = express();
const path = require("path");
const passport = require("passport");

//        Set view and  static

router.set("views", path.join(__dirname, "..", "Views", "User"));
router.use(express.static(path.join(__dirname, "..", "Public")));

//                     controllers
const userController = require("../Controllers/user/userController");
const addressController = require("../Controllers/user/addressController");
const productController = require("../Controllers/product/productController");
const cartController = require("../Controllers/cartController");
const orderController = require("../Controllers/order/orderController");
const miscController = require("../Controllers/miscController")
const wishlistController = require("../Controllers/wishListController")
const checkoutController = require("../Controllers/order/checkoutController");
const salesController = require("../Controllers/order/salesController");
const reviewController = require("../Controllers/product/reviewController")

//             middlewares
const authUser = require("../Middlewares/authUser");

router.use(authUser.setAuthStatus)

//                  landing page
router.get("/", authUser.authorization, userController.loadHome);

//                  user authentications
router.get("/authentication", authUser.isLogout, userController.authentication);
router.post("/signup", userController.insertUser);
router.get("/otpVerify", authUser.isLogout, userController.loadOtp);
router.post("/otpVerify", userController.verifyOtp);
router.post("/resendOtp", userController.resendOtp);
router.post("/signin", userController.verifySignIn);
router.get("/forgotPass", authUser.isLogout, userController.forgotPass);
router.post("/forgotPass", userController.forgotPassVerify);
router.get("/reset/:token", userController.resetPass);
router.post("/reset/:token", userController.resetPassVerify);
router.post("/signout", userController.signout);

router.get("/about", authUser.authorization, miscController.about);

//                products grid and product viewing
router.get(
  "/products/:title",
  authUser.authorization,
  productController.productsGrid
);
router.get(
  "/product/:id/variant/:variantId",
  authUser.authorization,
  productController.productView
);

//                       user
router.get(
  "/account",
  authUser.isLogin,
  authUser.isBlocked,
  userController.userAccount
);
router.put("/profile", authUser.authorization, userController.updateProfile);
router.put("/password", authUser.authorization, userController.changePassword);
router.post("/address", authUser.authorization, addressController.addAddress);
router.put("/address", addressController.editAddress);
router.delete("/deleteAddress", addressController.deleteAddress);

//                        cart
router.get("/cart", authUser.isLogin, authUser.isBlocked, cartController.cart);
router.post("/cart", authUser.authorization, cartController.addToCart);
router.delete(
  "/cart/:variantId/:cartId",
  authUser.authorization,
  cartController.removeFromCart
);
router.put(
  "/cart/:variantId/:cartId",
  authUser.authorization,
  cartController.updateCart
);
router.post(
  "/toCheckout",
  authUser.authorization,
  cartController.proceedToCheckout
);

//                       wishlist
router.get(
  "/wishlist",
  authUser.isLogin,
  authUser.isBlocked,
  wishlistController.wishlist
);
router.post("/wishlist", authUser.authorization, wishlistController.addToWishlist);
router.delete(
  "/wishlist/:variantId/:wishlistId",
  authUser.authorization,
  wishlistController.removeFromWishlist
);

//                              checkout
router.get(
  "/checkout",
  authUser.isLogin,
  authUser.isBlocked,
  checkoutController.loadCheckout
);
router.post("/coupon", authUser.authorization, checkoutController.validateCoupon);
router.post("/checkout", authUser.authorization, checkoutController.checkout);
router.get(
  "/checkout/success/:orderId",
  authUser.isLogin,
  authUser.isBlocked,
  checkoutController.confirmOrder
);

//                             order
router.post(
  "/order",
  authUser.authorization,
  orderController.updateOrderStatus
);
router.put(
  "/order",
  authUser.authorization,
  checkoutController.updatePaymentStatus
);
router.patch("/order", authUser.authorization, checkoutController.retryPayment);
router.get(
  "/invoice/:orderId",
  authUser.isLogin,
  salesController.generateInvoice
);

//                          review
router.post("/review", authUser.authorization, reviewController.review);
router.put("/review", authUser.authorization, reviewController.editReview);

//            google auth
router.get(
  "/auth/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })
);

router.get(
  "/googleAuth",
  passport.authenticate("google", { failureRedirect: "/authentication" }),
  (req, res) => {
    req.session.user = req.user;

    res.redirect("/");
  }
);

module.exports = router;
