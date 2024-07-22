const User = require('../Models/userModel')

const isLogin = async (req, res, next) => {

    try {
        if (req.session.user) {

            req.userId = req.session.user;

            next();

        } else {
            res.redirect(`/authentication`);
        }
    } catch (error) {
        console.log(error.message);
    }
}
const isLogout = async (req, res, next) => {

    try {
        if (req.session.user) {
            return res.redirect('/');
        }
        next();
    } catch (error) {
        console.log(error.message);
    }
}

const authorization = async (req, res, next) => {
    try {

        if (req.session.user) {
            req.userId = req.session.user;
        }

        next();

    } catch (error) {

        console.log(error.message);
        res.status(500).send('Server error');
    }
};

const isBlocked = async (req, res, next) => {
    try {
        if (req.session.user) {
            const userId = req.session.user;
            const user = await User.findById(userId);

            if (user.isBlocked) {
                delete req.session.user;
                return res.redirect('/authentication'); 
            }
        } else {
            return res.redirect('/authentication'); 
        }

        next(); 
    } catch (error) {
        console.log(error.message);
  
    }
};




module.exports={
    isLogin,
    isLogout,
    authorization,
    isBlocked

}