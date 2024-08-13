const mongoose = require('mongoose');

const dbConnect = async () => {
    try {
        await mongoose.connect(process.env.DB_HOST, {
            
        });
        console.log('Connected to the database');
    } catch (error) {
        console.error('Database connection error:', error);
        
    }
};

module.exports = dbConnect;
