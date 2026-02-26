/**
 * Stock Testing Bot API Server
 * Real-time WebSocket and REST API for trading bot connections
 * 
 * Run with: node server.js
 * Port: 8000
 */

require('dotenv').config(); // Load environment variables
const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const { initializeFirebase, getDatabase, isFirebaseReady } = require('./firebase-config');
const { verifyToken, verifyOptionalToken, generateToken } = require('./auth-middleware');
const { registerUser, loginUser, getUserProfile, updateUserStats, createAdminAccount, createTesterAccount } = require('./user-manager');
const BacktestEngine = require('./backtest-engine');
const notificationService = require('./notification-service');

// initialize default admin/tester from environment variables if provided
(async () => {
    if (process.env.ADMIN_USERNAME && process.env.ADMIN_PASSWORD) {
        try {
            await createAdminAccount(process.env.ADMIN_USERNAME, process.env.ADMIN_PASSWORD, 'Administrator');
            console.log('[Init] Default admin account created or already exists');
        } catch (err) {
            console.warn('[Init] Failed to create admin account:', err.message);
        }
    }
    if (process.env.TESTER_USERNAME && process.env.TESTER_PASSWORD) {
        try {
            await createTesterAccount(process.env.TESTER_USERNAME, process.env.TESTER_PASSWORD, 'Tester');
            console.log('[Init] Default tester account created or already exists');
        } catch (err) {
            console.warn('[Init] Failed to create tester account:', err.message);
        }
    }
})();

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

/**
 * Attempt to bind the HTTP server on one of the provided ports.
 * If the first port is already in use, try the next, etc.
 * When successful we update `PORT` and start listening.
 */
function tryListen(portIndex) {
    if (portIndex >= PORTS.length) {
        console.error('Failed to bind to any port in', PORTS);
        process.exit(1);
    }

    const attempt = PORTS[portIndex];
    server.listen(attempt, '0.0.0.0', () => {
        PORT = attempt;
        console.log(`Server listening on port ${PORT}`);
    });

    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.warn(`Port ${attempt} in use, trying next backup port`);
            tryListen(portIndex + 1);
        } else {
            console.error('Server error:', err);
            process.exit(1);
        }
    });
}

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '.')));

// Configuration
// support a list of ports (primary + backups) via env var, e.g. "8000,8001,8002".
// the server will try each port in order until one is free.
const parsePorts = (str) => {
    if (!str) return [8000];
    return str.split(',').map(p => parseInt(p, 10)).filter(n => !isNaN(n));
};
let PORTS = parsePorts(process.env.PORTS || process.env.PORT);
if (PORTS.length === 0) PORTS = [8000];
let PORT = PORTS[0];
const API_VERSION = '1.0.0';

// Initialize Firebase
const firebaseDb = initializeFirebase();
const useFirebase = isFirebaseReady();

// In-memory data stores
const bots = new Map();
const orders = new Map();
const portfolios = new Map();
const subscriptions = new Map();
const marketData = new Map();
const gameSaves = new Map(); // Save codes -> game state
let orderIdCounter = 1000;
let botIdCounter = 1;

// Initialize with sample stock data
const STOCKS = require('./js/stocks-data.js').REAL_STOCKS || [];
const initializeMarketData = () => {
    STOCKS.forEach(stock => {
        marketData.set(stock.symbol, {
            symbol: stock.symbol,
            price: stock.basePrice,
            high52Week: stock.high52Week,
            low52Week: stock.low52Week,
            avgVolume: stock.avgVolume,
            marketCap: stock.marketCap,
            type: stock.type,
            lastUpdate: Date.now()
        });
    });
};

/**
 * Helper functions for game saves
 */

