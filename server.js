/**
 * Stock Testing Bot API Server
 * Real-time WebSocket and REST API for trading bot connections
 * 
 * Run with: node server.js
 * Port: 8000
 */

const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

/**
 * Attempt to bind the HTTP server on one of the provided ports.
 * If the first port is already in use, try the next, etc.
 * When successful we update `PORT` and start listening.
 */
function tryListen(portIndex) {
    if (portIndex >= PORTS.length) {
        console.error('Failed to bind to any port in', PORTS);
        process.exit(1);
    }

    const attempt = PORTS[portIndex];
    server.listen(attempt, () => {
        PORT = attempt;
        console.log(`Server listening on port ${PORT}`);
    });

    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.warn(`Port ${attempt} in use, trying next backup port`);
            tryListen(portIndex + 1);
        } else {
            console.error('Server error:', err);
            process.exit(1);
        }
    });
}

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '.')));

// Configuration
// support a list of ports (primary + backups) via env var, e.g. "8000,8001,8002".
// the server will try each port in order until one is free.
const parsePorts = (str) => {
    if (!str) return [8000];
    return str.split(',').map(p => parseInt(p, 10)).filter(n => !isNaN(n));
};
let PORTS = parsePorts(process.env.PORTS || process.env.PORT);
if (PORTS.length === 0) PORTS = [8000];
let PORT = PORTS[0];
const API_VERSION = '1.0.0';

// In-memory data stores
const bots = new Map();
const orders = new Map();
const portfolios = new Map();
const subscriptions = new Map();
const marketData = new Map();
let orderIdCounter = 1000;
let botIdCounter = 1;

// Initialize with sample stock data
const STOCKS = require('./js/stocks-data.js').REAL_STOCKS || [];
const initializeMarketData = () => {
    STOCKS.forEach(stock => {
        marketData.set(stock.symbol, {
            symbol: stock.symbol,
            price: stock.basePrice,
            high52Week: stock.high52Week,
            low52Week: stock.low52Week,
            avgVolume: stock.avgVolume,
            marketCap: stock.marketCap,
            type: stock.type,
            lastUpdate: Date.now()
        });
    });
};

/**
 * REST API Endpoints
 */

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        version: API_VERSION,
        timestamp: new Date()
    });
});

// Register Bot
app.post('/api/bot/register', (req, res) => {
    const { name, type, api_key, description } = req.body;

    if (!name || !api_key) {
        return res.status(400).json({
            error: 'Missing required fields: name, api_key'
        });
    }

    const botId = `bot_${botIdCounter++}`;
    const bot = {
        id: botId,
        name: name,
        type: type || 'Python',
        api_key: api_key,
        description: description || '',
        registeredAt: new Date(),
        lastHeartbeat: new Date(),
        status: 'connected',
        totalOrders: 0,
        filledOrders: 0,
        rejectedOrders: 0
    };

    bots.set(botId, bot);

    // Initialize portfolio for bot
    portfolios.set(botId, {
        cash: 100000,
        holdings: new Map(),
        totalValue: 100000,
        realizedGains: 0,
        unrealizedGains: 0
    });

    res.status(201).json({
        success: true,
        bot_id: botId,
        message: `Bot '${name}' registered successfully`,
        api_endpoint: `/api/bot/${botId}`
    });
});

// Get Bot Status
app.get('/api/bot/:botId', (req, res) => {
    const { botId } = req.params;
    const bot = bots.get(botId);

    if (!bot) {
        return res.status(404).json({ error: 'Bot not found' });
    }

    res.json(bot);
});

// Disconnect Bot
app.post('/api/bot/:botId/disconnect', (req, res) => {
    const { botId } = req.params;
    const bot = bots.get(botId);

    if (!bot) {
        return res.status(404).json({ error: 'Bot not found' });
    }

    bot.status = 'disconnected';
    bot.lastHeartbeat = new Date();

    res.json({
        success: true,
        message: `Bot '${bot.name}' disconnected`
    });
});

