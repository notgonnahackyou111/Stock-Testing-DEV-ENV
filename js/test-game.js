/**
 * Stock Test Game Logic
 * Handles game initialization, UI updates, and trading mechanics
 */

let gameConfig = null;
let selectedStock = null;
let currentFilter = 'all';
let gameSpeed = 1;
let isPaused = false;
let updateInterval = null;
let stockUpdateInterval = null;
let priceChart = null; // Chart.js instance

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    loadConfig();
    initializeGame();
    setupEventListeners();
});

/**
 * Load game configuration from session storage
 */
function loadConfig() {
    const configJSON = sessionStorage.getItem('gameConfig');
    
    if (configJSON) {
        gameConfig = JSON.parse(configJSON);
    } else {
        // Default config
        gameConfig = {
            startingCapital: 25000,
            riskLevel: 'moderate',
            mode: 'classic',
            difficulty: 'medium'
        };
    }
}

/**
 * Initialize the game with simulator and UI
 */
function initializeGame() {
    // Initialize simulator with config
    simulator = initializeSimulator(gameConfig);

    // Update mode badge
    const modeName = GAME_MODES[gameConfig.mode]?.name || gameConfig.mode;
    document.getElementById('modeBadge').textContent = `Mode: ${modeName}`;

    // Show mode-specific stats if applicable
    if (['challenge', 'daytrader', 'portfolio'].includes(gameConfig.mode)) {
        document.getElementById('modeStats').classList.add('active');
        updateModeStats();
    }

    // Render initial stock display
    renderStocks();

    // Start price updates
    startPriceUpdates();

    // Start display updates
    updateDisplay();
    updateInterval = setInterval(updateDisplay, 1000);
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Speed button listeners
    document.getElementById('speed1x').addEventListener('click', () => setSpeed(1));
    document.getElementById('speed2x').addEventListener('click', () => setSpeed(2));
    document.getElementById('speed5x').addEventListener('click', () => setSpeed(5));
    document.getElementById('speed10x').addEventListener('click', () => setSpeed(10));
}

/**
 * Set game speed multiplier
 */
function setSpeed(speed) {
    gameSpeed = speed;

    // Update button states
    ['1x', '2x', '5x', '10x'].forEach(btn => {
        const element = document.getElementById('speed' + btn);
        if (element) element.classList.remove('active');
    });

    const activeBtn = document.getElementById('speed' + speed + 'x');
    if (activeBtn) activeBtn.classList.add('active');

    // Adjust update interval
    if (updateInterval) clearInterval(updateInterval);
    if (stockUpdateInterval) clearInterval(stockUpdateInterval);

    if (!isPaused) {
        startPriceUpdates();
        updateInterval = setInterval(updateDisplay, 1000 / speed);
    }
}

/**
 * Toggle pause
 */
function togglePause() {
    isPaused = !isPaused;
    const pauseBtn = document.getElementById('pauseBtn');

    if (isPaused) {
        pauseBtn.textContent = '▶ Resume';
        if (stockUpdateInterval) clearInterval(stockUpdateInterval);
        if (updateInterval) clearInterval(updateInterval);
    } else {
        pauseBtn.textContent = '⏸ Pause';
        startPriceUpdates();
        updateInterval = setInterval(updateDisplay, 1000 / gameSpeed);
    }
}

/**
 * Start price update loop
 */
function startPriceUpdates() {
    if (stockUpdateInterval) clearInterval(stockUpdateInterval);

    stockUpdateInterval = setInterval(() => {
        if (!isPaused) {
            simulator.updatePrices(gameSpeed);
            renderStocks();
        }
    }, 1000);
}

/**
 * Filter stocks by type
 */
function filterByType(type) {
    currentFilter = type;

    // Update active button
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');

    renderStocks();
}

/**
 * Render stocks in grid
 */