// Generate a random alphanumeric code (e.g., "ABC123XYZ")
function generateSaveCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const codeLength = 9;
    let code = '';
    for (let i = 0; i < codeLength; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// Check if a save code exists
async function savecodeExists(code) {
    if (useFirebase) {
        try {
            const doc = await firebaseDb.collection('gameSaves').doc(code.toUpperCase()).get();
            return doc.exists;
        } catch (error) {
            console.error('[Firebase] Error checking save code:', error.message);
            return false;
        }
    }
    return gameSaves.has(code.toUpperCase());
}

// Get or initialize save data for a code
async function getOrCreateSave(code) {
    const upperCode = code.toUpperCase();
    
    if (useFirebase) {
        try {
            const docRef = firebaseDb.collection('gameSaves').doc(upperCode);
            const doc = await docRef.get();
            
            if (doc.exists) {
                return doc.data();
            }
            
            // Create new save
            const newSave = {
                code: upperCode,
                createdAt: new Date(),
                lastUpdatedAt: new Date(),
                presets: {},
                activePreset: 'default'
            };
            await docRef.set(newSave);
            return newSave;
        } catch (error) {
            console.error('[Firebase] Error in getOrCreateSave:', error.message);
            // Fallback to in-memory
        }
    }
    
    if (!gameSaves.has(upperCode)) {
        gameSaves.set(upperCode, {
            code: upperCode,
            createdAt: new Date(),
            lastUpdatedAt: new Date(),
            presets: {},
            activePreset: 'default'
        });
    }
    return gameSaves.get(upperCode);
}

/**
 * REST API Endpoints
 */

// ==================== AUTHENTICATION ENDPOINTS ====================

/**
 * User Registration
 * POST /api/auth/register
 */
app.post('/api/auth/register', async (req, res) => {
    try {
        const { email, username, password, displayName } = req.body;

        if ((!email && !username) || !password) {
            return res.status(400).json({
                error: 'Email or username, and password are required'
            });
        }

        const user = await registerUser({ email, username, password, displayName });
        const token = generateToken(user.userId, user.email || user.username, user.role);

        res.status(201).json({
            success: true,
            user,
            token,
            message: 'Registration successful'
        });
    } catch (error) {
        console.error('[Auth] Registration error:', error.message);
        res.status(400).json({
            error: error.message
        });
    }
});

/**
 * User Login
 * POST /api/auth/login
 */
app.post('/api/auth/login', async (req, res) => {
    try {
        const { identifier, password } = req.body;
        // identifier may be email or username
        if (!identifier || !password) {
            return res.status(400).json({
                error: 'Identifier and password required'
            });
        }

        const result = await loginUser(identifier, password);

        res.json({
            success: true,
            ...result,
            message: 'Login successful'
        });
    } catch (error) {
        console.error('[Auth] Login error:', error.message);
        res.status(401).json({
            error: error.message
        });
    }
});

/**
 * Get User Profile
 * GET /api/auth/profile
 */
app.get('/api/auth/profile', verifyToken, async (req, res) => {
    try {
        const user = await getUserProfile(req.userId);

        res.json({
            success: true,
            user
        });
    } catch (error) {
        console.error('[Auth] Profile fetch error:', error.message);
        res.status(404).json({
            error: error.message
        });
    }
});

// ==================== BACKTESTING ENDPOINTS ====================

/**
 * Run Backtest
 * POST /api/backtest/run
 */
app.post('/api/backtest/run', verifyOptionalToken, (req, res) => {
    try {
        const { 
            symbols = ['AAPL', 'MSFT', 'GOOGL'],
            startDate = '2025-01-01',
            endDate = new Date().toISOString(),
            initialCapital = 100000,
            strategy = 'buyAndHold'
        } = req.body;

        const backtest = new BacktestEngine({
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            initialCapital
        });

        // Define strategy
        const strategyObj = {
            symbols,
            execute: (context) => {
                // Simple buy and hold strategy
                if (!context.portfolio.holdings[symbols[0]] && context.portfolio.cash > 0) {
                    return [{
                        type: 'BUY',
                        symbol: symbols[0],
                        quantity: Math.floor(context.portfolio.cash / 1000)
                    }];
                }
                return [];
            }
        };

        // Run backtest
        const results = backtest.run(strategyObj);

        // Save backtest result if user logged in
        if (req.userId) {
            notificationService.createNotification(
                req.userId,
                '📊 Backtest Completed',
                `${strategy} returned ${results.returnPercent.toFixed(2)}%`,
                'success',
                results
            );
        }

        res.json({
            success: true,
            results,
            report: backtest.getReport()
        });
    } catch (error) {
        console.error('[Backtest] Error:', error.message);
        res.status(500).json({
            error: error.message
        });
    }
});

/**
 * Get Backtest Report
 * GET /api/backtest/:backtestId
 */
app.get('/api/backtest/:backtestId', (req, res) => {
    // Note: In production, fetch from database
    res.json({
        success: false,
        message: 'Backtest retrieval not yet implemented'
    });
});

// ==================== NOTIFICATION ENDPOINTS ====================

/**
 * Get User Notifications
 * GET /api/notifications
 */
app.get('/api/notifications', verifyToken, async (req, res) => {
    try {
        const notifications = await notificationService.getUserNotifications(req.userId);

        res.json({
            success: true,
            notifications
        });
    } catch (error) {
        console.error('[Notification] Error fetching:', error.message);
        res.status(500).json({
            error: error.message
        });
    }
});

/**
 * Mark Notification as Read
 * POST /api/notifications/:id/read
 */
app.post('/api/notifications/:id/read', verifyToken, async (req, res) => {
    try {
        await notificationService.markAsRead(req.params.id);

        res.json({
            success: true,
            message: 'Notification marked as read'
        });
    } catch (error) {
        console.error('[Notification] Error marking as read:', error.message);
        res.status(500).json({
            error: error.message
        });
    }
});

// ==================== BOT DASHBOARD ENDPOINTS ====================

/**
 * Get Bot Statistics (for dashboard)
 * GET /api/bot/:botId/stats
 */
app.get('/api/bot/:botId/stats', (req, res) => {
    const { botId } = req.params;
    const bot = bots.get(botId);

    if (!bot) {
        return res.status(404).json({
            error: 'Bot not found'
        });
    }

    const portfolio = portfolios.get(botId) || { cash: 0, holdings: {} };
    const botOrders = Array.from(orders.values()).filter(o => o.botId === botId);
    
    const winningTrades = botOrders.filter(o => o.gain >= 0).length;
    const losingTrades = botOrders.filter(o => o.gain < 0).length;
    const totalTrades = botOrders.length;

    res.json({
        success: true,
        name: bot.name,
        status: bot.status || 'inactive',
        initialCapital: bot.initialCapital || 100000,
        equity: (portfolio.cash + Object.values(portfolio.holdings || {}).reduce((sum, h) => sum + (h.quantity * (h.currentPrice || 0)), 0)),
        cash: portfolio.cash,
        holdingsValue: Object.values(portfolio.holdings || {}).reduce((sum, h) => sum + (h.quantity * (h.currentPrice || 0)), 0),
        holdingCount: Object.keys(portfolio.holdings || {}).length,
        totalReturn: (portfolio.cash + Object.values(portfolio.holdings || {}).reduce((sum, h) => sum + (h.quantity * (h.currentPrice || 0)), 0)) - (bot.initialCapital || 100000),
        returnPercent: ((portfolio.cash + Object.values(portfolio.holdings || {}).reduce((sum, h) => sum + (h.quantity * (h.currentPrice || 0)), 0)) - (bot.initialCapital || 100000)) / (bot.initialCapital || 100000) * 100,
        totalTrades,
        winningTrades,
        losingTrades,
        winRate: totalTrades > 0 ? (winningTrades / totalTrades * 100) : 0,
        winLossRatio: losingTrades > 0 ? (winningTrades / losingTrades) : (winningTrades > 0 ? winningTrades : 0),
        leverage: 1.0,
        activeOrders: botOrders.filter(o => o.status === 'pending').length,
        recentTrades: botOrders.slice(-10),
        portfolio: portfolio.holdings,
        equityHistory: [/* would contain historical equity values */]
    });
});

/**
 * Start Bot Simulation
 * POST /api/bot/:botId/start
 */
app.post('/api/bot/:botId/start', (req, res) => {
    const { botId } = req.params;
    const bot = bots.get(botId);

    if (!bot) {
        return res.status(404).json({
            error: 'Bot not found'
        });
    }

    bot.status = 'running';
    res.json({
        success: true,
        message: 'Bot simulation started',
        status: bot.status
    });
});

/**
 * Pause Bot Simulation
 * POST /api/bot/:botId/pause
 */
app.post('/api/bot/:botId/pause', (req, res) => {
    const { botId } = req.params;
    const bot = bots.get(botId);

    if (!bot) {
        return res.status(404).json({
            error: 'Bot not found'
        });
    }

    bot.status = 'paused';
    res.json({
        success: true,
        message: 'Bot simulation paused',
        status: bot.status
    });
});

/**
 * Reset Bot Simulation
 * POST /api/bot/:botId/reset
 */
app.post('/api/bot/:botId/reset', (req, res) => {
    const { botId } = req.params;
    const bot = bots.get(botId);

    if (!bot) {
        return res.status(404).json({
            error: 'Bot not found'
        });
    }

    portfolios.set(botId, {
        cash: bot.initialCapital || 100000,
        holdings: {}
    });

    orders.forEach((order, key) => {
        if (order.botId === botId) {
            orders.delete(key);
        }
    });

    bot.status = 'reset';
    res.json({
        success: true,
        message: 'Bot simulation reset',
        status: bot.status
    });
});

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        version: API_VERSION,
        timestamp: new Date(),
        storage: useFirebase ? 'Firebase' : 'In-Memory (Demo Mode)',
        firebaseStatus: useFirebase ? 'Connected' : 'Not Configured'
    });
});

