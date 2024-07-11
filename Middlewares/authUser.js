

const isLogin = async (req, res, next) => {

    try {
        if (req.session.user) {
            const userId = req.session.user || null;
            req.userId = userId;
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

const noAuth = async (req, res, next) => {
    try {

        const userId = req.session.user_id || null;
        req.userId = userId;
        next();
    } catch (error) {
        console.log(error.message);
    }
};


module.exports={
    isLogin,
    isLogout,
    noAuth
}