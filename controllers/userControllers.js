const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');
const path = require('path');
const crypto = require('crypto');
const connectDB = require('../models/database');
const User = require('../models/userModel');
const Profile = require('../models/profileModel');
const Address = require('../models/addressModel');
const Product = require('../models/productModel');
const Review = require('../models/reviewModel');
const Cart = require('../models/cartModel');
const Checkout = require('../models/checkoutModel');
const Coupon = require('../models/couponModel');
const Wishlist = require('../models/wishlistModel');
const Category = require('../models/categoryModel');
const Order = require('../models/orderModel');
const Referral = require('../models/referralModel');
const Transaction = require('../models/transactionModel');
const ejs = require('ejs');
const { truncate } = require('fs');
const MONGODB_URI = process.env.MONGODB_URI;
require('dotenv').config(); 

// Utility function to generate OTP
function generateOTP(length) {
    const digits = '0123456789';
    let OTP = '';
    for (let i = 0; i < length; i++) {
        OTP += digits[Math.floor(Math.random() * 10)];
    }
    return OTP;
}

async function searchProducts(query) {
    const products = await Product.find({
        $text: { $search: query },
        isActive: true,
        isDeleted: false
    }).populate('reviews');

    return products;
}

const getCartItems = async (userId) => {
    try {
        const cartItems = await Cart.find({ userId: userId }).populate('items.product');
        return cartItems;
    } catch (error) {
        console.error('Error fetching cart items:', error);
        throw error; // Handle or propagate the error as needed
    }
};

const getProfileByUserId = async (userId) => {
    try {
        const profile = await Profile.find({ user: userId }).populate('addresses');
        return profile;
    } catch (error) {
        console.error('Error fetching addresses:', error);
        throw error;
    }
};

const getAddressByUserId = async (userId) => {
    try {
        const address = await Address.find({ user: userId });
        return address;
    } catch (error) {
        console.error('Error fetching addresses:', error);
        throw error;
    }
};

// Example helper functions for calculating subtotal and tax (replace with your actual implementations)
function calculateSubtotal(cartItems) {
    return cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
}

function calculateTax(subtotal) {
    const taxRate = 0.1; // Assuming tax rate is 10%
    return subtotal * taxRate;
}


