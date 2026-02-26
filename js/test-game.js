/**
 * Game State Variables
 */
let gameConfig = null;
let selectedStock = null;
let currentFilter = 'all';
let gameSpeed = 1;
let isPaused = false;
let updateInterval = null;
let stockUpdateInterval = null;
let priceChart = null; // Chart.js instance
let currentSaveCode = null; // Currently loaded save code
let currentPresetName = 'default'; // Currently active preset

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
    console.log('[game] loadConfig called');
    const configJSON = sessionStorage.getItem('gameConfig');
    
    if (configJSON) {
        gameConfig = JSON.parse(configJSON);
    } else {
        // Default config
        gameConfig = {
            startingCapital: 25000,
            riskLevel: 'moderate',
            mode: 'classic',
            difficulty: 'medium',
            showDayCounter: false          // new toggleable option
        };
    }
    // ensure flag exists if loaded config omitted it
    if (typeof gameConfig.showDayCounter === 'undefined') {
        gameConfig.showDayCounter = false;
    }
    // custom mode overrides
    if (gameConfig.mode === 'custom') {
        gameConfig.startingCapital = 10000;
        // risk/difficulty should not affect; force moderate/medium for simulator
        gameConfig.riskLevel = 'moderate';
        gameConfig.difficulty = 'medium';
        if (!gameConfig.weeks) gameConfig.weeks = 1;
    }
    // expose for debugging/automation
    window.gameConfig = gameConfig;
    console.log('[game] loaded configuration', gameConfig);
}

/**
 * Initialize the game with simulator and UI
 */
function initializeGame() {
    console.log('[game] initializeGame starting');
    // Initialize simulator with config
    const sim = initializeSimulator(gameConfig);
    // attach explicitly to window for environments like jsdom
    window.simulator = sim;
    simulator = sim;

    console.log('[game] simulator created', sim);
    // ensure UI speed buttons reflect current speed
    setSpeed(gameSpeed);
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
    console.log('[game] setupEventListeners');
    // Speed button listeners
    document.querySelectorAll('.speed-btn').forEach(btn => {
        const speed = parseFloat(btn.getAttribute('data-speed'));
        if (!isNaN(speed)) {
            btn.addEventListener('click', () => setSpeed(speed));
        }
    });
}

/**
 * Set game speed multiplier
 */
function setSpeed(speed) {
    gameSpeed = speed;

    // Update button states (using data-speed attribute)
    document.querySelectorAll('.speed-btn').forEach(btn => btn.classList.remove('active'));
    const selector = `.speed-btn[data-speed="${speed}"]`;
    const activeBtn = document.querySelector(selector);
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

    // Advance simulated time by 1 day per tick, but run ticks faster when `gameSpeed` > 1
    const intervalMs = Math.max(1000 / gameSpeed, 50);
    stockUpdateInterval = setInterval(() => {
        if (!isPaused) {
            simulator.updatePrices(1); // move 1 simulated day per tick
            renderStocks();
        }
    }, intervalMs);
}

/**
 * Filter stocks by type
 */
function filterByType(type, evt) {
    currentFilter = type;

    // Update active button
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    const target = (evt && (evt.target || evt.srcElement)) || document.querySelector(`.filter-btn[data-type="${type}"]`);
    if (target) target.classList.add('active');

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

        // Calculate price change (from previous bar, same as trading panel)
        const history = simulator.getPriceHistory(stock.symbol);
        const prevPrice = history.length > 1 ? history[history.length - 2] : history[0];
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

    // Update position info (profit & shares owned)
    updatePositionInfo(stock);

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
    let fullMsg = message;
    if (success && simulator) {
        const portfolio = simulator.getPortfolioDetails();
        fullMsg += ` | Cash: $${portfolio.cash.toFixed(2)}`;
    }
    msgElement.textContent = fullMsg;
    msgElement.style.display = 'block';
    msgElement.style.background = success ? '#d1fae5' : '#fee2e2';
    msgElement.style.color = success ? '#065f46' : '#991b1b';
    msgElement.style.border = success ? '1px solid #6ee7b7' : '1px solid #fca5a5';
}

