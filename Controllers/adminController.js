const User = require("../Models/userModel");
const Category = require ("../Models/categoryModel")
const Brand = require("../Models/brandModel")
const Order = require('../Models/orderModel')




// ------login------>

const login = async (req, res) => {

    try {
        
         
    res.redirect('/admin/login')
        
        
    } catch (error) {
        console.log(error.message + ' user loadhome');
    }
}

// ------Dashboard------>




// ------Admin Signin------>

const loadSignin = async (req, res) => {

    try {
        res.render('login')
    } catch (error) {
        console.log(error.message + ' user loadlogin');
    }
            
}


// ------Admin Signin------>

const verifySignIn = async ( req, res) => {

    try {

        const adminEmail = process.env.ADMIN_EMAIL;
        const adminPassword = process.env.ADMIN_PASSWORD;

        if (req.body.email === adminEmail && req.body.password === adminPassword) {
            req.session.admin = true

            res.redirect('/admin/dashboard')

        } else {
            
            res.render('login', {
                errorMessage: "Invalid email or password" 
            });
        }
        
    } catch (error) {
        console.log(error.message + ' admin verify signin');
        
    }
}

// -------Admin Logout----->

const logout = async (req, res) => {
    try {
        req.session.admin = false;
    res.json({
        success: true
    })

    } catch (error) {
        console.log(error.message + ' admin logout');
    }

}


// ------List Users------>

const loadUsers = async ( req, res ) => {

    try {

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        let searchTerm = '';
        let query = {};

        if (req.query.search) {
            searchTerm = req.query.search.trim();
            query = { 
                $or: [
                    { firstName: new RegExp(searchTerm, 'i') },
                    { lastName: new RegExp(searchTerm, 'i') }
                ]
            };
        }

        const users = await User.find(query).skip(skip).limit(limit);
        const totalUsers = await User.countDocuments();
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
        res.status(500).send("Internal Server Error");
        }
}




// ------Block-User------>

