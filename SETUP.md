# Stock Testing Platform - Setup & Deployment Guide

## 📋 Table of Contents
1. [Quick Start](#quick-start)
2. [System Requirements](#system-requirements)
3. [Installation](#installation)
4. [Configuration](#configuration)
5. [Running the Platform](#running-the-platform)
6. [API Documentation](#api-documentation)
7. [Bot Integration](#bot-integration)
8. [Deployment](#deployment)
9. [Troubleshooting](#troubleshooting)

---

## 🚀 Quick Start

### For Users (Frontend Only)
```bash
# No installation needed! Just open in browser:
1. Open index.html in your web browser
2. Click "Start the Test" to begin trading
3. Click "Options" to customize settings
4. Click "Hook up Bot" to connect your trading bot
5. Click "Help" for comprehensive documentation
```

### For Developers (Full Setup with Backend)
```bash
# Clone the repository
git clone https://github.com/notgonnahackyou111/Stock-Testing-DEV-ENV.git
cd Stock-Testing-DEV-ENV

# Install dependencies
npm install

# Start the backend server
npm start

# Open frontend in browser
# Visit http://localhost:8000
```

---

## 💻 System Requirements

### Frontend (Browser)
- Modern web browser (Chrome, Firefox, Safari, Edge)
- JavaScript enabled
- 2GB RAM minimum
- No installation required

### Backend (Node.js Server)
- Node.js 14.0.0 or higher
- npm 6.0.0 or higher
- 2GB RAM
- Port 8000 available
- Linux, macOS, or Windows

### For Real Market Data Integration
- Alpha Vantage API key (free tier available)
- OR IEX Cloud API key (free tier available)
- OR Polygon.io API key (paid, but free trial available)

---

## 📥 Installation

### Step 1: Clone Repository
```bash
git clone https://github.com/notgonnahackyou111/Stock-Testing-DEV-ENV.git
cd Stock-Testing-DEV-ENV
```

### Step 2: Install Node.js Dependencies
```bash
npm install
```

This installs:
- `express` - Web server framework
- `ws` - WebSocket library
- `cors` - Cross-Origin Resource Sharing
- `body-parser` - Request parsing

### Step 3: Verify Installation
```bash
node --version  # Should be v14.0.0+
npm --version   # Should be 6.0.0+
npm list        # Lists installed packages
```

---

## ⚙️ Configuration

### Market Data API Setup (Optional)

#### Setting up Alpha Vantage (Free)
1. Go to https://www.alphavantage.co/
2. Register for a free API key
3. In `options.html`, enable "Real Market Data"
4. Paste your API key
5. Select "Alpha Vantage" as provider

#### Setting up IEX Cloud (Free Tier)
1. Go to https://iexcloud.io/
2. Sign up and create API token
3. Enable "Real Market Data" in options
4. Paste your API token
5. Select "IEX Cloud" as provider

#### Setting up Polygon.io (Paid)
1. Go to https://polygon.io/
2. Sign up for account
3. Create API key from dashboard
4. Enable "Real Market Data" in options
5. Paste your API key
6. Select "Polygon" as provider

### Environment Variables (Optional)
Create a `.env` file in the root directory:

```bash
# Server configuration
PORT=8000
NODE_ENV=development

# Market Data
MARKET_DATA_PROVIDER=alphaVantage
ALPHA_VANTAGE_API_KEY=your_api_key_here
IEX_CLOUD_API_KEY=your_api_key_here
POLYGON_API_KEY=your_api_key_here

# Database (future)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=stock_testing
DB_USER=postgres
DB_PASS=password
```

---

## ▶️ Running the Platform

### Option 1: Frontend Only (No Backend)
```bash
# Simply open index.html in your browser
# Works offline, uses simulated market data
```

### Option 2: Full Platform with Backend
```bash
# Terminal 1: Start the Node.js server
npm start
# Output: Server running on http://localhost:8000

# Terminal 2 (Optional): Monitor file changes
npm run dev

# Browser: Open http://localhost:8000
```

### Option 3: Docker Container (Recommended for Production)
```bash
# Build Docker image
docker build -t stock-testing:latest .

# Run container
docker run -p 8000:8000 stock-testing:latest

# Container starts server automatically
```

---

## 📡 API Documentation

### Base URL
```
HTTP:  http://localhost:8000
WebSocket: ws://localhost:8000
```

### Authentication
Include API key in request headers:
```
Authorization: Bearer YOUR_API_KEY
```

### Core Endpoints

#### 1. Register Bot
```bash
POST /api/bot/register
Content-Type: application/json

{
  "name": "MyTradingBot",
  "type": "Python",
  "api_key": "your-secure-key",
  "description": "Momentum-based trading bot"
}

Response:
{
  "success": true,
  "bot_id": "bot_1",
  "message": "Bot registered successfully"
}
```

#### 2. Place Order
```bash
POST /api/bot/order
Content-Type: application/json

{
  "bot_id": "bot_1",
  "symbol": "AAPL",
  "action": "buy",
  "quantity": 10,
  "api_key": "your-secure-key"
}

Response:
{
  "success": true,
  "order_id": "order_1001",
  "status": "filled"
}
```

#### 3. Get Market Data
```bash
GET /api/market/data?symbol=AAPL

Response:
{
  "symbol": "AAPL",
  "price": 150.25,
  "high52Week": 199.62,
  "low52Week": 124.17,
  "avgVolume": 52400000,
  "marketCap": "2.3T"
}
```

#### 4. Get Portfolio
```bash
GET /api/portfolio?bot_id=bot_1

Response:
{
  "bot_id": "bot_1",
  "cash": 95000,
  "holdings": [
    {
      "symbol": "AAPL",
      "quantity": 10,
      "costBasis": 1500,
      "currentValue": 1502.50,
      "gainLoss": 2.50
    }
  ],
  "totalValue": 96502.50
}
```

#### 5. Get Bot Statistics
```bash
GET /api/bot/bot_1/stats

Response:
{
  "bot_id": "bot_1",
  "totalOrders": 25,
  "filledOrders": 23,
  "winRate": "92%",
  "currentProfit": 2502.50
}
```

### WebSocket Real-time Updates

#### Connect
```javascript
const ws = new WebSocket('ws://localhost:8000');

// Subscribe to market data
ws.send(JSON.stringify({
  type: 'subscribe',
  channel: 'market_data'
}));

// Receive market updates
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Market update:', data);
};
```

#### Message Types
- `market_snapshot` - Initial market data
- `market_update` - Real-time price updates
- `order_update` - Order execution updates
- `portfolio_update` - Portfolio changes

---

## 🤖 Bot Integration

### Python Example
```python
import requests
import json

API_KEY = "your-bot-api-key"
BASE_URL = "http://localhost:8000"

class StockTradingBot:
    def __init__(self):
        self.bot_id = None
        self.register_bot()
    
    def register_bot(self):
        response = requests.post(
            f"{BASE_URL}/api/bot/register",
            json={
                "name": "PythonTradingBot",
                "type": "Python",
                "api_key": API_KEY
            }
        )
        self.bot_id = response.json()["bot_id"]
    
    def get_market_data(self):
        response = requests.get(
            f"{BASE_URL}/api/market/data"
        )
        return response.json()
    
    def place_order(self, symbol, action, quantity):
        response = requests.post(
            f"{BASE_URL}/api/bot/order",
            json={
                "bot_id": self.bot_id,
                "symbol": symbol,
                "action": action,
                "quantity": quantity,
                "api_key": API_KEY
            }
        )
        return response.json()
    
    def get_portfolio(self):
        response = requests.get(
            f"{BASE_URL}/api/portfolio",
            params={"bot_id": self.bot_id}
        )
        return response.json()

# Usage
bot = StockTradingBot()
market_data = bot.get_market_data()

for stock in market_data:
    if stock["price"] < 100:  # Simple strategy
        bot.place_order(stock["symbol"], "buy", 10)
```

### Node.js Example
```javascript
const axios = require('axios');

const API_KEY = "your-bot-api-key";
const BASE_URL = "http://localhost:8000";

class StockTradingBot {
    async registerBot() {
        const response = await axios.post(`${BASE_URL}/api/bot/register`, {
            name: "NodeTradingBot",
            type: "Node.js",
            api_key: API_KEY
        });
        this.botId = response.data.bot_id;
    }
    
    async getMarketData() {
        const response = await axios.get(`${BASE_URL}/api/market/data`);
        return response.data;
    }
    
    async placeOrder(symbol, action, quantity) {
        const response = await axios.post(`${BASE_URL}/api/bot/order`, {
            bot_id: this.botId,
            symbol: symbol,
            action: action,
            quantity: quantity,
            api_key: API_KEY
        });
        return response.data;
    }
    
    async getPortfolio() {
        const response = await axios.get(`${BASE_URL}/api/portfolio`, {
            params: { bot_id: this.botId }
        });
        return response.data;
    }
}

// Usage
(async () => {
    const bot = new StockTradingBot();
    await bot.registerBot();
    
    const market = await bot.getMarketData();
    for (const stock of market) {
        if (stock.price < 100) {
            await bot.placeOrder(stock.symbol, "buy", 10);
        }
    }
})();
```

---

## 🌐 Deployment

### Deploy to Heroku
```bash
# Create Heroku app
heroku create stock-testing-app

# Deploy code
git push heroku main

# View logs
heroku logs --tail
```

### Deploy to AWS EC2
```bash
# Connect to instance
ssh -i key.pem ubuntu@your-instance-ip

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone repo and install
git clone https://github.com/notgonnahackyou111/Stock-Testing-DEV-ENV.git
cd Stock-Testing-DEV-ENV
npm install

# Run with PM2 for persistence
npm install -g pm2
pm2 start server.js
pm2 startup
pm2 save
```

### Deploy with Docker
```bash
# Create Dockerfile
docker build -t stock-testing:latest .

# Run container
docker run -d -p 8000:8000 --name stock-testing stock-testing:latest

# View logs
docker logs stock-testing
```

### Deploy with Docker Compose
```bash
# Create docker-compose.yml
version: '3'
services:
  server:
    build: .
    ports:
      - "8000:8000"
    environment:
      - NODE_ENV=production
    restart: always

# Start services
docker-compose up -d
```

---

## 🔧 Troubleshooting

### Issue: "Port 8000 already in use"
```bash
# Find process using port 8000
lsof -i :8000

# Kill the process
kill -9 <PID>

# Or use different port
PORT=3000 npm start
```

### Issue: "Cannot find module 'express'"
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### Issue: Bot connection fails
```bash
# Check if server is running
curl http://localhost:8000/health

# Check server logs for errors
npm start  # See console output

# Verify API key format
# Should be: bot_api_key format in registration
```

### Issue: Chart not loading
```bash
# Clear browser cache (Ctrl+Shift+Delete)
# Hard refresh (Ctrl+F5)
# Check browser console (F12) for errors
# Verify Chart.js is loaded from CDN
```

### Issue: Real market data not updating
```bash
# Verify API key in options
# Check API key validity at provider's website
# Ensure rate limits not exceeded
# Switch to simulated data temporarily
```

---

## 📚 Additional Resources

- **Official Docs**: See `SETUP.md` in root directory
- **API Reference**: Check `API_DOCUMENTATION.md`
- **Bot Examples**: See `examples/` directory
- **Help Page**: Click "Help" button in app for interactive guide

---

## 👨‍💻 Development

### Code Structure
```
Stock-Testing-DEV-ENV/
├── index.html                    # Home page
├── test.html                     # Trading interface
├── options.html                  # Settings
├── bot-connection.html           # Bot management
├── help.html                     # Documentation
├── css/
│   └── test.css                  # Main styling
├── js/
│   ├── stocks-data.js            # Stock database
│   ├── enhanced-simulator.js     # Simulation engine
│   ├── test-game.js              # Trading UI logic
│   ├── bot-api.js                # Bot API server
│   ├── market-data.js            # Real data provider
│   └── advanced-features.js      # Advanced trading features
├── server.js                     # Node.js backend
├── package.json                  # Dependencies
└── README.md                     # Project overview
```

### Contributing
1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

---

## 📞 Support & Contact

For questions, suggestions, or bug reports:
- **Email**: notgonnahackyou@gmail.com
- **Response Time**: Usually within 24-48 hours
- **Issues**: Create GitHub issue for bugs
- **Feature Requests**: Submit via email or GitHub discussions

---

## 📄 License

This project is licensed under the MIT License - see LICENSE file for details.

---

## 🎯 Roadmap

### Completed ✅
- Frontend trading interface
- 95+ stock database
- Simulator with game modes
- Bot API framework
- Help & documentation
- Market data integration

### In Progress 🔄
- Real WebSocket server
- Candlestick charting
- Margin trading
- Short selling

### Planned 📋
- Database persistence
- Leaderboards & competitions
- Advanced analytics dashboard
- Mobile app
- Strategy backtesting engine
- Paper trading tournaments

---

**Last Updated**: February 12, 2026
**Current Version**: 1.0.0
**Status**: Production Ready
