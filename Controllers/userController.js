
const User = require("../Models/userModel");
const Token = require("../Models/resetToken");
const Cart = require('../Models/cartModel')
const Address = require('../Models/addressModel')
const Order = require('../Models/orderModel')
const Wallet = require('../Models/walletModel')
const Review = require('../Models/reviewModel')
const Offer = require('../Models/offerModel')
const Product = require('../Models/productModel')
const Banner = require('../Models/bannerModel')
const nodemailer = require('nodemailer');
const bcrypt = require('bcrypt');
const crypto = require('crypto');





// ------Ininitiate Nodemailer------>

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465, // Port for SSL
    secure: true, // Use SSL
    auth: {
        user: process.env.EMAIL,
        pass: process.env.PASSWORD
    }
});


// ------Home Page------>

const loadHome = async (req, res) => {
    try {
      let user = null;
      if (req.userId) {
        user = await User.findById(req.userId);
      }
  
      const products = await Product.find()
        .populate("variants")
        .populate("category")
        .populate("brand");
  
      const banners = await Banner.find();
  
      const offerIds = products.reduce((ids, product) => {
        if (product.offers && Array.isArray(product.offers)) {
          return ids.concat(product.offers);
        }
        return ids;
      }, []);
  
      const offers = await Offer.find({
        _id: { $in: offerIds },
        status: "Active",
      }).lean();
  
      const newProduct = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  
      // Process offers and filter t-shirts for men and women
      const productsMen = [];
      const productsWomen = [];
  
      products.forEach((product) => {
        product.isNew = product.createdAt > newProduct;
  
        if (
          product.offers &&
          Array.isArray(product.offers) &&
          product.offers.length > 0
        ) {
          const productOffers = offers.filter((offer) =>
            product.offers.some(
              (offerId) => offerId.toString() === offer._id.toString()
            )
          );
  
          if (productOffers.length > 0) {
            const bestOffer = productOffers.reduce((best, current) =>
              current.discount > best.discount ? current : best
            );
            product.bestOffer = bestOffer;
            product.discountedPrice = Math.round(
              (product.price * (1 - bestOffer.discount / 100)).toFixed(2)
            );
          } else {
            product.discountedPrice = Number(product.price.toFixed(2));
          }
        } else {
          product.discountedPrice = Number(product.price.toFixed(2));
        }
  
        if (product.category && product.category.name && product.category.gender) {
            if (
              product.category.name.toLowerCase() === "t-shirts" &&
              product.category.gender.toLowerCase() === "men"
            ) {
              productsMen.push(product);
            } else if (
              product.category.name.toLowerCase() === "t-shirts" &&
              product.category.gender.toLowerCase() === "women"
            ) {
              productsWomen.push(product);
            }
          }
        });
  
      res.render("home", {
        user: user ? user : null,
        productsMen: productsMen,
        productsWomen: productsWomen,
        banners: banners ? banners : [],
      });
    } catch (error) {
      console.error("Error loading home:", error.message);
      res.render("404");
    }
  }
  

// ------SiginIn and SignUp------>

const authentication = async ( req, res) => {
    try {

        
        
        res.render('signin-signup', {
            activeTab: 'signin',
        });
        } catch (error) {
            console.error('Error loading authentication:', error.message);
            res.render('404')
        }
            
}


// ------User SignUp------>

const insertUser = async (req, res) => {
    try {
        const email = req.body.signupEmail;
        const password = req.body.signupPassword;

        // Check if user already exists 
        const existingUser = await User.findOne({ email });
        if (existingUser) {

            return res.render('signin-signup', { 
                signupMessage: 'Email already exists',
                activeTab: 'signup',
                formDataSignup: email,
            });
        }

        // Hash the password
        const securePassword = await bcrypt.hash(password, 10);

        // Create a new user object
        const user = {
            email: email,
            password: securePassword,
        };

        await sendSignupOtp(user, req, res);

    } catch (error) {
        console.error('Error inserting user:', error.message);
        res.render('404')
    }
};


// ------Send OTP------>

