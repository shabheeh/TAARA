const User = require("../Models/userModel");
const Category = require ("../Models/categoryModel")
const Brand = require("../Models/brandModel")
const Order = require('../Models/orderModel')
const { bestSellingBrands, getSalesAndRevenue } = require('../Helpers/dashboard')



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
  

  
//  best procucts
  const getTopProducts = async (n = 10) => {
    const productSales = await getSalesData({ paymentStatus: { $in: ["Paid", "Pending"] } });
    return productSales.slice(0, n);
  };
  
  // best selling categories
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
  
  


  const dashboard = async (req, res) => {
    try {
 
      const chartData = await bestSellingBrands();
      const topProducts = await getTopProducts();
      const topCategories = await getTopCategories();
      const topBrands = await getTopBrands();
      const { totalSales, totalRevenue, totalProductsSold } = await getSalesAndRevenue();
  
      res.render('dashboard', {
        chartData,
        totalSales,
        totalRevenue,
        totalProductsSold,
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

const salesGraph = async (req, res) => {
    try {
        const { filterSales, date } = req.query;
        let matchStage = {};
        let groupStage = {};
        let startDate, endDate;

        if (filterSales === 'daily') {
            const [year, month] = date.split('-');
            startDate = new Date(year, month - 1, 1);
            endDate = new Date(year, month, 0);
            groupStage = {
                $group: {
                    _id: { $dayOfMonth: '$createdAt' },
                    totalSales: { $sum: '$finalTotal' }
                }
            };
        } else if (filterSales === 'monthly') {
            startDate = new Date(date, 0, 1);
            endDate = new Date(date, 11, 31);
            groupStage = {
                $group: {
                    _id: { $month: '$createdAt' },
                    totalSales: { $sum: '$finalTotal' }
                }
            };
        } else if (filterSales === 'yearly') {
            startDate = new Date(new Date().getFullYear() - 4, 0, 1);
            endDate = new Date();
            groupStage = {
                $group: {
                    _id: { $year: '$createdAt' },
                    totalSales: { $sum: '$finalTotal' }
                }
            };
        }

        matchStage = {
            $match: {
                paymentStatus: { $in: ['Paid', 'Pending'] },
                createdAt: { $gte: startDate, $lte: endDate }
            }
        };
        
        const salesData = await Order.aggregate([
            matchStage,
            groupStage,
            { $sort: { _id: 1 } }
        ]);

        // console.log('salesData:', salesData);

        // Transform and fill in missing data
        let transformedData;
        if (filterSales === 'daily') {
            const daysInMonth = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0).getDate();
            transformedData = Array.from({length: daysInMonth}, (_, i) => ({
                name: (i + 1).toString(),
                value: 0
            }));
            salesData.forEach(item => {
                transformedData[item._id - 1].value = item.totalSales;
            });
        } else if (filterSales === 'monthly') {
            transformedData = Array.from({length: 12}, (_, i) => ({
                name: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i],
                value: 0
            }));
            salesData.forEach(item => {
                transformedData[item._id - 1].value = item.totalSales;
            });
        } else if (filterSales === 'yearly') {
            const currentYear = new Date().getFullYear();
            transformedData = Array.from({length: 5}, (_, i) => ({
                name: (currentYear - 4 + i).toString(),
                value: 0
            }));
            salesData.forEach(item => {
                const index = item._id - (currentYear - 4);
                if (index >= 0 && index < 5) {
                    transformedData[index].value = item.totalSales;
                }
            });
        }

        // console.log('transformedData:', transformedData);

        const totalSales = transformedData.reduce((sum, item) => sum + item.value, 0);

        // console.log('totalSales:', totalSales);

        res.json({
            success: true,
            data: transformedData,
            totalSales: totalSales
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
    salesGraph,
}
