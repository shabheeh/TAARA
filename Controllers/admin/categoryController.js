const Category = require("../../Models/categoryModel");

const category = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const skip = (page - 1) * limit;
    let searchTerm = "";
    let query = {};

    if (req.query.search) {
      searchTerm = req.query.search.trim();
      query = {
        $or: [
          { name: new RegExp(searchTerm, "i") },
          { description: new RegExp(searchTerm, "i") },
        ],
      };
    }

    const categories = await Category.aggregate([
      { $match: query },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "category",
          as: "products",
        },
      },
      {
        $addFields: {
          productsCount: { $size: "$products" },
        },
      },
    ]);

    const totalCategories = await Category.countDocuments(query);

    res.render("categories", {
      categories,
      totalCategories,
      page,
      limit,
      totalPages: Math.ceil(totalCategories / limit),
      searchTerm,
    });
  } catch (error) {
    console.error("Error getting categories:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const addCategory = async (req, res) => {
  try {
    const { name, description, gender } = req.body;

    const existingCats = await Category.aggregate([
      {
        $match: {
          $and: [
            { name: new RegExp(`^${name}$`, "i") },
            { gender: { $eq: gender } },
          ],
        },
      },
    ]);

    if (existingCats.length > 0) {
      return res.json({
        message: "Category already exists with the same gender.",
      });
    }

    const newCat = new Category({
      name: name,
      description: description,
      gender: gender,
      isListed: true,
    });
    await newCat.save();

    return res.json({
      success: "Category added ",
    });
  } catch (error) {
    console.error("Error adding category:", error.message);
    return res.json({ message: "Internal Server Error" });
  }
};

const editCategory = async (req, res) => {
  try {
    const { name, description, gender, id } = req.body;

    const existingCat = await Category.findOne({
      name: { $regex: new RegExp(`^${name}$`, "i") },
      gender: gender,
      _id: { $ne: id },
    });

    if (existingCat) {
      return res.json({
        id: id,
        message: "Category with the same name and gender already exists",
      });
    }

    const updatedCategory = await Category.findByIdAndUpdate(
      id,
      { name, description, gender },
      { new: true }
    );

    if (!updatedCategory) {
      return res.json({
        id,
        success: false,
        message: "Category not found",
      });
    }

    res.json({
      id,
      success: true,
      message: "Category updated successfully",
    });
  } catch (error) {
    console.error("Error updating Product", error.message);
    res.json({
      success: false,
      message: "An error occurred while updating the category",
    });
  }
};

const unlistCategory = async (req, res) => {
  try {
    const categoryId = req.body.categoryId;

    const unlistCat = await Category.findByIdAndUpdate(
      categoryId,
      { isListed: false },
      { new: true }
    );

    if (!unlistCat.isListed) {
      res.json({ isListed: false });
    } else {
      res.json({ isListed: true, message: "Error unlisting category" });
    }
  } catch (error) {
    console.error("Error unlisting category:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const listCategory = async (req, res) => {
  try {
    const categoryId = req.body.categoryId;
    const listCat = await Category.findByIdAndUpdate(
      categoryId,
      { isListed: true },
      { new: true }
    );

    if (listCat.isListed) {
      res.json({ isListed: true });
    } else {
      res.json({ isListed: false, message: "Error listing category" });
    }
  } catch (error) {
    console.error("Error listing category:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

module.exports = {
  category,
  addCategory,
  editCategory,
  listCategory,
  unlistCategory,
};
