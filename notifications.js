// Push Notifications Service
// Sends notifications about trading events, milestones, and alerts

class NotificationService {
  constructor() {
    this.subscribers = new Map(); // userId -> list of subscriptions
    this.notifications = new Map(); // userId -> list of notifications
    this.maxNotifications = 100; // Keep last 100 per user
  }

  /**
   * Subscribe to push notifications
   */
  subscribe(userId, subscription) {
    if (!this.subscribers.has(userId)) {
      this.subscribers.set(userId, []);
    }
    this.subscribers.get(userId).push(subscription);
    console.log(`[Notifications] Subscription added for user ${userId}`);
    return true;
  }

  /**
   * Unsubscribe from push notifications
   */
  unsubscribe(userId, subscription) {
    if (!this.subscribers.has(userId)) return false;

    const subs = this.subscribers.get(userId);
    const index = subs.findIndex(s => s.endpoint === subscription.endpoint);

    if (index > -1) {
      subs.splice(index, 1);
      console.log(`[Notifications] Subscription removed for user ${userId}`);
      return true;
    }
    return false;
  }

  /**
   * Send notification to user
   */
  async sendNotification(userId, notification) {
    // Store notification
    if (!this.notifications.has(userId)) {
      this.notifications.set(userId, []);
    }

    const notif = {
      id: `notif_${Date.now()}_${Math.random()}`,
      userId,
      title: notification.title,
      body: notification.body,
      icon: notification.icon || '📊',
      timestamp: new Date(),
      read: false,
      data: notification.data || {}
    };

    const userNotifications = this.notifications.get(userId);
    userNotifications.unshift(notif);

    // Keep only last 100
    if (userNotifications.length > this.maxNotifications) {
      userNotifications.pop();
    }

    console.log(`[Notifications] Sent to user ${userId}: ${notification.title}`);

    // TODO: Send to actual push service (Firebase Cloud Messaging, etc.)
    return notif;
  }

  /**
   * Get notifications for user
   */
  getNotifications(userId, unreadOnly = false) {
    if (!this.notifications.has(userId)) return [];

    const notifs = this.notifications.get(userId);
    return unreadOnly
      ? notifs.filter(n => !n.read)
      : notifs;
  }

  /**
   * Mark notification as read
   */
  markAsRead(userId, notificationId) {
    if (!this.notifications.has(userId)) return false;

    const notif = this.notifications.get(userId).find(n => n.id === notificationId);
    if (notif) {
      notif.read = true;
      return true;
    }
    return false;
  }

  /**
   * Clear all notifications for user
   */
  clearNotifications(userId) {
    if (this.notifications.has(userId)) {
      this.notifications.get(userId).length = 0;
      return true;
    }
    return false;
  }
}

/**
 * Notification templates
 */
class NotificationTemplates {
  // Trade notifications
  static tradeExecuted(symbol, action, quantity, price) {
    return {
      title: `Trade Executed: ${symbol}`,
      body: `${action.toUpperCase()} ${quantity} shares of ${symbol} at $${price.toFixed(2)}`,
      icon: action === 'buy' ? '📈' : '📉',
      data: { type: 'trade', symbol, action, quantity, price }
    };
  }

  // Milestone notifications
  static milestoneReached(milestone, value) {
    const milestoneNames = {
      'first_trade': 'First Trade',
      'portfolio_1k': 'Portfolio: $1K',
      'portfolio_10k': 'Portfolio: $10K',
      'portfolio_100k': 'Portfolio: $100K',
      'positive_returns': 'Positive Returns',
      'double_returns': 'Doubled Initial Capital',
      'wins_10': '10 Winning Trades',
      'wins_50': '50 Winning Trades'
    };

    return {
      title: `🏆 Milestone: ${milestoneNames[milestone] || milestone}`,
      body: `You've reached ${milestoneNames[milestone] || milestone}! Current value: $${value.toLocaleString()}`,
      icon: '🏆',
      data: { type: 'milestone', milestone, value }
    };
  }

  // Price alerts
  static priceAlert(symbol, condition, price, currentPrice) {
    return {
      title: `Price Alert: ${symbol}`,
      body: `${symbol} is now $${currentPrice.toFixed(2)} (${condition} $${price.toFixed(2)})`,
      icon: currentPrice > price ? '📈' : '📉',
      data: { type: 'price_alert', symbol, condition, price, currentPrice }
    };
  }

  // Portfolio updates
  static portfolioUpdate(returnPercent, change) {
    const direction = change >= 0 ? '📈' : '📉';
    return {
      title: 'Portfolio Update',
      body: `Your portfolio is ${direction} ${Math.abs(returnPercent).toFixed(2)}% (${change >= 0 ? '+' : ''}$${change.toFixed(2)})`,
      icon: direction,
      data: { type: 'portfolio_update', returnPercent, change }
    };
  }

