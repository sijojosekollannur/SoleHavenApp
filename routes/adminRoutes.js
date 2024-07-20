const express = require('express');
const adminrouter = express.Router();
const adminController = require('../controllers/adminControllers');
const passport = require('passport');
const multer = require('multer');
const path = require('path');
const User = require('../models/userModel'); 
const AdminAuth = require('../middlewares/adminAuth');

// ADD PRODUCT MULTER CONFIGURATION
const addProductStorage = multer.diskStorage({
  destination: function (req, file, cb) {
      cb(null, './public/images');
  },
  filename: function (req, file, cb) {
      cb(null, Date.now() + '-' + file.originalname);
  }
});

const addProductUpload = multer({
  storage: addProductStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: function (req, file, cb) {
      if (file.mimetype.startsWith('image/')) {
          cb(null, true);
      } else {
          cb(new Error('Invalid file type. Only images are allowed.'));
      }
  }
}).fields([
  { name: 'productImages', maxCount: 9 },
  { name: 'croppedImages[]', maxCount: 9 }
]);

// EDIT PRODUCT MULTER CONFIGURATION
const editProductStorage = multer.diskStorage({
  destination: function (req, file, cb) {
      cb(null, './public/images');
  },
  filename: function (req, file, cb) {
      cb(null, Date.now() + '-' + file.originalname);
  }
});

const editProductUpload = multer({
  storage: editProductStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: function (req, file, cb) {
      if (file.mimetype.startsWith('image/')) {
          cb(null, true);
      } else {
          cb(new Error('Invalid file type. Only images are allowed.'));
      }
  }
}).array('productImages', 9);


//Route For Admin-Login Page
adminrouter.get('/admin-login',adminController.adminLogin);
adminrouter.post('/admin-login',adminController.adminloginPost);
adminrouter.get('/logout',adminController.logoutAdmin);

// Route For DashBoard
adminrouter.get('/dashboard',AdminAuth.isLogin, adminController.dashboard);
adminrouter.get('/salesReport',AdminAuth.isLogin, adminController.getsalesReport);
adminrouter.get('/download-report',AdminAuth.isLogin, adminController.downloadReport);
adminrouter.get('/top-selling',AdminAuth.isLogin, adminController.topsellingPage);

// Routes For Product 
adminrouter.get('/products', adminController.productPage);
adminrouter.get('/product-details/:id',adminController.productdetailsPage);
adminrouter.get('/add-product', adminController.addProductPage);
adminrouter.post('/add-product',addProductUpload,adminController.addProductPost);
adminrouter.post('/update-product/:id',editProductUpload,adminController.editproductPost);
adminrouter.post('/delete-product/:id',adminController.deleteProduct);
adminrouter.post('/restore-product/:id',adminController.restoreProduct);
adminrouter.get('/edit-product', adminController.editProductPage);
adminrouter.get('/edit-product/:id',adminController.editProductPage);
adminrouter.get('/product-search',adminController.productSearch);

// Routes For Category 
adminrouter.get('/categories', adminController.categoryPage);
adminrouter.get('/add-category',adminController.addcategoryPage);
adminrouter.post('/add-category',adminController.addcategoryPost);
adminrouter.get('/edit-category/:id',adminController.editcategoryPage);
adminrouter.post('/update-category/:id',adminController.editcategoryPost);
adminrouter.get('/delete-category/:id',adminController.deleteCategory);
adminrouter.get('/restore-category/:id',adminController.restoreCategory);

// Route For Order Page
adminrouter.get('/orders', adminController.orderPage);
adminrouter.post('/orders/:id',adminController.orderPatch);
adminrouter.get('/orders/:id',adminController.orderDelete);
adminrouter.get('/view-orders/:id',adminController.viewOrders);

// Route For Coupon Page
adminrouter.get('/coupons', adminController.couponPage);
adminrouter.get('/add-coupons',adminController.addcouponPage);
adminrouter.post('/add-coupons',adminController.addcouponPost);
adminrouter.post('/update-coupons/:id',adminController.couponUpdate);
adminrouter.delete('/coupons/:id',adminController.couponDelete);

// Route For Customer Page
adminrouter.get('/customers', adminController.customerPage);
adminrouter.get('/block-customer/:id',adminController.blockCustomer);
adminrouter.get('/unblock-customer/:id',adminController.unblockCustomer);
adminrouter.get('/customer-search',adminController.customerSearch);

// Route For Banner Page
adminrouter.get('/banners', adminController.bannerPage);

// Route For Offer Page
adminrouter.get('/offers', adminController.offerPage);
adminrouter.get('/add-offers',adminController.addoffersPage);
adminrouter.post('/add-product-offer',adminController.addproductOffer);
adminrouter.post('/add-category-offer',adminController.addcategoryOffer);
adminrouter.post('/add-referral-offer',adminController.addreferralOffer);

// Route for initiating Google authentication (GET request)
adminrouter.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// Route for handling Google callback and finding or creating user (GET request)
adminrouter.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/login' }), (req, res) => {
    // Redirect to appropriate dashboard or home page after authentication
    res.redirect('/dashboard');
  });


// Route for handling Google OAuth via POST request (if needed)
adminrouter.post('/auth/google', async (req, res) => {
    try {
      const { name, email, googleId } = req.body;
  
      // Check if required fields are provided
      if (!name || !email || !googleId) {
        return res.status(400).json({ message: 'Name, email, and Google ID are required' });
      }
  
      // Find or create user
      const user = await User.findOrCreate({ googleId, email, name });
  
      // Send user data in response
      res.json(user);
    } catch (error) {
      console.error('Error handling Google OAuth via POST:', error);
      // Handle the error appropriately
      res.status(500).json({ message: 'Internal Server Error' });
    }
  });
  
// Default Route (for any other path)
adminrouter.get('*', adminController.defaultHandler);

// Error handling middleware
adminrouter.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something went wrong!');
});

module.exports = adminrouter;
