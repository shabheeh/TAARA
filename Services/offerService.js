// offerService.js
const Product = require('../Models/productModel');
const Offer = require('../Models/offerModel');


async function updateOffers(offerId) {

    try {
      const offer = await Offer.findById(offerId);
      if (!offer || offer.status !== 'Active') {
        // Remove this offer from all products
        await Product.updateMany(
          { 'currentOffer.offerId': offerId },
          { $unset: { currentOffer: "" } }
        );
        return;
      }
  
      // Find all products affected by this offer
      const products = await Product.find({
        $or: [
          { _id: { $in: offer.products } },
          { category: { $in: offer.categories } }
        ]
      });
  
      // Update each product
      for (let product of products) {
        const discountedPrice = product.price * (1 - offer.discount / 100);
        
        // Only update if the offer amount is bigger
        if (!product.currentOffer || discountedPrice < product.currentOffer.discountedPrice) {
          product.currentOffer = {
            offerId: offer._id,
            discountedPrice: discountedPrice
          };
          await product.save();
        }
      }
    } catch (error) {
      console.error('Error updating offers:', error);
    }
  }

module.exports = { updateOffers };