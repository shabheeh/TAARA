
const Order = require('../Models/orderModel')


async function bestSellingBrands(limit = 3) {
  try {
      const brandSales = await Order.aggregate([

          { $unwind: '$products' },
          {
              $match: {
                  'products.status': { $in: ['Delivered', 'Return Requested'] }
              }
          },
          
          {
              $lookup: {
                  from: 'products',
                  localField: 'products.product',
                  foreignField: '_id',
                  as: 'productInfo'
              }
          },
          { $unwind: '$productInfo' },
          {
              $lookup: {
                  from: 'brands',
                  localField: 'productInfo.brand',
                  foreignField: '_id',
                  as: 'brandInfo'
              }
          },
          { $unwind: '$brandInfo' },
          {
              $group: {
                  _id: '$brandInfo._id',
                  totalSales: { $sum: '$products.quantity' },
                  name: { $first: '$brandInfo.name' }
              }
          },
          { $sort: { totalSales: -1 } }
      ]);

      // Calculate total sales across all brands
      const totalSales = brandSales.reduce((sum, brand) => sum + brand.totalSales, 0);

      // Prepare chart data
      let chartData = brandSales.slice(0, limit).map(brand => ({
          name: brand.name || 'Unknown Brand',
          value: Math.round((brand.totalSales / totalSales) * 100),
          count: brand.totalSales
      }));

      // Calculate "Others" data
      const othersBrands = brandSales.slice(limit);
      const othersSales = othersBrands.reduce((sum, brand) => sum + brand.totalSales, 0);
      const othersPercentage = Math.round((othersSales / totalSales) * 100);

      if (othersPercentage > 0) {
          chartData.push({ 
              name: 'Others', 
              value: othersPercentage,
              count: othersSales
          });
      }

      // Ensure percentages add up to 100%
      const totalPercentage = chartData.reduce((sum, item) => sum + item.value, 0);
      if (totalPercentage < 100) {
          chartData[0].value += 100 - totalPercentage;
      }

      return chartData;

  } catch (error) {
      console.error('Error fetching best-selling brands:', error);
      throw error;
  }
}


async function getSalesAndRevenue() {
  try {
      const result = await Order.aggregate([
        { $unwind: '$products' },
        {
            $match: {
                'products.status': { $in: ['Delivered', 'Return Requested'] }
            }
        },
          {
              $group: {
                  _id: null,
                  totalOrders: { $sum: 1 },
                  totalProductsSold: { $sum: '$products.quantity' },
                  totalRevenue: { $sum: '$products.totalPrice' }
              }
          }
      ]);

      if (result.length > 0) {
          return {
              totalOrders: result[0].totalOrders,
              totalProductsSold: result[0].totalProductsSold,
              totalRevenue: result[0].totalRevenue
          };
      } else {
          return {
              totalOrders: 0,
              totalProductsSold: 0,
              totalRevenue: 0
          };
      }
  } catch (error) {
      console.error('Error fetching total sales and revenue:', error);
      throw error;
  }
}

module.exports = {
    bestSellingBrands,
    getSalesAndRevenue,
};