const sendSignupOtp = async (user, req, res) => {
    try {
        const { email, password } = user;

        const otp = `${100000 + Math.floor(Math.random() * 900000)}`;

        // Send the OTP to the user's email
        const mailOptions = {
            from: process.env.EMAIL,
            to: email,
            subject: 'OTP Verification',
            text: `Your OTP is: ${otp}`,
        };

        const hashedOtp = await bcrypt.hash(otp, 10);

        // Save OTP in session
        req.session.otp = {
            code: otp,
            hashedOtp: hashedOtp,
            email: email,
            password: password,
            expiresAt: Date.now() + 300000, // 
        };

        await transporter.sendMail(mailOptions);

        res.redirect(`/otpVerify`);

    } catch (error) {
        console.error('Error sending OTP:', error.message);
        res.render('404')
    }
};

// ------Resend OTP------>

const resendOtp = async (req, res) => {
    try {

        if (!req.session.otp){

            res.redirect('/authentication')
        }

        const { email, password } = req.session.otp; 

        if (!email) {
            return res.render('signupOtp', {
                otpError: 'An account created this email please login'
            });
        }

        const user = { email, password };

        await sendSignupOtp(user, req, res, true);

    } catch (error) {
        console.error('Error resending OTP:', error.message);
        res.render('404')
    }
};  

// ------OTP Page------>

const loadOtp = async (req, res) => {
    try {

        if (!req.session.otp) {
            res.redirect('/authentication')
        }    

        res.render('signupOtp');
    } catch (error) {
        console.error('Error loading OTP page:', error.message);
        res.render('404')
    }
};

// ------Verify OTP------>

const verifyOtp = async (req, res) => {
    try {
        const { otp } = req.body;
        const sessionOtp = req.session.otp;

        if (!sessionOtp) {
            return res.render('signupOtp', {
                otpError: 'OTP has expired or is invalid'
            });
            
        }

        // Check if OTP is still valid
        if (Date.now() > sessionOtp.expiresAt) {
            return res.render('signupOtp', {
                otpError: 'OTP has expired'
            });
        }

        // Verify the OTP
        const isOtpValid = await bcrypt.compare(otp, sessionOtp.hashedOtp);

        if (!isOtpValid) {
            return res.render('signupOtp', {
                otpError: 'OTP is invalid'
            });
        }

        // Create the user in the database
        const newUser = new User({
            email: sessionOtp.email,
            password: sessionOtp.password,
            dateOfJoined: new Date().toLocaleDateString('en-GB'),
            isBlocked: false
        });

        await newUser.save();

        // create wallet for new user
        const newWallet = new Wallet({
            user: newUser._id,
            balance: 0,
            transactions: [],
        });

        await newWallet.save();


        // Clear the session
        req.session.destroy();
 
        res.render('signin-signup', {
            activeTab: 'signin',
            successMessage:'Account created successfully now signin',
        });

    } catch (error) {
        console.error('Error verifying OTP:', error.message);
        return res.render('signupOtp', {
            otpError: 'Server error please try again later'
        });
    }
};

// ------Verify SignIn------>

const verifySignIn = async (req, res) => {
    try {

        const email = req.body.signinEmail;
        const password = req.body.signinPassword;

        const userData = await User.findOne({ email });

        if ( userData ) {

            if(!userData.password){
                return res.render('signin-signup', {
                    activeTab: 'signin',
                    formDataSignin: email,
                    signinMessage: 'Please login with google'
                });
            }
            const isPassMatch = await bcrypt.compare(password, userData.password);

            if ( isPassMatch ) {
                if ( userData.isBlocked ) {
                    return res.render('signin-signup', {
                        activeTab: 'signin',
                        formDataSignin: email,
                        signinMessage: 'Your account is restricted from logging in.'
                    });
                }

                req.session.user = userData;
                
                res.redirect('/');

            } else {
                return res.render( 'signin-signup', {
                    activeTab: 'signin',
                    formDataSignin: email,
                    signinMessage: 'Invalid email or password'
                });
            }
        } else {
            return res.render('signin-signup', {
                activeTab: 'signin',
                formDataSignin: email,
                signinMessage: 'Invalid email or password'
            });
        }
    } catch ( error ) {
        console.error(error.message + ' user verifySignIn');
        res.render('500')

    }
};

// ------OTP Page------>

const forgotPass = async (req, res) => {
    try {

        res.render('forgotPass')
            
    } catch (error) {
        console.error('Error loading forgot password page:', error.message);
        res.render('404')
    }
};

// ------Sent reset link------>

