const User = require("../Models/userModel");
const Cart = require("../Models/cartModel");
const Product = require("../Models/productModel");
const Variant = require("../Models/variantModel");
const Offer = require('../Models/offerModel')

// -------View Cart--------->

const cart = async (req, res) => {
  try {
    let user = null;
    if (req.userId) {
      user = await User.findById(req.userId);
    }

    const cart = await Cart.findOne({ user: user._id })
      .populate({
        path: 'products.product',
        populate: {
          path: 'offers',
          model: 'Offer' 
        }
      })
      .populate('products.variant').lean()

    if (!cart || cart.products.length === 0) {
      res.render('cart', {
        user,
        cart: {
          products: [],
        },
      });
    } else {
      let originalSubTotal = 0;
      let discountedSubTotal = 0;
      let filteredProducts = cart.products.filter(product => product.quantity > 0);


      cart.products.forEach((cartProduct) => {
        let productPrice = cartProduct.product.price;

        originalSubTotal += productPrice * cartProduct.quantity;

        //  best offer 
        if (cartProduct.product.offers && cartProduct.product.offers.length > 0) {
          const bestOffer = cartProduct.product.offers.reduce((best, current) =>
            (current.discount > best.discount) ? current : best
          );
          const discountedPrice = productPrice * (1 - bestOffer.discount / 100);


          cartProduct.discountedPrice = Math.round(discountedPrice.toFixed(2));
          cartProduct.bestOffer = bestOffer;
        } else {
          cartProduct.discountedPrice = productPrice;
        }

        
        if (cartProduct.quantity > 0) {
          discountedSubTotal += cartProduct.discountedPrice * cartProduct.quantity;
        }
      });

      let shippingCharge = (discountedSubTotal >= 500 && discountedSubTotal !== 0) ? 0 : 50;
      let totalPriceCart = discountedSubTotal + shippingCharge;

      res.render('cart', {
        cart,
        user,
        originalSubTotal: Math.round(originalSubTotal.toFixed(2)),
        discountedSubTotal: Math.round(discountedSubTotal.toFixed(2)),
        shippingCharge,
        totalPriceCart: Math.round(totalPriceCart.toFixed(2)),
        filteredProducts 
      });
    }
  } catch (error) {
    console.log('Error loading cart', error);
    res.status(500).send('An error occurred while loading the cart.');
  }
}


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

const updateCart = async (req, res) => {
  try {
    const { cartId, index } = req.params;
    const { quantity } = req.body;

    const cart = await Cart.findById(cartId)
      .populate({
        path: 'products.product',
        populate: {
          path: 'offers',
          model: 'Offer'
        }
      })
      .populate('products.variant')
      .lean();

    if (cart && cart.products[index]) {
      // Update the quantity 
      cart.products[index].quantity = Math.min(quantity, 5);

      // find the price of all products after updating
      let originalSubTotal = 0;
      let discountedSubTotal = 0;

      cart.products.forEach((cartProduct, idx) => {
        const productPrice = cartProduct.product.price;
        originalSubTotal += productPrice * cartProduct.quantity;

        let discountedPrice = productPrice;
        if (cartProduct.product.offers && cartProduct.product.offers.length > 0) {
          const bestOffer = cartProduct.product.offers.reduce((best, current) =>
            (current.discount > best.discount) ? current : best
          );
          discountedPrice = productPrice * (1 - bestOffer.discount / 100);
          
         // update current product discount
          cart.products[idx].discountedPrice = Number(discountedPrice.toFixed(2));
          cart.products[idx].bestOffer = bestOffer;
        } else {
          cart.products[idx].discountedPrice = productPrice;
        }

        discountedSubTotal += discountedPrice * cartProduct.quantity;
      });

      // Save the updated cart
      await Cart.findByIdAndUpdate(cartId, { products: cart.products });

      // shipping charge and total price
      let shippingCharge = (discountedSubTotal >= 500 && discountedSubTotal !== 0) ? 0 : 50;
      let totalPriceCart = discountedSubTotal + shippingCharge;


      res.json({
        success: true,
        cart,
        index,
        originalSubTotal: Math.round(originalSubTotal.toFixed(2)),
        discountedSubTotal: Math.round(discountedSubTotal.toFixed(2)),
        shippingCharge,
        totalPriceCart: Math.round(totalPriceCart.toFixed(2))
      });
    } else {
      res.status(404).json({ success: false, message: 'Product not found in cart' });
    }
  } catch (error) {
    console.error('Error updating cart:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};


module.exports = {
  cart,
  addToCart,
  removeFromCart,
  updateCart
};
