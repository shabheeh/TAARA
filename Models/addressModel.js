const mongoose = require('mongoose')

const addressSchema = new mongoose.Schema({

    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },

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
    }
            
    
})

module.exports = mongoose.model('Address', addressSchema)

