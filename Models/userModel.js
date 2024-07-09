const mongoose = require('mongoose');

const userSchema = mongoose.Schema({
    


    firstName: {
        type: String,
        },

    lastName: {
        type: String,
        },

    email: {
        type: String,
        required: true,
        unique: true
        },

    phone: {
        type: Number,
    },    

    gender: {
        type: String,
        },

    password: {
        type: String,
        },

    avatar: {
        type: String,
        },
    
    orders: {
        type: Array,
        
    },

    dateOfJoined: {
        type: String,
    },

    isBlocked: {
        type: Boolean,
        default: false,
    },

    orders: {
        type: Array,
    }





});


module.exports = mongoose.model("User", userSchema)