const sendResetPasswordLink = async (user, req, res) => {
    try {
        const token = crypto.randomBytes(20).toString('hex');

        const resetToken = new Token({
            userId: user._id,
            token: token,
            expiresAt: Date.now() + 300000 // 5 min
        });

        await resetToken.save();

        const resetUrl = `http://localhost:5000/reset/${token}`;


        const mailOptions = {
            to: user.email,
            from: process.env.EMAIL,
            subject: 'Password Reset',
            text: `You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n
                   Please click on the following link:\n\n
                   ${resetUrl}\n\n
                   If you did not request this, please ignore this email and your password will remain unchanged.\n`
        };

        await transporter.sendMail(mailOptions);

        res.render('signin-signup', {
            activeTab: 'signin',
            successMessage: 'An email has been sent to ' + user.email 
        });
    } catch (error) {
        console.error('Error sending password reset email:', error.message);
        res.render('404')
    }
};




const forgotPassVerify = async (req, res) => {

    try {
        
        const { forgotEmail } = req.body;

        const user = await User.findOne({ email: forgotEmail });

        if (!user) {
            return res.render('forgotPass', {
                emailError: 'No account found with this email.',
                formData: forgotEmail,
            });
        }

        // sent link
        await sendResetPasswordLink(user, req, res);

    } catch (error) {
        console.error('Error in forgot password route:', error.message);
        res.render('404')
    }
};

// ------Reset Password page------>

const resetPass = async (req, res) => {
    try {
        const resetToken = await Token.findOne({
            token: req.params.token,
            expiresAt: { $gt: Date.now() }
        });

        if (!resetToken) {

            return res.render('signin-signup', {
                activeTab: 'signin',
                emailError: 'Password reset token is invalid or has expired.'
            });
        }

        const user = await User.findById(resetToken.userId);

        res.render('resetPass', { token: req.params.token });

    } catch (error) {
        console.error('Error in reset token route:', error.message);
        res.render('404')
    }
};

// -------reset password verify------>

const resetPassVerify = async ( req, res) => {

    try {
        const resetToken = await Token.findOne({
            token: req.params.token,
            expiresAt: { $gt: Date.now() }
        });

        if (!resetToken) {
            return res.render('signin-signup', {
                activeTab: 'signin',
                emailError: 'Password reset link is invalid or has expired.'
            });
        }

        const user = await User.findById(resetToken.userId);

        if (!user) {
            return res.render('signin-signup', {
                activeTab: 'signin',
                emailError: 'User not found.'
            });
        }

        // Hash the password
        const securePassword = await bcrypt.hash(req.body.password, 10);

        user.password = securePassword; 
        
        await user.save();

        // Delete the used reset token
        await Token.deleteOne({ token: req.params.token });

        res.render('signin-signup', {
            activeTab: 'signin',
            successMessage: 'Your password has been reset successfully.'
        });

    } catch (error) {
        console.error('Error resetting password:', error.message);
        res.render('404')
    }
}

const signout = async (req, res) => {
    try {
        
        req.session.user = false;
        res.redirect('/')

        } catch (error) {
            console.error(error.message + ' user singout');
            res.render('404')
        }
}

// ------User Account------>

const userAccount = async (req, res) => {
    try {
        const userId = req.userId;
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).render('404', { message: 'User not found' });
        }

        const [addresses, orders, wallet, cart, reviews] = await Promise.all([
            Address.find({ user: userId }),
            Order.find({ user: userId }).populate('products.product').populate('products.variant').sort({ createdAt: -1 }),
            Wallet.findOne({ user: userId }),
            Cart.findOne({ user: userId }).populate('products.product').populate('products.variant'),
            Review.find({'user': userId})
        ]);

        const ordersCopy = JSON.parse(JSON.stringify(orders));

        // Cancelled orders
        const cancelledOrders = ordersCopy.filter(order => {
            order.products = order.products.filter(product => product.status === 'Cancelled');
            return order.products.length > 0;
        });

        // sort transactionsin last in first order
        if (wallet && wallet.transactions) {
            wallet.transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
        }


        return res.render('user', {
            user,
            addresses: addresses || [],
            orders: orders || [],
            cancelledOrders: cancelledOrders || [],

            wallet: wallet || null,
            reviews: reviews || [],
        });

    } catch (error) {
        console.error('Error in userAccount:', error);
        res.status(500).render('error', { message: 'An error occurred while fetching user account details' });
    }
};


// -----Update Profile----->

