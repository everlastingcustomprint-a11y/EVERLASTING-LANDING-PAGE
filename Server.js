const express = require('express');
const cors = require('cors');
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Store orders (in production, use a database)
const orders = new Map();

// Create Stripe checkout session
app.post('/create-checkout-session', async (req, res) => {
    try {
        const {
            name,
            email,
            phone,
            address,
            product,
            size,
            quantity,
            color,
            price,
            freeItems,
            priceInCents
        } = req.body;

        // Create order ID
        const orderId = `ECP-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
        
        // Store order details
        orders.set(orderId, {
            orderId,
            name,
            email,
            phone,
            address,
            product,
            size,
            quantity,
            color,
            price,
            freeItems,
            status: 'pending',
            timestamp: new Date().toISOString()
        });

        // Create Stripe session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: `${product} (${size}, ${color})`,
                            description: `Quantity: ${quantity} | Free Items: ${freeItems} | Shipping included`
                        },
                        unit_amount: priceInCents,
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url: `${process.env.DOMAIN}/success.html?session_id={CHECKOUT_SESSION_ID}&order_id=${orderId}`,
            cancel_url: `${process.env.DOMAIN}/cancel.html`,
            customer_email: email,
            metadata: {
                orderId,
                customerName: name,
                customerPhone: phone,
                customerAddress: address,
                productDetails: JSON.stringify({
                    product,
                    size,
                    quantity,
                    color,
                    freeItems
                })
            },
            shipping_address_collection: {
                allowed_countries: ['US'],
            },
            billing_address_collection: 'required',
            phone_number_collection: {
                enabled: true,
            }
        });

        res.json({ 
            id: session.id,
            orderId: orderId
        });
        
    } catch (error) {
        console.error('Error creating checkout session:', error);
        res.status(500).json({ 
            error: 'Unable to create payment session',
            message: error.message 
        });
    }
});

// Stripe webhook for payment confirmation
app.post('/webhook', express.raw({type: 'application/json'}), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        event = stripe.webhooks.constructEvent(
            req.body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (err) {
        console.error(`Webhook Error: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle successful payment
    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const orderId = session.metadata.orderId;
        
        if (orderId && orders.has(orderId)) {
            const order = orders.get(orderId);
            order.status = 'paid';
            order.paymentId = session.payment_intent;
            order.customerId = session.customer;
            order.paidAt = new Date().toISOString();
            
            // Here you would:
            // 1. Save to database
            // 2. Send confirmation email
            // 3. Notify your team
            // 4. Update inventory
            
            console.log(`✅ Order ${orderId} paid successfully`);
            console.log(`   Customer: ${order.name}`);
            console.log(`   Amount: $${order.price}`);
            console.log(`   Product: ${order.product} x${order.quantity}`);
            
            // Example: Send email notification
            // await sendOrderConfirmation(order);
        }
    }

    res.json({ received: true });
});

// Get order details
app.get('/order/:orderId', (req, res) => {
    const order = orders.get(req.params.orderId);
    if (order) {
        res.json(order);
    } else {
        res.status(404).json({ error: 'Order not found' });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        service: 'Everlasting Custom Print API',
        timestamp: new Date().toISOString()
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`💰 Stripe Mode: ${process.env.STRIPE_SECRET_KEY?.startsWith('sk_live') ? 'LIVE' : 'TEST'}`);
});