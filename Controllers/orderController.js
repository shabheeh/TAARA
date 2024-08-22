
const Order = require('../Models/orderModel')
const User = require('../Models/userModel')
const Variant = require("../Models/variantModel")
const Cart = require('../Models/cartModel')
const Address = require('../Models/addressModel')
const Coupon = require('../Models/couponModel')
const Wallet = require('../Models/walletModel')
const Wishlist = require('../Models/wishlistModel')
const Razorpay = require('razorpay')
const moment = require('moment')
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});



// ---------Checkout--------->

const loadCheckout = async (req, res) => {
    try {
        const userId = req.userId;

        const [user, addresses, cart, wallet] = await Promise.all([

          User.findOne({ _id: userId }),
          Address.find({ user: userId }),
          Cart.findOne({ user: userId })
              .populate({
                  path: "products.product",
                  populate: {
                      path: 'offers',
                      model: 'Offer'
                  }
              })
              .populate("products.variant"),
          Wallet.findOne({user: userId})
      ]);

        
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
            wallet: wallet ? wallet : null,
            originalSubTotal: Math.round(originalSubTotal.toFixed(2)),
            discountedSubTotal: Math.round(discountedSubTotal.toFixed(2)),
            shippingCharge,
            totalPriceCart: Math.round(totalPriceCart.toFixed(2))
        });

    } catch (error) {
        console.error('Error loading checkout:', error.message);
        res.status(500).send('An error occurred while loading the checkout page.');
    }
};


// -----validate coupon----->

const validateCoupon = async (req, res) => {
  try {
    const { couponCode, total } = req.body;
    const userId = req.userId;

    // Find the coupon
    const coupon = await Coupon.findOne({ code: couponCode, status: 'Active' });
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

    if (total < coupon.amount) {
      return res.json({ 
        valid: false, 
        message: `This coupon requires a minimum order amount of ₹${coupon.amount}`
      });
    }

    // Calculate discount amount
    let discountAmount = (total * coupon.discount) / 100;

    // Apply maximum discount limit if set
    if (coupon.maxDiscount && discountAmount > coupon.maxDiscount) {
      discountAmount = coupon.maxDiscount;
    }

    // Ensure discount doesn't exceed the total
    discountAmount = Math.min(discountAmount, total);

    // Calculate total after discount
    const totalAfterDiscount = total - discountAmount;

    res.json({
      valid: true,
      code: coupon.code,
      message: "Coupon is valid",
      discountPercentage: coupon.discount,
      discountAmount: discountAmount,
      totalAfterDiscount: totalAfterDiscount,
      minAmount: coupon.amount,
      originalAmount: total,
    });

  } catch (error) {
    console.error('Error validating coupon:', error);
    res.status(500).json({ valid: false, message: "Server error occurred" });
  }
};

// ---------Checkout-------->

