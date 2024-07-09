const Category = require("../Models/categoryModel");
const Product = require("../Models/productModel");
const Brand = require("../Models/brandModel");
const Variant = require("../Models/variantModel")
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");







// ------Products List------>

const products = async (req, res) => {

    try {

      const products = await Product.find().populate('variants').populate('category').populate('brand');

      const brands = await Brand.find()
      const categories = await Category.find()

      res.render('products', {
        products,
        brands,
        categories
      });


    } catch (error) {
    console.log('Error loading products', error.message);
    }
};

// ------load add Products------>

const loadAddProduct = async (req, res) => {

    try {

      const brands = await Brand.find({isListed: true})
      const categories = await Category.find({isListed: true})
        
        res.render("addProduct2", {
          brands,
          categories
        });

    } catch (error) {
    console.log("Error loading add products", error.message);
    }
};


// ------Add Products------>

const addProduct = async (req, res) => {

  try {

    // Get product details from request body
    const name = req.body.productName;
    const description = req.body.productDescription;
    const gender = req.body.productGender;
    const category = req.body.productCategory;
    const brand = req.body.productBrand;
    const price = req.body.productPrice;

    const color = req.body.productColor;
    const sizes = req.body.productSizes;
    const quantity = req.body.productStock;

    // Save product details to database
    const product = new Product({
      name,
      description,
      gender,
      category,
      brand,
      price,
      isListed: true
    });

    await product.save();

    const images = [];

    Object.keys(req.files).forEach((fieldName) => {
      const files = req.files[fieldName];
      files.forEach((file) => {
        const imagePath = path.join(
          __dirname,
          "..",
          "Public",
          "Admin",
          "assets",
          "products-Images",
          file.filename
        );
        const resizedImagePath = path.join(
          __dirname,
          "..",
          "Public",
          "Admin",
          "assets",
          "Products-Cropped",
          file.filename
        );

        // Resize Sharp
        sharp(imagePath)
          .resize({ width: 303, height: 454 })
          .toFile(resizedImagePath);

        images.push(file.filename);
      });
    });

    const variant = new Variant({
      color,
      sizes,
      quantity,
      images,
      product: product._id,
      isListed: true,
    });

    await variant.save();

    product.variants.push(variant._id);

    await product.save();

    res.redirect('/admin/products')


  } catch (error) {
    console.log("Error adding product", error);
    
    res.redirect('/admin/addProduct')
  }
};

// ------Products Variants------>

const variants = async (req, res) => {

  try {
    const product = await Product.findById(req.params.id);
    const variants = await Variant.find({ product: product._id });

    res.render('variants', { product, variants });

    
  } catch (error) {
    console.log('Error loading variants' , error.message)
  }
}


// ------Edit Product-------->

const editProduct = async ( req, res) => {

  try {
      const {id, name, gender, category, brand, price, description} = req.body

      const updateProduct = Product.findByIdAndUpdate(id,{name, gender, category, brand, price, description}, {new: true})
    
      if(!updateProduct){
        return res.render()
      }
  } catch (error) {
    console.log("Error Editing Product", error.message)
    
  }
}

// ------Load Add Variants------>

const addVariant = async (req, res) => {

  try {
    
    

    res.render('variants', { product, variants });

    
  } catch (error) {
    console.log('Error loading add variants' , error)
  }
}



module.exports = {
    products,
    loadAddProduct,
    addProduct,
    variants

}