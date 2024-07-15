const express = require('express');
const app = express()
const path = require('path');

const upload = require("../Middlewares/multerConfig");




//     Set view engine and static
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'Views', 'Admin'));
app.use(express.static(path.join(__dirname, '..', 'Public', 'Admin')));

//          middlewares
const authAdmin = require("../Middlewares/authAdmin");

//            controllers
const adminController = require("../Controllers/adminController");
const productController = require("../Controllers/productController")

//           admin login and dashboard
app.get("/", authAdmin.isLogin, adminController.login)
app.get("/login", authAdmin.isLogout, adminController.loadSignin);
app.post("/login", adminController.verifySignIn); 
app.get("/dashboard", authAdmin.isLogin, adminController.loadHome);
app.post("/logout", adminController.logout);

//               user management
app.get('/users', authAdmin.isLogin, adminController.loadUsers)
app.patch('/blockUser', authAdmin.isLogin, adminController.blockUser)
app.patch('/unblockUser', authAdmin.isLogin, adminController.unBlockUser)

//                category management
app.get('/categories', authAdmin.isLogin, adminController.category)
app.post('/categories/addCategory', authAdmin.isLogin, adminController.addCategory)
app.put('/categories/editCategory', authAdmin.isLogin, adminController.editCategory)
app.patch('/categories/listCategory', authAdmin.isLogin, adminController.listCategory)
app.patch('/categories/unlistCategory', authAdmin.isLogin, adminController.unlistCategory)

//               brand management
app.get('/brands', authAdmin.isLogin, adminController.brand)
app.put("/brands/editBrand", authAdmin.isLogin, adminController.editBrand);
app.post('/brands/addBrand', authAdmin.isLogin, adminController.addBrand);
app.patch('/brands/listBrand', authAdmin.isLogin, adminController.listBrand);
app.patch('/brands/unlistBrand', authAdmin.isLogin, adminController.unlistBrand);

//            product management
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
app.put('/products/editProduct', productController.editProduct)

//             variant management
app.get('/products/variants/single/:id', authAdmin.isLogin, productController.variants)
app.get('/products/variants/addVariant/:id', authAdmin.isLogin, productController.loadAddVariant)
app.post('/products/variants/addVariant', authAdmin.isLogin, 
    upload.fields([
        { name: "productImage1", maxCount: 1 },
        { name: "productImage2", maxCount: 1 },
        { name: "productImage3", maxCount: 1 },
        { name: "productImage4", maxCount: 1 },
      ]),
       productController.addVariant);
app.get('/products/variants/editVariant/:id', authAdmin.isLogin, productController.loadEditVariant)
app.put('/products/variants/editVariant', 
  upload.fields([
    { name: "productImage1", maxCount: 1 },
    { name: "productImage2", maxCount: 1 },
    { name: "productImage3", maxCount: 1 },
    { name: "productImage4", maxCount: 1 },
  ]),
   productController.editVariant)



app.get('/trail', (req,res) => {
    res.render('trail')
})

module.exports = app