function renderStocks() {
    const grid = document.getElementById('stocksGrid');
    grid.innerHTML = '';

    let stocks = simulator.getStocks();

    // Apply filter
    if (currentFilter !== 'all') {
        stocks = stocks.filter(s => s.type === currentFilter);
    }

    stocks.forEach(stock => {
        const card = document.createElement('div');
        card.className = 'stock-card';

        if (selectedStock?.symbol === stock.symbol) {
            card.classList.add('selected');
        }

        // Calculate price change (from 20 days ago or start)
        const history = simulator.getPriceHistory(stock.symbol);
        const prevPrice = history.length > 20 ? history[history.length - 20] : history[0];
        const change = stock.price - prevPrice;
        const changePercent = ((change / prevPrice) * 100).toFixed(2);
        const changeClass = change >= 0 ? 'up' : 'down';
        const changeSymbol = change >= 0 ? '↑' : '↓';

        // Get 52-week range
        const allHistory = simulator.getPriceHistory(stock.symbol, 250);
        const high52 = Math.max(...allHistory);
        const low52 = Math.min(...allHistory);
        const rangePercent = ((stock.price - low52) / (high52 - low52)) * 100;

        card.innerHTML = `
            <div class="stock-header">
                <div class="stock-symbol">${stock.symbol}</div>
                <div class="stock-type-badge">${stock.type}</div>
            </div>
            <div class="stock-name">${stock.name}</div>
            <div class="stock-price">$${stock.price.toFixed(2)}</div>
            <div class="stock-price-change ${changeClass}">
                ${changeSymbol} ${Math.abs(changePercent)}%
            </div>
            <div class="range-bar">
                <div class="range-fill" style="width: ${rangePercent}%"></div>
            </div>
            <div class="range-labels">
                <span>$${low52.toFixed(2)}</span>
                <span>$${high52.toFixed(2)}</span>
            </div>
        `;

        card.addEventListener('click', () => selectStock(stock));
        grid.appendChild(card);
    });
}

/**
 * Select a stock for trading
 */
function selectStock(stock) {
    selectedStock = stock;
    renderStocks();

    const panel = document.getElementById('tradingPanel');
    panel.style.display = 'block';

    document.getElementById('selectedStock').textContent = stock.symbol;
    document.getElementById('stockMeta').textContent = stock.name;
    document.getElementById('shareAmount').value = '';
    document.getElementById('tradeMessage').style.display = 'none';

    // Update price display
    updatePriceDisplay(stock);

    // Update stock stats
    updateStockStats(stock);

    // Create price chart
    createPriceChart(stock);

    // Scroll to trading panel
    panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/**
 * Update price display for selected stock
 */
function updatePriceDisplay(stock) {
    const history = simulator.getPriceHistory(stock.symbol);
    const prevPrice = history[history.length - 2] || stock.price;
    const change = stock.price - prevPrice;
    const changePercent = ((change / prevPrice) * 100).toFixed(2);
    const changeClass = change >= 0 ? 'up' : 'down';
    const changeSymbol = change >= 0 ? '↑' : '↓';

    document.getElementById('currentPrice').textContent = `$${stock.price.toFixed(2)}`;
    
    const changeEl = document.getElementById('priceChange');
    changeEl.textContent = `${changeSymbol} ${Math.abs(changePercent)}%`;
    changeEl.className = `price-change ${changeClass}`;
}

/**
 * Calculate and update stock statistics
 */
function updateStockStats(stock) {
    const history = simulator.getPriceHistory(stock.symbol, 250); // ~1 year of trading days

    const high = Math.max(...history);
    const low = Math.min(...history);
    const volume = Math.floor(Math.random() * 50000000) + 1000000; // Simulated volume
    const marketCap = stock.price * 500; // Simulated market cap in millions

    document.getElementById('stat52hHigh').textContent = `$${high.toFixed(2)}`;
    document.getElementById('stat52hLow').textContent = `$${low.toFixed(2)}`;
    document.getElementById('statVolume').textContent = (volume / 1000000).toFixed(1) + 'M';
    document.getElementById('statMarketCap').textContent = (marketCap / 1000).toFixed(1) + 'B';
}

/**
 * Create price history chart
 */
function createPriceChart(stock) {
    const ctx = document.getElementById('priceChart');
    if (!ctx) return;

    // Get price history (last 100 days)
    const history = simulator.getPriceHistory(stock.symbol, 100);
    const labels = history.map((_, i) => {
        const daysAgo = 100 - i;
        return daysAgo % 10 === 0 ? `${daysAgo}d ago` : '';
    });

    // Calculate moving averages
    const ma20 = [];
    const ma50 = [];
    for (let i = 0; i < history.length; i++) {
        if (i >= 19) {
            ma20.push(history.slice(i - 19, i + 1).reduce((a, b) => a + b) / 20);
        } else {
            ma20.push(null);
        }
        if (i >= 49) {
            ma50.push(history.slice(i - 49, i + 1).reduce((a, b) => a + b) / 50);
        } else {
            ma50.push(null);
        }
    }

    // Destroy existing chart if it exists
    if (priceChart) {
        priceChart.destroy();
    }

    // Create new chart
    priceChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Price',
                    data: history,
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.05)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 6,
                    pointBackgroundColor: '#667eea',
                    pointBorderColor: 'white',
                    pointBorderWidth: 2
                },
                {
                    label: '20-day MA',
                    data: ma20,
                    borderColor: '#f59e0b',
                    borderWidth: 1.5,
                    fill: false,
                    tension: 0.4,
                    pointRadius: 0,
                    borderDash: [5, 5]
                },
                {
                    label: '50-day MA',
                    data: ma50,
                    borderColor: '#ef4444',
                    borderWidth: 1.5,
                    fill: false,
                    tension: 0.4,
                    pointRadius: 0,
                    borderDash: [5, 5]
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: {
                    display: true,
                    labels: {
                        padding: 15,
                        font: { size: 12, weight: 600 },
                        color: '#666',
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleFont: { size: 13, weight: 700 },
                    bodyFont: { size: 12 },
                    padding: 12,
                    displayColors: true,
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                    borderWidth: 1
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#999',
                        font: { size: 11 }
                    }
                },
                y: {
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    },
                    ticks: {
                        color: '#999',
                        font: { size: 11 },
                        callback: function(value) {
                            return '$' + value.toFixed(2);
                        }
                    }
                }
            }
        }
    });
}

