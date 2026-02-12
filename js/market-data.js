/**
 * Market Data Integration Module
 * Fetches real market data from various APIs
 * Supports Alpha Vantage, IEX Cloud, and Polygon
 */

class MarketDataProvider {
    constructor(apiKey = null, provider = 'alphaVantage') {
        this.apiKey = apiKey;
        this.provider = provider;
        this.cache = new Map();
        this.cacheExpiry = 60000; // 1 minute cache
        this.requestQueue = [];
        this.isProcessing = false;
        this.lastRequestTime = {};
        this.rateLimitDelay = 500; // ms between requests
    }

    /**
     * Get real-time price data
     */
    async getRealTimePrice(symbol) {
        const cached = this.getFromCache(symbol);
        if (cached) return cached;

        const price = await this.fetchPrice(symbol);
        if (price) {
            this.setCache(symbol, price);
        }
        return price;
    }

    /**
     * Fetch price based on configured provider
     */
    async fetchPrice(symbol) {
        if (!this.apiKey) {
            return this.getSimulatedPrice(symbol);
        }

        try {
            switch (this.provider) {
                case 'alphaVantage':
                    return await this.fetchAlphaVantage(symbol);
                case 'iexCloud':
                    return await this.fetchIEXCloud(symbol);
                case 'polygon':
                    return await this.fetchPolygon(symbol);
                default:
                    return this.getSimulatedPrice(symbol);
            }
        } catch (error) {
            console.warn(`Failed to fetch real data for ${symbol}:`, error);
            return this.getSimulatedPrice(symbol);
        }
    }

    /**
     * Alpha Vantage API Integration
     */
    async fetchAlphaVantage(symbol) {
        const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${this.apiKey}`;
        
        try {
            const response = await fetch(url);
            const data = await response.json();
            
            if (data['Global Quote'] && data['Global Quote']['05. price']) {
                return {
                    symbol: symbol,
                    price: parseFloat(data['Global Quote']['05. price']),
                    change: parseFloat(data['Global Quote']['09. change']),
                    changePercent: parseFloat(data['Global Quote']['10. change percent']),
                    high: parseFloat(data['Global Quote']['03. high']),
                    low: parseFloat(data['Global Quote']['04. low']),
                    volume: parseInt(data['Global Quote']['06. volume']),
                    timestamp: new Date(),
                    source: 'alphaVantage'
                };
            }
        } catch (error) {
            console.error('Alpha Vantage API error:', error);
        }
        return null;
    }

    /**
     * IEX Cloud API Integration
     */
    async fetchIEXCloud(symbol) {
        const url = `https://cloud.iexapis.com/stable/stock/${symbol}/quote?token=${this.apiKey}`;
        
        try {
            const response = await fetch(url);
            const data = await response.json();
            
            return {
                symbol: symbol,
                price: data.latestPrice,
                change: data.change,
                changePercent: data.changePercent,
                high: data.high,
                low: data.low,
                volume: data.volume,
                timestamp: new Date(),
                source: 'iexCloud'
            };
        } catch (error) {
            console.error('IEX Cloud API error:', error);
        }
        return null;
    }

