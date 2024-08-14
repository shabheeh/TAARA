const express = require("express");
const router = express();
const path = require("path");
const upload = require("../Configs/multerConfig");
//          middlewares
const authAdmin = require("../Middlewares/authAdmin");

//            controllers
const adminController = require("../Controllers/adminController");
const productController = require("../Controllers/productController");
const orderController = require("../Controllers/orderController");
const offerController = require("../Controllers/offerController");
const { auth } = require("firebase-admin");


//        Set view and  static

router.set("views", path.join(__dirname, "..", "Views", "Admin"));
router.use(express.static(path.join(__dirname, "..", "Public", "Admin")));


//           admin login and dashboard
router.get("/", authAdmin.isLogin, adminController.login);
router.get("/login", authAdmin.isLogout, adminController.loadSignin);
router.post("/login", adminController.verifySignIn);
router.post("/logout", adminController.logout);
router.get("/dashboard", authAdmin.isLogin, adminController.dashboard);
router.get('/dashboard/salesgraph', authAdmin.isLogin, adminController.salesGraph)



//               user management
router.get("/users", authAdmin.isLogin, adminController.loadUsers);
router.patch("/blockUser", authAdmin.isLogin, adminController.blockUser);
router.patch("/unblockUser", authAdmin.isLogin, adminController.unBlockUser);

//                category management
router.get("/categories", authAdmin.isLogin, adminController.category);
router.post("/categories", authAdmin.isLogin, adminController.addCategory);
router.put("/categories", authAdmin.isLogin, adminController.editCategory);
router.patch(
  "/categories/listCategory",
  authAdmin.isLogin,
  adminController.listCategory
);
router.patch(
  "/categories/unlistCategory",
  authAdmin.isLogin,
  adminController.unlistCategory
);

//               brand management
router.get("/brands", authAdmin.isLogin, adminController.brand);
router.put("/brands", authAdmin.isLogin, adminController.editBrand);
router.post("/brands", authAdmin.isLogin, adminController.addBrand);
router.patch("/brands/listBrand", authAdmin.isLogin, adminController.listBrand);
router.patch(
  "/brands/unlistBrand",
  authAdmin.isLogin,
  adminController.unlistBrand
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
  productController.variants
);
router.get(
  "/products/variants/addVariant/:id",
  authAdmin.isLogin,
  productController.loadAddVariant
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
  productController.addVariant
);
router.get(
  "/products/variants/editVariant/:id",
  authAdmin.isLogin,
  productController.loadEditVariant
);
router.put(
  "/products/variants/editVariant",
  upload.fields([
    { name: "productImage1", maxCount: 1 },
    { name: "productImage2", maxCount: 1 },
    { name: "productImage3", maxCount: 1 },
    { name: "productImage4", maxCount: 1 }, 
  ]),
  productController.editVariant
);

//              order management
router.get("/orders", authAdmin.isLogin, orderController.orders);
router.get("/order/:orderId", authAdmin.isLogin, orderController.viewOrder);
router.patch("/order", authAdmin.isLogin, orderController.updateStatus);

//             offer and coupon Mangagement
router.get("/offers", authAdmin.isLogin, offerController.offers);
router.post('/offers', authAdmin.isLogin, offerController.addOffer)
router.put('/offers', authAdmin.isLogin, offerController.updateOffer)
router.delete('/offers', authAdmin.isLogin, offerController.deleteOffer)

router.get('/coupons', authAdmin.isLogin, offerController.coupons)
router.post('/coupons', authAdmin.isLogin, offerController.addCoupon)
router.put('/coupons', authAdmin.isLogin, offerController.updateCoupon)
router.delete('/coupons', authAdmin.isLogin, offerController.deleteCoupon)

//                 sales mangement
router.get("/sales", authAdmin.isLogin, orderController.sales)
router.get('/sales/pdf', authAdmin.isLogin, orderController.generatePdf)
router.get('/sales/excel', authAdmin.isLogin, orderController.generateExcel)





module.exports = router;
