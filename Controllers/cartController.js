const User = require("../Models/userModel");
const Cart = require("../Models/cartModel");
const Product = require("../Models/productModel");
const Variant = require("../Models/variantModel");

// -------View Cart--------->

const cart = async (req, res) => {
  try {
    let user = null;
    if (req.userId) {
      user = await User.findById(req.userId);
    }

    const cart = await Cart.findOne({ user: user._id })
      .populate("products.product")
      .populate("products.variant");

    if (!cart || cart.products.length === 0) {
      res.render("cart", {
        user,
        cart: {
          products: [],
        },
      });
    } else {
      let totalPrice = 0;

      cart.products.forEach((product) => {
        totalPrice += product.product.price * product.quantity;
      });

      res.render("cart", {
        cart,
        user,
        totalPrice,
      });
    }
  } catch (error) {
    console.log("Error loading cart", error);
    res.status(500).send("An error occurred while loading the cart.");
  }
};

// ------Add to Cart------>

const addToCart = async (req, res) => {
  try {
    const { productId, variantId, size, quantity } = req.body;
    const userId = req.userId;



    if (!userId) {
      return res.json({
        success: false,
        user: false,
        message: "User not authenticated.",
      });
    }

    const user = await User.findById(userId);
    const product = await Product.findById(productId);
    const variant = await Variant.findById(variantId);

    const existingCart = await Cart.findOne({ user: userId });

    if (existingCart) {
      const existingProduct = existingCart.products.find(
        (product) =>
          product.product._id == productId && product.variant._id == variantId
      );

      if (existingProduct) {
        console.log(typeof(existingProduct.quantity))
        existingProduct.quantity += Number(quantity);
        console.log(typeof(existingProduct.quantity))
      } else {
        existingCart.products.push({
          product: product._id,
          variant: variant._id,
          size: size,
          quantity: quantity,
        });
      }

      await existingCart.save();
    } else {
      const cart = new Cart({
        user: user._id,
        products: [
          {
            product: product._id,
            variant: variant._id,
            size: size,
            quantity: quantity,
          },
        ],
      });

      await cart.save();
    }

    res.json({
      success: true,
      message: "Product added to cart successfully.",
    });
  } catch (error) {
    console.log("Error adding product to cart", error);
    res.json({
      success: false,
      message: "An error occurred while adding the product to the cart.",
    });
  }
};

module.exports = {
  cart,
  addToCart,
};
