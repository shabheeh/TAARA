const Category = require("../Models/categoryModel");
const Product = require("../Models/productModel");
const Brand = require("../Models/brandModel");
const Variant = require("../Models/variantModel")
const User = require('../Models/userModel')
const Cart = require('../Models/cartModel')
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const mongoose = require("mongoose");






// ------Products List Admin side----->

const products = async (req, res) => {

    try {

      const page = parseInt(req.query.page) || 1;
        const limit = 5;
        const skip = (page - 1) * limit;
        let searchTerm = '';
        let query = {};

        if (req.query.search) {
            searchTerm = req.query.search.trim();
            query = { 
                $or: [
                    { name: new RegExp(searchTerm, 'i') },
                    { description: new RegExp(searchTerm, 'i') }
                ]
            };
        }

        const products = await Product.find(query)
            .populate('variants')
            .populate('category')
            .populate('brand')
            .skip(skip)
            .limit(limit);

        const totalProducts = await Product.countDocuments(query);

        const brands = await Brand.find();
        const categories = await Category.find();

        res.render('products', {
            products,
            brands,
            categories,
            page,
            totalPages: Math.ceil(totalProducts / limit),
            searchTerm,
            limit,
            totalProducts
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
        
        res.render("addProduct3", {
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

    // const images = [];

    // Object.keys(req.files).forEach((fieldName) => {
    //   const files = req.files[fieldName];
    //   files.forEach((file) => {
    //     const imagePath = path.join(__dirname, "../Public/Admin/assets/Products-Images", file.filename);
    //     const resizedImagePath = path.join(__dirname, "../Public/Admin/assets/Products-Cropped", file.filename);

    //     // Resize image using Sharp
    //     sharp(imagePath)
    //       .resize({ width: 303, height: 454 })
    //       .toFile(resizedImagePath);

    //     images.push(file.filename);
    //   });
    // });

    // Handle uploaded files
    const imageFiles = req.files;
    const images = [];

    // Process each uploaded file
    for (let i = 1; i <= 4; i++) {
      const fieldName = `productImage${i}`;
      if (imageFiles[fieldName] && imageFiles[fieldName][0]) {
        images.push(imageFiles[fieldName][0].filename);
      }
    }

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


// ------unlist Product------>

const unlistProduct = async (req, res) => {
  try {
      const productId = req.body.productId;
      
      
      const unlistProduct = await Product.findByIdAndUpdate(productId, { isListed: false }, { new: true });
      
      if (!unlistProduct.isListed) {
          
          res.json({ isListed: false });
      } else {
          res.json({ isListed: true, message: 'Error unlisting product' });
      }
  } catch (error) {
      console.error('Error unlisting product:', error.message);
      res.status(500).json({ message: 'Internal Server Error' });
  }
};

// ------list product------>

const listProduct = async (req, res) => {
  try {
      const productId = req.body.productId;
      const listProduct = await Product.findByIdAndUpdate( productId, { isListed: true }, { new: true });

      if ( listProduct.isListed) {

          res.json({ isListed: true });

      } else {
          res.json({ isListed: false, message: 'Error listing product' });
      }
  } catch (error) {
      console.error('Error listing product:', error.message);
      res.status(500).json({ message: 'Internal Server Error' });
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

    
    // 
    

    // Handle uploaded files
    const imageFiles = req.files;
    const images = [];

    // Process each uploaded file
    for (let i = 1; i <= 4; i++) {
      const fieldName = `productImage${i}`;
      if (imageFiles[fieldName] && imageFiles[fieldName][0]) {
        images.push(imageFiles[fieldName][0].filename);
      }
    }

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

    const imageFiles = req.files;
const images = [];

// Process each uploaded file
for (let i = 1; i <= 4; i++) {
    const fieldName = `productImage${i}`;
    if (imageFiles[fieldName] && imageFiles[fieldName][0]) {
        images.push(imageFiles[fieldName][0].filename);
    } else {
        // Keep the existing image if no new image is uploaded
        const existingImageField = `existingImage${i}`;
        if (req.body[existingImageField]) {
            images.push(req.body[existingImageField]);
        }
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

        // update product quantity in carts according to the quantity of that products.
        const carts = await Cart.find({'products.variant': variantId});

        

        for (const cart of carts) {
            for (const item of cart.products) {
                if (item.variant == variantId && item.quantity > updateVariant.quantity) {
                    item.quantity = updateVariant.quantity;
                }
            }
            await cart.save();
        }

          

        const variant = await Variant.findById({_id: variantId})

        res.json({
          id: variant.product._id,
          success: true,
          message: "Variant updated successfully",
        });
      } catch (error) {
        console.log("Error Editing Variant", error.message);
        if(req.fileValidationError){
          return res.json({
            success: false,
            message: req.fileValidationError
          })
        }
        res.json({
          success: false,
          message: "An error occurred while updating the Variant",
        });
      }
}

// ------Products Grid---->

const productsGrid = async (req, res) => {

  try {

    const page = parseInt(req.query.page) || 1;
    const limit = 9;
    const skip = (page - 1) * limit;

    const { title } = req.params;
    const { categories, brands, sizes, color, gender, sortProducts, search } = req.query;

    // get listed categories and brands 
    const listedCategories = await Category.find({ isListed: true }, '_id');
    const listedBrands = await Brand.find({ isListed: true }, '_id');

    // initial match
    let matchStage = { 
      isListed: true,
      category: { $in: listedCategories.map(c => c._id) },
      brand: { $in: listedBrands.map(b => b._id) }
    };

    // Add search condition
    if (search) {
      matchStage.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Apply gender filter
    if (gender && gender.length !== 2) {
      matchStage.gender = gender;
    } else if (title === 'Men') {
      matchStage.gender = 'Men';
    } else if (title === 'Women') {
      matchStage.gender = 'Women';
    }

    if (categories) {
      const filteredCategories = listedCategories.filter(c => 
        (Array.isArray(categories) ? categories : [categories]).includes(c._id.toString())
      );
      matchStage.category = { $in: filteredCategories.map(c => c._id) };
    }

    if (brands) {
      const filteredBrands = listedBrands.filter(b => 
        (Array.isArray(brands) ? brands : [brands]).includes(b._id.toString())
      );
      matchStage.brand = { $in: filteredBrands.map(b => b._id) };
    }

    

    // aggregation pipeline
    let pipeline = [
      { $match: matchStage },
      {
        $lookup: {
          from: 'variants',
          localField: 'variants',
          foreignField: '_id',
          as: 'variantsData'
        }
      },
      { $unwind: '$variantsData' }
    ];

    // Add variant filtering conditions
    if (sizes || color) {
      let variantMatch = {};
      if (sizes) {
        variantMatch['variantsData.sizes'] = { $in: Array.isArray(sizes) ? sizes : [sizes] };
      }
      if (color) {
        variantMatch['variantsData.color'] = { $in: Array.isArray(color) ? color : [color] };
      }
      pipeline.push({ $match: variantMatch });
    }

    // Group back to actual products
    pipeline.push({
      $group: {
        _id: '$_id',
        name: { $first: '$name' },
        description: { $first: '$description' },
        gender: { $first: '$gender' },
        category: { $first: '$category' },
        brand: { $first: '$brand' },
        price: { $first: '$price' },
        variants: { $push: '$variantsData' },
        isListed: { $first: '$isListed' },
        createdAt: { $first: '$createdAt' } 
      }
    });

// add sorting
let sortStage = {};

switch (sortProducts) {
  case 'lowPrice':
    sortStage = { price: 1 };
    break;
  case 'highPrice':
    sortStage = { price: -1 };
    break;
  case 'a-to-z':
    sortStage = { name: 1 };
    break;
  case 'z-to-a':
    sortStage = { name: -1 };
    break;
  default:
    sortStage = { createdAt: 1 }; 
}

// sort when in newArrivals page
if (title === 'newArrivals' && sortProducts === undefined) {
  sortStage = { createdAt: -1 };
}

pipeline.push({ $sort: sortStage });

    // Add pagination
    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: limit });

    

    // Execute the aggregation
    const products = await Product.aggregate(pipeline);

    

    // count total products
    const countPipeline = pipeline.slice(0, -2); // Remove skip and limit stages
    countPipeline.push({ $count: 'total' });
    const totalProductsResult = await Product.aggregate(countPipeline);
    const totalProducts = totalProductsResult[0] ? totalProductsResult[0].total : 0;

    // Count products by gender
    const genderCountPipeline = [
      { $match: { isListed: true } },
      { $group: {
        _id: '$gender',
        count: { $sum: 1 }
      }}
    ];

    const genderCounts = await Product.aggregate(genderCountPipeline);
    const menCount = genderCounts.find(g => g._id === 'Men')?.count || 0;
    const womenCount = genderCounts.find(g => g._id === 'Women')?.count || 0;
    
    // modify the categoryCountPipeline
    const categoryCountPipeline = [
      { $match: {
        isListed: true,
      } },
      { $group: {
        _id: '$category',
        count: { $sum: 1 }
      }},
      { $lookup: {
        from: 'categories',
        localField: '_id',
        foreignField: '_id',
        as: 'categoryInfo'
      }},
      { $unwind: '$categoryInfo' },
      { $match: { 'categoryInfo.isListed': true } },
      { $project: {
        _id: 1,
        name: '$categoryInfo.name',
        count: 1
      }}
    ];

    const listedCategoriesWithCount = await Product.aggregate(categoryCountPipeline);
    

    const brandCountPipeline = [
      { $match: {
        isListed: true,
      } },
      { $group: {
        _id: '$brand',
        count: { $sum: 1 }
      }},
      { $lookup: {
        from: 'brands',
        localField: '_id',
        foreignField: '_id',
        as: 'brandInfo'
      }},
      { $unwind: '$brandInfo' },
      { $match: { 'brandInfo.isListed': true } },
      { $project: {
        _id: 1,
        name: '$brandInfo.name',
        count: 1
      }}
    ];


    const listedBrandsWithCount = await Product.aggregate(brandCountPipeline);



    // Prepare data for rendering
    const filteredBrands = brands ? (Array.isArray(brands) ? brands : [brands]) : [];
    const filteredCategories = categories ? (Array.isArray(categories) ? categories : [categories]) : [];
    const filteredSizes = sizes ? (Array.isArray(sizes) ? sizes : [sizes]) : [];
    const filteredColors = color ? (Array.isArray(color) ? color : [color]) : [];
    const filteredGender = gender ? (Array.isArray(gender) ? gender : [gender]) : [];

    const genders = ['Men', 'Women']
    const size = ['XS', 'S', 'M', 'L', 'XL'];
    const colors = [
      { name: 'Black', code: '#000000' },
      { name: 'White', code: '#fff1f1' }, 
      { name: 'Red', code: '#FF0000' },
      { name: 'Yellow', code: '#FFFF00' },
      { name: 'Blue', code: '#3399cc' },
      { name: 'Green', code: '#669933' },
      { name: 'Pink', code: '#f2719c' },
      { name: 'Gray', code: '#808080' },
      { name: 'Orange', code: '#FFA500' },
      { name: 'Brown', code: '#A52A2A' },
      { name: 'Purple', code: '#800080' },
      { name: 'Teal', code: '#008080' },
      { name: 'Navy', code: '#000080' },
      { name: 'Gold', code: '#FFD700' },
      { name: 'Cyan', code: '#00FFFF' },
    ];

    let user = null;
    let cart = null;
    let totalPrice = 0;
    

    if (req.userId) {
      // Fetch the user
      user = await User.findById(req.userId);

      if (user) {
        // Fetch the cart
        cart = await Cart.findOne({ user: req.userId })
          .populate('products.product')
          .populate('products.variant');
        
        if (cart && cart.products.length > 0) {
          // Calculate the total price
          cart.products.forEach((product) => {
            totalPrice += product.product.price * product.quantity;
          });
          
        }
      }
    }
    

  
    


    res.render('productsGrid', {
      user,
      title,
      products,
      cart: cart || { products: [] },
      totalPrice,
      brands: listedBrandsWithCount,
      categories: listedCategoriesWithCount,
      filteredBrands,
      filteredCategories,
      filteredSizes,
      filteredColors,
      filteredGender,
      size,
      colors,
      genders,
      page,
      totalPages: Math.ceil(totalProducts / limit),
      totalProducts,
      sorted: sortProducts,
      menCount, 
      womenCount,
      search,
    });
    

  } catch (error) {
    console.error('Error in productsGrid :', error);
    res.status(500).send('Server Error: ' + error.message);
  }
};


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
    let cart = null;
    let totalPrice = 0;
    

    if (req.userId) {
      // Fetch the user
      user = await User.findById(req.userId);

      if (user) {
        // Fetch the cart
        cart = await Cart.findOne({ user: req.userId })
          .populate('products.product')
          .populate('products.variant');
        
        if (cart && cart.products.length > 0) {
          // Calculate the total price
          cart.products.forEach((product) => {
            totalPrice += product.product.price * product.quantity;
          });
          
        }
      }
    }


    res.render('productSingle', {
      user,
      cart: cart || { products: [] },
      totalPrice,
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
    unlistProduct,
    listProduct,
    variants,
    loadAddVariant,
    addVariant,
    loadEditVariant,
    editVariant,
    product,
    productsGrid,

}


