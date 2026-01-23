// Stripe configuration - REGENERATE YOUR KEY!
const stripe = Stripe('pk_live_51S61rl3R6cTsuNivU8clI9Vjkc0Y901cm3xTTHA4BKRXTkNzxYZ717vvcNLuJiKTOjTC0nGUv7RafWPi2a0ZhNvi00GweHVKDW'); // REGENERATE THIS!

// API Configuration
const API_URL = "https://everlasting-landing-page-backend.onrender.com";

// Global variables
let currentTotal = 22;
let currentFreeItems = 0;
let currentProductName = "T-Shirt";
let currentProductType = "tshirt";

// Dynamic Pricing Calculator
function calcPrice() {
    const qty = parseInt(document.getElementById('qty').value) || 0;
    const product = document.getElementById('product').value;
    const size = document.getElementById('size').value;
    let price = 0;
    let freeItems = 0;
    
    currentProductType = product;
    
    // Size premium
    let sizePremium = 0;
    if (size === '2XL' || size === '3XL') sizePremium = 2;
    if (size === '4XL' || size === '5XL') sizePremium = 4;
    
    // Product pricing based on quantity
    if (product === 'tshirt') {
        if (qty >= 50) { 
            price = 16; 
            freeItems = Math.floor(qty / 50) * 3; 
        } else if (qty >= 24) { 
            price = 18; 
            freeItems = Math.floor(qty / 24) * 2; 
        } else if (qty >= 12) { 
            price = 20; 
            freeItems = Math.floor(qty / 12); 
        } else { 
            price = 22; 
            freeItems = 0; 
        }
        currentProductName = "Custom T-Shirt";
    } else if (product === 'hoodie') {
        if (qty >= 50) { 
            price = 30; 
            freeItems = Math.floor(qty / 50) * 3; 
        } else if (qty >= 24) { 
            price = 35; 
            freeItems = Math.floor(qty / 24) * 2; 
        } else { 
            price = 40; 
            freeItems = Math.floor(qty / 12); 
        }
        currentProductName = "Custom Hoodie";
    } else if (product === 'sweatshirt') {
        if (qty >= 50) { 
            price = 25; 
            freeItems = Math.floor(qty / 50) * 3; 
        } else if (qty >= 24) { 
            price = 30; 
            freeItems = Math.floor(qty / 24) * 2; 
        } else { 
            price = 35; 
            freeItems = Math.floor(qty / 12); 
        }
        currentProductName = "Custom Sweatshirt";
    } else if (product === 'polo') {
        if (qty >= 50) { 
            price = 25; 
            freeItems = Math.floor(qty / 50) * 3; 
        } else if (qty >= 24) { 
            price = 30; 
            freeItems = Math.floor(qty / 24) * 2; 
        } else { 
            price = 35; 
            freeItems = Math.floor(qty / 12); 
        }
        currentProductName = "Custom Polo Shirt";
    } else if (product === 'mug') {
        // For mugs, we'll need custom quote
        price = 0;
        freeItems = 0;
        currentProductName = "Custom Mug";
    }

    const total = (qty * price) + (qty * sizePremium);
    currentTotal = total;
    currentFreeItems = freeItems;
    
    // Update display
    const totalElement = document.getElementById('total');
    if (totalElement) {
        totalElement.innerText = `Total: $${total} | Free Items: ${freeItems}`;
    }
    
    // Update free items text
    const freeItemsText = document.getElementById('freeItemsText');
    if (freeItemsText) {
        if (freeItems > 0) {
            const itemType = product === 'mug' ? 'mug(s)' : 'item(s)';
            freeItemsText.innerText = `🎁 FREE ITEMS: You get ${freeItems} free ${itemType}!`;
            freeItemsText.style.color = '#008000';
        } else {
            const itemsNeeded = product === 'tshirt' ? 12 : 24;
            freeItemsText.innerText = `🎁 FREE ITEMS: Add ${itemsNeeded - qty} more items to get your first free item!`;
            freeItemsText.style.color = '#FF6600';
        }
    }
    
    // For Stripe, convert dollars to cents and store
    const priceInCents = Math.round(total * 100);
    const stripePriceInput = document.getElementById('stripePrice');
    const productNameInput = document.getElementById('productName');
    
    if (stripePriceInput) stripePriceInput.value = priceInCents;
    if (productNameInput) productNameInput.value = currentProductName;
    
    return { total, freeItems, priceInCents };
}

