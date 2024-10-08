const Category = require("../Models/categoryModel");
const Product = require("../Models/productModel");
const Brand = require("../Models/brandModel");
const Variant = require("../Models/variantModel")
const User = require('../Models/userModel')
const Cart = require('../Models/cartModel')
const Offer = require('../Models/offerModel')
const Review = require('../Models/reviewModel');
const Order = require('../Models/orderModel')



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
    console.error('Error loading products', error.message);
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
    console.error("Error loading add products", error.message);
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
      message: "Product Added successfully",
    });

  } catch (error) {
    console.error("Error Adding Product", error.message);
    res.json({
      success: false,
      message: "An error occurred while adding the Product",
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
    console.error("Error Editing Product", error.message);
    res.json({
      id: req.body.id,
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
    console.error('Error loading variants' , error.message)
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
    console.error('Error loading add variants' , error)
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
    console.error("Error Adding Variant", error.message);
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
    console.error('Error loading edit variants' , error)
  }
}

// ------Edit Variant------>

const editVariant = async (req, res) => {
  try {
    const { variantId, variantColor, variantColorCode, variantQuantity } =
      req.body;

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

    const updateVariant = await Variant.findByIdAndUpdate(
      { _id: variantId },
      {
        color: variantColor,
        colorCode: variantColorCode,
        sizes: sizes,
        quantity: variantQuantity,
        images: images,
      },
      { new: true }
    );

    if (!updateVariant) {
      return res.json({
        success: false,
        message: "Variant not found",
      });
    }

    // update product quantity in carts according to the quantity of that products.
    const carts = await Cart.find({ "products.variant": variantId });

    for (const cart of carts) {
      for (const item of cart.products) {
        if (
          item.variant == variantId &&
          item.quantity > updateVariant.quantity
        ) {
          item.quantity = updateVariant.quantity;
        }
      }
      await cart.save();
    }

    const variant = await Variant.findById({ _id: variantId });

    res.json({
      id: variant.product._id,
      success: true,
      message: "Variant updated successfully",
    });
  } catch (error) {
    console.error("Error Editing Variant", error.message);
    if (req.fileValidationError) {
      return res.json({
        success: false,
        message: req.fileValidationError,
      });
    }
    res.json({
      success: false,
      message: "An error occurred while updating the Variant",
    });
  }
};

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

    // Filter for new arrivals
    if (title === 'newArrivals') {
      const newProductDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      matchStage.createdAt = { $gt: newProductDate };
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

    let pipeline = [
      { $match: matchStage },
      {
        $lookup: {
          from: 'variants',
          localField: '_id',
          foreignField: 'product',
          as: 'variants'
        }
      },
      {
        $match: {
          'variants.isListed': true
        }
      }
    ];

    // Add color filter
    if (color && color.length > 0) {
      pipeline.push({
        $match: {
          'variants.color': { $in: Array.isArray(color) ? color : [color] }
        }
      });
    }

    // Add size filter
    if (sizes && sizes.length > 0) {
      pipeline.push({
        $match: {
          'variants.sizes': { $in: Array.isArray(sizes) ? sizes : [sizes] }
        }
      });
    }

    // Create a copy of the pipeline for counting
    const countPipeline = [...pipeline];

    // Add sorting stage
    pipeline.push({
      $sort: sortProducts ? getSortStage(sortProducts) : { createdAt: 1 }
    });

    // Add pagination
    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: limit });

    // Add population stages
    pipeline.push(
      { $lookup: { from: 'categories', localField: 'category', foreignField: '_id', as: 'category' } },
      { $unwind: '$category' },
      { $lookup: { from: 'brands', localField: 'brand', foreignField: '_id', as: 'brand' } },
      { $unwind: '$brand' }
    );

    const products = await Product.aggregate(pipeline);

    // Count total products
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

    let catGenderMatch = {};
    if (title === 'Men') {
      catGenderMatch.gender = 'Men';
    } else if ( title === 'Women'){
      catGenderMatch.gender = 'Women';
    }

    const genderCounts = await Product.aggregate(genderCountPipeline);
    const menCount = genderCounts.find(g => g._id === 'Men')?.count || 0;
    const womenCount = genderCounts.find(g => g._id === 'Women')?.count || 0;
    
    // modify the categoryCountPipeline
    const categoryCountPipeline = [
      { $match: {
        isListed: true,
        ...catGenderMatch 
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

    // Get all offer IDs from the products
    const offerIds = products.reduce((ids, product) => {
      if (product.offers && Array.isArray(product.offers)) {
        return ids.concat(product.offers);
      }
      return ids;
    }, []);

    // Fetch all relevant offers
    const offers = await Offer.find({ 
      _id: { $in: offerIds },
      status: 'Active'
    }).lean();

    // Process offers for each product
    const newProduct = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    products.forEach(product => {
      product.isNew = product.createdAt > newProduct;
      if (product.offers && Array.isArray(product.offers) && product.offers.length > 0) {
        const productOffers = offers.filter(offer => 
          product.offers.some(offerId => offerId.toString() === offer._id.toString())
        );
        if (productOffers.length > 0) {
          const bestOffer = productOffers.reduce((best, current) => 
            (current.discount > best.discount) ? current : best
          );
          product.bestOffer = bestOffer;
          product.discountedPrice = Number((product.price * (1 - bestOffer.discount / 100)).toFixed(2));
        } else {
          product.discountedPrice = Number(product.price.toFixed(2));
        }
      } else {
        product.discountedPrice = Number(product.price.toFixed(2));
      }
    });

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
      { name: 'Khaki', code: '#F0E68C'},
    ];

    let user = null;



    if (req.userId) {
      // Fetch the user
      user = await User.findById(req.userId);
    }

    res.render('productsGrid', {
      user,
      title,
      products,

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

// Helper function to get sort stage
function getSortStage(sortProducts) {
  switch (sortProducts) {
    case 'lowPrice':
      return { price: 1 };
    case 'highPrice':
      return { price: -1 };
    case 'a-to-z':
      return { name: 1 };
    case 'z-to-a':
      return { name: -1 };
    default:
      return { createdAt: 1 };
  }
}


// ------Product View------>

const productView = async (req, res) => {
  try {
    const productId = req.params.id;
    const variantId = req.params.variantId;

    const product = await Product.findById(productId)
      .populate('variants')
      .populate('category')
      .populate('offers')
      .lean();  // Use lean() for better performance
    
    const reviews = await Review.find({product: productId, isListed: true}).populate('user')

    if (!product) {
      return res.status(404).send('Product not found');
    }

    let variant = product.variants.find((variant) => variant._id == variantId);

    if (!variant) {
      return res.status(404).send('Variant not found');
    }

    const category = product.category._id;

    const similarProducts = await Product.find({ category })
      .populate('variants')
      .populate('category')
      .populate('brand')
      .populate('offers')
      .lean();

    // Process offers for the main product
    const newProductDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    product.isNew = product.createdAt > newProductDate;

    if (product.offers && Array.isArray(product.offers) && product.offers.length > 0) {
      const activeOffers = product.offers.filter(offer => offer.status === 'Active');
      if (activeOffers.length > 0) {
        const bestOffer = activeOffers.reduce((best, current) => 
          (current.discount > best.discount) ? current : best
        );
        product.bestOffer = bestOffer;
        product.discountedPrice = Number((product.price * (1 - bestOffer.discount / 100)).toFixed(2));
      } else {
        product.discountedPrice = Number(product.price.toFixed(2));
      }
    } else {
      product.discountedPrice = Number(product.price.toFixed(2));
    }

    // Process offers for similar products
    similarProducts.forEach(similarProduct => {
      similarProduct.isNew = similarProduct.createdAt > newProductDate;
      if (similarProduct.offers && Array.isArray(similarProduct.offers) && similarProduct.offers.length > 0) {
        const activeOffers = similarProduct.offers.filter(offer => offer.status === 'Active');
        if (activeOffers.length > 0) {
          const bestOffer = activeOffers.reduce((best, current) => 
            (current.discount > best.discount) ? current : best
          );
          similarProduct.bestOffer = bestOffer;
          similarProduct.discountedPrice = Number((similarProduct.price * (1 - bestOffer.discount / 100)).toFixed(2));
        } else {
          similarProduct.discountedPrice = Number(similarProduct.price.toFixed(2));
        }
      } else {
        similarProduct.discountedPrice = Number(similarProduct.price.toFixed(2));
      }
    });

    let user = null;
    let avgRating = null
    if( reviews){
      const ratings = reviews.reduce((acc, curr) => acc + curr.rating ,0)
      avgRating = ratings/reviews.length
    }

    if (req.userId) {
      // Fetch the user
      user = await User.findById(req.userId);
    }

    res.render('productSingle', {
      user,
      product,
      reviews: reviews ? reviews : [],
      avgRating,
      variant,
      similarProducts,
    });
  } catch (error) {
    console.error(error);
    res.render('500')
  }
};

// -------reviews-------->
const review = async (req, res) => {
  try {
    const { orderId, productId, variantId, title, comment, rating } = req.body;

    const order = await Order.findById(orderId);
    const product = await Product.findById(productId);

    if (!order) {
      return res.json({
        success: false,
        message: 'Order not found',
        orderId,
        variantId
      });
    }

    if (!product) {
      return res.json({
        success: false,
        message: 'Product not found',
        orderId,
        variantId
      });
    }

    const existingReview = await Review.findOne({order: orderId, product: productId})

    if (existingReview) {
      return res.json({
        success: false,
        message: 'Review already exists',
        orderId,
        variantId
      });
    }

    const review = new Review({
      product: productId,
      user: order.user,
      title: title,
      comment: comment,
      rating: rating,
      order: orderId,
    });

    await review.save();

    return res.json({
      success: true,
      message: 'Review submitted successfully',
      orderId,
      variantId
    });
  } catch (error) {
    console.error('Error submitting review:', error.message);
    return res.json({
      success: false,
      message: 'Error submitting review'
    });
  }
}

// -----edit Review----->

const editReview = async (req, res) => {
  try {
    const { orderId, productId, title, comment, rating } = req.body;
    const order = await Order.findById(orderId);
    const product = await Product.findById(productId);

    if (!order) {
      return res.json({ 
        success: false, 
        message: 'Order not found'
      });
    }

    if (!product) {
      return res.json({ 
        success: false, 
        message: 'Product not found'
      });
    }
    
    const updatedReview = await Review.findOneAndUpdate(
      { product: productId, order: orderId },
      {
        $set: {
          title: title,
          comment: comment,
          rating: rating
        }
      },
      { new: true }
    );

    if (!updatedReview) {
      return res.json({
        success: false,
        message: 'Review not found'
      });
    }

    return res.json({
      success: true,
      message: 'Review updated successfully',
      review: updatedReview
    });

  } catch (error) {
    console.error('error editing review', error.message);
    return res.json({
      success: false,
      message: 'Error editing review'
    });
  }
};

//  ------reviews Admin----->

const reviews = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const searchTerm = req.query.search ? req.query.search.trim() : '';
    const filter = req.query.filter || '';

    let matchStage = {};

    if (searchTerm) {
      matchStage['product.name'] = { $regex: searchTerm, $options: 'i' };
    }

    if (filter === 'published') {
      matchStage.isListed = true;
    } else if (filter === 'unpublished') {
      matchStage.isListed = false;
    }

    let pipeline = [
      {
        $lookup: {
          from: 'products',
          localField: 'product',
          foreignField: '_id',
          as: 'product',
        },
      },
      { $unwind: '$product' },
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
      {
        $lookup: {
          from: 'brands',
          localField: 'product.brand',
          foreignField: '_id',
          as: 'product.brand',
        },
      },
      { $unwind: '$product.brand' },
      {
        $lookup: {
          from: 'variants',
          localField: 'product.variants',
          foreignField: '_id',
          as: 'product.variants',
        },
      },
      { $match: matchStage },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
    ];

    const reviews = await Review.aggregate(pipeline);

    const totalReviews = await Review.aggregate([
      { $match: matchStage },
      { $count: 'count' },
    ]);

    const totalCount = totalReviews.length > 0 ? totalReviews[0].count : 0;

    res.render('reviews', {
      reviews,
      totalReviews: totalCount,
      page,
      totalPages: Math.ceil(totalCount / limit),
      limit,
      searchTerm,
      filter,
    });
  } catch (error) {
    console.error('Error listing reviews:', error.message);
    res.render('error', { error });
  }
};


// ------publsh/unpublish review-------->

const reviewStatus = async (req, res) => {
  try {
    const id = req.body.reviewId;

    const review = await Review.findById(id);

    if (!review) {
      return res.json({
        success: false,
        message: 'Review not found'
      });
    }

    const updatedReview = await Review.findByIdAndUpdate(
      id,
      { $set: { isListed: !review.isListed } },
      { new: true }
    );

    res.json({
      success: true,
      message: 'Review status updated',
      review: updatedReview
    });

  } catch (error) {
    console.error('error changing listed reviews', error.message);
    res.json({
      success: false,
      message: 'Error changing review status'
    });
  }
};

// -----delete Review----->


const deleteReview = async ( req, res ) => {

  try {
      const id = req.body.id
      const review = await Review.findByIdAndDelete(id);

      if(review){
          res.json({
              id,
              success: true,
              message: 'Review deleted successfully'
          });

      } else {
          res.json({
              id,
              success: false,
              message: 'Review not found'
          });
      }

  } catch (error) {
      console.error('Error deleting review:', error.message);
      res.json({
          success: false,
          message: 'Error deleting review'
      });
      
  }
}

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
    productView,
    productsGrid,
    review,
    editReview,
    reviews,
    reviewStatus,
    deleteReview,
    

}


