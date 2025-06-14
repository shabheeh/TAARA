const Order = require("../../Models/orderModel");
const {
  bestSellingBrands,
  getSalesAndRevenue,
  getTopBrands,
  getTopCategories,
  getTopProducts,
} = require("../../Helpers/dashboard");

const dashboard = async (req, res) => {
  try {
    const chartData = await bestSellingBrands();
    const topProducts = await getTopProducts();
    const topCategories = await getTopCategories();
    const topBrands = await getTopBrands();
    const { totalOrders, totalRevenue, totalProductsSold } =
      await getSalesAndRevenue();

    res.render("dashboard", {
      chartData,
      totalOrders,
      totalRevenue,
      totalProductsSold,
      topProducts,
      topCategories,
      topBrands,
    });
  } catch (error) {
    console.error("error loading dashboard", error.message);
    res
      .status(500)
      .json({ success: false, message: "Error loading dashboard" });
  }
};

const salesGraph = async (req, res) => {
  try {
    const { filterSales, date } = req.query;

    let groupStage = {};
    let startDate, endDate;

    if (filterSales === "daily") {
      const [year, month] = date.split("-");
      startDate = new Date(year, month - 1, 1);
      endDate = new Date(year, month, 0);
      groupStage = {
        $group: {
          _id: { $dayOfMonth: "$createdAt" },
          totalSales: { $sum: "$products.totalPrice" },
        },
      };
    } else if (filterSales === "monthly") {
      startDate = new Date(date, 0, 1);
      endDate = new Date(date, 11, 31);
      groupStage = {
        $group: {
          _id: { $month: "$createdAt" },
          totalSales: { $sum: "$products.totalPrice" },
        },
      };
    } else if (filterSales === "yearly") {
      startDate = new Date(new Date().getFullYear() - 4, 0, 1);
      endDate = new Date();
      groupStage = {
        $group: {
          _id: { $year: "$createdAt" },
          totalSales: { $sum: "$products.totalPrice" },
        },
      };
    }

    const matchStage = [
      {
        $unwind: "$products",
      },
      {
        $match: {
          "products.status": { $in: ["Delivered", "Return Requested"] },
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
    ];

    const salesData = await Order.aggregate([
      ...matchStage,
      groupStage,
      { $sort: { _id: 1 } },
    ]);

    let transformedData;
    if (filterSales === "daily") {
      const daysInMonth = new Date(
        startDate.getFullYear(),
        startDate.getMonth() + 1,
        0
      ).getDate();
      transformedData = Array.from({ length: daysInMonth }, (_, i) => ({
        name: (i + 1).toString(),
        value: 0,
      }));
      salesData.forEach((item) => {
        transformedData[item._id - 1].value = item.totalSales;
      });
    } else if (filterSales === "monthly") {
      transformedData = Array.from({ length: 12 }, (_, i) => ({
        name: [
          "Jan",
          "Feb",
          "Mar",
          "Apr",
          "May",
          "Jun",
          "Jul",
          "Aug",
          "Sep",
          "Oct",
          "Nov",
          "Dec",
        ][i],
        value: 0,
      }));
      salesData.forEach((item) => {
        transformedData[item._id - 1].value = item.totalSales;
      });
    } else if (filterSales === "yearly") {
      const currentYear = new Date().getFullYear();
      transformedData = Array.from({ length: 5 }, (_, i) => ({
        name: (currentYear - 4 + i).toString(),
        value: 0,
      }));
      salesData.forEach((item) => {
        const index = item._id - (currentYear - 4);
        if (index >= 0 && index < 5) {
          transformedData[index].value = item.totalSales;
        }
      });
    }

    const totalSales = transformedData.reduce(
      (sum, item) => sum + item.value,
      0
    );

    res.json({
      success: true,
      data: transformedData,
      totalSales: totalSales,
    });
  } catch (error) {
    console.error("Error fetching the sales data:", error.message);
    res.status(500).json({
      success: false,
      message: "Error fetching sales data",
    });
  }
};

module.exports = {
  dashboard,
  salesGraph,
};
