const Order = require("../Models/orderModel");

async function bestSellingBrands(limit = 3) {
  try {
    const brandSales = await Order.aggregate([
      { $unwind: "$products" },
      {
        $match: {
          "products.status": { $in: ["Delivered", "Return Requested"] },
        },
      },

      {
        $lookup: {
          from: "products",
          localField: "products.product",
          foreignField: "_id",
          as: "productInfo",
        },
      },
      { $unwind: "$productInfo" },
      {
        $lookup: {
          from: "brands",
          localField: "productInfo.brand",
          foreignField: "_id",
          as: "brandInfo",
        },
      },
      { $unwind: "$brandInfo" },
      {
        $group: {
          _id: "$brandInfo._id",
          totalSales: { $sum: "$products.quantity" },
          name: { $first: "$brandInfo.name" },
        },
      },
      { $sort: { totalSales: -1 } },
    ]);

    const totalSales = brandSales.reduce(
      (sum, brand) => sum + brand.totalSales,
      0
    );

    let chartData = brandSales.slice(0, limit).map((brand) => ({
      name: brand.name || "Unknown Brand",
      value: Math.round((brand.totalSales / totalSales) * 100),
      count: brand.totalSales,
    }));

    const othersBrands = brandSales.slice(limit);
    const othersSales = othersBrands.reduce(
      (sum, brand) => sum + brand.totalSales,
      0
    );
    const othersPercentage = Math.round((othersSales / totalSales) * 100);

    if (othersPercentage > 0) {
      chartData.push({
        name: "Others",
        value: othersPercentage,
        count: othersSales,
      });
    }

    const totalPercentage = chartData.reduce(
      (sum, item) => sum + item.value,
      0
    );
    if (totalPercentage < 100) {
      chartData[0].value += 100 - totalPercentage;
    }

    return chartData;
  } catch (error) {
    console.error("Error fetching best-selling brands:", error);
    throw error;
  }
}

async function getSalesAndRevenue() {
  try {
    const result = await Order.aggregate([
      { $unwind: "$products" },
      {
        $match: {
          "products.status": { $in: ["Delivered", "Return Requested"] },
        },
      },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalProductsSold: { $sum: "$products.quantity" },
          totalRevenue: { $sum: "$products.totalPrice" },
        },
      },
    ]);

    if (result.length > 0) {
      return {
        totalOrders: result[0].totalOrders,
        totalProductsSold: result[0].totalProductsSold,
        totalRevenue: result[0].totalRevenue,
      };
    } else {
      return {
        totalOrders: 0,
        totalProductsSold: 0,
        totalRevenue: 0,
      };
    }
  } catch (error) {
    console.error("Error fetching total sales and revenue:", error);
    throw error;
  }
}

const getSalesData = async () => {
  return Order.aggregate([
    { $unwind: "$products" },
    {
      $match: {
        "products.status": { $in: ["Delivered", "Return Requested"] },
      },
    },
    {
      $lookup: {
        from: "products",
        localField: "products.product",
        foreignField: "_id",
        as: "productInfo",
      },
    },
    {
      $group: {
        _id: "$products.product",
        name: { $first: { $arrayElemAt: ["$productInfo.name", 0] } },
        gender: { $first: { $arrayElemAt: ["$productInfo.gender", 0] } },
        totalQuantity: { $sum: "$products.quantity" },
      },
    },
    { $sort: { totalQuantity: -1 } },
  ]);
};

const getTopProducts = async (n = 10) => {
  const productSales = await getSalesData();
  return productSales.slice(0, n);
};

const getTopCategories = async (n = 10) => {
  return Order.aggregate([
    { $unwind: "$products" },
    {
      $lookup: {
        from: "products",
        localField: "products.product",
        foreignField: "_id",
        as: "productDetails",
      },
    },
    { $unwind: "$productDetails" },
    {
      $lookup: {
        from: "categories",
        localField: "productDetails.category",
        foreignField: "_id",
        as: "categoryDetails",
      },
    },
    { $unwind: "$categoryDetails" },
    {
      $match: {
        "products.status": { $in: ["Delivered", "Return Requested"] },
      },
    },
    {
      $group: {
        _id: "$categoryDetails._id",
        name: { $first: "$categoryDetails.name" },
        gender: { $first: "$categoryDetails.gender" },
        totalQuantity: { $sum: "$products.quantity" },
      },
    },
    { $sort: { totalQuantity: -1 } },
    { $limit: n },
  ]);
};

const getTopBrands = async (n = 10) => {
  return Order.aggregate([
    { $unwind: "$products" },
    {
      $lookup: {
        from: "products",
        localField: "products.product",
        foreignField: "_id",
        as: "productDetails",
      },
    },
    { $unwind: "$productDetails" },
    {
      $lookup: {
        from: "brands",
        localField: "productDetails.brand",
        foreignField: "_id",
        as: "brandDetails",
      },
    },
    { $unwind: "$brandDetails" },
    {
      $match: {
        "products.status": { $in: ["Delivered", "Return Requested"] },
      },
    },
    {
      $group: {
        _id: "$brandDetails._id",
        name: { $first: "$brandDetails.name" },
        totalQuantity: { $sum: "$products.quantity" },
      },
    },
    { $sort: { totalQuantity: -1 } },
    { $limit: n },
  ]);
};

module.exports = {
  getTopBrands,
  getTopCategories,
  getTopProducts,
  bestSellingBrands,
  getSalesAndRevenue,
};
