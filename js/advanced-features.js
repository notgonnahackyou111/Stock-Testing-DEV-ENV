/**
 * Advanced Trading Features Module
 * Includes: Shorting, Margin Trading, Candlestick OHLC, Leaderboards, Watchlists
 */

class AdvancedTradingFeatures {
    constructor(simulator) {
        this.simulator = simulator;
        this.shortPositions = new Map(); // Symbol -> {shares, entryPrice, timestamp}
        this.marginAccount = {
            enabled: false,
            totalValue: 0,
            usedMargin: 0,
            availableMargin: 0,
            marginLevel: 0,
            marginCall: false
        };
        this.watchlists = new Map(); // name -> [symbols]
        this.candleData = new Map(); // Symbol -> [OHLC candles]
        this.leaderboard = [];
        this.botStats = new Map();
    }

    /**
     * SHORT SELLING FEATURES
     */

    /**
     * Open a short position
     */
    openShort(symbol, quantity) {
        const stock = this.simulator.stocks.find(s => s.symbol === symbol);
        if (!stock) {
            return { success: false, error: 'Stock not found' };
        }

        if (!this.simulator.portfolio.holdings.has(symbol)) {
            // Allow shorting even without holding the stock
            const shortCost = stock.price * quantity;
            
            this.shortPositions.set(symbol + '_short', {
                symbol: symbol,
                quantity: quantity,
                entryPrice: stock.price,
                currentPrice: stock.price,
                timestamp: Date.now(),
                type: 'short'
            });

            this.simulator.portfolio.cash += shortCost; // Receive proceeds
            return {
                success: true,
                message: `Shorted ${quantity} shares of ${symbol} at $${stock.price.toFixed(2)}`,
                position: this.shortPositions.get(symbol + '_short')
            };
        } else {
            return { success: false, error: 'Close existing long position first' };
        }
    }

    /**
     * Close a short position
     */
    closeShort(symbol, quantity) {
        const shortKey = symbol + '_short';
        const position = this.shortPositions.get(shortKey);

        if (!position) {
            return { success: false, error: 'No short position found' };
        }

        const stock = this.simulator.stocks.find(s => s.symbol === symbol);
        const closeCost = stock.price * quantity;
        const gain = (position.entryPrice - stock.price) * quantity; // Profit if stock fell

        this.simulator.portfolio.cash -= closeCost;

        if (quantity >= position.quantity) {
            this.shortPositions.delete(shortKey);
        } else {
            position.quantity -= quantity;
        }

        return {
            success: true,
            message: `Closed short position. Gain/Loss: $${gain.toFixed(2)}`,
            gain: gain
        };
    }

    /**
     * Get all short positions
     */
    getShortPositions() {
        return Array.from(this.shortPositions.values());
    }

    /**
     * MARGIN TRADING FEATURES
     */

    /**
     * Enable margin account
     */
    enableMargin(multiplier = 2) {
        // 2x margin means can trade with 2x buying power
        this.marginAccount.enabled = true;
        this.marginAccount.multiplier = multiplier;
        this.updateMarginLevel();

        return {
            success: true,
            message: `Margin enabled with ${multiplier}x multiplier`,
            account: this.marginAccount
        };
    }

    /**
     * Buy on margin
     */
    buyOnMargin(symbol, quantity, marginRatio = 0.5) {
        const stock = this.simulator.stocks.find(s => s.symbol === symbol);
        if (!stock) {
            return { success: false, error: 'Stock not found' };
        }

        if (!this.marginAccount.enabled) {
            return { success: false, error: 'Margin trading not enabled' };
        }

        const totalCost = stock.price * quantity;
        const marginRequired = totalCost * marginRatio; // Usually 50% margin requirement

        if (this.simulator.portfolio.cash < marginRequired) {
            return { success: false, error: 'Insufficient margin available' };
        }

        // Execute buy with margin
        const result = this.simulator.buy(symbol, quantity);
        
        if (result.success) {
            this.marginAccount.usedMargin += marginRequired;
            this.updateMarginLevel();

            return {
                success: true,
                message: `Bought ${quantity} shares on margin. Margin used: $${marginRequired.toFixed(2)}`,
                marginUsed: marginRequired
            };
        }

        return result;
    }

