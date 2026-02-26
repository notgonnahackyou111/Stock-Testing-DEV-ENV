# 📈 Stock Testing Platform v1.83.00

A comprehensive, professional-grade stock market simulation platform for safely testing trading strategies and integrating automated trading bots without financial risk.

[![Version](https://img.shields.io/badge/version-1.83.00-blue.svg)](https://github.com/notgonnahackyou111/Stock-Testing-DEV-ENV)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D14.0.0-brightgreen.svg)](https://nodejs.org/)
[![Status](https://img.shields.io/badge/status-Production%20Ready-success.svg)](#)

---

## ✨ Key Features

### 🎮 Core Trading Platform
- **135+ Real Stocks** - Tech giants, dividend stocks, ETFs, bonds, biotech, fintech, utilities, and more
- **Real-Time Price Updates** - Realistic market simulation with enhanced volatility (±20% daily swings possible)
- **Professional Charts** - Interactive price charts with technical indicators (20/50-day MAs)
- **Stock Analytics** - 52-week range, market cap, trading volume, stock type classification
- **Portfolio Tracking** - Real-time P&L, holdings breakdown, cost basis analysis
- **Export/Import Save System** - Generate unique save codes and restore complete game sessions with all trades at any time
- **Multiple Game Modes** - Portfolio Building, Day Trader, Challenge Mode, Classic Trading
- **Optional Day Counter** - track the number of simulated days; toggleable via options
- **Starting Capital Cap** - maximum $1,000,000 (slider enforces this)
- **Custom Challenge Mode** - start with $10,000 and set your own week limit (other settings are ignored)
- **Debug Panel & State Management** - toggleable debugger for state inspection and manual updates
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

## � Debug Panel & State Import/Export

While playing a session you can press the 🐞 button (top‑right of the speed controls) to open an **advanced debugger**. The panel shows your entire simulator state in JSON and provides buttons to:

* **Refresh** – update the displayed state
* **Export** – download the current state as a `.json` file
* **Import** – paste previously saved JSON to restore that game session

The imported state will recreate the simulator (including portfolio, trades, time, etc.) so you can pause and resume at will or share scenarios with others.

Optionally use the prompt importer or paste the contents of a saved file.

## �🚀 Quick Start

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

### Deploying to a remote host
Because the application is just a Node.js server + static files, it can
be hosted on any machine you have SSH access to (a VPS, cloud VM, home
server, etc.).  The only requirement is that the host can run Node.js or
Docker and that a port (default 8000) is open to the network.

#### Example (Node.js/PM2)
1. SSH into your remote machine.
2. Install Node.js 18+ and Git.
3. Clone the repository and install dependencies:
   ```bash
   git clone https://github.com/notgonnahackyou111/Stock-Testing-DEV-ENV.git
   cd Stock-Testing-DEV-ENV
   npm install --production
   ```
4. Start the server with environment variables if desired:
   ```bash
   export PORTS=8000,8001,8002   # try 8000 then backups
   npm start                    # or pm2 start ecosystem.config.js
   ```
5. Use PM2/systemd/Docker to keep the process alive.  Point your browser to
   `http://<your-machine-ip>:8000` (or the port reported by the startup
   log).

#### Example (Docker)
A `Dockerfile` is provided for convenience; build and run it on the host:

```bash
# build the image on the remote machine
docker build -t stock-simulator:latest .

# run it in detached mode, mapping host port 8000
docker run -d --restart=always -p 8000:8000 \
  -e PORTS=8000,8001,8002 --name stock-sim stock-simulator:latest
```

The container will expose port 8000 inside and restart automatically on
failure or reboot.  You can also deploy the image to any Docker-capable
platform (AWS ECS, Azure Container Instances, etc.).

#### Networking and domain names
- To access the service from outside your LAN, open/forward the port on
  the host's firewall/router.
- Assign a static IP or a DNS name and point it to the host.
- For HTTPS, put a reverse proxy (nginx, Caddy, Traefik) in front of the
  Node app or let your cloud provider handle TLS.

With these steps in place you’ll have a remote instance running around the
clock; the URL will be `http://<host>:<port>` (or your custom domain).

---

## 📂 Project Structure

```
Stock-Testing-DEV-ENV/
├── index.html                    # Home page with 4 buttons
├── options.html                  # Game configuration
├── test.html                     # Trading interface with export/import
├── bot-connection.html           # Bot management & API docs
├── bot-training-dashboard.html   # Bot training interface
├── help.html                     # Comprehensive help guide
├── css/
│   └── test.css                  # Trading interface styles (800+ lines)
├── js/
│   ├── stocks-data.js            # 135 stock database (expanded)
│   ├── enhanced-simulator.js     # Simulation engine with volatility (322 lines)
│   ├── test-game.js              # Trading UI logic with export/import (750+ lines)
│   ├── bot-api.js                # Bot API server (400+ lines)
│   ├── market-data.js            # Real data provider
│   ├── advanced-features.js      # Advanced trading features
│   └── simulator.js              # Base simulator
├── server.js                     # Node.js backend server with save/load API
├── package.json                  # Dependencies
├── Dockerfile                    # Docker configuration
├── docker-compose.yml            # Docker Compose setup
├── ecosystem.config.js           # PM2 configuration
├── SETUP.md                      # Comprehensive setup guide
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

## 🗄️ Export/Import & Firebase Persistence

### Cloud Save System with Unique Codes
Export your game session to a unique alphanumeric code that you can share and import later:

**Export** (💾 button):
- Click the **Export** button during trading
- Receive a unique 9-character save code (e.g., `ABC123XYZ`)
- Copy code to clipboard
- Share with friends or save for later

**Import** (📥 button):
- Click the **Import** button on the home page
- Enter your save code
- Select which preset to load
- Your entire game state is restored instantly

**Saved Data Includes:**
- Complete portfolio (all holdings and cash)
- All trades and transaction history
- Current stock prices and market state
- Game configuration and settings
- Time elapsed and all stats

### Firebase Cloud Storage
All saves are automatically stored in **Firebase Firestore** for permanent persistence:
- ✅ Saves survive server restarts
- ✅ Access your saves from any device
- ✅ Automatic daily backups
- ✅ Scales to millions of concurrents users
- ✅ Works on local dev and Render production

**Setup Firebase** (30 min, one-time):
See [FIREBASE_SETUP.md](FIREBASE_SETUP.md) for complete instructions

**Running Without Firebase**:
- Server automatically falls back to temporary in-memory storage
- Saves work normally until server restarts
- Perfect for local testing and development
Create a diversified portfolio with target allocations:
- Growth stocks: 40%
- Dividend stocks: 30%
- ETFs: 20%
- Bonds: 10%

Rebalance as prices move to maintain targets.

### ⚡ Day Trader

### ⏳ Day Counter (New)

A simple counter showing the number of simulated game days that have elapsed. This feature is **disabled by default**; enable it from the options screen if you prefer a numerical day indicator alongside the date display.

### 🎯 Custom Challenge Mode

This mode gives you a clean start for time‑bound profit runs:

- Begin with exactly $10,000 (overrides starting capital field).
- Specify how many **weeks** you have to trade; the simulation will stop when the limit is reached.
- All other settings (risk, difficulty, etc.) are ignored while the mode is active.
- Monitor weeks used/remaining via the mode stats panel during play.

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
| POST | `/api/saves/create` | Create new save code |
| GET | `/api/saves/:code` | Get all presets for a save code |
| POST | `/api/saves/:code` | Save game state to preset |
| GET | `/api/saves/:code/preset/:presetName` | Load specific preset |
| DELETE | `/api/saves/:code/preset/:presetName` | Delete preset |
| POST | `/api/bot/register` | Register a new trading bot |
| GET | `/api/bot/:botId` | Get bot status |
| POST | `/api/bot/:botId/disconnect` | Disconnect bot |
| POST | `/api/bot/order` | Place buy or sell order |
| GET | `/api/market/data` | Get real-time market data |
| GET | `/api/portfolio` | Get bot portfolio and holdings |
| GET | `/api/bot/:botId/stats` | Get bot performance statistics |
| GET | `/api/bot/:botId/orders` | Get order history |
| WS | `/` | WebSocket for real-time updates |

### Example: Create Save Code
```bash
curl -X POST http://localhost:8000/api/saves/create
# Response: {"success": true, "code": "ABC123XYZ", "storage": "Firebase"}
```

### Example: Save Game State
```bash
curl -X POST http://localhost:8000/api/saves/ABC123XYZ \
  -H "Content-Type: application/json" \
  -d '{
    "gameState": {
      "config": {"startingCapital": 50000},
      "simulator": {"portfolio": {"cash": 50000}}
    },
    "presetName": "default"
  }'
```

### Example: Load Game State
```bash
curl http://localhost:8000/api/saves/ABC123XYZ/preset/default
# Returns complete game state with all trades and holdings
```

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

### 135+ Companies Across 4 Main Categories

| Category | Count | Examples |
|----------|-------|----------|
| **Growth Stocks** | 60 | AAPL, MSFT, NVDA, GOOGL, AMZN, TSLA, META, CRM, DKNG, SNAP, ABNB, DASH, SPOT, PINS, ZM, RBLX, EXAS, REGN, BIIB, VRTX |
| **Dividend Stocks** | 45 | JNJ, PG, KO, PEP, WMT, XOM, CVX, UNH, ABBV, LLY, MAR, HLT, RCL, CCL, SBUX, WDAY, CROX, PYPL, STO, ETSY |
| **ETFs** | 15 | SPY, QQQ, IWM, DIA, VTI, VOO, SCHX, VYM, NOBL, DGRO, AGG, VGIT, VGSH, BND, BNDX |
| **Bonds & Commodities** | 15 | TLT, IEF, HYG, VWOB, GLD, USO, FCX, RIO, NEM, AWK, WCN, KMI, EPD, LYB, CORE |

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

**Firebase (Optional - for persistent saves)**:
```bash
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY=your-private-key
FIREBASE_CLIENT_EMAIL=your-client-email
FIREBASE_DATABASE_URL=https://your-project.firebaseio.com
```

**Server Configuration**:
```bash
PORT=8000
NODE_ENV=development|production
```

**Market Data Providers (Optional)**:
```bash
MARKET_DATA_PROVIDER=alphaVantage|iexCloud|polygon
ALPHA_VANTAGE_API_KEY=***
IEX_CLOUD_API_KEY=***
POLYGON_API_KEY=***
```

**Setup Instructions**:
- Copy `.env.example` to `.env`
- Fill in Firebase credentials ([FIREBASE_SETUP.md](FIREBASE_SETUP.md) guide)
- Or run without Firebase for in-memory demo mode

### Game Settings
Customize in `options.html`:
- Starting Capital: $5,000 - $500,000+
- Risk Level: Conservative, Moderate, Aggressive
- Game Mode: Portfolio, Day Trader, Challenge, Classic
- Optional day counter display (turn on/off in Options)
- Difficulty: Easy, Medium, Hard

---

## 🐛 Known Limitations & Future Work

### Current Limitations
- ✅ Simulated prices only (real data optional)
- ✅ No real market hours (24/7 trading)
- ✅ No slippage or commissions (simple execution)
- ✅ No options trading (stocks only)

### Implemented Features ✅
- ✅ **Database persistence** (Firebase Firestore)
- ✅ **Export/Import save system** with unique codes
- ✅ **135+ stocks** across growth, dividend, ETF, and bond categories
- ✅ **Enhanced price volatility** with realistic daily swings (±20% possible)
- ✅ **Price display consistency** between grid and trading panel

### Planned Features
- [ ] User accounts & authentication
- [ ] Leaderboard competitions
- [ ] Advanced charting (Tradingview-style)
- [ ] Strategy backtesting engine
- [ ] Mobile app (Flutter)
- [ ] Paper trading tournaments
- [ ] Real broker integration (Alpaca, TD Ameritrade)
- [ ] Bot strategy marketplace

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
| 1.83.00 | Feb 25, 2026 | Export/import save system with unique codes, 135 stock database, enhanced price volatility (±20% swings), fixed price display consistency, Render deployment ready |
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
Last Updated: February 25, 2026
Current Version: 1.83.00
Status: Production Ready ✅
```
