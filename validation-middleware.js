/**
 * Input Validation Middleware
 * Uses Joi for schema validation with clear, consistent error messages
 */

const Joi = require('joi');

/**
 * Validates request body against a schema
 * Returns middleware function for Express
 */
function validateRequest(schema) {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.body, {
            abortEarly: false,
            stripUnknown: true // Remove unknown fields
        });

        if (error) {
            const details = error.details.map(d => ({
                field: d.path.join('.'),
                message: d.message
            }));
            return res.status(400).json({
                error: 'Validation failed',
                details
            });
        }

        req.body = value; // Replace with validated/cleaned data
        next();
    };
}

// ==================== VALIDATION SCHEMAS ====================

const schemas = {
    // Authentication schemas
    register: Joi.object({
        email: Joi.string().email().optional(),
        username: Joi.string().alphanum().min(3).max(30).optional(),
        password: Joi.string().min(8).max(128).required(),
        displayName: Joi.string().max(100).optional(),
        role: Joi.string().valid('user', 'tester', 'admin').optional()
    }).min(2, 'email or username is required along with password'),

    login: Joi.object({
        identifier: Joi.string().min(3).required(),
        password: Joi.string().min(1).required()
    }),

    // Chat schema
    chatMessage: Joi.object({
        text: Joi.string().trim().min(1).max(2000).required()
    }),

    // Bot schemas
    botRegister: Joi.object({
        botId: Joi.string().alphanum().max(50).required(),
        strategy: Joi.string().max(100).optional(),
        initialCapital: Joi.number().positive().optional()
    }),

    botOrder: Joi.object({
        botId: Joi.string().required(),
        symbol: Joi.string().min(1).max(5).required(),
        type: Joi.string().valid('buy', 'sell').required(),
        quantity: Joi.number().positive().required(),
        price: Joi.number().positive().required()
    }),

    // Backtest schema
    backtest: Joi.object({
        symbol: Joi.string().required(),
        strategy: Joi.string().required(),
        startDate: Joi.date().optional(),
        endDate: Joi.date().optional(),
        parameters: Joi.object().optional()
    }),

    // Save schema
    gameSave: Joi.object({
        gameState: Joi.object().required(),
        presetName: Joi.string().max(100).optional()
    })
};

module.exports = {
    validateRequest,
    schemas
};