const checkout = async (req, res) => {
  try {
    const { addressId, paymentMethod, couponCode } = req.body;
    const userId = req.userId;

    const [user, address, cart, wishlist, wallet] = await Promise.all([
      User.findById(userId),
      Address.findById(addressId),
      Cart.findOne({ user: userId })
        .populate({
          path: "products.product",
          populate: {
            path: "offers",
            model: "Offer",
          },
        })
        .populate("products.variant"),
      Wishlist.findOne({ user: userId })
        .populate("products.product")
        .populate("products.variant"),

      Wallet.findOne({ user: userId }),
    ]);

    if (!cart) {
      return res.json({ success: false, message: "Cart not found" });
    }

    let originalSubTotal = 0;
    let discountedSubTotal = 0;
    let shippingCharge = 0;
    let finalTotal = 0;
    let totalQuantity = 0;
    let filteredProducts = cart.products.filter(
      (product) => product.quantity > 0
    );

    if (filteredProducts.length < 1) {
      return res.json({ success: false, message: "No products in cart" });
    }

    filteredProducts.forEach((product) => {
      const quantity = product.quantity;
      const productPrice = product.product.price;

      // Original subtotal
      originalSubTotal += productPrice * quantity;

      // Apply the best offer if available
      let discountedPrice = productPrice;
      let bestOffer = null;
      if (product.product.offers && product.product.offers.length > 0) {
        bestOffer = product.product.offers.reduce((best, current) =>
          current.discount > best.discount ? current : best
        );
        discountedPrice = productPrice * (1 - bestOffer.discount / 100);
      }

      // Discounted subtotal
      discountedSubTotal += discountedPrice * quantity;
      totalQuantity += quantity;

      product.discountedPrice = Math.round(discountedPrice.toFixed(2));
      product.appliedOffer = bestOffer;
    });

    let appliedCoupon = null;
    let couponDiscount = 0;

    if (couponCode) {
      const coupon = await Coupon.findOne({
        code: couponCode,
        status: "Active",
      });

      if (coupon) {
        // Coupon validation
        if (coupon.expires && new Date() > coupon.expires) {
          return res.json({ success: false, message: "Coupon has expired" });
        }

        if (coupon.usedUsers.includes(userId)) {
          return res.json({
            success: false,
            message: "You have already used this coupon",
          });
        }

        if (coupon.maxUses && coupon.usedUsers.length >= coupon.maxUses) {
          return res.json({
            success: false,
            message: "Coupon has reached its maximum uses",
          });
        }

        if (discountedSubTotal < coupon.amount) {
          return res.json({
            success: false,
            message: `This coupon requires a minimum order amount of ₹${coupon.amount}`,
          });
        }

        // Calculate coupon discount
        couponDiscount = (discountedSubTotal * coupon.discount) / 100;

        // Apply max discount if applicable
        if (coupon.maxDiscount && couponDiscount > coupon.maxDiscount) {
          couponDiscount = coupon.maxDiscount;
        }

        // Ensure couponDiscount is valid
        couponDiscount = Math.min(couponDiscount, discountedSubTotal);
        couponDiscount = Number(couponDiscount.toFixed(2));

        // distribute coupon discount across products
        const productCount = filteredProducts.length;
        const discountPerProduct = couponDiscount / productCount;

        filteredProducts.forEach((product) => {
          const productTotalPrice = product.discountedPrice * product.quantity;
          product.couponDiscount = Number(discountPerProduct.toFixed(2));
          product.finalPrice = Number(
            (productTotalPrice - discountPerProduct).toFixed(2)
          );
        });

        discountedSubTotal = Number(
          (discountedSubTotal - couponDiscount).toFixed(2)
        );
        finalTotal = Number((discountedSubTotal + shippingCharge).toFixed(2));

        // Track the applied coupon
        appliedCoupon = {
          couponId: coupon._id,
          code: coupon.code,
          discount: couponDiscount,
        };

        // Add the user to the usedUsers field
        coupon.usedUsers.push(userId);
        await coupon.save();
      } else {
        return res.json({ success: false, message: "Invalid coupon code" });
      }
    } else {
      // No coupon applied, set final prices and totals
      filteredProducts.forEach((product) => {
        const productTotalPrice = product.discountedPrice * product.quantity;
        product.finalPrice = productTotalPrice;
        product.couponDiscount = 0; // No coupon discount
      });
      finalTotal = discountedSubTotal + shippingCharge;
    }

    // Prepare the products data for the order
    const products = filteredProducts.map((product) => ({
      product: product.product._id,
      name: product.product.name,
      variant: product.variant._id,
      quantity: product.quantity,
      originalPrice: product.product.price,
      discountedPrice: product.discountedPrice,
      totalPrice: Number(product.finalPrice.toFixed(2)),
      couponDiscount: Number(product.couponDiscount.toFixed(2)),
      appliedOffer: product.appliedOffer
        ? {
            offerId: product.appliedOffer._id,
            title: product.appliedOffer.title,
            type: product.appliedOffer.type,
            discount: product.appliedOffer.discount,
          }
        : null,
    }));

    // Generate Order ID
    function generateOrderId() {
      const prefix = "TR";
      const randomDigits = Math.floor(
        10000000 + Math.random() * 90000000
      ).toString();
      return prefix + randomDigits;
    }

    const orderId = generateOrderId();

    // Update stock quantities
    for (let i = 0; i < products.length; i++) {
      const variant = await Variant.findById(products[i].variant);
      if (!variant) {
        return res.json({
          success: false,
          message: `Variant not found for product ${products[i].product}`,
        });
      }
      if (variant.quantity < products[i].quantity) {
        return res.json({
          success: false,
          message: `Insufficient stock for variant ${variant._id}`,
        });
      }
      variant.quantity -= products[i].quantity;
      await variant.save();
    }

    // Create the order document
    const order = new Order({
      orderId,
      user: userId,
      payment: paymentMethod,
      products,
      totalQuantity,
      originalSubTotal: Math.round(originalSubTotal.toFixed(2)),
      discountedSubTotal: Math.round(discountedSubTotal.toFixed(2)),
      shippingCharge,
      finalTotal: Math.round(finalTotal.toFixed(2)),
      address,
      appliedCoupon,
      paymentStatus: "Pending",
    });

    await order.save();

    // Handle Razorpay payment
    if (paymentMethod === "Razorpay") {
      const razorpayOrder = await razorpay.orders.create({
        amount: Math.round(finalTotal * 100),
        currency: "INR",
        receipt: orderId,
        payment_capture: 1,
      });

      order.razorpayOrderId = razorpayOrder.id;
      await order.save();

      res.json({
        success: true,
        orderId: order._id,
        message: "Order created successfully",
        order: {
          id: order._id,
          amount: finalTotal,
          razorpayOrderId: razorpayOrder.id,
          razorpayKeyId: process.env.RAZORPAY_KEY_ID,
        },
        user: {
          id: userId,
          email: user.email,
        },
      });
      // if wallet payment
    } else if (paymentMethod === "Wallet") {
      // Update user wallet balance
      if (wallet) {
        const transaction = {
          amount: order.finalTotal,
          type: "Wallet Payment",
          entry: "Debit",
          date: new Date(),
          orderId: order.orderId,
        };

        wallet.balance -= order.finalTotal;
        wallet.transactions.push(transaction);
        await wallet.save();
      }

      // Update order status to paid
      order.paymentStatus = "Paid";
      await order.save();

      res.json({
        success: true,
        orderId: order._id,
        message: "Order placed successfully and paid from wallet",
        order: {
          id: order._id,
          amount: finalTotal, 
        },
        user: {
          id: userId,
          email: user.email,
        },
      });
    } else {
      res.json({
        success: true,
        orderId: order._id,
        message: "Order placed successfully",
        order: {
          id: order._id,
          amount: finalTotal,
        },
        user: {
          id: userId,
          email: user.email,
        },
      });
    }

    // Update cart by removing purchased products
    cart.products = cart.products.filter((cartProduct) => {
      return !filteredProducts.some(
        (filteredProduct) =>
          cartProduct.variant._id.toString() ===
          filteredProduct.variant._id.toString()
      );
    });
    await cart.save();

    // update the wishlist only the user has a wishlist
    if (wishlist) {
      wishlist.products = wishlist.products.filter((wishlistProduct) => {
        return !filteredProducts.some(
          (filteredProduct) =>
            wishlistProduct.variant._id.toString() ===
            filteredProduct.variant._id.toString()
        );
      });
      await wishlist.save();
    }
  } catch (error) {
    console.error("Error placing order:", error);
    res.json({ success: false, message: "Error placing order" });
  }
};



