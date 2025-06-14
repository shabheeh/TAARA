const Product = require("../../Models/productModel");
const Variant = require("../../Models/variantModel");
const Cart = require("../../Models/cartModel");

const variants = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    const variants = await Variant.find({ product: product._id });

    res.render("variants", { product, variants });
  } catch (error) {
    console.error("Error loading variants", error.message);
  }
};

const loadAddVariant = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    res.render("addVariant", {
      product,
    });
  } catch (error) {
    console.error("Error loading add variants", error);
  }
};

const addVariant = async (req, res) => {
  try {
    const id = req.body.productId;
    const color = req.body.variantColor;
    const colorCode = req.body.variantColorCode;
    const sizes = JSON.parse(req.body.variantSize);
    const quantity = req.body.variantQuantity;

    const imageFiles = req.files;
    const images = [];

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
};

const loadEditVariant = async (req, res) => {
  try {
    const variant = await Variant.findById(req.params.id);

    res.render("editVariant", {
      variant,
    });
  } catch (error) {
    console.error("Error loading edit variants", error);
  }
};

const editVariant = async (req, res) => {
  try {
    const { variantId, variantColor, variantColorCode, variantQuantity } =
      req.body;

    const sizes = JSON.parse(req.body.variantSize);

    const imageFiles = req.files;
    const images = [];

    for (let i = 1; i <= 4; i++) {
      const fieldName = `productImage${i}`;
      if (imageFiles[fieldName] && imageFiles[fieldName][0]) {
        images.push(imageFiles[fieldName][0].filename);
      } else {
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

module.exports = {
  variants,
  loadAddVariant,
  addVariant,
  loadEditVariant,
  editVariant,
};
