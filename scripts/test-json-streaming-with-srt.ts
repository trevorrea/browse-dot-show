#!/usr/bin/env tsx

import { log } from '../packages/logging/dist/index.js';

// Set environment variables for JSON streaming test
process.env.USE_JSON_STREAMING = 'true';
process.env.LOG_LEVEL = 'info';

log.info('🧪 Testing JSON Streaming with SRT Indexing Lambda');
log.info('Environment: USE_JSON_STREAMING=true');

// Import and run the SRT indexing lambda handler
async function testSrtIndexingWithJsonStreaming() {
  try {
    // Import the handler from the built SRT indexing lambda
    const { handler } = await import('../packages/ingestion/srt-indexing-lambda/convert-srts-indexed-search.js');
    
    log.info('Starting SRT indexing lambda with JSON streaming...');
    const startTime = Date.now();
    
    const result = await handler();
    
    const duration = Date.now() - startTime;
    log.info(`SRT indexing completed in ${duration}ms`);
    log.info('Result:', result);
    
    return result;
  } catch (error) {
    log.error('SRT indexing failed:', error);
    throw error;
  }
}

// Run the test if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testSrtIndexingWithJsonStreaming()
    .then(result => {
      log.info('✅ JSON streaming SRT indexing test completed successfully');
      process.exit(0);
    })
    .catch(error => {
      log.error('❌ JSON streaming SRT indexing test failed:', error);
      process.exit(1);
    });
}

export { testSrtIndexingWithJsonStreaming };