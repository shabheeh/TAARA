const mongoose = require('mongoose')

const orderShcema = new mongoose.Schema({

    orderId: {
        type: String,
    },
    
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },

    address: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Address'
    },

    payment: {
        type: String
    },

    products : [
        {
            product: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Product'
            },

            variant: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Variant'
            },

            price: {
                type: Number, 
            },

            quantity: {
                type: Number,
            },

            status: {
                type: String,
                default: 'pending',
            },

            cancelDate: {
                type: Date
            },
        
            cancelReason: {
                type: String
            },
        
            returnDate: {
                type: Date
            },
        
            returnDate: {
                type: String
            },
        }        

    ],

    shippingCharge: {
        type: Number,
    },

    totalQuantity: {
        type: Number,
    },

    totalPrice: {
        type: Number,
    },
},
{ timestamps: true }
);

module.exports = mongoose.model('Order', orderShcema)