// TEST BACKEND CONNECTION
async function testBackendConnection() {
    console.log('🔍 Testing backend connection...');
    
    // Test both possible endpoints
    const endpoints = [
        '/api/create-checkout-session',  // Most likely
        '/create-checkout-session',      // Alternative
        '/api/checkout',
        '/checkout',
        '/health',                       // Common health check
        '/'                              // Root endpoint
    ];
    
    const testData = { test: true, amount: 1000, timestamp: new Date().toISOString() };
    
    for (const endpoint of endpoints) {
        try {
            const startTime = Date.now();
            const response = await fetch(`${API_URL}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(testData)
            });
            const timeTaken = Date.now() - startTime;
            
            if (response.ok) {
                const data = await response.json().catch(() => ({}));
                console.log(`✅ ${endpoint}: ${response.status} (${timeTaken}ms)`, data);
                return endpoint; // Found working endpoint
            } else {
                console.log(`❌ ${endpoint}: ${response.status} ${response.statusText} (${timeTaken}ms)`);
            }
        } catch (error) {
            console.log(`❌ ${endpoint}: ERROR - ${error.message}`);
        }
    }
    
    console.log('❌ No working endpoints found. Check backend URL and CORS.');
    return null;
}

// Stripe Payment Function
async function initiateStripePayment() {
    // Get form data
    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const address = document.getElementById('address').value.trim();
    const product = document.getElementById('product').value;
    const size = document.getElementById('size').value;
    const quantity = document.getElementById('qty').value;
    const colorElement = document.querySelector('input[name="color"]:checked');
    const color = colorElement ? colorElement.value : 'Not selected';
    
    // Validate form
    if (!name || !email || !phone || !address) {
        showError('Please fill in all required fields.');
        return;
    }
    
    if (!colorElement) {
        showError('Please select a color for your product.');
        return;
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showError('Please enter a valid email address.');
        return;
    }
    
    // Validate phone number (basic validation)
    const phoneRegex = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/;
    if (!phoneRegex.test(phone.replace(/\D/g, ''))) {
        showError('Please enter a valid phone number.');
        return;
    }
    
    // Calculate current price
    const priceData = calcPrice();
    
    if (priceData.total <= 0 && product === 'mug') {
        alert('For custom mug orders, please contact us directly at 240-940-8778 for a quote.');
        window.location.href = 'https://wa.me/12409408778';
        return;
    }
    
    if (priceData.total <= 0) {
        showError('Please select a valid product and quantity.');
        return;
    }
    
    // For very large orders, suggest contacting first
    if (parseInt(quantity) > 100) {
        const confirmLargeOrder = confirm(`You're ordering ${quantity} items. For orders over 100 items, we recommend contacting us first to ensure availability and discuss special pricing. Continue with payment?`);
        if (!confirmLargeOrder) {
            window.location.href = 'https://wa.me/12409408778';
            return;
        }
    }
    
    // Show loading
    const loadingElement = document.getElementById('loading');
    const payBtn = document.querySelector('.pay-btn');
    if (loadingElement) loadingElement.style.display = 'block';
    if (payBtn) {
        payBtn.disabled = true;
        payBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    }
    
    // Hide any previous errors
    hideError();
    
    try {
        // Create order data
        const orderData = {
            name,
            email,
            phone,
            address,
            product: currentProductName,
            size,
            quantity,
            color,
            price: priceData.total,
            freeItems: priceData.freeItems,
            priceInCents: priceData.priceInCents,
            timestamp: new Date().toISOString()
        };
        
        // Save order data to localStorage for backup
        localStorage.setItem('pendingOrder', JSON.stringify(orderData));
        
        // TEST FIRST: Try to find working endpoint
        const workingEndpoint = await testBackendConnection();
        
        if (!workingEndpoint) {
            throw new Error('Cannot connect to payment server. Please try again later or contact us.');
        }
        
        console.log('Using endpoint:', workingEndpoint);
        
        // Create checkout session with working endpoint
        const response = await fetch(`${API_URL}${workingEndpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(orderData)
        });
        
        console.log('Response status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Server response:', errorText);
            throw new Error(`Server error: ${response.status} - ${errorText}`);
        }
        
        const session = await response.json();
        
        if (!session.id) {
            throw new Error('Invalid response from payment server');
        }
        
        // Redirect to Stripe Checkout
        const result = await stripe.redirectToCheckout({
            sessionId: session.id
        });
        
        if (result.error) {
            throw new Error(result.error.message);
        }
        
    } catch (error) {
        console.error('Payment Error:', error);
        
        // Show detailed error for debugging
        const debugInfo = `
Payment Error Details:
${error.message}

Backend URL: ${API_URL}
Stripe Key: ${stripe._apiKey ? 'Loaded' : 'Not loaded'}
Time: ${new Date().toLocaleTimeString()}
        `;
        console.log(debugInfo);
        
        // Try alternative endpoint as fallback
        const tryAltEndpoint = confirm(`Payment Error: ${error.message}\n\nWould you like to try an alternative payment method?`);
        
        if (tryAltEndpoint) {
            // Use Stripe directly without backend
            tryDirectStripePayment({
                name,
                email,
                phone,
                address,
                product: currentProductName,
                size,
                quantity,
                color,
                price: priceData.total,
                priceInCents: priceData.priceInCents
            });
        } else {
            // Show error to user
            showError(`Payment Error: ${error.message}. Please try again or contact us at 240-940-8778.`);
        }
        
    } finally {
        // Reset button state
        if (loadingElement) loadingElement.style.display = 'none';
        if (payBtn) {
            payBtn.disabled = false;
            payBtn.innerHTML = '<i class="fas fa-lock"></i> Proceed to Secure Payment';
        }
    }
}

// Alternative: Direct Stripe Checkout Link (Fallback)
async function tryDirectStripePayment(orderData) {
    // Create a Stripe Checkout link manually
    const successUrl = `${window.location.origin}/success.html?order=${encodeURIComponent(JSON.stringify(orderData))}`;
    const cancelUrl = window.location.href;
    
    // Open manual payment instructions
    const manualPaymentHTML = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Complete Your Payment</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; background: #f5f5f5; }
                .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                h1 { color: #001F3F; }
                .details { background: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0; }
                .payment-methods { margin-top: 30px; }
                .method { background: #e8f4ff; padding: 15px; border-radius: 5px; margin: 10px 0; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>Complete Your Order</h1>
                <div class="details">
                    <h3>Order Details:</h3>
                    <p><strong>Product:</strong> ${orderData.product}</p>
                    <p><strong>Size:</strong> ${orderData.size}</p>
                    <p><strong>Color:</strong> ${orderData.color}</p>
                    <p><strong>Quantity:</strong> ${orderData.quantity}</p>
                    <p><strong>Total:</strong> $${orderData.price}</p>
                </div>
                
                <div class="payment-methods">
                    <h3>Payment Options:</h3>
                    
                    <div class="method">
                        <h4>Option 1: Credit/Debit Card</h4>
                        <p>Please visit: <a href="https://buy.stripe.com/test_14k9D37p8dxR2mM5kk" target="_blank">Stripe Checkout Page</a></p>
                    </div>
                    
                    <div class="method">
                        <h4>Option 2: Contact Us Directly</h4>
                        <p>Call or WhatsApp: <a href="tel:2409408778">(240) 940-8778</a></p>
                        <p>WhatsApp: <a href="https://wa.me/12409408778" target="_blank">Chat Now</a></p>
                    </div>
                    
                    <div class="method">
                        <h4>Option 3: Alternative Payments</h4>
                        <p>Zelle: 240-940-8778</p>
                        <p>Cash App: $EverlastingPrint</p>
                        <p>Venmo: @EverlastingPrint</p>
                    </div>
                </div>
                
                <button onclick="window.history.back()" style="padding: 10px 20px; background: #001F3F; color: white; border: none; border-radius: 5px; cursor: pointer;">
                    Back to Order Form
                </button>
            </div>
        </body>
        </html>
    `;
    
    const paymentWindow = window.open('', '_blank');
    paymentWindow.document.write(manualPaymentHTML);
    paymentWindow.document.close();
}

// Show error message
function showError(message) {
    const errorElement = document.getElementById('payment-error');
    const errorMessage = document.getElementById('error-message');
    
    if (errorElement && errorMessage) {
        errorMessage.textContent = message;
        errorElement.style.display = 'block';
        
        // Scroll to error
        errorElement.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
        });
        
        // Auto-hide error after 10 seconds
        setTimeout(() => {
            errorElement.style.display = 'none';
        }, 10000);
    } else {
        alert(message);
    }
}

// Hide error message
function hideError() {
    const errorElement = document.getElementById('payment-error');
    if (errorElement) {
        errorElement.style.display = 'none';
    }
}

// Close offer popup
function closeOffer() {
    const popup = document.getElementById('offer-popup');
    if (popup) {
        popup.style.opacity = '0';
        popup.style.transform = 'translateX(100px) scale(0.95)';
        setTimeout(() => {
            popup.style.display = 'none';
        }, 300);
        
        // Save to localStorage so it doesn't show again for 24 hours
        localStorage.setItem('offerClosed', Date.now());
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Initialize price calculator
    calcPrice();
    
    // Add test connection button for debugging (optional)
    const debugBtn = document.createElement('button');
    debugBtn.textContent = '🔧 Test Payment Connection';
    debugBtn.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        z-index: 10000;
        background: #FF6600;
        color: white;
        border: none;
        padding: 8px 15px;
        border-radius: 5px;
        font-size: 12px;
        cursor: pointer;
        display: none; /* Hidden by default */
    `;
    debugBtn.onclick = testBackendConnection;
    document.body.appendChild(debugBtn);
    
    // Show debug button on Shift+Ctrl+D
    document.addEventListener('keydown', (e) => {
        if (e.shiftKey && e.ctrlKey && e.key === 'D') {
            debugBtn.style.display = debugBtn.style.display === 'none' ? 'block' : 'none';
        }
    });
    
    // Check if offer was recently closed
    const lastClosed = localStorage.getItem('offerClosed');
    const offerPopup = document.getElementById('offer-popup');
    
    if (offerPopup && lastClosed) {
        const hoursSinceClose = (Date.now() - lastClosed) / (1000 * 60 * 60);
        if (hoursSinceClose < 24) {
            offerPopup.style.display = 'none';
        } else {
            // Auto-hide after 30 seconds
            setTimeout(() => {
                if (offerPopup.style.display !== 'none') {
                    closeOffer();
                }
            }, 30000);
        }
    } else if (offerPopup) {
        // Auto-hide after 30 seconds if first time
        setTimeout(() => {
            if (offerPopup.style.display !== 'none') {
                closeOffer();
            }
        }, 30000);
    }
    
    // Carousel setup
    const track = document.querySelector('.carousel-track');
    const cards = document.querySelectorAll('.review-card:not(.duplicate)');
    const dotsContainer = document.getElementById('carousel-dots');
    
    // Create navigation dots
    if (cards.length > 0 && dotsContainer) {
        cards.forEach((_, index) => {
            const dot = document.createElement('div');
            dot.className = 'dot';
            if (index === 0) dot.classList.add('active');
            dot.addEventListener('click', () => {
                const cardWidth = document.querySelector('.review-card').offsetWidth + 25;
                track.style.transform = `translateX(-${index * cardWidth}px)`;
                document.querySelectorAll('.dot').forEach((d, i) => {
                    d.classList.toggle('active', i === index);
                });
            });
            dotsContainer.appendChild(dot);
        });
        
        // Pause carousel on hover
        const carousel = document.querySelector('.reviews-carousel');
        if (carousel) {
            carousel.addEventListener('mouseenter', () => {
                track.style.animationPlayState = 'paused';
            });
            carousel.addEventListener('mouseleave', () => {
                track.style.animationPlayState = 'running';
            });
        }
    }
    
    // Form validation on input
    const orderForm = document.getElementById('orderForm');
    if (orderForm) {
        orderForm.addEventListener('input', function() {
            hideError();
        });
    }
    
    // Color selection enhancement
    document.querySelectorAll('.color-option').forEach(option => {
        option.addEventListener('click', function() {
            // Remove scale from all options
            document.querySelectorAll('.color-option').forEach(opt => {
                opt.style.transform = 'scale(1)';
            });
            // Add scale to selected option
            this.style.transform = 'scale(1.05)';
        });
    });
    
    // Auto-select first color if none selected
    setTimeout(() => {
        const selectedColor = document.querySelector('input[name="color"]:checked');
        if (!selectedColor) {
            const firstColor = document.querySelector('.color-option input[type="radio"]');
            if (firstColor) {
                firstColor.checked = true;
                firstColor.closest('.color-option').style.transform = 'scale(1.05)';
            }
        }
    }, 100);
    
    // Real-time phone formatting
    const phoneInput = document.getElementById('phone');
    if (phoneInput) {
        phoneInput.addEventListener('input', function(e) {
            let value = this.value.replace(/\D/g, '');
            
            if (value.length > 10) {
                value = value.substring(0, 10);
            }
            
            // Format the phone number
            if (value.length >= 3 && value.length <= 6) {
                this.value = '(' + value.substring(0, 3) + ') ' + value.substring(3);
            } else if (value.length > 6) {
                this.value = '(' + value.substring(0, 3) + ') ' + value.substring(3, 6) + '-' + value.substring(6, 10);
            } else {
                this.value = value;
            }
        });
    }
    
    // Check for pending order in localStorage
    const pendingOrder = localStorage.getItem('pendingOrder');
    if (pendingOrder) {
        try {
            const order = JSON.parse(pendingOrder);
            console.log('Found pending order from previous session');
            
            // Optionally auto-fill the form
            if (confirm('We found an unfinished order. Would you like to continue where you left off?')) {
                document.getElementById('name').value = order.name || '';
                document.getElementById('email').value = order.email || '';
                document.getElementById('phone').value = order.phone || '';
                document.getElementById('address').value = order.address || '';
                document.getElementById('qty').value = order.quantity || 1;
                
                // Trigger price calculation
                calcPrice();
            }
        } catch (e) {
            console.error('Error parsing pending order:', e);
        }
    }
    
    // Add input validation styling
    const inputs = document.querySelectorAll('#orderForm input, #orderForm select');
    inputs.forEach(input => {
        input.addEventListener('blur', function() {
            if (this.value.trim() === '') {
                this.style.borderColor = '#FF0000';
            } else {
                this.style.borderColor = '#4169E1';
            }
        });
    });
});