// -------update payment status------>

const updatePaymentStatus = async ( req, res ) => {
  try {
    const { orderId, status } = req.body
    const order = await Order.findById(orderId)
    if (!order) {
      return res.json({ 
        orderId,
        success: false, 
        message: 'Order not found' })
    }
      order.paymentStatus = status
      

      await order.save()
      res.json({ 
        orderId,
        status,
        success: true, 
        message: 'Payment status updated successfully' 
      
      })

  } catch (error) {
    console.error('Error updating payment status:', error);
    res.json({ 
      success: false, 
      message: 'Error updating payment status' 
    });
    
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
        console.error('Error placing order:', error.message);
        res.json({ success: false, message: 'Error viewing success order' });
        
    }
}

// -------retry payment------->

const retryPayment = async ( req, res ) => {
  try {
  
    const orderId = req.body.orderId
 
    const order = await Order.findById(orderId)
    const user = await User.findById(req.userId)
    if(!order){
      return res.json({
        success: false, 
        message: 'Order not found'
      })
    }
    res.json({
      success: true,
      orderId: order._id,
      message: "redirecting to razorpay",
      order: {
        id: order._id,
        amount: order.finalTotal,
        razorpayOrderId: order.razorpayOrderId,
        razorpayKeyId: process.env.RAZORPAY_KEY_ID
      },
      user: {
        id: user._id,
        email: user.email
      }
    });


  } catch (error) {
    console.error('error retrying payment', error.message)
    res.json({
      sucess: false,
      message: 'error retrying payment'
    })
    
  }
}


// ------Orders List------>