/**
 * Authentication Endpoints
 */

// Register new user
app.post('/api/auth/register', async (req, res) => {
    try {
        const { email, username, password } = req.body;
        const result = await registerUser(email, username, password);
        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            user: result.user,
            token: result.token
        });
    } catch (error) {
        res.status(400).json({
            error: error.message
        });
    }
});

// Login user
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const result = await loginUser(email, password);
        res.json({
            success: true,
            message: 'Login successful',
            user: result.user,
            token: result.token
        });
    } catch (error) {
        res.status(401).json({
            error: error.message
        });
    }
});

// Verify token
app.post('/api/auth/verify', (req, res) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({ error: 'Token required' });
        }

        const decoded = verifyToken(token);
        if (!decoded) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }

        const user = getUserById(decoded.userId);
        res.json({
            valid: true,
            user: user
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * Game Save/Load Endpoints
 */

// Generate and create a new save code
app.post('/api/saves/create', async (req, res) => {
    try {
        let code = generateSaveCode();
        let attempts = 0;
        
        // Ensure uniqueness
        while ((await savecodeExists(code)) && attempts < 100) {
            code = generateSaveCode();
            attempts++;
        }
        
        if (attempts >= 100) {
            return res.status(500).json({
                error: 'Failed to generate unique save code'
            });
        }
        
        const save = await getOrCreateSave(code);
        save.userId = req.user.userId; // Associate with user
        
        res.status(201).json({
            success: true,
            code: code,
            message: 'Save code created successfully',
            storage: useFirebase ? 'Firebase' : 'In-Memory',
            userId: req.user.userId
        });
    } catch (error) {
        console.error('[Save API] Error creating save code:', error.message);
        res.status(500).json({
            error: 'Failed to create save code',
            details: error.message
        });
    }
});

// Get save data by code
app.get('/api/saves/:code', async (req, res) => {
    try {
        const { code } = req.params;
        const upperCode = code.toUpperCase();
        
        let save;
        
        if (useFirebase) {
            try {
                const doc = await firebaseDb.collection('gameSaves').doc(upperCode).get();
                if (!doc.exists) {
                    return res.status(404).json({
                        error: 'Save code not found'
                    });
                }
                save = doc.data();
            } catch (error) {
                console.error('[Firebase] Error fetching save:', error.message);
                return res.status(500).json({
                    error: 'Database error',
                    details: error.message
                });
            }
        } else {
            save = gameSaves.get(upperCode);
            if (!save) {
                return res.status(404).json({
                    error: 'Save code not found'
                });
            }
        }
        
        // Return presets with their names
        const presetsArray = Object.keys(save.presets || {}).map(name => ({
            name: name,
            createdAt: save.presets[name].createdAt,
            data: save.presets[name].data
        }));
        
        res.json({
            code: upperCode,
            createdAt: save.createdAt,
            lastUpdatedAt: save.lastUpdatedAt,
            activePreset: save.activePreset,
            presets: presetsArray,
            storage: useFirebase ? 'Firebase' : 'In-Memory'
        });
    } catch (error) {
        console.error('[Save API] Error getting save:', error.message);
        res.status(500).json({
            error: 'Failed to retrieve save',
            details: error.message
        });
    }
});

// Save game state to a code with a preset name
app.post('/api/saves/:code', async (req, res) => {
    try {
        const { code } = req.params;
        const { gameState, presetName } = req.body;
        
        if (!gameState) {
            return res.status(400).json({
                error: 'Missing gameState in request body'
            });
        }
        
        const upperCode = code.toUpperCase();
        const pName = presetName || 'default';
        
        if (useFirebase) {
            try {
                const docRef = firebaseDb.collection('gameSaves').doc(upperCode);
                const doc = await docRef.get();
                
                let save = doc.exists ? doc.data() : {
                    code: upperCode,
                    createdAt: new Date(),
                    lastUpdatedAt: new Date(),
                    presets: {},
                    activePreset: 'default'
                };
                
                // Update or create the preset
                if (!save.presets) {
                    save.presets = {};
                }
                
                save.presets[pName] = {
                    data: gameState,
                    createdAt: save.presets[pName]?.createdAt || new Date(),
                    updatedAt: new Date()
                };
                
                save.activePreset = pName;
                save.lastUpdatedAt = new Date();
                
                await docRef.set(save);
                
                return res.json({
                    success: true,
                    code: upperCode,
                    presetName: pName,
                    message: `Game state saved to preset "${pName}"`,
                    storage: 'Firebase'
                });
            } catch (error) {
                console.error('[Firebase] Error saving preset:', error.message);
                return res.status(500).json({
                    error: 'Failed to save game state',
                    details: error.message
                });
            }
        } else {
            const save = await getOrCreateSave(code);
            
            // Create or update the preset
            if (!save.presets) {
                save.presets = {};
            }
            
            save.presets[pName] = {
                data: gameState,
                createdAt: save.presets[pName]?.createdAt || new Date(),
                updatedAt: new Date()
            };
            
            save.activePreset = pName;
            save.lastUpdatedAt = new Date();
            
            res.json({
                success: true,
                code: upperCode,
                presetName: pName,
                message: `Game state saved to preset "${pName}"`,
                storage: 'In-Memory'
            });
        }
    } catch (error) {
        console.error('[Save API] Error saving preset:', error.message);
        res.status(500).json({
            error: 'Failed to save game state',
            details: error.message
        });
    }
});

// Load a specific preset from a save code
app.get('/api/saves/:code/preset/:presetName', async (req, res) => {
    try {
        const { code, presetName } = req.params;
        const upperCode = code.toUpperCase();
        
        let save;
        
        if (useFirebase) {
            try {
                const doc = await firebaseDb.collection('gameSaves').doc(upperCode).get();
                if (!doc.exists) {
                    return res.status(404).json({
                        error: 'Save code not found'
                    });
                }
                save = doc.data();
            } catch (error) {
                console.error('[Firebase] Error fetching save:', error.message);
                return res.status(500).json({
                    error: 'Database error',
                    details: error.message
                });
            }
        } else {
            save = gameSaves.get(upperCode);
            if (!save) {
                return res.status(404).json({
                    error: 'Save code not found'
                });
            }
        }
        
        const preset = save.presets?.[presetName];
        
        if (!preset) {
            return res.status(404).json({
                error: `Preset "${presetName}" not found`
            });
        }
        
        res.json({
            code: upperCode,
            presetName: presetName,
            gameState: preset.data,
            createdAt: preset.createdAt,
            updatedAt: preset.updatedAt,
            storage: useFirebase ? 'Firebase' : 'In-Memory'
        });
    } catch (error) {
        console.error('[Save API] Error loading preset:', error.message);
        res.status(500).json({
            error: 'Failed to load preset',
            details: error.message
        });
    }
});

// Delete a preset from a save code
app.delete('/api/saves/:code/preset/:presetName', async (req, res) => {
    try {
        const { code, presetName } = req.params;
        const upperCode = code.toUpperCase();
        
        if (useFirebase) {
            try {
                const docRef = firebaseDb.collection('gameSaves').doc(upperCode);
                const doc = await docRef.get();
                
                if (!doc.exists) {
                    return res.status(404).json({
                        error: 'Save code not found'
                    });
                }
                
                const save = doc.data();
                
                if (!save.presets?.[presetName]) {
                    return res.status(404).json({
                        error: `Preset "${presetName}" not found`
                    });
                }
                
                delete save.presets[presetName];
                
                // If deleted preset was active, set active to first available or none
                if (save.activePreset === presetName) {
                    const remaining = Object.keys(save.presets || {});
                    save.activePreset = remaining.length > 0 ? remaining[0] : null;
                }
                
                save.lastUpdatedAt = new Date();
                await docRef.set(save);
                
                return res.json({
                    success: true,
                    message: `Preset "${presetName}" deleted`,
                    storage: 'Firebase'
                });
            } catch (error) {
                console.error('[Firebase] Error deleting preset:', error.message);
                return res.status(500).json({
                    error: 'Failed to delete preset',
                    details: error.message
                });
            }
        } else {
            const save = gameSaves.get(upperCode);
            
            if (!save) {
                return res.status(404).json({
                    error: 'Save code not found'
                });
            }
            
            if (!save.presets?.[presetName]) {
                return res.status(404).json({
                    error: `Preset "${presetName}" not found`
                });
            }
            
            delete save.presets[presetName];
            
            // If deleted preset was active, set active to first available or none
            if (save.activePreset === presetName) {
                const remaining = Object.keys(save.presets || {});
                save.activePreset = remaining.length > 0 ? remaining[0] : null;
            }
            
            res.json({
                success: true,
                message: `Preset "${presetName}" deleted`,
                storage: 'In-Memory'
            });
        }
    } catch (error) {
        console.error('[Save API] Error deleting preset:', error.message);
        res.status(500).json({
            error: 'Failed to delete preset',
            details: error.message
        });
    }
});

// Register Bot
app.post('/api/bot/register', (req, res) => {
    const { name, type, api_key, description } = req.body;

    if (!name || !api_key) {
        return res.status(400).json({
            error: 'Missing required fields: name, api_key'
        });
    }

    const botId = `bot_${botIdCounter++}`;
    const bot = {
        id: botId,
        name: name,
        type: type || 'Python',
        api_key: api_key,
        description: description || '',
        registeredAt: new Date(),
        lastHeartbeat: new Date(),
        status: 'connected',
        totalOrders: 0,
        filledOrders: 0,
        rejectedOrders: 0
    };

    bots.set(botId, bot);

    // Initialize portfolio for bot
    portfolios.set(botId, {
        cash: 100000,
        holdings: new Map(),
        totalValue: 100000,
        realizedGains: 0,
        unrealizedGains: 0
    });

    res.status(201).json({
        success: true,
        bot_id: botId,
        message: `Bot '${name}' registered successfully`,
        api_endpoint: `/api/bot/${botId}`,
        dashboard_url: `/bot-dashboard.html?botId=${botId}`
    });
});

// Get Bot Status
app.get('/api/bot/:botId', (req, res) => {
    const { botId } = req.params;
    const bot = bots.get(botId);

    if (!bot) {
        return res.status(404).json({ error: 'Bot not found' });
    }

    res.json(bot);
});

// Disconnect Bot
app.post('/api/bot/:botId/disconnect', (req, res) => {
    const { botId } = req.params;
    const bot = bots.get(botId);

    if (!bot) {
        return res.status(404).json({ error: 'Bot not found' });
    }

    bot.status = 'disconnected';
    bot.lastHeartbeat = new Date();

    res.json({
        success: true,
        message: `Bot '${bot.name}' disconnected`
    });
});

// Place Order
app.post('/api/bot/order', (req, res) => {
    const { bot_id, symbol, action, quantity, limit_price, api_key } = req.body;

    // Validate authentication
    const bot = bots.get(bot_id);
    if (!bot || bot.api_key !== api_key) {
        return res.status(401).json({ error: 'Invalid bot_id or api_key' });
    }

    // Validate order
    if (!symbol || !action || !quantity) {
        return res.status(400).json({
            error: 'Missing required fields: symbol, action, quantity'
        });
    }

    if (!['buy', 'sell'].includes(action.toLowerCase())) {
        return res.status(400).json({
            error: 'Invalid action. Must be "buy" or "sell"'
        });
    }

    const market = marketData.get(symbol.toUpperCase());
    if (!market) {
        return res.status(404).json({ error: `Symbol '${symbol}' not found` });
    }

    const orderId = `order_${orderIdCounter++}`;
    const price = limit_price || market.price;
    const totalCost = price * quantity;

    const portfolio = portfolios.get(bot_id);
    const order = {
        id: orderId,
        bot_id: bot_id,
        symbol: symbol.toUpperCase(),
        action: action.toLowerCase(),
        quantity: quantity,
        price: price,
        totalCost: totalCost,
        status: 'pending',
        createdAt: new Date(),
        filledAt: null,
        commission: totalCost * 0.001 // 0.1% commission
    };

    // Check if order can be filled
    let filled = false;
    if (action.toLowerCase() === 'buy') {
        if (portfolio.cash >= totalCost + order.commission) {
            filled = true;
        }
    } else if (action.toLowerCase() === 'sell') {
        const holding = portfolio.holdings.get(symbol.toUpperCase());
        if (holding && holding.quantity >= quantity) {
            filled = true;
        }
    }

    if (filled) {
        // Execute order
        order.status = 'filled';
        order.filledAt = new Date();

        if (action.toLowerCase() === 'buy') {
            portfolio.cash -= totalCost + order.commission;
            const holding = portfolio.holdings.get(symbol.toUpperCase());
            if (holding) {
                holding.quantity += quantity;
                holding.costBasis += totalCost;
            } else {
                portfolio.holdings.set(symbol.toUpperCase(), {
                    symbol: symbol.toUpperCase(),
                    quantity: quantity,
                    costBasis: totalCost,
                    currentPrice: price
                });
            }
        } else if (action.toLowerCase() === 'sell') {
            portfolio.cash += (totalCost - order.commission);
            const holding = portfolio.holdings.get(symbol.toUpperCase());
            if (holding) {
                holding.quantity -= quantity;
                if (holding.quantity === 0) {
                    portfolio.holdings.delete(symbol.toUpperCase());
                }
            }
        }

        bot.filledOrders++;
    } else {
        order.status = 'rejected';
        order.rejectReason = action.toLowerCase() === 'buy'
            ? 'Insufficient cash'
            : 'Insufficient shares';
        bot.rejectedOrders++;
    }

    bot.totalOrders++;
    orders.set(orderId, order);

    // Broadcast order to subscribed clients
    broadcastOrderUpdate(orderId, order);

    res.status(filled ? 201 : 400).json({
        success: filled,
        order_id: orderId,
        status: order.status,
        message: filled ? 'Order filled successfully' : `Order rejected: ${order.rejectReason}`
    });
});

// Get Market Data
app.get('/api/market/data', (req, res) => {
    const { symbol } = req.query;

    if (symbol) {
        const market = marketData.get(symbol.toUpperCase());
        if (market) {
            return res.json(market);
        } else {
            return res.status(404).json({ error: 'Symbol not found' });
        }
    }

    // Return all market data
    const allMarkets = Array.from(marketData.values());
    res.json(allMarkets);
});

// Get Portfolio
app.get('/api/portfolio', (req, res) => {
    const { bot_id } = req.query;

    if (!bot_id) {
        return res.status(400).json({ error: 'Missing bot_id' });
    }

    const portfolio = portfolios.get(bot_id);
    if (!portfolio) {
        return res.status(404).json({ error: 'Portfolio not found' });
    }

    // Calculate portfolio value
    let totalValue = portfolio.cash;
    const holdings = [];

    portfolio.holdings.forEach((holding) => {
        const market = marketData.get(holding.symbol);
        const currentValue = (market ? market.price : 0) * holding.quantity;
        totalValue += currentValue;
        holdings.push({
            symbol: holding.symbol,
            quantity: holding.quantity,
            costBasis: holding.costBasis,
            currentValue: currentValue,
            gainLoss: currentValue - holding.costBasis
        });
    });

    res.json({
        bot_id: bot_id,
        cash: portfolio.cash,
        holdings: holdings,
        totalValue: totalValue,
        realizedGains: portfolio.realizedGains,
        unrealizedGains: totalValue - 100000, // Assuming 100k starting
        percentReturn: ((totalValue - 100000) / 100000 * 100).toFixed(2) + '%'
    });
});

// Get list of all registered bots (admin/overview)
app.get('/api/bots', (req, res) => {
    const botArray = Array.from(bots.entries()).map(([id, bot]) => {
        const portfolio = portfolios.get(id);
        const profit = portfolio ? portfolio.unrealizedGains : 0;
        return {
            bot_id: id,
            name: bot.name,
            status: bot.status,
            registeredAt: bot.registeredAt,
            lastHeartbeat: bot.lastHeartbeat,
            totalOrders: bot.totalOrders,
            filledOrders: bot.filledOrders,
            rejectedOrders: bot.rejectedOrders,
            winRate: bot.filledOrders + bot.rejectedOrders > 0
                ? (bot.filledOrders / (bot.filledOrders + bot.rejectedOrders) * 100).toFixed(2) + '%'
                : '0%',
            currentProfit: profit,
            profitPercentage: portfolio ? ((profit / 100000) * 100).toFixed(2) + '%' : '0%'
        };
    });
    res.json({ bots: botArray });
});

// Demo bot creation helper
app.post('/api/bot/demo', (req, res) => {
    const botId = `bot_${botIdCounter++}`;
    const bot = {
        id: botId,
        name: `DemoBot_${botIdCounter}`,
        type: 'demo',
        api_key: 'demo-'+Math.random().toString(36).substr(2,8),
        description: 'Automatically generated demo bot',
        registeredAt: new Date(),
        lastHeartbeat: new Date(),
        status: 'connected',
        totalOrders: 0,
        filledOrders: 0,
        rejectedOrders: 0
    };
    bots.set(botId, bot);
    portfolios.set(botId, {
        cash: 100000,
        holdings: new Map(),
        totalValue: 100000,
        realizedGains: 0,
        unrealizedGains: 0
    });
    res.json({ success: true, bot_id: botId, name: bot.name, dashboard_url: `/bot-dashboard.html?botId=${botId}` });
});

// Get Bot Statistics
app.get('/api/bot/:botId/stats', (req, res) => {
    const { botId } = req.params;
    const bot = bots.get(botId);

    if (!bot) {
        return res.status(404).json({ error: 'Bot not found' });
    }

    const portfolio = portfolios.get(botId);
    const profit = portfolio ? portfolio.unrealizedGains : 0;

    res.json({
        bot_id: botId,
        name: bot.name,
        status: bot.status,
        registeredAt: bot.registeredAt,
        lastHeartbeat: bot.lastHeartbeat,
        totalOrders: bot.totalOrders,
        filledOrders: bot.filledOrders,
        rejectedOrders: bot.rejectedOrders,
        winRate: bot.filledOrders + bot.rejectedOrders > 0
            ? (bot.filledOrders / (bot.filledOrders + bot.rejectedOrders) * 100).toFixed(2) + '%'
            : '0%',
        currentProfit: profit,
        profitPercentage: portfolio ? ((profit / 100000) * 100).toFixed(2) + '%' : '0%'
    });
});

// Get Order History
app.get('/api/bot/:botId/orders', (req, res) => {
    const { botId } = req.params;
    
    const botOrders = Array.from(orders.values())
        .filter(order => order.bot_id === botId);

    res.json({
        bot_id: botId,
        orders: botOrders,
        total: botOrders.length,
        filled: botOrders.filter(o => o.status === 'filled').length,
        rejected: botOrders.filter(o => o.status === 'rejected').length
    });
});

/**
 * WebSocket Handlers
 */

wss.on('connection', (ws) => {
    console.log('Client connected');
    const clientId = Math.random().toString(36).substr(2, 9);

    // Handle incoming messages
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);

            switch (data.type) {
                case 'subscribe':
                    handleSubscribe(clientId, ws, data);
                    break;
                case 'unsubscribe':
                    handleUnsubscribe(clientId, data);
                    break;
                case 'ping':
                    ws.send(JSON.stringify({ type: 'pong', timestamp: new Date() }));
                    break;
                default:
                    ws.send(JSON.stringify({ error: 'Unknown message type' }));
            }
        } catch (error) {
            console.error('WebSocket error:', error);
            ws.send(JSON.stringify({ error: 'Invalid message format' }));
        }
    });

    ws.on('close', () => {
        console.log('Client disconnected');
        subscriptions.delete(clientId);
    });
});