// Place Order
app.post('/api/bot/order', (req, res) => {
    const { bot_id, symbol, action, quantity, limit_price, api_key } = req.body;

    // Validate authentication
    const bot = bots.get(bot_id);
    if (!bot || bot.api_key !== api_key) {
        return res.status(401).json({ error: 'Invalid bot_id or api_key' });
    }

    // Validate order
    if (!symbol || !action || !quantity) {
        return res.status(400).json({
            error: 'Missing required fields: symbol, action, quantity'
        });
    }

    if (!['buy', 'sell'].includes(action.toLowerCase())) {
        return res.status(400).json({
            error: 'Invalid action. Must be "buy" or "sell"'
        });
    }

    const market = marketData.get(symbol.toUpperCase());
    if (!market) {
        return res.status(404).json({ error: `Symbol '${symbol}' not found` });
    }

    const orderId = `order_${orderIdCounter++}`;
    const price = limit_price || market.price;
    const totalCost = price * quantity;

    const portfolio = portfolios.get(bot_id);
    const order = {
        id: orderId,
        bot_id: bot_id,
        symbol: symbol.toUpperCase(),
        action: action.toLowerCase(),
        quantity: quantity,
        price: price,
        totalCost: totalCost,
        status: 'pending',
        createdAt: new Date(),
        filledAt: null,
        commission: totalCost * 0.001 // 0.1% commission
    };

    // Check if order can be filled
    let filled = false;
    if (action.toLowerCase() === 'buy') {
        if (portfolio.cash >= totalCost + order.commission) {
            filled = true;
        }
    } else if (action.toLowerCase() === 'sell') {
        const holding = portfolio.holdings.get(symbol.toUpperCase());
        if (holding && holding.quantity >= quantity) {
            filled = true;
        }
    }

    if (filled) {
        // Execute order
        order.status = 'filled';
        order.filledAt = new Date();

        if (action.toLowerCase() === 'buy') {
            portfolio.cash -= totalCost + order.commission;
            const holding = portfolio.holdings.get(symbol.toUpperCase());
            if (holding) {
                holding.quantity += quantity;
                holding.costBasis += totalCost;
            } else {
                portfolio.holdings.set(symbol.toUpperCase(), {
                    symbol: symbol.toUpperCase(),
                    quantity: quantity,
                    costBasis: totalCost,
                    currentPrice: price
                });
            }
        } else if (action.toLowerCase() === 'sell') {
            portfolio.cash += (totalCost - order.commission);
            const holding = portfolio.holdings.get(symbol.toUpperCase());
            if (holding) {
                holding.quantity -= quantity;
                if (holding.quantity === 0) {
                    portfolio.holdings.delete(symbol.toUpperCase());
                }
            }
        }

        bot.filledOrders++;
    } else {
        order.status = 'rejected';
        order.rejectReason = action.toLowerCase() === 'buy'
            ? 'Insufficient cash'
            : 'Insufficient shares';
        bot.rejectedOrders++;
    }

    bot.totalOrders++;
    orders.set(orderId, order);

    // Broadcast order to subscribed clients
    broadcastOrderUpdate(orderId, order);

    res.status(filled ? 201 : 400).json({
        success: filled,
        order_id: orderId,
        status: order.status,
        message: filled ? 'Order filled successfully' : `Order rejected: ${order.rejectReason}`
    });
});

// Get Market Data
app.get('/api/market/data', (req, res) => {
    const { symbol } = req.query;

    if (symbol) {
        const market = marketData.get(symbol.toUpperCase());
        if (market) {
            return res.json(market);
        } else {
            return res.status(404).json({ error: 'Symbol not found' });
        }
    }

    // Return all market data
    const allMarkets = Array.from(marketData.values());
    res.json(allMarkets);
});

