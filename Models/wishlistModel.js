
const mongoose = require('mongoose')

const wishlistSchema = new mongoose.Schema({

    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    
    products: [
        {
            product: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Product',
            },

            variant: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Variant',
            },
        }
    ],
})

module.exports = mongoose.model('Wishlist', wishlistSchema)