// Backtesting Engine
// Allows testing trading strategies against historical data

/**
 * Backtester class for simulating trades
 */
class Backtester {
  constructor(stocks, startDate, endDate, initialCapital = 100000) {
    this.stocks = stocks;
    this.startDate = new Date(startDate);
    this.endDate = new Date(endDate);
    this.initialCapital = initialCapital;
    this.results = {
      totalReturn: 0,
      totalReturnPercent: 0,
      winRate: 0,
      sharpeRatio: 0,
      maxDrawdown: 0,
      trades: [],
      portfolio: {
        cash: initialCapital,
        holdings: {},
        totalValue: initialCapital
      }
    };
    this.trades = [];
    this.portfolio = {
      cash: initialCapital,
      holdings: {},
      totalValue: initialCapital
    };
    this.dailyValues = [];
  }

  /**
   * Run backtest with strategy
   */
  async backtest(strategy) {
    const dayCount = Math.floor((this.endDate - this.startDate) / (1000 * 60 * 60 * 24));
    const dailyPrices = this._generateHistoricalData(dayCount);

    for (let day = 0; day < dayCount; day++) {
      const currentDate = new Date(this.startDate.getTime() + day * 24 * 60 * 60 * 1000);
      const prices = dailyPrices[day];

      // Execute strategy signals
      const signals = await strategy.analyze(prices, this.portfolio, day);

      for (const signal of signals) {
        this._executeTrade(signal, prices[signal.symbol]);
      }

      // Record daily portfolio value
      this._updatePortfolioValue(prices);
      this.dailyValues.push({
        date: currentDate,
        value: this.portfolio.totalValue
      });
    }

    // Calculate metrics
    this._calculateMetrics();
    return this.results;
  }

  /**
   * Execute a trade
   */
  _executeTrade(signal, currentPrice) {
    const { symbol, action, quantity } = signal;
    const tradeValue = quantity * currentPrice;

    if (action === 'buy') {
      if (this.portfolio.cash < tradeValue) {
        console.warn(`Insufficient cash for ${quantity} shares of ${symbol}`);
        return;
      }

      this.portfolio.cash -= tradeValue;
      if (!this.portfolio.holdings[symbol]) {
        this.portfolio.holdings[symbol] = { quantity: 0, avgCost: 0 };
      }

      const existingQuantity = this.portfolio.holdings[symbol].quantity;
      const existingCost = this.portfolio.holdings[symbol].avgCost * existingQuantity;
      const newTotal = existingQuantity + quantity;
      this.portfolio.holdings[symbol].quantity = newTotal;
      this.portfolio.holdings[symbol].avgCost = (existingCost + tradeValue) / newTotal;

      this.trades.push({
        symbol,
        action,
        quantity,
        price: currentPrice,
        value: tradeValue,
        timestamp: new Date()
      });
    } else if (action === 'sell') {
      if (!this.portfolio.holdings[symbol] || this.portfolio.holdings[symbol].quantity < quantity) {
        console.warn(`Insufficient shares of ${symbol} to sell`);
        return;
      }

      const avgCost = this.portfolio.holdings[symbol].avgCost;
      const gainLoss = (currentPrice - avgCost) * quantity;

      this.portfolio.cash += tradeValue;
      this.portfolio.holdings[symbol].quantity -= quantity;

      if (this.portfolio.holdings[symbol].quantity === 0) {
        delete this.portfolio.holdings[symbol];
      }

      this.trades.push({
        symbol,
        action,
        quantity,
        price: currentPrice,
        value: tradeValue,
        gainLoss,
        timestamp: new Date()
      });
    }
  }

  /**
   * Update portfolio value
   */
  _updatePortfolioValue(prices) {
    let holdingsValue = 0;

    for (const symbol in this.portfolio.holdings) {
      const holding = this.portfolio.holdings[symbol];
      const currentPrice = prices[symbol] || 0;
      holdingsValue += holding.quantity * currentPrice;
    }

    this.portfolio.totalValue = this.portfolio.cash + holdingsValue;
  }

  /**
   * Generate historical price data
   */
  _generateHistoricalData(days) {
    const data = [];

    for (let day = 0; day < days; day++) {
      const dayPrices = {};

      // Generate realistic price movements for each stock
      for (const stock of this.stocks) {
        const volatility = stock.volatility || 0.02;
        const drift = 0.0003; // Small upward drift

        // Random walk with drift
        const randomChange = (Math.random() - 0.5) * volatility * 2;
        const priceChange = drift + randomChange;

        if (day === 0) {
          dayPrices[stock.symbol] = stock.basePrice;
        } else {
          const previousPrice = data[day - 1][stock.symbol];
          dayPrices[stock.symbol] = previousPrice * (1 + priceChange);
        }
      }

      data.push(dayPrices);
    }

    return data;
  }

