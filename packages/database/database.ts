import { create, insert, insertMultiple, search, SearchParams, AnyOrama, save, load } from '@orama/orama';
// import { persist, restore } from '@orama/plugin-data-persistence';
import { SearchEntry, ORAMA_SEARCH_SCHEMA, SearchRequest, SearchResponse, ApiSearchResultHit } from '@browse-dot-show/types';
import { log } from '@browse-dot-show/logging';
import fs from 'node:fs';
import zlib from 'node:zlib';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { encode, decode, Decoder, Encoder } from '@msgpack/msgpack';

// TODO: Determine if there's a "more correct" method for this
// from suggestion here: https://github.com/uhop/stream-json/issues/97#issuecomment-1408770135
// Open issue here: https://github.com/uhop/stream-json/discussions/149
import P from 'stream-json/Parser.js';
const parser = P.parser

// Type for Orama database instance
export type OramaSearchDatabase = Awaited<ReturnType<typeof create>>;

// Compression types for streaming persistence (removed brotli as requested)
export type CompressionType = "none" | "gzip";

// Performance benchmark results type
export interface PerformanceBenchmark {
  totalTime: number;
  exportTime: number;
  encodeTime: number;
  streamTime: number;
  fileSize: number;
  compressionRatio: number;
}

// Reusable encoder instance for better performance
const msgpackEncoder = new Encoder({
  maxDepth: 1500, // Required for complex nested structures in large datasets
  initialBufferSize: 8192, // 8KB initial buffer (default is 2KB)
  sortKeys: true, // Helps with compression efficiency
  ignoreUndefined: false
});

// Reusable decoder instance for better performance (fastest approach tested)
const msgpackDecoder = new Decoder({
  maxStrLength: 100_000_000, // 100MB max for strings
  maxBinLength: 100_000_000, // 100MB max for binary data
  maxArrayLength: 10_000_000, // 10M max array length
  maxMapLength: 10_000_000,   // 10M max map length
  maxExtLength: 100_000_000,  // 100MB max for extensions
  useBigInt64: false
});



/**
 * Optimized MsgPack decode function using reusable decoder (fastest tested approach)
 * @param buffer - The buffer to decode
 * @returns Promise resolving to the decoded data
 */
async function optimizedMsgPackDecode(buffer: Buffer): Promise<any> {
  const startTime = Date.now();
  
  try {
    log.info(`Starting MsgPack decode for buffer (${(buffer.length / 1024 / 1024).toFixed(2)} MB)`);
    const result = msgpackDecoder.decode(buffer);
    
    const timeMs = Date.now() - startTime;
    log.info(`MsgPack decode completed in ${timeMs}ms`);
    return result;
  } catch (error: any) {
    log.error(`MsgPack decode failed after ${Date.now() - startTime}ms: ${error.message}`, error);
    throw error;
  }
}

/**
 * Optimized MsgPack encode function using reusable encoder
 * @param data - The data to encode
 * @returns Uint8Array of encoded data
 */
function optimizedMsgPackEncode(data: any): Uint8Array {
  const startTime = Date.now();
  
  try {
    log.info(`Starting MsgPack encode`);
    const result = msgpackEncoder.encode(data);
    log.info(`MsgPack encode completed in ${Date.now() - startTime}ms`);
    return result;
  } catch (error: any) {
    log.error(`MsgPack encode failed after ${Date.now() - startTime}ms: ${error.message}`, error);
    throw error;
  }
}

/**
 * Creates an Orama search index with the predefined schema
 * @returns A Promise resolving to the created Orama search index
 */
export async function createOramaIndex(): Promise<OramaSearchDatabase> {
  try {
    const db = await create({
      schema: ORAMA_SEARCH_SCHEMA,
      components: {
        // Use default components optimized for search performance
      }
    });
    
    log.info('Successfully created Orama search index');
    return db;
  } catch (error: any) {
    log.error(`Error creating Orama search index: ${error.message}`, error);
    throw error;
  }
}

/**
 * Inserts a single search entry into the Orama index
 * @param db - The Orama database instance
 * @param entry - The search entry to insert
 */
export async function insertSearchEntry(db: OramaSearchDatabase, entry: SearchEntry): Promise<void> {
  try {
    await insert(db, entry);
    log.debug(`Inserted search entry with ID: ${entry.id}`);
  } catch (error: any) {
    log.error(`Error inserting search entry ${entry.id}: ${error.message}`, error);
    throw error;
  }
}

