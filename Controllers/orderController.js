
const Order = require('../Models/orderModel')
const User = require('../Models/userModel')
const Product = require('../Models/productModel')
const Variant = require("../Models/variantModel")
const Cart = require('../Models/cartModel')
const Address = require('../Models/addressModel')
const Coupon = require('../Models/couponModel')
const Razorpay = require('razorpay')

const razorpay = new Razorpay({
  key_id: process.env.KEY_ID,
  key_secret: process.env.KEY_SECRET
});



// ---------Checkout--------->

const loadCheckout = async (req, res) => {
    try {
        const userId = req.userId;

        const user = await User.findOne({ _id: userId });
        const addresses = await Address.find({ user: userId });
        const cart = await Cart.findOne({ user: userId })
            .populate({
                path: "products.product",
                populate: {
                    path: 'offers',
                    model: 'Offer'
                }
            })
            .populate("products.variant");

        let originalSubTotal = 0;
        let discountedSubTotal = 0;
        let shippingCharge = 0;
        let totalPriceCart = 0;
        let filteredProducts = [];

        if (cart) {
            filteredProducts = cart.products.filter(product => product.quantity > 0);

            filteredProducts.forEach((product) => {
                const quantity = product.quantity;
                const productPrice = product.product.price;
                
                // Calculate original subtotal
                originalSubTotal += productPrice * quantity;

                // Calculate discounted price
                let discountedPrice = productPrice;
                if (product.product.offers && product.product.offers.length > 0) {
                    const bestOffer = product.product.offers.reduce((best, current) =>
                        (current.discount > best.discount) ? current : best
                    );
                    discountedPrice = productPrice * (1 - bestOffer.discount / 100);
                }

                // Calculate discounted subtotal
                discountedSubTotal += discountedPrice * quantity;

                // Add discounted price to the product for rendering
                product.discountedPrice = Math.round(discountedPrice.toFixed(2));
            });

            shippingCharge = (discountedSubTotal >= 500 && discountedSubTotal !== 0) ? 0 : 50;
            totalPriceCart = discountedSubTotal + shippingCharge;
        }

        const coupons = await Coupon.find({ status: 'Active' }).sort({createdAt: -1})

        res.render('checkout', {
            user,
            addresses,
            cart: { products: filteredProducts },
            coupons,
            originalSubTotal: Math.round(originalSubTotal.toFixed(2)),
            discountedSubTotal: Math.round(discountedSubTotal.toFixed(2)),
            shippingCharge,
            totalPriceCart: Math.round(totalPriceCart.toFixed(2))
        });

    } catch (error) {
        console.log('Error loading checkout:', error.message);
        res.status(500).send('An error occurred while loading the checkout page.');
    }
};


// -----validate coupon----->

const validateCoupon = async ( req, res ) => {
    try {

      const { couponCode } = req.body;
      const userId = req.user._id;

  

    // Find the coupon
    const coupon = await Coupon.findOne({ code: couponCode, status: 'Active' });
    console.log(coupon)
    if (!coupon) {
      return res.json({ valid: false, message: "Invalid coupon code" });
    }

  
    if (coupon.expires && new Date() > coupon.expires) {
      return res.json({ valid: false, message: "Coupon has expired" });
    }

   
    if (coupon.usedUsers.includes(userId)) {
      return res.json({ valid: false, message: "You have already used this coupon" });
    }


    if (coupon.maxUses && coupon.usedUsers.length >= coupon.maxUses) {
      return res.json({ valid: false, message: "Coupon has reached its maximum uses" });
    }


    res.json({
      valid: true,
      message: "Coupon is valid",
      discount: coupon.discount,
      minAmount: coupon.amount
    });

  } catch (error) {
    console.error('Error validating coupon:', error);
    res.status(500).json({ valid: false, message: "Server error occurred" });
  }
}

// ---------Checkout-------->

