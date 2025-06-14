const Order = require("../../Models/orderModel");
const User = require("../../Models/userModel");
const Variant = require("../../Models/variantModel");
const Cart = require("../../Models/cartModel");
const Address = require("../../Models/addressModel");
const Coupon = require("../../Models/couponModel");
const Wallet = require("../../Models/walletModel");
const Wishlist = require("../../Models/wishlistModel");
const Razorpay = require("razorpay");

const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL,
    pass: process.env.PASSWORD,
  },
});

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

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
            path: "offers",
            model: "Offer",
          },
        })
        .populate("products.variant"),
      Wallet.findOne({ user: userId }),
    ]);

    let originalSubTotal = 0;
    let discountedSubTotal = 0;
    let shippingCharge = 0;
    let totalPriceCart = 0;
    let filteredProducts = [];

    if (cart && cart.products && Array.isArray(cart.products)) {
      cart.products = cart.products.reverse();
    }

    if (cart) {
      filteredProducts = cart.products.filter(
        (product) => product.quantity > 0
      );

      filteredProducts.forEach((product) => {
        const quantity = product.quantity;
        const productPrice = product.product.price;

        originalSubTotal += productPrice * quantity;

        let discountedPrice = productPrice;
        if (product.product.offers && product.product.offers.length > 0) {
          const bestOffer = product.product.offers.reduce((best, current) =>
            current.discount > best.discount ? current : best
          );
          discountedPrice = productPrice * (1 - bestOffer.discount / 100);
        }

        discountedSubTotal += discountedPrice * quantity;

        product.discountedPrice = Math.round(discountedPrice.toFixed(2));
      });

      shippingCharge =
        discountedSubTotal >= 500 && discountedSubTotal !== 0 ? 0 : 50;
      totalPriceCart = discountedSubTotal + shippingCharge;
    }

    const coupons = await Coupon.find({ status: "Active" }).sort({
      createdAt: -1,
    });

    res.render("checkout", {
      user,
      addresses,
      cart: { products: filteredProducts },
      coupons,
      wallet: wallet ? wallet : null,
      originalSubTotal: Math.round(originalSubTotal.toFixed(2)),
      discountedSubTotal: Math.round(discountedSubTotal.toFixed(2)),
      shippingCharge,
      totalPriceCart: Math.round(totalPriceCart.toFixed(2)),
    });
  } catch (error) {
    console.error("Error loading checkout:", error.message);
    res.status(500).send("An error occurred while loading the checkout page.");
  }
};

