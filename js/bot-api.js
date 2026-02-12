/**
 * Trading Bot API & Connector Framework
 * Allows external trading bots to connect and trade in the simulator
 */

class BotAPIServer {
    constructor() {
        this.connectedBots = new Map();
        this.botSessions = new Map();
        this.orderBook = [];
        this.subscriptions = new Map();
        this.port = 8080;
        this.isRunning = false;
        this.eventEmitter = new EventTarget();
    }

    /**
     * Start the API server (simulated - in real environment would use Node.js/Express)
     */
    initialize(simulator) {
        this.simulator = simulator;
        this.isRunning = true;
        console.log('[BotAPI] Server initialized on port ' + this.port);
        return {
            success: true,
            message: 'Bot API server ready',
            apiEndpoint: `ws://localhost:${this.port}`,
            restEndpoint: `http://localhost:${this.port}/api`
        };
    }

    /**
     * Register a new bot connection
     */
    registerBot(botConfig) {
        const botId = this.generateBotId();
        const botSession = {
            botId,
            name: botConfig.name || 'Unnamed Bot',
            type: botConfig.type || 'custom', // custom, alpaca, coinbase, binance, etc
            apiKey: botConfig.apiKey,
            status: 'connected',
            connectedAt: new Date(),
            stats: {
                tradesExecuted: 0,
                ordersPlaced: 0,
                ordersExecuted: 0,
                ordersRejected: 0,
                totalProfitLoss: 0,
                winRate: 0
            },
            subscriptions: []
        };

        this.botSessions.set(botId, botSession);
        this.connectedBots.set(botId, {
            config: botConfig,
            lastHeartbeat: Date.now(),
            errors: []
        });

        console.log(`[BotAPI] Bot registered: ${botId}`);

        return {
            success: true,
            botId,
            message: `Bot "${botSession.name}" connected successfully`,
            session: botSession
        };
    }

    /**
     * Disconnect a bot
     */
    disconnectBot(botId) {
        if (!this.botSessions.has(botId)) {
            return { success: false, error: 'Bot not found' };
        }

        const session = this.botSessions.get(botId);
        session.status = 'disconnected';
        session.disconnectedAt = new Date();

        this.connectedBots.delete(botId);

        console.log(`[BotAPI] Bot disconnected: ${botId}`);

        return { success: true, message: 'Bot disconnected' };
    }

    /**
     * Place an order (bot -> simulator)
     */
    placeOrder(botId, orderData) {
        if (!this.botSessions.has(botId)) {
            return { success: false, error: 'Bot not found' };
        }

        const { symbol, side, quantity, orderType, price } = orderData;

        // Validate order
        if (!symbol || !side || !quantity) {
            return { success: false, error: 'Missing required fields: symbol, side, quantity' };
        }

        if (!['BUY', 'SELL'].includes(side.toUpperCase())) {
            return { success: false, error: 'Invalid side. Must be BUY or SELL' };
        }

        if (quantity <= 0) {
            return { success: false, error: 'Quantity must be positive' };
        }

        const orderId = this.generateOrderId();
        const order = {
            orderId,
            botId,
            symbol,
            side: side.toUpperCase(),
            quantity,
            orderType: orderType || 'MARKET',
            price,
            status: 'PENDING',
            createdAt: new Date(),
            filledAt: null,
            avgFillPrice: null,
            filledQuantity: 0
        };

        // Execute order through simulator
        const result = this.executeOrderThroughSimulator(botId, order);

        if (result.success) {
            order.status = 'FILLED';
            order.filledAt = new Date();
            order.avgFillPrice = result.fillPrice;
            order.filledQuantity = result.filledQuantity;

            const session = this.botSessions.get(botId);
            session.stats.ordersExecuted++;
            session.stats.tradesExecuted++;
        } else {
            order.status = 'REJECTED';
            const session = this.botSessions.get(botId);
            session.stats.ordersRejected++;
        }

        this.orderBook.push(order);

        return {
            success: result.success,
            orderId,
            order,
            message: result.message
        };
    }

