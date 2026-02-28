// notification-service.js

class NotificationService {
  constructor() {
    this.notificationsEnabled = true;
  }

  /**
   * Sends a notification to a specific user or channel.
   * @param {string} recipient - The user or channel to notify.
   * @param {string} message - The content of the notification.
   */
  sendNotification(recipient, message) {
    if (!this.notificationsEnabled) {
      console.log('Notifications are currently disabled.');
      return false;
    }
    
    console.log(`[Notification Alert] To: ${recipient} | Message: ${message}`);
    // Future integration: Add Slack/Email API logic here
    
    return true;
  }
}

module.exports = new NotificationService();