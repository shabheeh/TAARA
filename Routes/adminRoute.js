const express = require("express");
const router = express();
const path = require("path");
const upload = require("../Configs/multerConfig");

//          middlewares
const authAdmin = require("../Middlewares/authAdmin");

//            controllers
const authController = require("../Controllers/admin/authController");
const productController = require("../Controllers/product/productController");
const dashboardController = require("../Controllers/admin/dashboardController");
const orderController = require("../Controllers/order/orderController");
const bannerController = require("../Controllers/admin/bannerController");
const userController = require("../Controllers/admin/userController");
const categoryController = require("../Controllers/admin/categoryController");
const brandController = require("../Controllers/admin/brandController");
const variantController = require("../Controllers/product/variantController")
const offerController = require("../Controllers/admin/offerController")
const couponController = require("../Controllers/admin/couponController")
const salesController = require("../Controllers/order/salesController")
const reviewController = require("../Controllers/product/reviewController")

router.set("views", path.join(__dirname, "..", "Views", "Admin"));
router.use(express.static(path.join(__dirname, "..", "Public", "Admin")));

//           admin login and dashboard
router.get("/", authAdmin.isLogin, authController.login);
router.get("/login", authAdmin.isLogout, authController.loadSignin);
router.post("/login", authController.verifySignIn);
router.post("/logout", authController.logout);
router.get("/dashboard", authAdmin.isLogin, dashboardController.dashboard);
router.get(
  "/dashboard/salesgraph",
  authAdmin.isLogin,
  dashboardController.salesGraph
);

//               user management
router.get("/users", authAdmin.isLogin, userController.loadUsers);
router.patch("/blockUser", authAdmin.isLogin, userController.blockUser);
router.patch("/unblockUser", authAdmin.isLogin, userController.unBlockUser);

//                category management
router.get("/categories", authAdmin.isLogin, categoryController.category);
router.post("/categories", authAdmin.isLogin, categoryController.addCategory);
router.put("/categories", authAdmin.isLogin, categoryController.editCategory);
router.patch(
  "/categories/listCategory",
  authAdmin.isLogin,
  categoryController.listCategory
);
router.patch(
  "/categories/unlistCategory",
  authAdmin.isLogin,
  categoryController.unlistCategory
);

//               brand management
router.get("/brands", authAdmin.isLogin, brandController.brand);
router.put("/brands", authAdmin.isLogin, brandController.editBrand);
router.post("/brands", authAdmin.isLogin, brandController.addBrand);
router.patch("/brands/listBrand", authAdmin.isLogin, brandController.listBrand);
router.patch(
  "/brands/unlistBrand",
  authAdmin.isLogin,
  brandController.unlistBrand
);

//            product management
router.get("/products", authAdmin.isLogin, productController.products);
router.get(
  "/products/addProduct",
  authAdmin.isLogin,
  productController.loadAddProduct
);
router.post(
  "/products/addProduct",
  authAdmin.isLogin,
  upload.fields([
    { name: "productImage1", maxCount: 1 },
    { name: "productImage2", maxCount: 1 },
    { name: "productImage3", maxCount: 1 },
    { name: "productImage4", maxCount: 1 },
  ]),
  productController.addProduct
);
router.put("/products/editProduct", productController.editProduct);
router.patch("/products/listProduct", productController.listProduct);
router.patch("/products/unlistProduct", productController.unlistProduct);

//             variant management
router.get(
  "/products/variants/single/:id",
  authAdmin.isLogin,
  variantController.variants
);
router.get(
  "/products/variants/addVariant/:id",
  authAdmin.isLogin,
  variantController.loadAddVariant
);
router.post(
  "/products/variants/addVariant",
  authAdmin.isLogin,
  upload.fields([
    { name: "productImage1", maxCount: 1 },
    { name: "productImage2", maxCount: 1 },
    { name: "productImage3", maxCount: 1 },
    { name: "productImage4", maxCount: 1 },
  ]),
  variantController.addVariant
);
router.get(
  "/products/variants/editVariant/:id",
  authAdmin.isLogin,
  variantController.loadEditVariant
);
router.put(
  "/products/variants/editVariant",
  upload.fields([
    { name: "productImage1", maxCount: 1 },
    { name: "productImage2", maxCount: 1 },
    { name: "productImage3", maxCount: 1 },
    { name: "productImage4", maxCount: 1 },
  ]),
  variantController.editVariant
);

//              order management
router.get("/orders", authAdmin.isLogin, orderController.orders);
router.get("/order/:orderId", authAdmin.isLogin, orderController.viewOrder);
router.patch("/order", authAdmin.isLogin, orderController.updateStatus);

//             offer and coupon Mangagement
router.get("/offers", authAdmin.isLogin, offerController.offers);
router.post("/offers", authAdmin.isLogin, offerController.addOffer);
router.put("/offers", authAdmin.isLogin, offerController.updateOffer);
router.delete("/offers", authAdmin.isLogin, offerController.deleteOffer);

router.get("/coupons", authAdmin.isLogin, couponController.coupons);
router.post("/coupons", authAdmin.isLogin, couponController.addCoupon);
router.put("/coupons", authAdmin.isLogin, couponController.updateCoupon);
router.delete("/coupons", authAdmin.isLogin, couponController.deleteCoupon);

//                 sales mangement
router.get("/sales", authAdmin.isLogin, salesController.sales);
router.get("/sales/pdf", authAdmin.isLogin, salesController.generatePdf);
router.get("/sales/excel", authAdmin.isLogin, salesController.generateExcel);

//                    review management
router.get("/reviews", authAdmin.isLogin, reviewController.reviews);
router.post("/reviews", authAdmin.isLogin, reviewController.reviewStatus);
router.delete("/reviews", authAdmin.isLogin, reviewController.deleteReview);

//                     banners mangement
router.get("/banners", authAdmin.isLogin, bannerController.banners);
router.get(
  "/editBanner/:id",
  authAdmin.isLogin,
  bannerController.loadEditBanner
);
router.put(
  "/banners",
  upload.single("bannerImage"),
  bannerController.editBanner
);

module.exports = router;
