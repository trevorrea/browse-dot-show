#!/usr/bin/env tsx

import { createAlertingServiceFromEnv } from './index.js';

/**
 * Test script to demonstrate the alerting functionality
 * Run with: pnpm tsx test-alerting.ts
 */
async function testAlerting() {
  console.log('🧪 Testing alerting package...');
  
  // Create alerting service from environment variables
  const alerting = createAlertingServiceFromEnv();
  
  // Check if alerting is enabled
  if (!alerting.isAlertingEnabled()) {
    console.log('❌ Alerting is not enabled. Please set up the required environment variables:');
    console.log('   - SLACK_BOT_TOKEN');
    console.log('   - SLACK_CHANNEL_ID');
    console.log('   - SLACK_WORKSPACE_DOMAIN');
    console.log('\n💡 You can set these in your .env file or export them in your shell.');
    return;
  }
  
  console.log('✅ Alerting service is enabled');
  
  // Test the connection
  console.log('🔗 Testing Slack connection...');
  const isConnected = await alerting.testConnection();
  console.log('Connection status:', isConnected ? '✅ Connected' : '❌ Failed');
  
  if (!isConnected) {
    console.log('Cannot send test messages - connection failed');
    return;
  }
  
  // Send test messages
  console.log('📤 Sending test messages...');
  
  try {
    // Test info message
    await alerting.sendInfo('🧪 Test info message from alerting package');
    console.log('✅ Info message sent');
    
    // Test warning message
    await alerting.sendWarning('⚠️ Test warning message from alerting package');
    console.log('✅ Warning message sent');
    
    // Create a test error
    const testError = new Error('This is a test error for demonstration purposes');
    testError.stack = `Error: This is a test error for demonstration purposes
    at testAlerting (/workspace/packages/alerting/test-alerting.ts:45:15)
    at async main (/workspace/packages/alerting/test-alerting.ts:60:5)
    at processTicksAndRejections (node:internal/process/task_queues:95:5)`;
    
    // Test error message
    await alerting.sendError('❌ Test error message from alerting package', testError, {
      metadata: {
        testRun: true,
        timestamp: new Date().toISOString(),
        environment: 'development'
      }
    });
    console.log('✅ Error message sent');
    
    // Test critical message (this will @here mention)
    await alerting.sendCritical('🚨 Test critical message from alerting package', testError, {
      metadata: {
        testRun: true,
        requiresImmediate: true
      }
    });
    console.log('✅ Critical message sent');
    
    console.log('🎉 All test messages sent successfully!');
    console.log('📱 Check your Slack channel to see the formatted messages.');
    
  } catch (error) {
    console.error('❌ Failed to send test messages:', error);
  }
}

// Run the test
testAlerting().catch(console.error);