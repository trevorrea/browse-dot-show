import { AlertMessage, AlertContext, AlertSeverity, SlackConfig } from './types.js';
import { SlackAlertClient } from './slack-client.js';

export class AlertingService {
  private slackClient: SlackAlertClient | null = null;
  private isEnabled: boolean = false;

  constructor(slackConfig?: SlackConfig) {
    if (slackConfig) {
      this.slackClient = new SlackAlertClient(slackConfig);
      this.isEnabled = true;
    }
  }

  /**
   * Initialize the alerting service with Slack configuration
   */
  initialize(slackConfig: SlackConfig): void {
    this.slackClient = new SlackAlertClient(slackConfig);
    this.isEnabled = true;
  }

  /**
   * Send an alert with automatic context detection
   */
  async sendAlert(
    severity: AlertSeverity,
    message: string,
    error?: Error,
    additionalContext?: Partial<AlertContext>
  ): Promise<void> {
    if (!this.isEnabled || !this.slackClient) {
      console.warn('Alerting service is not enabled or not initialized');
      return;
    }

    const context: AlertContext = {
      source: additionalContext?.source || this.detectSource(),
      environment: additionalContext?.environment || this.detectEnvironment(),
      region: additionalContext?.region || this.detectRegion(),
      accountId: additionalContext?.accountId || this.detectAccountId(),
      logGroupName: additionalContext?.logGroupName || this.detectLogGroupName(),
      logStreamName: additionalContext?.logStreamName || this.detectLogStreamName(),
      timestamp: new Date(),
      metadata: additionalContext?.metadata
    };

    const alert: AlertMessage = {
      severity,
      message,
      error,
      context,
      mentionHere: severity === 'critical'
    };

    await this.slackClient.sendAlert(alert);
  }

  /**
   * Convenience methods for different severity levels
   */
  async sendInfo(message: string, error?: Error, context?: Partial<AlertContext>): Promise<void> {
    return this.sendAlert('info', message, error, context);
  }

  async sendWarning(message: string, error?: Error, context?: Partial<AlertContext>): Promise<void> {
    return this.sendAlert('warning', message, error, context);
  }

  async sendError(message: string, error?: Error, context?: Partial<AlertContext>): Promise<void> {
    return this.sendAlert('error', message, error, context);
  }

  async sendCritical(message: string, error?: Error, context?: Partial<AlertContext>): Promise<void> {
    return this.sendAlert('critical', message, error, context);
  }

  /**
   * Test the Slack connection
   */
  async testConnection(): Promise<boolean> {
    if (!this.slackClient) {
      return false;
    }
    return this.slackClient.testConnection();
  }

  /**
   * Check if the alerting service is enabled
   */
  isAlertingEnabled(): boolean {
    return this.isEnabled && this.slackClient !== null;
  }

  /**
   * Detect the current source (Lambda function name or process name)
   */
  private detectSource(): string {
    // Try to get Lambda function name from environment
    const lambdaFunctionName = process.env.AWS_LAMBDA_FUNCTION_NAME;
    if (lambdaFunctionName) {
      return lambdaFunctionName;
    }

    // Fall back to process name
    return process.env.npm_package_name || process.title || 'unknown';
  }

  /**
   * Detect the current environment
   */
  private detectEnvironment(): string {
    return process.env.NODE_ENV || process.env.ENVIRONMENT || 'development';
  }

  /**
   * Detect the AWS region
   */
  private detectRegion(): string | undefined {
    return process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION;
  }

  /**
   * Detect the AWS account ID
   */
  private detectAccountId(): string | undefined {
    return process.env.AWS_ACCOUNT_ID;
  }

  /**
   * Detect the CloudWatch log group name
   */
  private detectLogGroupName(): string | undefined {
    const functionName = process.env.AWS_LAMBDA_FUNCTION_NAME;
    if (functionName) {
      return `/aws/lambda/${functionName}`;
    }
    return undefined;
  }

  /**
   * Detect the CloudWatch log stream name
   */
  private detectLogStreamName(): string | undefined {
    // In Lambda, this is typically available in the context
    // For now, we'll return undefined and let the caller provide it
    return undefined;
  }
}