const orders = async ( req, res ) => {

    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        let searchTerm = '';
        let query = {
          paymentStatus: { $ne: "Failed" }  
        };
        
        if (req.query.search) {
            const searchTerm = req.query.search.trim();
            query.$and = [  
                { paymentStatus: { $ne: "Failed" } },
                { $or: [
                    { orderId: new RegExp(searchTerm, 'i') },
                    { 'user.firstName': new RegExp(searchTerm, 'i') }
                ]}
            ];
        }

        const orders = await Order.find(query).populate('user').populate('address').sort({ createdAt: -1 }).skip(skip)
        .limit(limit);
        const totalOrders = await Order.countDocuments(query);

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

// -----Update status by admin------>

const updateStatus = async (req, res) => {
  try {
      const { orderId, productId, variantId, status } = req.body;

      const order = await Order.findById(orderId).populate('user');
      const user = order.user._id;
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
          'Pending': ['Dispatched', 'Cancelled'],
          'Dispatched': ['Out for Delivery', 'Cancelled'],
          'Out for Delivery': ['Delivered'],
          'Return Requested': ['Returned', 'Return Rejected'],
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

      if (status === "Cancelled" || status === "Returned") {
          // Update stocks
          const updateStock = await Variant.findById(variantId);
          updateStock.quantity += order.products[productIndex].quantity;
          await updateStock.save();

      
          let refund = false;
          if (status === "Cancelled" && order.payment === "Razorpay") {
              refund = true;
          } else if (status === "Returned") {
              refund = true;
          }

          if (refund) {
   
              let wallet = await Wallet.findOne({ user });
              if (!wallet) {
                  wallet = new Wallet({
                      user: user, 
                      balance: 0,
                      transactions: [],
                  });
              }

              const refundAmount = order.products[productIndex].totalPrice;
              const transaction = {
                  amount: refundAmount,
                  type: status === "Cancelled" ? "Cancellation Refund" : "Return Refund",
                  entry: 'Credit',
                  date: new Date(),
                  orderId: order.orderId,
                  product: order.products[productIndex].name
              };

              wallet.balance += refundAmount;
              wallet.transactions.push(transaction);
              await wallet.save();
          }
      }

      if (status === "Delivered") {
          order.paymentStatus = "Paid";
      }

      await order.save();

      res.json({
          id: variantId,
          status: status,
          success: true,
          message: 'Status updated successfully'
      });
  } catch (error) {
      console.error('Error updating status admin:', error.message);
      res.json({
          success: false,
          message: 'Error updating status'
      });
  }
}


// -------Cancel or Return Order------->

const updateOrderStatus = async (req, res) => {
  try {
      const { orderId, productId, variantId, reason, status } = req.body;

      if (status !== "Cancelled" && status !== "Return Requested") {
          return res.json({
              success: false,
              message: 'Invalid status".'
          });
      }

      const order = await Order.findById(orderId).populate('user');
      
      if (!order) {
          return res.json({ 
              success: false,
              message: 'Order not found' 
          });
      }
      const user = order.user._id;

      const productIndex = order.products.findIndex(p => 
          p.product.toString() === productId && p.variant.toString() === variantId
      );

      if (productIndex === -1) {
          return res.json({ 
              success: false,
              message: 'Product or variant not found in the order' 
          });
      }

      order.products[productIndex].status = status;
      order.products[productIndex].reason = reason;
      order.products[productIndex].date = new Date();

      let refund = false;
          if (status === "Cancelled" && order.payment === "Razorpay") {
              refund = true;
          } else if (status === "Returned") {
              refund = true;
          }

          if (refund) {
   
              let wallet = await Wallet.findOne({ user });
              if (!wallet) {
                  wallet = new Wallet({
                      user: user, 
                      balance: 0,
                      transactions: [],
                  });
              }

              const refundAmount = order.products[productIndex].totalPrice;
              const transaction = {
                  amount: refundAmount,
                  type: status === "Cancelled" ? "Cancellation Refund" : "Return Refund",
                  entry: 'Credit',
                  date: new Date(),
                  orderId: order.orderId,
                  product: order.products[productIndex].name
              };

              wallet.balance += refundAmount;
              wallet.transactions.push(transaction);
              await wallet.save();
          }

      await order.save();

      const updateStock = await Variant.findById(variantId);
      updateStock.quantity += order.products[productIndex].quantity;
      await updateStock.save();

      

      res.json({
          success: true,
          orderId,
          variantId,
          message: status === "Cancelled" ? 'Order cancelled successfully' : 'Order returned successfully',
      });

  } catch (error) {
      console.error(`Error updating order status user`, error.message);
      res.json({
          success: false,
          orderId: req.body.orderId,
          variantId: req.body.variantId,
          message: `Error updating order status`
      });
  }
};


const createMatchStage = (filterSales, startDate, endDate) => {
  const currentDate = moment().startOf('day');
  let matchStage = {
    'products.status': { $in: ['Delivered', 'Return Requested'] }
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

const createSalesAggregate = (matchStage) => [
  { $match: matchStage },
  {
    $addFields: {
      filteredProducts: {
        $filter: {
          input: "$products",
          as: "product",
          cond: { $in: ["$$product.status", ['Delivered', 'Return Requested']] }
        }
      }
    }
  },
  { $unwind: "$filteredProducts" }, 
  {
    $group: {
      _id: null,
      totalSalesCount: { $sum: 1 },
      totalProductCount: { $sum: 1 }, 
      totalOriginalSum: { $sum: "$filteredProducts.originalPrice" },
      totalDiscountedSum: { $sum: "$filteredProducts.discountedPrice" },
      totalPriceSum: { $sum: "$filteredProducts.totalPrice" },
      totalQuantity: { $sum: "$filteredProducts.quantity" }
    }
  },
  {
    $project: {
      _id: 0,
      totalSalesCount: 1,
      totalProductCount: 1,
      totalOriginalSum: 1,
      totalDiscountedSum: 1,
      totalPriceSum: 1,
      totalQuantity: 1,
      totalDiscount: {
        $subtract: ["$totalOriginalSum", "$totalDiscountedSum"]
      }
    }
  }
];


// ------sales report--------->

const sales = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const { filterSales, startDate, endDate } = req.query;

    const matchStage = createMatchStage(filterSales, startDate, endDate);
    const salesAggregate = createSalesAggregate(matchStage);
    

    const salesData = await Order.aggregate(salesAggregate);

    const orders = await Order.aggregate([
      { $match: matchStage },
      {
        $addFields: {
          products: {
            $filter: {
              input: "$products",
              as: "product",
              cond: { $in: ["$$product.status", ['Delivered', 'Return Requested']] }
            }
          }
        }
      },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: parseInt(limit) },
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $lookup: {
          from: 'products',
          localField: 'products.product',
          foreignField: '_id',
          as: 'populatedProducts'
        }
      },
      {
        $addFields: {
          products: {
            $map: {
              input: '$products',
              as: 'product',
              in: {
                $mergeObjects: [
                  '$$product',
                  {
                    product: {
                      $arrayElemAt: [
                        {
                          $filter: {
                            input: '$populatedProducts',
                            cond: { $eq: ['$$this._id', '$$product.product'] }
                          }
                        },
                        0
                      ]
                    }
                  }
                ]
              }
            }
          }
        }
      },
      { $project: { populatedProducts: 0 } }
    ]);

    const totalOrders = await Order.countDocuments(matchStage);

    res.render('sales', {
      salesData: salesData[0] || { 
        totalSalesCount: 0,
        totalProductCount: 0,
        totalOriginalSum: 0,
        totalDiscountedSum: 0,
        totalDiscount: 0,
        totalSales: 0 
      },
      orders,
      page,
      limit,
      totalOrders,
      totalPages: Math.ceil(totalOrders / limit),
      filterSales,
      startDate,
      endDate,
      query: req.query
    });

  } catch (error) {
    console.error('Error fetching sales data:', error);
    res.status(500).send('An error occurred while fetching sales data');
  }
}

