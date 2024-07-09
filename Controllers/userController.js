
const User = require("../Models/userModel");
const Token = require("../Models/resetToken");
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
        if (!req.session.user) {
            return res.render('home');
        }
        const user = await User.findById({_id:req.session.user._id});
        res.render('home', { user });
    } catch (error) {
        console.log('Error loading home:', error.message);
    }
}


// ------SiginIn and SignUp------>

const authentication = async ( req, res) => {
    try {
        
        res.render('signin-signup', {
            activeTab: 'signin',
        });
        } catch (error) {
            console.log('Error loading authentication:', error.message);
        }
            
}


// ------User Account------>

const userAccount = async ( req, res) => {
    try {
        if (req.session.user){
            res.render('userAccount', {user: req.session.user})
            } else {
                res.redirect('/authentication')
            }

        }catch (erroe){
            console.log(error.message + ' user userAccount');
        }
}


// ------User SignUp------>

const insertUser = async (req, res) => {
    try {
        const email = req.body.signupEmail;
        const password = req.body.signupPassword;

        console.log('Received email:', email);
        console.log('Received password:', password);

        // Check if user already exists 
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            console.log('User already exists:', existingUser);
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

        
        console.log('session user:', user);

        await sendSignupOtp(user, req, res);

    } catch (error) {
        console.log('Error inserting user:', error.message);
        res.status(500).send('Internal Server Error');
    }
};


// ------Send OTP------>

const sendSignupOtp = async (user, req, res) => {
    try {
        const { email, password } = user;

        const otp = `${100000 + Math.floor(Math.random() * 900000)}`;
        console.log('Generated OTP:', otp);

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
        console.log('OTP email sent to:', email);

        res.redirect(`/otpVerify`);

    } catch (error) {
        console.log('Error sending OTP:', error.message);
        res.status(500).send('Internal Server Error');
    }
};

// ------Resend OTP------>

const resendOtp = async (req, res) => {
    try {

        if (!req.session.otp){

            res.redirect('/authentication')
        }

        const { email, password } = req.session.otp; // Get email from session

        if (!email) {
            return res.render('signupOtp', {
                otpError: 'An account created this email please login'
            });
        }

        const user = { email, password };

        await sendSignupOtp(user, req, res, true);

    } catch (error) {
        console.log('Error resending OTP:', error.message);
        res.status(500).send('Internal Server Error');
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
        console.log('Error loading OTP page:', error.message);
        res.status(500).send('Internal Server Error');
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

        console.log(otp);
        console.log(sessionOtp.hashedOtp);
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

        // Clear the session
        req.session.destroy();
 
        res.render('signin-signup', {
            activeTab: 'signin',
            successMessage:'Account created successfully now signin',
        });

    } catch (error) {
        console.log('Error verifying OTP:', error.message);
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
        console.log(error.message + ' user verifySignIn');
    }
};

// ------OTP Page------>

const forgotPass = async (req, res) => {
    try {

            res.render('forgotPass')
            

        
    } catch (error) {
        console.log('Error loading forgot password page:', error.message);
        res.status(500).send('Internal Server Error');
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
        console.log('Error sending password reset email:', error.message);
        res.status(500).send('Internal Server Error');
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
        console.log('Error in forgot password route:', error.message);
        res.status(500).send('Internal Server Error');
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
            console.log('Token not found or expired');
            return res.render('signin-signup', {
                activeTab: 'signin',
                emailError: 'Password reset token is invalid or has expired.'
            });
        }

        const user = await User.findById(resetToken.userId);

        res.render('resetPass', { token: req.params.token });


    } catch (error) {
        console.log('Error in reset token route:', error.message);
        res.status(500).send('Internal Server Error');
    }
};


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
        console.log('Error resetting password:', error.message);
        res.status(500).send('Internal Server Error');
    }
}




module.exports = {
    loadHome,
    insertUser,
    authentication,
    userAccount,
    loadOtp,
    verifyOtp,
    resendOtp,
    verifySignIn,
    forgotPass,
    forgotPassVerify,
    resetPass,
    resetPassVerify

}