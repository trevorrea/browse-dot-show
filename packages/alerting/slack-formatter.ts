import { AlertMessage, AlertSeverity } from './types.js';
import { generateCloudWatchLogLink, formatCloudWatchLink } from './cloudwatch.js';

/**
 * Get the appropriate emoji for the severity level
 */
function getSeverityEmoji(severity: AlertSeverity): string {
  switch (severity) {
    case 'info':
      return ':information_source:';
    case 'warning':
      return ':warning:';
    case 'error':
      return ':x:';
    case 'critical':
      return ':rotating_light:';
    default:
      return ':grey_question:';
  }
}

/**
 * Get the appropriate color for the severity level (for Slack attachments)
 */
function getSeverityColor(severity: AlertSeverity): string {
  switch (severity) {
    case 'info':
      return '#36a64f'; // green
    case 'warning':
      return '#ff9500'; // orange
    case 'error':
      return '#ff0000'; // red
    case 'critical':
      return '#8b0000'; // dark red
    default:
      return '#808080'; // grey
  }
}

/**
 * Format the error stack trace for display
 */
function formatErrorStack(error: Error): string {
  if (!error.stack) {
    return error.message;
  }
  
  // Take the first few lines of the stack trace
  const lines = error.stack.split('\n').slice(0, 5);
  return lines.join('\n');
}

/**
 * Format metadata for display
 */
function formatMetadata(metadata?: Record<string, any>): string {
  if (!metadata || Object.keys(metadata).length === 0) {
    return '';
  }
  
  const formatted = Object.entries(metadata)
    .map(([key, value]) => `• *${key}:* ${JSON.stringify(value)}`)
    .join('\n');
  
  return `\n*Additional Context:*\n${formatted}`;
}

/**
 * Format an alert message for Slack
 */
export function formatAlertForSlack(alert: AlertMessage): {
  text: string;
  attachments: Array<{
    color: string;
    fields: Array<{
      title: string;
      value: string;
      short: boolean;
    }>;
    footer?: string;
    ts: string;
  }>;
} {
  const emoji = getSeverityEmoji(alert.severity);
  const color = getSeverityColor(alert.severity);
  
  // Build the main text with mention if needed
  let text = `${emoji} *${alert.severity.toUpperCase()} Alert*`;
  if (alert.mentionHere || alert.severity === 'critical') {
    text += ' <!here>';
  }
  
  // Generate CloudWatch link if available
  const cloudWatchLink = generateCloudWatchLogLink(alert.context);
  
  // Build fields for the attachment
  const fields = [
    {
      title: 'Message',
      value: alert.message,
      short: false
    },
    {
      title: 'Source',
      value: alert.context.source,
      short: true
    },
    {
      title: 'Environment',
      value: alert.context.environment,
      short: true
    },
    {
      title: 'Timestamp',
      value: alert.context.timestamp.toISOString(),
      short: true
    }
  ];
  
  // Add AWS-specific fields if available
  if (alert.context.region) {
    fields.push({
      title: 'Region',
      value: alert.context.region,
      short: true
    });
  }
  
  if (alert.context.accountId) {
    fields.push({
      title: 'Account ID',
      value: alert.context.accountId,
      short: true
    });
  }
  
  // Add error details if available
  if (alert.error) {
    fields.push({
      title: 'Error Details',
      value: formatErrorStack(alert.error),
      short: false
    });
  }
  
  // Add CloudWatch link if available
  if (cloudWatchLink) {
    fields.push({
      title: 'CloudWatch Logs',
      value: formatCloudWatchLink(cloudWatchLink),
      short: false
    });
  }
  
  // Add metadata if available
  if (alert.context.metadata) {
    const metadataText = formatMetadata(alert.context.metadata);
    if (metadataText) {
      fields.push({
        title: 'Additional Context',
        value: metadataText,
        short: false
      });
    }
  }
  
  const attachment = {
    color,
    fields,
    footer: `browse.show Alerting System`,
    ts: Math.floor(alert.context.timestamp.getTime() / 1000).toString()
  };
  
  return {
    text,
    attachments: [attachment]
  };
}