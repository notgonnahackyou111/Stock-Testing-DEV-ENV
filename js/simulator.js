/**
 * Mock Stock Market Simulator
 * Generates realistic stock price movements
 */

class StockSimulator {
    constructor() {
        this.stocks = this.initializeStocks();
        this.portfolio = {
            cash: 10000,
            holdings: {}
        };
        this.priceHistory = {};
        this.startTime = Date.now();
        this.trades = [];
    }

    initializeStocks() {
        const stocks = [
            { symbol: 'TECH', name: 'TechCorp Inc.', price: 145.32, volatility: 0.025 },
            { symbol: 'BANK', name: 'Global Bank Co.', price: 87.50, volatility: 0.015 },
            { symbol: 'ENERGY', name: 'Energy Solutions Ltd.', price: 62.75, volatility: 0.035 },
            { symbol: 'HEALTH', name: 'HealthCare Plus', price: 203.45, volatility: 0.020 },
            { symbol: 'RETAIL', name: 'Retail Dynamics', price: 45.20, volatility: 0.030 }
        ];

        stocks.forEach(stock => {
            this.priceHistory[stock.symbol] = [stock.price];
        });

        return stocks;
    }

    /**
     * Update stock prices with random walk (realistic market movement)
     */
    updatePrices() {
        this.stocks.forEach(stock => {
            const previousPrice = stock.price;
            // Random walk with drift and volatility
            const randomChange = (Math.random() - 0.5) * stock.volatility * previousPrice;
            const drift = previousPrice * 0.0001; // slight upward drift
            stock.price = Math.max(previousPrice + randomChange + drift, 0.01);
            this.priceHistory[stock.symbol].push(stock.price);
        });
    }

    /**
     * Execute a buy order
     */
    buy(symbol, shares) {
        const stock = this.stocks.find(s => s.symbol === symbol);
        if (!stock) return { success: false, message: 'Stock not found' };

        const cost = stock.price * shares;
        if (cost > this.portfolio.cash) {
            return { success: false, message: 'Insufficient cash' };
        }

        this.portfolio.cash -= cost;
        this.portfolio.holdings[symbol] = (this.portfolio.holdings[symbol] || 0) + shares;
        this.trades.push({
            type: 'BUY',
            symbol,
            shares,
            price: stock.price,
            timestamp: Date.now()
        });

        return { success: true, message: `Bought ${shares} shares of ${symbol}` };
    }

    /**
     * Execute a sell order
     */
    sell(symbol, shares) {
        const stock = this.stocks.find(s => s.symbol === symbol);
        if (!stock) return { success: false, message: 'Stock not found' };

        const held = this.portfolio.holdings[symbol] || 0;
        if (shares > held) {
            return { success: false, message: 'Insufficient shares' };
        }

        const proceeds = stock.price * shares;
        this.portfolio.cash += proceeds;
        this.portfolio.holdings[symbol] -= shares;
        if (this.portfolio.holdings[symbol] === 0) delete this.portfolio.holdings[symbol];

        this.trades.push({
            type: 'SELL',
            symbol,
            shares,
            price: stock.price,
            timestamp: Date.now()
        });

        return { success: true, message: `Sold ${shares} shares of ${symbol}` };
    }

    /**
     * Get current portfolio value
     */
    getPortfolioValue() {
        let value = this.portfolio.cash;
        for (const [symbol, shares] of Object.entries(this.portfolio.holdings)) {
            const stock = this.stocks.find(s => s.symbol === symbol);
            if (stock) value += stock.price * shares;
        }
        return value;
    }

    /**
     * Get portfolio with current values
     */
    getPortfolioDetails() {
        const details = {
            cash: this.portfolio.cash,
            holdings: [],
            totalValue: this.getPortfolioValue()
        };

        for (const [symbol, shares] of Object.entries(this.portfolio.holdings)) {
            const stock = this.stocks.find(s => s.symbol === symbol);
            if (stock) {
                details.holdings.push({
                    symbol,
                    shares,
                    price: stock.price,
                    value: stock.price * shares
                });
            }
        }

        return details;
    }

    /**
     * Get stock data
     */
    getStocks() {
        return this.stocks;
    }

    /**
     * Get price history for a stock
     */
    getPriceHistory(symbol, limit = 50) {
        const history = this.priceHistory[symbol] || [];
        return history.slice(-limit);
    }
}

// Create global simulator instance
const simulator = new StockSimulator();
