const Product = require("../../Models/productModel");
const Review = require("../../Models/reviewModel");
const Order = require("../../Models/orderModel");

const review = async (req, res) => {
  try {
    const { orderId, productId, variantId, title, comment, rating } = req.body;

    const order = await Order.findById(orderId);
    const product = await Product.findById(productId);

    if (!order) {
      return res.json({
        success: false,
        message: "Order not found",
        orderId,
        variantId,
      });
    }

    if (!product) {
      return res.json({
        success: false,
        message: "Product not found",
        orderId,
        variantId,
      });
    }

    const existingReview = await Review.findOne({
      order: orderId,
      product: productId,
    });

    if (existingReview) {
      return res.json({
        success: false,
        message: "Review already exists",
        orderId,
        variantId,
      });
    }

    const review = new Review({
      product: productId,
      user: order.user,
      title: title,
      comment: comment,
      rating: rating,
      order: orderId,
    });

    await review.save();

    return res.json({
      success: true,
      message: "Review submitted successfully",
      orderId,
      variantId,
    });
  } catch (error) {
    console.error("Error submitting review:", error.message);
    return res.json({
      success: false,
      message: "Error submitting review",
    });
  }
};

const editReview = async (req, res) => {
  try {
    const { orderId, productId, title, comment, rating } = req.body;
    const order = await Order.findById(orderId);
    const product = await Product.findById(productId);

    if (!order) {
      return res.json({
        success: false,
        message: "Order not found",
      });
    }

    if (!product) {
      return res.json({
        success: false,
        message: "Product not found",
      });
    }

    const updatedReview = await Review.findOneAndUpdate(
      { product: productId, order: orderId },
      {
        $set: {
          title: title,
          comment: comment,
          rating: rating,
        },
      },
      { new: true }
    );

    if (!updatedReview) {
      return res.json({
        success: false,
        message: "Review not found",
      });
    }

    return res.json({
      success: true,
      message: "Review updated successfully",
      review: updatedReview,
    });
  } catch (error) {
    console.error("error editing review", error.message);
    return res.json({
      success: false,
      message: "Error editing review",
    });
  }
};

const reviews = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const searchTerm = req.query.search?.trim() || "";
    const filter = req.query.filter || "";
    const from = req.query.from || "";
    const to = req.query.to || "";
    const rating = parseInt(req.query.rating) || null;

    let matchStage = {};

    if (searchTerm) {
      matchStage.$or = [
        { "product.name": { $regex: searchTerm, $options: "i" } },
        { comment: { $regex: searchTerm, $options: "i" } },
      ];
    }

    if (filter === "true") {
      matchStage.isListed = true;
    } else if (filter === "false") {
      matchStage.isListed = false;
    }

    if (rating && rating >= 1 && rating <= 5) {
      matchStage.rating = rating;
    }

    if (from || to) {
      matchStage.createdAt = {};
      if (from) matchStage.createdAt.$gte = new Date(from);
      if (to) matchStage.createdAt.$lte = new Date(to);
    }

    const pipeline = [
      {
        $lookup: {
          from: "products",
          localField: "product",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: "$product" },
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $lookup: {
          from: "brands",
          localField: "product.brand",
          foreignField: "_id",
          as: "product.brand",
        },
      },
      { $unwind: "$product.brand" },
      {
        $lookup: {
          from: "variants",
          localField: "product.variants",
          foreignField: "_id",
          as: "product.variants",
        },
      },
      { $match: matchStage },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
    ];

    const reviews = await Review.aggregate(pipeline);

    // Total count for pagination
    const totalReviews = await Review.aggregate([
      {
        $lookup: {
          from: "products",
          localField: "product",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: "$product" },
      {
        $match: matchStage,
      },
      { $count: "count" },
    ]);

    const totalCount = totalReviews.length > 0 ? totalReviews[0].count : 0;

    res.render("reviews", {
      reviews,
      totalReviews: totalCount,
      page,
      totalPages: Math.ceil(totalCount / limit),
      limit,
      searchTerm,
      filter,
      from,
      to,
      rating,
    });
  } catch (error) {
    console.error("Error listing reviews:", error.message);
    res.render("error", { error });
  }
};

const reviewStatus = async (req, res) => {
  try {
    const id = req.body.reviewId;

    const review = await Review.findById(id);

    if (!review) {
      return res.json({
        success: false,
        message: "Review not found",
      });
    }

    const updatedReview = await Review.findByIdAndUpdate(
      id,
      { $set: { isListed: !review.isListed } },
      { new: true }
    );

    res.json({
      success: true,
      message: "Review status updated",
      review: updatedReview,
    });
  } catch (error) {
    console.error("error changing listed reviews", error.message);
    res.json({
      success: false,
      message: "Error changing review status",
    });
  }
};

const deleteReview = async (req, res) => {
  try {
    const id = req.body.id;
    const review = await Review.findByIdAndDelete(id);

    if (review) {
      res.json({
        id,
        success: true,
        message: "Review deleted successfully",
      });
    } else {
      res.json({
        id,
        success: false,
        message: "Review not found",
      });
    }
  } catch (error) {
    console.error("Error deleting review:", error.message);
    res.json({
      success: false,
      message: "Error deleting review",
    });
  }
};

module.exports = {
  review,
  editReview,
  reviews,
  reviewStatus,
  deleteReview,
};
