// Export types
export type {
  AlertSeverity,
  AlertContext,
  AlertMessage,
  SlackConfig,
  CloudWatchLogLink
} from './types.js';

// Export main service
export { AlertingService } from './alerting-service.js';

// Export Slack client
export { SlackAlertClient } from './slack-client.js';

// Export utilities
export { formatAlertForSlack } from './slack-formatter.js';
export { generateCloudWatchLogLink, formatCloudWatchLink } from './cloudwatch.js';

// Export configuration helpers
export {
  createAlertingServiceFromEnv,
  getSlackConfigFromEnv,
  validateSlackConfig,
  getRequiredEnvVars
} from './config.js';