function handleSubscribe(clientId, ws, data) {
    const { channel } = data;

    if (!subscriptions.has(clientId)) {
        subscriptions.set(clientId, new Set());
    }

    subscriptions.get(clientId).add(channel);

    // Send initial data based on channel
    if (channel === 'market_data') {
        ws.send(JSON.stringify({
            type: 'market_snapshot',
            data: Array.from(marketData.values())
        }));
    }

    ws.send(JSON.stringify({
        type: 'subscribed',
        channel: channel,
        message: `Subscribed to ${channel}`
    }));
}

function handleUnsubscribe(clientId, data) {
    const { channel } = data;

    if (subscriptions.has(clientId)) {
        subscriptions.get(clientId).delete(channel);
    }
}

function broadcastOrderUpdate(orderId, order) {
    const message = JSON.stringify({
        type: 'order_update',
        order_id: orderId,
        status: order.status,
        data: order
    });

    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

/**
 * Market Data Updates
 */

// Simulate price updates every 5 seconds
setInterval(() => {
    const updated = [];

    marketData.forEach((stock, symbol) => {
        // Simulate small price movements
        const changePercent = (Math.random() - 0.5) * 0.02; // ±1%
        const multiplier = 1 + changePercent;
        stock.price = Math.max(0.01, stock.price * multiplier);
        stock.lastUpdate = Date.now();

        updated.push({
            symbol: symbol,
            price: stock.price,
            change: (stock.price * changePercent).toFixed(2),
            changePercent: (changePercent * 100).toFixed(2) + '%'
        });
    });

    // Broadcast to WebSocket subscribers
    const message = JSON.stringify({
        type: 'market_update',
        data: updated,
        timestamp: new Date()
    });

    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}, 5000);

/**
 * Error Handling
 */

app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

app.use((req, res) => {
    res.status(404).json({
        error: 'Endpoint not found',
        path: req.path,
        method: req.method
    });
});

/**
 * Server Startup
 */

server.listen(PORT, '0.0.0.0', () => {
    console.log(`
    ╔══════════════════════════════════════════════╗
    ║     Stock Testing Bot API Server v${API_VERSION}      ║
    ║          Running on port ${PORT}                  ║
    ╚══════════════════════════════════════════════╝
    
    REST API: http://localhost:${PORT}/api
    WebSocket: ws://localhost:${PORT}
    Health Check: http://localhost:${PORT}/health
    
    Available endpoints:
    ✓ POST   /api/saves/create
    ✓ GET    /api/saves/:code
    ✓ POST   /api/saves/:code
    ✓ GET    /api/saves/:code/preset/:presetName
    ✓ DELETE /api/saves/:code/preset/:presetName
    ✓ POST   /api/bot/register
    ✓ GET    /api/bot/:botId
    ✓ POST   /api/bot/:botId/disconnect
    ✓ POST   /api/bot/order
    ✓ GET    /api/market/data
    ✓ GET    /api/portfolio
    ✓ GET    /api/bot/:botId/stats
    ✓ GET    /api/bot/:botId/orders
    ✓ POST   /api/bot/:botId/training/start
    ✓ POST   /api/bot/:botId/training/stop
    ✓ POST   /api/bot/:botId/training/reset
    ✓ GET    /api/bot/:botId/training/stats
    ✓ WS     (WebSocket for real-time updates)
    `);

    initializeMarketData();
});

/**
 * Note: Backtesting and Notification endpoints are defined above in the main API section
 * Bot Training endpoints have been replaced with new /api/bot/:botId/* endpoints
 */

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down gracefully...');
    wss.clients.forEach((client) => {
        client.close();
    });
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

module.exports = { app, server, wss };