    /**
     * Polygon.io API Integration
     */
    async fetchPolygon(symbol) {
        const url = `https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers/${symbol}?apiKey=${this.apiKey}`;
        
        try {
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.status === 'OK' && data.results) {
                const quote = data.results.lastQuote;
                return {
                    symbol: symbol,
                    price: (quote.ask + quote.bid) / 2,
                    change: data.results.lastTrade.price - quote.ask,
                    changePercent: ((data.results.lastTrade.price - quote.ask) / quote.ask) * 100,
                    high: data.results.updated ? data.results.updated : null,
                    low: null,
                    volume: data.results.volume,
                    timestamp: new Date(),
                    source: 'polygon'
                };
            }
        } catch (error) {
            console.error('Polygon API error:', error);
        }
        return null;
    }

    /**
     * Get simulated price (fallback when no API key)
     */
    getSimulatedPrice(symbol) {
        // This connects to the existing simulator
        if (window.simulator && window.simulator.stocks) {
            const stock = window.simulator.stocks.find(s => s.symbol === symbol);
            if (stock) {
                return {
                    symbol: symbol,
                    price: stock.price,
                    change: 0,
                    changePercent: 0,
                    high: stock.high52Week,
                    low: stock.low52Week,
                    volume: stock.avgVolume,
                    timestamp: new Date(),
                    source: 'simulator'
                };
            }
        }
        return null;
    }

    /**
     * Get historical OHLC data for charting
     */
    async getHistoricalData(symbol, timeframe = 'daily', limit = 100) {
        if (!this.apiKey) {
            return this.getSimulatedHistoricalData(symbol, limit);
        }

        try {
            switch (this.provider) {
                case 'alphaVantage':
                    return await this.fetchAlphaVantageHistorical(symbol, timeframe, limit);
                case 'polygon':
                    return await this.fetchPolygonHistorical(symbol, timeframe, limit);
                default:
                    return this.getSimulatedHistoricalData(symbol, limit);
            }
        } catch (error) {
            console.warn(`Failed to fetch historical data for ${symbol}:`, error);
            return this.getSimulatedHistoricalData(symbol, limit);
        }
    }

    /**
     * Fetch historical data from Alpha Vantage
     */
    async fetchAlphaVantageHistorical(symbol, timeframe = 'daily', limit = 100) {
        const functionType = timeframe === 'daily' ? 'TIME_SERIES_DAILY' : 'TIME_SERIES_INTRADAY';
        const params = `function=${functionType}&symbol=${symbol}&apikey=${this.apiKey}`;
        const interval = timeframe === 'intraday' ? '&interval=60min' : '';
        
        const url = `https://www.alphavantage.co/query?${params}${interval}`;
        
        try {
            const response = await fetch(url);
            const data = await response.json();
            const timeSeries = data[`Time Series (${timeframe === 'daily' ? 'Daily' : '60min'})`];
            
            if (timeSeries) {
                const ohlcData = [];
                let count = 0;
                
                for (const [date, values] of Object.entries(timeSeries)) {
                    if (count >= limit) break;
                    
                    ohlcData.push({
                        date: new Date(date),
                        open: parseFloat(values['1. open']),
                        high: parseFloat(values['2. high']),
                        low: parseFloat(values['3. low']),
                        close: parseFloat(values['4. close']),
                        volume: parseInt(values['5. volume'])
                    });
                    count++;
                }
                
                return ohlcData.reverse();
            }
        } catch (error) {
            console.error('Alpha Vantage historical data error:', error);
        }
        return null;
    }

    /**
     * Fetch historical data from Polygon
     */
    async fetchPolygonHistorical(symbol, timeframe = 'daily', limit = 100) {
        const multiplier = timeframe === 'daily' ? 1 : 1;
        const timespan = timeframe === 'daily' ? 'day' : 'minute';
        
        const url = `https://api.polygon.io/v2/aggs/ticker/${symbol}/range/${multiplier}/${timespan}/2023-01-01/2024-12-31?limit=${limit}&apiKey=${this.apiKey}`;
        
        try {
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.status === 'OK' && data.results) {
                return data.results.map(candle => ({
                    date: new Date(candle.t),
                    open: candle.o,
                    high: candle.h,
                    low: candle.l,
                    close: candle.c,
                    volume: candle.v
                }));
            }
        } catch (error) {
            console.error('Polygon historical data error:', error);
        }
        return null;
    }

    /**
     * Get simulated historical data (fallback)
     */
    getSimulatedHistoricalData(symbol, limit = 100) {
        if (window.simulator && window.simulator.priceHistory) {
            const history = window.simulator.priceHistory[symbol] || [];
            
            return history.slice(-limit).map((price, index) => ({
                date: new Date(Date.now() - (limit - index) * 86400000),
                open: price * 0.99,
                high: price * 1.02,
                low: price * 0.98,
                close: price,
                volume: Math.floor(Math.random() * 1000000) + 100000
            }));
        }
        return [];
    }

    /**
     * Get market data for multiple symbols
     */
    async getMarketSnapshot(symbols) {
        const snapshot = {};
        
        for (const symbol of symbols) {
            const price = await this.getRealTimePrice(symbol);
            if (price) {
                snapshot[symbol] = price;
            }
        }
        
        return snapshot;
    }

    /**
     * Cache management
     */
    getFromCache(key) {
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
            return cached.data;
        }
        return null;
    }

    setCache(key, data) {
        this.cache.set(key, {
            data: data,
            timestamp: Date.now()
        });
    }

    clearCache() {
        this.cache.clear();
    }

    /**
     * Setup API configuration
     */
    setProvider(provider, apiKey) {
        this.provider = provider;
        this.apiKey = apiKey;
        this.clearCache();
    }

    /**
     * Get available providers
     */
    static getAvailableProviders() {
        return [
            {
                name: 'alphaVantage',
                label: 'Alpha Vantage',
                url: 'https://www.alphavantage.co/',
                free: true,
                rateLimit: '5 requests/minute'
            },
            {
                name: 'iexCloud',
                label: 'IEX Cloud',
                url: 'https://iexcloud.io/',
                free: true,
                rateLimit: '100 requests/second'
            },
            {
                name: 'polygon',
                label: 'Polygon.io',
                url: 'https://polygon.io/',
                free: false,
                rateLimit: 'Depends on plan'
            }
        ];
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MarketDataProvider;
}
