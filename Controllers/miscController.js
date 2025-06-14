const User = require("../Models/userModel");

const fourNotFour = async (req, res) => {
  try {
    let user = null;
    if (req.userId) {
      user = await User.findById(req.userId);
    }
    res.render("404", {
      user: user ? user : null,
    });
  } catch (error) {
    console.error("Error rendering 404:", error.message);
    res.render("500");
  }
};

const serverError = async (req, res) => {
  try {
    let user = null;
    if (req.userId) {
      user = await User.findById(req.userId);
    }
    res.render("500", {
      user: user ? user : null,
    });
  } catch (error) {
    console.error("Error rendering 404:", error.message);
    res.render("500");
  }
};

const about = async (req, res) => {
  try {
    let user = null;
    if (req.userId) {
      user = await User.findById(req.userId);
    }

    res.render("about", {
      user: user ? user : null,
    });
  } catch (error) {
    console.error("Error rendering about:", error.message);
    res.render("500");
  }
};

module.exports = {
  fourNotFour,
  serverError,
  about,
};
