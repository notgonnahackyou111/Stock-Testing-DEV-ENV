/**
 * Backtesting Engine
 * SimulateTrading strategies against historical or simulated market data
 * Provides comprehensive analytics on strategy performance
 */

const { REAL_STOCKS } = require('./js/stocks-data.js') || {};

class BacktestEngine {
    constructor(options = {}) {
        this.startDate = new Date(options.startDate || '2025-01-01');
        this.endDate = new Date(options.endDate || new Date());
        this.initialCapital = options.initialCapital || 100000;
        this.trades = [];
        this.portfolio = {
            cash: this.initialCapital,
            holdings: {}
        };
        this.equity = [];
        this.priceHistory = {};
        this.results = null;
    }

    /**
     * Initialize price history for stocks
     * In production, would fetch from real historical data
     */
    initializePriceHistory(symbols) {
        for (let symbol of symbols) {
            const stock = REAL_STOCKS?.find(s => s.symbol === symbol);
            if (stock) {
                this.priceHistory[symbol] = [
                    {
                        date: this.startDate,
                        open: stock.basePrice,
                        high: stock.basePrice * 1.02,
                        low: stock.basePrice * 0.98,
                        close: stock.basePrice,
                        volume: stock.avgVolume
                    }
                ];
            }
        }
    }

    /**
     * Simulate price movement for a day
     */
    simulateDayPrice(symbol, bars = 1) {
        if (!this.priceHistory[symbol]) return null;

        const history = this.priceHistory[symbol];
        const lastBar = history[history.length - 1];
        const stock = REAL_STOCKS?.find(s => s.symbol === symbol);
        
        if (!stock) return null;

        // Generate random price movement based on volatility
        const changePercent = (Math.random() - 0.5) * stock.volatility * 2;
        const newClose = lastBar.close * (1 + changePercent);

        const newBar = {
            date: new Date(lastBar.date.getTime() + bars * 24 * 60 * 60 * 1000),
            open: lastBar.close,
            high: Math.max(lastBar.close, newClose) * 1.01,
            low: Math.min(lastBar.close, newClose) * 0.99,
            close: newClose,
            volume: stock.avgVolume
        };

        history.push(newBar);
        return newBar;
    }

    /**
     * Execute a buy trade
     */
    buyStock(symbol, quantity, price, date) {
        const cost = quantity * price;
        
        if (cost > this.portfolio.cash) {
            throw new Error(`Insufficient cash. Need $${cost}, have $${this.portfolio.cash}`);
        }

        this.portfolio.cash -= cost;
        
        if (!this.portfolio.holdings[symbol]) {
            this.portfolio.holdings[symbol] = {
                quantity: 0,
                avgCost: 0,
                totalCost: 0
            };
        }

        const holding = this.portfolio.holdings[symbol];
        const newTotal = holding.totalCost + cost;
        holding.quantity += quantity;
        holding.avgCost = newTotal / holding.quantity;
        holding.totalCost = newTotal;

        this.trades.push({
            date,
            symbol,
            action: 'BUY',
            quantity,
            price,
            cost
        });
    }

    /**
     * Execute a sell trade
     */
    sellStock(symbol, quantity, price, date) {
        const holding = this.portfolio.holdings[symbol];
        
        if (!holding || holding.quantity < quantity) {
            throw new Error(`Cannot sell ${quantity} ${symbol}. Only have ${holding?.quantity || 0}`);
        }

        const proceeds = quantity * price;
        const costBasis = quantity * holding.avgCost;
        const gain = proceeds - costBasis;

        holding.quantity -= quantity;
        if (holding.quantity === 0) {
            delete this.portfolio.holdings[symbol];
        }

        this.portfolio.cash += proceeds;

        this.trades.push({
            date,
            symbol,
            action: 'SELL',
            quantity,
            price,
            proceeds,
            gain
        });
    }

    /**
     * Calculate portfolio value at a specific point in time
     */
    calculatePortfolioValue(priceSnapshot) {
        let value = this.portfolio.cash;
        
        for (let [symbol, holding] of Object.entries(this.portfolio.holdings)) {
            const price = priceSnapshot[symbol] || 0;
            value += holding.quantity * price;
        }
        
        return value;
    }

