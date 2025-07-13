import { createAlertingServiceFromEnv, AlertingService } from './index.js';

/**
 * Example usage of the alerting package
 */
async function testAlerting() {
  console.log('Testing alerting package...');
  
  // Create alerting service from environment variables
  const alerting = createAlertingServiceFromEnv();
  
  // Check if alerting is enabled
  if (!alerting.isAlertingEnabled()) {
    console.log('Alerting is not enabled. Please set up the required environment variables:');
    console.log('- SLACK_BOT_TOKEN');
    console.log('- SLACK_CHANNEL_ID');
    console.log('- SLACK_WORKSPACE_DOMAIN');
    return;
  }
  
  // Test the connection
  console.log('Testing Slack connection...');
  const isConnected = await alerting.testConnection();
  console.log('Connection status:', isConnected ? '✅ Connected' : '❌ Failed');
  
  if (!isConnected) {
    console.log('Cannot send test messages - connection failed');
    return;
  }
  
  // Send test messages
  console.log('Sending test messages...');
  
  try {
    await alerting.sendInfo('🧪 Test info message from alerting package');
    console.log('✅ Info message sent');
    
    await alerting.sendWarning('⚠️ Test warning message from alerting package');
    console.log('✅ Warning message sent');
    
    // Create a test error
    const testError = new Error('This is a test error for demonstration purposes');
    testError.stack = `Error: This is a test error for demonstration purposes
    at testAlerting (/workspace/packages/alerting/test-example.ts:45:15)
    at async main (/workspace/packages/alerting/test-example.ts:60:5)
    at processTicksAndRejections (node:internal/process/task_queues:95:5)`;
    
    await alerting.sendError('❌ Test error message from alerting package', testError, {
      metadata: {
        testRun: true,
        timestamp: new Date().toISOString(),
        environment: 'development'
      }
    });
    console.log('✅ Error message sent');
    
    await alerting.sendCritical('🚨 Test critical message from alerting package', testError, {
      metadata: {
        testRun: true,
        requiresImmediate: true
      }
    });
    console.log('✅ Critical message sent');
    
    console.log('🎉 All test messages sent successfully!');
    
  } catch (error) {
    console.error('❌ Failed to send test messages:', error);
  }
}

/**
 * Example of Lambda integration
 */
export async function lambdaHandler(event: any, context: any) {
  const alerting = createAlertingServiceFromEnv();
  
  try {
    // Simulate some Lambda work
    console.log('Processing event:', event);
    
    // Your actual Lambda logic would go here
    await processEvent(event);
    
    // Send success notification
    await alerting.sendInfo('Lambda execution completed successfully', undefined, {
      metadata: {
        eventType: event.type,
        requestId: context.awsRequestId,
        duration: context.getRemainingTimeInMillis()
      }
    });
    
  } catch (error) {
    // Send error alert with Lambda context
    await alerting.sendError('Lambda execution failed', error as Error, {
      logStreamName: context.logStreamName,
      metadata: {
        eventType: event.type,
        requestId: context.awsRequestId,
        remainingTime: context.getRemainingTimeInMillis()
      }
    });
    
    // Re-throw to mark Lambda as failed
    throw error;
  }
}

async function processEvent(event: any) {
  // Simulate processing
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Simulate occasional errors
  if (Math.random() < 0.3) {
    throw new Error('Simulated processing error');
  }
}

// Run the test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testAlerting().catch(console.error);
}