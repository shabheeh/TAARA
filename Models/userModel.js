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

    password: {
        type: String,
        },

    avatar: {
        type: String,
        },
    
    orders: {
        type: Array,
        
    },

    isBlocked: {
        type: Boolean,
        default: false,
    },

    orders: {
        type: Array,
    },
},
{ timestamps: true }
);


module.exports = mongoose.model("User", userSchema)