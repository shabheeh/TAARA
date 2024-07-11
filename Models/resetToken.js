const mongoose = require('mongoose');

const ResetTokenSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    token: {
        type: String,
        required: true
    },
    expiresAt: {
        type: Date,
        expires: 60
    }
});

module.exports = mongoose.model("ResetToken", ResetTokenSchema);

 
