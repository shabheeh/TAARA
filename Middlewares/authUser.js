

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


module.exports={
    isLogin,
    isLogout,
    authorization
}