/**
 * Buy stock
 */
function buyStock() {
    if (!selectedStock) return;

    const shares = parseInt(document.getElementById('shareAmount').value) || 0;
    if (shares <= 0) {
        showMessage('Please enter a valid number of shares', false);
        return;
    }

    const result = simulator.buy(selectedStock.symbol, shares);
    showMessage(result.message, result.success);

    if (result.success) {
        document.getElementById('shareAmount').value = '';
        updateDisplay();
        renderStocks();
    }
}

/**
 * Sell stock
 */
function sellStock() {
    if (!selectedStock) return;

    const shares = parseInt(document.getElementById('shareAmount').value) || 0;
    if (shares <= 0) {
        showMessage('Please enter a valid number of shares', false);
        return;
    }

    const result = simulator.sell(selectedStock.symbol, shares);
    showMessage(result.message, result.success);

    if (result.success) {
        document.getElementById('shareAmount').value = '';
        updateDisplay();
        renderStocks();
    }
}

/**
 * Show trade message
 */
function showMessage(message, success) {
    const msgElement = document.getElementById('tradeMessage');
    msgElement.textContent = message;
    msgElement.style.display = 'block';
    msgElement.style.background = success ? '#d1fae5' : '#fee2e2';
    msgElement.style.color = success ? '#065f46' : '#991b1b';
    msgElement.style.border = success ? '1px solid #6ee7b7' : '1px solid #fca5a5';
}

/**
 * Update all display elements
 */
function updateDisplay() {
    updateTime();
    updatePortfolioDisplay();
    updateHoldings();
    updateTradeHistory();
    updateModeStats();

    // Update chart and price info if a stock is selected
    if (selectedStock && priceChart) {
        updatePriceDisplay(selectedStock);
        // Update chart datasets with new data (no need to recreate)
        if (priceChart.data && priceChart.data.datasets && priceChart.data.datasets[0]) {
            const history = simulator.getPriceHistory(selectedStock.symbol, 100);
            priceChart.data.datasets[0].data = history;
            priceChart.update('none'); // Update without animation for smooth updates
        }
    }
}

/**
 * Update simulated time display
 */
function updateTime() {
    const date = simulator.getSimulatedTime();
    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    document.getElementById('timeDisplay').textContent = date.toLocaleDateString('en-US', options);
}

/**
 * Update portfolio display
 */
function updatePortfolioDisplay() {
    const portfolio = simulator.getPortfolioDetails();

    document.getElementById('cashDisplay').textContent = `Cash: $${portfolio.cash.toFixed(2)}`;
    document.getElementById('totalValueDisplay').textContent = `Total: $${portfolio.totalValue.toFixed(2)}`;

    const profitLoss = portfolio.profitLoss;
    const profitPercent = portfolio.profitLossPercent;

    const plElement = document.getElementById('profitLossDisplay');
    plElement.textContent = `P/L: ${profitLoss >= 0 ? '+' : ''}$${profitLoss.toFixed(2)}`;
    plElement.classList.toggle('positive', profitLoss >= 0);

    const ppElement = document.getElementById('profitPercentDisplay');
    ppElement.textContent = `Return: ${profitPercent >= 0 ? '+' : ''}${profitPercent.toFixed(2)}%`;
    ppElement.classList.toggle('positive', profitPercent >= 0);
}

/**
 * Update holdings display
 */
