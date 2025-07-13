export type AlertSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface AlertContext {
  /** The name of the Lambda function or process that encountered the error */
  source: string;
  /** The environment where the error occurred (local, dev, prod, etc.) */
  environment: string;
  /** The AWS region if applicable */
  region?: string;
  /** The AWS account ID if applicable */
  accountId?: string;
  /** The CloudWatch log group name if applicable */
  logGroupName?: string;
  /** The CloudWatch log stream name if applicable */
  logStreamName?: string;
  /** The timestamp when the error occurred */
  timestamp: Date;
  /** Additional context data */
  metadata?: Record<string, any>;
}

export interface AlertMessage {
  /** The severity level of the alert */
  severity: AlertSeverity;
  /** The main error message */
  message: string;
  /** The error object if available */
  error?: Error;
  /** Context information about where the error occurred */
  context: AlertContext;
  /** Whether to mention @here in the Slack message (auto-true for critical) */
  mentionHere?: boolean;
}

export interface SlackConfig {
  /** Slack bot token for sending messages */
  botToken: string;
  /** The channel ID where alerts should be sent */
  channelId: string;
  /** The Slack workspace domain (e.g., 'you-can-sit-with-us') */
  workspaceDomain: string;
}

export interface CloudWatchLogLink {
  /** The full URL to the CloudWatch log */
  url: string;
  /** The log group name */
  logGroupName: string;
  /** The log stream name */
  logStreamName: string;
  /** The timestamp to focus on in the logs */
  timestamp: Date;
}