const express = require('express');
const passport = require('passport');
const userRouter = express.Router();
const userController = require('../controllers/userControllers'); 
const auth = require('../middlewares/auth');

// Route For Main Page
userRouter.get('/', userController.mainPage);

//Route For About Us Page
userRouter.get('/aboutus',userController.aboutusPage);

// Route For Home Page
userRouter.get('/home',auth.isLogin, userController.homePage);

// Route For Shoes Page
userRouter.get('/shoes', userController.shoesPage);

// Route For Slippers Page
userRouter.get('/slippers', userController.slippersPage);

// Route For Profile Page
userRouter.get('/profile/:id',userController.profilePage);
userRouter.get('/edit-profile/:id',userController.editprofilePage);
userRouter.post('/edit-profile/:id',userController.editprofilePost);
userRouter.get('/add-address/:id',userController.addaddressPage);
userRouter.post('/add-address/:id',userController.addaddressPost);
userRouter.get('/:userId/addresses/:addressId/edit', userController.editaddressPage);
userRouter.post('/:userId/addresses/:addressId/edit',userController.editaddressPost);
userRouter.get('/:userId/addresses/:addressId/anotherEditRoute', userController.anotherEditAddressPage);
userRouter.post('/:userId/addresses/:addressId/anotherEditRoute', userController.anotherEditAddressPost);
userRouter.delete('/:userId/addresses/:addressId/delete',userController.deleteAddress);
userRouter.get('/cancel-order/:id',userController.cancelOrder);
userRouter.get('/return-order/:id',userController.returnOrder);
userRouter.get('/view-orders/:id',userController.viewOrders);

//Route For ProductDetails Page
userRouter.get('/product-details/:id',userController.productdetailsPage);
userRouter.get('/search-product',userController.searchProduct);

//Route For Product Details Users Review Section
userRouter.get('/product-details/:id/reviews',userController.reviewsPage);
userRouter.post('/product-details/:id/reviews',userController.reviewsPost);

//Route For Cart Page
userRouter.get('/cart',auth.isLogin,userController.cartPage);
userRouter.post('/add-cart',auth.isLogin,userController.addcartPost);
userRouter.delete('/del-cartitem/:id',auth.isLogin,userController.cartitemDelete);

//Route For WishList Page
userRouter.get('/wishlist',userController.wishlistPage);
userRouter.post('/add-wishlist',userController.wishlistPost);
userRouter.delete('/del-wishlistitem/:id',userController.wishlistitemDelete);

// Route For CheckOut Page
userRouter.get('/checkout',userController.checkoutPage);
userRouter.post('/checkout',userController.checkoutPost);
userRouter.delete('/cancel-checkout/:id',userController.cancelCheckout);
userRouter.post('/update-checkout',userController.updateCheckout);

// Route For Coupon
userRouter.post('/apply-coupon',userController.applyCoupon);
userRouter.post('/remove-coupon',userController.removeCoupon);

// Route For Order Page
userRouter.post('/placeorder',userController.placeorderPost);
userRouter.get('/placeorder/:orderId',userController.placeorderPage);
userRouter.delete('/order-delete/:id',userController.deleteOrder);
userRouter.get('/orders/:id/invoice',userController.orderInvoice);

// Route For Wallet Page
userRouter.get('/wallet/:userId',userController.walletPage);
userRouter.post('/wallet/:userId/addfunds',userController.addFunds);
userRouter.post('/wallet/:userId/withdrawfunds',userController.withdrawFunds);
userRouter.post('/wallet/pay',userController.walletPay);

// Route For Login Page
userRouter.get('/login', userController.loginPage);
userRouter.post('/login', userController.loginPost);

// Route For SignUp Page
userRouter.get('/signup', userController.signupPage);
userRouter.post('/signup', userController.signupPost);

//Route For Send OTP Post
userRouter.post('/send-otp', userController.sendotpPost);

//Route For Resend OTP Post
userRouter.post('/resend-otp',userController.resendVerificationEmail)

// Route For Forgot Password
userRouter.get('/forgot', userController.forgotPass);
userRouter.post('/forgot', userController.resetPasswordPost);
userRouter.post('/check-username',userController.usernameCheck);

// Route For Verification Page
userRouter.get('/verify', userController.verifyPage);
userRouter.post('/verify', userController.verifyPost);

//Route For Logout
userRouter.get('/logout',userController.logoutUser);




// Facebook OAuth routes
userRouter.get('/auth/facebook',
  passport.authenticate('facebook', { scope: ['email'] }));

userRouter.get('/auth/facebook/callback',
  passport.authenticate('facebook', { failureRedirect: '/users/login' }), (req, res) => {
    // Check if user is blocked
    if (req.user.is_blocked) {
      req.logout((err) => {
        if (err) {
          console.error('Logout error:', err);
          return res.status(500).json({ error: 'Internal Server Error' });
        }
        req.session.error = 'You are blocked by Sole Haven';  // Store error message in session
        return res.redirect('/users/login');  // Redirect to login page
      });
    } else {
      // Save user details in session
      req.session.user = { _id: req.user._id, name: req.user.name };
      res.redirect('/users/home');
    }
  });



  
  // Google oAuth Routes
  userRouter.get('/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'] }));
  
  userRouter.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/users/login' }), (req, res) => {
      // Check if the user is blocked
      if (req.user.is_blocked) {
        req.logout((err) => {
          if (err) {
            console.error('Logout error:', err);
            return res.status(500).json({ error: 'Internal Server Error' });
          }
          req.session.error = 'You are blocked by Sole Haven';  // Store error message in session
          return res.redirect('/users/login');  // Redirect to login page
        });
      } else {
        // Successful authentication, set session user and redirect to home.
        req.session.user = { _id: req.user._id, name: req.user.name };
        res.redirect('/users/home');
      }
    });
  


module.exports = userRouter;
