const mongoose = require('mongoose')

const WalletSchema = new mongoose.Schema({
    
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    
    balance: {
        type: Number,
    },

    transactions: [
        {
            amount: {
                type: Number,
            },

            type: {
                type: String
            },

            entry: {
                type: String
            },

            date: {
                type: Date,
            },

            orderId: {
                type: String
            },

            product: {
                type: String
            }

        }
    ]
})

module.exports = mongoose.model('Wallet', WalletSchema);