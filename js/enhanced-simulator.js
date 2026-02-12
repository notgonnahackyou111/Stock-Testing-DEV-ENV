/**
 * Enhanced Stock Market Simulator
 * Features: Risk levels, time skip, multiple modes, difficulty
 */

class EnhancedSimulator {
    constructor(config = {}) {
        this.config = {
            startingCapital: config.startingCapital || 25000,
            riskLevel: config.riskLevel || 'moderate',
            mode: config.mode || 'classic',
            difficulty: config.difficulty || 'medium',
            ...config
        };

        this.stocks = this.initializeStocks();
        this.portfolio = {
            cash: this.config.startingCapital,
            holdings: {}
        };
        this.priceHistory = {};
        this.startTime = Date.now();
        this.simulatedTime = new Date(2024, 0, 1); // Start date
        this.trades = [];
        this.initialCapital = this.config.startingCapital;
        this.dailyStats = [];
        
        // Mode-specific state
        this.modeState = this.initializeModeState();
    }

    initializeModeState() {
        const state = {};
        
        if (this.config.mode === 'challenge') {
            state.dailyTarget = this.config.startingCapital * 0.05; // 5% daily gain
            state.daysCompleted = 0;
            state.streakDays = 0;
        } else if (this.config.mode === 'daytrader') {
            state.totalDayTrades = 0;
            state.maxDayTrades = 3; // Pattern day trader rules
        } else if (this.config.mode === 'portfolio') {
            state.targetAllocation = {
                growth: 0.4,
                dividend: 0.3,
                etf: 0.2,
                bond: 0.1
            };
        }
        
        return state;
    }

    initializeStocks() {
        const stocks = REAL_STOCKS.map(stock => ({
            ...stock,
            price: stock.basePrice,
            openPrice: stock.basePrice,
            originalVolatility: stock.volatility * RISK_LEVELS[this.config.riskLevel].multiplier,
            volatility: stock.volatility * RISK_LEVELS[this.config.riskLevel].multiplier * DIFFICULTIES[this.config.difficulty].volatilityReduction
        }));

        stocks.forEach(stock => {
            this.priceHistory[stock.symbol] = [stock.price];
        });

        return stocks;
    }

    /**
     * Update stock prices with random walk affected by risk level
     */
    updatePrices(timeSkipMultiplier = 1) {
        this.stocks.forEach(stock => {
            const previousPrice = stock.price;
            
            // Adjust volatility based on stock type and risk level
            const typeVolatility = stock.type === 'bond' ? 0.002 : stock.volatility;
            
            // Random walk with drift
            const randomChange = (Math.random() - 0.5) * typeVolatility * previousPrice * timeSkipMultiplier;
            const drift = previousPrice * 0.00008 * timeSkipMultiplier; // slight upward trend
            
            // Apply momentum (stocks tend to continue in direction)
            let momentum = 0;
            if (this.priceHistory[stock.symbol].length > 1) {
                const lastChange = this.priceHistory[stock.symbol][this.priceHistory[stock.symbol].length - 1] - 
                                  this.priceHistory[stock.symbol][this.priceHistory[stock.symbol].length - 2];
                momentum = lastChange * 0.1;
            }
            
            stock.price = Math.max(previousPrice + randomChange + drift + momentum, 0.01);
            this.priceHistory[stock.symbol].push(stock.price);
        });

        // Move simulated time forward
        this.simulatedTime.setDate(this.simulatedTime.getDate() + timeSkipMultiplier);
    }

    /**
     * Execute a buy order
     */
    buy(symbol, shares) {
        const stock = this.stocks.find(s => s.symbol === symbol);
        if (!stock) return { success: false, message: 'Stock not found' };

        const cost = stock.price * shares;
        if (cost > this.portfolio.cash) {
            return { success: false, message: `Insufficient cash. Need $${cost.toFixed(2)}, have $${this.portfolio.cash.toFixed(2)}` };
        }

        // Check day trader rules for fast mode
        if (this.config.mode === 'daytrader') {
            if (this.modeState.totalDayTrades >= this.modeState.maxDayTrades) {
                return { success: false, message: 'Day trade limit reached (3 per day)' };
            }
            this.modeState.totalDayTrades++;
        }

        this.portfolio.cash -= cost;
        this.portfolio.holdings[symbol] = (this.portfolio.holdings[symbol] || 0) + shares;
        
        this.trades.push({
            type: 'BUY',
            symbol,
            shares,
            price: stock.price,
            timestamp: Date.now(),
            simulatedTime: new Date(this.simulatedTime)
        });

        return { success: true, message: `Bought ${shares} shares of ${symbol} @ $${stock.price.toFixed(2)}` };
    }

