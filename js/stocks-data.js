/**
 * Real Stock Market Data
 * 100+ stocks with realistic configurations
 */

const REAL_STOCKS = [
    // Tech Giants
    { symbol: 'AAPL', name: 'Apple Inc.', basePrice: 178.50, type: 'growth', volatility: 0.018 },
    { symbol: 'MSFT', name: 'Microsoft Corp.', basePrice: 375.20, type: 'growth', volatility: 0.016 },
    { symbol: 'GOOGL', name: 'Alphabet Inc.', basePrice: 140.80, type: 'growth', volatility: 0.017 },
    { symbol: 'NVDA', name: 'NVIDIA Corp.', basePrice: 875.45, type: 'growth', volatility: 0.035 },
    { symbol: 'META', name: 'Meta Platforms', basePrice: 485.30, type: 'growth', volatility: 0.032 },
    { symbol: 'TSLA', name: 'Tesla Inc.', basePrice: 242.60, type: 'growth', volatility: 0.048 },
    { symbol: 'AMZN', name: 'Amazon.com Inc.', basePrice: 175.40, type: 'growth', volatility: 0.025 },
    { symbol: 'GOOG', name: 'Google (Class C)', basePrice: 140.20, type: 'growth', volatility: 0.017 },
    { symbol: 'NFLX', name: 'Netflix Inc.', basePrice: 425.80, type: 'growth', volatility: 0.038 },
    { symbol: 'UBER', name: 'Uber Technologies', basePrice: 72.40, type: 'growth', volatility: 0.042 },
    
    // Financial Institutions
    { symbol: 'JPM', name: 'JPMorgan Chase', basePrice: 195.75, type: 'dividend', volatility: 0.014 },
    { symbol: 'BAC', name: 'Bank of America', basePrice: 35.20, type: 'dividend', volatility: 0.016 },
    { symbol: 'WFC', name: 'Wells Fargo', basePrice: 62.45, type: 'dividend', volatility: 0.015 },
    { symbol: 'GS', name: 'Goldman Sachs', basePrice: 385.60, type: 'dividend', volatility: 0.018 },
    { symbol: 'BLK', name: 'BlackRock Inc.', basePrice: 865.20, type: 'dividend', volatility: 0.014 },
    { symbol: 'MS', name: 'Morgan Stanley', basePrice: 97.30, type: 'dividend', volatility: 0.015 },
    { symbol: 'SCHW', name: 'Schwab Inc.', basePrice: 78.50, type: 'dividend', volatility: 0.017 },
    { symbol: 'CM', name: 'Comerica Inc.', basePrice: 72.40, type: 'dividend', volatility: 0.018 },
    
    // Energy Sector
    { symbol: 'XOM', name: 'Exxon Mobil', basePrice: 105.80, type: 'dividend', volatility: 0.022 },
    { symbol: 'CVX', name: 'Chevron Corp.', basePrice: 156.35, type: 'dividend', volatility: 0.020 },
    { symbol: 'COP', name: 'ConocoPhillips', basePrice: 125.40, type: 'dividend', volatility: 0.025 },
    { symbol: 'MPC', name: 'Marathon Petroleum', basePrice: 87.20, type: 'dividend', volatility: 0.028 },
    { symbol: 'PSX', name: 'Phillips 66', basePrice: 115.60, type: 'dividend', volatility: 0.024 },
    { symbol: 'SLB', name: 'Schlumberger', basePrice: 43.80, type: 'dividend', volatility: 0.032 },
    
    // Healthcare & Pharma
    { symbol: 'JNJ', name: 'Johnson & Johnson', basePrice: 159.20, type: 'dividend', volatility: 0.012 },
    { symbol: 'UNH', name: 'UnitedHealth Group', basePrice: 485.60, type: 'growth', volatility: 0.015 },
    { symbol: 'PFE', name: 'Pfizer Inc.', basePrice: 28.75, type: 'dividend', volatility: 0.018 },
    { symbol: 'MRK', name: 'Merck & Co.', basePrice: 78.45, type: 'dividend', volatility: 0.014 },
    { symbol: 'ABBV', name: 'AbbVie Inc.', basePrice: 165.80, type: 'dividend', volatility: 0.016 },
    { symbol: 'LLY', name: 'Eli Lilly', basePrice: 585.40, type: 'growth', volatility: 0.018 },
    { symbol: 'AMGN', name: 'Amgen Inc.', basePrice: 285.20, type: 'dividend', volatility: 0.014 },
    { symbol: 'BMY', name: 'Bristol Myers Squibb', basePrice: 62.80, type: 'dividend', volatility: 0.015 },
    { symbol: 'AZN', name: 'AstraZeneca', basePrice: 69.45, type: 'dividend', volatility: 0.016 },
    { symbol: 'GILD', name: 'Gilead Sciences', basePrice: 88.30, type: 'dividend', volatility: 0.020 },
    
    // Retail & Consumer
    { symbol: 'WMT', name: 'Walmart Inc.', basePrice: 82.50, type: 'dividend', volatility: 0.013 },
    { symbol: 'MCD', name: "McDonald's Corp.", basePrice: 295.60, type: 'dividend', volatility: 0.015 },
    { symbol: 'NKE', name: 'Nike Inc.', basePrice: 104.20, type: 'growth', volatility: 0.022 },
    { symbol: 'KO', name: 'Coca-Cola Co.', basePrice: 58.30, type: 'dividend', volatility: 0.011 },
    { symbol: 'PEP', name: 'PepsiCo Inc.', basePrice: 195.40, type: 'dividend', volatility: 0.012 },
    { symbol: 'MO', name: 'Altria Group', basePrice: 47.60, type: 'dividend', volatility: 0.014 },
    { symbol: 'PM', name: 'Philip Morris', basePrice: 102.40, type: 'dividend', volatility: 0.016 },
    { symbol: 'TJX', name: 'TJX Companies', basePrice: 95.80, type: 'growth', volatility: 0.020 },
    { symbol: 'HD', name: 'The Home Depot', basePrice: 345.60, type: 'dividend', volatility: 0.016 },
    { symbol: 'LOW', name: 'Lowe\'s Companies', basePrice: 78.40, type: 'dividend', volatility: 0.018 },
    
    // Industrial
    { symbol: 'BA', name: 'Boeing Co.', basePrice: 181.40, type: 'growth', volatility: 0.035 },
    { symbol: 'CAT', name: 'Caterpillar Inc.', basePrice: 425.60, type: 'growth', volatility: 0.024 },
    { symbol: 'GE', name: 'General Electric', basePrice: 165.20, type: 'growth', volatility: 0.019 },
    { symbol: 'HON', name: 'Honeywell Intl', basePrice: 210.75, type: 'growth', volatility: 0.017 },
    { symbol: 'MMM', name: '3M Company', basePrice: 105.35, type: 'dividend', volatility: 0.015 },
    { symbol: 'RTX', name: 'Raytheon Tech', basePrice: 110.20, type: 'dividend', volatility: 0.016 },
    { symbol: 'LMT', name: 'Lockheed Martin', basePrice: 485.60, type: 'dividend', volatility: 0.013 },
    { symbol: 'NOC', name: 'Northrop Grumman', basePrice: 515.40, type: 'dividend', volatility: 0.014 },
    
    // Communications
    { symbol: 'VZ', name: 'Verizon Comms', basePrice: 42.85, type: 'dividend', volatility: 0.011 },
    { symbol: 'T', name: 'AT&T Inc.', basePrice: 22.40, type: 'dividend', volatility: 0.012 },
    { symbol: 'CMCSA', name: 'Comcast Corp', basePrice: 42.30, type: 'dividend', volatility: 0.015 },
    
    // Utilities
    { symbol: 'NEE', name: 'NextEra Energy', basePrice: 78.60, type: 'dividend', volatility: 0.013 },
    { symbol: 'DUK', name: 'Duke Energy', basePrice: 98.45, type: 'dividend', volatility: 0.012 },
    { symbol: 'SO', name: 'Southern Co.', basePrice: 72.40, type: 'dividend', volatility: 0.011 },
    { symbol: 'EXC', name: 'Exelon Corp', basePrice: 38.50, type: 'dividend', volatility: 0.012 },
    
    // Real Estate & Infrastructure
    { symbol: 'SPG', name: 'Simon Property', basePrice: 145.20, type: 'dividend', volatility: 0.018 },
    { symbol: 'DLR', name: 'Digital Realty', basePrice: 168.50, type: 'dividend', volatility: 0.016 },
    { symbol: 'EQIX', name: 'Equinix Inc.', basePrice: 658.40, type: 'dividend', volatility: 0.017 },
    { symbol: 'PLD', name: 'Prologis Inc.', basePrice: 128.50, type: 'dividend', volatility: 0.014 },
    
    // Semiconductors
    { symbol: 'AMD', name: 'Advanced Micro', basePrice: 145.80, type: 'growth', volatility: 0.038 },
    { symbol: 'QCOM', name: 'Qualcomm Inc.', basePrice: 185.40, type: 'growth', volatility: 0.028 },
    { symbol: 'INTC', name: 'Intel Corp.', basePrice: 42.60, type: 'dividend', volatility: 0.025 },
    { symbol: 'AVGO', name: 'Broadcom Inc.', basePrice: 595.20, type: 'growth', volatility: 0.022 },
    { symbol: 'MU', name: 'Micron Technology', basePrice: 108.45, type: 'growth', volatility: 0.032 },
    
    // Software & Services
    { symbol: 'CRM', name: 'Salesforce Inc.', basePrice: 265.80, type: 'growth', volatility: 0.026 },
    { symbol: 'ADBE', name: 'Adobe Inc.', basePrice: 485.20, type: 'growth', volatility: 0.023 },
    { symbol: 'ORCL', name: 'Oracle Corp.', basePrice: 128.50, type: 'dividend', volatility: 0.016 },
    { symbol: 'SAP', name: 'SAP SE', basePrice: 115.40, type: 'dividend', volatility: 0.015 },
    { symbol: 'SNPS', name: 'Synopsys Inc.', basePrice: 485.60, type: 'growth', volatility: 0.024 },
    { symbol: 'CDNS', name: 'Cadence Design', basePrice: 325.80, type: 'growth', volatility: 0.022 },
    
    // ETFs (included as stocks)
    { symbol: 'SPY', name: 'S&P 500 ETF', basePrice: 485.60, type: 'etf', volatility: 0.009 },
    { symbol: 'QQQ', name: 'Nasdaq-100 ETF', basePrice: 425.80, type: 'etf', volatility: 0.012 },
    { symbol: 'IVV', name: 'iShares Core S&P', basePrice: 595.20, type: 'etf', volatility: 0.008 },
    { symbol: 'VTI', name: 'Vanguard Total Mkt', basePrice: 245.40, type: 'etf', volatility: 0.009 },
    { symbol: 'VOO', name: 'Vanguard S&P 500', basePrice: 475.30, type: 'etf', volatility: 0.008 },
    { symbol: 'VUG', name: 'Vanguard Growth', basePrice: 325.80, type: 'etf', volatility: 0.011 },
    { symbol: 'VTV', name: 'Vanguard Value', basePrice: 155.40, type: 'etf', volatility: 0.010 },
    
    // Bonds
    { symbol: 'BND', name: 'Vanguard Total Bond', basePrice: 82.50, type: 'bond', volatility: 0.004 },
    { symbol: 'AGG', name: 'iShares Core Bond', basePrice: 102.40, type: 'bond', volatility: 0.005 },
    { symbol: 'LQD', name: 'Investment Grade Bond', basePrice: 125.60, type: 'bond', volatility: 0.006 },
    
    // Additional Growth/Tech
    { symbol: 'SQ', name: 'Block Inc.', basePrice: 65.40, type: 'growth', volatility: 0.042 },
    { symbol: 'SHOP', name: 'Shopify Inc.', basePrice: 725.60, type: 'growth', volatility: 0.036 },
    { symbol: 'NET', name: 'Cloudflare Inc.', basePrice: 115.20, type: 'growth', volatility: 0.039 },
    { symbol: 'CRWD', name: 'CrowdStrike', basePrice: 385.40, type: 'growth', volatility: 0.033 },
    { symbol: 'DDOG', name: 'Datadog Inc.', basePrice: 185.40, type: 'growth', volatility: 0.035 },
    { symbol: 'OKTA', name: 'Okta Inc.', basePrice: 125.80, type: 'growth', volatility: 0.041 },
    { symbol: 'SPLK', name: 'Splunk Inc.', basePrice: 142.60, type: 'growth', volatility: 0.038 },
    { symbol: 'SNOW', name: 'Snowflake Inc.', basePrice: 175.40, type: 'growth', volatility: 0.040 },
    { symbol: 'PLTR', name: 'Palantir Tech', basePrice: 25.30, type: 'growth', volatility: 0.045 },
    { symbol: 'COIN', name: 'Coinbase Global', basePrice: 115.60, type: 'growth', volatility: 0.052 },
    
    // Automotive & EV
    { symbol: 'F', name: 'Ford Motor', basePrice: 11.50, type: 'dividend', volatility: 0.018 },
    { symbol: 'GM', name: 'General Motors', basePrice: 35.80, type: 'dividend', volatility: 0.020 },
    { symbol: 'TM', name: 'Toyota Motor', basePrice: 192.40, type: 'dividend', volatility: 0.014 },
    { symbol: 'HMC', name: 'Honda Motor', basePrice: 28.50, type: 'dividend', volatility: 0.016 },
    
    // Airlines
    { symbol: 'AAL', name: 'American Airlines', basePrice: 28.60, type: 'growth', volatility: 0.038 },
    { symbol: 'DAL', name: 'Delta Air Lines', basePrice: 35.40, type: 'growth', volatility: 0.036 },
    { symbol: 'UAL', name: 'United Airlines', basePrice: 32.80, type: 'growth', volatility: 0.040 },
    
    // Gaming & Entertainment
    { symbol: 'NVDA', name: 'NVIDIA (Gaming)', basePrice: 875.45, type: 'growth', volatility: 0.035 },
    { symbol: 'EA', name: 'Electronic Arts', basePrice: 155.80, type: 'growth', volatility: 0.028 },
    { symbol: 'TAKE', name: 'Take-Two Interactive', basePrice: 185.40, type: 'growth', volatility: 0.030 },
    { symbol: 'ATVI', name: 'Activision Blizzard', basePrice: 92.60, type: 'growth', volatility: 0.032 }
];

