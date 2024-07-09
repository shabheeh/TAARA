const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
    
    name: {
        type: String,
        
    },
    description: {
        type: String,
    },
    gender: {
        type: String,
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
    },
    brand: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Brand',
    },

    price: {
        type: Number,
    },

    variants: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Variant',
        },
      ],

    isListed: {
        type: Boolean,
    },
    
    createdAt: {
        type: String,
        default: new Date().toLocaleDateString()
    },
});

module.exports = mongoose.model("Product", productSchema);