// display position information for selected stock
function updatePositionInfo(stock) {
    const infoEl = document.getElementById('positionInfo');
    const details = simulator.getPortfolioDetails();
    const holding = details.holdings.find(h => h.symbol === stock.symbol);
    if (holding) {
        const profit = holding.gainLoss;
        const color = profit >= 0 ? '#10b981' : '#ef4444';
        infoEl.textContent = `${holding.shares} shares · P/L: $${profit.toFixed(2)}`;
        infoEl.style.color = color;
    } else {
        infoEl.textContent = '';
    }
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

    // optional day counter
    const counterEl = document.getElementById('dayCounter');
    if (counterEl) {
        if (gameConfig.showDayCounter && typeof simulator.getDayCount === 'function') {
            counterEl.textContent = 'Day ' + simulator.getDayCount();
        } else {
            counterEl.textContent = '';
        }
    }
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
                    <span style="font-size: 12px; color: #666;">Invested: $${h.totalInvestment.toFixed(2)}</span><br>
                    Value: $${h.value.toFixed(2)}<br>
                    <span style="color: ${h.gainLoss >= 0 ? '#10b981' : '#ef4444'}; font-weight: 500;">
                        ${h.gainLoss >= 0 ? '↑ +' : '↓ '}$${h.gainLoss.toFixed(2)}
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
    } else if (gameConfig.mode === 'custom') {
        contentDiv.innerHTML = `
            <div class="stat-line">
                <span class="stat-label">Weeks Used:</span>
                <span class="stat-value">${modeStats.weeksUsed}</span>
            </div>
            <div class="stat-line">
                <span class="stat-label">Weeks Remaining:</span>
                <span class="stat-value">${modeStats.weeksLeft}</span>
            </div>
            <div class="stat-line">
                <span class="stat-label">Total Weeks:</span>
                <span class="stat-value">${modeStats.totalWeeks}</span>
            </div>
        `;
    }
}

/**
 * Export/Import System
 */

