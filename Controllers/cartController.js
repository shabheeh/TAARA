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

      let subTotal = 0;

      let filteredProducts = [];

      filteredProducts = cart.products.filter(product => product.quantity > 0);

      

      cart.products.forEach((product) => {
        subTotal += product.product.price * product.quantity;
      });

      let shippingCharge = (subTotal >= 500 && subTotal !== 0) ? 0 : 50;
      let totalPrice = subTotal + shippingCharge;

      res.render("cart", {
        cart,
        user,
        subTotal,
        shippingCharge,
        totalPrice,
        filteredProducts
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
    const { variantId, quantity } = req.body;
    
    const userId = req.userId;

    if (!userId) {
      return res.json({
        success: false,
        user: false,
        message: "User not authenticated.",
      });
    }

    const user = await User.findById(userId);

    const variant = await Variant.findById(variantId);
    const productId = variant.product;
    const product = await Product.findById(productId);

    const size = req.body.size ? req.body.size : variant.sizes[0];

    const existingCart = await Cart.findOne({ user: userId });

    if (existingCart) {
      const existingProduct = existingCart.products.find(
        (product) =>
          product.product.toString() === productId.toString() &&
          product.variant.toString() === variantId.toString()
      );

      if (existingProduct) {
        existingProduct.quantity = Math.min(existingProduct.quantity + Number(quantity), 5);
      } else {
        existingCart.products.push({
          product: product._id,
          variant: variant._id,
          size: size,
          quantity: Number(quantity),
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
            quantity: Number(quantity),
          },
        ],
      });

      await cart.save();
    }

    res.json({
      success: true,
      message: "Added to cart",
    });
  } catch (error) {
    console.log("Error adding product to cart", error);
    res.json({
      success: false,
      message: "An error occurred while adding the product to the cart.",
    });
  }
};

// --------Remove from cart------->

const removeFromCart = async ( req, res ) => {

    try {
        const { index, cartId } = req.params;

        const cart = await Cart.findById(cartId).populate('products.product')
        .populate('products.variant');

        if (!cart) {
            return res.json({ 
              success: false,
              message: 'Cart not found' 
            });
        }


        if (index < 0 || index >= cart.products.length) {
            return res.json({ 
              success: false, 
              message: 'Invalid index' 
            });
        }

        cart.products.splice(index, 1);

        await cart.save();

        res.json({ 
          success: true,
          cart,
        
        });

    } catch (error) {
        console.error('Error removing product from cart:', error);
        res.json({ 
          success: false, 
          message: 'An error occurred while removing product from cart' 
        });
    }
}

// -------Update Cart------>

const updateCart = async ( req, res ) => {
  
  try {

  const { cartId, index } = req.params;
  const { quantity } = req.body;

  
      const cart = await Cart.findById(cartId).populate('products.product').populate('products.variant')
      if (cart && cart.products[index]) {
          cart.products[index].quantity = Math.min(quantity, 5); 
          await cart.save();

          res.json({ success: true, cart, index });
      } else {
          res.status(404).json({ success: false, message: 'Product not found in cart' });
      }
  } catch (error) {
      console.error('Error updating cart:', error.message);
      res.status(500).json({ success: false, message: 'Server error' });
  }
}

module.exports = {
  cart,
  addToCart,
  removeFromCart,
  updateCart
};