// Get Portfolio
app.get('/api/portfolio', (req, res) => {
    const { bot_id } = req.query;

    if (!bot_id) {
        return res.status(400).json({ error: 'Missing bot_id' });
    }

    const portfolio = portfolios.get(bot_id);
    if (!portfolio) {
        return res.status(404).json({ error: 'Portfolio not found' });
    }

    // Calculate portfolio value
    let totalValue = portfolio.cash;
    const holdings = [];

    portfolio.holdings.forEach((holding) => {
        const market = marketData.get(holding.symbol);
        const currentValue = (market ? market.price : 0) * holding.quantity;
        totalValue += currentValue;
        holdings.push({
            symbol: holding.symbol,
            quantity: holding.quantity,
            costBasis: holding.costBasis,
            currentValue: currentValue,
            gainLoss: currentValue - holding.costBasis
        });
    });

    res.json({
        bot_id: bot_id,
        cash: portfolio.cash,
        holdings: holdings,
        totalValue: totalValue,
        realizedGains: portfolio.realizedGains,
        unrealizedGains: totalValue - 100000, // Assuming 100k starting
        percentReturn: ((totalValue - 100000) / 100000 * 100).toFixed(2) + '%'
    });
});

// Get Bot Statistics
app.get('/api/bot/:botId/stats', (req, res) => {
    const { botId } = req.params;
    const bot = bots.get(botId);

    if (!bot) {
        return res.status(404).json({ error: 'Bot not found' });
    }

    const portfolio = portfolios.get(botId);
    const profit = portfolio ? portfolio.unrealizedGains : 0;

    res.json({
        bot_id: botId,
        name: bot.name,
        status: bot.status,
        registeredAt: bot.registeredAt,
        lastHeartbeat: bot.lastHeartbeat,
        totalOrders: bot.totalOrders,
        filledOrders: bot.filledOrders,
        rejectedOrders: bot.rejectedOrders,
        winRate: bot.filledOrders + bot.rejectedOrders > 0
            ? (bot.filledOrders / (bot.filledOrders + bot.rejectedOrders) * 100).toFixed(2) + '%'
            : '0%',
        currentProfit: profit,
        profitPercentage: portfolio ? ((profit / 100000) * 100).toFixed(2) + '%' : '0%'
    });
});

// Get Order History
app.get('/api/bot/:botId/orders', (req, res) => {
    const { botId } = req.params;
    
    const botOrders = Array.from(orders.values())
        .filter(order => order.bot_id === botId);

    res.json({
        bot_id: botId,
        orders: botOrders,
        total: botOrders.length,
        filled: botOrders.filter(o => o.status === 'filled').length,
        rejected: botOrders.filter(o => o.status === 'rejected').length
    });
});

/**
 * WebSocket Handlers
 */

wss.on('connection', (ws) => {
    console.log('Client connected');
    const clientId = Math.random().toString(36).substr(2, 9);

    // Handle incoming messages
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);

            switch (data.type) {
                case 'subscribe':
                    handleSubscribe(clientId, ws, data);
                    break;
                case 'unsubscribe':
                    handleUnsubscribe(clientId, data);
                    break;
                case 'ping':
                    ws.send(JSON.stringify({ type: 'pong', timestamp: new Date() }));
                    break;
                default:
                    ws.send(JSON.stringify({ error: 'Unknown message type' }));
            }
        } catch (error) {
            console.error('WebSocket error:', error);
            ws.send(JSON.stringify({ error: 'Invalid message format' }));
        }
    });

    ws.on('close', () => {
        console.log('Client disconnected');
        subscriptions.delete(clientId);
    });
});

function handleSubscribe(clientId, ws, data) {
    const { channel } = data;

    if (!subscriptions.has(clientId)) {
        subscriptions.set(clientId, new Set());
    }

    subscriptions.get(clientId).add(channel);

    // Send initial data based on channel
    if (channel === 'market_data') {
        ws.send(JSON.stringify({
            type: 'market_snapshot',
            data: Array.from(marketData.values())
        }));
    }

    ws.send(JSON.stringify({
        type: 'subscribed',
        channel: channel,
        message: `Subscribed to ${channel}`
    }));
}

function handleUnsubscribe(clientId, data) {
    const { channel } = data;

    if (subscriptions.has(clientId)) {
        subscriptions.get(clientId).delete(channel);
    }
}