const checkout = async (req, res) => {
    try {
      const userId = req.userId;
      const user = await User.findById(userId)
      const { addressId, paymentMethod, couponCode } = req.body;
      const address = await Address.findById(addressId)
      const cart = await Cart.findOne({ user: userId })
        .populate({
          path: "products.product",
          populate: {
            path: 'offers',
            model: 'Offer'
          }
        })
        .populate("products.variant");
  
      if (!cart) {
        return res.json({ success: false, message: "Cart not found" });
      }
  
      let originalSubTotal = 0;
      let discountedSubTotal = 0;
      let shippingCharge = 0;
      let totalPrice = 0;
      let totalQuantity = 0;
      let filteredProducts = cart.products.filter(product => product.quantity > 0);
  
      if(filteredProducts.length < 1){
        return res.json({ success: false, message: "No products in cart" });
      }
  
      filteredProducts.forEach((product) => {
        const quantity = product.quantity;
        const productPrice = product.product.price;
        
        // original subtotal
        originalSubTotal += productPrice * quantity;
  
        //   best offer
        let discountedPrice = productPrice;
        let bestOffer = null;
        if (product.product.offers && product.product.offers.length > 0) {
          bestOffer = product.product.offers.reduce((best, current) =>
            (current.discount > best.discount) ? current : best
          );
          discountedPrice = productPrice * (1 - bestOffer.discount / 100);
        }
  
        //  discounted subtotal
        discountedSubTotal += discountedPrice * quantity;
        totalQuantity += quantity;
  

        product.discountedPrice = Math.round(discountedPrice.toFixed(2));
        product.appliedOffer = bestOffer;
      });
  
      shippingCharge = (discountedSubTotal >= 500 && discountedSubTotal !== 0) ? 0 : 50;
      totalPrice = discountedSubTotal + shippingCharge;

      // Apply coupon if provided
    let appliedCoupon = null;
    if (couponCode) {
      const coupon = await Coupon.findOne({ code: couponCode, status: 'Active' });
      
      if (coupon) {

        if (coupon.expires && new Date() > coupon.expires) {
          return res.json({ success: false, message: "Coupon has expired" });
        }

   
        if (coupon.usedUsers.includes(userId)) {
          return res.json({ success: false, message: "You have already used this coupon" });
        }


        if (coupon.maxUses && coupon.usedUsers.length >= coupon.maxUses) {
          return res.json({ success: false, message: "Coupon has reached its maximum uses" });
        }

        if (discountedSubTotal < coupon.amount) {
          return res.json({ 
            success: false, 
            message: `This coupon requires a minimum order amount of ${coupon.amount}`
          });
        }

        let couponDiscount = coupon.discount;

        couponDiscount = Math.min(couponDiscount, discountedSubTotal);

        discountedSubTotal -= couponDiscount;
        totalPrice = discountedSubTotal + shippingCharge;
        console.log(discountedSubTotal, totalPrice)

        // push the user to the usedusers field
        coupon.usedUsers.push(userId);
        await coupon.save();

        appliedCoupon = {
           couponId: coupon._id, 
           code: coupon.code,
           discount: couponDiscount
        };
      } else {
        return res.json({ success: false, message: "Invalid coupon code" });
      }
    }
  
      const products = filteredProducts.map(product => ({
        product: product.product._id,
        name: product.product.name,
        variant: product.variant._id,
        quantity: product.quantity,
        originalPrice: product.product.price,
        discountedPrice: product.discountedPrice,
        totalPrice: product.discountedPrice * product.quantity,
        appliedOffer: product.appliedOffer ? {
          offerId: product.appliedOffer._id,
          title: product.appliedOffer.title,
          type: product.appliedOffer.type,
          discount: product.appliedOffer.discount
        } : null
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
          return res.json({ success: false, message: `Variant not found for product ${products[i].product}` });
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
        payment: paymentMethod,
        products,
        totalQuantity,
        originalSubTotal: Math.round(originalSubTotal.toFixed(2)),
        discountedSubTotal: Math.round(discountedSubTotal.toFixed(2)),
        shippingCharge,
        totalPrice: Math.round(totalPrice.toFixed(2)),
        address,
        appliedCoupon,
      });
  
      await order.save();

      // Create Razorpay order
      if (paymentMethod === 'Razorpay') {
        const razorpayOrder = await razorpay.orders.create({
          amount: totalPrice * 100, 
          currency: "INR",
          receipt: orderId,
          payment_capture: 1
        });

        // Update the order with Razorpay order ID
        order.razorpayOrderId = razorpayOrder.id;
        await order.save();

        res.json({
          success: true,
          orderId: order._id,
          message: "Order created successfully",
          order: {
            id: order._id,
            amount: totalPrice,
            razorpayOrderId: razorpayOrder.id,
            razorpayKeyId: process.env.RAZORPAY_KEY_ID
          },
          user: {
            id: userId,
            email: user.email
          }
        });
      } else {
      
        res.json({
          success: true,
          orderId: order._id,
          message: "Order placed successfully",
          order: {
            id: order._id,
            amount: totalPrice
          },
          user: {
            id: userId,
            email: user.email
          }
        });
      }
  
      // remove purchased products
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
        .populate('user').populate('products.appliedOffer.offerId');
        

        if (!order) {
            return res.json({ success: false, message: 'Order not found'
            })
        }
        const cart = await Cart.findOne({ user })
                    .populate("products.product")
                    .populate("products.variant");

        res.render('confirmOrder', {
        order,
        user,
        cart,
  

        })


    } catch (error) {
        console.log('Error placing order:', error.message);
        res.json({ success: false, message: 'Error viewing success order' });
        
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
            'Return Requested': ['Returned'],
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

        const updateStock = await Variant.findById(variantId)
        updateStock.quantity +=  order.products[productIndex].quantity
        await updateStock.save()

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
            orderId: req.body.orderId,
            variantId: req.body.variantId,
            message: 'Error cancelling order'
            })
        
    }
}


const returnOrder = async ( req, res ) => {

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

      order.products[productIndex].status = 'Return Requested'
      order.products[productIndex].returnReason = reason
      order.products[productIndex].returnDate = new Date()
      
      await order.save();

      

      res.json({
          success: true,
          orderId,
          variantId,
          message: 'Request submitted successfully'
          });
  

  } catch (error) {
      console.log('Error returnin order', error.message)
      res.json({
          success: false,
          
          message: 'Error returning order'
          })
      
  }
}



module.exports = {
    loadCheckout,
    validateCoupon,
    checkout,
    confirmOrder,
    orders,
    viewOrder,
    updateStatus,
    cancelOrder,
    returnOrder
}    