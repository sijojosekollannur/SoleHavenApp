const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Product = require('../models/productModel'); 
const Category = require('../models/categoryModel'); 
const User = require('../models/userModel'); 
const Order = require('../models/orderModel');
const Coupon = require('../models/couponModel');
const Referral = require('../models/referralModel');
const Checkout = require ('../models/checkoutModel');
const Address = require('../models/addressModel');
const { Parser } = require('json2csv'); // For CSV export
const {jsPDF} = require('jspdf'); // For PDF export
require('jspdf-autotable'); // For PDF tables
const ExcelJS = require('exceljs');
const Chart = require('chart.js/auto');
const { createCanvas } = require('canvas');
const bcrypt = require('bcrypt');
const { title } = require('process');

const generateSalesReport = async (filter) => {
    try {
        const salesData = await Order.aggregate([
            {
                $match: {
                    orderDate: { $gte: filter.startDate, $lte: filter.endDate }
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$orderDate" } },
                    totalSales: { $sum: "$totalAmount" },
                    orderCount: { $sum: 1 },
                    discountTotal: { $sum: "$products.discoundPrice" },
                    couponTotal: { $sum: "$appliedCouponAmount" }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        const report = {
            startDate: filter.startDate,
            endDate: filter.endDate,
            totalSales: salesData.reduce((sum, day) => sum + day.totalSales, 0),
            totalOrders: salesData.reduce((sum, day) => sum + day.orderCount, 0),
            totalDiscounts: salesData.reduce((sum, day) => sum + day.discountTotal, 0),
            totalCoupons: salesData.reduce((sum, day) => sum + day.couponTotal, 0),
            dailyBreakdown: salesData.map(day => ({
                date: day._id,
                sales: day.totalSales,
                orders: day.orderCount,
                discounts: day.discountTotal,
                coupons: day.couponTotal
            }))
        };

        // Calculate average order value
        report.averageOrderValue = report.totalSales / report.totalOrders || 0;

        // Calculate overall discount
        report.overallDiscount = report.totalDiscounts + report.totalCoupons;

        return report;
    } catch (error) {
        console.error('Error in generateSalesReport:', error);
        throw error;
    }
};


// MODULE EXPORTS
module.exports = {

    //Admin-Login Controller
    adminLogin: async function(req,res){
        try {
            res.render('admins/admin-login',{title:'Admin - Login',showSidebar:false});
        } catch (error) {
            console.error(err);
            res.status(500).send('Server Error'); 
        }
    },

    //Admin-Login Post Controller
    adminloginPost: async function(req, res) {
        const { username,password } = req.body;
        try {
            // Find user by username
            const user = await User.findOne({ name:username });
    
            // If user not found
            if (!user) {
                return res.status(401).render('admins/admin-login', { error: 'Invalid username or password',title:'Admin - Login',showSidebar:false});
            }
            // If user found, check if the password matches
            const passwordMatch = await bcrypt.compare(password, user.password);
    
            if (!passwordMatch) {
                return res.status(401).render('admins/admin-login', { error: 'Invalid username or password',title:'Admin - Login',showSidebar:false });
            } else if (!user.is_admin) {
                return res.status(401).render('admins/admin-login', { error: 'Sorry, You are not an admin' ,title:'Admin - Login',showSidebar:false});
            } else {
                req.session.user = user;
                return res.redirect(302, '/admin/dashboard');
            }
    
        } catch (error) {
            console.error(error);
            res.status(500).render('admins/admin-login', { error: 'Server Error',title:'Admin - Login',showSidebar:false});
        }
    },

    //Dash Board Controller
    dashboard: async function(req, res) {
        try {

            res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate"); // HTTP 1.1.
            res.setHeader("Pragma", "no-cache"); // HTTP 1.0.
            res.setHeader("Expires", "0"); 
            
            // Fetch sales data for the chart
            const salesData = await Order.aggregate([
                {
                    $group: {
                        _id: { $dateToString: { format: "%Y-%m-%d", date: "$orderDate" } },
                        totalSales: { $sum: "$totalAmount" }
                    }
                },
                { $sort: { _id: 1 } },
                { $limit: 7 }
            ]);
            
            // Fetch monthly income data
            const incomeData = await Order.aggregate([
                {
                    $group: {
                        _id: { $dateToString: { format: "%Y-%m", date: "$orderDate" } },
                        totalIncome: { $sum: "$totalAmount" }
                    }
                },
                { $sort: { _id: 1 } },
                { $limit: 6 }
            ]);
            
            // Fetch recent order details
            const orderDetails = await Order.find()
                .sort({ orderDate: -1 })
                .limit(10)
                .lean();
            
            // Prepare the response data
            const responseData = {
                salesData: {
                    labels: salesData.map(item => item._id),
                    data: salesData.map(item => item.totalSales)
                },
                incomeData: {
                    labels: incomeData.map(item => item._id),
                    data: incomeData.map(item => item.totalIncome)
                },
                orderDetails: orderDetails
            };
            
            // Send JSON response for AJAX requests
            if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                return res.json(responseData);
            }
            
            // Render the dashboard view for non-AJAX requests
            res.render('admins/dashboard', {
                title: 'Admin - Dashboard',
                showSidebar: true,
                data: responseData
            });
            
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
            if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                return res.status(500).json({ error: 'Server Error', details: error.message });
            }
            res.status(500).render('error', { error: 'Server Error', details: error.message });
        }
    },

    // Sales Report Controller
    getsalesReport: async function(req,res){
            try {
                const { reportType, startDate, endDate } = req.query;
                
                let filter = {};
                const now = new Date();
                
                if (reportType) {
                    switch (reportType) {
                        case 'daily':
                            filter.startDate = new Date(now.setHours(0, 0, 0, 0));
                            filter.endDate = new Date(now.setHours(23, 59, 59, 999));
                            break;
                        case 'weekly':
                            filter.startDate = new Date(now.setDate(now.getDate() - 7));
                            filter.endDate = new Date();
                            break;
                        case 'yearly':
                            filter.startDate = new Date(now.getFullYear(), 0, 1);
                            filter.endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
                            break;
                        case 'custom':
                            if (startDate && endDate) {
                                filter.startDate = new Date(startDate);
                                filter.endDate = new Date(endDate);
                                filter.endDate.setHours(23, 59, 59, 999);
                            } else {
                                throw new Error('Start date and end date are required for custom reports');
                            }
                            break;
                        default:
                            throw new Error('Invalid report type');
                    }
                } else {
                    throw new Error('Report type is required');
                }
                
                const salesReport = await generateSalesReport(filter);
                
                res.json(salesReport);
            } catch (error) {
                console.error('Error generating sales report:', error);
                res.status(400).json({ error: error.message || 'Error generating sales report' });
            }
    },

    // Download Report Controller
    downloadReport: async function(req,res){
        try {
            const { format, startDate, endDate } = req.query;
            const filter = {
                startDate: new Date(startDate),
                endDate: new Date(endDate)
            };

            // Adjust the end date to include the entire day
            filter.endDate.setHours(23, 59, 59, 999);
    
            const salesReport = await generateSalesReport(filter);
    
            const reportsDir = path.join(__dirname, '../public/reports');
            if (!fs.existsSync(reportsDir)) {
                fs.mkdirSync(reportsDir, { recursive: true });
            }
    
            if (format === 'pdf') {
                const doc = new jsPDF();
                
                // Add title
                doc.setFontSize(18);
                doc.text('Sales Report', 14, 20);
                
                // Add date range
                doc.setFontSize(12);
                doc.text(`From: ${startDate} To: ${endDate}`, 14, 30);
                
                // Add summary table
                doc.autoTable({
                    startY: 40,
                    head: [['Total Sales', 'Order Count', 'Total Discount', 'Avg. Order Value']],
                    body: [[
                        `₹${salesReport.totalSales.toFixed(2)}`,
                        salesReport.totalOrders,
                        `₹${salesReport.overallDiscount.toFixed(2)}`,
                        `₹${salesReport.averageOrderValue.toFixed(2)}`
                    ]],
                });
                
                // Add daily breakdown table
                doc.autoTable({
                    startY: doc.lastAutoTable.finalY + 10,
                    head: [['Date', 'Sales', 'Orders', 'Discounts', 'Coupons']],
                    body: salesReport.dailyBreakdown.map(day => [
                        day.date,
                        `₹${day.sales.toFixed(2)}`,
                        day.orders,
                        `₹${day.discounts.toFixed(2)}`,
                        `₹${day.coupons.toFixed(2)}`
                    ]),
                });
                
                // Add chart
                const canvas = createCanvas(400, 200);
                const ctx = canvas.getContext('2d');
                new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: salesReport.dailyBreakdown.map(day => day.date),
                        datasets: [{
                            label: 'Daily Sales',
                            data: salesReport.dailyBreakdown.map(day => day.sales),
                            borderColor: 'rgb(75, 192, 192)',
                            tension: 0.1
                        }]
                    },
                    options: {
                        responsive: false,
                        scales: {
                            y: {
                                beginAtZero: true
                            }
                        }
                    }
                });
                
                doc.addImage(canvas.toDataURL(), 'PNG', 10, doc.lastAutoTable.finalY + 10, 190, 100);
                
                const pdfPath = path.join(reportsDir, 'sales-report.pdf');
                doc.save(pdfPath);
                res.download(pdfPath);
            } else if (format === 'excel') {
                const workbook = new ExcelJS.Workbook();
                const worksheet = workbook.addWorksheet('Sales Report');
    
                // Add headers
                worksheet.addRow(['Date', 'Sales', 'Orders', 'Discounts', 'Coupons']);
    
                // Add data
                salesReport.dailyBreakdown.forEach(day => {
                    worksheet.addRow([day.date, day.sales, day.orders, day.discounts, day.coupons]);
                });
    
                // Add summary
                worksheet.addRow([]);
                worksheet.addRow(['Total Sales', salesReport.totalSales]);
                worksheet.addRow(['Total Orders', salesReport.totalOrders]);
                worksheet.addRow(['Total Discounts', salesReport.totalDiscounts]);
                worksheet.addRow(['Total Coupons', salesReport.totalCoupons]);
                worksheet.addRow(['Average Order Value', salesReport.averageOrderValue]);
    
                const buffer = await workbook.xlsx.writeBuffer();
                res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                res.setHeader('Content-Disposition', 'attachment; filename=sales_report.xlsx');
                res.send(buffer);
            } else {
                res.status(400).send('Invalid format');
            }
        } catch (error) {
            console.error('Error generating report:', error);
            res.status(500).send('Server Error');
        }
    },

    //Top Selling Page Controller
    topsellingPage: async function(req,res){
        try {
            const topSellingProducts = await Order.aggregate([
                { $unwind: '$products' },
                { $group: {
                    _id: '$products.product',
                    totalSold: { $sum: '$products.quantity' }
                }},
                { $sort: { totalSold: -1 } },
                { $limit: 10 },
                { $lookup: {
                    from: 'products',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'productDetails'
                }},
                { $unwind: '$productDetails' },
                { $project: {
                    name: '$productDetails.productName',
                    totalSold: 1
                }}
            ]);

            const topSellingCategories = await Product.aggregate([
                // Match products that are active (if needed)
                { $match: { isActive: true } },
            
                // Group by productCategory to calculate total sold for each category
                { $group: {
                    _id: '$productCategory',
                    totalSold: { $sum: 1 } // Counting the number of products sold
                }},
            
                // Lookup to fetch category details from the 'categories' collection
                { $lookup: {
                    from: 'categories',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'categoryDetails'
                }},
            
                // Unwind the categoryDetails array created by $lookup stage
                { $unwind: '$categoryDetails' },
            
                // Project to reshape the document and include category name and totalSold
                { $project: {
                    name: '$categoryDetails.categoryName',   // Assuming categoryName is the field name in your Category schema
                    totalSold: 1
                }},
            
                // Sort by totalSold in descending order to get top selling categories first
                { $sort: { totalSold: -1 } },
            
                // Limit the result to the top 10 categories
                { $limit: 10 }
            ]);

            const topSellingBrands = await Order.aggregate([
                { $unwind: '$products' },
                { $group: {
                    _id: '$products.brandName',
                    totalSold: { $sum: '$products.quantity' }
                }},
                { $sort: { totalSold: -1 } },
                { $limit: 10 }
            ]);

            res.render('admins/topsellingspage', { 
                title: 'Admin - Top Sellings', 
                showSidebar: true,
                topSellingProducts,
                topSellingCategories,
                topSellingBrands
            });
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    },
   


    productPage: async function(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = 5; // Number of products per page
            const skip = (page - 1) * limit;
    
            // Fetch paginated products
            const [products, totalProducts, deletedProducts] = await Promise.all([
                Product.find().populate('productCategory').skip(skip).limit(limit),
                Product.countDocuments(),
                Product.find({ isDeleted: true }).populate('productCategory') // Fetch deleted products
            ]);
    
            const totalPages = Math.ceil(totalProducts / limit);
    
            res.render('admins/products', { 
                title: 'Admin - Products', 
                products, 
                deletedProducts, // Pass deleted products to the template
                currentPage: page, 
                totalPages, 
                showSidebar: true 
            });
        } catch (error) {
            console.error(error);
            res.status(500).send('Server Error');
        }
    },
    
    

    addProductPage: async function(req, res) {
        try {
            // Fetch all categories from the database
            const categories = await Category.find({isDeleted: false}, '_id categoryName'); // Only select _id and categoryName fields
            
            // Render the "Add Products" page and pass the categories to the template
            res.render('admins/addproducts', {title:'Admin - Add-Product', categories,showSidebar:true });
        } catch (error) {
            console.error('Error fetching categories:', error);
            res.status(500).send('Error fetching categories. Please try again later.');
        }
    },

    addProductPost: async function(req, res) {
        try {
            const { productBrand, productName, productCategory, productColor, productsizeInch, productPrice,discountPrice, productStock, starRating,isFeatured,productHighlights,productSpecifications } = req.body;

            // Access the cropped images from req.files
            const croppedImages = req.files['croppedImages[]'] ? req.files['croppedImages[]'].map(file => `/images/${file.filename}`) : [];
    
            const productSizeInchArray = productsizeInch.split(',').map(Number);
            const productColorArray = productColor.split(',').map(String);
            const productHighlightsArray = productHighlights.split(',').map(String);
            
              // Parse specifications string into a JavaScript object
              const specificationsArray = productSpecifications.split(',').map(pair => {
              const [key, value] = pair.split(':');
              return { [key.trim()]: value.trim() };
              });
              const specifications = Object.assign({}, ...specificationsArray);
    
            const newProduct = new Product({
                brandName: productBrand,
                productName: productName,
                productCategory: productCategory,
                color: productColorArray,
                sizeInch: productSizeInchArray,
                price: productPrice,
                discountPrice: discountPrice,
                stock: productStock,
                starRating: parseFloat(starRating),
                isFeatured: isFeatured,
                highlights: productHighlightsArray,
                specifications: specifications,
                productImages: croppedImages
            });
    
            await newProduct.save();

            res.json({ success: true, message: 'Product added successfully' });
        } catch (error) {
            console.error('Error adding product:', error);
            res.status(500).json({ success: false, message: 'Error adding product. Please try again later.' });
        }
    },
    
    //Admin Delete Product Controller
    deleteProduct: async function(req,res){
        try {
            await Product.findByIdAndUpdate(req.params.id,{ isDeleted: true });
            res.redirect('/admin/products');
        } catch (error) {
            console.error(error);
            res.status(500).send('Server Error');   
        }
    },

    //Admin Restore Product Controller
    restoreProduct: async function(req,res){
        try {
            await Product.findByIdAndUpdate(req.params.id, { isDeleted: false });
            res.redirect('/admin/products');
        } catch (error) {
            console.error(error);
            res.status(500).send('Server Error'); 
        }
    },

    //Product Details Page Controller
    productdetailsPage: async function(req,res){
        try {
            const productId = req.params.id;
           const product = await Product.findById(productId).populate('productCategory');
            const categories = await Category.find({ isDeleted: false }); // Filtering categories where isDeleted is true
            res.render('admins/productdetails', { title: 'Admin - Product-Details', product, categories, showSidebar: true });
        } catch (error) {
            console.error(error);
            res.status(500).send('Server Error'); 
        }
    },
    
    //Admin Edit Product Page Controller
    editProductPage: async function(req, res) {
        try {
            const productId = req.params.id;
            const product = await Product.findById(productId).populate('productCategory');
            const categories = await Category.find({ isDeleted: false });
            res.render('admins/editproducts',{title:'Admin - Edit-Product',product,categories,showSidebar:true});
        } catch (error) {
            console.error(error);
            res.status(500).send('Server Error');  
        } 
    },


    //Admin Edit Product Post Controller
    editproductPost: async function(req, res) {
        try {
            const productId = req.params.id;
            const {
                productName,
                productBrand,
                productCategory,
                productColor,
                productsizeInch,
                productPrice,
                discountPrice,
                productStock,
                starRating,
                isFeatured,
                isActive,
                removedImages
            } = req.body;
    
            let product = await Product.findById(productId);
    
            // Remove images based on the removedImages array
            const removedImagesArray = JSON.parse(removedImages);
            product.productImages = product.productImages.filter((image, index) => !removedImagesArray.includes(index.toString()));
    
            // Add new images
            const newImages = req.files.map(file =>`/images/${file.filename}` ); // Adjust as per your storage strategy
            product.productImages.push(...newImages);
    
            // Ensure the total count of images does not exceed 9
            if (product.productImages.length > 9) {
                return res.status(400).send('Total number of images cannot exceed 9');
            }
    
            // Parse sizeInch as an array of numbers
            const parsedSizeInch = productsizeInch.split(',').map(size => parseFloat(size.trim()));
    
            // Update other product fields
            product.productName = productName;
            product.brandName = productBrand;
            product.category = productCategory;
            product.color = productColor;
            product.sizeInch = parsedSizeInch; // Update sizeInch
            product.price = productPrice;
            product.discountPrice = discountPrice;
            product.stock = productStock;
            product.starRating = starRating;
            product.isFeatured = isFeatured === 'true';
            product.isActive = isActive === 'true';
    
            await product.save();
            res.redirect('/admin/products'); // Adjust the redirect as necessary
        } catch (error) {
            console.error(error);
            res.status(500).send('Internal Server Error');
        } 
    },
      


    //Admin Product Search Controller
    productSearch: async function(req, res) {
        try {
            const query = req.query.q;
            const page = parseInt(req.query.page) || 1;
            const limit = 5; // Number of products per page
            const skip = (page - 1) * limit;
    
            const regexQuery = new RegExp(query, 'i');
            const searchCriteria = [
                { productName: regexQuery },
                { brandName: regexQuery },
            ];
    
            if (!isNaN(query)) {
                searchCriteria.push({ price: parseFloat(query) });
            }
    
            const categoryResults = await Category.find({ categoryName: regexQuery });
            if (categoryResults.length > 0) {
                const categoryIds = categoryResults.map(category => category._id);
                searchCriteria.push({ productCategory: { $in: categoryIds } });
            }
    
            const [products, totalProducts] = await Promise.all([
                Product.find({ $or: searchCriteria }).populate('productCategory').skip(skip).limit(limit),
                Product.countDocuments({ $or: searchCriteria })
            ]);
    
            const totalPages = Math.ceil(totalProducts / limit);
    
            res.json({ products, currentPage: page, totalPages });
        } catch (error) {
            console.error('Error:', error.message);
            res.status(500).send('Internal Server Error');
        }
    },
    
    //Admin Category Page Controller
    categoryPage: async function(req, res) {
        try {
            const categories = await Category.find();
            res.render('admins/categories',{title:'Admin - Category',categories,showSidebar:true});
        } catch (error) {
            console.error(error);
            res.status(500).send('Server Error');  
        }
    },

    //Admin Add Category Page Controller
    addcategoryPage: async function (req,res){
        try {
            const categories = await Category.find();
            res.render('admins/addcategorypage',{title:'Admin - Add-Category',categories,showSidebar:true});
        } catch (error) {
            console.error(error);
            res.status(500).send('Server Error');  
        }
    },

    // Admin Add Category Post Controller
    addcategoryPost: async function(req, res) {
    try {
        // Extract categoryName and isActive from request body
        const { categoryName, isActive } = req.body;

        // Check if categoryName is defined and is a string
        if (!categoryName || typeof categoryName !== 'string' || categoryName.trim().length === 0) {
            return res.status(400).send({ error: 'Category name is required and should be a non-empty string.' });
        }

        // Validate the categoryName length
        if (categoryName.trim().length > 100) {
            return res.status(400).send({ error: 'Category name exceeds maximum length.' });
        }

        // Create a new category object
        const category = new Category({
            categoryName: categoryName.trim(),
            isActive: isActive || true // Set isActive to true if not provided
        });

        // Save the category to the database
        await category.save();
        res.redirect('/admin/categories'); // Send a success response with the created category
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
   },

   //Edit Category Page Controller
   editcategoryPage: async function(req,res){
    try {
        // Get the category ID from the request parameters
        const categoryId = req.params.id;

        // Find the category by ID
        const category = await Category.findById(categoryId);

        // Check if category exists
        if (!category) {
            return res.status(404).send({ error: 'Category not found' });
        }

        // Render the edit category page with the category data
        res.render('admins/editcategorypage', {title:'Admin - Edit-Category' ,category,showSidebar:true });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
   },

   //Update Category Controller
   editcategoryPost: async function(req,res){
    try {
        // Get the category ID from the request parameters
        const categoryId = req.params.id;

        // Extract categoryName and isActive from request body
        const { categoryName, isActive } = req.body;

        // Find the category by ID
        const category = await Category.findById(categoryId);

        // Check if category exists
        if (!category) {
            return res.status(404).send({ error: 'Category not found' });
        }

        // Update the category with the new data
        category.categoryName = categoryName;
        category.isActive = isActive;

        // Save the updated category to the database
        await category.save();

        // Redirect to the category details page or any other appropriate page
        res.redirect('/admin/categories');
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
   },

   // Delete Category Controller
   deleteCategory: async function(req,res){
    try {
        await Category.findByIdAndUpdate(req.params.id,{ isDeleted: true })

        res.redirect('/admin/categories');
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');   
    }
   },

   //Restore Category Controller
   restoreCategory: async function(req,res){
    try {
        await Category.findByIdAndUpdate(req.params.id, { isDeleted: false });
        res.redirect('/admin/categories');
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');  
    }
   },

    // Order Page Controller
    orderPage: async function(req, res) {
        try {
            let orders = await Order.find().populate('user').populate('address').populate('products.product');
            // Filter out cancelled orders
            orders = orders.filter(order => order.orderStatus !== 'Cancelled'); 
            res.render('admins/orders',{title:'Admin - Orders',showSidebar:true,orders});  
        } catch (error) {
            console.error(error);
            res.status(500).send('Server Error');  
        }
    },

    // Order Status Change Controller
    orderPatch: async function(req,res){
        try {
            const order = await Order.findById(req.params.id);
            if (!order) return res.status(404).json({ message: 'Order not found' });
        
            order.orderStatus = req.body.orderStatus;
            await order.save();
            res.redirect('/admin/orders')
        } catch (error) {
            console.error(error);
            res.status(500).send('Server Error');   
        }
    },


    //Order Delete Controller
    orderDelete: async function(req,res){
        try {
            console.log('Admin Order Delate Called'); 
            const orderId = req.params.id;
            console.log(orderId)
            // Validate the order ID
            if (!mongoose.Types.ObjectId.isValid(orderId)) {
                return res.status(400).send('Invalid order ID');
            }
    
            // Find the order by ID and delete it
            const order = await Order.findByIdAndDelete(orderId);
            if (!order) {
            return res.status(404).send('Order not found');
            }

            res.redirect('/admin/orders');
        } catch (error) {
            console.error(error);
            res.status(500).send('Server error');
        }
    },

    // View Orders Controller
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
      
            res.render('admins/vieworders', {title:'View Order Page', order,showSidebar:true }); // Adjust the view name as needed
          } catch (error) {
            console.error('Error in viewOrders:', error);
            res.status(500).send('An error occurred while fetching the order details');
          }
    },


    // Coupon Page Controller
    couponPage: async function(req, res) {
        try {
            const perPage = 4; // Number of coupons per page
            const currentPage = req.query.page ? parseInt(req.query.page) : 1;
    
            const totalCoupons = await Coupon.countDocuments(); // Get total number of coupons
            const totalPages = Math.ceil(totalCoupons / perPage);
    
            const coupons = await Coupon.find()
                .skip((currentPage - 1) * perPage)
                .limit(perPage);
    
            res.render('admins/coupons', {
                title: 'Admin - CouponsPage',
                showSidebar: true,
                coupons,
                currentPage,
                totalPages
            });
        } catch (error) {
            console.error(error);
            res.status(500).send('Server Error');
        }
    },

    // Add Coupon Page Controller
    addcouponPage: async function(req,res){
        try {
            res.render('admins/addcoupons',{title:'Admin - Add-Coupons',showSidebar:true});
        } catch (error) {
            console.error(error);
            res.status(500).send('Server Error');  
        }
    },

    // Add Coupon Post Controller
    addcouponPost: async function(req,res){
        const { code, discountPercentage, validFrom, validUntil, usageLimit,status } = req.body;
    
        try {
            const coupon = new Coupon({
                code,
                discountPercentage,
                validFrom: new Date(validFrom),
                validUntil: new Date(validUntil),
                usageLimit,
                status
            });
            
            await coupon.save();
            res.redirect('/admin/coupons'); // Redirect to the list of coupons or another appropriate page
        } catch (error) {
            console.error(error);
            res.status(500).send('Server Error');
        }
    },

    // Coupon Update Controller
    couponUpdate: async function(req,res){
        const couponId = req.params.id;
        const { status } = req.body;

    try {
        const coupon = await Coupon.findById(couponId);

        if (!coupon) {
            return res.status(404).send('Coupon not found');
        }

        // Update status only if it's not expired or used
        if (status !== 'expired' && coupon.status !== 'expired' && coupon.status !== 'used') {
            coupon.status = status;
        }

        await coupon.save();

        res.redirect('/admin/coupons'); // Redirect to the coupon list or another appropriate page
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
    },


    // Coupon Delete Controller
    couponDelete: async function(req,res){
        const couponId = req.params.id;

        try {
            const coupon = await Coupon.findByIdAndDelete(couponId);
    
            if (!coupon) {
                return res.status(404).json({ message: 'Coupon not found' });
            }
    
            res.status(200).json({ message: 'Coupon deleted successfully' });
        } catch (error) {
            console.error('Error deleting coupon:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },
     
    // Customer Page Controller
    customerPage: async function(req, res) {
        try {
            const perPage = 5; // Number of customers per page
            const page = parseInt(req.query.page) || 1; // Current page number
    
            // Fetch the total count of users (excluding admins)
            const totalUsers = await User.countDocuments({ is_admin: false });
    
            // Fetch the users for the current page
            const users = await User.find({ is_admin: false })
                .skip((perPage * page) - perPage)
                .limit(perPage);
    
            const totalPages = Math.ceil(totalUsers / perPage);
    
            res.render('admins/customers', {
                title: 'Admin - Customers',
                showSidebar: true,
                users: users, // Pass users to the view
                currentPage: page,
                totalPages: totalPages
            });
        } catch (error) {
            console.error('Error fetching users:', error);
            res.status(500).send('Server Error');
        }
    },
    

    // Block Customer Controller
    blockCustomer: async function(req,res){
        try {
            await User.findByIdAndUpdate(req.params.id, { is_blocked: true });
            res.redirect('/admin/customers');
        } catch (error) {
            console.error('Error blocking user:', error);
            res.status(500).send('Server Error');
        }
    },

    // Unblock Customer Controller
    unblockCustomer: async function(req,res){
        try {
            await User.findByIdAndUpdate(req.params.id, { is_blocked: false });
            res.redirect('/admin/customers');
        } catch (error) {
            console.error('Error unblocking user:', error);
            res.status(500).send('Server Error');
        }
    },

    // Customer Search Controller
    customerSearch: async function(req, res){
        try {
            const query = req.query.q;
            const regexQuery = new RegExp(query, 'i');
            const perPage = 5; // Number of customers per page
            const page = parseInt(req.query.page) || 1; // Current page number
       
            // Define the search criteria
            const searchCriteria = [
                { name: regexQuery },
                { email: regexQuery },
                { mobilenumber: regexQuery },
            ];
       
            // Perform the search
            const totalUsers = await User.countDocuments({
                $or: searchCriteria,
                is_admin: false // Exclude admin users
            });
    
            const users = await User.find({
                $or: searchCriteria,
                is_admin: false
            })
            .skip((perPage * page) - perPage)
            .limit(perPage);
       
            res.json({
                users: users,
                totalPages: Math.ceil(totalUsers / perPage),
                currentPage: page
            }); // Return search results as JSON data
        } catch (error) {
            console.error('Error:', error.message);
            res.status(500).send('Internal Server Error');
        }
    },
    

    bannerPage: function(req, res) {
        res.render('admins/banners',{title:'Admin - Add-Banners',showSidebar:true});
    },

    offerPage: async function(req, res) {
        try {
            // Fetch offers for products
            const productsOffers = await Product.find({ 'offers': { $exists: true, $ne: [] } }).populate('productCategory');

            // Fetch offers for categories
            const categoryOffers = await Category.find({ 'offers': { $exists: true, $ne: [] }, isDeleted: false });

             // Fetch referral data
            const referralData = await User.aggregate([
            {
                $unwind: '$referralOffers'
            },
            {
                $group: {
                    _id: '$_id',
                    referrerName: { $first: '$name' },
                    referralCode: { $first: '$referralCode' },
                    referralCount: { $sum: 1 },
                    referralOffers: { $push: '$referralOffers' }
                }
            },
            {
                $unwind: '$referralOffers'
            },
            {
                $project: {
                    _id: 1,
                    referrerName: 1,
                    referralCode: 1,
                    referralCount: 1,
                    discount: '$referralOffers.discount',
                    validFor: {
                        $divide: [{ $subtract: ['$referralOffers.endDate', '$referralOffers.startDate'] }, 1000 * 60 * 60 * 24]
                    }
                }
            }
        ]);


            res.render('admins/offers', {
                title: 'Manage Offers',
                showSidebar: true,
                productsOffers,
                categoryOffers,
                referralData
            });
        } catch (error) {
            console.error('Error fetching offers:', error);
            res.status(500).send('Error fetching offers');
        }
    },

    //Add Offers Page Controller
    addoffersPage: async function(req,res){
        try {
            const products = await Product.find().populate('productCategory'); // Fetch all products
            const categories = await Category.find(); // Fetch all categories

             // Fetch users who have made referrals
             const referrers = await User.aggregate([
            {
                $lookup: {
                    from: 'referrals',
                    localField: '_id',
                    foreignField: 'referrer',
                    as: 'referrals'
                }
            },
            {
                $match: {
                    'referrals.0': { $exists: true } // Only users who have made referrals
                }
            },
            {
                $project: {
                    _id: 1,
                    name: 1,
                    referralCode: 1,
                    referralCount: { $size: '$referrals' }
                }
            }
        ]);
            
            res.render('admins/addoffers', {
                title: 'Admin - Add-Offers',
                showSidebar: true,
                products: products, // Pass products to the view
                categories: categories, // Pass categories to the view
                referrers: referrers
            });
        } catch (error) {
            console.error('Error fetching products or categories:', error);
            res.status(500).send('Error fetching products or categories');
        }
    },

    // Add product Offer Controller
    addproductOffer: async function(req,res){
        try {
            const { productId, discount, startDate, endDate } = req.body;
        
            const product = await Product.findById(productId);
            if (!product) {
              return res.status(404).send('Product not found');
            }
        
            product.offers.push({ discount, startDate, endDate });
            await product.save();
        
            res.status(200).send('Product Offer Added Successfully');
          } catch (error) {
            console.error('Error adding product offer:', error);
            res.status(500).send('Error adding product offer');
          }
    },

    // Add Category Offer Controller
    addcategoryOffer: async function(req,res){
        try {
            const { categoryId, discount, startDate, endDate } = req.body;
        
            const category = await Category.findById(categoryId);
            if (!category) {
              return res.status(404).send('Category not found');
            }
        
            category.offers.push({ discount, startDate, endDate });
            await category.save();
        
            res.status(200).send('Category Offer Added Successfully');
          } catch (error) {
            console.error('Error adding category offer:', error);
            res.status(500).send('Error adding category offer');
          }
    },

    // Add Referral Offer Controller
    addreferralOffer: async function(req,res){
        try {
            const { referrerId, discount, validFor } = req.body;
    
            // Validate input
            if (!referrerId || !discount || !validFor) {
                return res.status(400).json({ error: 'Missing required fields' });
            }
    
            // Find the user (referrer)
            const user = await User.findById(referrerId);
            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }
    
            // Create a new referral offer
            const newOffer = {
                discount: discount,
                startDate: new Date(), // Start date is now
                endDate: new Date(Date.now() + validFor * 24 * 60 * 60 * 1000) // End date is 'validFor' days from now
            };
    
            // Add the new offer to the user's referralOffers array
            user.referralOffers = user.referralOffers || [];
            user.referralOffers.push(newOffer);
    
            // Save the user with the new offer
            await user.save();
    
            res.status(200).json({ success: true, message: 'Referral Offer Added Successfully', offer: newOffer });
        } catch (error) {
            console.error('Error adding referral offer:', error);
            res.status(500).json({ success: false, error: 'Error adding referral offer' });
        }
    },

    // Admin Logout Controller
    logoutAdmin: async function(req,res){
        // Perform logout actions here, such as clearing session
        req.session.destroy(function(err) {
         if(err) {
             console.error(err);
             res.status(500).send('Error logging out');
         } else {
             // Redirect the user to a desired page after logout
             res.redirect('/admin/admin-login');
         }
     });
     },


    // Default Handler for undefined routes
    defaultHandler: function(req, res) {
        res.status(404).send('404 - Not Found');
    }
};



