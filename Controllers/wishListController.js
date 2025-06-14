const User = require("../Models/userModel");
const Cart = require("../Models/cartModel");
const Wishlist = require("../Models/wishlistModel");
const Product = require("../Models/productModel");
const Variant = require("../Models/variantModel");

const wishlist = async (req, res) => {
  try {
    const userId = req.userId;

    const [user, wishlist, cart] = await Promise.all([
      User.findById(userId),
      Wishlist.findOne({ user: userId })
        .populate({
          path: "products.product",
          populate: {
            path: "offers",
            model: "Offer",
          },
        })
        .populate("products.variant"),
      Cart.findOne({ user: userId })
        .populate("products.product")
        .populate("products.variant"),
    ]);

    if (wishlist && wishlist.products && Array.isArray(wishlist.products)) {
      wishlist.products = wishlist.products.reverse();
    }

    if (wishlist && wishlist.products.length > 0) {
      wishlist.products.forEach((product) => {
        const offers = product.product.offers || [];
        const activeOffers = offers.filter(
          (offer) => offer.status === "Active"
        );

        if (activeOffers.length > 0) {
          const bestOffer = activeOffers.reduce((best, current) =>
            current.discount > best.discount ? current : best
          );

          product.bestOffer = bestOffer;
          product.discountedPrice = Number(
            (product.product.price * (1 - bestOffer.discount / 100)).toFixed(2)
          );
        } else {
          product.discountedPrice = Number(product.product.price.toFixed(2));
        }
      });
    }

    res.render("wishlist", {
      wishlist: wishlist || { products: [] },
      user,
    });
  } catch (error) {
    console.error("Error loading wishlist:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

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
          message: "Product already in the wishlist",
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

const removeFromWishlist = async (req, res) => {
  try {
    const { variantId, wishlistId } = req.params;

    const wishlist = await Wishlist.findById(wishlistId)
      .populate("products.product")
      .populate("products.variant");

    if (!wishlist) {
      return res.json({
        success: false,
        message: "Wishlist not found",
      });
    }

    const productIndex = wishlist.products.findIndex(
      (product) => product.variant._id.toString() === variantId
    );

    if (productIndex === -1) {
      return res.json({
        success: false,
        message: "Product variant not found in wishlist",
      });
    }

    wishlist.products.splice(productIndex, 1);

    await wishlist.save();

    res.json({
      success: true,
      wishlist,
    });
  } catch (error) {
    console.error("Error removing product from wishlist:", error);
    res.json({
      success: false,
      message: "An error occurred while removing product from wishlist",
    });
  }
};

module.exports = {
  wishlist,
  addToWishlist,
  removeFromWishlist,
};
