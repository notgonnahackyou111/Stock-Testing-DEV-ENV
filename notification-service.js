/**
 * Push Notifications Service
 * Handles email notifications, webhooks, and in-app notifications
 */

const { getDatabase, isFirebaseReady } = require('./firebase-config');

class NotificationService {
    constructor() {
        this.notifications = new Map(); // In-memory storage for when Firebase not available
        this.webhooks = new Map();
    }

    /**
     * Send email notification (placeholder - integrate with SendGrid, AWS SES, etc)
     */
    async sendEmailNotification(email, subject, body, data = {}) {
        console.log(`[Notification] Email queued for ${email}`);
        console.log(`[Notification] Subject: ${subject}`);
        
        // In production, integrate with email service:
        // - SendGrid
        // - AWS SES
        // - Mailgun
        // - Firebase Cloud Messaging
        
        // For now, just log
        return {
            success: true,
            type: 'email',
            email,
            subject,
            timestamp: new Date()
        };
    }

    /**
     * Send webhook notification to bot
     */
    async sendWebhookNotification(webhookUrl, event, data) {
        try {
            const payload = {
                event,
                data,
                timestamp: new Date()
            };

            // In production, actually call the webhook:
            // const response = await fetch(webhookUrl, {
            //     method: 'POST',
            //     headers: { 'Content-Type': 'application/json' },
            //     body: JSON.stringify(payload),
            //     timeout: 5000
            // });

            console.log(`[Notification] Webhook sent to ${webhookUrl}:`, event);
            
            return {
                success: true,
                type: 'webhook',
                webhookUrl,
                event,
                timestamp: new Date()
            };
        } catch (error) {
            console.error(`[Notification] Webhook failed:`, error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Create in-app notification (stored in database)
     */
    async createNotification(userId, title, body, type = 'info', data = {}) {
        const db = getDatabase();
        const notificationId = `notif_${Date.now()}`;
        
        const notifData = {
            id: notificationId,
            userId,
            title,
            body,
            type, // 'info', 'success', 'warning', 'error'
            data,
            read: false,
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
        };

        if (db && isFirebaseReady()) {
            try {
                await db.collection('notifications').doc(notificationId).set(notifData);
                console.log(`[Notification] Stored in Firebase: ${title}`);
            } catch (error) {
                console.error('[Notification] Error storing:', error.message);
            }
        } else {
            // In-memory fallback
            this.notifications.set(notificationId, notifData);
            console.log(`[Notification] Stored in memory: ${title}`);
        }

        return notifData;
    }

    /**
     * Get user notifications
     */
    async getUserNotifications(userId, limit = 50) {
        const db = getDatabase();

        if (db && isFirebaseReady()) {
            try {
                const snapshot = await db.collection('notifications')
                    .where('userId', '==', userId)
                    .where('expiresAt', '>', new Date())
                    .orderBy('createdAt', 'desc')
                    .limit(limit)
                    .get();

                return snapshot.docs.map(doc => doc.data());
            } catch (error) {
                console.error('[Notification] Error fetching:', error.message);
                return [];
            }
        } else {
            // In-memory fallback
            return Array.from(this.notifications.values())
                .filter(n => n.userId === userId && n.expiresAt > new Date())
                .sort((a, b) => b.createdAt - a.createdAt)
                .slice(0, limit);
        }
    }

    /**
     * Mark notification as read
     */
    async markAsRead(notificationId) {
        const db = getDatabase();

        if (db && isFirebaseReady()) {
            try {
                await db.collection('notifications').doc(notificationId).update({
                    read: true
                });
            } catch (error) {
                console.error('[Notification] Error updating:', error.message);
            }
        } else {
            const notif = this.notifications.get(notificationId);
            if (notif) {
                notif.read = true;
            }
        }
    }

    /**
     * Trade notification
     */
    async notifyTrade(userId, email, tradeData) {
        const { symbol, action, quantity, price, timestamp } = tradeData;
        const total = quantity * price;
        
        const title = `${action} ${quantity} ${symbol}`;
        const body = `${action}ed ${quantity} shares of ${symbol} at $${price.toFixed(2)} for ${total.toFixed(2)}`;

        await this.createNotification(userId, title, body, 'info', tradeData);
        
        // Send email if configured
        if (email) {
            await this.sendEmailNotification(email, title, body, tradeData);
        }
    }

    /**
     * Milestone notification
     */
    async notifyMilestone(userId, email, milestoneData) {
        const { type, value, description } = milestoneData;
        
        const title = `🎉 Milestone Reached: ${type}`;
        const body = description || `You've reached ${value}!`;

        await this.createNotification(userId, title, body, 'success', milestoneData);

        if (email) {
            await this.sendEmailNotification(email, title, body, milestoneData);
        }
    }

    /**
     * Price alert notification
     */
    async notifyPriceAlert(userId, email, alertData) {
        const { symbol, currentPrice, targetPrice, direction } = alertData;
        
        const title = `📈 Price Alert: ${symbol}`;
        const body = `${symbol} has ${direction === 'up' ? 'risen to' : 'fallen to'} $${currentPrice.toFixed(2)}`;

        await this.createNotification(userId, title, body, 'warning', alertData);

        if (email) {
            await this.sendEmailNotification(email, title, body, alertData);
        }
    }

    /**
     * Register webhook for bot
     */
    async registerWebhook(userId, botId, webhookUrl) {
        const db = getDatabase();
        const webhookId = `webhook_${userId}_${botId}`;

        const webhookData = {
            id: webhookId,
            userId,
            botId,
            url: webhookUrl,
            createdAt: new Date(),
            status: 'active'
        };

        if (db && isFirebaseReady()) {
            try {
                await db.collection('webhooks').doc(webhookId).set(webhookData);
                console.log(`[Webhook] Registered: ${webhookUrl}`);
            } catch (error) {
                console.error('[Webhook] Registration failed:', error.message);
            }
        } else {
            this.webhooks.set(webhookId, webhookData);
        }

        return webhookData;
    }

    /**
     * Get webhook for bot
     */
    async getWebhook(userId, botId) {
        const db = getDatabase();
        const webhookId = `webhook_${userId}_${botId}`;

        if (db && isFirebaseReady()) {
            try {
                const doc = await db.collection('webhooks').doc(webhookId).get();
                return doc.exists ? doc.data() : null;
            } catch (error) {
                console.error('[Webhook] Fetch failed:', error.message);
                return null;
            }
        } else {
            return this.webhooks.get(webhookId) || null;
        }
    }
}

// Singleton instance
const notificationService = new NotificationService();

module.exports = notificationService;