const STOCK_TYPES = {
    growth: { name: 'Growth Stocks', color: '#f5576c', description: 'High volatility, high potential returns' },
    dividend: { name: 'Dividend Stocks', color: '#10b981', description: 'Stable income, lower volatility' },
    etf: { name: 'Exchange Traded Funds', color: '#667eea', description: 'Diversified baskets, medium volatility' },
    bond: { name: 'Bonds', color: '#f59e0b', description: 'Low volatility, stable returns' }
};

const RISK_LEVELS = {
    conservative: { multiplier: 0.5, description: 'Low risk, minimal volatility' },
    moderate: { multiplier: 1.0, description: 'Balanced risk and reward' },
    aggressive: { multiplier: 1.8, description: 'High risk, high potential reward' }
};

const GAME_MODES = {
    classic: { name: 'Classic Trading', description: 'Standard trading with real stocks' },
    challenge: { name: 'Challenge Mode', description: 'Meet daily targets to advance' },
    portfolio: { name: 'Portfolio Builder', description: 'Build a balanced portfolio' },
    daytrader: { name: 'Day Trader', description: 'Fast-paced intraday trading' }
};

const DIFFICULTIES = {
    easy: { name: 'Easy', volatilityReduction: 0.6, startCapital: 50000 },
    medium: { name: 'Medium', volatilityReduction: 1.0, startCapital: 25000 },
    hard: { name: 'Hard', volatilityReduction: 1.3, startCapital: 10000 }
};
