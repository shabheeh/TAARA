const Brand = require("../../Models/brandModel");

const brand = async (req, res) => {
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
    const brands = await Brand.aggregate([
      { $match: query },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "brand",
          as: "products",
        },
      },
      {
        $addFields: {
          productsCount: { $size: "$products" },
        },
      },
    ]);

    const totalBrands = await Brand.countDocuments();

    res.render("brands", {
      brands,
      totalBrands,
      page,
      limit,
      totalPages: Math.ceil(totalBrands / limit),
      searchTerm,
    });
  } catch (error) {
    console.error("Error getting brands:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const unlistBrand = async (req, res) => {
  try {
    const brandId = req.body.brandId;

    const unlistBrand = await Brand.findByIdAndUpdate(
      brandId,
      { isListed: false },
      { new: true }
    );

    if (!unlistBrand.isListed) {
      res.json({ isListed: false });
    } else {
      res.json({ isListed: true, message: "Error unlisting brand" });
    }
  } catch (error) {
    console.error("Error unlisting brand:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const listBrand = async (req, res) => {
  try {
    const brandId = req.body.brandId;
    const listBrand = await Brand.findByIdAndUpdate(
      brandId,
      { isListed: true },
      { new: true }
    );

    if (listBrand.isListed) {
      res.json({ isListed: true });
    } else {
      res.json({ isListed: false, message: "Error listing brand" });
    }
  } catch (error) {
    console.error("Error listing brand:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const addBrand = async (req, res) => {
  try {
    const { name, description, status } = req.body;

    const existingBrand = await Brand.findOne({
      name: new RegExp(`^${name}$`, "i"),
    });

    if (existingBrand) {
      return res.json({
        message: "Brand with same name already exists",
      });
    }

    const newBrand = new Brand({
      name: name,
      description: description,
      isListed: status,
    });

    await newBrand.save();

    res.json({
      success: "Brand added ",
    });
  } catch (error) {
    console.error("Error adding brand:", error.message);
    return res.json({ message: "Internal Server Error" });
  }
};

const editBrand = async (req, res) => {
  try {
    const { name, description, id } = req.body;

    const existingBrand = await Brand.findOne({
      name: new RegExp(`^${name}$`, "i"),
      _id: { $ne: id },
    });

    if (existingBrand) {
      return res.json({
        id: id,
        message: "Brand with the same name already exists",
      });
    }

    const updatedBrand = await Brand.findByIdAndUpdate(
      id,
      { name, description },
      { new: true }
    );

    if (!updatedBrand) {
      return res.json({
        id: id,
        message: "Brand not found",
      });
    }

    res.json({
      success: "Brand edited",
      brand: updatedBrand,
      id: id,
    });
  } catch (error) {
    console.error("error editing brand", error.message);
    res.json({
      message: "Server error",
    });
  }
};

module.exports = {
  brand,
  listBrand,
  unlistBrand,
  addBrand,
  editBrand,
};
