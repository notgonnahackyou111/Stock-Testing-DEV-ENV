/**
 * Structured Logging Module
 * Using Winston for professional-grade logging with multiple transports
 */

const winston = require('winston');
const path = require('path');

// Define log levels with custom colors
const levels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4
};

const colors = {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'white'
};

winston.addColors(colors);

// Define log format
const format = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
);

// Define transports (console and file)
const transports = [
    // Console transport
    new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize({ all: true }),
            winston.format.printf(
                (info) => `${info.timestamp} [${info.level}] ${info.message}`
            )
        )
    }),
    // File transports
    new winston.transports.File({
        filename: path.join(__dirname, 'logs', 'error.log'),
        level: 'error',
        format: format
    }),
    new winston.transports.File({
        filename: path.join(__dirname, 'logs', 'all.log'),
        format: format
    })
];

// Create logger instance
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'debug',
    levels,
    format,
    transports,
    exceptionHandlers: [
        new winston.transports.File({
            filename: path.join(__dirname, 'logs', 'exceptions.log')
        })
    ],
    rejectionHandlers: [
        new winston.transports.File({
            filename: path.join(__dirname, 'logs', 'rejections.log')
        })
    ]
});

/**
 * HTTP request logging middleware for Express
 * Logs request method, URL, status code, and response time
 */
const httpLogger = (req, res, next) => {
    const start = Date.now();
    
    res.on('finish', () => {
        const duration = Date.now() - start;
        const logMessage = `${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`;
        
        if (res.statusCode >= 500) {
            logger.error(logMessage);
        } else if (res.statusCode >= 400) {
            logger.warn(logMessage);
        } else {
            logger.http(logMessage);
        }
    });
    
    next();
};

module.exports = {
    logger,
    httpLogger
};
