const Category = require("../../Models/categoryModel");
const Product = require("../../Models/productModel");
const Brand = require("../../Models/brandModel");
const Variant = require("../../Models/variantModel");
const User = require("../../Models/userModel");
const Offer = require("../../Models/offerModel");
const Review = require("../../Models/reviewModel");
const mongoose = require("mongoose");
const uploadToCloudinary = require("../../utils/uploadToCloudinary");

const products = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const skip = (page - 1) * limit;

    const { search, gender, category, brand, startDate, endDate } = req.query;

    const filters = {};
    const matchSearch = [];

    if (gender) filters.gender = gender;

    if (category && mongoose.Types.ObjectId.isValid(category)) {
      filters.category = new mongoose.Types.ObjectId(category);
    }

    if (brand && mongoose.Types.ObjectId.isValid(brand)) {
      filters.brand = new mongoose.Types.ObjectId(brand);
    }

    if (startDate || endDate) {
      const dateFilter = {};
      if (startDate) dateFilter.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        dateFilter.$lte = end;
      }
      filters.createdAt = dateFilter;
    }

    const searchTerm = search?.trim();
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      const numericSearch = parseFloat(searchTerm);

      matchSearch.push(
        { name: { $regex: searchTerm, $options: "i" } },
        { description: { $regex: searchTerm, $options: "i" } },
        { "category.name": { $regex: searchTerm, $options: "i" } },
        { "brand.name": { $regex: searchTerm, $options: "i" } },
        {
          $expr: {
            $eq: [{ $toLower: "$gender" }, lower],
          },
        }
      );

      if (!isNaN(numericSearch)) {
        matchSearch.push({ price: numericSearch });
      }
    }

    const pipeline = [
      { $match: filters },

      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "_id",
          as: "category",
        },
      },
      { $unwind: "$category" },
      {
        $lookup: {
          from: "brands",
          localField: "brand",
          foreignField: "_id",
          as: "brand",
        },
      },
      { $unwind: "$brand" },
      {
        $lookup: {
          from: "variants",
          localField: "variants",
          foreignField: "_id",
          as: "variants",
        },
      },

      ...(matchSearch.length > 0 ? [{ $match: { $or: matchSearch } }] : []),

      { $sort: { createdAt: -1 } },
      {
        $facet: {
          paginatedResults: [{ $skip: skip }, { $limit: limit }],
          totalCount: [{ $count: "count" }],
        },
      },
    ];

    const result = await Product.aggregate(pipeline);
    const products = result[0].paginatedResults;
    const totalCount = result[0].totalCount[0]?.count || 0;

    const brands = await Brand.find();
    const categories = await Category.find();

    res.render("products", {
      products,
      brands,
      categories,
      page,
      totalPages: Math.ceil(totalCount / limit),
      searchTerm: search || "",
      limit,
      totalProducts: totalCount,
      selectedGender: gender || "",
      selectedCategory: category || "",
      selectedBrand: brand || "",
      selectedStartDate: startDate || "",
      selectedEndDate: endDate || "",
    });
  } catch (error) {
    console.error("Error loading products:", error.message);
    res.status(500).send("Internal Server Error");
  }
};

const loadAddProduct = async (req, res) => {
  try {
    const brands = await Brand.find({ isListed: true });
    const categories = await Category.find({ isListed: true });

    res.render("addProduct3", {
      brands,
      categories,
    });
  } catch (error) {
    console.error("Error loading add products", error.message);
  }
};