    /**
     * Execute order through the simulator
     */
    executeOrderThroughSimulator(botId, order) {
        if (!this.simulator) {
            return { success: false, message: 'Simulator not available' };
        }

        try {
            const stock = this.simulator.stocks.find(s => s.symbol === order.symbol);
            if (!stock) {
                return { success: false, message: `Stock ${order.symbol} not found` };
            }

            let result;
            if (order.side === 'BUY') {
                result = this.simulator.buy(order.symbol, order.quantity);
            } else {
                result = this.simulator.sell(order.symbol, order.quantity);
            }

            if (result.success) {
                return {
                    success: true,
                    fillPrice: stock.price,
                    filledQuantity: order.quantity,
                    message: result.message
                };
            } else {
                return { success: false, message: result.message };
            }
        } catch (error) {
            return { success: false, message: 'Order execution error: ' + error.message };
        }
    }

    /**
     * Get market data for a stock (bot -> market data)
     */
    getMarketData(symbol) {
        if (!this.simulator) {
            return { success: false, error: 'Simulator not available' };
        }

        const stock = this.simulator.stocks.find(s => s.symbol === symbol);
        if (!stock) {
            return { success: false, error: `Stock ${symbol} not found` };
        }

        const history = this.simulator.getPriceHistory(symbol, 100);
        const high = Math.max(...history);
        const low = Math.min(...history);
        const prevPrice = history[history.length - 2] || stock.price;
        const change = stock.price - prevPrice;
        const changePercent = ((change / prevPrice) * 100).toFixed(2);

        return {
            success: true,
            symbol,
            price: stock.price,
            bid: stock.price * 0.9999, // Simulated bid
            ask: stock.price * 1.0001, // Simulated ask
            high52Week: Math.max(...history),
            low52Week: Math.min(...history),
            priceChange: changePercent,
            volume: Math.floor(Math.random() * 50000000) + 1000000,
            marketCap: stock.price * 500,
            timestamp: new Date()
        };
    }

    /**
     * Get portfolio data
     */
    getPortfolioData(botId) {
        if (!this.simulator) {
            return { success: false, error: 'Simulator not available' };
        }

        const portfolio = this.simulator.getPortfolioDetails();

        return {
            success: true,
            botId,
            cash: portfolio.cash,
            holdings: portfolio.holdings,
            totalValue: portfolio.totalValue,
            profitLoss: portfolio.profitLoss,
            profitLossPercent: portfolio.profitLossPercent,
            timestamp: new Date()
        };
    }

    /**
     * Subscribe bot to real-time updates
     */
    subscribeToUpdates(botId, updateTypes) {
        if (!this.botSessions.has(botId)) {
            return { success: false, error: 'Bot not found' };
        }

        const session = this.botSessions.get(botId);
        session.subscriptions = updateTypes; // priceUpdates, orderFills, portfolioUpdates

        return { success: true, message: 'Subscriptions updated' };
    }

    /**
     * Get bot performance stats
     */
    getBotStats(botId) {
        if (!this.botSessions.has(botId)) {
            return { success: false, error: 'Bot not found' };
        }

        const session = this.botSessions.get(botId);
        return {
            success: true,
            botId,
            stats: session.stats,
            uptime: Date.now() - session.connectedAt.getTime()
        };
    }

    /**
     * Get order status
     */
    getOrderStatus(orderId) {
        const order = this.orderBook.find(o => o.orderId === orderId);
        if (!order) {
            return { success: false, error: 'Order not found' };
        }

        return { success: true, order };
    }

    /**
     * Get all orders for a bot
     */
    getBotOrders(botId) {
        const orders = this.orderBook.filter(o => o.botId === botId);
        return {
            success: true,
            botId,
            orders,
            totalOrders: orders.length,
            executedOrders: orders.filter(o => o.status === 'FILLED').length,
            rejectedOrders: orders.filter(o => o.status === 'REJECTED').length
        };
    }

    /**
     * List all connected bots
     */
    listConnectedBots() {
        const bots = Array.from(this.botSessions.values());
        return {
            success: true,
            totalBots: bots.length,
            bots
        };
    }

    /**
     * Generate unique bot ID
     */
    generateBotId() {
        return 'BOT_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    }

    /**
     * Generate unique order ID
     */
    generateOrderId() {
        return 'ORD_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    }

    /**
     * Check bot heartbeat
     */
    checkHeartbeat(botId) {
        if (!this.connectedBots.has(botId)) {
            return { success: false, error: 'Bot not connected' };
        }

        const bot = this.connectedBots.get(botId);
        bot.lastHeartbeat = Date.now();

        return { success: true, status: 'alive' };
    }
}

// Global bot API instance
let botAPI = null;

function initializeBotAPI(simulator) {
    botAPI = new BotAPIServer();
    return botAPI.initialize(simulator);
}
