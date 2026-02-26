// Authentication Module
// Handles user registration, login, and JWT token management

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// In-memory user storage (in production, use Firebase)
const users = new Map(); // email -> user object

// JWT secret (use environment variable in production)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRY = '7d'; // 7 days

/**
 * Hash a password using bcrypt
 */
async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

/**
 * Compare password with hash
 */
async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

/**
 * Generate JWT token for user
 */
function generateToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      username: user.username
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );
}

/**
 * Verify and decode JWT token
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

/**
 * Register new user
 */
async function registerUser(email, username, password) {
  // Validate input
  if (!email || !username || !password) {
    throw new Error('Email, username, and password are required');
  }

  if (password.length < 6) {
    throw new Error('Password must be at least 6 characters');
  }

  // Check if user exists
  if (users.has(email.toLowerCase())) {
    throw new Error('Email already registered');
  }

  // Hash password
  const hashedPassword = await hashPassword(password);

  // Create user
  const user = {
    id: `user_${Date.now()}`,
    email: email.toLowerCase(),
    username: username,
    passwordHash: hashedPassword,
    createdAt: new Date(),
    profile: {
      totalGames: 0,
      totalReturns: 0,
      bestPerformance: 0,
      favoriteStocks: []
    },
    settings: {
      notifications: true,
      darkMode: false,
      twoFactorEnabled: false
    }
  };

  users.set(email.toLowerCase(), user);

  // Generate token
  const token = generateToken(user);

  return {
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      createdAt: user.createdAt
    },
    token: token
  };
}

/**
 * Login user
 */
async function loginUser(email, password) {
  // Validate input
  if (!email || !password) {
    throw new Error('Email and password are required');
  }

  // Find user
  const user = users.get(email.toLowerCase());
  if (!user) {
    throw new Error('Invalid email or password');
  }

  // Check password
  const isValid = await comparePassword(password, user.passwordHash);
  if (!isValid) {
    throw new Error('Invalid email or password');
  }

  // Generate token
  const token = generateToken(user);

  return {
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      createdAt: user.createdAt,
      profile: user.profile,
      settings: user.settings
    },
    token: token
  };
}

/**
 * Get user by ID
 */
function getUserById(userId) {
  for (const user of users.values()) {
    if (user.id === userId) {
      return {
        id: user.id,
        email: user.email,
        username: user.username,
        createdAt: user.createdAt,
        profile: user.profile,
        settings: user.settings
      };
    }
  }
  return null;
}

/**
 * Update user profile
 */
function updateUserProfile(userId, updates) {
  for (const user of users.values()) {
    if (user.id === userId) {
      if (updates.totalGames !== undefined) user.profile.totalGames = updates.totalGames;
      if (updates.totalReturns !== undefined) user.profile.totalReturns = updates.totalReturns;
      if (updates.bestPerformance !== undefined) user.profile.bestPerformance = updates.bestPerformance;
      if (updates.favoriteStocks !== undefined) user.profile.favoriteStocks = updates.favoriteStocks;
      return true;
    }
  }
  return false;
}

/**
 * Update user settings
 */
function updateUserSettings(userId, settings) {
  for (const user of users.values()) {
    if (user.id === userId) {
      user.settings = { ...user.settings, ...settings };
      return true;
    }
  }
  return false;
}

/**
 * Middleware to verify JWT token
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      error: 'Access token required'
    });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(403).json({
      error: 'Invalid or expired token'
    });
  }

  req.user = decoded;
  next();
}

module.exports = {
  hashPassword,
  comparePassword,
  generateToken,
  verifyToken,
  registerUser,
  loginUser,
  getUserById,
  updateUserProfile,
  updateUserSettings,
  authenticateToken,
  users // Export for testing/admin
};