const addProduct = async (req, res) => {
  try {
    const {
      productName,
      productDescription,
      productGender,
      productCategory,
      productBrand,
      productPrice,
      variantColor,
      variantColorCode,
      variantSize,
      variantQuantity,
    } = req.body;

    const sizes = JSON.parse(variantSize);

    const product = new Product({
      name: productName,
      description: productDescription,
      gender: productGender,
      category: productCategory,
      brand: productBrand,
      price: productPrice,
      isListed: true,
    });

    await product.save();

    const imageFiles = req.files;
    const images = [];

    for (let i = 1; i <= 4; i++) {
      const fieldName = `productImage${i}`;
      if (imageFiles[fieldName] && imageFiles[fieldName][0]) {
        const uploadResult = await uploadToCloudinary(
          imageFiles[fieldName][0],
          `TAARA/products/${product._id}`,
        );
        images.push(uploadResult.url);
      }
    }

    const variant = new Variant({
      color: variantColor,
      colorCode: variantColorCode,
      sizes,
      quantity: variantQuantity,
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
    if (req.fileValidationError) {
      return res.json({
        success: false,
        message: req.fileValidationError,
      });
    }
    res.json({
      success: false,
      message: "An error occurred while adding the Product",
    });
  }
};

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

const unlistProduct = async (req, res) => {
  try {
    const productId = req.body.productId;

    const unlistProduct = await Product.findByIdAndUpdate(
      productId,
      { isListed: false },
      { new: true }
    );

    if (!unlistProduct.isListed) {
      res.json({ isListed: false });
    } else {
      res.json({ isListed: true, message: "Error unlisting product" });
    }
  } catch (error) {
    console.error("Error unlisting product:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const listProduct = async (req, res) => {
  try {
    const productId = req.body.productId;
    const listProduct = await Product.findByIdAndUpdate(
      productId,
      { isListed: true },
      { new: true }
    );

    if (listProduct.isListed) {
      res.json({ isListed: true });
    } else {
      res.json({ isListed: false, message: "Error listing product" });
    }
  } catch (error) {
    console.error("Error listing product:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const productsGrid = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 9;
    const skip = (page - 1) * limit;

    const { title } = req.params;
    const { categories, brands, sizes, color, gender, sortProducts, search } =
      req.query;

    const listedCategories = await Category.find({ isListed: true }, "_id");
    const listedBrands = await Brand.find({ isListed: true }, "_id");

    let matchStage = {
      isListed: true,
      category: { $in: listedCategories.map((c) => c._id) },
      brand: { $in: listedBrands.map((b) => b._id) },
    };

    if (search) {
      matchStage.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    if (gender && gender.length !== 2) {
      matchStage.gender = gender;
    } else if (title === "Men") {
      matchStage.gender = "Men";
    } else if (title === "Women") {
      matchStage.gender = "Women";
    }

    if (title === "newArrivals") {
      const newProductDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      matchStage.createdAt = { $gt: newProductDate };
    }

    if (categories) {
      const filteredCategories = listedCategories.filter((c) =>
        (Array.isArray(categories) ? categories : [categories]).includes(
          c._id.toString()
        )
      );
      matchStage.category = { $in: filteredCategories.map((c) => c._id) };
    }

    if (brands) {
      const filteredBrands = listedBrands.filter((b) =>
        (Array.isArray(brands) ? brands : [brands]).includes(b._id.toString())
      );
      matchStage.brand = { $in: filteredBrands.map((b) => b._id) };
    }

    let pipeline = [
      { $match: matchStage },
      {
        $lookup: {
          from: "variants",
          localField: "_id",
          foreignField: "product",
          as: "variants",
        },
      },
      {
        $match: {
          "variants.isListed": true,
        },
      },
    ];

    if (color && color.length > 0) {
      pipeline.push({
        $match: {
          "variants.color": { $in: Array.isArray(color) ? color : [color] },
        },
      });
    }

    if (sizes && sizes.length > 0) {
      pipeline.push({
        $match: {
          "variants.sizes": { $in: Array.isArray(sizes) ? sizes : [sizes] },
        },
      });
    }

    const countPipeline = [...pipeline];

    pipeline.push({
      $sort: sortProducts ? getSortStage(sortProducts) : { createdAt: 1 },
    });

    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: limit });

    pipeline.push(
      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "_id",
          as: "category",
        },
      },
      { $unwind: "$category" },
      {
        $lookup: {
          from: "brands",
          localField: "brand",
          foreignField: "_id",
          as: "brand",
        },
      },
      { $unwind: "$brand" }
    );

    const products = await Product.aggregate(pipeline);

    countPipeline.push({ $count: "total" });
    const totalProductsResult = await Product.aggregate(countPipeline);
    const totalProducts = totalProductsResult[0]
      ? totalProductsResult[0].total
      : 0;

    const genderCountPipeline = [
      { $match: { isListed: true } },
      {
        $group: {
          _id: "$gender",
          count: { $sum: 1 },
        },
      },
    ];

    let catGenderMatch = {};
    if (title === "Men") {
      catGenderMatch.gender = "Men";
    } else if (title === "Women") {
      catGenderMatch.gender = "Women";
    }

    const genderCounts = await Product.aggregate(genderCountPipeline);
    const menCount = genderCounts.find((g) => g._id === "Men")?.count || 0;
    const womenCount = genderCounts.find((g) => g._id === "Women")?.count || 0;

    const categoryCountPipeline = [
      {
        $match: {
          isListed: true,
          ...catGenderMatch,
        },
      },
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: "categories",
          localField: "_id",
          foreignField: "_id",
          as: "categoryInfo",
        },
      },
      { $unwind: "$categoryInfo" },
      { $match: { "categoryInfo.isListed": true } },
      {
        $project: {
          _id: 1,
          name: "$categoryInfo.name",
          count: 1,
        },
      },
    ];

    const listedCategoriesWithCount = await Product.aggregate(
      categoryCountPipeline
    );

    const brandCountPipeline = [
      {
        $match: {
          isListed: true,
        },
      },
      {
        $group: {
          _id: "$brand",
          count: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: "brands",
          localField: "_id",
          foreignField: "_id",
          as: "brandInfo",
        },
      },
      { $unwind: "$brandInfo" },
      { $match: { "brandInfo.isListed": true } },
      {
        $project: {
          _id: 1,
          name: "$brandInfo.name",
          count: 1,
        },
      },
    ];

    const listedBrandsWithCount = await Product.aggregate(brandCountPipeline);

    const offerIds = products.reduce((ids, product) => {
      if (product.offers && Array.isArray(product.offers)) {
        return ids.concat(product.offers);
      }
      return ids;
    }, []);

    const offers = await Offer.find({
      _id: { $in: offerIds },
      status: "Active",
    }).lean();

    const newProduct = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    products.forEach((product) => {
      product.isNew = product.createdAt > newProduct;
      if (
        product.offers &&
        Array.isArray(product.offers) &&
        product.offers.length > 0
      ) {
        const productOffers = offers.filter((offer) =>
          product.offers.some(
            (offerId) => offerId.toString() === offer._id.toString()
          )
        );
        if (productOffers.length > 0) {
          const bestOffer = productOffers.reduce((best, current) =>
            current.discount > best.discount ? current : best
          );
          product.bestOffer = bestOffer;
          product.discountedPrice = Number(
            (product.price * (1 - bestOffer.discount / 100)).toFixed(2)
          );
        } else {
          product.discountedPrice = Number(product.price.toFixed(2));
        }
      } else {
        product.discountedPrice = Number(product.price.toFixed(2));
      }
    });

    const filteredBrands = brands
      ? Array.isArray(brands)
        ? brands
        : [brands]
      : [];
    const filteredCategories = categories
      ? Array.isArray(categories)
        ? categories
        : [categories]
      : [];
    const filteredSizes = sizes ? (Array.isArray(sizes) ? sizes : [sizes]) : [];
    const filteredColors = color
      ? Array.isArray(color)
        ? color
        : [color]
      : [];
    const filteredGender = gender
      ? Array.isArray(gender)
        ? gender
        : [gender]
      : [];

    const genders = ["Men", "Women"];
    const size = ["XS", "S", "M", "L", "XL"];
    const colors = [
      { name: "Black", code: "#000000" },
      { name: "White", code: "#fff1f1" },
      { name: "Red", code: "#FF0000" },
      { name: "Yellow", code: "#FFFF00" },
      { name: "Blue", code: "#3399cc" },
      { name: "Green", code: "#669933" },
      { name: "Pink", code: "#f2719c" },
      { name: "Gray", code: "#808080" },
      { name: "Orange", code: "#FFA500" },
      { name: "Brown", code: "#A52A2A" },
      { name: "Purple", code: "#800080" },
      { name: "Teal", code: "#008080" },
      { name: "Navy", code: "#000080" },
      { name: "Gold", code: "#FFD700" },
      { name: "Cyan", code: "#00FFFF" },
      { name: "Khaki", code: "#F0E68C" },
    ];

    let user = null;

    if (req.userId) {
      user = await User.findById(req.userId);
    }

    res.render("productsGrid", {
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
    console.error("Error in productsGrid :", error);
    res.status(500).send("Server Error: " + error.message);
  }
};

function getSortStage(sortProducts) {
  switch (sortProducts) {
    case "lowPrice":
      return { price: 1 };
    case "highPrice":
      return { price: -1 };
    case "a-to-z":
      return { name: 1 };
    case "z-to-a":
      return { name: -1 };
    default:
      return { createdAt: 1 };
  }
}

const productView = async (req, res) => {
  try {
    const productId = req.params.id;
    const variantId = req.params.variantId;

    const product = await Product.findById(productId)
      .populate("variants")
      .populate("category")
      .populate("offers")
      .lean();

    const reviews = await Review.find({
      product: productId,
      isListed: true,
    }).populate("user");

    if (!product) {
      return res.status(404).send("Product not found");
    }

    let variant = product.variants.find((variant) => variant._id == variantId);

    if (!variant) {
      return res.status(404).send("Variant not found");
    }

    const category = product.category._id;

    const similarProducts = await Product.find({ category })
      .populate("variants")
      .populate("category")
      .populate("brand")
      .populate("offers")
      .lean();

    const newProductDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    product.isNew = product.createdAt > newProductDate;

    if (
      product.offers &&
      Array.isArray(product.offers) &&
      product.offers.length > 0
    ) {
      const activeOffers = product.offers.filter(
        (offer) => offer.status === "Active"
      );
      if (activeOffers.length > 0) {
        const bestOffer = activeOffers.reduce((best, current) =>
          current.discount > best.discount ? current : best
        );
        product.bestOffer = bestOffer;
        product.discountedPrice = Number(
          (product.price * (1 - bestOffer.discount / 100)).toFixed(2)
        );
      } else {
        product.discountedPrice = Number(product.price.toFixed(2));
      }
    } else {
      product.discountedPrice = Number(product.price.toFixed(2));
    }

    similarProducts.forEach((similarProduct) => {
      similarProduct.isNew = similarProduct.createdAt > newProductDate;
      if (
        similarProduct.offers &&
        Array.isArray(similarProduct.offers) &&
        similarProduct.offers.length > 0
      ) {
        const activeOffers = similarProduct.offers.filter(
          (offer) => offer.status === "Active"
        );
        if (activeOffers.length > 0) {
          const bestOffer = activeOffers.reduce((best, current) =>
            current.discount > best.discount ? current : best
          );
          similarProduct.bestOffer = bestOffer;
          similarProduct.discountedPrice = Number(
            (similarProduct.price * (1 - bestOffer.discount / 100)).toFixed(2)
          );
        } else {
          similarProduct.discountedPrice = Number(
            similarProduct.price.toFixed(2)
          );
        }
      } else {
        similarProduct.discountedPrice = Number(
          similarProduct.price.toFixed(2)
        );
      }
    });

    let user = null;
    let avgRating = null;
    if (reviews) {
      const ratings = reviews.reduce((acc, curr) => acc + curr.rating, 0);
      avgRating = ratings / reviews.length;
    }

    if (req.userId) {
      user = await User.findById(req.userId);
    }

    res.render("productSingle", {
      user,
      product,
      reviews: reviews ? reviews : [],
      avgRating,
      variant,
      similarProducts,
    });
  } catch (error) {
    console.error(error);
    res.render("500");
  }
};

module.exports = {
  products,
  loadAddProduct,
  addProduct,
  editProduct,
  unlistProduct,
  listProduct,
  productView,
  productsGrid,
};