    /**
     * Update margin level and check for margin call
     */
    updateMarginLevel() {
        const equity = this.simulator.portfolio.totalValue;
        const debit = this.marginAccount.usedMargin;
        
        this.marginAccount.marginLevel = (equity / debit) * 100;
        this.marginAccount.marginCall = this.marginAccount.marginLevel < 130; // Typical maintenance margin
    }

    /**
     * Get margin account status
     */
    getMarginStatus() {
        this.updateMarginLevel();
        return {
            ...this.marginAccount,
            maintenanceMargin: 130, // 130% required level
            riskLevel: this.marginAccount.marginCall ? 'HIGH' : 'NORMAL'
        };
    }

    /**
     * CANDLESTICK & OHLC FEATURES
     */

    /**
     * Generate candlestick data
     */
    generateCandleData(symbol, period = 'daily') {
        if (!this.candleData.has(symbol)) {
            this.candleData.set(symbol, []);
        }

        const stock = this.simulator.stocks.find(s => s.symbol === symbol);
        if (!stock) return null;

        const history = this.simulator.priceHistory[symbol] || [];
        const candles = [];

        // Group prices into candles
        const periodSize = period === 'hourly' ? 60 : period === 'daily' ? 1440 : 5;
        
        for (let i = 0; i < history.length; i += periodSize) {
            const slice = history.slice(i, i + periodSize);
            if (slice.length === 0) continue;

            const open = slice[0];
            const close = slice[slice.length - 1];
            const high = Math.max(...slice);
            const low = Math.min(...slice);

            candles.push({
                timestamp: Date.now() - (history.length - i) * 60000,
                open: open,
                high: high,
                low: low,
                close: close,
                volume: Math.random() * 1000000,
                color: close >= open ? 'green' : 'red'
            });
        }

        this.candleData.set(symbol, candles);
        return candles;
    }

    /**
     * Get candlestick data for charting
     */
    getCandleData(symbol, limit = 100) {
        let candles = this.candleData.get(symbol);
        
        if (!candles || candles.length === 0) {
            candles = this.generateCandleData(symbol, 'daily');
        }

        return candles ? candles.slice(-limit) : [];
    }

    /**
     * Calculate technical indicators
     */
    calculateIndicators(symbol) {
        const candles = this.getCandleData(symbol);
        if (candles.length === 0) return null;

        const closes = candles.map(c => c.close);
        
        return {
            rsi: this.calculateRSI(closes),
            macd: this.calculateMACD(closes),
            bollinger: this.calculateBollingerBands(closes),
            stochastic: this.calculateStochastic(candles)
        };
    }

    /**
     * RSI (Relative Strength Index)
     */
    calculateRSI(prices, period = 14) {
        if (prices.length < period) return null;

        let gains = 0, losses = 0;
        
        for (let i = 1; i < period + 1; i++) {
            const diff = prices[i] - prices[i - 1];
            if (diff > 0) gains += diff;
            else losses += -diff;
        }

        let avgGain = gains / period;
        let avgLoss = losses / period;

        for (let i = period + 1; i < prices.length; i++) {
            const diff = prices[i] - prices[i - 1];
            avgGain = (avgGain * (period - 1) + (diff > 0 ? diff : 0)) / period;
            avgLoss = (avgLoss * (period - 1) + (diff < 0 ? -diff : 0)) / period;
        }

        const rs = avgGain / avgLoss;
        const rsi = 100 - (100 / (1 + rs));
        
        return {
            value: rsi.toFixed(2),
            overbought: rsi > 70,
            oversold: rsi < 30
        };
    }

    /**
     * MACD (Moving Average Convergence Divergence)
     */
    calculateMACD(prices) {
        const ema12 = this.calculateEMA(prices, 12);
        const ema26 = this.calculateEMA(prices, 26);
        const macd = ema12 - ema26;
        const signal = this.calculateEMA([macd], 9);
        const histogram = macd - signal;

        return {
            macd: macd.toFixed(4),
            signal: signal.toFixed(4),
            histogram: histogram.toFixed(4),
            bullish: macd > signal
        };
    }

