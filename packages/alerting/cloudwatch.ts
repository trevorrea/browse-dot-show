import { CloudWatchLogLink, AlertContext } from './types.js';

/**
 * Generates a CloudWatch log link for the given context
 */
export function generateCloudWatchLogLink(context: AlertContext): CloudWatchLogLink | null {
  if (!context.region || !context.accountId || !context.logGroupName || !context.logStreamName) {
    return null;
  }

  // Encode the log group and stream names for the URL
  const encodedLogGroupName = encodeURIComponent(context.logGroupName);
  const encodedLogStreamName = encodeURIComponent(context.logStreamName);
  
  // Convert timestamp to milliseconds for CloudWatch
  const timestampMs = context.timestamp.getTime();
  
  // Generate the CloudWatch console URL
  const url = `https://${context.region}.console.aws.amazon.com/cloudwatch/home?region=${context.region}#logsV2:log-groups/log-group/${encodedLogGroupName}/log-events/${encodedLogStreamName}?start=${timestampMs - 300000}&end=${timestampMs + 300000}`;
  
  return {
    url,
    logGroupName: context.logGroupName,
    logStreamName: context.logStreamName,
    timestamp: context.timestamp
  };
}

/**
 * Formats a CloudWatch log link for display in Slack
 */
export function formatCloudWatchLink(link: CloudWatchLogLink): string {
  return `<${link.url}|View CloudWatch Logs>`;
}