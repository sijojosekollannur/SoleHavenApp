const paypal = require('paypal-rest-sdk');
const Checkout = require('../models/checkoutModel');
const Order = require('../models/orderModel');
const Cart = require('../models/cartModel');
const Coupon = require('../models/couponModel');
const Address =require('../models/addressModel');

paypal.configure({
    'mode': process.env.PAYPAL_MODE,
    'client_id': process.env.PAYPAL_CLIENT_ID,
    'client_secret': process.env.PAYPAL_CLIENT_SECRET
});

const payProduct = async (req, res) => {
    try {
        const { checkoutId, selectedAddress } = req.body;
        console.log('PAYPRODUCT:', req.body);
        
        const checkout = await Checkout.findById(checkoutId).populate('cartItems');
        
        if (!checkout) {
            return res.status(404).json({ error: 'Checkout not found' });
        }
        
        console.log('Checkout object:', JSON.stringify(checkout, null, 2));
        
        const originalSubtotal = checkout.cartItems.reduce((acc, item) => {
            if (item.price && item.quantity) {
                return acc + item.price * item.quantity;
            }
            return acc;
        }, 0);
        
        const discount = parseFloat(checkout.appliedCouponAmount) || 0;
        const discountRatio = discount / originalSubtotal;
        
        const items = checkout.cartItems.map(item => {
            if (item.productId && item.price && item.quantity) {
                const originalItemTotal = item.price * item.quantity;
                const itemDiscount = originalItemTotal * discountRatio;
                const adjustedItemPrice = ((originalItemTotal - itemDiscount) / item.quantity).toFixed(2);
                
                return {
                    "name": item.productName || 'Unknown',
                    "sku": item.productId.toString(),
                    "price": adjustedItemPrice,
                    "currency": "USD",
                    "quantity": item.quantity
                };
            } else {
                return null;
            }
        }).filter(item => item !== null); // Filter out any null items
        
        const calculatedSubtotal = items.reduce((acc, item) => acc + parseFloat(item.price) * item.quantity, 0).toFixed(2);
        const tax = parseFloat(checkout.tax).toFixed(2);
        const total = (parseFloat(calculatedSubtotal) + parseFloat(tax)).toFixed(2);
        
        console.log('Original Subtotal:', originalSubtotal.toFixed(2));
        console.log('Discount:', discount.toFixed(2));
        console.log('Calculated Subtotal (after discount):', calculatedSubtotal);
        console.log('Tax:', tax);
        console.log('Total:', total);
        
        const create_payment_json = {
            "intent": "sale",
            "payer": {
                "payment_method": "paypal"
            },
            "redirect_urls": {
                "return_url": `${process.env.BASE_URL}/paypal/success?checkoutId=${checkoutId}&selectedAddress=${selectedAddress}`,
                "cancel_url": `${process.env.BASE_URL}/paypal/cancel`
            },
            "transactions": [{
                "item_list": {
                    "items": items
                },
                "amount": {
                    "currency": "USD",
                    "total": total,
                    "details": {
                        "subtotal": calculatedSubtotal,
                        "tax": tax,
                        "shipping": "0.00"
                    }
                },
                "description": "Purchase from Your Store Name"
            }]
        };
        
        console.log('PayPal create_payment_json:', JSON.stringify(create_payment_json, null, 2));
        
        paypal.payment.create(create_payment_json, function (error, payment) {
            if (error) {
                console.error('PayPal payment creation error:', error);
                if (error.response && error.response.details) {
                    console.error('Error details:', JSON.stringify(error.response.details, null, 2));
                }
                return res.status(400).json({ 
                    error: 'Failed to create PayPal payment', 
                    details: error.response ? error.response.details : null 
                });
            } else {
                const approvalUrl = payment.links.find(link => link.rel === 'approval_url');
                if (approvalUrl) {
                    res.json({ approvalUrl: approvalUrl.href });
                } else {
                    res.status(500).json({ error: 'Approval URL not found in PayPal response' });
                }
            }
        });
    } catch (error) {
        console.error('Server error in payProduct:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
};

const successPage = async (req, res) => {
    const { checkoutId, paymentId, token, PayerID, selectedAddress } = req.query;
    const checkout = await Checkout.findById(checkoutId).populate('cartItems.productId');

    // Prepare product details for the order
    let productDetails = checkout.cartItems.map(cartItem => ({
        product: cartItem.productId,
        productImages: cartItem.productImages,
        productName: cartItem.productName,
        brandName: cartItem.brandName,
        color: cartItem.selectedColor,
        size: cartItem.selectedSize,
        quantity: cartItem.quantity,
        price: cartItem.price
    }));

    try {
        console.log('SUCCESS PAGE CALLED');

        if (!checkoutId) {
            return res.status(400).json({ error: 'Missing checkoutId' });
        }

        console.log('Query parameters:', req.query);

        const checkout = await Checkout.findById(checkoutId);

        if (!checkout) {
            return res.status(404).json({ error: 'Checkout not found' });
        }

        const address = await Address.findById(selectedAddress);
        if (!address) {
            return res.status(404).json({ error: 'Selected address not found' });
        }

        const existingOrder = await Order.findOne({
            user: checkout.userId,
            payerId: PayerID,
            status: 'Pending'
        });

        if (existingOrder) {
            existingOrder.status = 'Paid';
            existingOrder.paymentMethod = 'PayPal';
            existingOrder.paymentId = paymentId;
            existingOrder.paymentToken = token;
            existingOrder.orderDate = Date.now();

            await existingOrder.save();

            return res.redirect(`/users/placeorder/${existingOrder._id}`);
        }

        const execute_payment_json = {
            "payer_id": PayerID,
            "transactions": [{
                "amount": {
                    "currency": "USD",
                    "total": checkout.total.toFixed(2)
                }
            }]
        };

        const payment = await new Promise((resolve, reject) => {
            paypal.payment.execute(paymentId, execute_payment_json, function (error, payment) {
                if (error) {
                    console.error('PayPal payment execution error:', error);
                    reject(error);
                } else {
                    resolve(payment);
                }
            });
        });

        console.log('Payment executed successfully:', payment);

        const newOrder = new Order({
            user: checkout.userId,
            checkoutId: checkoutId,
            products: productDetails,
            subtotal: checkout.subtotal,
            tax: checkout.tax,
            totalAmount: checkout.total,
            address: address,
            paymentMethod: 'PayPal',
            paymentId: paymentId,
            paymentToken: token,
            payerId: PayerID,
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
            { user: checkout.userId }, // Updated this line to use checkout.userId
            { $pull: { items: { product: { $in: productIdsToRemove } } } }
        );

        console.log('Cart update result:', result);

        if (result.modifiedCount > 0) {
            console.log('Cart items removed successfully');
        } else {
            console.log('No items were removed from the cart');
        }

        res.redirect(`/users/placeorder/${newOrder._id}`);

    } catch (error) {
        console.error('Server error in successPage:', error);

        try {
            const checkout = await Checkout.findById(checkoutId);
            const address = await Address.findById(selectedAddress);

            if (!checkout || !address) {
                console.error('Checkout or address not found for pending order');
                return res.status(404).json({ error: 'Checkout or address not found' });
            }

            const pendingOrder = new Order({
                user: checkout.userId,
                checkoutId: checkoutId,
                products: productDetails,
                subtotal: checkout.subtotal,
                tax: checkout.tax,
                totalAmount: checkout.total,
                address: address,
                paymentMethod: 'PayPal',
                paymentId: paymentId,
                paymentToken: token,
                payerId: PayerID,
                status: 'Pending',
                appliedCouponAmount: checkout.appliedCouponAmount,
                coupon: checkout.coupon,
                orderDate: Date.now()
            });

            await pendingOrder.save();
            console.log('Pending order created:', pendingOrder._id);
        } catch (pendingOrderError) {
            console.error('Error creating pending order:', pendingOrderError);
        }

        res.redirect('/payment/error?message=Payment processing failed');
    }
};


const cancelPage = async (req, res) => {
    try {
        const checkoutId = req.query.checkoutId;
        // Optionally, update the checkout status or handle the cancellation
        res.redirect('/users/checkout');
    } catch (error) {
        console.error('Error in cancelPage:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = {
    payProduct,
    successPage,
    cancelPage
};