const mongoose = require('mongoose')

const reviewSchema = new mongoose.Schema({

    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
    },

    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },

    title: {
        type: String,
    },

    comment: {
        type: String,
    },

    rating: {
        type: Number,
        min: 1,
        max: 5,
    },

    order: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',

    },

    isListed: {
        type: Boolean,
        default: true
    }
},
{ timestamps: true }
)


module.exports = mongoose.model('Review', reviewSchema);