/**
 * Inserts multiple search entries into the Orama index using batch insertion
 * @param db - The Orama database instance
 * @param entries - Array of search entries to insert
 */
export async function insertMultipleSearchEntries(db: OramaSearchDatabase, entries: SearchEntry[]): Promise<void> {
  try {
    await insertMultiple(db, entries);
    log.info(`Successfully inserted ${entries.length} search entries`);
  } catch (error: any) {
    log.error(`Error inserting ${entries.length} search entries: ${error.message}`, error);
    throw error;
  }
}

/**
 * Searches the Orama index with the provided parameters
 * @param db - The Orama database instance
 * @param searchRequest - Search parameters
 * @returns Promise resolving to search results
 */
export async function searchOramaIndex(db: OramaSearchDatabase, searchRequest: SearchRequest): Promise<SearchResponse> {
  const startTime = Date.now();
  
  try {
    const {
      query,
      limit = 10,
      offset = 0,
      sortBy,
      sortOrder = 'DESC',
      searchFields = ['text'],
    } = searchRequest;

    // Build search options
    const searchOptions: SearchParams<AnyOrama> = {
      term: query,
      limit,
      offset,
      properties: searchFields,
      // boost: {
      //   // Boost exact matches in text field
      //   text: 1.5
      // },
      threshold: 0,
      // TODO: Make this configurable
      exact: true
    };

    // Add sorting if specified
    if (sortBy) {
      searchOptions.sortBy = {
        property: sortBy,
        order: sortOrder
      };
    }

    log.warn(`Search options: ${JSON.stringify(searchOptions)}`);

    const results = await search(db, searchOptions);
    const processingTimeMs = Date.now() - startTime;

    // Transform results to match API response format
    const hits: ApiSearchResultHit[] = results.hits.map((hit: any) => ({
      ...hit.document,
      highlight: hit.highlight?.text || undefined // Include highlighting if available
    }));

    const response: SearchResponse = {
      hits,
      totalHits: results.count, // Use Orama's count since filtering is done during search
      processingTimeMs,
      query,
      sortBy,
      sortOrder
    };

    log.info(`Search completed in ${processingTimeMs}ms, found ${results.count} results for query: "${query}"`);
    return response;
  } catch (error: any) {
    const processingTimeMs = Date.now() - startTime;
    log.error(`Error searching Orama index after ${processingTimeMs}ms: ${error.message}`, error);
    throw error;
  }
}

/**
 * Persists Orama database to file using streaming approach with MsgPack
 * This avoids the string length limitations of the built-in persistence plugin
 * @param db - The Orama database instance
 * @param filePath - Path where to save the database file
 * @param compression - Compression type to use (none, gzip, brotli)
 * @returns Promise resolving to the file path
 */
