const mongoose = require('mongoose')

const bannerShema = new mongoose.Schema({

    title: {
        type: String,
    },
    
    description : {
        type: String,
    },

    image: {
        type: String,
    },
        
    link: {
        type: String,
    },

    status: { 
        type: Boolean, 
        default: true }
})

module.exports = mongoose.model('Banner', bannerShema)