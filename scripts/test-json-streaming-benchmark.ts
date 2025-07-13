#!/usr/bin/env tsx

import { 
  createOramaIndex, 
  insertMultipleSearchEntries,
  persistToFileStreaming,
  persistToFileJsonStreaming,
  restoreFromFileStreamingOptimized,
  restoreFromFileJsonStreaming,
  benchmarkPersistenceApproaches,
  type OramaSearchDatabase,
  type PerformanceBenchmark
} from '../packages/database/dist/index.js';
import { log } from '../packages/logging/dist/index.js';
import { SearchEntry } from '../packages/types/dist/index.js';
import * as fs from 'fs/promises';
import * as path from 'path';

// Sample search entries for testing
function generateSampleSearchEntries(count: number): SearchEntry[] {
  const entries: SearchEntry[] = [];
  
  for (let i = 0; i < count; i++) {
    entries.push({
      id: `test-entry-${i}`,
      text: `This is a sample search entry number ${i} with some longer text to make it more realistic. It contains various words and phrases that might be searched for in a podcast transcript.`,
      sequentialEpisodeIdAsString: `${Math.floor(i / 10) + 1}`,
      startTimeMs: i * 30000, // 30 seconds apart in milliseconds
      endTimeMs: (i * 30000) + 25000,
      episodePublishedUnixTimestamp: Date.now() - (i * 86400000) // Each entry 1 day apart
    });
  }
  
  return entries;
}

async function runBenchmark() {
  log.info('🚀 Starting JSON Streaming Benchmark Test');
  
  // Create test database with sample data
  log.info('Creating test Orama index...');
  const db = await createOramaIndex();
  
  // Generate sample search entries (similar to what My Favorite Murder would have)
  const sampleEntries = generateSampleSearchEntries(10000); // 10k entries for realistic test
  log.info(`Generated ${sampleEntries.length} sample search entries`);
  
  // Insert entries into database
  log.info('Inserting sample entries into Orama index...');
  await insertMultipleSearchEntries(db, sampleEntries);
  log.info('Sample entries inserted successfully');
  
  // Create test file paths
  const testDir = '/tmp/json-streaming-benchmark';
  await fs.mkdir(testDir, { recursive: true });
  const testFilePath = path.join(testDir, 'test-index');
  
  // Run benchmark comparison
  log.info('Running persistence approach benchmark...');
  const benchmarkResults = await benchmarkPersistenceApproaches(db, testFilePath);
  
  // Test restoration performance
  log.info('Testing restoration performance...');
  
  // Test MsgPack restoration
  const msgpackRestoreStart = Date.now();
  const restoredMsgpack = await restoreFromFileStreamingOptimized(`${testFilePath}.msgpack`, 'gzip');
  const msgpackRestoreTime = Date.now() - msgpackRestoreStart;
  
  // Test JSON restoration
  const jsonRestoreStart = Date.now();
  const restoredJson = await restoreFromFileJsonStreaming(`${testFilePath}.json`, 'gzip');
  const jsonRestoreTime = Date.now() - jsonRestoreStart;
  
  // Verify both restored databases have the same content
  const { searchOramaIndex } = await import('../packages/database/dist/index.js');
  const msgpackSearch = await searchOramaIndex(restoredMsgpack, { query: 'sample', limit: 5 });
  const jsonSearch = await searchOramaIndex(restoredJson, { query: 'sample', limit: 5 });
  
  const searchResultsMatch = msgpackSearch.totalHits === jsonSearch.totalHits;
  
  // Clean up test files
  try {
    await fs.unlink(`${testFilePath}.msgpack`);
    await fs.unlink(`${testFilePath}.json`);
    await fs.rmdir(testDir);
    log.info('Cleaned up test files');
  } catch (error) {
    log.warn('Could not clean up test files:', error);
  }
  
  // Print comprehensive results
  console.log('\n' + '='.repeat(80));
  console.log('📊 JSON STREAMING BENCHMARK RESULTS');
  console.log('='.repeat(80));
  
  console.log('\n🔧 PERSISTENCE PERFORMANCE:');
  console.log(`MsgPack: ${benchmarkResults.msgpack.totalTime}ms total`);
  console.log(`JSON:    ${benchmarkResults.json.totalTime}ms total`);
  console.log(`Diff:    ${benchmarkResults.comparison.totalTimeDiff > 0 ? '+' : ''}${benchmarkResults.comparison.totalTimeDiff}ms`);
  
  console.log('\n📁 FILE SIZES:');
  console.log(`MsgPack: ${(benchmarkResults.msgpack.fileSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`JSON:    ${(benchmarkResults.json.fileSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Diff:    ${benchmarkResults.comparison.fileSizeDiff > 0 ? '+' : ''}${(benchmarkResults.comparison.fileSizeDiff / 1024 / 1024).toFixed(2)} MB`);
  
  console.log('\n🗜️  COMPRESSION:');
  console.log(`JSON Compression Ratio: ${benchmarkResults.json.compressionRatio.toFixed(1)}%`);
  
  console.log('\n⏱️  RESTORATION PERFORMANCE:');
  console.log(`MsgPack Restore: ${msgpackRestoreTime}ms`);
  console.log(`JSON Restore:    ${jsonRestoreTime}ms`);
  console.log(`Restore Diff:    ${jsonRestoreTime - msgpackRestoreTime > 0 ? '+' : ''}${jsonRestoreTime - msgpackRestoreTime}ms`);
  
  console.log('\n✅ DATA INTEGRITY:');
  console.log(`Search Results Match: ${searchResultsMatch ? '✅ YES' : '❌ NO'}`);
  
  console.log('\n🎯 PERFORMANCE TARGETS:');
  const jsonRestoreUnder15s = jsonRestoreTime < 15000;
  const jsonTotalUnder20s = benchmarkResults.json.totalTime < 20000;
  console.log(`JSON Restore < 15s: ${jsonRestoreUnder15s ? '✅ YES' : '❌ NO'} (${(jsonRestoreTime / 1000).toFixed(1)}s)`);
  console.log(`JSON Total < 20s:   ${jsonTotalUnder20s ? '✅ YES' : '❌ NO'} (${(benchmarkResults.json.totalTime / 1000).toFixed(1)}s)`);
  
  console.log('\n' + '='.repeat(80));
  
  // Return results for potential programmatic use
  return {
    persistence: benchmarkResults,
    restoration: {
      msgpack: msgpackRestoreTime,
      json: jsonRestoreTime,
      difference: jsonRestoreTime - msgpackRestoreTime
    },
    dataIntegrity: searchResultsMatch,
    targets: {
      jsonRestoreUnder15s,
      jsonTotalUnder20s
    }
  };
}

// Run the benchmark if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runBenchmark()
    .then(results => {
      log.info('Benchmark completed successfully');
      process.exit(0);
    })
    .catch(error => {
      log.error('Benchmark failed:', error);
      process.exit(1);
    });
}

export { runBenchmark };