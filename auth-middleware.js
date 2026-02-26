/**
 * Authentication Middleware for JWT verification
 * Handles user authentication, token validation, and user context
 */

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/**
 * Verify JWT token and extract user info
 * Middleware that checks Authorization header for valid JWT
 */
function verifyToken(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({
            error: 'No token provided',
            message: 'Please login first'
        });
    }
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.userId = decoded.userId;
        req.userEmail = decoded.email || decoded.username;
        req.userRole = decoded.role || 'user';
        next();
    } catch (error) {
        return res.status(401).json({
            error: 'Invalid token',
            message: error.message
        });
    }
}

/**
 * Verify optional token - doesn't fail if no token, but sets userId if valid
 */
function verifyOptionalToken(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (token) {
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            req.userId = decoded.userId;
            req.userEmail = decoded.email;
        } catch (error) {
            // Token invalid but optional, so we continue without user
            console.log('[Auth] Optional token invalid:', error.message);
        }
    }
    next();
}

/**
 * Generate JWT token for user
 */
function generateToken(userId, emailOrUsername, role = 'user') {
    return jwt.sign(
        { userId, email: emailOrUsername, username: emailOrUsername, role, iat: Date.now() },
        JWT_SECRET,
        { expiresIn: '30d' } // Token valid for 30 days
    );
}

module.exports = {
    verifyToken,
    verifyOptionalToken,
    generateToken,
    JWT_SECRET
};
