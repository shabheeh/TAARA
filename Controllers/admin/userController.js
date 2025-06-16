const User = require("../../Models/userModel");

const loadUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const searchTerm = req.query.search ? req.query.search.trim() : "";
    const status = req.query.status;
    const from = req.query.from;
    const to = req.query.to;
    const orderFilter = req.query.orderFilter;

    let matchStage = {};

    // Search by name or email
    if (searchTerm) {
      matchStage.$or = [
        { firstName: { $regex: searchTerm, $options: "i" } },
        { lastName: { $regex: searchTerm, $options: "i" } },
        { email: { $regex: searchTerm, $options: "i" } },
      ];
    }

    // Blocked / Unblocked status
    if (status === "true" || status === "false") {
      matchStage.isBlocked = status === "true";
    }

    // Date range filter
    if (from || to) {
      matchStage.createdAt = {};
      if (from) matchStage.createdAt.$gte = new Date(from);
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        matchStage.createdAt.$lte = toDate;
      }
    }

    // Build aggregation pipeline
    const pipeline = [
      { $match: matchStage },
      {
        $lookup: {
          from: "orders",
          localField: "_id",
          foreignField: "user",
          as: "orders",
        },
      },
      {
        $addFields: {
          orderCount: { $size: "$orders" },
        },
      },
    ];

    // Order count filter
    if (orderFilter === "lt5") {
      pipeline.push({ $match: { orderCount: { $lt: 5 } } });
    } else if (orderFilter === "5to10") {
      pipeline.push({ $match: { orderCount: { $gte: 5, $lte: 10 } } });
    } else if (orderFilter === "gt10") {
      pipeline.push({ $match: { orderCount: { $gt: 10 } } });
    }

    pipeline.push(
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit }
    );

    const users = await User.aggregate(pipeline);

    // Count total for pagination
    const totalCountAgg = await User.aggregate([
      { $match: matchStage },
      {
        $lookup: {
          from: "orders",
          localField: "_id",
          foreignField: "user",
          as: "orders",
        },
      },
      {
        $addFields: {
          orderCount: { $size: "$orders" },
        },
      },
      // Apply same order filter logic for count
      ...(orderFilter === "lt5"
        ? [{ $match: { orderCount: { $lt: 5 } } }]
        : orderFilter === "5to10"
        ? [{ $match: { orderCount: { $gte: 5, $lte: 10 } } }]
        : orderFilter === "gt10"
        ? [{ $match: { orderCount: { $gt: 10 } } }]
        : []),
      { $count: "count" },
    ]);

    const totalUsers = totalCountAgg[0]?.count || 0;

    // Also get blocked and unblocked counts
    const activeUsersCount = await User.countDocuments({ isBlocked: false });
    const blockedUsersCount = await User.countDocuments({ isBlocked: true });

    res.render("usersList", {
      users,
      blockedUsersCount,
      activeUsersCount,
      totalUsers,
      page,
      totalPages: Math.ceil(totalUsers / limit),
      limit,
      searchTerm,
      status,
      from,
      to,
      orderFilter,
    });
  } catch (error) {
    console.error("Error fetching users:", error.message);
    res.status(500).render("500");
  }
};



const blockUser = async (req, res) => {
  try {
    const userId = req.body.userId;
    const blockedUser = await User.findByIdAndUpdate(
      userId,
      { isBlocked: true },
      { new: true }
    );

    if (blockedUser.isBlocked) {
      const activeUsersCount = await User.countDocuments({ isBlocked: false });
      const blockedUsersCount = await User.countDocuments({ isBlocked: true });
      res.json({ isBlocked: true, activeUsersCount, blockedUsersCount });
    } else {
      res.json({ isBlocked: false, message: "Error blocking user" });
    }
  } catch (error) {
    console.error("Error blocking user:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const unBlockUser = async (req, res) => {
  try {
    const userId = req.body.userId;
    const unblockedUser = await User.findByIdAndUpdate(
      userId,
      { isBlocked: false },
      { new: true }
    );

    if (!unblockedUser.isBlocked) {
      const activeUsersCount = await User.countDocuments({ isBlocked: false });
      const blockedUsersCount = await User.countDocuments({ isBlocked: true });
      res.json({ isBlocked: false, activeUsersCount, blockedUsersCount });
    } else {
      res.json({ isBlocked: true, message: "Error unblocking user" });
    }
  } catch (error) {
    console.error("Error unblocking user:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

module.exports = {
  loadUsers,
  blockUser,
  unBlockUser,
};
