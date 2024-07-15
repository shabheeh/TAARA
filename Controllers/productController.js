const Category = require("../Models/categoryModel");
const Product = require("../Models/productModel");
const Brand = require("../Models/brandModel");
const Variant = require("../Models/variantModel")
const User = require('../Models/userModel')
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

    const color = req.body.variantColor;
    const colorCode = req.body.variantColorCode;
    const sizes = JSON.parse(req.body.variantSize);
    const quantity = req.body.variantQuantity;

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
        const imagePath = path.join(__dirname, "../Public/Admin/assets/Products-Images", file.filename);
        const resizedImagePath = path.join(__dirname, "../Public/Admin/assets/Products-Cropped", file.filename);

        // Resize image using Sharp
        sharp(imagePath)
          .resize({ width: 303, height: 454 })
          .toFile(resizedImagePath);

        images.push(file.filename);
      });
    });

    const variant = new Variant({
      color,
      colorCode,
      sizes,
      quantity,
      images,
      product: product._id,
      isListed: true,
    });

    await variant.save();

    product.variants.push(variant._id);

    await product.save();

    res.json({
      id: product._id,
      success: true,
      message: "Varintes Added successfully",
    });

  } catch (error) {
    console.log("Error Adding Variant", error.message);
    res.json({
      success: false,
      message: "An error occurred while adding the variant",
    });
  }
};

// ------Edit Product-------->

const editProduct = async (req, res) => {
  try {
    const { id, name, gender, category, brand, price, description } = req.body;

    const updateProduct = await Product.findByIdAndUpdate(
      id,
      { name, gender, category, brand, price, description },
      { new: true }
    );

    if (!updateProduct) {
      return res.json({
        success: false,
        message: "Product not found",
      });
    }

    res.json({
      id,
      success: true,
      message: "Product updated successfully",
    });
  } catch (error) {
    console.log("Error Editing Product", error.message);
    res.json({
      success: false,
      message: "An error occurred while updating the product",
    });
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


// ------Load Add Variants------>

const loadAddVariant = async (req, res) => {

  try {

    const product = await Product.findById(req.params.id);

    res.render('addVariant', {
      product,
    });

    
  } catch (error) {
    console.log('Error loading add variants' , error)
  }
}

// --------Add variant------>

const addVariant = async ( req, res ) => {

  try {
    
    
    const id = req.body.productId;
    const color = req.body.variantColor;
    const colorCode = req.body.variantColorCode;
    const sizes = JSON.parse(req.body.variantSize);
    const quantity = req.body.variantQuantity

    
    const images = [];

    Object.keys(req.files).forEach((fieldName) => {
      const files = req.files[fieldName];
      files.forEach((file) => {
        const imagePath = path.join(__dirname, "../Public/Admin/assets/Products-Images", file.filename);
        const resizedImagePath = path.join(__dirname, "../Public/Admin/assets/Products-Cropped", file.filename);

        // Resize image using Sharp
        sharp(imagePath)
          .resize({ width: 303, height: 454 })
          .toFile(resizedImagePath);

        images.push(file.filename);
      });
    });

    const variant = new Variant({
      color,
      colorCode,
      sizes,
      quantity,
      images,
      product: id,
      isListed: true,
    });

    await variant.save();

    const product = await Product.findByIdAndUpdate(id, {
      $push: { variants: variant._id },
    });


    res.json({
      id,
      success: true,
      message: "Varintes Added successfully",
    });

  } catch (error) {
    console.log("Error Adding Variant", error.message);
    res.json({
      success: false,
      message: "An error occurred while adding the variant",
    });
  }
}

// -------Load Edit Variant------>

const loadEditVariant = async ( req, res) => {

  try {

    const variant = await Variant.findById(req.params.id);

    res.render('editVariant', {
      variant,
    });

    
  } catch (error) {
    console.log('Error loading edit variants' , error)
  }
}

// ------Edit Variant------>

const editVariant = async ( req, res ) => {

  try {
    
    const { variantId, variantColor, variantColorCode, variantQuantity} = req.body

    const sizes = JSON.parse(req.body.variantSize);

    const images = [];

    for (let i = 1; i <= 4; i++) {
      if (req.files && req.files[`productImage${i}`]) {
          const file = req.files[`productImage${i}`][0]; // Access the first file from the array
          const imagePath = path.join(__dirname, "../Public/Admin/assets/Products-Images", file.filename);
          const resizedImagePath = path.join(__dirname, "../Public/Admin/assets/Products-Cropped", file.filename);

          // Resize image using Sharp
          sharp(imagePath)
            .resize({
                width: 303,
                height: 454,
                withoutEnlargement: true,
                upsample: false,
              })
            .toFile(resizedImagePath);
          images.push(file.filename);
      } else {
          images.push(req.body[`existingImage${i}`]); // Use req.body for existing images
      }
  }

    const updateVariant = await Variant.findByIdAndUpdate({ _id: variantId }, {

        color: variantColor,
        colorCode: variantColorCode,
        sizes: sizes,
        quantity: variantQuantity,
        images: images,
        }, { new: true,});

        if (!updateVariant) {
          return res.json({
            success: false,
            message: "Variant not found",
          });
        }

        const variant = await Variant.findById({_id: variantId})

        res.json({
          id: variant.product._id,
          success: true,
          message: "Variant updated successfully",
        });
      } catch (error) {
        console.log("Error Editing Variant", error.message);
        res.json({
          success: false,
          message: "An error occurred while updating the Variant",
        });
      }
}

// ------Products Grid---->

const productsGrid = async ( req, res ) => {

  try {

    const gender = req.params.gender


    const products = await Product.find({gender}).populate('variants').populate('category')

    

    const brands = await Brand.find();
    const categories = await Category.aggregate([
      {$match:{
        gender: gender,
        isListed: true
      }},
      {
          $lookup: {
              from: 'products', 
              localField: '_id',
              foreignField: 'category',
              as: 'products'
          }
      },
      {
          $project: {
              _id: 1,
              name: 1,
              count: { $size: '$products' } 
          }
      }
  ]);


  
  let user = null;
  if (req.userId) {
      user = await User.findById(req.userId);
  }


    res.render('productsGrid', {
      user,
      title: gender,
      products,
      brands,
      categories,
    })
    
  } catch (error) {
    console.log("Error listing products Men", error.message);

  }

}

// ------Product View------>

const product = async (req, res) => {

  try {
    const productId = req.params.id;
    const variantId = req.params.variantId;
  

    const product = await Product.findById(productId).populate('variants').populate('category');

    if (!product) {
      return res.status(404).send('Product not found');
    }

    let variant = product.variants.find((variant) => variant._id == variantId)


    if (!variant) {
      return res.status(404).send('Variant not found');
    }

    const category = product.category._id;

    const similarProducts = await Product.find({ category }).populate('variants').populate('category').populate('brand');

    
  let user = null;
  if (req.userId) {
      user = await User.findById(req.userId);
  }


    res.render('productSingle', {
      user: user,
      product,
      variant,
      similarProducts,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
};



module.exports = {
    products,
    loadAddProduct,
    addProduct,
    editProduct,
    variants,
    loadAddVariant,
    addVariant,
    loadEditVariant,
    editVariant,
    product,
    productsGrid,

}


