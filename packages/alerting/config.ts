import { SlackConfig } from './types.js';
import { AlertingService } from './alerting-service.js';

/**
 * Create an alerting service from environment variables
 */
export function createAlertingServiceFromEnv(): AlertingService {
  const slackConfig = getSlackConfigFromEnv();
  
  if (slackConfig) {
    return new AlertingService(slackConfig);
  }
  
  // Return a disabled service if no config is available
  return new AlertingService();
}

/**
 * Get Slack configuration from environment variables
 */
export function getSlackConfigFromEnv(): SlackConfig | null {
  const botToken = process.env.SLACK_BOT_TOKEN;
  const channelId = process.env.SLACK_CHANNEL_ID;
  const workspaceDomain = process.env.SLACK_WORKSPACE_DOMAIN;
  
  if (!botToken || !channelId || !workspaceDomain) {
    console.warn('Slack configuration incomplete. Missing required environment variables:');
    if (!botToken) console.warn('  - SLACK_BOT_TOKEN');
    if (!channelId) console.warn('  - SLACK_CHANNEL_ID');
    if (!workspaceDomain) console.warn('  - SLACK_WORKSPACE_DOMAIN');
    return null;
  }
  
  return {
    botToken,
    channelId,
    workspaceDomain
  };
}

/**
 * Validate that all required environment variables are set
 */
export function validateSlackConfig(): boolean {
  const config = getSlackConfigFromEnv();
  return config !== null;
}

/**
 * Get a list of required environment variables for Slack alerting
 */
export function getRequiredEnvVars(): string[] {
  return [
    'SLACK_BOT_TOKEN',
    'SLACK_CHANNEL_ID', 
    'SLACK_WORKSPACE_DOMAIN'
  ];
}