// -------download sales report(pdf)------>

const generatePdf = async ( req, res ) => {
  try {
    const { filterSales, startDate, endDate } = req.query;
    const matchStage = createMatchStage(filterSales, startDate, endDate);
    const salesAggregate = createSalesAggregate(matchStage);
    const salesData = await Order.aggregate(salesAggregate);
    const salesSummary = salesData[0] || { 
      totalSalesCount: 0,
      totalProductCount: 0,
      totalOriginalSum: 0,
      totalDiscountedSum: 0,
      totalDiscount: 0,
      totalSales: 0 
    };


    const orders = await Order.aggregate([
      { $match: matchStage },
      {
        $addFields: {
          products: {
            $filter: {
              input: "$products",
              as: "product",
              cond: { $in: ["$$product.status", ['Delivered', 'Return Requested']] }
            }
          }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $lookup: {
          from: 'products',
          localField: 'products.product',
          foreignField: '_id',
          as: 'populatedProducts'
        }
      },
      {
        $addFields: {
          products: {
            $map: {
              input: '$products',
              as: 'product',
              in: {
                $mergeObjects: [
                  '$$product',
                  {
                    product: {
                      $arrayElemAt: [
                        {
                          $filter: {
                            input: '$populatedProducts',
                            cond: { $eq: ['$$this._id', '$$product.product'] }
                          }
                        },
                        0
                      ]
                    }
                  }
                ]
              }
            }
          }
        }
      },
      { $project: { populatedProducts: 0 } }
    ]);

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-disposition', 'attachment; filename="sales_report.pdf"');
    res.setHeader('Content-type', 'application/pdf');
    doc.pipe(res);

    // Add content to the PDF
    doc.fontSize(18).text('Sales Report', { align: 'center' });
    doc.moveDown();

    // Add filter information
    doc.fontSize(12).text(`Filter: ${filterSales}`);
    if (filterSales === 'custom' && startDate && endDate) {
      doc.text(`Date Range: ${startDate} to ${endDate}`);
    }
    doc.moveDown();

    // Add summary
    doc.fontSize(14).text('Summary');
    doc.fontSize(12).text(`Total Sales: ${salesSummary.totalSalesCount}`);
    doc.text(`Total Original Sum: Rs.${salesSummary.totalOriginalSum.toFixed(2)}`);
    doc.text(`Total Discount: Rs.${salesSummary.totalDiscount.toFixed(2)}`);
    doc.text(`Total Revenue: Rs.${salesSummary.totalDiscountedSum.toFixed(2)}`);
    doc.moveDown();

    // Add order details table
    doc.fontSize(14).text('Order Details');
    doc.moveDown();

    // Table headers
const table = {
  headers: ['Order ID', 'Date', 'Products', 'Price', 'Discount', 'Total', ],
  rows: []
};

// Table rows
orders.forEach(order => {
  const products = order.products.map(p => `${p.product.name} (${p.quantity})`).join(', ');
  const originalPrice = order.products.reduce((sum, p) => sum + p.originalPrice, 0);
  const totalPrice = order.products.reduce((sum, p) => sum + p.totalPrice, 0);
  const discount = order.products.reduce((sum, p) => {
    return sum + (p.discountedPrice - p.originalPrice);
  }, 0)

  table.rows.push([
    order.orderId.toString(),
    moment(order.createdAt).format('YYYY-MM-DD'),
    products,

    `Rs.${originalPrice.toFixed(2)}`,
    `Rs.${discount.toFixed(2)}`,
    `Rs.${totalPrice.toFixed(2)}`,
    
  ]);
});

    // Draw the table
    drawTable(doc, table);

    doc.end();
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).send('An error occurred while generating the PDF');
  }
}

