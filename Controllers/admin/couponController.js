const Coupon = require("../../Models/couponModel");

const coupons = async (req, res) => {
  try {
    const coupons = await Coupon.find();
    res.render("coupons", {
      coupons,
    });
  } catch (error) {
    console.error("Error rendering coupons page:", error.message);
  }
};

const addCoupon = async (req, res) => {
  try {
    const {
      name,
      code,
      description,
      amount,
      discount,
      maxDiscount,
      maxUses,
      status,
      expires,
    } = req.body;

    const existingCoupon = await Coupon.findOne({ code: code });
    if (existingCoupon) {
      return res.json({
        success: false,
        message: "A coupon with this code already exists",
      });
    }

    const coupon = new Coupon({
      name,
      code,
      description,
      amount,
      discount,
      maxDiscount,
      maxUses,
      status,
      expires,
    });

    const saveCoupon = await coupon.save();

    if (saveCoupon) {
      res.json({
        success: true,
        message: "Coupon added successfully",
      });
    } else {
      res.json({
        success: false,
        message: "Error adding coupon",
      });
    }
  } catch (error) {
    console.error("Error adding coupon:", error.message);
    res.json({
      success: false,
      message: "Error adding coupon",
    });
  }
};

const updateCoupon = async (req, res) => {
  try {
    const {
      id,
      name,
      code,
      description,
      amount,
      discount,
      maxDiscount,
      maxUses,
      status,
      expires,
    } = req.body;

    const existingCoupon = await Coupon.findOne({
      code: code,
      _id: { $ne: id },
    });
    if (existingCoupon) {
      return res.json({
        id,
        success: false,
        message: "Another coupon with this code already exists",
      });
    }

    const coupon = await Coupon.findByIdAndUpdate(
      id,
      {
        name,
        code,
        description,
        amount,
        discount,
        maxDiscount,
        maxUses,
        status,
        expires,
      },
      { new: true }
    );

    if (coupon) {
      res.json({
        id,
        success: true,
        message: "Coupon updated successfully",
      });
    } else {
      res.json({
        id,
        success: false,
        message: "Error updating coupon",
      });
    }
  } catch (error) {
    console.error("Error updating coupon:", error.message);
    res.json({
      id: req.body.id,
      success: false,
      message: "Error updating coupon",
    });
  }
};

const deleteCoupon = async (req, res) => {
  try {
    const id = req.body.id;
    const coupon = await Coupon.findByIdAndDelete(id);
    if (coupon) {
      res.json({
        id,
        success: true,
        message: "Coupon deleted successfully",
      });
    } else {
      res.json({
        id,
        success: false,
        message: "Error deleting coupon",
      });
    }
  } catch (error) {
    console.error("Error deleting coupon:", error.message);
    res.json({
      success: false,
      message: "Error deleting coupon",
    });
  }
};

module.exports = {
  coupons,
  addCoupon,
  updateCoupon,
  deleteCoupon,
};
