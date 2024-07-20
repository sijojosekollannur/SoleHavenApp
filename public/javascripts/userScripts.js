$(document).ready(function() {
    // Function to render the cart with updated cartItems
    function renderCart(cartItems) {
        const cartContainer = $('.cart-items');
        cartContainer.empty();
        let subtotal = 0;

        cartItems.forEach(item => {
            if (item.product) {
                subtotal += item.product.price * item.quantity;

                const cartItem = `
                    <div class="cart-item" data-id="${item.product._id}">
                        <div class="product-info">
                            <img src="${item.product.productImages && item.product.productImages.length > 0 ? item.product.productImages[0] : ''}" alt="${item.product.productName || ''}">
                            <div class="product-details">
                                <h6>${item.product.brandName || ''}</h6>
                                <h3>${item.product.productName || ''}</h3>
                                <p>₹${(item.product.price * item.quantity).toFixed(2)}</p>
                                <div class="color-options">
                                    <p>Available colors:</p>
                                    ${item.product.color.map(color => `
                                        <div class="color-option" data-color="${color}">${color}</div>
                                    `).join('')}
                                </div>
                                <div class="size-options">
                                    <p>Available sizes:</p>
                                    ${item.product.sizeInch.map(size => `
                                        <div class="size-option" data-size="${size}">${size}</div>
                                    `).join('')}
                                </div>
                            </div>
                        </div>
                        <div class="quantity-controls">
                            <input type="number" value="${item.quantity}" min="1" data-id="${item.product._id}">
                            <button class="remove-button" data-id="${item.product._id}">Remove</button>
                        </div>
                    </div>
                `;
                cartContainer.append(cartItem);
            }
        });

        const tax = subtotal * 0.1;
        const total = subtotal + tax;

        $('#subtotal').text(`₹${subtotal.toFixed(2)}`);
        $('#tax').text(`₹${tax.toFixed(2)}`);
        $('#total').text(`₹${total.toFixed(2)}`);
    }

    // Define cartItems as a global variable and initialize it as an empty array
    $(document).ready(function() {
        // Define cartItems as a global variable and initialize it as an empty array
        let cartItems = [];
        $.ajax({
            url: '/users/cart',
            method: 'GET',
            success: function(response) {
                console.log('Server response:', response); // Add this for debugging
                if (response && Array.isArray(response.cartItems)) {
                    cartItems = response.cartItems;
                    // Call renderCart function here
                } else {
                    console.error('Unexpected server response:', response);
                }
            },
            error: function(xhr, status, error) {
                console.error('Error fetching cart items:', error);
            }
        });
    });

    // Set up event delegation for remove button clicks
    $(document).on('click', '.remove-button', function() {
        const productId = $(this).data('id');
        // Make an AJAX request to delete the item from the server
        $.ajax({
            url: `/users/del-cartitem/${productId}`,
            method: 'DELETE',
            success: function(response) {
                console.log('Item deleted successfully:', response);
                // Redirect the user back to the same page
                window.location.reload();
            },
            error: function(xhr, status, error) {
                console.error('Error deleting cart item:', error);
            }
        });
    });
});