function broadcastOrderUpdate(orderId, order) {
    const message = JSON.stringify({
        type: 'order_update',
        order_id: orderId,
        status: order.status,
        data: order
    });

    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

/**
 * Market Data Updates
 */

// Simulate price updates every 5 seconds
setInterval(() => {
    const updated = [];

    marketData.forEach((stock, symbol) => {
        // Simulate small price movements
        const changePercent = (Math.random() - 0.5) * 0.02; // ±1%
        const multiplier = 1 + changePercent;
        stock.price = Math.max(0.01, stock.price * multiplier);
        stock.lastUpdate = Date.now();

        updated.push({
            symbol: symbol,
            price: stock.price,
            change: (stock.price * changePercent).toFixed(2),
            changePercent: (changePercent * 100).toFixed(2) + '%'
        });
    });

    // Broadcast to WebSocket subscribers
    const message = JSON.stringify({
        type: 'market_update',
        data: updated,
        timestamp: new Date()
    });

    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}, 5000);

/**
 * Error Handling
 */

app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

app.use((req, res) => {
    res.status(404).json({
        error: 'Endpoint not found',
        path: req.path,
        method: req.method
    });
});

/**
 * Server Startup
 */

server.listen(PORT, () => {
    console.log(`
    ╔══════════════════════════════════════════════╗
    ║     Stock Testing Bot API Server v${API_VERSION}      ║
    ║          Running on port ${PORT}                  ║
    ╚══════════════════════════════════════════════╝
    
    REST API: http://localhost:${PORT}/api
    WebSocket: ws://localhost:${PORT}
    Health Check: http://localhost:${PORT}/health
    
    Available endpoints:
    ✓ POST   /api/bot/register
    ✓ GET    /api/bot/:botId
    ✓ POST   /api/bot/:botId/disconnect
    ✓ POST   /api/bot/order
    ✓ GET    /api/market/data
    ✓ GET    /api/portfolio
    ✓ GET    /api/bot/:botId/stats
    ✓ GET    /api/bot/:botId/orders
    ✓ POST   /api/bot/:botId/training/start
    ✓ POST   /api/bot/:botId/training/stop
    ✓ POST   /api/bot/:botId/training/reset
    ✓ GET    /api/bot/:botId/training/stats
    ✓ WS     (WebSocket for real-time updates)
    `);

    initializeMarketData();
});

// Bot Training Simulation Endpoints
const trainingSessions = new Map();

app.post('/api/bot/:botId/training/start', (req, res) => {
    const { botId } = req.params;
    const bot = bots.get(botId);
    
    if (!bot) {
        return res.status(404).json({ error: 'Bot not found' });
    }

    // Create training session if it doesn't exist
    if (!trainingSessions.has(botId)) {
        trainingSessions.set(botId, {
            isRunning: true,
            startTime: Date.now(),
            trades: [],
            successfulTrades: 0,
            failedTrades: 0
        });
    }

    const session = trainingSessions.get(botId);
    session.isRunning = true;
    session.lastStartTime = Date.now();

    res.json({
        success: true,
        message: 'Training started',
        session: session
    });

    // Simulate trading activity every 1-3 seconds
    simulateBotTrading(botId);
});

app.post('/api/bot/:botId/training/stop', (req, res) => {
    const { botId } = req.params;
    const session = trainingSessions.get(botId);

    if (session) {
        session.isRunning = false;
    }

    res.json({
        success: true,
        message: 'Training stopped'
    });
});

app.post('/api/bot/:botId/training/reset', (req, res) => {
    const { botId } = req.params;
    
    // Reset portfolio
    portfolios.set(botId, {
        cash: 100000,
        holdings: new Map(),
        totalValue: 100000,
        realizedGains: 0,
        unrealizedGains: 0
    });

    // Reset session
    trainingSessions.delete(botId);

    res.json({
        success: true,
        message: 'Training session reset'
    });
});

app.get('/api/bot/:botId/training/stats', (req, res) => {
    const { botId } = req.params;
    const portfolio = portfolios.get(botId);
    const session = trainingSessions.get(botId);

    if (!portfolio) {
        return res.status(404).json({ error: 'Portfolio not found' });
    }

    // Calculate portfolio value
    let totalValue = portfolio.cash;
    let holdingsValue = 0;
    const holdings = [];

    portfolio.holdings.forEach((holding) => {
        const market = marketData.get(holding.symbol);
        const currentPrice = market ? market.price : 0;
        const currentValue = currentPrice * holding.quantity;
        holdingsValue += currentValue;
        totalValue += currentValue;

        holdings.push({
            symbol: holding.symbol,
            quantity: holding.quantity,
            price: currentPrice,
            value: currentValue,
            gainLoss: currentValue - holding.costBasis
        });
    });

    // Get recent trades
    const botTrades = Array.from(orders.values())
        .filter(o => o.bot_id === botId)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const stats = {
        botId: botId,
        cash: portfolio.cash,
        totalValue: totalValue,
        holdingsValue: holdingsValue,
        holdings: holdings,
        recentTrades: botTrades.slice(0, 50).map(t => ({
            action: t.action.toUpperCase(),
            symbol: t.symbol,
            quantity: t.quantity,
            price: t.price,
            timestamp: t.createdAt,
            status: t.status
        })),
        totalTrades: botTrades.length,
        successfulTrades: botTrades.filter(t => t.status === 'filled').length,
        failedTrades: botTrades.filter(t => t.status === 'rejected').length,
        isTraining: session ? session.isRunning : false
    };

    res.json(stats);
});

function simulateBotTrading(botId) {
    const session = trainingSessions.get(botId);
    if (!session || !session.isRunning) return;

    // Get random stock from market and make a trade decision
    const randomInterval = setInterval(async () => {
        if (!session || !session.isRunning) {
            clearInterval(randomInterval);
            return;
        }

        try {
            const allMarkets = Array.from(marketData.values());
            const randomStock = allMarkets[Math.floor(Math.random() * allMarkets.length)];
            const portfolio = portfolios.get(botId);
            const shouldBuy = Math.random() > 0.5;

            if (shouldBuy) {
                // Try to buy
                const quantity = Math.floor(Math.random() * 10) + 1;
                const cost = randomStock.price * quantity;

                if (portfolio.cash >= cost) {
                    // Execute buy
                    portfolio.cash -= cost;
                    const holding = portfolio.holdings.get(randomStock.symbol);
                    if (holding) {
                        holding.quantity += quantity;
                        holding.costBasis += cost;
                    } else {
                        portfolio.holdings.set(randomStock.symbol, {
                            symbol: randomStock.symbol,
                            quantity: quantity,
                            costBasis: cost,
                            currentPrice: randomStock.price
                        });
                    }

                    const orderId = `order_${orderIdCounter++}`;
                    orders.set(orderId, {
                        id: orderId,
                        bot_id: botId,
                        symbol: randomStock.symbol,
                        action: 'buy',
                        quantity: quantity,
                        price: randomStock.price,
                        status: 'filled',
                        createdAt: new Date(),
                        filledAt: new Date()
                    });

                    session.successfulTrades++;
                    broadcastOrderUpdate(orderId, orders.get(orderId));
                }
            } else {
                // Try to sell
                const holdings = Array.from(portfolio.holdings.values());
                if (holdings.length > 0) {
                    const holding = holdings[Math.floor(Math.random() * holdings.length)];
                    const quantity = Math.min(
                        Math.floor(Math.random() * holding.quantity) + 1,
                        holding.quantity
                    );

                    portfolio.cash += holding.currentPrice * quantity;
                    holding.quantity -= quantity;
                    if (holding.quantity === 0) {
                        portfolio.holdings.delete(holding.symbol);
                    }

                    const orderId = `order_${orderIdCounter++}`;
                    orders.set(orderId, {
                        id: orderId,
                        bot_id: botId,
                        symbol: holding.symbol,
                        action: 'sell',
                        quantity: quantity,
                        price: holding.currentPrice,
                        status: 'filled',
                        createdAt: new Date(),
                        filledAt: new Date()
                    });

                    session.successfulTrades++;
                    broadcastOrderUpdate(orderId, orders.get(orderId));
                }
            }
        } catch (e) {
            console.error('[Training] Simulation error:', e);
        }
    }, Math.random() * 2000 + 1000); // Random interval between 1-3 seconds
}

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down gracefully...');
    wss.clients.forEach((client) => {
        client.close();
    });
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

module.exports = { app, server, wss };
