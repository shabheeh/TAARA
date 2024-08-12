const Product = require('../Models/productModel')
const Category = require('../Models/categoryModel')
const Offer = require('../Models/offerModel')
const Coupon = require('../Models/couponModel')


// -----Offers------>
const offers = async ( req, res ) => {
    
    try {
        
        const products = await Product.find()
        const categories = await Category.find()
        const productOffer = await Offer.find({type: "products"}).populate('products')
        const categoryOffer = await Offer.find({type: "categories"}).populate('categories')

        res.render('offers', {
            productOffer,
            categoryOffer,
            products,
            categories
        })
    } catch (error) {
        console.log('Error loading offers', error.message)
    }
}

// -----add Offer-----> 

const addOffer = async (req, res) => {
    try {
        const { title, description, discount, status, type } = req.body;
        let offerData = { title, description, discount, type, status };
        let affectedProducts = [];

        if (type === 'products') {
            offerData.products = JSON.parse(req.body.appliedProducts);
            affectedProducts = offerData.products;
        } else if (type === 'categories') {
            offerData.categories = JSON.parse(req.body.appliedCategories);

  
            const categoryProducts = await Product.find({ category: { $in: offerData.categories } }).select('_id').lean();
            affectedProducts = categoryProducts.map(product => product._id);
        } else {
            return res.json({ success: false, type, message: 'Invalid offer type' });
        }

        // Save the new offer
        const offer = new Offer(offerData);
        const saveOffer = await offer.save();

        if (saveOffer) {

            await Product.updateMany(
                { _id: { $in: affectedProducts } },
                { $addToSet: { offers: saveOffer._id } } 
            );

            res.json({ success: true, type, message: 'Offer added successfully' });
        } else {
            res.json({ success: false, type, message: 'Failed to add offer' });
        }
    } catch (error) {
        console.error('Error adding offer:', error.message);
        res.json({ success: false, type, message: 'Error adding offer' });
    }
};





// ------Update Offer----->
const updateOffer = async (req, res) => {
    try {
        const { id, title, description, discount, status, type } = req.body;

        let offerData = {
            title,
            description,
            discount,
            status
        };
        let affectedProducts = [];

        if (type === 'products') {
            offerData.products = JSON.parse(req.body.appliedProducts);
            affectedProducts = offerData.products;
        } else if (type === 'categories') {
            offerData.categories = JSON.parse(req.body.appliedCategories);

            // Fetch all products that belong to the specified categories
            const categoryProducts = await Product.find({ category: { $in: offerData.categories } }).select('_id').lean();
            affectedProducts = categoryProducts.map(product => product._id);
        } else {
            return res.json({
                id,
                success: false,
                type,
                message: 'Invalid offer type'
            });
        }

        // Update the offer
        const offer = await Offer.findByIdAndUpdate(id, offerData, { new: true });

        if (offer) {

            await Product.updateMany(
                { offers: id },
                { $pull: { offers: id } }
            );


            if (affectedProducts.length > 0) {
                await Product.updateMany(
                    { _id: { $in: affectedProducts } },
                    { $addToSet: { offers: id } } 
                );
            }

            res.json({
                id,
                success: true,
                type,
                message: 'Offer updated successfully'
            });
        } else {
            res.json({
                id,
                success: false,
                type,
                message: 'Offer not found'
            });
        }
    } catch (error) {
        console.error('Error updating offer:', error.message);
        res.json({
            id: req.body.id,
            success: false,
            type: req.body.type,
            message: 'Error updating offer'
        });
    }
};


// -------delete offer------> 

const deleteOffer = async ( req, res ) => {

    try {
        const id = req.body.id
        const offer = await Offer.findByIdAndDelete(id);

        if(offer){
            res.json({
                id,
                success: true,
                message: 'Offer deleted successfully'
            });

        } else {
            res.json({
                id,
                success: false,
                message: 'Offer not found'
            });
        }

    } catch (error) {
        console.error('Error deleting offer:', error.message);
        res.json({
            success: false,
            message: 'Error deleting offer'
        });
        
    }
}

// ------Coupons----->

const coupons = async ( req, res ) => {

    try {
        const coupons = await Coupon.find()
        res.render('coupons', {
            coupons
        })
    } catch (error) {
        console.error('Error rendering coupons page:', error.message);
        
    }
}

// ------add Coupon----->

const addCoupon = async (req, res) => {
    try {
        const { name, code, description, amount, discount, maxDiscount, maxUses, status, expires } = req.body;

        // check this coupon with the same code already exists
        const existingCoupon = await Coupon.findOne({ code: code });
        if (existingCoupon) {
            return res.json({
                success: false,
                message: 'A coupon with this code already exists',
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
            expires
        });

        const saveCoupon = await coupon.save();

        if (saveCoupon) {
            res.json({
                success: true,
                message: 'Coupon added successfully',
            });
        } else {
            res.json({
                success: false,
                message: 'Error adding coupon',
            });
        }

    } catch (error) {
        console.error('Error adding coupon:', error.message);
        res.json({
            success: false,
            message: 'Error adding coupon',
        });
    }
};

// -----update Coupon----->

const updateCoupon = async (req, res) => {
    try {
        const { id, name, code, description, amount, discount, maxDiscount, maxUses, status, expires } = req.body;

        // Check if another coupon with the same code already exists
        const existingCoupon = await Coupon.findOne({ code: code, _id: { $ne: id } });
        if (existingCoupon) {
            return res.json({
                id,
                success: false,
                message: 'Another coupon with this code already exists',
            });
        }

        const coupon = await Coupon.findByIdAndUpdate(id, {
            name,
            code,
            description,
            amount,
            discount,
            maxDiscount,
            maxUses,
            status,
            expires
        }, { new: true });

        if (coupon) {
            res.json({
                id,
                success: true,
                message: 'Coupon updated successfully',
            });
        } else {
            res.json({
                id,
                success: false,
                message: 'Error updating coupon',
            });
        }

    } catch (error) {
        console.error('Error updating coupon:', error.message);
        res.json({
            id: req.body.id,
            success: false,
            message: 'Error updating coupon',
        });
    }
};

// delete coupon----->

const deleteCoupon = async ( req, res ) => {

    try {
        const id = req.body.id
        const coupon = await Coupon.findByIdAndDelete(id);
        if(coupon){
            res.json({
                id,
                success: true,
                message: 'Coupon deleted successfully',
            })
        } else {
            res.json({
                id,
                success: false,
                message: 'Error deleting coupon',
            })
        }

    } catch (error) {
        console.error('Error deleting coupon:', error.message);
        res.json({
            success: false,
            message: 'Error deleting coupon',
        })
        
    }
}

module.exports = {
    offers,
    addOffer,
    updateOffer,
    deleteOffer,
    coupons,
    addCoupon,
    updateCoupon,
    deleteCoupon,
}