module.exports = {

    //Main Page Controller
    mainPage: async function(req, res) {
        try {
            const products = await Product.find().populate('productCategory').exec();
            res.render('users/mainpage', { title: 'Sole Haven', products,hidelinks:true,searchbar:false});
        } catch (err) {
            res.status(500).send(err);
        }
    },


    //About Us Page Controller
    aboutusPage: async function(req,res){
        try {
            res.render('users/aboutuspage',{ title: 'Sole Haven - About Us',hidelinks:true,searchbar:false})
        } catch (error) {
            res.status(500).send(error);
        }
    },



    // Home Page Controller
    homePage: async function (req, res) {
        try {
            const userId = req.session.user;
            let user = null;
            let cartItemCount = 0;
            const message = req.session.message;
            delete req.session.message; 
    
            res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate"); // HTTP 1.1.
            res.setHeader("Pragma", "no-cache"); // HTTP 1.0.
            res.setHeader("Expires", "0"); 
    
            if (userId) {
                user = await User.findById(userId);
                cartItemCount = await getCartItemCount(userId);
            }   
    
            const showOutOfStock = req.query.showOutOfStock === 'true';
            const page = parseInt(req.query.page) || 1;
            const itemsPerPage = 12;
    
            let query = {};
            if (!showOutOfStock) {
                query.stock = { $gt: 0 };
            }
    
            const totalProducts = await Product.countDocuments(query);
            const products = await Product.find(query)
                .skip((page - 1) * itemsPerPage)
                .limit(itemsPerPage)
                .populate('productCategory')
                .exec();
    
            const totalPages = Math.ceil(totalProducts / itemsPerPage);
    
            res.render('users/homepage', {
                title: 'Sole Haven - Home Page',
                products,
                hidelinks: false,
                searchbar: true,
                user,
                message,
                cartItemCount,
                currentPage: page,
                totalPages: totalPages
            });
        } catch (error) {
            res.status(500).send(error);
        }
    },
    
    // Shoes Page Controller
    shoesPage: async function(req, res) {
        try {
            const user = req.session.user;
            let cartItemCount = 0;
    
            if (user) {
                cartItemCount = await getCartItemCount(user);
            }
    
            const showOutOfStock = req.query.showOutOfStock === 'true';
            const page = parseInt(req.query.page) || 1;
            const limit = 12;
            const skip = (page - 1) * limit;
    
            let products = await Product.find().populate('productCategory').exec();
            let shoesProducts = products.filter(product => product.productCategory.categoryName.toLowerCase() === "shoes");
    
            if (!showOutOfStock) {
                shoesProducts = shoesProducts.filter(product => product.stock > 0);
            }
    
            const totalProducts = shoesProducts.length;
            const totalPages = Math.ceil(totalProducts / limit);
            const paginatedProducts = shoesProducts.slice(skip, skip + limit);
    
            res.render('users/shoespage', { 
                title: 'Sole Haven - Shoes Page', 
                products: paginatedProducts, 
                currentPage: page,
                totalPages,
                showOutOfStock,
                user,
                hidelinks: false,
                searchbar: false,
                cartItemCount 
            });
        } catch (error) {
            res.status(500).send(error);
        }
    },
    


    //Slippers Page Controller
    slippersPage: async function(req, res) {
        try {
            const user = req.session.user;
            let cartItemCount = 0;
    
            if (user) {
                cartItemCount = await getCartItemCount(user);
            }
    
            const showOutOfStock = req.query.showOutOfStock === 'true';
            const page = parseInt(req.query.page) || 1;
            const limit = 12;
            const skip = (page - 1) * limit;
    
            let products = await Product.find().populate('productCategory').exec();
            let slippersProducts = products.filter(product => product.productCategory.categoryName.toLowerCase() === "slippers");
    
            if (!showOutOfStock) {
                slippersProducts = slippersProducts.filter(product => product.stock > 0);
            }
    
            const totalProducts = slippersProducts.length;
            const totalPages = Math.ceil(totalProducts / limit);
            const paginatedProducts = slippersProducts.slice(skip, skip + limit);
    
            res.render('users/slipperspage', { 
                title: 'Sole Haven - Slippers Page',
                products: paginatedProducts,
                currentPage: page,
                totalPages,
                showOutOfStock,
                user,
                hidelinks: false,
                searchbar: false,
                cartItemCount
            });
        } catch (error) {
            res.status(500).send(error);
        }
    },

    
    // Search Product Controller
    searchProduct: async function (req, res) {
            const user = req.session.user;
            let cartItemCount = 0;
        
            if (user) {
                cartItemCount = await getCartItemCount(user);
            }
        
            const query = req.query.query || '';
            const sort = req.query.sort || 'popularity';
        
            try {
                let products;
    
                const productFields = {
                    productName: 1,
                    price: 1,
                    starRating: 1,
                    isFeatured: 1,
                    createdAt: 1,
                    productImages: 1, // Ensure this is the correct field name for your images
                    brandName: 1,
                    productCategory: 1
                }
        
                if (query) {
                    products = await Product.find(
                        { $text: { $search: query } },
                        { score: { $meta: 'textScore' }, ...productFields }
                    ).sort({ score: { $meta: 'textScore' } });
                } else {
                    products = await Product.find({}, productFields);
                }
        
                switch (sort) {
                    case 'price-asc':
                        products.sort((a, b) => a.price - b.price);
                        break;
                    case 'price-desc':
                        products.sort((a, b) => b.price - a.price);
                        break;
                    case 'ratings':
                        products.sort((a, b) => b.starRating - a.starRating);
                        break;
                    case 'featured':
                        products = products.filter(product => product.isFeatured);
                        break;
                    case 'new-arrivals':
                        // Assuming there's a field `createdAt` for products
                        products = products.filter(product => product.createdAt >= new Date(new Date() - 30 * 24 * 60 * 60 * 1000));
                        break;
                    case 'a-z':
                        products.sort((a, b) => a.productName.localeCompare(b.productName));
                        break;
                    case 'z-a':
                        products.sort((a, b) => b.productName.localeCompare(a.productName));
                        break;
                    default:
                        // Default sort by popularity or some other criteria
                        break;
                }
        
                res.json({ products });
            } catch (error) {
                console.error(error);
                res.status(500).send('Internal Server Error');
            } 
        },


    // Profile Page Controller
    profilePage: async function(req, res) {
        try {
            const userId = req.params.id;
    
            // Validate userId
            if (!mongoose.Types.ObjectId.isValid(userId)) {
                return res.status(400).send('Invalid user ID');
            }
    
            // Find user
            const user = await User.findById(userId).populate('addresses').exec();
    
            // If user is not found, return 404 error
            if (!user) {
                return res.status(404).send('User not found');
            }

             // Fetch referralCode from user document
             const referralCode = user.referralCode;
    
            // Find profile
            const profile = await Profile.findOne({ userId }).populate('addresses').exec();
            let orders = await Order.find({ user:userId }).populate('products.product').exec();

            // Format the date of birth if profile exists and has dateOfBirth
            let formattedDate = null;
            if (profile && profile.dateOfBirth) {
                const dateOfBirth = profile.dateOfBirth;
                formattedDate = new Date(dateOfBirth).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                }).replace(/\//g, '-');
            }
    
            // Call getCartItemCount function to get the count of items in user's cart
            const cartItemCount = await getCartItemCount(user);
    
            // Prepare the data to be passed to the template
            const templateData = {
                user: user,
                address: user.addresses,
                title: 'Sole Haven - Profile Page',
                cartItemCount: cartItemCount,
                hidelinks: false, // Assuming this is used to hide/show certain links in the navigation
                searchbar: false,
                profile: profile || null, // Ensure profile is always defined
                orders: orders,
                formattedDate: formattedDate,
                referralCode: referralCode
            };
    
            // Render the profile page with user data and cart item count
            res.render('users/profilepage', templateData);
        } catch (error) {
            console.error(error);
            res.status(500).send('Server error');
        }
    },
    
    
   // Edit Profile Page Controller
    editprofilePage: async function(req, res) {
        try {
           
            const userId = req.params.id; // Assuming you use req.user to store user information
             // Find user by ID and populate the 'address' field
             const user = await User.findById(userId).populate('addresses').exec();
             const cartItemCount = await getCartItemCount(user);
            let profile = await Profile.findOne({ userId }).populate('addresses');

             // If profile does not exist, create a new one
           if (!profile) {
            profile = new Profile({ userId, email: user.email, username: user.name });
            }

            // Map addresses from the user's addresses to the profile schema
            profile.addresses = user.addresses.map(address => address._id);

            // Save the updated profile
            await profile.save();
            let addresses = profile.addresses;

            res.render('users/editprofilepage', { user:user, profile,addresses, title: 'Sole Haven - Edit Profile Page', hidelinks: false,searchbar:false, cartItemCount });
        } catch (error) {
            console.error(error);
            res.status(500).send('Server Error');
        }
},

    // Edit Profile Post Controller
    editprofilePost: async function(req,res){
        try {
            const userId = req.params.id;
            const { username,email,firstName, lastName, dateOfBirth, gender, phoneNumber } = req.body;
    
            // Update profile information
            const profile = await Profile.findOneAndUpdate(
                { userId },
                { username,email,firstName, lastName, dateOfBirth, gender, phoneNumber, updatedAt: Date.now() },
                { new: true, upsert: true }
            );
    
            res.redirect(`/users/profile/${userId}`);
        } catch (error) {
            console.error(error);
            res.status(500).send('Server Error');
        }
    },

    // Add Address Page Controller
    addaddressPage: async function(req, res) {
        try {
            const user = req.session.user;
            if (!user) {
                throw new Error("User not found in session");
            }
    
            const cartItemCount = await getCartItemCount(user);
    
            res.render('users/addaddresspage', {
                title: 'Sole Haven: Add-Address Page',
                hidelinks: false,
                searchbar:false,
                cartItemCount: cartItemCount,
                user: user
            });
        } catch (error) {
            console.error(error);
            res.status(500).send('Server error');
        }
    },
    
   // Add Address Post Controller
    addaddressPost: async function(req, res) {
    try {
        // Extract user ID from request
        const userId = req.params.id;
        // Extract data from request body
        const { fullName, addressLine1, addressLine2, city, state, zipCode, country, mobileNumber } = req.body;

        // Create a new address object
        const address = new Address({
            user: userId,
            fullName,
            addressLine1,
            addressLine2,
            city,
            state,
            zipCode,
            country,
            mobileNumber
        });

        // Save the address to the database
        await address.save();

        await User.findByIdAndUpdate(userId, { $push: { addresses: address._id } });

        console.log('Address created and linked to user:', address);

        // Redirect back to the page or any other desired action
        res.redirect(`/users/profile/${userId}`); // Redirect to addresses page or any other page
    } catch (error) {
        // Handle error if any
        console.error("Error occurred while adding address:", error);
        res.status(500).send("Internal Server Error");
    }
   },

   // Edit Address Page Controller
   editaddressPage: async function(req,res){
    try {
        const userId = req.params.userId;
        const addressId =req.params.addressId;
        const user = req.session.user;
        const cartItemCount = await getCartItemCount(user);
        const address = await Address.findOne({ user: userId, _id: addressId }); 
        if (!address) {
            return res.status(404).send('Address not found');
        }
        res.render('users/editaddresspage', {
            title: 'Sole Haven: Edit-Address Page',
            hidelinks: false,
            searchbar:false,
            cartItemCount: cartItemCount,
            user: user,
            address:address
        });
    } catch (err) {
        res.status(500).send(err.message);
    }
   },

   // Edit Address Post Controller
   editaddressPost: async function(req,res){
    try {
        const userId = req.params.userId;
        const addressId = req.params.addressId; // Assuming you have the address ID in the URL
        const { fullName, addressLine1, addressLine2, city, state, zipCode, country, mobileNumber } = req.body;

        // Update the address in the database
        await Address.findByIdAndUpdate(addressId, {
            fullName: fullName,
            addressLine1: addressLine1,
            addressLine2: addressLine2,
            city: city,
            state: state,
            zipCode: zipCode,
            country: country,
            mobileNumber: mobileNumber
        });

        res.redirect(`/users/${userId}/addresses/${addressId}/edit`); 
    } catch (err) {
        res.status(500).send(err.message);
    }
   },

   // Delete Address Controller
   deleteAddress: async function(req,res){
    try {
        const userId = req.params.userId;
        const addressId = req.params.addressId;
        
        // Delete the address from the database
        await Address.findByIdAndDelete(addressId);
        
        // Respond with a success message
        res.status(200).send({ message: 'Address deleted successfully' });
    } catch (err) {
        res.status(500).send(err.message);
    }
   },

   // Cancel Order Controller
   cancelOrder: async function(req,res){
    try {
        console.log('Cancel order route hit'); 
        const orderId = req.params.id;
        // Validate the order ID
        if (!mongoose.Types.ObjectId.isValid(orderId)) {
            return res.status(400).send('Invalid order ID');
        }

        // Find the order by ID and update its status to 'Cancelled'
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).send('Order not found');
        }

        // If the order is paid, refund the amount to the user's wallet
        if (order.status === 'Paid') {
            const userId = order.user; // Adjust according to your schema
            const refundAmount = order.totalAmount; // Adjust according to your schema

            const user = await User.findById(userId);
            if (user) {
                user.wallet += refundAmount;
                await user.save(); 
                console.log('Amount Refunded to Wallet');
            } else {
                return res.status(404).send('User not found');
            }
        }

        // Update the order status to 'Cancelled'
        order.orderStatus = 'Cancelled';
        await order.save();

        res.redirect(`/users/profile/${order.user}`);
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
   },

   // Return Order Controller
   returnOrder: async function(req,res){
    try {
        console.log('Return order route hit'); 
        const orderId = req.params.id;
        // Validate the order ID
        if (!mongoose.Types.ObjectId.isValid(orderId)) {
            return res.status(400).send('Invalid order ID');
        }

        // Find the order by ID and update its status to 'Cancelled'
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).send('Order not found');
        }

        order.orderStatus = 'Returned';
        await order.save();

        res.redirect(`/users/profile/${order.user}`);
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
   },

   // View Order User Controller
   viewOrders: async function(req,res){
    try {
        const orderId = req.params.id;
        const order = await Order.findById(orderId)
          .populate('user')
          .populate('address')
          .populate('products.product')
          .populate('coupon');
  
        if (!order) {
          return res.status(404).send('Order not found');
        }
        const user = req.session.user;
        const cartItemCount = await getCartItemCount(user);
  
        res.render('users/vieworders', 
            {title:'View Order Page', 
                order,
                user:user,
                hidelinks:false,
                searchbar:false,
                cartItemCount:cartItemCount 
            }); // Adjust the view name as needed

      } catch (error) {
        console.error('Error in viewOrders:', error);
        res.status(500).send('An error occurred while fetching the order details');
      }
},

   // Wallet Pge Controller
   walletPage: async function(req,res){
    try {
        const userId = req.params.userId;
        const user = await User.findById(userId);
        // Get cart item count
        const cartItemCount = await getCartItemCount(user);

        if (!user) {
            return res.status(404).send({ message: 'User not found' });
        }

        const transactions = await Transaction.find({ userId }).sort({ date: -1 });

        res.render('users/wallet', {
            title: 'Wallet',
            user: user,
            transactions: transactions,
            hidelinks: false,
            searchbar: false,
            cartItemCount:cartItemCount
        });
    } catch (error) {
        console.error('Error fetching wallet data:', error);
        res.status(500).send({ message: 'Failed to load wallet page', error: error.message });
    }
   },


   // Wallet Add Funds Controller
   addFunds: async function(req,res){
    const { amount } = req.body;
    const userId = req.params.userId;

    if (!amount || amount <= 0) {
        return res.status(400).json({ message: 'Invalid amount' });
    }

    try {
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.wallet += amount;
        await user.save();

        const transaction = new Transaction({
            userId: user._id,
            type: 'Add',
            amount
        });

        await transaction.save();

        res.status(200).json({ message: 'Funds added successfully' });
    } catch (error) {
        console.error('Error adding funds:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
   },


   // Wallet Withdraw Funds Controller
   withdrawFunds: async function(req,res){
    const { amount } = req.body;
    const userId = req.params.userId;

    if (!amount || amount <= 0) {
        return res.status(400).json({ message: 'Invalid amount' });
    }

    try {
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.wallet < amount) {
            return res.status(400).json({ message: 'Insufficient funds' });
        }

        user.wallet -= amount;
        await user.save();

        const transaction = new Transaction({
            userId: user._id,
            type: 'Withdraw',
            amount
        });

        await transaction.save();

        res.status(200).json({ message: 'Funds withdrawn successfully' });
    } catch (error) {
        console.error('Error withdrawing funds:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
   },

   // Wallet Pay Controller
   walletPay: async function(req,res){
    const { checkoutId, selectedAddress } = req.body;
    try {
        const checkout = await Checkout.findById(checkoutId).populate('cartItems.productId');
        if (!checkout) {
            return res.status(404).json({ error: 'Checkout not found' });
        }

        const userId = checkout.userId;
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const totalAmount = checkout.total;
        if (user.wallet < totalAmount) {
            return res.status(400).json({ error: 'Insufficient wallet balance' });
        }

        // Deduct the amount from the user's wallet
        user.wallet -= totalAmount;
        await user.save();

        const address = await Address.findById(selectedAddress);
        if (!address) {
            return res.status(404).json({ error: 'Selected address not found' });
        }

        // Prepare product details for the order
        const productDetails = checkout.cartItems.map(cartItem => ({
            product: cartItem.productId,
            productImages: cartItem.productImages,
            productName: cartItem.productName,
            brandName: cartItem.brandName,
            color: cartItem.selectedColor,
            size: cartItem.selectedSize,
            quantity: cartItem.quantity,
            price: cartItem.price
        }));

        // Create the order
        const newOrder = new Order({
            user: userId,
            checkoutId: checkoutId,
            products: productDetails,
            subtotal: checkout.subtotal,
            tax: checkout.tax,
            totalAmount: checkout.total,
            address: address,
            paymentMethod: 'Wallet',
            status: 'Paid',
            appliedCouponAmount: checkout.appliedCouponAmount,
            coupon: checkout.coupon,
            orderDate: Date.now()
        });

        await newOrder.save();
        console.log('New order created:', newOrder._id);

        // Extract only the product IDs from productDetails
        const productIdsToRemove = productDetails.map(item => item.product._id.toString());
        console.log('Product IDs to remove:', productIdsToRemove);

        // Use $pull operator to remove items from the cart
        const result = await Cart.updateOne(
            { user: checkout.userId },
            { $pull: { items: { product: { $in: productIdsToRemove } } } }
        );

        console.log('Cart update result:', result);

        if (result.modifiedCount > 0) {
            console.log('Cart items removed successfully');
        } else {
            console.log('No items were removed from the cart');
        }

        res.json({ success: true, orderId: newOrder._id });

    } catch (error) {
        console.error('Error processing wallet payment:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
   },

    // Product Details Page Controller
    productdetailsPage: async function(req, res) {
        try {
            const productId = req.params.id;
            const product = await Product.findById(productId);
            const user = req.session.user;
    
            if (!product) {
                return res.status(404).send('Product not found');
            }
    
            // Get category information
            const category = await Category.findById(product.productCategory);
    
            if (!category) {
                return res.status(404).send('Category not found for the product');
            }
    
            // Construct the breadcrumbs array
            const breadcrumbs = [
                { name: 'Home', url: '/users/home' },
                { name: category.categoryName, url: `/users/${category.categoryName}`,active:false },
                { name: product.productName, url: `/users/product-details/${productId}`,active:true }
            ];
    
            // Get cart item count
            const cartItemCount = await getCartItemCount(user);
    
            // Render the product details page with breadcrumbs
            res.render('users/productdetails', {
                product: product,
                title: product.productName,
                hidelinks: false,
                searchbar:false,
                cartItemCount: cartItemCount,
                user: user,
                breadcrumbs: breadcrumbs
            });
        } catch (error) {
            // Log the error for debugging
            console.error('Error in productdetailsPage:', error);
            // Send a more descriptive error message
            res.status(500).send(`Internal Server Error: ${error.message}`);
        }
    },

    //Review Section Controller
    reviewsPage: async function(req,res){
        const productId = req.params.id;
        try {
            const reviews = await Review.find({ product: productId }).lean();
            res.json({ success: true, reviews });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },

    //Review Section Post Controller
    reviewsPost: async function(req, res) {
        const productId = req.params.id;
        const { user, rating, comment } = req.body;
    
        if (!user || !rating || !comment) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }
    
        try {
            const product = await Product.findById(productId);
            if (!product) {
                return res.status(404).json({ success: false, message: 'Product not found' });
            }
    
            const review = new Review({
                product: productId,
                user,
                rating,
                comment
            });
    
            await review.save();
    
            // Recalculate the average star rating
            const reviews = await Review.find({ product: productId });
            const totalRating = reviews.reduce((acc, review) => acc + review.rating, 0);
            const averageRating = totalRating / reviews.length;

            // Round the average rating to two decimal places
            const roundedAverageRating = parseFloat(averageRating.toFixed(1));
    
            // Update the product's star rating
            product.starRating = roundedAverageRating; // Corrected from startRating to starRating
            await product.save();
    
            res.json({ success: true, review });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },


   // Cart Page Controller
   cartPage: async function(req, res) {
    try {
        // Check if user is logged in
        if (!req.session.user) {
            return res.status(401).send('You need to log in first.');
        }

        // Get user ID from session
        const userId = req.session.user._id;

        // Initialize cartItemCount
        let cartItemCount = 0;

        // Get cart item count
        cartItemCount = await getCartItemCount(userId);

        // Fetch the cart using the user ID and populate product details
        const cart = await Cart.findOne({ user: userId })
            .populate({
                path: 'items.product',
                select: 'brandName colors sizes productImages productName price' // Populate necessary fields here
            });

        // Check if cart exists
        if (!cart || !cart.items.length) {
            // Cart not found for the user or cart is empty, handle accordingly
            return res.render('users/cartpage', {
                title: 'Sole Haven - Cart Page',
                cartItems: [],
                page: 'Cart',
                hidelinks: false,
                searchbar: false,
                cartItemCount: cartItemCount,
                user: req.session.user
            });
        }

        // Fetch product details for each cart item to ensure colors and sizes are populated
        for (let item of cart.items) {
            const product = await Product.findById(item.product._id);
            if (product) {
                item.product.colors = product.color || []; // Assuming 'colors' is a field in your Product model
                item.product.sizes = product.sizeInch || [];   // Assuming 'sizes' is a field in your Product model
            }
        }

        // Cart found and not empty, render the cart page with cart items
        res.render('users/cartpage', {
            title: 'Sole Haven - Cart Page',
            cartItems: cart.items,
            page: 'Cart',
            hidelinks: false,
            searchbar: false,
            cartItemCount: cartItemCount,
            user: req.session.user
        });
    } catch (error) {
        console.error('Error fetching cart items:', error);
        res.status(500).send('Internal Server Error');
    }
},



    //Add- Cart Post Controller
    addcartPost: async function(req, res) {
        const { productId, userId, quantity} = req.body;
    const maxQuantity = 5; 

    try {
        if (!userId) {
            return res.status(401).json({ message: 'User not authenticated' });
        }

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // Validate if quantity exceeds maximum allowed
        let cart = await Cart.findOne({ user: userId }).populate('items.product');
        if (!cart) {
            cart = new Cart({ user: userId, items: [] });
        }

        const existingItem = cart.items.find(item => item.product.equals(productId));
        const currentQuantity = existingItem ? existingItem.quantity : 0;

        if (currentQuantity + quantity > maxQuantity) {
            return res.status(400).json({ message: `Cannot add more than ${maxQuantity} of this item.` });
        }

        // Handle selected options, assuming selectedOptions is an array of selected options
        const cartItem = {
            product: productId,
            quantity:quantity,
            color: product.color,
            size: product.sizeInch
        };

        // Check if the item already exists in the cart
        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            cart.items.push(cartItem);
        }

        await cart.save();

        const cartItemCount = await getCartItemCount(userId);
        res.status(200).json({ message: 'Product added to cart', cartItemCount });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
    },
    

    // Cart Item Delete Controller
    cartitemDelete: async function (req,res){
        const  productId  = req.params.id;
        const user = req.session.user; 
        try {
            const cart = await Cart.findOne({ user });
            if (cart) {
                const itemIndex = cart.items.findIndex(item => item.product.toString() === productId);
                if (itemIndex > -1) {
                    cart.items.splice(itemIndex, 1);
                    await cart.save();
                    return res.status(200).json({ message: 'Item removed from cart' });
                } else {
                    return res.status(404).json({ message: 'Item not found in cart' });
                }
            } else {
                return res.status(404).json({ message: 'Cart not found' });
            }
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },

    // Checkput Post Controller
    checkoutPost: async function(req, res) {
        try {
            // Parse cartItems and formData from req.body
            let cartItems, formData;
            try {
                cartItems = JSON.parse(req.body.cartItems);
                formData = JSON.parse(req.body.formData);
            } catch (error) {
                console.error('Error parsing JSON:', error);
                throw new Error('Invalid JSON data');
            }
        
            const { userId, cartItems: parsedCartItems, coupon } = formData;
        
            // Calculate subtotal, tax, total
            const taxRate = 0.10; // 10% tax rate
            let subtotal = 0;
        
            parsedCartItems.forEach(item => {
                subtotal += item.product.price * item.quantity;
            });
        
            // Initialize appliedCouponAmount
            let appliedCouponAmount = 0;
        
            // If a coupon is applied, calculate the discount amount
            if (coupon) {
                const couponData = await Coupon.findById(coupon);
        
                if (couponData) {
                    appliedCouponAmount = subtotal * (couponData.discountPercentage / 100);
                }
            }
        
            const adjustedSubtotal = subtotal - appliedCouponAmount;
            const tax = adjustedSubtotal * taxRate;
            const total = adjustedSubtotal + tax;
        
            // Find existing checkout items for the user
            let existingCheckout = await Checkout.findOne({ userId });
        
            if (existingCheckout) {
                // Get current product IDs in the cart
                const currentProductIds = parsedCartItems.map(item => item.product?._id?.toString());
        
                // Remove items from existing checkout that are not in current cart
                const itemsToRemove = existingCheckout.cartItems.filter(item => !currentProductIds.includes(item.productId?.toString()));
                existingCheckout.cartItems = existingCheckout.cartItems.filter(item => currentProductIds.includes(item.productId?.toString()));
        
                // Update quantities and details of existing items
                parsedCartItems.forEach(item => {
                    const existingItem = existingCheckout.cartItems.find(cartItem => cartItem.productId?.toString() === item.product?._id?.toString());
                    if (existingItem) {
                        existingItem.quantity = item.quantity;
                        existingItem.selectedColor = item.selectedColor;
                        existingItem.selectedSize = item.selectedSize;
                    } else {
                        // Add new item to existing checkout
                        existingCheckout.cartItems.push({
                            productId: item.product?._id,
                            productImages: item.product?.productImages,
                            brandName: item.product?.brandName,
                            productName: item.product?.productName,
                            quantity: item.quantity,
                            price: item.product?.price,
                            selectedColor: item.selectedColor,
                            selectedSize: item.selectedSize,
                        });
                    }
                });
        
                // Update subtotal, tax, total, and coupon details
                existingCheckout.subtotal = adjustedSubtotal;
                existingCheckout.tax = tax;
                existingCheckout.total = total;
                existingCheckout.appliedCouponAmount = appliedCouponAmount;
                existingCheckout.coupon = coupon;
        
                // Save updated checkout
                await existingCheckout.save();
        
                // Remove items that are no longer in cart from the database
                if (itemsToRemove.length > 0) {
                    await Checkout.updateOne({ userId }, { $pull: { cartItems: { productId: { $in: itemsToRemove.map(item => item.productId) } } } });
                }
        
                console.log(`Updated existing checkout for userId ${userId}`);
            } else {
                // Create new checkout document
                const newCheckout = new Checkout({
                    userId,
                    cartItems: parsedCartItems.map(item => ({
                        productId: item.product?._id,
                        productImages: item.product?.productImages,
                        brandName: item.product?.brandName,
                        productName: item.product?.productName,
                        quantity: item.quantity,
                        price: item.product?.price,
                        selectedColor: item.selectedColor,
                        selectedSize: item.selectedSize,
                    })),
                    subtotal: adjustedSubtotal,
                    tax,
                    total,
                    appliedCouponAmount,
                    coupon
                });
        
                // Save new checkout
                await newCheckout.save();
                console.log(`Created new checkout for userId ${userId}`);
            }
        
            // Redirect to checkout page or send success response
            res.redirect('/users/checkout');
        } catch (error) {
            console.error('Error saving checkout:', error);
            res.status(500).send('Internal Server Error');
        }        
    },
    
    // CheckOut Page Controller
    checkoutPage: async function(req, res) {
        try {
            const user = req.session.user;
            const userId = req.session.user._id;
    
            if (!user || !userId) {
                throw new Error('User not found or invalid user ID');
            }
    
            const cartItemCount = await getCartItemCount(user);
    
            // Fetch data necessary for rendering checkout page
            const cartItems = await getCartItems(userId); // Fetch cart items for the user
            const profile = await getProfileByUserId(userId); // Fetch shipping address for the user
            const address = await getAddressByUserId(userId);
            // Fetch Checkout data for the user
            const checkout = await Checkout.findOne({ userId }).exec();
    
            if (!checkout) {
                throw new Error('Checkout data not found for the user');
            }

            const taxRate = 0.10; // 10% tax rate
            // Calculate subtotal based on cart items
            const subtotal = calculateSubtotal(cartItems);
            const tax = calculateTax(subtotal, taxRate);

             let appliedCouponAmount = 0;
             let adjustedSubtotal = subtotal;
             let total = subtotal + tax;

            if (checkout.coupon) {
             try {
              const coupon = await Coupon.findById(checkout.coupon);
              if (coupon) {
                   appliedCouponAmount = subtotal * (coupon.discountPercentage / 100);
                   adjustedSubtotal = subtotal - appliedCouponAmount;
                   const adjustedTax = calculateTax(adjustedSubtotal, taxRate);
                    total = adjustedSubtotal + adjustedTax;
                  } else {
                     console.log('Coupon not found');
                  }
                   } catch (error) {
                    console.error('Error fetching coupon:', error);
                    // Handle error appropriately (log, throw, etc.)
                    throw new Error('Failed to fetch coupon');
                  }
               }

                // Fetch non-expired coupons
                const now = new Date();
                const availableCoupons = await Coupon.find({
                validUntil: { $gte: now },
                status: 'active'
                });

            res.render('users/checkoutpage', {
                title: 'Sole Haven - Checkout Page',
                hidelinks: false,
                searchbar: false,
                cartItems: cartItems,
                cartItemCount: cartItemCount,
                address: address,
                profile: profile,
                checkout: checkout,
                subtotal: subtotal,
                tax: tax,
                total: total,
                user: user,
                appliedCouponAmount,
                availableCoupons
            });
        } catch (error) {
            console.error('Error in checkoutPage:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },


    //Update Checkout After Product Removal Controller 
    updateCheckout: async function(req,res){
        const { checkoutId, updatedProducts, appliedCouponAmount } = req.body;

    try {
        console.log(`Received update request for checkoutId: ${checkoutId}`);
        console.log(`Updated products: ${JSON.stringify(updatedProducts)}`);
        console.log(`Applied coupon amount: ${appliedCouponAmount}`);

        // Find the checkout by ID
        const checkout = await Checkout.findById(checkoutId);
        if (!checkout) {
            return res.status(404).json({ message: 'Checkout not found' });
        }

         // Validate updated products structure
    let validProducts = [];
    if (Array.isArray(updatedProducts) && updatedProducts.length > 0) {
        validProducts = updatedProducts.map(item => ({
            productId: item.productId,
            productImages: item.productImages,
            brandName: item.brandName,
            productName: item.productName,
            quantity: item.quantity,
            price: item.price,
            selectedColor: item.selectedColor,
            selectedSize: item.selectedSize
        }));
    } else {
        return res.status(400).json({ message: 'Invalid or empty updated products array' });
    }

        console.log(`Validated products: ${JSON.stringify(validProducts)}`);

        // Update the cartItems with the new list of products
        checkout.cartItems = validProducts;

        // Calculate subtotal
        const subtotal = validProducts.reduce((acc, item) => acc + item.price * item.quantity, 0);

        // Assuming a fixed tax rate of 10% for the example, modify as per your tax logic
        const taxRate = 0.10;
        const tax = subtotal * taxRate;

        // Calculate total amount after applying coupon
        const total = subtotal + tax - (appliedCouponAmount || 0);

        // Update the checkout fields
        checkout.subtotal = subtotal;
        checkout.tax = tax;
        checkout.total = total;
        checkout.appliedCouponAmount = appliedCouponAmount || 0;

        // Save the updated checkout object
        await checkout.save();

        res.json({ message: 'Checkout updated successfully' });
    } catch (error) {
        console.error('Error updating checkout:', error);
        res.status(500).json({ message: 'Failed to update checkout' });
    }
    },
    

    // Cancel Checkout Controller
    cancelCheckout: async function(req,res){
        try {
            const checkoutId = req.params.id;
            const result = await Checkout.findByIdAndDelete(checkoutId);
            
            if (!result) {
                return res.status(404).send({ message: 'Checkout not found' });
            }
    
            res.status(200).send({ message: 'Checkout deleted successfully' });
        } catch (error) {
            console.error('Error deleting checkout:', error);
            res.status(500).send({ message: 'Failed to delete checkout', error: error.message });
        }
    },

    // Apply Coupon Controller
    applyCoupon: async function(req,res){
        const { checkoutId, couponCode } = req.body;
    try {
        const checkout = await Checkout.findById(checkoutId);
        const coupon = await Coupon.findOne({ code: couponCode });

        if (!coupon) {
            return res.status(404).json({ message: 'Invalid coupon code' });
        }

        const now = new Date();
        if (now < coupon.validFrom) {
            return res.status(400).json({ message: `Coupon not valid yet. This coupon starts from ${coupon.validFrom.toLocaleDateString()}` });
        }

        if (now > coupon.validUntil) {
            return res.status(400).json({ message: 'Coupon expired' });
        }

        if (coupon.usageLimit <= coupon.usedCount) {
            return res.status(400).json({ message: 'Coupon usage limit exceeded' });
        }

        // Calculate applied coupon amount
        const subtotal = checkout.subtotal;
        const appliedCouponAmount = (subtotal * coupon.discountPercentage) / 100;

        // Update checkout with coupon details
        checkout.coupon = coupon._id;
        checkout.appliedCouponAmount = appliedCouponAmount;
        checkout.total = subtotal + checkout.tax - appliedCouponAmount;

        // Increment coupon usage count and save changes
        coupon.usedCount += 1;
        await Promise.all([checkout.save(), coupon.save()]);

        res.json({ message: 'Coupon applied successfully', checkout, appliedCouponAmount });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
    },

    // Remove Coupon Controller
    removeCoupon: async function(req,res){
        const { checkoutId } = req.body;
    try {
        const checkout = await Checkout.findById(checkoutId);

        if (!checkout.coupon) {
            return res.status(400).json({ message: 'No coupon applied' });
        }

        const coupon = await Coupon.findById(checkout.coupon);

        // Decrement coupon usage count if it has been used
        if (coupon.usedCount > 0) {
            coupon.usedCount -= 1;
            await coupon.save();
        }

        // Remove coupon from checkout and recalculate total
        checkout.coupon = null;
        checkout.appliedCouponAmount = 0;
        checkout.total = checkout.subtotal + checkout.tax;

        await checkout.save();

        res.json({ message: 'Coupon removed successfully', checkout });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
    },

    // Delete Order Controller on Order Placed Page
    deleteOrder: async function(req,res){
        try {
            const orderId = req.params.id;
            const order = await Order.findById(orderId);
    
            if (!order) {
                return res.status(404).send({ message: 'Order not found' });
            }
    
            if (order.status === 'Paid') {
                // Refund the amount to the user's wallet
                const userId = order.user; // Adjust according to your schema
                const refundAmount = order.totalAmount; // Adjust according to your schema
    
                const user = await User.findById(userId);
                if (user) {
                    user.wallet += refundAmount;
                    await user.save(); 
                    console.log('Amount Refunded to Wallet')
                } else {
                    return res.status(404).send({ message: 'User not found' });
                }
            }
    
            // Delete the order
            await Order.findByIdAndDelete(orderId);
    
            res.status(200).send({ message: 'Order deleted successfully' });
        } catch (error) {
            console.error('Error deleting order:', error);
            res.status(500).send({ message: 'Failed to delete order', error: error.message });
        }
    },

    // Order Invoice Controller
    orderInvoice: async (req, res) => {
        try {
            const orderId = req.params.id;
            const order = await Order.findById(orderId).populate('products.product').populate('address');
    
            if (!order) {
                return res.status(404).send('Order not found');
            }
    
            // Create a PDF document
            const doc = new PDFDocument({ size: 'A4', margin: 50 });
            const chunks = [];
    
            doc.on('data', (chunk) => chunks.push(chunk));
            doc.on('end', () => {
                const result = Buffer.concat(chunks);
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', `attachment; filename=invoice_${orderId}.pdf`);
                res.send(result);
            });
    
            // Add content to the PDF
            module.exports.addHeader(doc, order);
            module.exports.addShippingAddress(doc, order);
            module.exports.addOrderItems(doc, order);
            module.exports.addOrderSummary(doc, order);
    
            doc.end();
    
        } catch (error) {
            console.error('Error generating invoice:', error);
            res.status(500).send('Internal Server Error');
        }
    },

    addHeader: (doc, order) => {
        doc.fontSize(30).font('Helvetica-Bold').text('Invoice', { align: 'center' });
        doc.moveDown(1);
        
        doc.fontSize(12).font('Helvetica');
        doc.text(`Order ID: ${order._id}`, { align: 'right' });
        doc.text(`Order Date: ${order.orderDate.toDateString()}`, { align: 'right' });
        doc.moveDown(1);
    },

    addShippingAddress: (doc, order) => {
        doc.fontSize(16).font('Helvetica-Bold').text('Shipping Address');
        doc.moveDown(0.5);
        
        doc.fontSize(12).font('Helvetica');
        if (order.address) {
            doc.text(`${order.address.fullName}`);
            doc.text(`${order.address.addressLine1}`);
            doc.text(`${order.address.addressLine2}`);
            doc.text(`${order.address.city}, ${order.address.state} ${order.address.zipCode}`);
            doc.text(`${order.address.country}`);
            doc.text(`Mobile: ${order.address.mobileNumber}`);
        } else {
            doc.text('No address information available');
        }
        doc.moveDown(1);
    },

    addOrderItems: (doc, order) => {
        doc.fontSize(16).font('Helvetica-Bold').text('Order Items');
        doc.moveDown(0.5);

        const tableTop = doc.y;
        const headers = ['Product', 'Brand', 'Color', 'Size', 'Qty', 'Price', 'Total'];
        const columnWidths = [140, 70, 50, 40, 30, 60, 60];
        const tableWidth = columnWidths.reduce((sum, width) => sum + width, 0);

        // Draw table border
        doc.rect(50, tableTop - 5, tableWidth, 20).stroke();

        // Table header
        doc.font('Helvetica-Bold').fontSize(9);
        let xPosition = 50;
        headers.forEach((header, i) => {
            doc.text(header, xPosition + 2, tableTop, {
                width: columnWidths[i],
                align: 'center'
            });
            xPosition += columnWidths[i];
        });

        // Table rows
        doc.font('Helvetica').fontSize(8);
        let y = tableTop + 20;
        order.products.forEach((item) => {
            // Draw row border
            doc.rect(50, y - 5, tableWidth, 20).stroke();

            xPosition = 50;
            doc.text(item.product.productName, xPosition + 2, y, { width: columnWidths[0] - 4, align: 'left' });
            xPosition += columnWidths[0];
            doc.text(item.product.brandName, xPosition + 2, y, { width: columnWidths[1] - 4, align: 'center' });
            xPosition += columnWidths[1];
            doc.text(item.color, xPosition + 2, y, { width: columnWidths[2] - 4, align: 'center' });
            xPosition += columnWidths[2];
            doc.text(item.size, xPosition + 2, y, { width: columnWidths[3] - 4, align: 'center' });
            xPosition += columnWidths[3];
            doc.text(item.quantity.toString(), xPosition + 2, y, { width: columnWidths[4] - 4, align: 'center' });
            xPosition += columnWidths[4];
            doc.text(`Rs. ${item.price.toFixed(2)}`, xPosition + 2, y, { width: columnWidths[5] - 4, align: 'right' });
            xPosition += columnWidths[5];
            doc.text(`Rs. ${(item.quantity * item.price).toFixed(2)}`, xPosition + 2, y, { width: columnWidths[6] - 4, align: 'right' });

            y += 20;
        });

        doc.moveDown(2);
    },

    addOrderSummary: (doc, order) => {
        const summaryX = 350;
        const summaryWidth = 200;
        const summaryY = doc.y;

        // Draw a border around the summary
        doc.rect(summaryX - 10, summaryY - 10, summaryWidth + 20, 120).stroke();

        // Add "Order Summary" heading
        doc.fontSize(14).font('Helvetica-Bold').text('Order Summary', summaryX, summaryY, { width: summaryWidth, align: 'center' });
        doc.moveDown(1);

        const addSummaryLine = (label, value, isTotal = false) => {
            doc.fontSize(10).font(isTotal ? 'Helvetica-Bold' : 'Helvetica');
            doc.text(label, summaryX, doc.y, { width: summaryWidth / 2, align: 'left' });
            doc.text(value, summaryX + summaryWidth / 2, doc.y, { width: summaryWidth / 2, align: 'right' });
            doc.moveDown(0.5);
        };

        addSummaryLine('Subtotal:', `Rs. ${order.subtotal.toFixed(2)}`);
        addSummaryLine('Tax:', `Rs. ${order.tax.toFixed(2)}`);
        if (order.appliedCouponAmount > 0) {
            addSummaryLine('Discount:', `Rs. ${order.appliedCouponAmount.toFixed(2)}`);
        }
        doc.moveDown(0.5);
        addSummaryLine('Total Amount:', `Rs. ${order.totalAmount.toFixed(2)}`, true);
    },
    
    
    // Another Edit Address Page Controller
    anotherEditAddressPage: async function(req,res){
        try {
            const userId = req.params.userId;
            const addressId =req.params.addressId;
            const user = req.session.user;
            const cartItemCount = await getCartItemCount(user);
            const address = await Address.findOne({ user: userId, _id: addressId }); 
            if (!address) {
                return res.status(404).send('Address not found');
            }
            res.render('users/Aeditaddresspage', {
                title: 'Sole Haven: Edit-Address Page',
                hidelinks: false,
                searchbar:false,
                cartItemCount: cartItemCount,
                user: user,
                address:address
            });
        } catch (err) {
            res.status(500).send(err.message);
        }
    },

    // Another Edi Address Post Controller
    anotherEditAddressPost: async function(req,res){
        try {
            const addressId = req.params.addressId; // Assuming you have the address ID in the URL
            const { fullName, addressLine1, addressLine2, city, state, zipCode, country, mobileNumber } = req.body;
    
            // Update the address in the database
            await Address.findByIdAndUpdate(addressId, {
                fullName: fullName,
                addressLine1: addressLine1,
                addressLine2: addressLine2,
                city: city,
                state: state,
                zipCode: zipCode,
                country: country,
                mobileNumber: mobileNumber
            });
    
            res.redirect('/users/checkout'); 
        } catch (err) {
            res.status(500).send(err.message);
        }
    },

    // Place Order Post Controller
    placeorderPost: async function(req,res){
        try {
            const { selectedAddress, paymentMethod, checkoutId, appliedCouponAmount } = req.body;
            console.log('REQ.BODY:', req.body);
            const userId = req.session.user._id; // Assuming user ID is stored in session
    
            // Fetch the selected address from the database
            const address = await Address.findById(selectedAddress);
            if (!address) {
                return res.status(404).send('Selected address not found');
            }
    
            // Fetch checkout details for the user
            const checkout = await Checkout.findById(checkoutId).populate('cartItems.productId');
            if (!checkout) {
                return res.status(404).send('Checkout details not found');
            }
    
            // Extract cart items from checkout
            const { cartItems, subtotal, tax, total } = checkout;
    
            // Prepare product details for the order
            const productDetails = cartItems.map(cartItem => ({
                product: cartItem.productId,
                productImages:cartItem.productImages,
                productName: cartItem.productName,
                brandName: cartItem.brandName,
                color: cartItem.selectedColor,
                size: cartItem.selectedSize,
                quantity: cartItem.quantity,
                price: cartItem.price
            }));
    
            // Convert appliedCouponAmount to number
            const couponAmount = parseFloat(appliedCouponAmount);
    
            // Calculate total amount considering the applied coupon
            let totalAmount = total;
            if (!isNaN(couponAmount) && couponAmount > 0) {
                totalAmount = (parseFloat(totalAmount) - couponAmount).toFixed(2);
            }
    
            // Create a new order
            const newOrder = new Order({
                user: userId,
                address: selectedAddress,
                products: productDetails,
                subtotal: checkout.subtotal,
                tax: checkout.tax,
                totalAmount: checkout.total,
                orderStatus: 'Pending',
                paymentMethod: paymentMethod,
                orderDate: Date.now(),
                appliedCouponAmount: checkout.appliedCouponAmount,
                coupon: checkout.coupon
            });
    
            // Save the order to the database
            await newOrder.save();

            console.log('PRODUCTDETAILS:-', productDetails);

             // Extract only the product IDs from productDetails
             const productIdsToRemove = productDetails.map(item => item.product._id.toString());
            console.log('Product IDs to remove:', productIdsToRemove);

            // Use $pull operator to remove items from the cart
             const result = await Cart.updateOne(
            { user: userId },
            { $pull: { items: { product: { $in: productIdsToRemove } } } }
            );

             console.log('Cart update result:', result);

            if (result.modifiedCount > 0) {
            console.log('Cart items removed successfully');
            } else {
            console.log('No items were removed from the cart');
            }

    
            // Clear the user's cart or mark the checkout as completed
            await Checkout.findByIdAndUpdate(checkoutId, { $set: { isCompleted: true } });
    
            res.status(200).json({ 
                success: true, 
                message: 'Order placed successfully', 
                orderId: newOrder._id 
            });
    
        } catch (error) {
            console.error('Error placing order:', error);
            res.status(500).send('Error placing order: ' + error.message);
        }
    },

    // Place Order Page Controller
    placeorderPage: async function(req,res){
        try {
            const user = req.session.user;
            const orderId = req.params.orderId; // Get the order ID from the request parameters
    
             // Fetch the order details from the database and populate necessary fields
             const order = await Order.findById(orderId)
             .populate('products.product')
             .populate({
              path: 'address',
              model: 'Address' // Ensure 'Address' is the correct model name
             })
             .populate('user'); // Assuming 'user' is populated correctly in your Order model

            if (!order) {
            return res.status(404).send('Order not found');
            }

            let cartItemCount = await getCartItemCount(user);
    
            // Render the order placed page with order details
            res.render('users/orderplaced', {
                title: 'Sole Haven - Order Placed Page',
                hidelinks: false,
                searchbar: false,
                cartItemCount: cartItemCount,
                user: order.user,
                order: {
                    _id: order._id,
                    paymentMethod: order.paymentMethod,
                    paymentId: order.paymentId,
                    orderStatus: order.orderStatus,
                    appliedCouponAmount: order.appliedCouponAmount,
                    status: order.status,
                    subtotal: order.subtotal || 0,
                    tax: order.tax || 0,
                    totalAmount: order.totalAmount || 0,
                    orderDate:order.orderDate,
                    products:order.products,
                    address: order.address || {}
                }
            });
        } catch (error) {
            console.error('Error Rendering Placeorder Page:', error);
            res.status(500).send('Error placeOrder Page: ' + error.message); 
        }
    },

    // wishList Page Controller
    wishlistPage: async function(req,res){
        try {
            const user = req.session.user;
            let cartItemCount = 0;
            cartItemCount = await getCartItemCount(user);

            const wishlist = await Wishlist.findOne({ user: user }).populate('items.product');

            res.render('users/wishlist', {
                title: 'Sole Haven - WishList Page',
                hidelinks: false,
                searchbar:false,
                cartItemCount: cartItemCount,
                user:user,
                wishlistItems: wishlist ? wishlist.items : []
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },


    //Wishlist Post Controller
    wishlistPost: async function(req,res){
        const { productId, userId } = req.body;
        try {
            if (!userId) {
                return res.status(401).json({ message: 'User not authenticated' });
            }
    
            const product = await Product.findById(productId);
            if (!product) {
                return res.status(404).json({ message: 'Product not found' });
            }
    
            let wishlist = await Wishlist.findOne({ user: userId }).populate('items.product');
            if (!wishlist) {
                wishlist = new Wishlist({ user: userId, items: [] });
            }
    
            const existingItem = wishlist.items.find(item => item.product.equals(productId));
            if (existingItem) {
                return res.status(400).json({ message: 'Product already in wishlist' });
            } else {
                wishlist.items.push({ product: productId });
            }
    
            await wishlist.save();
    
            const wishlistItemCount = await getWishlistItemCount(userId);
            res.status(200).json({ message: 'Product added to wishlist', wishlistItemCount }); 
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },


    // Wishlist Item Delete Controller
    wishlistitemDelete: async function (req,res){
        const productId = req.params.id;
        const user = req.session.user; 
    
        if (!user) {
            return res.status(401).json({ message: 'User not authenticated' });
        }
    
        try {
            const wishlist = await Wishlist.findOne({ user: user._id });
            if (wishlist) {
                const itemIndex = wishlist.items.findIndex(item => item.product.toString() === productId);
                if (itemIndex > -1) {
                    wishlist.items.splice(itemIndex, 1);
                    await wishlist.save();
                    return res.status(200).json({ message: 'Item removed from wishlist' });
                } else {
                    return res.status(404).json({ message: 'Item not found in wishlist' });
                }
            } else {
                return res.status(404).json({ message: 'Wishlist not found' });
            }
        } catch (error) {
            console.error('Error removing item from wishlist:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },


    // Login Page Controller
    loginPage: function(req, res) {
        const error = req.session.error;
        delete req.session.error;  // Clear the error message from session after displaying it
    res.render('users/loginpage',{title:'Sole Haven - Login Page',hidelinks:true,searchbar:false,error});
    },



    // Login Page Post Controller
    loginPost: async function(req, res) {
        const { username, password } = req.body;
    try {
        const user = await User.findOne({ name: username });

        if (!user) {
            return res.status(401).json({ error: 'Invalid username or email' });
        }

        if (user.is_blocked) {
            return res.status(403).json({ error: 'You are blocked by Sole Haven' });
        }

        const passwordMatch = await bcrypt.compare(password, user.password);

        if (!passwordMatch) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        req.session.user = {
            _id: user._id,
            name: username
        };

        return res.json({ redirect: '/users/home?loginSuccess=true' });

    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
    },

    // SignUp Page Controller
    signupPage: function(req, res) {
        res.render('users/signuppage',{title:'Sole Haven - SignUp Page',hidelinks:true,searchbar:false});
    },



   // SignUp Post Controller
   signupPost: async function(req, res) {
    const { username, password, email, referralCodeUser } = req.body;
  
    try {
         // Validation for invalid spaces in the username
         const spacePattern = /^\s|\s{2,}|\s$/;
         if (spacePattern.test(username)) {
             return res.status(400).json({ error: 'Username contains invalid spaces.' });
         }else if (password.length < 8) {
            errorMessages.push('Password must be at least 8 characters long.');
        } else if (spacePattern.test(password)) {
            errorMessages.push('Password contains invalid spaces.');
        }

         
      let referredBy = null;
      if (referralCodeUser) {
        const referringUser = await User.findOne({ referralCode: referralCodeUser });
        if (!referringUser) {
          return res.status(400).json({ error: 'Invalid referral code.' });
        }
        referredBy = referringUser._id;
      }
  
      const hashedPassword = await bcrypt.hash(password, 10);
      
      const newUser = new User({
        name: username,
        password: hashedPassword,
        email: email,
        is_verified: false,
        referredBy: referredBy
      });
  
      await newUser.save();
  
      if (referredBy) {
        await User.findByIdAndUpdate(referredBy, { $inc: { referralCount: 1 } });
        await Referral.create({
          referrer: referredBy,
          referred: newUser._id,
        });
      }
  
      res.status(200).json({ redirect: '/users/verify?email=' + encodeURIComponent(email) });
    } catch (error) {
      console.error('Error during signup:', error);
      if (error.code === 11000) {
        if (error.keyPattern.email) {
          res.status(400).json({ error: 'Email is already in use.' });
        } else if (error.keyPattern.referralCode) {
          // This should not happen normally, but just in case
          res.status(500).json({ error: 'Error generating unique referral code. Please try again.' });
        } else {
          res.status(500).json({ error: 'Duplicate key error.' });
        }
      } else {
        res.status(500).json({ error: 'Internal Server Error' });
      }
    }  
  },


    // Verification Page Controller
    verifyPage: function(req, res) {
        const { email,verificationToken} = req.query;
        res.render('users/verification', {title:'Sole Haven - Verify Page', email:email,hidelinks:true,searchbar:false});
    },

    // Verification Post Controller
    verifyPost: async function (req, res) {
        const { email, otp } = req.body;
    console.log('Received verification request:', req.body);

    try {
        const user = await User.findOne({ email });
        if (!user) {
            console.log('User not found');
            return res.status(401).send('Invalid OTP');
        }

        // Normalize and compare OTP and token
        const normalizedOtp = otp.trim();
        const normalizedToken = user.token ? user.token.trim() : null;

        if (normalizedToken !== normalizedOtp) {
            console.log(`Invalid OTP for user ${email}. Expected: ${normalizedToken}, Received: ${normalizedOtp}`);
            return res.status(401).send('Invalid OTP');
        }

        user.is_verified = true;
        user.token = null; // Clear the verification token
        await user.save();

        console.log('User verified successfully:', email);
        res.redirect('/users/login');
    } catch (error) {
        console.error('Error during verification:', error);
        res.status(500).send('Internal Server Error');
    }
     },


    sendotpPost: async function (req, res) {
        const { email } = req.body;
        console.log('Request Body:', req.body);

        try {
            const user = await User.findOne({ email: email });
            if (!user) {
                return res.status(404).send('User not found');
            }

           const verificationToken = generateOTP(6); // Generate a 6-digit OTP
            user.token = verificationToken;
            user.is_Verified = false;
            await user.save();

            await sendVerificationOTP(email, verificationToken);

            res.status(200).send('Verification email sent successfully');
        } catch (error) {
            console.error('Error during sending verification email:', error);
            res.status(500).send('Internal Server Error');
        }
    },

    //Forgot Password Page Controller
    forgotPass:function(req, res) {
    // Get the username from the request or wherever it is stored
    const username = req.body.username; 
    res.render('users/forgotpass', { title:'Sole Haven - Forgot Password', username: username ,hidelinks:true,searchbar:false});
    },



    //Reset Password Controller
    resetPasswordPost: async function(req, res) {
        try {
            // Destructure the fields from req.body
            const { username, new_password, confirm_password } = req.body;
    
            // Find the user by username
            const user = await User.findOne({ name: username });
    
            // If user not found, return 404
            if (!user) {
                return res.status(404).send("User not found");
            }
    
            // Check if new password and confirm password match
            if (new_password !== confirm_password) {
                return res.status(400).send("Passwords do not match");
            }
    
            // Hash the new password
            const hashedPassword = await bcrypt.hash(new_password, 10);
    
            // Update user's password and clear reset token and token expiration
            user.password = hashedPassword;
            user.token = null;
            user.tokenExpires = null;
    
            // Save the updated user object
            await user.save();
    
            // Redirect the user to the login page or any other appropriate page
            return res.redirect('/users/login');
        } catch (error) {
            // Handle errors
            console.error('Error resetting password:', error);
            return res.status(500).send('Internal Server Error');
        }
    },


    // Usename Check Controller
    usernameCheck: async function(req,res){
        try {
            const { username } = req.body;
            const user = await User.findOne({ name: username });
            if (user) {
                return res.status(200).json({ exists: true });
            } else {
                return res.status(200).json({ exists: false });
            }
        } catch (error) {
            console.error('Error checking username:', error);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
    },



     // Resend Verification Email Controller
    resendVerificationEmail: async function(req, res) {
        const { email } = req.body;
        console.log('BODY:',req.body);
        try {
            const user = await User.findOne({ email: email });

            if (!user) {
                return res.status(404).send('User not found');
            }
                user.token = null;
            // Generate a new verification token
            const verificationToken = generateOTP(6); // Using a 6-digit OTP
            user.token = verificationToken;
            user.is_Verified = false;
            await user.save();

            // Log the new verification token
            console.log('New Verification Token:', verificationToken);

            // Send verification email
            await sendVerificationOTP(email, verificationToken);

            res.status(200).send('Verification email sent successfully');
        } catch (error) {
            console.error('Error during sending verification email:', error);
            res.status(500).send('Internal Server Error');
        }
    },

    // Logout User Controller
    logoutUser: async function(req,res){
       // Perform logout actions here, such as clearing session
       req.session.destroy(function(err) {
        if(err) {
            console.error(err);
            res.status(500).send('Error logging out');
        } else {
            // Redirect the user to a desired page after logout
            res.redirect('/users/login');
        }
    });
    },

};


async function sendVerificationOTP(email, otp) {
    try {
        // Create a nodemailer transporter
        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 465,
            secure: true,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            },
            tls: {
                rejectUnauthorized: false // Ignore self-signed certificate error
            }
        });

        // Email content
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Email Verification OTP',
            text: `Your verification OTP is: ${otp}`,
            html: `<p>Your verification OTP is: <strong>${otp}</strong></p>`
        };

        // Send the email
        await transporter.sendMail(mailOptions);

        console.log('Verification OTP sent successfully');
    } catch (error) {
        console.error('Error sending verification OTP:', error);
        throw error;
    }
}



async function getCartItemCount(userId) {
    try {
        const cart = await Cart.findOne({ user: userId });
        if (!cart || cart.items.length === 0) {
            console.log('Cart not found for user:', userId); // Log if cart is not found
            return 0;
        }

        let itemCount = 0;
        cart.items.forEach(item => {
            itemCount += item.quantity;
        });
        
        console.log('Item count for user', userId, ':', itemCount); // Log the item count
        return itemCount;
    } catch (error) {
        console.error(error);
        return 0; // Return 0 in case of any error
    }
}


// Function to get the count of wishlist items
const getWishlistItemCount = async (userId) => {
    const wishlist = await Wishlist.findOne({ user: userId });
    return wishlist ? wishlist.items.length : 0;
};









