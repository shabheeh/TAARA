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
        
        name: {
            type: String,
        },
    
        phone: {
            type: Number
        },
    
        address: {
            type: String
        },
    
        street: {
            type: String
        },
    
        city: {
            type: String
        },
    
        landmark: {
            type: String
        },
    
        state: {
            type: String
        },
    
        pincode: {
            type: Number
        },
    
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

            name: {
                type: String
            },

            variant: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Variant'
            },

            originalPrice: {
                type: Number, 
            },

            discountedPrice: {
                type: Number,
            },

            totalPrice: {
                type: Number
            },

            quantity: {
                type: Number,
            },

            appliedOffer: {
                offerId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'Offer'
                },

                title: {
                    type: String
                },

                type:{
                    type:String
                },

                discount: {
                    type: Number
                }
            },

            status: {
                type: String,
                default: 'Pending',
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
        
            returnReason: {
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

    originalSubTotal: {
        type: Number
    },

    discountedSubTotal: {
        type: Number
    },

    totalPrice: {
        type: Number,
    },

    appliedCoupon: {
        
        couponId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Coupon'
        },
        code: {
            type: String
        },
        discount: {
            type: Number
        },
        
    },
    razorpayOrderId:{
        type: String,
    },

    paymentStatus: {
        type: String,
    }
},
{ timestamps: true }
);

module.exports = mongoose.model('Order', orderShcema)