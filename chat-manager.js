const { getDatabase, isFirebaseReady } = require('./firebase-config');
const { getUserProfile } = require('./user-manager');
const { logger } = require('./logger');

// In-memory chat store for demo mode
const chatMessages = [];

/**
 * Add a message to the chat log. Includes the sender's display name and timestamp.
 * @param {string} userId
 * @param {string} text
 * @returns {object} message object
 */
async function addMessage(userId, text) {
    const timestamp = new Date();
    // try to fetch user info for display name
    let displayName = 'Unknown';
    try {
        const user = await getUserProfile(userId);
        displayName = user.displayName || user.username || user.email || 'User';
    } catch (e) {
        logger.warn('[Chat] Could not fetch user profile: ' + e.message);
    }

    const msg = {
        messageId: `msg_${Date.now()}_${Math.random().toString(36).substr(2,8)}`,
        userId,
        displayName,
        text,
        timestamp
    };

    if (isFirebaseReady()) {
        try {
            const db = getDatabase();
            await db.collection('chatMessages').doc(msg.messageId).set(msg);
            logger.debug('[Chat] Message added to Firebase');
        } catch (err) {
            logger.error('[Chat] Firebase error adding message: ' + err.message);
            chatMessages.push(msg); // fallback
        }
    } else {
        chatMessages.push(msg);
    }

    return msg;
}

/**
 * Retrieve chat messages with pagination support.
 * Returns latest messages first (descending order by timestamp).
 * @param {number} limit - number of messages to return
 * @param {number} offset - number of messages to skip
 * @returns {object} { messages: array, total: number }
 */
async function getMessages(limit = 50, offset = 0) {
    try {
        if (isFirebaseReady()) {
            try {
                const db = getDatabase();
                // Get total count
                const countSnapshot = await db.collection('chatMessages').get();
                const total = countSnapshot.size;

                // Get paginated messages (descending order)
                const snapshot = await db.collection('chatMessages')
                    .orderBy('timestamp', 'desc')
                    .limit(limit)
                    .offset(offset)
                    .get();

                const msgs = [];
                snapshot.forEach(doc => msgs.push(doc.data()));
                
                // Reverse to get ascending order for display
                msgs.reverse();
                
                logger.debug(`[Chat] Retrieved ${msgs.length}/${total} messages`);
                return { messages: msgs, total };
            } catch (err) {
                logger.warn('[Chat] Firebase error, falling back to in-memory: ' + err.message);
                return getInMemoryMessages(limit, offset);
            }
        }
        
        return getInMemoryMessages(limit, offset);
    } catch (err) {
        logger.error('[Chat] Error in getMessages: ' + err.message);
        return { messages: [], total: 0 };
    }
}

/**
 * Get messages from in-memory store with pagination
 */
function getInMemoryMessages(limit, offset) {
    const total = chatMessages.length;
    const messages = chatMessages
        .slice()
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
        .slice(-limit - offset)
        .slice(-limit);
    
    return { messages, total };
}

module.exports = {
    addMessage,
    getMessages
};
