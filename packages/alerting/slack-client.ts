import { WebClient } from '@slack/web-api';
import { AlertMessage, SlackConfig } from './types.js';
import { formatAlertForSlack } from './slack-formatter.js';

export class SlackAlertClient {
  private client: WebClient;
  private config: SlackConfig;

  constructor(config: SlackConfig) {
    this.config = config;
    this.client = new WebClient(config.botToken);
  }

  /**
   * Send an alert message to Slack
   */
  async sendAlert(alert: AlertMessage): Promise<void> {
    try {
      const formattedMessage = formatAlertForSlack(alert);
      
      await this.client.chat.postMessage({
        channel: this.config.channelId,
        text: formattedMessage.text,
        attachments: formattedMessage.attachments,
        unfurl_links: false, // Don't unfurl CloudWatch links
        unfurl_media: false
      });
    } catch (error) {
      console.error('Failed to send Slack alert:', error);
      // Don't throw here to avoid cascading failures
      // In a production environment, you might want to log this to a different system
    }
  }

  /**
   * Send a simple text message to Slack
   */
  async sendMessage(text: string, mentionHere: boolean = false): Promise<void> {
    try {
      const message = mentionHere ? `${text} <!here>` : text;
      
      await this.client.chat.postMessage({
        channel: this.config.channelId,
        text: message
      });
    } catch (error) {
      console.error('Failed to send Slack message:', error);
    }
  }

  /**
   * Test the Slack connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const result = await this.client.auth.test();
      console.log('Slack connection test successful:', result);
      return true;
    } catch (error) {
      console.error('Slack connection test failed:', error);
      return false;
    }
  }

  /**
   * Get the workspace domain from the config
   */
  getWorkspaceDomain(): string {
    return this.config.workspaceDomain;
  }
}