const isLogin = async (req, res, next) => {
    try {
        if (req.session.user) {
            next(); // Call next middleware or route handler
        } else {
            res.redirect('/admin-login'); // Redirect to admin login page if not logged in
        }
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Internal Server Error');
    }
}

const isLogout = async (req, res, next) => {
    try {
        if (req.session.user) {
            res.redirect('/dashboard'); // Redirect to admin dashboard if logged in
        } else {
            next(); // Call next middleware or route handler
        }
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Internal Server Error');
    }
}

module.exports = {
    isLogin,
    isLogout
}