const validateCoupon = async (req, res) => {
  try {
    const { couponCode, total } = req.body;
    const userId = req.userId;

    const coupon = await Coupon.findOne({ code: couponCode, status: "Active" });
    if (!coupon) {
      return res.json({ valid: false, message: "Invalid coupon code" });
    }

    if (coupon.expires && new Date() > coupon.expires) {
      return res.json({ valid: false, message: "Coupon has expired" });
    }

    if (coupon.usedUsers.includes(userId)) {
      return res.json({
        valid: false,
        message: "You have already used this coupon",
      });
    }

    if (coupon.maxUses && coupon.usedUsers.length >= coupon.maxUses) {
      return res.json({
        valid: false,
        message: "Coupon has reached its maximum uses",
      });
    }

    if (total < coupon.amount) {
      return res.json({
        valid: false,
        message: `This coupon requires a minimum order amount of ₹${coupon.amount}`,
      });
    }

    let discountAmount = (total * coupon.discount) / 100;

    if (coupon.maxDiscount && discountAmount > coupon.maxDiscount) {
      discountAmount = coupon.maxDiscount;
    }

    discountAmount = Math.min(discountAmount, total);

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
    console.error("Error validating coupon:", error);
    res.status(500).json({ valid: false, message: "Server error occurred" });
  }
};

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

      originalSubTotal += productPrice * quantity;

      let discountedPrice = productPrice;
      let bestOffer = null;
      if (product.product.offers && product.product.offers.length > 0) {
        bestOffer = product.product.offers.reduce((best, current) =>
          current.discount > best.discount ? current : best
        );
        discountedPrice = productPrice * (1 - bestOffer.discount / 100);
      }

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

        couponDiscount = (discountedSubTotal * coupon.discount) / 100;

        if (coupon.maxDiscount && couponDiscount > coupon.maxDiscount) {
          couponDiscount = coupon.maxDiscount;
        }

        couponDiscount = Math.min(couponDiscount, discountedSubTotal);
        couponDiscount = Number(couponDiscount.toFixed(2));

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

        appliedCoupon = {
          couponId: coupon._id,
          code: coupon.code,
          discount: couponDiscount,
        };

        coupon.usedUsers.push(userId);
        await coupon.save();
      } else {
        return res.json({ success: false, message: "Invalid coupon code" });
      }
    } else {
      filteredProducts.forEach((product) => {
        const productTotalPrice = product.discountedPrice * product.quantity;
        product.finalPrice = productTotalPrice;
        product.couponDiscount = 0;
      });
      finalTotal = discountedSubTotal + shippingCharge;
    }

    if (paymentMethod === "Wallet" && wallet) {
      if (wallet.balance < finalTotal) {
        return res.json({
          success: false,
          message: "Insufficient wallet balance",
        });
      }
    }

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

    function generateOrderId() {
      const prefix = "TR";
      const randomDigits = Math.floor(
        10000000 + Math.random() * 90000000
      ).toString();
      return prefix + randomDigits;
    }

    const orderId = generateOrderId();

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
    } else if (paymentMethod === "Wallet") {
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

    const mailOptions = {
      from: process.env.EMAIL,
      to: user.email,
      subject: "Order Placed Successfully",
      text: `Hello ${user.firstName || ""},

        Thank you for your order!

        Order ID: ${order._id}
        Total Amount: ₹${finalTotal.toFixed(2)}

        We'll notify you when your items are on the way.

        Regards,
        taara fashion`,
    };

    await transporter.sendMail(mailOptions);

    cart.products = cart.products.filter((cartProduct) => {
      return !filteredProducts.some(
        (filteredProduct) =>
          cartProduct.variant._id.toString() ===
          filteredProduct.variant._id.toString()
      );
    });
    await cart.save();

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

const updatePaymentStatus = async (req, res) => {
  try {
    const { orderId, status } = req.body;
    const order = await Order.findById(orderId);
    if (!order) {
      return res.json({
        orderId,
        success: false,
        message: "Order not found",
      });
    }
    order.paymentStatus = status;

    await order.save();
    res.json({
      orderId,
      status,
      success: true,
      message: "Payment status updated successfully",
    });
  } catch (error) {
    console.error("Error updating payment status:", error);
    res.json({
      success: false,
      message: "Error updating payment status",
    });
  }
};

const confirmOrder = async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const user = req.userId;
    const order = await Order.findById(orderId)
      .populate("products.product")
      .populate("products.variant")
      .populate("user")
      .populate("products.appliedOffer.offerId");

    if (!order) {
      return res.json({ success: false, message: "Order not found" });
    }
    const cart = await Cart.findOne({ user })
      .populate("products.product")
      .populate("products.variant");

    res.render("confirmOrder", {
      order,
      user,
      cart,
    });
  } catch (error) {
    console.error("Error placing order:", error.message);
    res.json({ success: false, message: "Error viewing success order" });
  }
};

const retryPayment = async (req, res) => {
  try {
    const orderId = req.body.orderId;

    const order = await Order.findById(orderId);
    const user = await User.findById(req.userId);
    if (!order) {
      return res.json({
        success: false,
        message: "Order not found",
      });
    }
    res.json({
      success: true,
      orderId: order._id,
      message: "redirecting to razorpay",
      order: {
        id: order._id,
        amount: order.finalTotal,
        razorpayOrderId: order.razorpayOrderId,
        razorpayKeyId: process.env.RAZORPAY_KEY_ID,
      },
      user: {
        id: user._id,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("error retrying payment", error.message);
    res.json({
      sucess: false,
      message: "error retrying payment",
    });
  }
};

module.exports = {
  loadCheckout,
  validateCoupon,
  checkout,
  updatePaymentStatus,
  confirmOrder,
  retryPayment,
};
