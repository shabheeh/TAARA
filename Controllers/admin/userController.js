const User = require("../../Models/userModel");

const loadUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    let searchTerm = "";
    let query = {};

    if (req.query.search) {
      searchTerm = req.query.search.trim();
      query = {
        $or: [
          { firstName: new RegExp(searchTerm, "i") },
          { lastName: new RegExp(searchTerm, "i") },
          { email: new RegExp(searchTerm, "i") },
        ],
      };
    }

    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalUsers = await User.countDocuments(query);
    const activeUsersCount = await User.countDocuments({ isBlocked: false });
    const blockedUsersCount = await User.countDocuments({ isBlocked: true });

    res.render("usersList", {
      blockedUsersCount,
      activeUsersCount,
      users,
      totalUsers,
      page,
      totalPages: Math.ceil(totalUsers / limit),
      limit,
      searchTerm,
    });
  } catch (error) {
    console.error("Error fetching users:", error.message);
    res.status(500).render("500"); // Fixed render to render the error page correctly
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