function drawTable(doc, table) {
  const startX = 50;
  const startY = doc.y + 10;
  const cellPadding = 5;
  const cellWidth = (doc.page.width - 100) / table.headers.length;
  const cellHeight = 20;
  let currentY = startY;

  // Draw headers
  doc.font('Helvetica-Bold');
  table.headers.forEach((header, i) => {
    doc.rect(startX + cellWidth * i, currentY, cellWidth, cellHeight).stroke();
    doc.text(header, startX + cellWidth * i + cellPadding, currentY + cellPadding, {
      width: cellWidth - cellPadding * 2,
      align: 'left'
    });
  });
  currentY += cellHeight;

  // Draw rows
  doc.font('Helvetica');
  table.rows.forEach(row => {
    const rowHeight = Math.max(...row.map(cell => doc.heightOfString(cell, { width: cellWidth - cellPadding * 2 }))) + cellPadding * 2;
    
    if (currentY + rowHeight > doc.page.height - 50) {
      doc.addPage();
      currentY = 50;
    }

    row.forEach((cell, i) => {
      doc.rect(startX + cellWidth * i, currentY, cellWidth, rowHeight).stroke();
      doc.text(cell, startX + cellWidth * i + cellPadding, currentY + cellPadding, {
        width: cellWidth - cellPadding * 2,
        align: 'left'
      });
    });
    currentY += rowHeight;
  });
}

// -------download sales report(excel)------>