    /**
     * Run complete backtest
     */
    run(strategy) {
        const equity = [];
        const dates = [];
        let currentDate = new Date(this.startDate);
        
        // Get all symbols from strategy
        const symbols = strategy.symbols || [];
        this.initializePriceHistory(symbols);

        // Simulate trading day by day
        while (currentDate <= this.endDate) {
            // Simulate prices for symbols
            for (let symbol of symbols) {
                this.simulateDayPrice(symbol);
            }

            // Execute strategy logic
            try {
                const actions = strategy.execute({
                    date: currentDate,
                    portfolio: this.portfolio,
                    priceHistory: this.priceHistory,
                    trades: this.trades
                });

                // Execute recommended trades
                if (actions && Array.isArray(actions)) {
                    for (let action of actions) {
                        if (action.type === 'BUY') {
                            const price = this.priceHistory[action.symbol]?.[
                                this.priceHistory[action.symbol].length - 1
                            ]?.close;
                            if (price) {
                                this.buyStock(action.symbol, action.quantity, price, currentDate);
                            }
                        } else if (action.type === 'SELL') {
                            const price = this.priceHistory[action.symbol]?.[
                                this.priceHistory[action.symbol].length - 1
                            ]?.close;
                            if (price) {
                                this.sellStock(action.symbol, action.quantity, price, currentDate);
                            }
                        }
                    }
                }
            } catch (error) {
                console.error(`[Backtest] Error on ${currentDate}:`, error.message);
            }

            // Record equity
            const priceSnapshot = {};
            for (let symbol of symbols) {
                const history = this.priceHistory[symbol];
                if (history && history.length > 0) {
                    priceSnapshot[symbol] = history[history.length - 1].close;
                }
            }
            
            const portfolioValue = this.calculatePortfolioValue(priceSnapshot);
            equity.push(portfolioValue);
            dates.push(new Date(currentDate));

            // Move to next day
            currentDate.setDate(currentDate.getDate() + 1);
        }

        // Calculate results
        this.results = this.calculateResults(equity);
        return this.results;
    }

    /**
     * Calculate backtest results and metrics
     */
    calculateResults(equity) {
        const finalValue = equity[equity.length - 1];
        const totalReturn = finalValue - this.initialCapital;
        const returnPercent = (totalReturn / this.initialCapital) * 100;

        // Calculate max drawdown
        let maxEquity = equity[0];
        let maxDrawdown = 0;
        for (let value of equity) {
            if (value > maxEquity) {
                maxEquity = value;
            }
            const drawdown = ((maxEquity - value) / maxEquity) * 100;
            maxDrawdown = Math.max(maxDrawdown, drawdown);
        }

        // Calculate Sharpe ratio (simplified)
        const returns = [];
        for (let i = 1; i < equity.length; i++) {
            returns.push((equity[i] - equity[i - 1]) / equity[i - 1]);
        }
        const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
        const stdDev = Math.sqrt(
            returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length
        );
        const sharpeRatio = avgReturn && stdDev ? (avgReturn / stdDev) * Math.sqrt(252) : 0;

        // Calculate win rate
        let wins = 0;
        let losses = 0;
        for (let trade of this.trades) {
            if (trade.action === 'SELL') {
                if (trade.gain >= 0) wins++;
                else losses++;
            }
        }
        const winRate = (wins / (wins + losses)) * 100 || 0;

        return {
            initialCapital: this.initialCapital,
            finalValue: finalValue,
            totalReturn: totalReturn,
            returnPercent: returnPercent,
            maxDrawdown: maxDrawdown,
            sharpeRatio: sharpeRatio,
            winRate: winRate,
            trades: this.trades.length,
            equity: equity,
            profitable: totalReturn > 0
        };
    }

    /**
     * Get results summary
     */
    getResults() {
        return this.results;
    }

    /**
     * Get formatted report
     */
    getReport() {
        if (!this.results) {
            return null;
        }

        return `
=== BACKTEST RESULTS ===
Period: ${this.startDate.toDateString()} to ${this.endDate.toDateString()}
Initial Capital: $${this.initialCapital.toFixed(2)}
Final Value: $${this.results.finalValue.toFixed(2)}
Total Return: $${this.results.totalReturn.toFixed(2)} (${this.results.returnPercent.toFixed(2)}%)
Max Drawdown: ${this.results.maxDrawdown.toFixed(2)}%
Sharpe Ratio: ${this.results.sharpeRatio.toFixed(2)}
Win Rate: ${this.results.winRate.toFixed(2)}%
Total Trades: ${this.results.trades}
        `;
    }
}

module.exports = BacktestEngine;