    /**
     * Bollinger Bands
     */
    calculateBollingerBands(prices, period = 20, stdDev = 2) {
        if (prices.length < period) return null;

        const sma = prices.slice(-period).reduce((a, b) => a + b, 0) / period;
        const variance = prices.slice(-period)
            .reduce((sum, price) => sum + Math.pow(price - sma, 2), 0) / period;
        const sd = Math.sqrt(variance);

        return {
            upper: (sma + stdDev * sd).toFixed(2),
            middle: sma.toFixed(2),
            lower: (sma - stdDev * sd).toFixed(2)
        };
    }

    /**
     * Stochastic Oscillator
     */
    calculateStochastic(candles, period = 14) {
        if (candles.length < period) return null;

        const slice = candles.slice(-period);
        const high = Math.max(...slice.map(c => c.high));
        const low = Math.min(...slice.map(c => c.low));
        const close = slice[slice.length - 1].close;

        const k = ((close - low) / (high - low)) * 100;

        return {
            k: k.toFixed(2),
            overbought: k > 80,
            oversold: k < 20
        };
    }

    /**
     * Calculate EMA (Exponential Moving Average)
     */
    calculateEMA(prices, period) {
        if (prices.length < period) return null;

        const k = 2 / (period + 1);
        let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;

        for (let i = period; i < prices.length; i++) {
            ema = prices[i] * k + ema * (1 - k);
        }

        return ema;
    }

    /**
     * WATCHLIST FEATURES
     */

    /**
     * Create a new watchlist
     */
    createWatchlist(name) {
        if (this.watchlists.has(name)) {
            return { success: false, error: 'Watchlist already exists' };
        }

        this.watchlists.set(name, []);
        return { success: true, message: `Watchlist '${name}' created` };
    }

    /**
     * Add symbol to watchlist
     */
    addToWatchlist(watchlistName, symbol) {
        if (!this.watchlists.has(watchlistName)) {
            return { success: false, error: 'Watchlist not found' };
        }

        const watchlist = this.watchlists.get(watchlistName);
        if (!watchlist.includes(symbol)) {
            watchlist.push(symbol);
        }

        return { success: true, message: `Added ${symbol} to '${watchlistName}'` };
    }

    /**
     * Remove symbol from watchlist
     */
    removeFromWatchlist(watchlistName, symbol) {
        if (!this.watchlists.has(watchlistName)) {
            return { success: false, error: 'Watchlist not found' };
        }

        const watchlist = this.watchlists.get(watchlistName);
        const index = watchlist.indexOf(symbol);
        
        if (index > -1) {
            watchlist.splice(index, 1);
        }

        return { success: true, message: `Removed ${symbol} from '${watchlistName}'` };
    }

    /**
     * Get watchlist
     */
    getWatchlist(name) {
        return this.watchlists.get(name) || null;
    }

    /**
     * Get all watchlists
     */
    getAllWatchlists() {
        const result = {};
        this.watchlists.forEach((symbols, name) => {
            const withPrices = symbols.map(s => {
                const stock = this.simulator.stocks.find(st => st.symbol === s);
                return {
                    symbol: s,
                    price: stock ? stock.price : 0
                };
            });
            result[name] = withPrices;
        });
        return result;
    }

    /**
     * LEADERBOARD FEATURES
     */

    /**
     * Record bot performance
     */
    recordBotPerformance(botName, stats) {
        const entry = {
            rank: 0,
            botName: botName,
            returnPercent: stats.returnPercent || 0,
            totalTrades: stats.totalTrades || 0,
            winRate: stats.winRate || 0,
            profit: stats.profit || 0,
            timestamp: Date.now(),
            drawdown: stats.drawdown || 0
        };

        this.botStats.set(botName, entry);
        this.updateLeaderboard();

        return { success: true, message: 'Bot performance recorded' };
    }

    /**
     * Update leaderboard rankings
     */
    updateLeaderboard() {
        this.leaderboard = Array.from(this.botStats.values())
            .sort((a, b) => b.returnPercent - a.returnPercent)
            .map((entry, index) => ({
                ...entry,
                rank: index + 1
            }));
    }

    /**
     * Get leaderboard
     */
    getLeaderboard(limit = 10) {
        return this.leaderboard.slice(0, limit);
    }

    /**
     * Get bot rank
     */
    getBotRank(botName) {
        return this.botStats.get(botName) || null;
    }

    /**
     * Get all stats
     */
    getAllBotStats() {
        return Array.from(this.botStats.values());
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdvancedTradingFeatures;
}
