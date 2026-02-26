/**
 * User Management Module
 * Handles user registration, login, and profile management with Firebase
 */

const bcrypt = require('bcryptjs');
const { getDatabase, isFirebaseReady } = require('./firebase-config');
const { generateToken } = require('./auth-middleware');

// In-memory user store for when Firebase is not configured
const users = new Map();

/**
 * Hash password with bcrypt
 */
async function hashPassword(password) {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
}

/**
 * Check if username already exists
 */
async function usernameExists(username) {
    const db = getDatabase();
    const lower = username.toLowerCase().trim();
    if (db && isFirebaseReady()) {
        try {
            const snapshot = await db.collection('users')
                .where('username', '==', lower)
                .limit(1)
                .get();
            return !snapshot.empty;
        } catch (error) {
            console.error('[User] Error checking username:', error.message);
            return false;
        }
    }
    for (let user of users.values()) {
        if (user.username === lower) {
            return true;
        }
    }
    return false;
}

/**
 * Verify password against hash
 */
async function verifyPassword(password, hash) {
    return bcrypt.compare(password, hash);
}

/**
 * Check if email already exists
 */
async function emailExists(email) {
    const db = getDatabase();
    
    if (db && isFirebaseReady()) {
        try {
            const snapshot = await db.collection('users')
                .where('email', '==', email.toLowerCase())
                .limit(1)
                .get();
            return !snapshot.empty;
        } catch (error) {
            console.error('[User] Error checking email:', error.message);
            return false;
        }
    }
    
    // Fallback to in-memory
    for (let user of users.values()) {
        if (user.email === email.toLowerCase()) {
            return true;
        }
    }
    return false;
}

/**
 * Register new user
 */
async function registerUser({ email, username, password, displayName, role = 'user' }) {
    const db = getDatabase();
    const emailLower = email ? email.toLowerCase() : null;
    const userLower = username ? username.toLowerCase().trim() : null;

    // Basic validation
    if (!password || password.length < 6) {
        throw new Error('Password must be at least 6 characters');
    }

    if (emailLower) {
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(emailLower)) {
            throw new Error('Invalid email format');
        }
        if (await emailExists(emailLower)) {
            throw new Error('Email already registered');
        }
    }

    if (userLower) {
        if (await usernameExists(userLower)) {
            throw new Error('Username already taken');
        }
    }

    const passwordHash = await hashPassword(password);
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const userData = {
        userId,
        email: emailLower,
        username: userLower,
        displayName: displayName || (emailLower ? emailLower.split('@')[0] : userLower),
        passwordHash,
        role,
        createdAt: new Date(),
        updatedAt: new Date(),
        status: 'active',
        stats: {
            gamesPlayed: 0,
            totalReturns: 0,
            bestReturn: 0,
            averageReturn: 0
        }
    };

    if (db && isFirebaseReady()) {
        try {
            await db.collection('users').doc(userId).set(userData);
            console.log(`[User] Register: New user ${emailLower || userLower} created in Firebase`);
        } catch (error) {
            console.error('[User] Error registering in Firebase:', error.message);
            throw new Error('Failed to register user');
        }
    } else {
        // Fallback to in-memory
        users.set(userId, userData);
        console.log(`[User] Register: New user ${emailLower || userLower} created in memory`);
    }

    // Return user data without password
    return {
        userId,
        email: userData.email,
        username: userData.username,
        displayName: userData.displayName,
        role: userData.role,
        createdAt: userData.createdAt
    };
}

/**
 * Login user
 */
async function loginUser(identifier, password) {
    const db = getDatabase();
    const idLower = identifier.toLowerCase().trim();
    let userData = null;

    // try find by email or username
    if (db && isFirebaseReady()) {
        try {
            let snapshot = await db.collection('users')
                .where('email', '==', idLower)
                .limit(1)
                .get();
            if (snapshot.empty) {
                // try username
                snapshot = await db.collection('users')
                    .where('username', '==', idLower)
                    .limit(1)
                    .get();
            }
            if (snapshot.empty) {
                throw new Error('User not found');
            }
            userData = snapshot.docs[0].data();
        } catch (error) {
            console.error('[User] Error fetching user:', error.message);
            throw new Error('Login failed');
        }
    } else {
        // Fallback to in-memory
        for (let user of users.values()) {
            if ((user.email && user.email === idLower) || (user.username && user.username === idLower)) {
                userData = user;
                break;
            }
        }
    }

    if (!userData) {
        throw new Error('User not found');
    }

    // Verify password
    const isValid = await verifyPassword(password, userData.passwordHash);
    if (!isValid) {
        throw new Error('Invalid password');
    }

    console.log(`[User] Login: ${idLower} logged in successfully`);

    // Generate token including role
    const token = generateToken(userData.userId, userData.email || userData.username, userData.role);

    // Return user data without password
    return {
        userId: userData.userId,
        email: userData.email,
        username: userData.username,
        displayName: userData.displayName,
        role: userData.role,
        token,
        stats: userData.stats
    };
}

/**
 * Get user profile
 */
