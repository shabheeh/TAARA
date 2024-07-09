const express = require('express');
const app = express()
const path = require('path');

// const upload = require("../Middlewares/multerConfig");
const multer = require("multer");



// Set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'Views', 'Admin'));

// app.use(
//     express.static(path.join(__dirname, '..', 'Public', 'Admin'))
//   )
app.use(express.static(path.join(__dirname, '..', 'Public', 'Admin')));

// app.use(express.static('Public'));

const authAdmin = require("../Middlewares/authAdmin");

const adminController = require("../Controllers/adminController");
const productController = require("../Controllers/productController")



// Multer Configuration for  add productImgaes
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        return cb(null, path.join(__dirname, '..', 'Public', 'Admin', 'assets', 'products-Images'));
    },
    filename: function (req, file, cb) {
        return cb(null, `${Date.now()}-${file.originalname}`)
    }
});
const upload = multer({ storage: storage, });

/// Multer Configuration for Coupon background
const couponStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, '..', 'public', 'assets', 'couponBgImages'));
    },
    filename: function (req, file, cb) {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

const couponBgImageUpload = multer({ storage: couponStorage });






app.get("/", authAdmin.isLogin, adminController.login)
app.get("/login", authAdmin.isLogout, adminController.loadSignin);
app.post("/login", adminController.verifySignIn); 
app.get("/dashboard",authAdmin.isLogin, adminController.loadHome);

app.get('/users', authAdmin.isLogin, adminController.loadUsers)
app.patch('/blockUser', authAdmin.isLogin, adminController.blockUser)
app.patch('/unblockUser', authAdmin.isLogin, adminController.unBlockUser)

app.get('/categories', authAdmin.isLogin, adminController.category)
app.post('/categories/addCategory', authAdmin.isLogin, adminController.addCategory)
app.put('/categories/editCategory', authAdmin.isLogin, adminController.editCategory)
app.patch('/categories/listCategory', authAdmin.isLogin, adminController.listCategory)
app.patch('/categories/unlistCategory', authAdmin.isLogin, adminController.unlistCategory)

app.get('/brands', authAdmin.isLogin, adminController.brand)
app.put("/brands/editBrand", authAdmin.isLogin, adminController.editBrand);
app.post('/brands/addBrand', authAdmin.isLogin, adminController.addBrand);
app.patch('/brands/listBrand', authAdmin.isLogin, adminController.listBrand);
app.patch('/brands/unlistBrand', authAdmin.isLogin, adminController.unlistBrand);


app.get('/products', authAdmin.isLogin, productController.products)
app.get('/products/addProduct', authAdmin.isLogin, productController.loadAddProduct)
app.post("/products/addProduct", authAdmin.isLogin,
  upload.fields([
    { name: "productImage1", maxCount: 1 },
    { name: "productImage2", maxCount: 1 },
    { name: "productImage3", maxCount: 1 },
    { name: "productImage4", maxCount: 1 },
  ]),
  productController.addProduct
);
app.get('/products/variants/:id', authAdmin.isLogin, productController.variants)



app.get('/trail', (req,res) => {
    res.render('trail')
})

module.exports = app