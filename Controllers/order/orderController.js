const Order = require("../../Models/orderModel");
const Variant = require("../../Models/variantModel");
const Wallet = require("../../Models/walletModel");

const orders = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const search = req.query.search?.trim() || "";
    const paymentMethod = req.query.paymentMethod || "";
    const paymentStatus = req.query.paymentStatus || "";
    const startDate = req.query.startDate || "";
    const endDate = req.query.endDate || "";


    const baseMatch = {
      paymentStatus: { $ne: "Failed" },
    };

    if (paymentMethod) {
      baseMatch.payment = paymentMethod;
    }

    if (paymentStatus) {
      baseMatch.paymentStatus = paymentStatus;
    }

    if (startDate || endDate) {
      const createdAtFilter = {};
      if (startDate) createdAtFilter.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999); 
        createdAtFilter.$lte = end;
      }
      baseMatch.createdAt = createdAtFilter;
    }

    const pipeline = [
      { $match: baseMatch },
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
          from: "addresses",
          localField: "address",
          foreignField: "_id",
          as: "address",
        },
      },
      { $unwind: { path: "$address", preserveNullAndEmptyArrays: true } },

      ...(search
        ? [
            {
              $match: {
                $or: [
                  { orderId: { $regex: search, $options: "i" } },
                  { "user.firstName": { $regex: search, $options: "i" } },
                  { "user.lastName": { $regex: search, $options: "i" } },
                ],
              },
            },
          ]
        : []),

      { $sort: { createdAt: -1 } },

      {
        $facet: {
          orders: [{ $skip: skip }, { $limit: limit }],
          totalCount: [{ $count: "count" }],
        },
      },
    ];

    const result = await Order.aggregate(pipeline);
    const orders = result[0]?.orders || [];
    const totalOrders = result[0]?.totalCount[0]?.count || 0;

    res.render("orders", {
      orders,
      totalOrders,
      page,
      limit,
      searchTerm: search,
      paymentMethod,
      paymentStatus,
      startDate,
      endDate,
      totalPages: Math.ceil(totalOrders / limit),
    });
  } catch (error) {
    console.error("Error getting orders:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};


const viewOrder = async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const order = await Order.findById(orderId)
      .populate("user")
      .populate("address")
      .populate({
        path: "products.product",
        populate: [{ path: "brand" }, { path: "category" }],
      })
      .populate("products.variant");

    const totalOrders = await Order.countDocuments({ user: order.user._id });

    res.render("viewOrder", {
      order,
      totalOrders,
    });
  } catch (error) {
    console.error("Error getting orders:", error.message);
  }
};

const updateStatus = async (req, res) => {
  try {
    const { orderId, productId, variantId, status } = req.body;

    const order = await Order.findById(orderId).populate("user");
    const user = order.user._id;
    if (!order) {
      return res.json({
        success: false,
        message: "Order not found",
      });
    }

    const productIndex = order.products.findIndex(
      (p) =>
        p.product.toString() === productId && p.variant.toString() === variantId
    );
    if (productIndex === -1) {
      return res.json({
        success: false,
        message: "Product or variant not found in the order",
      });
    }

    const currentStatus = order.products[productIndex].status;
    const validTransitions = {
      Pending: ["Dispatched", "Cancelled"],
      Dispatched: ["Out for Delivery", "Cancelled"],
      "Out for Delivery": ["Delivered"],
      "Return Requested": ["Returned", "Return Rejected"],
      Delivered: [],
      Cancelled: [],
    };

    if (!validTransitions[currentStatus].includes(status)) {
      return res.json({
        id: variantId,
        success: false,
        message: `Invalid status transition from ${currentStatus} to ${status}`,
      });
    }

    order.products[productIndex].status = status;

    if (status === "Cancelled" || status === "Returned") {
      const updateStock = await Variant.findById(variantId);
      updateStock.quantity += order.products[productIndex].quantity;
      await updateStock.save();

      let refund = false;
      if (status === "Cancelled" && order.payment === "Razorpay") {
        refund = true;
      } else if (status === "Returned") {
        refund = true;
      }

      if (refund) {
        let wallet = await Wallet.findOne({ user });
        if (!wallet) {
          wallet = new Wallet({
            user: user,
            balance: 0,
            transactions: [],
          });
        }

        const refundAmount = order.products[productIndex].totalPrice;
        const transaction = {
          amount: refundAmount,
          type:
            status === "Cancelled" ? "Cancellation Refund" : "Return Refund",
          entry: "Credit",
          date: new Date(),
          orderId: order.orderId,
          product: order.products[productIndex].name,
        };

        wallet.balance += refundAmount;
        wallet.transactions.push(transaction);
        await wallet.save();
      }
    }

    if (status === "Delivered") {
      order.paymentStatus = "Paid";
    }

    await order.save();

    res.json({
      id: variantId,
      status: status,
      success: true,
      message: "Status updated successfully",
    });
  } catch (error) {
    console.error("Error updating status admin:", error.message);
    res.json({
      success: false,
      message: "Error updating status",
    });
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    const { orderId, productId, variantId, reason, status } = req.body;

    if (status !== "Cancelled" && status !== "Return Requested") {
      return res.json({
        success: false,
        message: 'Invalid status".',
      });
    }

    const order = await Order.findById(orderId).populate("user");

    if (!order) {
      return res.json({
        success: false,
        message: "Order not found",
      });
    }
    const user = order.user._id;

    const productIndex = order.products.findIndex(
      (p) =>
        p.product.toString() === productId && p.variant.toString() === variantId
    );

    if (productIndex === -1) {
      return res.json({
        success: false,
        message: "Product or variant not found in the order",
      });
    }

    order.products[productIndex].status = status;
    order.products[productIndex].reason = reason;
    order.products[productIndex].date = new Date();

    let refund = false;
    if (status === "Cancelled" && order.payment === "Razorpay") {
      refund = true;
    } else if (status === "Returned") {
      refund = true;
    }

    if (refund) {
      let wallet = await Wallet.findOne({ user });
      if (!wallet) {
        wallet = new Wallet({
          user: user,
          balance: 0,
          transactions: [],
        });
      }

      const refundAmount = order.products[productIndex].totalPrice;
      const transaction = {
        amount: refundAmount,
        type: status === "Cancelled" ? "Cancellation Refund" : "Return Refund",
        entry: "Credit",
        date: new Date(),
        orderId: order.orderId,
        product: order.products[productIndex].name,
      };

      wallet.balance += refundAmount;
      wallet.transactions.push(transaction);
      await wallet.save();
    }

    await order.save();

    const updateStock = await Variant.findById(variantId);
    updateStock.quantity += order.products[productIndex].quantity;
    await updateStock.save();

    res.json({
      success: true,
      orderId,
      variantId,
      message:
        status === "Cancelled"
          ? "Order cancelled successfully"
          : "Order returned successfully",
    });
  } catch (error) {
    console.error(`Error updating order status user`, error.message);
    res.json({
      success: false,
      orderId: req.body.orderId,
      variantId: req.body.variantId,
      message: `Error updating order status`,
    });
  }
};

module.exports = {
  orders,
  viewOrder,
  updateStatus,
  updateOrderStatus,
};