async function getUserProfile(userId) {
    const db = getDatabase();
    
    if (db && isFirebaseReady()) {
        try {
            const doc = await db.collection('users').doc(userId).get();
            if (!doc.exists) {
                throw new Error('User not found');
            }
            const userData = doc.data();
            return {
                userId: userData.userId,
                email: userData.email,
                username: userData.username,
                displayName: userData.displayName,
                role: userData.role,
                createdAt: userData.createdAt,
                stats: userData.stats
            };
        } catch (error) {
            console.error('[User] Error getting profile:', error.message);
            throw error;
        }
    } else {
        const userData = users.get(userId);
        if (!userData) {
            throw new Error('User not found');
        }
        return {
            userId: userData.userId,
            email: userData.email,
            username: userData.username,
            displayName: userData.displayName,
            role: userData.role,
            createdAt: userData.createdAt,
            stats: userData.stats
        };
    }
}

/**
 * Update user stats
 */
async function updateUserStats(userId, gameStats) {
    const db = getDatabase();
    
    if (db && isFirebaseReady()) {
        try {
            const userRef = db.collection('users').doc(userId);
            const doc = await userRef.get();
            
            if (!doc.exists) {
                throw new Error('User not found');
            }
            
            const userData = doc.data();
            const stats = userData.stats || {};
            
            // Update stats
            stats.gamesPlayed = (stats.gamesPlayed || 0) + 1;
            stats.totalReturns = (stats.totalReturns || 0) + gameStats.returnPercent;
            stats.bestReturn = Math.max(stats.bestReturn || 0, gameStats.returnPercent);
            stats.averageReturn = stats.totalReturns / stats.gamesPlayed;
            
            await userRef.update({
                stats,
                updatedAt: new Date()
            });
            
            return stats;
        } catch (error) {
            console.error('[User] Error updating stats:', error.message);
            throw error;
        }
    } else {
        const userData = users.get(userId);
        if (!userData) {
            throw new Error('User not found');
        }
        
        const stats = userData.stats || {};
        stats.gamesPlayed = (stats.gamesPlayed || 0) + 1;
        stats.totalReturns = (stats.totalReturns || 0) + gameStats.returnPercent;
        stats.bestReturn = Math.max(stats.bestReturn || 0, gameStats.returnPercent);
        stats.averageReturn = stats.totalReturns / stats.gamesPlayed;
        
        userData.stats = stats;
        userData.updatedAt = new Date();
        
        return stats;
    }
}

// Helpers for administrative accounts
async function createAdminAccount(username, password, displayName) {
    return registerUser({ username, password, displayName, role: 'admin' });
}

async function createTesterAccount(username, password, displayName) {
    return registerUser({ username, password, displayName, role: 'tester' });
}

/**
 * Force create or update a user (used for seeding admin/tester accounts at startup).
 * If the username or email exists it will overwrite the password and role.
 */
async function forceCreateUser({ email, username, password, displayName, role = 'user' }) {
    const db = getDatabase();
    const emailLower = email ? email.toLowerCase() : null;
    const userLower = username ? username.toLowerCase().trim() : null;

    const passwordHash = await hashPassword(password);
    let userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const userData = {
        userId,
        email: emailLower,
        username: userLower,
        displayName: displayName || (emailLower ? emailLower.split('@')[0] : userLower),
        passwordHash,
        role,
        createdAt: new Date(),
        updatedAt: new Date(),
        status: 'active',
        stats: {
            gamesPlayed: 0,
            totalReturns: 0,
            bestReturn: 0,
            averageReturn: 0
        }
    };

    if (db && isFirebaseReady()) {
        try {
            // try find existing user by username or email
            let snapshot = null;
            if (emailLower) {
                snapshot = await db.collection('users').where('email', '==', emailLower).limit(1).get();
            }
            if (!snapshot || snapshot.empty) {
                snapshot = await db.collection('users').where('username', '==', userLower).limit(1).get();
            }

            if (snapshot && !snapshot.empty) {
                const doc = snapshot.docs[0];
                userId = doc.id;
                await db.collection('users').doc(userId).update(Object.assign({}, userData, { userId }));
                return Object.assign({}, userData, { userId });
            }

            await db.collection('users').doc(userId).set(userData);
            return userData;
        } catch (error) {
            console.error('[User] forceCreateUser Firebase error:', error.message);
            // fall through to in-memory
        }
    }

    // in-memory fallback: remove any existing by username/email
    for (let [id, u] of users.entries()) {
        if ((emailLower && u.email === emailLower) || (userLower && u.username === userLower)) {
            userId = id;
            users.set(userId, Object.assign({}, userData, { userId }));
            return Object.assign({}, userData, { userId });
        }
    }

    users.set(userId, Object.assign({}, userData, { userId }));
    return Object.assign({}, userData, { userId });
}

module.exports = {
    registerUser,
    loginUser,
    getUserProfile,
    updateUserStats,
    emailExists,
    usernameExists,
    hashPassword,
    verifyPassword,
    createAdminAccount,
    createTesterAccount
};

module.exports.forceCreateUser = forceCreateUser;

