const mongoose = require ('mongoose')

const categoryShcema = new mongoose.Schema ({

    name: {
        type: String,
        required: true,
    },

    description: {
        type: String,
    },

    photo: {
        type: String,
    },

    gender: {
        type: String,

    },

    isListed: {
        type: Boolean,
    }

})

module.exports = mongoose.model('Category', categoryShcema)

