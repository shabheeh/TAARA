
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
                return res.status(400).json({ success: false, message: "Variant not found" });
            }
            if (variant.quantity < products[i].quantity) {
                return res.status(400).json({ success: false, message: `Insufficient stock for variant ${variant._id}` });
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
            message: "Order placed successfully",
            order
        });

    } catch (error) {
        console.log('Error placing order:', error.message);
        res.json({ success: false, message: 'Error placing order' });
    }
}







// ------Orders List------>

const orders = async ( req, res ) => {

    try {
        // const page = parseInt(req.query.page) || 1;
        // const limit = 5;
        // const skip = (page - 1) * limit;

        const orders = await Order.find().populate('user').populate('address')
        const totalOrders = await Order.countDocuments();

            res.render("orders", {
                orders,
                totalOrders,
                
            });

    } catch (error) { 
        console.error('Error getting orders:', error.message);
        res.status(500).json({ message: 'Internal Server Error' });
    }   
}

module.exports = {
    loadCheckout,
    checkout,
    orders
}