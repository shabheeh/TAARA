
const Order = require('../Models/orderModel')
const User = require('../Models/userModel')
const Product = require('../Models/productModel')
const Variant = require("../Models/variantModel")
const Cart = require('../Models/cartModel')
const Address = require('../Models/addressModel')
const crypto = require('crypto');




// ---------Checkout--------->

const loadCheckout = async (req, res) => {
    try {
        const userId = req.userId;

        const user = await User.findOne({ _id: userId });
        const addresses = await Address.find({ user: userId });
        const cart = await Cart.findOne({ user: userId })
            .populate("products.product")
            .populate("products.variant");

        let subTotal = 0;
        let shippingCharge = 0;
        let totalPrice = 0;
        let filteredProducts = [];

        if (cart) {
            filteredProducts = cart.products.filter(product => product.quantity > 0);

            

            filteredProducts.forEach((product) => {
                subTotal += product.product.price * product.quantity;
            });

            shippingCharge = (subTotal >= 500 && subTotal !== 0) ? 0 : 50;
            totalPrice = subTotal + shippingCharge;
        }

        res.render('checkout', {
            user,
            addresses,
            cart: { products: filteredProducts },
            subTotal,
            shippingCharge,
            totalPrice
        });

    } catch (error) {
        console.log('Error loading checkout:', error.message);
    }
};

// ---------Checkout-------->

const checkout = async (req, res) => {
    try {
        const userId = req.userId;
        const { addressId, paymentMethod } = req.body;

        const cart = await Cart.findOne({ user: userId })
            .populate("products.product")
            .populate("products.variant");

        if (!cart) {
            return res.json({ success: false, message: "Cart not found" });
        }

        let subTotal = 0;
        let shippingCharge = 0;
        let totalPrice = 0;
        let totalQuantity = 0;
        let filteredProducts = cart.products.filter(product => product.quantity > 0);

        

        filteredProducts.forEach((product) => {
            subTotal += product.product.price * product.quantity;
            totalQuantity += product.quantity;
        });

        shippingCharge = (subTotal >= 500 && subTotal !== 0) ? 0 : 50;
        totalPrice = subTotal + shippingCharge;

        const products = filteredProducts.map(product => ({
            product: product.product._id,
            variant: product.variant._id,
            quantity: product.quantity,
            price: product.product.price * product.quantity
        }));

        function generateOrderId() {
            const prefix = "TR";
            const randomDigits = Math.floor(10000000 + Math.random() * 90000000).toString();
            return prefix + randomDigits;
        }
        
        const orderId = generateOrderId();

        // update stocks left
        for (let i = 0; i < products.length; i++) {
            const variant = await Variant.findById(products[i].variant);
            if (!variant) {
                return res.json({ success: false, message: "Variant not found" });
            }
            if (variant.quantity < products[i].quantity) {
                return res.json({ success: false, message: `Insufficient stock for variant ${variant._id}` });
            }
            variant.quantity -= products[i].quantity;

            await variant.save();
        }


        const order = new Order({
            orderId,
            user: userId,
            address: addressId,
            payment: paymentMethod,
            products,
            totalQuantity,
            shippingCharge,
            totalPrice
        });

        await order.save();

        // Filter out purchased products from the cart using string comparison
        const updatedCartProducts = cart.products.filter(cartProduct => {
            let isPurchased = false;
            for (let i = 0; i < filteredProducts.length; i++) {
                if (cartProduct.variant._id.toString() === filteredProducts[i].variant._id.toString()) {
                    isPurchased = true;
                    break;
                }
            }
            return !isPurchased;
        });

        cart.products = updatedCartProducts;
        await cart.save();

        res.json({
            success: true,
            orderId: order._id,
            message: "Order placed successfully",
            order
        });

    } catch (error) {
        console.log('Error placing order:', error.message);
        res.json({ success: false, message: 'Error placing order' });
    }
}

// -------checkout success-------> 