// Open export modal and generate a save code
async function openExportModal() {
    try {
        if (!simulator || !gameConfig) {
            alert('No active game! Start a game first before exporting.');
            return;
        }
        
        // Create a new save code on the server
        const createResponse = await fetch('/api/saves/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!createResponse.ok) {
            const errData = await createResponse.text();
            throw new Error(`Failed to create save code: ${createResponse.status} - ${errData}`);
        }
        
        const data = await createResponse.json();
        const saveCode = data.code;
        console.log(`[Export] Created save code: ${saveCode}`);

        // Save the current game state with the code
        const gameState = getCurrentState();
        if (!gameState) {
            throw new Error('Failed to get current game state');
        }
        
        console.log(`[Export] Saving state with ${gameState.simulator ? Object.keys(gameState.simulator).length : 0} simulator properties`);
        
        const saveResponse = await fetch(`/api/saves/${saveCode}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                gameState: gameState,
                presetName: 'default'
            })
        });

        if (!saveResponse.ok) {
            const errData = await saveResponse.text();
            throw new Error(`Failed to save game state: ${saveResponse.status} - ${errData}`);
        }
        
        const saveData = await saveResponse.json();
        console.log(`[Export] Successfully saved:`, saveData);

        // Display the modal with the code
        currentSaveCode = saveCode;
        document.getElementById('exportCode').value = saveCode;
        document.getElementById('exportModal').style.display = 'flex';
        document.getElementById('copyFeedback').style.display = 'none';
    } catch (error) {
        console.error('Export failed:', error);
        alert(`Export failed: ${error.message}. Check console for details.`);
    }
}

// Close export modal
function closeExportModal() {
    document.getElementById('exportModal').style.display = 'none';
}

// Copy save code to clipboard
function copySaveCode() {
    const codeInput = document.getElementById('exportCode');
    codeInput.select();
    document.execCommand('copy');
    
    const feedback = document.getElementById('copyFeedback');
    feedback.style.display = 'block';
    setTimeout(() => {
        feedback.style.display = 'none';
    }, 2000);
}

// Open import modal
function openImportModal() {
    document.getElementById('importModal').style.display = 'flex';
    document.getElementById('importCode').value = '';
    document.getElementById('importError').style.display = 'none';
    document.getElementById('presetsList').innerHTML = '';
    document.getElementById('importCode').focus();

    // Add enter key listener
    document.getElementById('importCode').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            loadImportedGame();
        }
    });
}

// Close import modal
function closeImportModal() {
    document.getElementById('importModal').style.display = 'none';
}

// Load presets for a save code
async function loadPresetsForCode(code) {
    try {
        console.log(`[Import] Loading presets for code: ${code}`);
        
        const response = await fetch(`/api/saves/${code.toUpperCase()}`);
        
        if (!response.ok) {
            const errText = await response.text();
            console.error('Preset load failed:', response.status, errText);
            document.getElementById('importError').textContent = 'Save code not found. Please check and try again.';
            document.getElementById('importError').style.display = 'block';
            document.getElementById('presetsList').innerHTML = '';
            return false;
        }

        const data = await response.json();
        const presets = data.presets || [];
        console.log(`[Import] Found ${presets.length} presets`);

        if (presets.length === 0) {
            document.getElementById('importError').textContent = 'No saved data found for this code.';
            document.getElementById('importError').style.display = 'block';
            document.getElementById('presetsList').innerHTML = '';
            return false;
        }

        // Display presets
        document.getElementById('importError').style.display = 'none';
        const presetsList = document.getElementById('presetsList');
        presetsList.innerHTML = presets.map((preset, index) => `
            <div class="preset-item" onclick="selectPreset('${preset.name}', this)">
                <div class="preset-info">
                    <div class="preset-name">${preset.name}</div>
                    <div class="preset-date">Last updated: ${new Date(preset.updatedAt || preset.createdAt).toLocaleDateString()}</div>
                </div>
            </div>
        `).join('');

        // Store presets for later
        window.importedPresets = presets;
        return true;
    } catch (error) {
        console.error('Failed to load presets:', error);
        document.getElementById('importError').textContent = `Error loading preset data: ${error.message}`;
        document.getElementById('importError').style.display = 'block';
        return false;
    }
}

// Select a preset
function selectPreset(presetName, element) {
    document.querySelectorAll('.preset-item').forEach(el => el.classList.remove('selected'));
    element.classList.add('selected');
    window.selectedPresetName = presetName;
}

// Load imported game
async function loadImportedGame() {
    const code = document.getElementById('importCode').value.trim().toUpperCase();

    if (!code) {
        document.getElementById('importError').textContent = 'Please enter a save code.';
        document.getElementById('importError').style.display = 'block';
        return;
    }

    if (code.length !== 9) {
        document.getElementById('importError').textContent = 'Save code must be 9 characters long.';
        document.getElementById('importError').style.display = 'block';
        return;
    }

    // Load presets if not already loaded
    if (!window.importedPresets || window.importedPresets.length === 0) {
        const loaded = await loadPresetsForCode(code);
        if (!loaded) return;
    }

    // Get selected preset or use default
    const presetName = window.selectedPresetName || 'default';
    
    try {
        const response = await fetch(`/api/saves/${code}/preset/${presetName}`);

        if (!response.ok) {
            document.getElementById('importError').textContent = `Failed to load preset "${presetName}".`;
            document.getElementById('importError').style.display = 'block';
            return;
        }

        const data = await response.json();
        const gameState = data.gameState;

        // Load the state
        loadState(gameState);
        currentSaveCode = code;
        currentPresetName = presetName;

        // Close modal and show success
        closeImportModal();
        alert(`✓ Game loaded from ${presetName} preset!`);
    } catch (error) {
        console.error('Failed to load game:', error);
        document.getElementById('importError').textContent = 'Failed to load game. Please try again.';
        document.getElementById('importError').style.display = 'block';
    }
}

// Legacy export function (kept for debug panel compatibility)
function exportState() {
    openExportModal();
}

// Legacy import function (kept for debug panel compatibility)
function promptImport() {
    openImportModal();
}

function loadState(state) {
    if (!state) return;
    
    try {
        if (state.config) {
            gameConfig = state.config;
            window.gameConfig = gameConfig;
        }
        
        if (state.simulator) {
            // Create a fresh simulator with the saved config
            const sim = new EnhancedSimulator(state.simulator.config);
            
            // Copy over all the saved properties
            sim.portfolio = state.simulator.portfolio;
            sim.stocks = state.simulator.stocks;
            sim.priceHistory = state.simulator.priceHistory;
            sim.trades = state.simulator.trades;
            sim.modeState = state.simulator.modeState;
            sim.startTime = state.simulator.startTime;
            sim.initialCapital = state.simulator.initialCapital;
            sim.dailyStats = state.simulator.dailyStats || [];
            
            // Restore the date properly
            sim.simulatedTime = new Date(state.simulator.simulatedTime);
            
            simulator = sim;
            window.simulator = sim;
            
            console.log('[Load] Game state loaded successfully');
        }

        // refresh UI
        renderStocks();
        updateDisplay();
        if (simulator) startPriceUpdates();
    } catch (error) {
        console.error('[Load] Failed to load state:', error);
        alert(`Failed to load game: ${error.message}`);
    }
}

/**
 * Get the current game state for saving
 */
function getCurrentState() {
    if (!simulator) return null;
    
    return {
        config: gameConfig,
        simulator: {
            config: simulator.config,
            portfolio: simulator.portfolio,
            stocks: simulator.stocks,
            priceHistory: simulator.priceHistory,
            simulatedTime: simulator.simulatedTime.toISOString(), // Convert to ISO string for JSON serialization
            trades: simulator.trades,
            modeState: simulator.modeState,
            startTime: simulator.startTime,
            initialCapital: simulator.initialCapital,
            dailyStats: simulator.dailyStats
        }
    };
}

/**
 * Debug Panel Functionality
 */
function toggleDebugPanel() {
    const box = document.getElementById('debugBox');
    if (box.style.display === 'none') {
        box.style.display = 'block';
        refreshDebug();
    } else {
        box.style.display = 'none';
    }
}

function refreshDebug() {
    const output = document.getElementById('debugOutput');
    output.value = JSON.stringify(getCurrentState(), null, 2);
}

// Setup debug toggle
if (document.getElementById('debugToggle')) {
    document.getElementById('debugToggle').addEventListener('click', toggleDebugPanel);
}

/**
 * Navigation
 */
function goHome() {
    // Save current game state if there's a save code
    if (currentSaveCode && simulator && simulator.trades.length > 0) {
        const gameState = getCurrentState();
        fetch(`/api/saves/${currentSaveCode}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                gameState: gameState,
                presetName: currentPresetName || 'default'
            })
        }).catch(err => console.error('Failed to auto-save:', err));
    }

    // Clear intervals
    if (updateInterval) clearInterval(updateInterval);
    if (stockUpdateInterval) clearInterval(stockUpdateInterval);
    
    // Reset state for next game
    sessionStorage.removeItem('gameConfig');
    
    // Go home
    window.location.href = 'index.html';
}

// Prevent accidental page close
window.onbeforeunload = () => {
    if (simulator && simulator.trades.length > 0) {
        return 'Are you sure? Your progress will be lost.';
    }
};
