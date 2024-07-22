
const mongoose = require('mongoose')

const cartSchema = new mongoose.Schema({

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

            size: {
                type: String,  
            },
            
            quantity: {
                type: Number,

            },
        }
    ],
})

module.exports = mongoose.model('Cart', cartSchema)