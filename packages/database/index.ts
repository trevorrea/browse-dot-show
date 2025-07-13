export { 
  createOramaIndex, 
  insertSearchEntry, 
  insertMultipleSearchEntries, 
  searchOramaIndex,
  persistToFileStreaming,
  restoreFromFileStreamingOptimized,
  persistToFileJsonStreaming,
  restoreFromFileJsonStreaming,
  benchmarkPersistenceApproaches,
  type OramaSearchDatabase,
  type CompressionType,
  type PerformanceBenchmark
} from './database.js';