    /**
     * Execute a sell order
     */
    sell(symbol, shares) {
        const stock = this.stocks.find(s => s.symbol === symbol);
        if (!stock) return { success: false, message: 'Stock not found' };

        const held = this.portfolio.holdings[symbol] || 0;
        if (shares > held) {
            return { success: false, message: `Insufficient shares. Have ${held}, want to sell ${shares}` };
        }

        const proceeds = stock.price * shares;
        this.portfolio.cash += proceeds;
        this.portfolio.holdings[symbol] -= shares;
        if (this.portfolio.holdings[symbol] === 0) delete this.portfolio.holdings[symbol];

        // Check day trader rules
        if (this.config.mode === 'daytrader') {
            if (this.modeState.totalDayTrades >= this.modeState.maxDayTrades) {
                return { success: false, message: 'Day trade limit reached' };
            }
            this.modeState.totalDayTrades++;
        }

        this.trades.push({
            type: 'SELL',
            symbol,
            shares,
            price: stock.price,
            timestamp: Date.now(),
            simulatedTime: new Date(this.simulatedTime)
        });

        return { success: true, message: `Sold ${shares} shares of ${symbol} @ $${stock.price.toFixed(2)}` };
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
     * Get detailed portfolio breakdown
     */
    getPortfolioDetails() {
        const details = {
            cash: this.portfolio.cash,
            holdings: [],
            totalValue: this.getPortfolioValue(),
            profitLoss: this.getPortfolioValue() - this.initialCapital,
            profitLossPercent: ((this.getPortfolioValue() - this.initialCapital) / this.initialCapital) * 100
        };

        for (const [symbol, shares] of Object.entries(this.portfolio.holdings)) {
            const stock = this.stocks.find(s => s.symbol === symbol);
            if (stock) {
                // Calculate gain/loss for this position
                const trades = this.trades.filter(t => t.symbol === symbol);
                let costBasis = 0;
                let sharesOwned = 0;
                trades.forEach(t => {
                    if (t.type === 'BUY') {
                        costBasis += t.price * t.shares;
                        sharesOwned += t.shares;
                    } else {
                        const soldCost = (costBasis / sharesOwned) * t.shares;
                        costBasis -= soldCost;
                        sharesOwned -= t.shares;
                    }
                });

                details.holdings.push({
                    symbol,
                    name: stock.name,
                    type: stock.type,
                    shares,
                    price: stock.price,
                    value: stock.price * shares,
                    costBasis: costBasis / sharesOwned || stock.price,
                    gainLoss: (stock.price - (costBasis / sharesOwned || stock.price)) * shares
                });
            }
        }

        return details;
    }

    /**
     * Get filtered stocks by type
     */
    getStocksByType(type) {
        return this.stocks.filter(s => s.type === type);
    }

    /**
     * Get all stocks
     */
    getStocks() {
        return this.stocks;
    }

    /**
     * Get price history
     */
    getPriceHistory(symbol, limit = 100) {
        const history = this.priceHistory[symbol] || [];
        return history.slice(-limit);
    }

    /**
     * Get simulated date/time
     */
    getSimulatedTime() {
        return this.simulatedTime;
    }

    /**
     * Get mode-specific stats
     */
    getModeStats() {
        if (this.config.mode === 'challenge') {
            return {
                dailyTarget: this.modeState.dailyTarget,
                daysCompleted: this.modeState.daysCompleted,
                streakDays: this.modeState.streakDays,
                currentGain: this.getPortfolioValue() - this.initialCapital
            };
        } else if (this.config.mode === 'daytrader') {
            return {
                dayTradesUsed: this.modeState.totalDayTrades,
                dayTradesRemaining: this.modeState.maxDayTrades - this.modeState.totalDayTrades
            };
        } else if (this.config.mode === 'portfolio') {
            const allocation = this.calculateAllocation();
            return {
                currentAllocation: allocation,
                targetAllocation: this.modeState.targetAllocation
            };
        }
        return {};
    }

    /**
     * Calculate current portfolio allocation by type
     */
    calculateAllocation() {
        const totalValue = this.getPortfolioValue();
        const allocation = { growth: 0, dividend: 0, etf: 0, bond: 0 };

        for (const [symbol, shares] of Object.entries(this.portfolio.holdings)) {
            const stock = this.stocks.find(s => s.symbol === symbol);
            if (stock) {
                const value = stock.price * shares;
                allocation[stock.type] = (allocation[stock.type] || 0) + (value / totalValue);
            }
        }

        return allocation;
    }

    /**
     * Record daily stats for challenge mode
     */
    recordDailyStats() {
        this.dailyStats.push({
            date: new Date(this.simulatedTime),
            portfolioValue: this.getPortfolioValue(),
            profit: this.getPortfolioValue() - this.initialCapital
        });
    }
}

// Create a global simulator instance (will be initialized with config)
let simulator = null;

function initializeSimulator(config) {
    simulator = new EnhancedSimulator(config);
    return simulator;
}
