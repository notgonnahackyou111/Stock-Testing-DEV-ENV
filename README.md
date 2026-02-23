# 📈 Stock Testing Platform v1.0

A comprehensive, professional-grade stock market simulation platform for safely testing trading strategies and integrating automated trading bots without financial risk.

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/notgonnahackyou111/Stock-Testing-DEV-ENV)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D14.0.0-brightgreen.svg)](https://nodejs.org/)
[![Status](https://img.shields.io/badge/status-Production%20Ready-success.svg)](#)

---

## ✨ Key Features

### 🎮 Core Trading Platform
- **95+ Real Stocks** - Tech giants, dividend stocks, ETFs, bonds, emerging markets
- **Real-Time Price Updates** - Realistic market simulation with volatility and momentum
- **Professional Charts** - Interactive price charts with technical indicators (20/50-day MAs)
- **Stock Analytics** - 52-week range, market cap, trading volume, stock type classification
- **Portfolio Tracking** - Real-time P&L, holdings breakdown, cost basis analysis
- **Multiple Game Modes** - Portfolio Building, Day Trader, Challenge Mode, Classic Trading
- **Difficulty Levels** - Easy, Medium, Hard with adjustable volatility and starting capital
- **Risk Levels** - Conservative (0.5x), Moderate (1.0x), Aggressive (1.8x)
- **Time Acceleration** - 1x-10x speed simulation, pause/resume controls

### 🤖 Bot Integration Framework
- **REST API** - Complete HTTP API for bot order placement and market data queries
- **WebSocket Real-time Updates** - Subscribe to live market data and order updates
- **Bot Management** - Register, monitor, and manage multiple bots simultaneously
- **Order Execution** - Realistic order book with buy/sell/reject states
- **Portfolio API** - Real-time portfolio and holdings queries per bot
- **Performance Tracking** - Win rate, total returns, drawdown metrics
- **Code Examples** - Python, Node.js, and Alpaca integration samples provided

### 📊 Advanced Trading Features (Implemented)
- **Candlestick Charts** - OHLC data visualization for technical analysis
- **Technical Indicators** - RSI, MACD, Bollinger Bands, Stochastic Oscillator
- **Short Selling** - Open and manage short positions
- **Margin Trading** - Configurable leverage with margin level monitoring
- **Watchlists** - Create custom stock watchlists for quick monitoring
- **Leaderboard System** - Track and rank bot performance
- **Trade History** - Complete audit log of all transactions

### 🌐 Market Data Integration
- **Alpha Vantage Support** - Free real-time and historical market data
- **IEX Cloud Support** - Fast and reliable equity data feeds
- **Polygon.io Support** - Professional-grade market data API
- **Fallback Simulator** - Uses simulated data if no API configured
- **Caching Layer** - Efficient API usage with built-in caching

### 📱 User Interface
- **Home Page** - Navigation hub with 4 main buttons
- **Trading Interface** - Stock grid, detailed charts, portfolio sidebar
- **Options Page** - Customize capital, risk, mode, difficulty
- **Bot Connection Page** - Register, manage, and monitor trading bots
- **Help Documentation** - Comprehensive 8-section help guide with FAQs
- **Responsive Design** - Modern UI with gradients, animations, smooth transitions

---

## 🚀 Quick Start

### For Users (Frontend Only - No Installation Required)
```bash
# Just open in any modern web browser
1. Open index.html in Chrome, Firefox, Safari, or Edge
2. Click \"Start the Test\" to begin trading
3. Use default settings or click \"Options\" to customize
4. Click stocks to view charts and place trades
5. Click \"Hook up Bot\" to connect your trading bot
6. Click \"Help\" for comprehensive documentation
```

### For Developers (Full Setup with Backend)
```bash
# Install dependencies
npm install

# Start the backend server.
# You can bind to a specific port with PORT or supply a
# comma-separated list so the server will fall back if a port is busy:
#
#   export PORT=8000            # only 8000
#   export PORTS=8000,8001,8002 # try 8000, then 8001, etc.
#
# The app will log which port it ultimately listens on.
npm start

# In another terminal, start development mode (auto-restarts on change)
npm run dev

# Open http://localhost:8000 (or whatever port was chosen) in your browser
```

### Keeping it running 24/7
If you want the simulator to stay online without manual intervention, run it
under a process manager such as [PM2](https://pm2.keymetrics.io/):

```bash
# install globally if you haven't already
npm install -g pm2

# start with the bundled ecosystem file (uses backup ports)
pm run pm2:start

# or start directly with an environment variable:
pm run pm2 -- start server.js --name stock-simulator --env production -- PORTS=8000,8001,8002

# view logs
pm2 logs stock-simulator
# restart on system boot
pm2 startup
pm2 save
```

The example `ecosystem.config.js` in the repo is preconfigured with
backup ports, log paths, and autorestart policy.  On a Linux host you can
also create a `systemd` unit or Docker container with `restart: always`.

Once the process manager is installed and configured, you can power the
machine on/off freely — the service will come up automatically and will
be restarted if it crashes, keeping the simulation accessible 24/7.


---

## 📂 Project Structure

```
Stock-Testing-DEV-ENV/
├── index.html                    # Home page with 4 buttons
├── options.html                  # Game configuration
├── test.html                     # Trading interface
├── bot-connection.html           # Bot management & API docs
├── help.html                     # Comprehensive help guide
├── css/
│   └── test.css                  # Trading interface styles (650+ lines)
├── js/
│   ├── stocks-data.js            # 95 stock database
│   ├── enhanced-simulator.js     # Simulation engine (322 lines)
│   ├── test-game.js              # Trading UI logic (639 lines)
│   ├── bot-api.js                # Bot API server (400+ lines)
│   ├── market-data.js            # Real data provider NEW
│   └── advanced-features.js      # Advanced trading features NEW
├── server.js                     # Node.js backend server NEW
├── package.json                  # Dependencies NEW
├── Dockerfile                    # Docker configuration NEW
├── docker-compose.yml            # Docker Compose setup NEW
├── SETUP.md                      # Comprehensive setup guide NEW
├── README.md                     # This file (updated)
└── LICENSE
```

---

## 📋 System Requirements

### Frontend (Browser)
- Modern web browser (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)
- JavaScript enabled
- 2GB RAM minimum
- No installation required

### Backend (Node.js Server)
- Node.js 14.0.0 or higher
- npm 6.0.0 or higher
- 512MB RAM minimum
- Port 8000 available
- Linux, macOS, or Windows

### For Real Market Data
- Alpha Vantage API key (free: https://www.alphavantage.co/)
- OR IEX Cloud API key (free: https://iexcloud.io/)
- OR Polygon.io API key (paid: https://polygon.io/)

---

## 📥 Installation

### Step 1: Clone Repository
```bash
git clone https://github.com/notgonnahackyou111/Stock-Testing-DEV-ENV.git
cd Stock-Testing-DEV-ENV
```

### Step 2: Install Dependencies
```bash
npm install
```

This installs:
- `express` - Web framework
- `ws` - WebSocket library
- `cors` - Cross-origin support
- `body-parser` - Request parsing

### Step 3: Configure (Optional)
Create a `.env` file for market data API keys:
```bash
PORT=8000
NODE_ENV=development
MARKET_DATA_PROVIDER=alphaVantage
ALPHA_VANTAGE_API_KEY=your_api_key
```

### Step 4: Start
```bash
npm start
# Server runs on http://localhost:8000
```

---

## 🎮 Game Modes

### 📈 Portfolio Building
Create a diversified portfolio with target allocations:
- Growth stocks: 40%
- Dividend stocks: 30%
- ETFs: 20%
- Bonds: 10%

Rebalance as prices move to maintain targets.

### ⚡ Day Trader
Fast-paced mode with realistic Pattern Day Trader rules:
- Limited to 3 trades per day
- Maximize daily profits
- Reset daily at market close

### 🎯 Challenge Mode
Meet profit targets within time limits:
- Target: 5% return on starting capital
- Multiple difficulty levels
- Build winning streaks

### 🎲 Classic Trading
Unrestricted trading mode for strategy exploration and learning.

---

## 🤖 Bot Integration

### Quick Start - Connect Your Bot
```bash
# 1. Click "Hook up Bot" on home page
# 2. Fill in bot details:
#    - Name: MyTradingBot
#    - Type: Python (or Node.js)
#    - API Key: your-secure-key
# 3. Copy API endpoint from the interface
# 4. Use Python or Node.js example code
# 5. Run your bot - it communicates with simulator
```

### Python Example
```python
import requests

BASE_URL = "http://localhost:8000"
API_KEY = "your-api-key"

# Register bot
response = requests.post(f"{BASE_URL}/api/bot/register", json={
    "name": "MyTrader",
    "type": "Python",
    "api_key": API_KEY
})
bot_id = response.json()["bot_id"]

# Get market data
response = requests.get(f"{BASE_URL}/api/market/data")
stocks = response.json()

# Place order
response = requests.post(f"{BASE_URL}/api/bot/order", json={
    "bot_id": bot_id,
    "symbol": "AAPL",
    "action": "buy",
    "quantity": 10,
    "api_key": API_KEY
})

# Get portfolio
response = requests.get(f"{BASE_URL}/api/portfolio", params={"bot_id": bot_id})
portfolio = response.json()
```

### Node.js Example
```javascript
const axios = require('axios');

const BASE_URL = "http://localhost:8000";
const API_KEY = "your-api-key";

// Register bot
const regResponse = await axios.post(`${BASE_URL}/api/bot/register`, {
    name: "MyTrader",
    type: "Node.js",
    api_key: API_KEY
});
const botId = regResponse.data.bot_id;

// Get market data
const marketResponse = await axios.get(`${BASE_URL}/api/market/data`);
const stocks = marketResponse.data;

// Place order
const orderResponse = await axios.post(`${BASE_URL}/api/bot/order`, {
    bot_id: botId,
    symbol: "AAPL",
    action: "buy",
    quantity: 10,
    api_key: API_KEY
});

// Get portfolio
const portfolioResponse = await axios.get(`${BASE_URL}/api/portfolio`, {
    params: { bot_id: botId }
});
```

---

## 📡 API Reference

### Base URL
```
HTTP:  http://localhost:8000
WebSocket: ws://localhost:8000
```

### Core Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/bot/register` | Register a new trading bot |
| GET | `/api/bot/:botId` | Get bot status |
| POST | `/api/bot/:botId/disconnect` | Disconnect bot |
| POST | `/api/bot/order` | Place buy or sell order |
| GET | `/api/market/data` | Get real-time market data |
| GET | `/api/portfolio` | Get bot portfolio and holdings |
| GET | `/api/bot/:botId/stats` | Get bot performance statistics |
| GET | `/api/bot/:botId/orders` | Get order history |
| WS | `/` | WebSocket for real-time updates |

### Example: Place Order
```bash
curl -X POST http://localhost:8000/api/bot/order \
  -H "Content-Type: application/json" \
  -d '{
    "bot_id": "bot_1",
    "symbol": "AAPL",
    "action": "buy",
    "quantity": 10,
    "api_key": "your-key"
  }'
```

### Example: Get Portfolio
```bash
curl "http://localhost:8000/api/portfolio?bot_id=bot_1"
```

---

## 📊 Stock Database

### 95+ Companies Across 6 Categories

| Category | Count | Examples |
|----------|-------|----------|
| **Growth** | 10 | AAPL, MSFT, NVDA, GOOGL, AMZN |
| **Dividend** | 18 | JNJ, PG, KO, PEP, WMT |
| **Energy** | 6 | XOM, CVX, SLB, EOG, MPC |
| **Healthcare** | 10 | JNJ, PFE, UNH, ABBV, LLY |
| **Semiconductors** | 11 | NVDA, INTC, AMD, QCOM, TSM |
| **Retail** | 10 | AMZN, WMT, HD, TGT, COST |
| **ETFs & Bonds** | 10 | SPY, QQQ, IWM, TLT, BND |
| **Emerging** | 20 | BABA, JD, TCEHY, ASHR, GDS |

---

## ⚙️ Advanced Features

### Short Selling
```javascript
const features = new AdvancedTradingFeatures(simulator);
features.openShort("AAPL", 10);  // Short 10 shares
features.closeShort("AAPL", 10); // Close position
```

### Margin Trading
```javascript
features.enableMargin(2);  // 2x leverage
features.buyOnMargin("AAPL", 10, 0.5);  // 50% margin requirement
```

### Candlestick Data
```javascript
const candles = features.getCandleData("AAPL", 100);
// Returns: [{timestamp, open, high, low, close, volume}, ...]
```

### Technical Indicators
```javascript
const indicators = features.calculateIndicators("AAPL");
// Returns: {rsi, macd, bollinger, stochastic}
```

### Watchlists
```javascript
features.createWatchlist("Tech Stocks");
features.addToWatchlist("Tech Stocks", "AAPL");
features.addToWatchlist("Tech Stocks", "MSFT");
const watchlist = features.getWatchlist("Tech Stocks");
```

### Leaderboards
```javascript
features.recordBotPerformance("MyBot", {
    returnPercent: 15.5,
    totalTrades: 23,
    winRate: 65
});
const leaderboard = features.getLeaderboard(10);
```

---

## 🌐 Real Market Data Integration

### Setup Alpha Vantage (Free)
1. Get API key: https://www.alphavantage.co/
2. In Options page, enable "Real Market Data"
3. Select "Alpha Vantage"
4. Paste API key
5. Reload page - prices now from real market data

### Setup IEX Cloud (Free Tier)
1. Get API token: https://iexcloud.io/
2. In Options page, enable "Real Market Data"
3. Select "IEX Cloud"
4. Paste API token
5. Reload page

### Setup Polygon.io (Paid)
1. Get API key: https://polygon.io/
2. In Options page, enable "Real Market Data"
3. Select "Polygon"
4. Paste API key
5. Reload page

---

## 🐳 Docker Deployment

### Quick Deploy
```bash
# Build and run with Docker
docker build -t stock-testing:latest .
docker run -p 8000:8000 stock-testing:latest

# Or use Docker Compose
docker-compose up -d

# Access at http://localhost
```

---

## 📚 Comprehensive Help

Click the **"Help"** button on the home page for:
- Detailed getting started guide
- Feature explanations
- Game mode rules
- Bot integration tutorials
- FAQ with 8+ answered questions
- Troubleshooting guide
- Resource recommendations
- Contact information

---

## 🔧 Configuration

### Environment Variables
```bash
PORT=8000
NODE_ENV=development|production
MARKET_DATA_PROVIDER=alphaVantage|iexCloud|polygon
ALPHA_VANTAGE_API_KEY=***
IEX_CLOUD_API_KEY=***
POLYGON_API_KEY=***
```

### Game Settings
Customize in `options.html`:
- Starting Capital: $5,000 - $500,000+
- Risk Level: Conservative, Moderate, Aggressive
- Game Mode: Portfolio, Day Trader, Challenge, Classic
- Difficulty: Easy, Medium, Hard

---

## 🐛 Known Limitations & Future Work

### Current Limitations
- ✅ Simulated prices only (real data optional)
- ✅ No real market hours (24/7 trading)
- ✅ No slippage or commissions (simple execution)
- ✅ No options trading (stocks only)
- ✅ Browser-based storage (no central database)

### Planned Features
- [ ] Database persistence (PostgreSQL/MongoDB)
- [ ] Leaderboard competitions
- [ ] Advanced charting (Tradingview-style)
- [ ] Strategy backtesting engine
- [ ] Mobile app (React Native)
- [ ] Paper trading tournaments
- [ ] Real broker integration (Alpaca, TD Ameritrade)

---

## 📞 Support & Contact

**Email**: notgonnahackyou@gmail.com
**Response Time**: Usually within 24-48 hours

For:
- 🐛 Bug reports
- 💡 Feature requests
- ❓ Technical questions
- 📈 General inquiries

---

## 📄 License

MIT License - See [LICENSE](LICENSE) file for complete details

```
Permission is granted to use, modify, and distribute this software
for any purpose, commercial or non-commercial.
```

---

## 🎯 Version History

| Version | Date | Changes |
|---------|------|----------|
| 1.0.0 | Feb 12, 2026 | Production release with bot framework, advanced features, real market data |
| 0.9.0 | Feb 10, 2026 | Bot connection interface, API documentation |
| 0.8.0 | Feb 8, 2026 | 95 stock database, enhanced simulator |
| 0.7.0 | Feb 5, 2026 | Professional UI, Chart.js integration |

---

## 🙏 Acknowledgments

Built with:
- [Chart.js](https://www.chartjs.org/) - Interactive charting
- [Express.js](https://expressjs.com/) - Web framework
- [WebSocket](https://github.com/websockets/ws) - Real-time communication
- [Alpha Vantage](https://www.alphavantage.co/) - Market data

---

## 🚀 Getting Help

1. **Help Button** - Click "Help" in app for interactive guide
2. **Setup.md** - Detailed setup and deployment guide
3. **Bot Connection** - API documentation in app
4. **Code Examples** - Python and Node.js samples provided
5. **Email Support** - notgonnahackyou@gmail.com

---

**Happy Trading! 📈**

For best results, use a modern browser and enable JavaScript.

Made with ❤️ for traders and developers.

```
---
Last Updated: February 12, 2026
Current Version: 1.0.0
Status: Production Ready ✅
```