const confirmOrder = async ( req, res ) => {

    try {
        const orderId = req.params.orderId
        const user = req.userId
        const order = await Order.findById(orderId).populate('products.product').populate('products.variant')
        .populate('user').populate('address')

        .populate('payment')
        if (!order) {
            return res.json({ success: false, message: 'Order not found'
            })
        }

        res.render('confirmOrder', {
        order,
        user
        })


    } catch (error) {
        console.log('Error placing order:', error.message);
        res.json({ success: false, message: 'Error placing order' });
        
    }
}




// ------Orders List------>

const orders = async ( req, res ) => {

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
                    { orderId: new RegExp(searchTerm, 'i') },
                    { 'user.firstName': new RegExp(searchTerm, 'i') }
                ]
            };
        }

        const orders = await Order.find(query).populate('user').populate('address').sort({ createdAt: -1 }).skip(skip)
        .limit(limit);
        const totalOrders = await Order.countDocuments();

            res.render("orders", {
                orders,
                totalOrders,
                page,
                limit,
                searchTerm,
                totalPages: Math.ceil(totalOrders / limit),
                
            });

    } catch (error) { 
        console.error('Error getting orders:', error.message);
        res.status(500).json({ message: 'Internal Server Error' });
    }   
}

// ----------Order Details-------->

const viewOrder = async ( req, res ) => {

    try {
        const orderId = req.params.orderId
        const order = await Order.findById(orderId)
        .populate('user')
        .populate('address')
        .populate({
            path: 'products.product',
            populate: [
                { path: 'brand' },     
                { path: 'category' }    
            ]
        })
        .populate('products.variant')

        const totalOrders = await Order.countDocuments({ user: order.user._id });

        
        res.render('viewOrder', {
            order,
            totalOrders
        })
    } catch (error) {
        console.error('Error getting orders:', error.message);
        
    }
}

// -----Update status------>

const updateStatus = async (req, res) => {

    try {

        const { orderId, productId, variantId, status } = req.body;

        
        const order = await Order.findById(orderId);
        if (!order) {
            return res.json({ 
                success: false,
                message: 'Order not found' 
            });
        }

        
        const productIndex = order.products.findIndex(p => 
            p.product.toString() === productId && p.variant.toString() === variantId
        );
        if (productIndex === -1) {
            return res.json({ 
                success: false,
                message: 'Product or variant not found in the order' 
            });
        }

        const currentStatus = order.products[productIndex].status;
        const validTransitions = {
            'Pending': ['Dispatched'],
            'Dispatched': ['Out for Delivery'],
            'Out for Delivery': ['Delivered'],
            'Delivered': [],
            'Cancelled': []

        };

        if (!validTransitions[currentStatus].includes(status)) {
            return res.json({
                id: variantId,
                success: false,
                message: `Invalid status transition from ${currentStatus} to ${status}`
            });
        }

        order.products[productIndex].status = status;
        await order.save();

        res.json({
            id: variantId,
            status: status,
            success: true,
            message: 'Status updated successfully'
        });
    } catch (error) {
        console.error('Error updating status:', error.message);
        res.json({
            success: false,
            message: 'Error updating status'
        });
    }
};

// -------Cancel Order------->

const cancelOrder = async ( req, res ) => {

    try {
        
        const { orderId, productId, variantId, reason } = req.body

        const order = await Order.findById(orderId);
        if (!order) {
            return res.json({ 
                success: false,
                message: 'Order not found' 
            });
        }

        
        const productIndex = order.products.findIndex(p => 
            p.product.toString() === productId && p.variant.toString() === variantId
        );

        if (productIndex === -1) {
            return res.json({ 
                success: false,
                message: 'Product or variant not found in the order' 
            });
        }

        order.products[productIndex].status = 'Cancelled'
        order.products[productIndex].cancelReason = reason
        order.products[productIndex].cancelDate = new Date()
        
        await order.save();

        res.json({
            success: true,
            orderId,
            variantId,
            message: 'Order cancelled successfully'
            });
    

    } catch (error) {
        console.log('Error cancelling order', error.message)
        res.json({
            success: false,
            orderId,
            variantId,
            message: 'Error cancelling order'
            })
        
    }
}






module.exports = {
    loadCheckout,
    checkout,
    confirmOrder,
    orders,
    viewOrder,
    updateStatus,
    cancelOrder
}    