const updateProfile = async (req, res) => {
    try {
        const { firstName, lastName, phone } = req.body

        const userId = req.userId;

        const user = await User.findById(userId); 

        if(!user){
            return res.json({
                success: false,
                message: 'User not found'
            })
        }

        user.firstName = firstName;
        user.lastName = lastName;;
        user.phone = Number(phone)
        await user.save();
        res.json({
            success: true,
            message: 'Profile updated successfully'
        })
        } catch (error) {
            console.error('Error updating profile:', error.message);
            res.json({
                success: false,
                message: 'Error updating profile'
            })
       }
}

// -------Change password----->

const changePassword = async ( req, res ) => {
    try {

        const { currentPassword, password } = req.body

        const userId = req.userId;

        if(!userId){
            return res.json({
                success: false,
                message: 'User not found'
                })
        }

        const user = await User.findById(userId)

        if(user.password){

            const isPassMatch = await bcrypt.compare(currentPassword, user.password);

            if(!isPassMatch){
                return res.json({
                    success: false,
                    message: 'Current password is incorrect'
                })
            } else {
                user.password = await bcrypt.hash(password, 10)
                await user.save();
                res.json({
                    success: true,
                    message: 'Password updated successfully'
                })
            }
    
        } else {
            res.json({
                success: false,
                message: `You can't change password you signed up with google`
            })
        }

    } catch (error) {
        console.error('Error updating password:', error.message);
        res.json({
            success: false,
            message: 'Error updating password'
            })
        
    }
}

// --------Add Address------->

const addAddress = async ( req, res ) => {

    try {
        
        const { name, phone, address, street, city, landmark, state, pincode} = req.body

        const userId = req.userId;

        const addAddress = new Address({
            user: userId,
            name, phone, address, street, city, landmark, state, pincode, 
        })

        await addAddress.save();

        res.json({
            success: true,
            address: addAddress,
            message: 'Address added successfully'
            })



    } catch (error) {
        console.error('Error adding address:', error.message);
        res.json({
            success: false,
            message: 'Error adding address'
            })
        
    }
}

// ------Address for Editing---->

const editAddress = async ( req, res ) => {

    try {
        const { addressId, name, phone, address, street, city, landmark, state, pincode} = req.body

        const updateAddress = await Address.findOneAndUpdate(
            { _id: addressId },
            { name, phone, address, street, city, landmark, state, pincode },
            { new: true }
        );

        if(!updateAddress){
            return res.json({
                success: false,
                message: 'Address not found'
                })
        }

        
        res.json({
            success: true,
            address: updateAddress,
            message: 'Address updated successfully'
            })


    } catch (error) {
        console.error('Error finding address:', error.message);
        res.json({
            success: false,
            message: 'Error finding address'
            })
        
    }
}

// -------Delete Address-------> 

const deleteAddress = async ( req, res ) => {

    try {

        const addressId = req.body.addressId
        const deleteAddress = await Address.findOneAndDelete({ _id: addressId });

        if(!deleteAddress){
            return res.json({
                success: false,
                message: 'Address not found'
             })
        }
        res.json({
            success: true,
            message: 'Address deleted successfully'
        })
            
    } catch (error) {
        console.error('Error finding address:', error.message);
        res.json({
            success: false,
            message: 'Error finding address'
        })
        
    }
}
// --------404------->
const fourNotFour = async ( req, res ) => {
    try {
        let user = null;
        if (req.userId) {
          
          user = await User.findById(req.userId);
        }
        res.render('404', {
            user: user ? user : null
        })
    } catch (error) {
        console.error('Error rendering 404:', error.message);
        res.render('500')

    }
}

// --------500------->

const serverError = async ( req, res ) => {
    try {
        let user = null;
        if (req.userId) {
          
          user = await User.findById(req.userId);
        }
        res.render('500', {
            user: user ? user : null
        })
    } catch (error) {
        console.error('Error rendering 404:', error.message);
        res.render('500')

    }
}


// --------about----->

const about = async ( req, res ) => {
    try {
        let user = null;
        if (req.userId) {
          user = await User.findById(req.userId);
        }

        res.render('about', {
            user: user ? user : null,

        })
    } catch (error) {
        console.error('Error rendering about:', error.message);
        res.render('500')
    }
}

module.exports = {
    loadHome,
    insertUser,
    authentication,
    loadOtp,
    verifyOtp,
    resendOtp,
    verifySignIn,
    forgotPass,
    forgotPassVerify,
    resetPass,
    resetPassVerify,
    signout,

    userAccount,
    updateProfile,
    changePassword,
    addAddress,
    editAddress,
    deleteAddress,
    fourNotFour,
    serverError,
    about,


}