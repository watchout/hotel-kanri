/**
 * Discord notification stub (no-op)
 * Actual Discord integration not configured in this environment.
 */
module.exports = {
  async notifyHumanRequired(_taskId, _context, _message) {},
  async sendNotification(_level, _title, _options) {},
};
