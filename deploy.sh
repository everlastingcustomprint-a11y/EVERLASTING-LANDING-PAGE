#!/bin/bash

echo "🚀 Deploying Everlasting Custom Print..."
echo "========================================"

# Check for .env
if [ ! -f ".env" ]; then
    echo "❌ .env file not found!"
    echo "Creating .env template..."
    cat > .env << EOF
STRIPE_SECRET_KEY=sk_live_...FV0n
STRIPE_PUBLISHABLE_KEY=pk_live_51S61rl3R6cTsuNiveVPhdFEC72CSCQ1KpcUrlz2XmQB0xcNCiBCbuwPtkEjg2C7HrnvZmy5K0CSJS79ZoBeGh1A600yPMvTplX
DOMAIN=https://yourdomain.com
PORT=3000
EOF
    echo "✅ .env template created. Please add your actual keys!"
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Test locally
echo "🔧 Testing locally..."
node server.js &
SERVER_PID=$!
sleep 3

# Check if server is running
if curl -s http://localhost:3000/health > /dev/null; then
    echo "✅ Server is running!"
    kill $SERVER_PID
else
    echo "❌ Server failed to start"
    kill $SERVER_PID
    exit 1
fi

echo ""
echo "📋 Deployment Checklist:"
echo "1. ✅ Stripe keys configured"
echo "2. ✅ Backend server working"
echo "3. Next steps:"
echo "   • Deploy to Railway/Render"
echo "   • Update BACKEND_URL in script.js"
echo "   • Test with real $1 payment"
echo ""
echo "📞 Support: 240-940-8778"