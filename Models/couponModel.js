const mongoose = require('mongoose')

const couponSchema = new mongoose.Schema ({

    name: {
        type: String,
    },
    code: {
        type: String,
    },

    description: {
        type: String,
    },

    discount: {
        type: Number,
    },

    amount: {
        type: Number,
    },

    usedUsers: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },

    ],

    maxUses: {
        type: Number,
    },
    
    status: {
        type: String,
    },

    expires: {
        type: Date,
    }
},
{
    timestamps: true,
}
)
module.exports = mongoose.model('Coupon', couponSchema);