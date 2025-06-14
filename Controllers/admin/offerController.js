const Product = require("../../Models/productModel");
const Category = require("../../Models/categoryModel");
const Offer = require("../../Models/offerModel");

const offers = async (req, res) => {
  try {
    const products = await Product.find();
    const categories = await Category.find();
    const productOffer = await Offer.find({ type: "products" }).populate(
      "products"
    );
    const categoryOffer = await Offer.find({ type: "categories" }).populate(
      "categories"
    );

    res.render("offers", {
      productOffer,
      categoryOffer,
      products,
      categories,
    });
  } catch (error) {
    console.error("Error loading offers", error.message);
  }
};

const addOffer = async (req, res) => {
  try {
    const { title, description, discount, status, type } = req.body;
    let offerData = { title, description, discount, type, status };
    let affectedProducts = [];

    if (type === "products") {
      offerData.products = JSON.parse(req.body.appliedProducts);
      affectedProducts = offerData.products;
    } else if (type === "categories") {
      offerData.categories = JSON.parse(req.body.appliedCategories);

      const categoryProducts = await Product.find({
        category: { $in: offerData.categories },
      })
        .select("_id")
        .lean();
      affectedProducts = categoryProducts.map((product) => product._id);
    } else {
      return res.json({ success: false, type, message: "Invalid offer type" });
    }

    const offer = new Offer(offerData);
    const saveOffer = await offer.save();

    if (saveOffer) {
      await Product.updateMany(
        { _id: { $in: affectedProducts } },
        { $addToSet: { offers: saveOffer._id } }
      );

      res.json({ success: true, type, message: "Offer added successfully" });
    } else {
      res.json({ success: false, type, message: "Failed to add offer" });
    }
  } catch (error) {
    console.error("Error adding offer:", error.message);
    res.json({ success: false, type, message: "Error adding offer" });
  }
};

const updateOffer = async (req, res) => {
  try {
    const { id, title, description, discount, status, type } = req.body;

    let offerData = {
      title,
      description,
      discount,
      status,
    };
    let affectedProducts = [];

    if (type === "products") {
      offerData.products = JSON.parse(req.body.appliedProducts);
      affectedProducts = offerData.products;
    } else if (type === "categories") {
      offerData.categories = JSON.parse(req.body.appliedCategories);

      const categoryProducts = await Product.find({
        category: { $in: offerData.categories },
      })
        .select("_id")
        .lean();
      affectedProducts = categoryProducts.map((product) => product._id);
    } else {
      return res.json({
        id,
        success: false,
        type,
        message: "Invalid offer type",
      });
    }

    const offer = await Offer.findByIdAndUpdate(id, offerData, { new: true });

    if (offer) {
      await Product.updateMany({ offers: id }, { $pull: { offers: id } });

      if (affectedProducts.length > 0) {
        await Product.updateMany(
          { _id: { $in: affectedProducts } },
          { $addToSet: { offers: id } }
        );
      }

      res.json({
        id,
        success: true,
        type,
        message: "Offer updated successfully",
      });
    } else {
      res.json({
        id,
        success: false,
        type,
        message: "Offer not found",
      });
    }
  } catch (error) {
    console.error("Error updating offer:", error.message);
    res.json({
      id: req.body.id,
      success: false,
      type: req.body.type,
      message: "Error updating offer",
    });
  }
};

const deleteOffer = async (req, res) => {
  try {
    const id = req.body.id;
    const offer = await Offer.findByIdAndDelete(id);

    if (offer) {
      res.json({
        id,
        success: true,
        message: "Offer deleted successfully",
      });
    } else {
      res.json({
        id,
        success: false,
        message: "Offer not found",
      });
    }
  } catch (error) {
    console.error("Error deleting offer:", error.message);
    res.json({
      success: false,
      message: "Error deleting offer",
    });
  }
};

module.exports = {
  offers,
  addOffer,
  updateOffer,
  deleteOffer,
};
