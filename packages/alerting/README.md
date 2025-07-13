# Alerting Package

This package provides Slack alerting functionality for the browse.show platform, primarily used by the ingestion Lambdas to send error notifications to Slack.

## Features

- **Slack Integration**: Send formatted alerts to Slack channels
- **Automatic Context Detection**: Automatically detects Lambda function names, environment, region, etc.
- **CloudWatch Integration**: Generates direct links to CloudWatch logs for AWS errors
- **Severity Levels**: Support for info, warning, error, and critical alerts
- **@here Mentions**: Automatic @here mentions for critical alerts
- **Rich Formatting**: Beautiful Slack messages with colors, emojis, and structured data
- **Error Handling**: Graceful error handling to prevent cascading failures

## Setup

### 1. Slack App Configuration

Before using this package, you need to set up a Slack app:

1. Go to [api.slack.com/apps](https://api.slack.com/apps) and create a new app
2. Add the following OAuth scopes to your app:
   - `chat:write` - To send messages
   - `chat:write.public` - To send messages to public channels
3. Install the app to your workspace
4. Copy the **Bot User OAuth Token** (starts with `xoxb-`)

### 2. Environment Variables

Add the following environment variables to your `.env` file:

```bash
# Slack Configuration
SLACK_BOT_TOKEN=xoxb-your-bot-token-here
SLACK_CHANNEL_ID=C1234567890  # The channel ID where alerts should be sent
SLACK_WORKSPACE_DOMAIN=you-can-sit-with-us  # Your Slack workspace domain

# Optional AWS Configuration (for CloudWatch links)
AWS_ACCOUNT_ID=123456789012  # Your AWS account ID
```

### 3. Getting Channel ID

To get a channel ID:
1. Right-click on the channel in Slack
2. Select "Copy link"
3. The channel ID is the last part of the URL (e.g., `C1234567890`)

## Usage

### Basic Usage

```typescript
import { createAlertingServiceFromEnv, AlertingService } from '@browse-dot-show/alerting';

// Create service from environment variables
const alerting = createAlertingServiceFromEnv();

// Send different types of alerts
await alerting.sendInfo('Pipeline started successfully');
await alerting.sendWarning('Some items failed to process');
await alerting.sendError('Failed to download audio file', error);
await alerting.sendCritical('Database connection lost', error);
```

### Manual Configuration

```typescript
import { AlertingService } from '@browse-dot-show/alerting';

const alerting = new AlertingService({
  botToken: 'xoxb-your-token',
  channelId: 'C1234567890',
  workspaceDomain: 'you-can-sit-with-us'
});

await alerting.sendError('Something went wrong', error);
```

### Lambda Integration

In your Lambda function:

```typescript
import { createAlertingServiceFromEnv } from '@browse-dot-show/alerting';

export const handler = async (event: any, context: any) => {
  const alerting = createAlertingServiceFromEnv();
  
  try {
    // Your Lambda logic here
    await processData();
  } catch (error) {
    // Send alert with Lambda context
    await alerting.sendError('Lambda execution failed', error, {
      logStreamName: context.logStreamName,
      metadata: {
        eventType: event.type,
        requestId: context.awsRequestId
      }
    });
    
    throw error; // Re-throw to mark Lambda as failed
  }
};
```

### Testing

```typescript
import { createAlertingServiceFromEnv } from '@browse-dot-show/alerting';

const alerting = createAlertingServiceFromEnv();

// Test the connection
const isConnected = await alerting.testConnection();
console.log('Slack connection:', isConnected ? 'OK' : 'Failed');

// Send a test message
await alerting.sendInfo('This is a test alert from the alerting package');
```

## Message Format

Alerts are formatted with:
- **Emojis**: Different emojis for each severity level
- **Colors**: Color-coded attachments (green for info, orange for warning, red for error/critical)
- **Structured Data**: Source, environment, timestamp, region, account ID
- **Error Details**: Stack traces for errors
- **CloudWatch Links**: Direct links to relevant logs (when available)
- **@here Mentions**: Automatic mentions for critical alerts

## API Reference

### AlertingService

Main service class for sending alerts.

#### Methods

- `sendAlert(severity, message, error?, context?)` - Send a custom alert
- `sendInfo(message, error?, context?)` - Send info alert
- `sendWarning(message, error?, context?)` - Send warning alert
- `sendError(message, error?, context?)` - Send error alert
- `sendCritical(message, error?, context?)` - Send critical alert
- `testConnection()` - Test Slack connection
- `isAlertingEnabled()` - Check if alerting is enabled

### Types

- `AlertSeverity` - 'info' | 'warning' | 'error' | 'critical'
- `AlertContext` - Context information for alerts
- `AlertMessage` - Complete alert message structure
- `SlackConfig` - Slack configuration
- `CloudWatchLogLink` - CloudWatch log link structure

## Troubleshooting

### Common Issues

1. **"Slack connection test failed"**
   - Check that `SLACK_BOT_TOKEN` is correct
   - Verify the bot has the required permissions
   - Ensure the bot is installed to your workspace

2. **"Channel not found"**
   - Verify `SLACK_CHANNEL_ID` is correct
   - Ensure the bot is invited to the channel
   - Check that the channel ID is from the correct workspace

3. **"Missing environment variables"**
   - Add all required environment variables to your `.env` file
   - Use `getRequiredEnvVars()` to see what's needed

### Debug Mode

Enable debug logging by setting:
```bash
DEBUG=@browse-dot-show/alerting
```

## Security Notes

- Never commit Slack tokens to version control
- Use environment variables for all sensitive configuration
- Consider using AWS Secrets Manager for production deployments
- Regularly rotate your Slack bot tokens

## Development

To build the package:
```bash
pnpm build
```

To test locally:
```bash
# Set up environment variables
export SLACK_BOT_TOKEN=xoxb-your-token
export SLACK_CHANNEL_ID=C1234567890
export SLACK_WORKSPACE_DOMAIN=you-can-sit-with-us

# Run tests
pnpm test
```