const blockUser = async (req, res) => {
    try {
        const userId = req.body.userId;
        const blockedUser = await User.findByIdAndUpdate(userId, { isBlocked: true }, { new: true });

        if (blockedUser.isBlocked) {
            const activeUsersCount = await User.countDocuments({ isBlocked: false });
            const blockedUsersCount = await User.countDocuments({ isBlocked: true });
            res.json({ isBlocked: true, activeUsersCount, blockedUsersCount });
        } else {
            res.json({ isBlocked: false, message: 'Error blocking user' });
        }
    } catch (error) {
        console.error('Error blocking user:', error.message);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

// ------Unblock-User------>

const unBlockUser = async (req, res) => {
    try {
        const userId = req.body.userId;
        const unblockedUser = await User.findByIdAndUpdate(userId, { isBlocked: false }, { new: true });

        if (!unblockedUser.isBlocked) {
            const activeUsersCount = await User.countDocuments({ isBlocked: false });
            const blockedUsersCount = await User.countDocuments({ isBlocked: true });
            res.json({ isBlocked: false, activeUsersCount, blockedUsersCount });
        } else {
            res.json({ isBlocked: true, message: 'Error unblocking user' });
        }
    } catch (error) {
        console.error('Error unblocking user:', error.message);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};


// ------Category List------>

const category = async ( req, res ) => {

    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 5;
        const skip = (page - 1) * limit;
        let searchTerm = '';
        let query = {};

        if (req.query.search) {
            searchTerm = req.query.search.trim();
            query = { 
                $or: [
                    { name: new RegExp(searchTerm, 'i') },
                    { description: new RegExp(searchTerm, 'i') }
                ]
            };
        }
        const categories = await Category.find(query).skip(skip).limit(limit);
        const totalCategories = await Category.countDocuments();

            res.render("categories", {
                categories,
                totalCategories,
                page,
                limit,
                totalPages: Math.ceil(totalCategories / limit),
                searchTerm
            });

    } catch (error) { 
        console.error('Error getting categories:', error.message);
        res.status(500).json({ message: 'Internal Server Error' });
    }   
}

 
// ------Add Category----->

const addCategory = async (req, res) => {
    try {
        const { name, description, gender } = req.body;

        const existingCats = await Category.aggregate([
          {
            $match: {
              $and: [
                { name: new RegExp(`^${name}$`, "i") }, // Case-insensitive name match
                { gender: { $eq: gender } }, // Different gender
              ],
            },
          },
        ]);
        
        if (existingCats.length > 0) {
          return res.json({
            message: "Category already exists with the same gender.",
          });
        }

     
        const newCat = new Category({
            name: name,
            description: description,
            gender: gender,
            isListed: true,
        });
        await newCat.save();
        
        return res.json({
                success: "Category added ",
                });
        
        

    } catch (error) {
        console.error("Error adding category:", error.message);
        return res.json({ message: "Internal Server Error" });
    }
};

// ------Edit Category------->

const editCategory = async (req, res) => {
    try {
        const { name, description, gender, id } = req.body;
        

        // Check if a category with the same name and gender exists, excluding the current category
        const existingCat = await Category.findOne({
            name: { $regex: new RegExp(`^${name}$`, "i") },
            gender: gender,
            _id: { $ne: id },
        });

        if (existingCat) {
            return res.json({
            id: id,
            message: "Category with the same name and gender already exists",
            });
        }

        // Update the category
        const updatedCategory = await Category.findByIdAndUpdate(
            id,
            { name, description, gender },
            { new: true }
        );

        if (!updatedCategory) {
            return res.json({
              id,
              success: false,
              message: "Category not found",
            });
        }

        res.json({
            id,
            success: true,
            message: "Category updated successfully",
          });
        } catch (error) {
          console.log("Error updating Product", error.message);
          res.json({
            success: false,
            message: "An error occurred while updating the category",
          });
        }
};




// ------unlist Category------>

const unlistCategory = async (req, res) => {
    try {
        const categoryId = req.body.categoryId;
        
        const unlistCat = await Category.findByIdAndUpdate(categoryId, { isListed: false }, { new: true });
        
        if (!unlistCat.isListed) {
            
            res.json({ isListed: false });
        } else {
            res.json({ isListed: true, message: 'Error unlisting category' });
        }
    } catch (error) {
        console.error('Error unlisting category:', error.message);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

// ------list Category------>

const listCategory = async (req, res) => {
    try {
        const categoryId = req.body.categoryId;
        const listCat = await Category.findByIdAndUpdate(categoryId, { isListed: true }, { new: true });

        if ( listCat.isListed) {

            res.json({ isListed: true });

        } else {
            res.json({ isListed: false, message: 'Error listing category' });
        }
    } catch (error) {
        console.error('Error listing category:', error.message);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

// ------Brand List------>

const brand = async ( req, res ) => {

    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 5;
        const skip = (page - 1) * limit;
        let searchTerm = '';
        let query = {};

        if (req.query.search) {
            searchTerm = req.query.search.trim();
            query = { 
                $or: [
                    { name: new RegExp(searchTerm, 'i') },
                    { description: new RegExp(searchTerm, 'i') }
                ]
            };
        }
        const brands = await Brand.find(query).skip(skip).limit(limit);
        const totalBrands = await Brand.countDocuments();

            res.render("brands", {
                brands,
                totalBrands,
                page,
                limit,
                totalPages: Math.ceil(totalBrands / limit),
                searchTerm,
            });

    } catch (error) { 
        console.error('Error getting brands:', error.message);
        res.status(500).json({ message: 'Internal Server Error' });
    }   
}

// ------unlist Brand------>

const unlistBrand = async (req, res) => {
    try {
        const brandId = req.body.brandId;
        
        const unlistBrand = await Brand.findByIdAndUpdate(brandId, { isListed: false }, { new: true });
        
        if (!unlistBrand.isListed) {
            
            res.json({ isListed: false });
        } else {
            res.json({ isListed: true, message: 'Error unlisting brand' });
        }
    } catch (error) {
        console.error('Error unlisting brand:', error.message);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

// ------list Brand------>

const listBrand = async (req, res) => {
    try {
        const brandId = req.body.brandId;
        const listBrand = await Brand.findByIdAndUpdate( brandId, { isListed: true }, { new: true });

        if ( listBrand.isListed) {

            res.json({ isListed: true });

        } else {
            res.json({ isListed: false, message: 'Error listing brand' });
        }
    } catch (error) {
        console.error('Error listing brand:', error.message);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};


// ------Add Brand----->

const addBrand = async (req, res) => {
    try {
        const { name, description,  status } = req.body;

        

        const existingBrand = await Brand.findOne({
          name: new RegExp(`^${name}$`, "i"),
        });
        
        if (existingBrand) {
          return res.json({
            message: "Brand with same name already exists",
          });
        }

     
        const newBrand = new Brand({
            name: name,
            description: description,
            isListed: status,
        });

        await newBrand.save();
        
        res.json({
            success: "Brand added ",
            });
        
        

    } catch (error) {
        console.error("Error adding brand:", error.message);
        return res.json({ message: "Internal Server Error" });
    }
};

// ------Edit Brand------->

const editBrand = async (req, res) => {
    try {
        const { name, description, id } = req.body;
        

        const existingBrand = await Brand.findOne({
          name: new RegExp(`^${name}$`, "i"),
          _id: { $ne: id },
        });

        if (existingBrand) {
            return res.json({
            id: id,
            message: "Brand with the same name already exists",
            });
        }

        // Update the category
        const updatedBrand = await Brand.findByIdAndUpdate(
            id,
            { name, description },
            { new: true }
        );

        if (!updatedBrand) {
            return res.json({
              id: id,
              message: "Brand not found",
            });
        }

        res.json({ 
            success: "Brand edited", 
            brand: updatedBrand ,
            id: id,
        });
    } catch (error) {
        console.error(error.message);
        res.json({
        message: "Server error",
        });
  }
};


// Function to get sales data
const getSalesData = async (match = {}) => {
    return Order.aggregate([
      { $match: match },
      { $unwind: '$products' },
      {
        $group: {
          _id: '$products.product',
          name: { $first: '$products.name' },
          totalQuantity: { $sum: '$products.quantity' }
        }
      },
      { $sort: { totalQuantity: -1 } }
    ]);
  };
  
  // Function to get chart data
  const getChartData = (productSales, topCount = 3) => {
    const topProducts = productSales.slice(0, topCount);
    const topQuantity = topProducts.reduce((acc, product) => acc + product.totalQuantity, 0);
    const othersQuantity = productSales.slice(topCount).reduce((acc, product) => acc + product.totalQuantity, 0);
    const totalQuantity = topQuantity + othersQuantity;
  
    const chartData = topProducts.map(product => ({
      name: product.name,
      value: Math.round((product.totalQuantity / totalQuantity) * 100)
    }));
  
    chartData.push({
      name: 'Other Sales',
      value: Math.round((othersQuantity / totalQuantity) * 100)
    });
  
    return { chartData, totalSales: totalQuantity };
  };
  
  // Function to get top N best-selling products
  const getTopProducts = async (n = 10) => {
    const productSales = await getSalesData({ paymentStatus: { $in: ["Paid", "Pending"] } });
    return productSales.slice(0, n);
  };
  
  // Function to get top N best-selling categories
  const getTopCategories = async (n = 10) => {
    return Order.aggregate([
      { $match: { paymentStatus: { $in: ["Paid", "Pending"] } } },
      { $unwind: '$products' },
      {
        $group: {
          _id: '$products.category',
          name: { $first: '$products.category' },
          totalQuantity: { $sum: '$products.quantity' }
        }
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: n }
    ]);
  };
  
  // Function to get top N best-selling brands
  const getTopBrands = async (n = 10) => {
    return Order.aggregate([
      { $match: { paymentStatus: { $in: ["Paid", "Pending"] } } },
      { $unwind: '$products' },
      {
        $group: {
          _id: '$products.brand',
          name: { $first: '$products.brand' },
          totalQuantity: { $sum: '$products.quantity' }
        }
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: n }
    ]);
  };
  
  const createMatchStage = (filterSales) => {
    const currentDate = moment().startOf('day');
    let matchStage = {
        'paymentStatus': { $in: ["Paid", "Pending"] }
    };

    switch (filterSales) {
      case 'daily':
        matchStage.createdAt = {
          $gte: currentDate.toDate(),
          $lt: moment(currentDate).endOf('day').toDate()
        };
        break;
      case 'weekly':
        matchStage.createdAt = {
          $gte: moment(currentDate).subtract(7, 'days').toDate(),
          $lt: moment(currentDate).endOf('day').toDate()
        };
        break;
      case 'monthly':
        matchStage.createdAt = {
          $gte: moment(currentDate).subtract(1, 'month').toDate(),
          $lt: moment(currentDate).endOf('day').toDate()
        };
        break;
      case 'yearly':
        matchStage.createdAt = {
          $gte: moment(currentDate).subtract(1, 'year').toDate(),
          $lt: moment(currentDate).endOf('day').toDate()
        };
        break;
      case 'custom':
        if (startDate && endDate) {
          matchStage.createdAt = {
            $gte: moment(startDate).startOf('day').toDate(),
            $lt: moment(endDate).endOf('day').toDate()
          };
        }
        break;
      default:
        
        break;
    }
  
    return matchStage;
  };


  const dashboard = async (req, res) => {
    try {
      const productSales = await getSalesData({ paymentStatus: { $in: ["Paid", "Pending"] } });
      const { chartData, totalSales } = getChartData(productSales);
  
      const topProducts = await getTopProducts();
      const topCategories = await getTopCategories();
      const topBrands = await getTopBrands();
  
      res.render('dashboard', {
        chartData,
        totalSales,
        topProducts,
        topCategories,
        topBrands
      });
    } catch (error) {
      console.log('error loading dashboard', error.message);
      res.status(500).json({ success: false, message: 'Error loading dashboard' });
    }
  };
  
//----dashboard sales filter------->

const salesFilter = async (req, res) => {
    try {
        const { filterSales } = req.query;
        let matchStage = {};

        // Define date ranges based on the filterSales option
        if (filterSales === 'weekly') {
            const today = new Date();
            const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
            matchStage = {
                $match: {
                    paymentStatus: { $in: ['Paid', 'Pending'] },
                    createdAt: { $gte: startOfWeek }
                }
            };
        } else if (filterSales === 'monthly') {
            const today = new Date();
            const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            matchStage = {
                $match: {
                    paymentStatus: { $in: ['Paid', 'Pending'] },
                    createdAt: { $gte: startOfMonth }
                }
            };
        } else if (filterSales === 'yearly') {
            const today = new Date();
            const startOfYear = new Date(today.getFullYear(), 0, 1);
            matchStage = {
                $match: {
                    paymentStatus: { $in: ['Paid', 'Pending'] },
                    createdAt: { $gte: startOfYear }
                }
            };
        } else {
            matchStage = {
                $match: {
                    paymentStatus: { $in: ['Paid', 'Pending'] }
                }
            };
        }

        // Group the data accordingly
        let groupStage = {};
        if (filterSales === 'weekly') {
            groupStage = {
                $group: {
                    _id: { $dayOfWeek: '$createdAt' },
                    totalSales: { $sum: '$totalAmount' },
                    count: { $sum: 1 }
                }
            };
        } else if (filterSales === 'monthly') {
            groupStage = {
                $group: {
                    _id: { $week: '$createdAt' },
                    totalSales: { $sum: '$totalAmount' },
                    count: { $sum: 1 }
                }
            };
        } else if (filterSales === 'yearly') {
            groupStage = {
                $group: {
                    _id: { $month: '$createdAt' },
                    totalSales: { $sum: '$totalAmount' },
                    count: { $sum: 1 }
                }
            };
        }

        const salesData = await Order.aggregate([
            matchStage,
            groupStage,
            { $sort: { _id: 1 } } // Sort by time period (day/week/month)
        ]);

        res.json({
            success: true,
            salesData,
        });

    } catch (error) {
        console.log('Error fetching the sales data:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error fetching sales data'
        });
    }
};



module.exports = {
    login,
    dashboard, 
    loadSignin,
    verifySignIn,
    logout,
    loadUsers,
    blockUser,
    unBlockUser,
    category,
    addCategory,
    editCategory,
    unlistCategory,
    listCategory,
    brand,
    addBrand,
    editBrand,
    unlistBrand,
    listBrand,
    salesFilter,
}
