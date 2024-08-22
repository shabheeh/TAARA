const User = require("../Models/userModel");
const Cart = require("../Models/cartModel");
const Product = require("../Models/productModel");
const Variant = require("../Models/variantModel");
const Wishlist = require('../Models/wishlistModel')

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
    console.error('Error loading cart', error);
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

    // Check if the variant is in stock
    if (variant.quantity === 0) {
      return res.json({
        success: false,
        user: true,
        message: "Product is out of stock.",
      });
    }

    const productId = variant.product;
    const product = await Product.findById(productId);
    const size = req.body.size ? req.body.size : variant.sizes[0];
    const existingCart = await Cart.findOne({ user: userId });

    if (existingCart) {
      // Check if the product with the same variant is already in the cart
      const existingProduct = existingCart.products.find(
        (product) =>
          product.product.toString() === productId.toString() &&
          product.variant.toString() === variantId.toString() &&
          product.size === size
      );

      if (existingProduct) {
        return res.json({
          success: false,
          user : true,
          message: "Product already added to cart.",
        });
      }

      existingCart.products.push({
        product: product._id,
        variant: variant._id,
        size: size,
        quantity: Number(quantity),
      });

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
      message: "Added to cart.",
    });
  } catch (error) {
    console.error("Error adding product to cart", error);
    res.json({
      success: false,
      message: "An error occurred while adding the product to the cart.",
    });
  }
};



// --------Remove from cart------->