  // Bot notifications
  static botEvent(botName, event, details) {
    const eventIcons = {
      'started': '▶️',
      'stopped': '⏹️',
      'error': '❌',
      'milestone': '🏆',
      'trade': '💱'
    };

    return {
      title: `Bot: ${botName}`,
      body: `${event}: ${details}`,
      icon: eventIcons[event] || '🤖',
      data: { type: 'bot_event', botName, event, details }
    };
  }

  // Achievement notifications
  static achievement(name, description) {
    return {
      title: `🎖️ Achievement: ${name}`,
      body: description,
      icon: '🎖️',
      data: { type: 'achievement', name, description }
    };
  }

  // System notifications
  static systemMessage(title, message) {
    return {
      title,
      body: message,
      icon: 'ℹ️',
      data: { type: 'system' }
    };
  }
}

/**
 * Notification manager with rules
 */
class NotificationManager {
  constructor(notificationService) {
    this.service = notificationService;
    this.rules = new Map(); // userId -> notification rules
    this.eventBuffer = new Map(); // userId -> buffered events
    this.flushInterval = 60000; // 1 minute
  }

  /**
   * Set notification preferences for user
   */
  setPreferences(userId, preferences) {
    this.rules.set(userId, {
      trades: preferences.trades !== false,
      milestones: preferences.milestones !== false,
      priceAlerts: preferences.priceAlerts !== false,
      portfolioUpdates: preferences.portfolioUpdates !== false,
      botNotifications: preferences.botNotifications !== false,
      achievements: preferences.achievements !== false,
      soundEnabled: preferences.sound !== false,
      batchNotifications: preferences.batch === true // Batch notifications instead of individual
    });
  }

  /**
   * Log event that may trigger notification
   */
  async logEvent(userId, eventType, data) {
    const rules = this.rules.get(userId) || {
      trades: true,
      milestones: true,
      priceAlerts: true,
      portfolioUpdates: true,
      botNotifications: true,
      achievements: true,
      batchNotifications: false
    };

    // Check if notificationtype is enabled
    const notificationTypeMap = {
      'trade': 'trades',
      'milestone': 'milestones',
      'price_alert': 'priceAlerts',
      'portfolio_update': 'portfolioUpdates',
      'bot_event': 'botNotifications',
      'achievement': 'achievements'
    };

    const ruleName = notificationTypeMap[eventType];
    if (ruleName && !rules[ruleName]) {
      console.log(`[NotificationManager] Notification type ${eventType} disabled for user ${userId}`);
      return null;
    }

    // Build notification
    let notification = null;

    switch (eventType) {
      case 'trade':
        notification = NotificationTemplates.tradeExecuted(
          data.symbol,
          data.action,
          data.quantity,
          data.price
        );
        break;
      case 'milestone':
        notification = NotificationTemplates.milestoneReached(data.milestone, data.value);
        break;
      case 'price_alert':
        notification = NotificationTemplates.priceAlert(
          data.symbol,
          data.condition,
          data.price,
          data.currentPrice
        );
        break;
      case 'portfolio_update':
        notification = NotificationTemplates.portfolioUpdate(data.returnPercent, data.change);
        break;
      case 'bot_event':
        notification = NotificationTemplates.botEvent(data.botName, data.event, data.details);
        break;
      case 'achievement':
        notification = NotificationTemplates.achievement(data.name, data.description);
        break;
    }

    if (!notification) return null;

    // Handle batching
    if (rules.batchNotifications) {
      if (!this.eventBuffer.has(userId)) {
        this.eventBuffer.set(userId, []);
      }
      this.eventBuffer.get(userId).push(notification);
      console.log(`[NotificationManager] Buffered notification for user ${userId}`);
      return null;
    }

    // Send immediately
    return this.service.sendNotification(userId, notification);
  }

  /**
   * Flush batched notifications
   */
  flushBatchedNotifications(userId) {
    if (!this.eventBuffer.has(userId) || this.eventBuffer.get(userId).length === 0) {
      return;
    }

    const notifications = this.eventBuffer.get(userId);
    const summary = {
      title: `📬 You have ${notifications.length} new notifications`,
      body: notifications.map(n => n.title).join(', '),
      icon: '📬',
      data: { type: 'batch_summary', notifications }
    };

    this.service.sendNotification(userId, summary);
    this.eventBuffer.get(userId).length = 0;
  }
}

module.exports = {
  NotificationService,
  NotificationTemplates,
  NotificationManager
};