export async function persistToFileStreaming(
  db: OramaSearchDatabase, 
  filePath: string, 
  compression: CompressionType = "gzip"
): Promise<string> {
  try {
    log.info(`Starting streaming persistence to ${filePath} with ${compression} compression`);
    
    // Export database using Orama's save function
    const dbExport = await save(db);
    log.info('Successfully exported Orama database for streaming');
    
    // Encode to MsgPack format using optimized encoder
    const msgpack = optimizedMsgPackEncode(dbExport);
    const bufferExport = Buffer.from(msgpack.buffer, msgpack.byteOffset, msgpack.byteLength);
    log.info(`MsgPack buffer size: ${(bufferExport.length / 1024 / 1024).toFixed(2)} MB`);

    
    // Stream to file with optional compression
    const streamStartTime = Date.now();
    log.info(`Starting file streaming with compression: ${compression}`);
    
    if (compression === "none") {
      await pipeline(Readable.from(bufferExport), fs.createWriteStream(filePath));
    } else if (compression === "gzip") {
      await pipeline(Readable.from(bufferExport), zlib.createGzip(), fs.createWriteStream(filePath));
    } else {
      throw new Error(`Unknown compression type: ${compression}`);
    }
    
    const streamEndTime = Date.now();
    const streamDuration = streamEndTime - streamStartTime;
    log.info(`File streaming completed in ${streamDuration}ms (${(streamDuration / 1000).toFixed(2)}s) with compression: ${compression}`);
    
    // Get file size for logging
    const stats = await fs.promises.stat(filePath);
    log.info(`Successfully persisted Orama database to ${filePath} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
    
    return filePath;
  } catch (error: any) {
    log.error(`Error persisting Orama database to file: ${error.message}`, error);
    throw error;
  }
}



/**
 * Restores Orama database from file using streaming decompression and optimized MsgPack decoding
 * @param filePath - Path to the database file
 * @param compression - Compression type that was used (none, gzip, brotli)
 * @returns Promise resolving to the restored Orama database instance
 */
export async function restoreFromFileStreamingOptimized(
  filePath: string, 
  compression: CompressionType = "gzip"
): Promise<OramaSearchDatabase> {
  const startTime = Date.now();
  try {
    log.info(`Starting optimized streaming restore from ${filePath} with ${compression} compression`);
    
    // Create a placeholder database
    const dbCreateStart = Date.now();
    const db = await create({
      schema: ORAMA_SEARCH_SCHEMA
    });
    log.info(`Database schema created in ${Date.now() - dbCreateStart}ms`);
    
    // Use streaming decompression to minimize memory usage
    const streamStart = Date.now();
    let chunks: Buffer[] = [];
    let totalSize = 0;
    
    if (compression === "none") {
      // For uncompressed files, still use the existing approach
      const fileBuffer = await fs.promises.readFile(filePath);
      chunks = [fileBuffer];
      totalSize = fileBuffer.length;
      log.info(`File read (uncompressed) in ${Date.now() - streamStart}ms, size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
    } else {
      // Create decompression stream
      let decompressionStream;
      if (compression === "gzip") {
        decompressionStream = zlib.createGunzip();
      } else if (compression === "brotli") {
        decompressionStream = zlib.createBrotliDecompress();
      } else {
        throw new Error(`Unknown compression type: ${compression}`);
      }
      
      // Stream the file through decompression
      const fileStream = fs.createReadStream(filePath);
      const decompressedStream = fileStream.pipe(decompressionStream);
      
      await new Promise<void>((resolve, reject) => {
        decompressedStream.on('data', (chunk: Buffer) => {
          chunks.push(chunk);
          totalSize += chunk.length;
        });
        
        decompressedStream.on('end', () => {
          log.info(`Streaming decompression (${compression}) completed in ${Date.now() - streamStart}ms, decompressed size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
          resolve();
        });
        
        decompressedStream.on('error', (error) => {
          log.error(`Streaming decompression failed after ${Date.now() - streamStart}ms: ${error.message}`);
          reject(error);
        });
      });
    }
    
    // Combine chunks into single buffer
    const combineStart = Date.now();
    const fileBuffer = Buffer.concat(chunks);
    log.info(`Buffer concatenation completed in ${Date.now() - combineStart}ms`);
    
    // Clear chunks array to free memory
    chunks = [];
    
    // Decode MsgPack
    const msgpackDecodeStart = Date.now();
    const decoded = await optimizedMsgPackDecode(fileBuffer);
    
    // Load into Orama database
    const oramaLoadStart = Date.now();
    await load(db, decoded as any);
    log.info(`Orama database load completed in ${Date.now() - oramaLoadStart}ms`);
    
    const totalTime = Date.now() - startTime;
    const msgpackDecodeTime = Date.now() - msgpackDecodeStart;
    const oramaLoadTime = Date.now() - oramaLoadStart;
    const streamDecompressTime = msgpackDecodeStart - streamStart;
    
    log.info(`Successfully restored Orama database from ${filePath} in ${totalTime}ms total (optimized streaming)`);
    log.info(`⏱️ Optimized restore timing breakdown: Streaming decompress: ${streamDecompressTime}ms, MsgPack decode: ${msgpackDecodeTime}ms, Orama load: ${oramaLoadTime}ms`);
    
    return db as OramaSearchDatabase;
  } catch (error: any) {
    const totalTime = Date.now() - startTime;
    log.error(`Error in optimized streaming restore after ${totalTime}ms: ${error.message}`, error);
    throw error;
  }
}

/**
 * Persists Orama database to file using true JSON streaming approach (no MsgPack)
 * This eliminates the binary encode/decode step while avoiding Orama's built-in persistence limits
 * by streaming JSON in chunks without creating a single large string
 * @param db - The Orama database instance
 * @param filePath - Path where to save the database file
 * @param compression - Compression type to use (none, gzip)
 * @returns Promise resolving to performance benchmark results
 */
export async function persistToFileJsonStreaming(
  db: OramaSearchDatabase, 
  filePath: string, 
  compression: CompressionType = "gzip"
): Promise<PerformanceBenchmark> {
  const totalStartTime = Date.now();
  
  try {
    log.info(`Starting true JSON streaming persistence to ${filePath} with ${compression} compression`);
    
    // Export database using Orama's save function
    const exportStartTime = Date.now();
    const dbExport = await save(db);
    const exportTime = Date.now() - exportStartTime;
    log.info(`Successfully exported Orama database for JSON streaming in ${exportTime}ms`);
    
    // Create a streaming JSON writer that avoids the string length limit
    const streamStartTime = Date.now();
    log.info(`Starting true JSON file streaming with compression: ${compression}`);
    
    // Create write stream with optional compression
    let writeStream: NodeJS.WritableStream;
    if (compression === "none") {
      writeStream = fs.createWriteStream(filePath);
    } else if (compression === "gzip") {
      const gzipStream = zlib.createGzip();
      const fileStream = fs.createWriteStream(filePath);
      gzipStream.pipe(fileStream);
      writeStream = gzipStream;
    } else {
      throw new Error(`Unknown compression type: ${compression}`);
    }
    
    // Stream JSON in chunks to avoid string length limit
    const encodeStartTime = Date.now();
    let totalJsonSize = 0;
    
    // Write opening brace
    writeStream.write('{');
    
    // Get all keys from the database export
    const keys = Object.keys(dbExport);
    const totalKeys = keys.length;
    
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const value = dbExport[key as keyof typeof dbExport];
      
      // Write key
      const keyJson = JSON.stringify(key);
      writeStream.write(keyJson);
      writeStream.write(':');
      totalJsonSize += keyJson.length + 1;
      
      // Write value - this is the critical part where we avoid stringifying the entire value at once
      if (key === 'data' && Array.isArray(value)) {
        // For the data array (which is usually the largest part), stream it in chunks
        writeStream.write('[');
        totalJsonSize += 1;
        
        for (let j = 0; j < value.length; j++) {
          if (j > 0) {
            writeStream.write(',');
            totalJsonSize += 1;
          }
          
          // Stringify each item individually to avoid large strings
          const itemJson = JSON.stringify(value[j]);
          writeStream.write(itemJson);
          totalJsonSize += itemJson.length;
          
          // Log progress for large arrays
          if (j > 0 && j % 10000 === 0) {
            log.debug(`Streamed ${j}/${value.length} data items (${((j / value.length) * 100).toFixed(1)}%)`);
          }
        }
        
        writeStream.write(']');
        totalJsonSize += 1;
      } else {
        // For other properties, stringify normally (they're usually smaller)
        const valueJson = JSON.stringify(value);
        writeStream.write(valueJson);
        totalJsonSize += valueJson.length;
      }
      
      // Add comma if not the last key
      if (i < keys.length - 1) {
        writeStream.write(',');
        totalJsonSize += 1;
      }
      
      // Log progress for keys
      if (i > 0 && i % 10 === 0) {
        log.debug(`Streamed ${i}/${totalKeys} database keys (${((i / totalKeys) * 100).toFixed(1)}%)`);
      }
    }
    
    // Write closing brace
    writeStream.write('}');
    totalJsonSize += 1;
    
    // End the stream
    writeStream.end();
    
    // Wait for the stream to finish
    await new Promise<void>((resolve, reject) => {
      writeStream.on('finish', () => {
        resolve();
      });
      writeStream.on('error', (error) => {
        reject(error);
      });
    });
    
    const encodeTime = Date.now() - encodeStartTime;
    const streamTime = Date.now() - streamStartTime;
    
    log.info(`True JSON streaming completed in ${streamTime}ms (${(streamTime / 1000).toFixed(2)}s) with compression: ${compression}`);
    log.info(`JSON size: ${(totalJsonSize / 1024 / 1024).toFixed(2)} MB`);
    
    // Get file size for logging and compression ratio calculation
    const stats = await fs.promises.stat(filePath);
    const fileSize = stats.size;
    const compressionRatio = ((1 - fileSize / totalJsonSize) * 100);
    
    const totalTime = Date.now() - totalStartTime;
    log.info(`Successfully persisted Orama database to ${filePath} (${(fileSize / 1024 / 1024).toFixed(2)} MB, ${compressionRatio.toFixed(1)}% compression)`);
    
    const benchmark: PerformanceBenchmark = {
      totalTime,
      exportTime,
      encodeTime,
      streamTime,
      fileSize,
      compressionRatio
    };
    
    log.info(`⏱️ True JSON streaming persistence benchmark: Total: ${totalTime}ms, Export: ${exportTime}ms, Encode: ${encodeTime}ms, Stream: ${streamTime}ms`);
    
    return benchmark;
  } catch (error: any) {
    const totalTime = Date.now() - totalStartTime;
    log.error(`Error in true JSON streaming persistence after ${totalTime}ms: ${error.message}`, error);
    throw error;
  }
}

/**
 * Restores Orama database from JSON file using SAX-style streaming JSON parser
 * This processes JSON incrementally without creating large strings using stream-json
 * @param filePath - Path to the database file
 * @param compression - Compression type that was used (none, gzip)
 * @returns Promise resolving to the restored Orama database instance
 */
export async function restoreFromFileJsonStreaming(
  filePath: string, 
  compression: CompressionType = "gzip"
): Promise<OramaSearchDatabase> {
  const startTime = Date.now();
  try {
    log.info(`Starting SAX-style JSON streaming restore from ${filePath} with ${compression} compression`);
    
    // Create a placeholder database
    const dbCreateStart = Date.now();
    const db = await create({
      schema: ORAMA_SEARCH_SCHEMA
    });
    log.info(`Database schema created in ${Date.now() - dbCreateStart}ms`);
    
    // Create read stream with optional decompression
    let readStream: NodeJS.ReadableStream;
    if (compression === "none") {
      readStream = fs.createReadStream(filePath);
    } else if (compression === "gzip") {
      const fileStream = fs.createReadStream(filePath);
      readStream = fileStream.pipe(zlib.createGunzip());
    } else {
      throw new Error(`Unknown compression type: ${compression}`);
    }
    
    // Use stream-json parser to process JSON incrementally
    const streamStart = Date.now();
    const jsonParser = parser();
    
    // Collect the parsed data structure
    let parsedData: any = {};
    let currentPath: string[] = [];
    let inDataArray = false;
    let dataEntries: any[] = [];
    let entriesProcessed = 0;
    let totalSize = 0;
    
    await new Promise<void>((resolve, reject) => {
      jsonParser.on('data', (data) => {
        totalSize += JSON.stringify(data).length;
        
        if (data.name === 'startObject') {
          // Start of an object
          if (currentPath.length === 0) {
            // Root object
            parsedData = {};
          } else if (currentPath.join('.') === 'data') {
            // We're inside the data array, this is a search entry
            inDataArray = true;
          }
        } else if (data.name === 'endObject') {
          // End of an object
          if (inDataArray && currentPath.join('.') === 'data') {
            // We've finished parsing a search entry
            entriesProcessed++;
            if (entriesProcessed % 10000 === 0) {
              log.info(`Processed ${entriesProcessed} search entries...`);
            }
          }
          inDataArray = false;
          currentPath.pop();
        } else if (data.name === 'startArray') {
          // Start of an array
          if (currentPath.join('.') === 'data') {
            // This is the data array
            dataEntries = [];
            parsedData.data = dataEntries;
          }
        } else if (data.name === 'endArray') {
          // End of an array
          currentPath.pop();
        } else if (data.name === 'keyValue') {
          // Key in a key-value pair
          const key = data.value;
          if (currentPath.length === 0) {
            // Top-level key
            parsedData[key] = null; // Will be filled when value is parsed
          }
          currentPath.push(key);
        } else if (data.name === 'value') {
          // Value in a key-value pair
          const value = data.value;
          const path = currentPath.join('.');
          
          if (path === 'data') {
            // This is a search entry in the data array
            dataEntries.push(value);
          } else if (currentPath.length === 1) {
            // Top-level value
            const key = currentPath[0];
            parsedData[key] = value;
            currentPath.pop();
          } else {
            // Nested value
            let current = parsedData;
            for (let i = 0; i < currentPath.length - 1; i++) {
              if (!current[currentPath[i]]) {
                current[currentPath[i]] = {};
              }
              current = current[currentPath[i]];
            }
            current[currentPath[currentPath.length - 1]] = value;
            currentPath.pop();
          }
        }
      });
      
      jsonParser.on('end', () => {
        log.info(`SAX-style JSON parsing completed in ${Date.now() - streamStart}ms, processed ${entriesProcessed} entries, total size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
        resolve();
      });
      
      jsonParser.on('error', (error) => {
        log.error(`SAX-style JSON parsing failed after ${Date.now() - streamStart}ms: ${error.message}`);
        reject(error);
      });
      
      // Pipe the read stream to the JSON parser
      readStream.pipe(jsonParser);
    });
    
    // Load into Orama database
    const oramaLoadStart = Date.now();
    await load(db, parsedData as any);
    log.info(`Orama database load completed in ${Date.now() - oramaLoadStart}ms`);
    
    const totalTime = Date.now() - startTime;
    const oramaLoadTime = Date.now() - oramaLoadStart;
    const streamDecompressTime = oramaLoadStart - streamStart;
    
    log.info(`Successfully restored Orama database from ${filePath} in ${totalTime}ms total (SAX-style streaming)`);
    log.info(`⏱️ SAX-style streaming restore timing breakdown: Streaming decompress: ${streamDecompressTime}ms, Orama load: ${oramaLoadTime}ms`);
    
    return db as OramaSearchDatabase;
  } catch (error: any) {
    const totalTime = Date.now() - startTime;
    log.error(`Error in SAX-style JSON streaming restore after ${totalTime}ms: ${error.message}`, error);
    throw error;
  }
}

/**
 * Performance benchmark function to compare MsgPack vs JSON streaming approaches
 * @param db - The Orama database instance to test
 * @param testFilePath - Path for the test file
 * @returns Promise resolving to comparison results
 */
export async function benchmarkPersistenceApproaches(
  db: OramaSearchDatabase,
  testFilePath: string
): Promise<{
  msgpack: PerformanceBenchmark;
  json: PerformanceBenchmark;
  comparison: {
    totalTimeDiff: number;
    encodeTimeDiff: number;
    fileSizeDiff: number;
    compressionRatioDiff: number;
  };
}> {
  log.info('Starting persistence approach benchmark...');
  
  // Test MsgPack approach
  const msgpackPath = `${testFilePath}.msgpack`;
  const msgpackStart = Date.now();
  await persistToFileStreaming(db, msgpackPath, 'gzip');
  const msgpackTotalTime = Date.now() - msgpackStart;
  
  // Get MsgPack file stats for comparison
  const msgpackStats = await fs.promises.stat(msgpackPath);
  const msgpackFileSize = msgpackStats.size;
  
  // Test JSON approach
  const jsonPath = `${testFilePath}.json`;
  const jsonResult = await persistToFileJsonStreaming(db, jsonPath, 'gzip');
  
  // Calculate differences
  const comparison = {
    totalTimeDiff: jsonResult.totalTime - msgpackTotalTime,
    encodeTimeDiff: jsonResult.encodeTime, // MsgPack doesn't have separate encode time
    fileSizeDiff: jsonResult.fileSize - msgpackFileSize,
    compressionRatioDiff: jsonResult.compressionRatio // MsgPack doesn't have compression ratio
  };
  
  log.info('📊 Persistence Benchmark Results:');
  log.info(`MsgPack: Total: ${msgpackTotalTime}ms, Size: ${(msgpackFileSize / 1024 / 1024).toFixed(2)}MB`);
  log.info(`JSON: Total: ${jsonResult.totalTime}ms, Encode: ${jsonResult.encodeTime}ms, Size: ${(jsonResult.fileSize / 1024 / 1024).toFixed(2)}MB, Compression: ${jsonResult.compressionRatio.toFixed(1)}%`);
  log.info(`Difference: Total: ${comparison.totalTimeDiff > 0 ? '+' : ''}${comparison.totalTimeDiff}ms, Size: ${comparison.fileSizeDiff > 0 ? '+' : ''}${(comparison.fileSizeDiff / 1024 / 1024).toFixed(2)}MB`);
  
  return {
    msgpack: { 
      totalTime: msgpackTotalTime,
      exportTime: 0, // Not measured separately
      encodeTime: 0, // Not measured separately
      streamTime: msgpackTotalTime, // Approximate
      fileSize: msgpackFileSize,
      compressionRatio: 0 // Not calculated
    },
    json: jsonResult,
    comparison
  };
}