function updateHoldings() {
    const portfolio = simulator.getPortfolioDetails();
    const holdingsDiv = document.getElementById('holdings');

    if (portfolio.holdings.length === 0) {
        holdingsDiv.innerHTML = '<div style="color: #999; text-align: center; padding: 15px;">No holdings</div>';
    } else {
        holdingsDiv.innerHTML = portfolio.holdings.map(h => `
            <div class="holding-item">
                <span class="holding-symbol">${h.symbol}</span>
                <div class="holding-details">
                    ${h.shares} shares @ $${h.price.toFixed(2)}<br>
                    Value: $${h.value.toFixed(2)}<br>
                    <span style="color: ${h.gainLoss >= 0 ? '#10b981' : '#ef4444'}">
                        ${h.gainLoss >= 0 ? '+' : ''}$${h.gainLoss.toFixed(2)}
                    </span>
                </div>
            </div>
        `).join('');
    }
}

/**
 * Update trade history display
 */
function updateTradeHistory() {
    const tradesDiv = document.getElementById('recentTrades');
    const trades = simulator.trades;

    if (trades.length === 0) {
        tradesDiv.innerHTML = '<div style="color: #999; text-align: center; padding: 15px;">No trades yet</div>';
    } else {
        tradesDiv.innerHTML = trades.slice().reverse().slice(0, 10).map(t => `
            <div class="trade-item ${t.type.toLowerCase()}">
                <span class="trade-type">${t.type}</span>
                ${t.shares} ${t.symbol} @ $${t.price.toFixed(2)}<br>
                <small style="opacity: 0.7;">${t.simulatedTime.toLocaleDateString()}</small>
            </div>
        `).join('');
    }
}

/**
 * Update mode-specific statistics
 */
function updateModeStats() {
    const statsBox = document.getElementById('modeStats');
    if (!statsBox.classList.contains('active')) return;

    const modeStats = simulator.getModeStats();
    const contentDiv = document.getElementById('modeStatsContent');

    if (gameConfig.mode === 'challenge') {
        contentDiv.innerHTML = `
            <div class="stat-line">
                <span class="stat-label">Daily Target:</span>
                <span class="stat-value">$${modeStats.dailyTarget.toFixed(2)}</span>
            </div>
            <div class="stat-line">
                <span class="stat-label">Current Gain:</span>
                <span class="stat-value" style="color: ${modeStats.currentGain >= 0 ? '#10b981' : '#ef4444'}">
                    ${modeStats.currentGain >= 0 ? '+' : ''}$${modeStats.currentGain.toFixed(2)}
                </span>
            </div>
            <div class="stat-line">
                <span class="stat-label">Days Completed:</span>
                <span class="stat-value">${modeStats.daysCompleted}</span>
            </div>
            <div class="stat-line">
                <span class="stat-label">Streak:</span>
                <span class="stat-value">${modeStats.streakDays} days</span>
            </div>
        `;
    } else if (gameConfig.mode === 'daytrader') {
        contentDiv.innerHTML = `
            <div class="stat-line">
                <span class="stat-label">Day Trades Used:</span>
                <span class="stat-value">${modeStats.dayTradesUsed}</span>
            </div>
            <div class="stat-line">
                <span class="stat-label">Remaining:</span>
                <span class="stat-value">${modeStats.dayTradesRemaining}</span>
            </div>
        `;
    } else if (gameConfig.mode === 'portfolio') {
        const alloc = modeStats.currentAllocation;
        const target = modeStats.targetAllocation;
        contentDiv.innerHTML = `
            <div class="stat-line">
                <span class="stat-label">Growth:</span>
                <span class="stat-value">${(alloc.growth * 100).toFixed(0)}% / ${(target.growth * 100).toFixed(0)}%</span>
            </div>
            <div class="stat-line">
                <span class="stat-label">Dividend:</span>
                <span class="stat-value">${(alloc.dividend * 100).toFixed(0)}% / ${(target.dividend * 100).toFixed(0)}%</span>
            </div>
            <div class="stat-line">
                <span class="stat-label">ETFs:</span>
                <span class="stat-value">${(alloc.etf * 100).toFixed(0)}% / ${(target.etf * 100).toFixed(0)}%</span>
            </div>
            <div class="stat-line">
                <span class="stat-label">Bonds:</span>
                <span class="stat-value">${(alloc.bond * 100).toFixed(0)}% / ${(target.bond * 100).toFixed(0)}%</span>
            </div>
        `;
    }
}

/**
 * Go home
 */
function goHome() {
    if (updateInterval) clearInterval(updateInterval);
    if (stockUpdateInterval) clearInterval(stockUpdateInterval);
    window.location.href = 'index.html';
}

// Prevent accidental page close
window.onbeforeunload = () => {
    if (simulator && simulator.trades.length > 0) {
        return 'Are you sure? Your progress will be lost.';
    }
};