  /**
   * Calculate performance metrics
   */
  _calculateMetrics() {
    // Total return
    const finalValue = this.portfolio.totalValue;
    const totalReturn = finalValue - this.initialCapital;
    const totalReturnPercent = (totalReturn / this.initialCapital) * 100;

    // Win rate
    const winningTrades = this.trades.filter(t => t.gainLoss > 0).length;
    const totalTrades = this.trades.filter(t => t.action === 'sell').length;
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

    // Sharpe ratio (simplified)
    const returns = [];
    for (let i = 1; i < this.dailyValues.length; i++) {
      const dayReturn = (this.dailyValues[i].value - this.dailyValues[i - 1].value) / this.dailyValues[i - 1].value;
      returns.push(dayReturn);
    }

    const meanReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((a, b) => a + Math.pow(b - meanReturn, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);
    const sharpeRatio = stdDev > 0 ? (meanReturn / stdDev) * Math.sqrt(252) : 0; // 252 trading days/year

    // Max drawdown
    let maxValue = this.initialCapital;
    let maxDrawdown = 0;

    for (const dayValue of this.dailyValues) {
      if (dayValue.value > maxValue) {
        maxValue = dayValue.value;
      }
      const drawdown = ((maxValue - dayValue.value) / maxValue) * 100;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }

    this.results = {
      totalReturn,
      totalReturnPercent: totalReturnPercent.toFixed(2),
      winRate: winRate.toFixed(2),
      sharpeRatio: sharpeRatio.toFixed(2),
      maxDrawdown: maxDrawdown.toFixed(2),
      trades: this.trades,
      portfolio: this.portfolio,
      dailyValues: this.dailyValues
    };
  }

  /**
   * Get results
   */
  getResults() {
    return this.results;
  }
}

/**
 * Example simple moving average crossover strategy
 */
class SMAStrategy {
  constructor(shortPeriod = 20, longPeriod = 50) {
    this.shortPeriod = shortPeriod;
    this.longPeriod = longPeriod;
    this.priceHistory = {};
  }

  async analyze(prices, portfolio, day) {
    const signals = [];

    for (const symbol in prices) {
      if (!this.priceHistory[symbol]) {
        this.priceHistory[symbol] = [];
      }

      this.priceHistory[symbol].push(prices[symbol]);

      if (this.priceHistory[symbol].length < this.longPeriod) continue;

      const shortMA = this._calculateMA(symbol, this.shortPeriod);
      const longMA = this._calculateMA(symbol, this.longPeriod);

      // Buy signal: short MA crosses above long MA
      if (shortMA > longMA && (!portfolio.holdings[symbol] || portfolio.holdings[symbol].quantity === 0)) {
        signals.push({
          symbol,
          action: 'buy',
          quantity: Math.floor(portfolio.cash / (prices[symbol] * 10)) // Risk 10% per trade
        });
      }

      // Sell signal: short MA crosses below long MA
      if (shortMA < longMA && portfolio.holdings[symbol] && portfolio.holdings[symbol].quantity > 0) {
        signals.push({
          symbol,
          action: 'sell',
          quantity: portfolio.holdings[symbol].quantity
        });
      }
    }

    return signals;
  }

  _calculateMA(symbol, period) {
    const history = this.priceHistory[symbol];
    const slice = history.slice(-period);
    return slice.reduce((a, b) => a + b, 0) / slice.length;
  }
}

/**
 * RSI-based strategy
 */
class RSIStrategy {
  constructor(period = 14, overbought = 70, oversold = 30) {
    this.period = period;
    this.overbought = overbought;
    this.oversold = oversold;
    this.priceHistory = {};
  }

  async analyze(prices, portfolio, day) {
    const signals = [];

    for (const symbol in prices) {
      if (!this.priceHistory[symbol]) {
        this.priceHistory[symbol] = [];
      }

      this.priceHistory[symbol].push(prices[symbol]);

      if (this.priceHistory[symbol].length < this.period) continue;

      const rsi = this._calculateRSI(symbol);

      // Buy when oversold
      if (rsi < this.oversold && (!portfolio.holdings[symbol] || portfolio.holdings[symbol].quantity === 0)) {
        signals.push({
          symbol,
          action: 'buy',
          quantity: Math.floor(portfolio.cash / (prices[symbol] * 10))
        });
      }

      // Sell when overbought
      if (rsi > this.overbought && portfolio.holdings[symbol] && portfolio.holdings[symbol].quantity > 0) {
        signals.push({
          symbol,
          action: 'sell',
          quantity: portfolio.holdings[symbol].quantity
        });
      }
    }

    return signals;
  }

  _calculateRSI(symbol) {
    const history = this.priceHistory[symbol].slice(-this.period);
    let gains = 0;
    let losses = 0;

    for (let i = 1; i < history.length; i++) {
      const change = history[i] - history[i - 1];
      if (change > 0) gains += change;
      else losses -= change;
    }

    const avgGain = gains / this.period;
    const avgLoss = losses / this.period;
    const rs = avgLoss > 0 ? avgGain / avgLoss : 0;
    return 100 - (100 / (1 + rs));
  }
}

module.exports = {
  Backtester,
  SMAStrategy,
  RSIStrategy
};
