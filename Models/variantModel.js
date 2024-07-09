const mongoose = require("mongoose");

const variantSchema = new mongoose.Schema({

  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },

    images: {
      type: [String], 
      required: true,
    },

    color: {
      type: String,
    },

    sizes: {
      type: [String], //("S", "M", "L")
    },

    quantity: {
      type: Number,
    },

    isListed: {
      type: Boolean,
  },

    createdAt: {
      type: String,
      default: new Date().toLocaleDateString()
    },
});

module.exports = mongoose.model("Variant", variantSchema);