const generateExcel = async (req, res) => {
  try {
    const { filterSales, startDate, endDate } = req.query;
    const matchStage = createMatchStage(filterSales, startDate, endDate);
    const salesAggregate = createSalesAggregate(matchStage);
    const salesData = await Order.aggregate(salesAggregate);
    const salesSummary = salesData[0] || { 
      totalSalesCount: 0,
      totalProductCount: 0,
      totalOriginalSum: 0,
      totalDiscountedSum: 0,
      totalDiscount: 0,
      totalSales: 0 
    };

    // Fetch orders based on the filter
    const orders = await Order.aggregate([
      { $match: matchStage },
      {
        $addFields: {
          products: {
            $filter: {
              input: "$products",
              as: "product",
              cond: { $in: ["$$product.status", ['Delivered', 'Return Requested']] }
            }
          }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $lookup: {
          from: 'products',
          localField: 'products.product',
          foreignField: '_id',
          as: 'populatedProducts'
        }
      },
      {
        $addFields: {
          products: {
            $map: {
              input: '$products',
              as: 'product',
              in: {
                $mergeObjects: [
                  '$$product',
                  {
                    product: {
                      $arrayElemAt: [
                        {
                          $filter: {
                            input: '$populatedProducts',
                            cond: { $eq: ['$$this._id', '$$product.product'] }
                          }
                        },
                        0
                      ]
                    }
                  }
                ]
              }
            }
          }
        }
      },
      { $project: { populatedProducts: 0 } }
    ]);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sales Report');

    // Add title
    worksheet.mergeCells('A1:F1');
    worksheet.getCell('A1').value = 'Sales Report';
    worksheet.getCell('A1').font = { size: 16, bold: true };
    worksheet.getCell('A1').alignment = { horizontal: 'center' };

    // Add filter information
    worksheet.getCell('A3').value = `Filter: ${filterSales}`;
    if (filterSales === 'custom' && startDate && endDate) {
      worksheet.getCell('A4').value = `Date Range: ${startDate} to ${endDate}`;
    }

    // Table headers
    const headers = ['Order ID', 'Date', 'Price', 'Total', 'Discount', 'Products'];
    worksheet.addRow(headers);

    // Style the header row
    const headerRow = worksheet.getRow(6);
    headerRow.font = { bold: true };
    headerRow.alignment = { horizontal: 'center' };

    // Table rows
    orders.forEach(order => {
      const products = order.products.map(p => `${p.product.name} (${p.quantity})`).join(', ');
      const originalPrice = order.products.reduce((sum, p) => sum + p.originalPrice, 0);
      const totalPrice = order.products.reduce((sum, p) => sum + p.totalPrice, 0);
      const discount = order.products.reduce((sum, p) => {
        return sum + (p.discountedPrice - p.originalPrice);
      }, 0)

      worksheet.addRow([
        order.orderId.toString(),
        moment(order.createdAt).format('YYYY-MM-DD'),
        `Rs.${originalPrice.toFixed(2)}`,
        `Rs.${discount.toFixed(2)}`,
        `Rs.${totalPrice.toFixed(2)}`,
        products
      ]);
    });

    // Add summary after order details
    const summaryStartRow = worksheet.rowCount + 2;
    worksheet.getCell(`A${summaryStartRow}`).value = 'Summary';
    worksheet.getCell(`A${summaryStartRow}`).font = { size: 14, bold: true };
    worksheet.getCell(`A${summaryStartRow + 1}`).value = `Total Sales: ${salesSummary.totalSalesCount}`;
    worksheet.getCell(`A${summaryStartRow + 2}`).value = `Total Original Sum: Rs.${salesSummary.totalOriginalSum.toFixed(2)}`;
    worksheet.getCell(`A${summaryStartRow + 3}`).value = `Total Discount: Rs.${salesSummary.totalDiscount.toFixed(2)}`;
    worksheet.getCell(`A${summaryStartRow + 4}`).value = `Total Revenue: Rs.${salesSummary.totalDiscountedSum.toFixed(2)}`;

    // Auto-fit columns
    worksheet.columns.forEach(column => {
      column.width = Math.max(12, ...column.values.map(v => v ? v.toString().length : 0));
    });

    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=sales_report.xlsx');

    // Write to response
    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('Error generating Excel:', error);
    res.status(500).send('An error occurred while generating the Excel file');
  }
};

// -----invoice------>

const generateInvoice = async (req, res) => {
  try {
    const orderId = req.params.orderId;

    const order = await Order.findById(orderId)
      .populate('user')
      .populate('products.product');
    if (!order) {
      return res.status(404).json('Order not found');
    }

    // Create a document
    const doc = new PDFDocument({ margin: 50 });

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=invoice-${order.orderId}.pdf`
    );

    // Pipe the PDF directly to the response
    doc.pipe(res);

    // Add header content to the PDF
    doc.fontSize(20).text('TAARA', 50, 50);
    doc.fontSize(10).text('3rd Floor KINFRA INFOPARK',  50, 80);
    doc.text('NH66 CALICUT UNIVERSITY', 50, 95);
    doc.text('MALAPPURAM, KERALA 673634', 50, 110);
    doc.text('+91 (99) 999 9999, +91 (88) 888 8888', 50, 125);

    // Add invoice details
    doc.fontSize(16).text(`Invoice #${order.orderId}`, 400, 50);
    doc.fontSize(10).text(`Date Issued: ${moment(order.createdAt).format('MMMM D, YYYY')}`, 400, 70);
    doc.text(`Date Due: ${moment(order.createdAt).add(30, 'days').format('MMMM D, YYYY')}`, 400, 85);

    // Add client details
    doc.text('Invoice To:', 50, 150);
    // doc.text(order.user.firstName || 'N/A', 50, 170);
    doc.text(order.address.name, 50, 170);
    doc.text(`${order.address.address}, ${order.address.street}`, 50, 185);
    doc.text(`${order.address.city}, ${order.address.state} - ${order.address.pincode}`, 50, 200);
    doc.text(order.address.phone.toString(), 50, 215);

    // Define table column positions
    const tableTop = 280;
    const itemCol = 50;
    const quantityCol = 200;
    const priceCol = 280;
    const discountCol = 360;
    const totalCol = 460;

    // Add table headers
    doc.font('Helvetica-Bold');
    doc.text('Item', itemCol, tableTop);
    doc.text('Quantity', quantityCol, tableTop);
    doc.text('Price', priceCol, tableTop);
    doc.text('Discount', discountCol, tableTop);
    doc.text('Total', totalCol, tableTop);

    // Draw table header border
    doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();

    // Add table rows
    doc.font('Helvetica');
    let tableRowTop = tableTop + 20;

    order.products.forEach((item) => {
      doc.text(item.name, itemCol, tableRowTop);
      doc.text(item.quantity.toString(), quantityCol, tableRowTop);
      doc.text(`Rs.${item.originalPrice.toFixed(2)}`, priceCol, tableRowTop);
      doc.text(`Rs.${(item.originalPrice - item.discountedPrice).toFixed(2)}`, discountCol, tableRowTop);
      doc.text(`Rs.${item.totalPrice.toFixed(2)}`, totalCol, tableRowTop);

      // Draw row border
      doc.moveTo(50, tableRowTop + 15).lineTo(550, tableRowTop + 15).stroke();

      tableRowTop += 20;
    });

    // Add totals
    doc.text('Subtotal:', discountCol, tableRowTop + 20);
    doc.text(`Rs.${order.originalSubTotal.toFixed(2)}`, totalCol, tableRowTop + 20);
    doc.text('Discount:', discountCol, tableRowTop + 40);
    doc.text(`Rs.${(order.originalSubTotal - order.discountedSubTotal).toFixed(2)}`, totalCol, tableRowTop + 40);
    doc.text('Shipping:', discountCol, tableRowTop + 60);
    doc.text(`Rs.${order.shippingCharge.toFixed(2)}`, totalCol, tableRowTop + 60);
    doc.font('Helvetica-Bold');
    doc.text('Total:', discountCol, tableRowTop + 80);
    doc.text(`Rs.${order.finalTotal.toFixed(2)}`, totalCol, tableRowTop + 80);

    // Add note
    doc.font('Helvetica');
    doc.text('Note:', itemCol, tableRowTop + 120);
    doc.text('Thank you for shopping with us!', itemCol, tableRowTop + 140);

    // Finalize PDF file
    doc.end();
  } catch (error) {
    console.error('Error generating invoice:', error.message);
    res.status(500).json({ success: false, message: 'Error generating invoice' });
  }
}











module.exports = {
    loadCheckout,
    validateCoupon,
    checkout,
    updatePaymentStatus,
    confirmOrder,
    retryPayment,
    orders,
    viewOrder,
    updateStatus,
    updateOrderStatus,
    sales,
    generatePdf,
    generateExcel,
    generateInvoice
}    