const express = require('express');
const cors = require('cors');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();

// ✅ FIXED CORS CONFIGURATION
app.use(cors({
    origin: [
        'https://everlasting-landing-page.vercel.app', // Your Vercel frontend
        'https://everlastingcustomprint.com', // Your domain if you have one
        'http://localhost:5500', // Live Server
        'http://localhost:3000' // React dev server
    ],
    methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204
}));

// ✅ Handle preflight requests
app.options('*', cors());

app.use(express.json());

// Store orders (in production, use a database)
const orders = new Map();

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        message: 'Everlasting Custom Print Backend',
        status: 'Running',
        timestamp: new Date().toISOString(),
        endpoints: {
            health: '/health',
            createCheckout: '/create-checkout-session',
            order: '/order/:orderId'
        }
    });
});

// Create Stripe checkout session
app.post('/create-checkout-session', async (req, res) => {
    console.log('🛒 Payment request from:', req.headers.origin);
    console.log('📦 Order data:', req.body);
    
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

        // Validate required fields
        if (!priceInCents || priceInCents < 50) {
            return res.status(400).json({ 
                error: 'Invalid amount. Minimum is $0.50' 
            });
        }

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
                            name: `${product} - Custom Order`,
                            description: `Size: ${size} | Color: ${color} | Quantity: ${quantity}${freeItems > 0 ? ` | Free Items: ${freeItems}` : ''}`
                        },
                        unit_amount: priceInCents,
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url: `https://everlasting-landing-page.vercel.app/success.html?session_id={CHECKOUT_SESSION_ID}&order_id=${orderId}`,
            cancel_url: `https://everlasting-landing-page.vercel.app/#order`,
            customer_email: email,
            metadata: {
                orderId,
                customerName: name,
                customerPhone: phone,
                customerAddress: address,
                product: product,
                size: size,
                quantity: quantity,
                color: color,
                freeItems: freeItems || 0
            },
            shipping_address_collection: {
                allowed_countries: ['US'],
            }
        });

        console.log('✅ Stripe session created:', session.id);
        
        res.json({ 
            success: true,
            id: session.id,
            orderId: orderId
        });
        
    } catch (error) {
        console.error('❌ Error creating checkout session:', error);
        res.status(500).json({ 
            success: false,
            error: error.message,
            code: error.code || 'unknown_error'
        });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        service: 'Everlasting Custom Print API',
        stripe: process.env.STRIPE_SECRET_KEY ? 'Configured' : 'Missing',
        timestamp: new Date().toISOString()
    });
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Everlasting Custom Print Backend running on port ${PORT}`);
    console.log(`✅ CORS enabled for: everlasting-landing-page.vercel.app`);
    console.log(`✅ Health endpoint: /health`);
    console.log(`✅ Payment endpoint: /create-checkout-session`);
});