const removeFromCart = async (req, res) => {
  try {
      const { variantId, cartId } = req.params;

      const cart = await Cart.findById(cartId)
      .populate({
        path: 'products.product',
        populate: {
          path: 'offers',
          model: 'Offer'
        }
      })
      .populate('products.variant')
    

      if (!cart) {
          return res.json({ 
              success: false,
              message: 'Cart not found' 
          });
      }

      const productIndex = cart.products.findIndex(
          (product) => product.variant._id.toString() === variantId
      );
  
      if (productIndex === -1) {
          return res.json({
              success: false,
              message: 'Product variant not found in cart',
          });
      }
  
      cart.products.splice(productIndex, 1);
  
      await cart.save();

      // Recalculate totals
      let originalSubTotal = 0;
      let discountedSubTotal = 0;

      cart.products.forEach((cartProduct) => {
          const productPrice = cartProduct.product.price;
          const quantity = cartProduct.quantity;

          originalSubTotal += productPrice * quantity;

          let discountedPrice = productPrice;
          if (cartProduct.product.offers && cartProduct.product.offers.length > 0) {
              const bestOffer = cartProduct.product.offers.reduce((best, current) =>
                  (current.discount > best.discount) ? current : best
              );
              discountedPrice = productPrice * (1 - bestOffer.discount / 100);
          }

          discountedSubTotal += discountedPrice * quantity;
      });

      // Calculate shipping charge and total price
      const shippingCharge = (discountedSubTotal >= 500 && discountedSubTotal !== 0) ? 0 : 50;
      const totalPriceCart = discountedSubTotal + shippingCharge;


      res.json({ 
          success: true,
          cart,
          originalSubTotal,
          discountedSubTotal,
          shippingCharge,
          totalPriceCart,
          variantId,
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
    const { cartId, variantId } = req.params;
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

    if (!cart) {
      return res.status(404).json({ success: false, message: 'Cart not found' });
    }

    // Find the index of the product based on the variantId
    const productIndex = cart.products.findIndex(
      (product) => product.variant._id.toString() === variantId
    );

    if (productIndex === -1) {
      return res.status(404).json({ success: false, message: 'Product variant not found in cart' });
    }

    // Update the quantity
    cart.products[productIndex].quantity = Math.min(quantity, 5);

    // Calculate the price of all products after updating
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
        
        // Update current product discount
        cart.products[idx].discountedPrice = Number(discountedPrice.toFixed(2));
        cart.products[idx].bestOffer = bestOffer;
      } else {
        cart.products[idx].discountedPrice = productPrice;
      }

      discountedSubTotal += discountedPrice * cartProduct.quantity;
    });

    // Save the updated cart
    await Cart.findByIdAndUpdate(cartId, { products: cart.products });

    // Calculate shipping charge and total price
    let shippingCharge = (discountedSubTotal >= 500 && discountedSubTotal !== 0) ? 0 : 50;
    let totalPriceCart = discountedSubTotal + shippingCharge;

    res.json({
      success: true,
      cart,
      originalSubTotal: Math.round(originalSubTotal.toFixed(2)),
      discountedSubTotal: Math.round(discountedSubTotal.toFixed(2)),
      shippingCharge,
      totalPriceCart: Math.round(totalPriceCart.toFixed(2)),
      variantId,
    });
  } catch (error) {
    console.error('Error updating cart:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};


// -----proceed to checkout----->

const proceedToCheckout = async (req, res) => {
  try {
    const cartId = req.body.cart;
    const cart = await Cart.findById(cartId).populate('products.product').populate('products.variant');

    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }
    // check the cart is with only empty product.stock
    const isNOStock = cart.products.every(item => item.variant.quantity === 0);

    if (isNOStock) {
      return res.status(400).json({ 
        success: false,
        message: 'Products in the cart are out of stock' });
    }

    res.status(200).json({ 
      success: true,
      message: 'Proceed to checkout', 
    });

  } catch (error) {
    console.error('Error proceeding to checkout', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};




// -----wishlist------>

const wishlist = async (req, res) => {
  try {
    const userId = req.userId;

    // Fetch user, wishlist, and cart data concurrently
    const [user, wishlist, cart] = await Promise.all([
      User.findById(userId),
      Wishlist.findOne({ user: userId })
        .populate({
          path: 'products.product',
          populate: {
            path: 'offers',
            model: 'Offer' // Assuming the offers field is populated
          }
        })
        .populate('products.variant'),
      Cart.findOne({ user: userId })
        .populate('products.product')
        .populate('products.variant'),
    ]);

    // Process offers for products in the wishlist
    if (wishlist && wishlist.products.length > 0) {
      wishlist.products.forEach(product => {
        const offers = product.product.offers || [];
        const activeOffers = offers.filter(offer => offer.status === 'Active');

        if (activeOffers.length > 0) {
          const bestOffer = activeOffers.reduce((best, current) => 
            (current.discount > best.discount) ? current : best
          );

          product.bestOffer = bestOffer;
          product.discountedPrice = Number((product.product.price * (1 - bestOffer.discount / 100)).toFixed(2));
        } else {
          product.discountedPrice = Number(product.product.price.toFixed(2));
        }
      });
    }

    // Render the wishlist page
    res.render('wishlist', {
      wishlist: wishlist || { products: [] },
      user,

    });
  } catch (error) {
    console.error('Error loading wishlist:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};


// ------Add to Wishlist------>

const addToWishlist = async (req, res) => {
  try {
    const { variantId } = req.body;
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

    const existingWishlist = await Wishlist.findOne({ user: userId });

    if (existingWishlist) {
      const existingProduct = existingWishlist.products.find(
        (product) =>
          product.product.toString() === productId.toString() &&
          product.variant.toString() === variantId.toString()
      );

      if (existingProduct) {
        return res.json({
          success: false,
          user: true,
          message: 'Product already in the wishlist'
        });
      } else {
        existingWishlist.products.push({
          product: product._id, 
          variant: variant._id,
        });
        await existingWishlist.save();
      }
    } else {
      const wishlist = new Wishlist({
        user: user._id,
        products: [
          {
            product: product._id,
            variant: variant._id,
          },
        ],
      });
      await wishlist.save();
    }

    return res.json({
      success: true,
      user: true,
      message: "Added to wishlist",
    });
  } catch (error) {
    console.error("Error adding product to Wishlist", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while adding the product to the wishlist.",
    });
  }
};


// --------Remove from Wishlist------->

const removeFromWishlist = async (req, res) => {
  try {
    const { variantId, wishlistId } = req.params;

    const wishlist = await Wishlist.findById(wishlistId)
      .populate('products.product')
      .populate('products.variant');

    if (!wishlist) {
      return res.json({
        success: false,
        message: 'Wishlist not found',
      });
    }

    const productIndex = wishlist.products.findIndex(
      (product) => product.variant._id.toString() === variantId
    );

    if (productIndex === -1) {
      return res.json({
        success: false,
        message: 'Product variant not found in wishlist',
      });
    }

    wishlist.products.splice(productIndex, 1);

    await wishlist.save();

    res.json({
      success: true,
      wishlist,
    });
  } catch (error) {
    console.error('Error removing product from wishlist:', error);
    res.json({
      success: false,
      message: 'An error occurred while removing product from wishlist',
    });
  }
};



module.exports = {
  cart,
  addToCart,
  removeFromCart,
  updateCart,
  proceedToCheckout,

  wishlist,
  addToWishlist,
  removeFromWishlist,
};
