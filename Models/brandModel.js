const mongoose = require("mongoose");

const brandShcema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },

  description: {
    type: String,
  },

  isListed: {
    type: Boolean,
  },
  
});

module.exports = mongoose.model("Brand", brandShcema);
