const mongoose = require('mongoose')

const offerSchema = new mongoose.Schema ({
    
    title: {
        type: String,
    },

    description: {
        type: String,
    },

    discount: {
        type: Number,
    },

    type: {
        type: String,
    },
    
    products: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
        },
    ],

    categories: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Category',
        },
    ],
    
    status: {
        type: String,
    }
},
{ timestamps: true}
)

module.exports = mongoose.model('Offer', offerSchema); 