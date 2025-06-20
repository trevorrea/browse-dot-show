import * as path from 'path';
import * as fs from 'fs/promises';
import { getEpisodeManifestKey, getLocalDbPath, getSearchEntriesDirPrefix, getSearchIndexKey, getTranscriptsDirPrefix } from '@browse-dot-show/constants';
import { 
  type OramaSearchDatabase, 
  createOramaIndex, 
  insertMultipleSearchEntries,
  serializeOramaIndex 
} from '@browse-dot-show/database';
import { log } from '@browse-dot-show/logging';
import { EpisodeInManifest, SearchEntry, SearchRequest } from '@browse-dot-show/types';
import {
  createDirectory, 
  fileExists, 
  getFile, 
  listDirectories,
  listFiles,
  saveFile
} from '@browse-dot-show/s3'
import { convertSrtFileIntoSearchEntryArray } from './utils/convert-srt-file-into-search-entry-array.js';
import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda';

log.info(`▶️ Starting convert-srt-files-into-indexed-search-entries, with logging level: ${log.getLevel()}`);

// Constants
const PROGRESS_LOG_THRESHOLD = 5; // Log progress every 5% of SRT files processed
const SEARCH_LAMBDA_NAME = 'search-indexed-transcripts'; // The name of the search lambda

// Initialize AWS Lambda Client
const LAMBDA_CLIENT = new LambdaClient({});

// Helper function to detect if we're running in AWS Lambda environment
function isRunningInLambda(): boolean {
  return !!process.env.AWS_LAMBDA_FUNCTION_NAME;
}

// Structure for episode data from the manifest
interface EpisodeManifestEntry {
  sequentialId: number;
  fileKey: string;
  publishedAt: string; // ISO 8601 date string for calculating unix timestamp
}

let episodeManifestData: EpisodeManifestEntry[] = [];

// Function to check if search entries already exist for a transcript
async function searchEntriesExist(srtFileKey: string): Promise<boolean> {
  const srtFileName = path.basename(srtFileKey, '.srt');
  const podcastName = path.basename(path.dirname(srtFileKey));
  const searchEntriesKey = path.join(getSearchEntriesDirPrefix(), podcastName, `${srtFileName}.json`);
  
  return fileExists(searchEntriesKey);
}

// Function to process a single SRT file
async function processSrtFile(srtFileKey: string): Promise<SearchEntry[]> {
  log.debug(`Processing SRT file: ${srtFileKey}`);
  
  // Get the SRT file content
  const srtBuffer = await getFile(srtFileKey);
  const srtContent = srtBuffer.toString('utf-8');
  
  // Derive fileKey to match manifest (e.g., "2020-01-23_The-Transfer-Window")
  const baseSrtName = path.basename(srtFileKey, '.srt'); // e.g., YYYY-MM-DD_episode-title

  const manifestEntry = episodeManifestData.find(ep => ep.fileKey === baseSrtName);

  if (!manifestEntry) {
    log.error(`No manifest entry found for SRT file key: ${srtFileKey} (derived fileKey: ${baseSrtName}). Skipping this file.`);
    return [];
  }
  const sequentialEpisodeId = manifestEntry.sequentialId;
  
  // Convert publishedAt to unix timestamp for sorting
  const episodePublishedUnixTimestamp = new Date(manifestEntry.publishedAt).getTime();
  
  // Convert SRT content to search entries using the utility function
  const utilityEntries = convertSrtFileIntoSearchEntryArray({
    srtFileContent: srtContent,
    sequentialEpisodeId,
    episodePublishedUnixTimestamp // Pass the unix timestamp to the utility
  });
  
  // Convert entries to our SearchEntry type and add the new ID structure
  const searchEntries: SearchEntry[] = utilityEntries; // Simplified from map as utilityEntries are already complete
  
  log.debug(`Generated ${searchEntries.length} search entries from SRT file ${srtFileKey}`);
  
  // Save search entries to S3
  const srtFileName = path.basename(srtFileKey, '.srt');
  const podcastName = path.basename(path.dirname(srtFileKey)); // This might be simplified if manifest gives full path or structure
  const searchEntriesKey = path.join(getSearchEntriesDirPrefix(), podcastName, `${srtFileName}.json`);
  
  // Ensure the directory exists
  await createDirectory(path.dirname(searchEntriesKey));
  
  // Save search entries as a JSON array
  await saveFile(searchEntriesKey, JSON.stringify(searchEntries, null, 2));
  
  log.debug(`Saved ${searchEntries.length} search entries to: ${searchEntriesKey}`);
  
  return searchEntries;
}

// Function to check if search entries already exist for a transcript
// This function remains useful for determining if a JSON file needs creation, though the main loop will handle it.
async function searchEntriesJsonFileExists(srtFileKey: string): Promise<string | false> {
  const srtFileName = path.basename(srtFileKey, '.srt');
  const podcastName = path.basename(path.dirname(srtFileKey));
  const searchEntriesKey = path.join(getSearchEntriesDirPrefix(), podcastName, `${srtFileName}.json`);
  
  if (await fileExists(searchEntriesKey)) {
    return searchEntriesKey;
  }
  return false;
}

// Main handler function
export async function handler(): Promise<any> {
  log.info(`🟢 Starting convert-srt-files-into-indexed-search-entries > handler, with logging level: ${log.getLevel()}`);
  const lambdaStartTime = Date.now();
  log.info('⏱️ Starting at', new Date().toISOString())

  try {
    const episodeManifestKey = getEpisodeManifestKey();
    log.info(`Fetching episode manifest from S3: ${episodeManifestKey}`);
    const manifestBuffer = await getFile(episodeManifestKey);
    const manifestContent = manifestBuffer.toString('utf-8');
    const parsedManifest = JSON.parse(manifestContent);
    if (parsedManifest && Array.isArray(parsedManifest.episodes)) {
      episodeManifestData = parsedManifest.episodes.map((ep: EpisodeInManifest) => ({
        sequentialId: ep.sequentialId,
        fileKey: ep.fileKey,
        publishedAt: ep.publishedAt, // Include publishedAt for unix timestamp calculation
      }));
      log.info(`Successfully loaded and parsed ${episodeManifestData.length} episodes from manifest.`);
    } else {
      log.error('Episode manifest is not in the expected format (missing episodes array). Cannot proceed with new ID logic.');
      episodeManifestData = []; // Ensure it's empty to prevent partial processing
    }
  } catch (error: any) {
    const episodeManifestKey = getEpisodeManifestKey();
    log.error(`Failed to load or parse episode manifest from ${episodeManifestKey}: ${error.message}`, error);
    log.error('Cannot proceed without episode manifest for new ID logic. Aborting.');
    return {
      status: 'error',
      message: `Failed to load episode manifest: ${error.message}`,
      evaluatedSrtFiles: 0,
      totalSrtFiles: 0,
      newEntriesAdded: 0
    };
  }

  if (episodeManifestData.length === 0) {
      log.warn("Episode manifest data is empty after loading. This may lead to no SRTs being processed correctly if they rely on manifest IDs. Continuing, but this is unusual.");
  }

  try {
    await fs.access('/tmp');
  } catch (error) {
    log.info("Local /tmp directory not accessible or doesn't exist. Creating it.");
    await fs.mkdir('/tmp', { recursive: true });
  }
  
  await createDirectory(getSearchEntriesDirPrefix()); // Ensure base search entries dir exists

  // Always create a fresh Orama index
  log.info('Creating fresh Orama search index');
  
  // Clean up any existing local index file
  try {
    await fs.unlink(getLocalDbPath());
    log.debug(`Removed any existing local index at ${getLocalDbPath()}`);
  } catch (e: any) {
    if (e.code !== 'ENOENT') log.warn(`Could not remove existing local index: ${e.message}`);
  }
  
  const oramaIndex: OramaSearchDatabase = await createOramaIndex();
  log.info('Created fresh Orama search index');

  // List all SRT files (keeping existing logic for podcast directory traversal)
  const podcastDirectoryPrefixes = await listDirectories(getTranscriptsDirPrefix());
  log.info(`[DEBUG] listDirectories('${getTranscriptsDirPrefix()}') returned ${podcastDirectoryPrefixes.length} podcast directories.`);
  if (podcastDirectoryPrefixes.length > 0) {
    log.debug(`[DEBUG] Podcast directories: ${JSON.stringify(podcastDirectoryPrefixes)}`);
  }

  const allSrtFiles: string[] = [];

  // For each podcast directory prefix, list the files within it
  for (const dirPrefix of podcastDirectoryPrefixes) {
    // Ensure the prefix ends with a '/' for S3 listing, if it doesn't already
    const currentPodcastPrefix = dirPrefix.endsWith('/') ? dirPrefix : `${dirPrefix}/`;
    log.debug(`[DEBUG] Listing files under podcast prefix: ${currentPodcastPrefix}`);
    const filesInDir = await listFiles(currentPodcastPrefix);
    log.debug(`[DEBUG] Found ${filesInDir.length} items under ${currentPodcastPrefix}.`);
    if (filesInDir.length > 0 && filesInDir.length < 10) {
        log.debug(`[DEBUG] Items: ${JSON.stringify(filesInDir)}`)
    } else if (filesInDir.length > 0) {
        log.debug(`[DEBUG] First 5 items: ${JSON.stringify(filesInDir.slice(0,5))}`)
    }

    const srtFilesInCurrentDir = filesInDir.filter(file => {
      if (typeof file !== 'string') {
        log.warn(`[DEBUG] Encountered non-string item in listFiles output for ${currentPodcastPrefix}: ${JSON.stringify(file)}`);
        return false;
      }
      return file.endsWith('.srt');
    });
    log.debug(`[DEBUG] Found ${srtFilesInCurrentDir.length} SRT files in ${currentPodcastPrefix}.`);
    allSrtFiles.push(...srtFilesInCurrentDir);
  }
  
  log.info(`[DEBUG] Total SRT files found across all podcast directories: ${allSrtFiles.length}`);
  if (allSrtFiles.length > 0) {
    log.debug(`[DEBUG] First 5 SRT files from combined list: ${JSON.stringify(allSrtFiles.slice(0,5))}`);
  }

  const srtFilesToEvaluate = allSrtFiles; // Already filtered for .srt
  const totalSrtFiles = srtFilesToEvaluate.length;

  if (totalSrtFiles === 0) {
    log.info("No SRT files found in transcripts directory. Exiting.");
    return { 
        status: 'success',
        evaluatedSrtFiles: 0, 
        totalSrtFiles: 0, 
        newEntriesAdded: 0
    };
  }
  log.info(`Found ${totalSrtFiles} total SRT files to evaluate for indexing.`);

  let srtFilesProcessedCount = 0;
  let newEntriesAddedInThisRun = 0;

  // Collect all search entries to insert in batches for better performance
  const allSearchEntriesToInsert: SearchEntry[] = [];

  for (const srtFileKey of srtFilesToEvaluate) {
    log.debug(`Evaluating SRT file: ${srtFileKey} (${srtFilesProcessedCount + 1}/${totalSrtFiles})`);
    
    let searchEntriesForFile: SearchEntry[] = [];
    let jsonNeedsProcessing = true; // Assume we need to process (load or create) the JSON

    const existingJsonPath = await searchEntriesJsonFileExists(srtFileKey);
    if (existingJsonPath) {
        log.debug(`Search entries JSON already exists for ${srtFileKey} at ${existingJsonPath}. Loading it.`);
        try {
            const fileBuffer = await getFile(existingJsonPath);
            const fileContent = fileBuffer.toString('utf-8');
            const parsedEntries = JSON.parse(fileContent);
            if (Array.isArray(parsedEntries)) {
                searchEntriesForFile = parsedEntries.map(entry => ({ ...entry }));
                jsonNeedsProcessing = false; // Successfully loaded
            } else {
                log.warn(`Unexpected format in ${existingJsonPath}, expected array. Will attempt to regenerate.`);
            }
        } catch (error: any) {
            log.error(`Error loading or parsing existing JSON ${existingJsonPath}: ${error.message}. Will attempt to regenerate.`);
        }
    }

    if (jsonNeedsProcessing) { // True if JSON didn't exist, or if loading failed
        log.debug(`Search entries JSON does not exist or failed to load for ${srtFileKey}. Generating and saving it now.`);
        try {
            searchEntriesForFile = await processSrtFile(srtFileKey); // This creates and saves the JSON.
        } catch (error: any) {
            log.error(`Failed to process SRT file ${srtFileKey} into search entries: ${error.message}`, error);
            srtFilesProcessedCount++; // Count as processed to avoid getting stuck on problematic files in loops
            continue; // Skip to next file
        }
    }
    
    if (searchEntriesForFile.length === 0) {
        log.debug(`No search entries found or generated for ${srtFileKey}. Moving to next file.`);
        srtFilesProcessedCount++;
        continue;
    }

    // Add entries to batch for insertion
    allSearchEntriesToInsert.push(...searchEntriesForFile);
    newEntriesAddedInThisRun += searchEntriesForFile.length;

    log.debug(`Queued ${searchEntriesForFile.length} entries for batch insertion from ${srtFileKey}`);

    srtFilesProcessedCount++;

    const currentSrtPercentage = Math.floor((srtFilesProcessedCount / totalSrtFiles) * 100);
    if (currentSrtPercentage % PROGRESS_LOG_THRESHOLD === 0 && currentSrtPercentage > 0 && totalSrtFiles > 0) {
      const elapsedTimeSinceStart = ((Date.now() - lambdaStartTime) / 1000).toFixed(2);
      log.info(
        `\n🔄 Progress: ${currentSrtPercentage}% of SRT files processed (${srtFilesProcessedCount}/${totalSrtFiles}).` + 
        `\nElapsed time: ${elapsedTimeSinceStart}s.` + 
        `\nCollected ${allSearchEntriesToInsert.length} entries so far...\n`
      );
    }
  }

  // TODO: Can eventually remove this section, because it adds a few seconds to the lambda runtime
  // For now, leaving because we've encountered this issue, and want to be warned exactly what it is, if it occurs
  const setOfIds = new Set<string>();
  const duplicateIds: SearchEntry[] = []
  allSearchEntriesToInsert.forEach(entry => {
    if (setOfIds.has(entry.id)) {
      duplicateIds.push(entry);
    } else {
      setOfIds.add(entry.id);
    }
  });
  if (duplicateIds.length > 0) {
    log.error(`[ERROR] ❌ Duplicate ids found! ${JSON.stringify(duplicateIds)}`);
  } else {
    log.info(`[DEBUG] ✅ No duplicate ids found`);
  }

  // Insert all collected entries in a single batch
  if (allSearchEntriesToInsert.length > 0) {
    log.info(`Inserting all ${allSearchEntriesToInsert.length} entries into Orama index in single batch...`);
    const insertStart = Date.now();
    await insertMultipleSearchEntries(oramaIndex, allSearchEntriesToInsert);
    log.info(`All entries inserted into Orama index in ${((Date.now() - insertStart) / 1000).toFixed(2)}s`);
  }

  log.info(`Serializing Orama index to binary format at ${getLocalDbPath()}...`);
  try {
    const serializedIndexBuffer = await serializeOramaIndex(oramaIndex);
    await fs.writeFile(getLocalDbPath(), serializedIndexBuffer);
    log.info(`Orama index successfully serialized to ${getLocalDbPath()}`);
    
    // Upload to S3 (this will overwrite any existing index)
    log.info(`Uploading Orama index from ${getLocalDbPath()} to S3 at ${getSearchIndexKey()}...`);
    await saveFile(getSearchIndexKey(), serializedIndexBuffer);
    log.info(`Orama index successfully saved and exported to S3: ${getSearchIndexKey()}`);

    // If new entries were added, invoke the search lambda to force a refresh (only when running in AWS Lambda)
    if (newEntriesAddedInThisRun > 0) {
      if (isRunningInLambda()) {
        log.info(`New entries (${newEntriesAddedInThisRun}) were added. Invoking ${SEARCH_LAMBDA_NAME} to refresh its index.`);
        try {
          const invokePayload: Partial<SearchRequest> = {
            forceFreshDBFileDownload: true
          };
          const command = new InvokeCommand({
            FunctionName: SEARCH_LAMBDA_NAME,
            InvocationType: 'Event', // Asynchronous invocation
            Payload: JSON.stringify(invokePayload),
          });
          await LAMBDA_CLIENT.send(command);
          log.info(`${SEARCH_LAMBDA_NAME} invoked successfully with forceFreshDBFileDownload: true.`);
        } catch (invokeError) {
          log.error(`Error invoking ${SEARCH_LAMBDA_NAME}:`, invokeError);
          // Optionally, decide if this error should affect the overall status
        }
      } else {
        log.info(`New entries (${newEntriesAddedInThisRun}) were added, but skipping ${SEARCH_LAMBDA_NAME} invocation (running locally).`);
      }
    } else {
      log.info('No new entries were added. Search Lambda will not be invoked to refresh.');
    }

  } catch (error: any) {
    log.error(`Failed to serialize or upload Orama index to S3: ${error.message}. The local index may be present at ${getLocalDbPath()} but S3 is not updated.`, error);
    return {
      status: 'error',
      message: `Failed to serialize or upload index: ${error.message}`,
      evaluatedSrtFiles: srtFilesProcessedCount,
      totalSrtFiles: totalSrtFiles,
      newEntriesAdded: newEntriesAddedInThisRun
    };
  }

  // Clean up local index file
  try {
    await fs.unlink(getLocalDbPath());
    log.info(`Cleaned up local Orama index file: ${getLocalDbPath()}`);
  } catch (error: any) {
    if (error.code !== 'ENOENT') { // ENOENT means file not found, which is fine
      log.warn(`Could not clean up local Orama index file: ${error.message}`);
    }
  }

  const totalLambdaTime = (Date.now() - lambdaStartTime) / 1000;

  log.info('\n📊 SRT Processing Summary:');
  log.info(`\n⏱️  Total Duration: ${totalLambdaTime.toFixed(2)} seconds`);
  log.info(`\n📁 Total SRT Files Found: ${totalSrtFiles}`);
  log.info(`✅ Successfully Processed: ${srtFilesProcessedCount}`);
  log.info(`📝 New Search Entries Added: ${newEntriesAddedInThisRun}`);
  log.info(`\n✨ Completed successfully.`);

  return {
    status: 'success',
    message: 'Completed successfully.',
    evaluatedSrtFiles: srtFilesProcessedCount,
    totalSrtFiles: totalSrtFiles,
    newEntriesAdded: newEntriesAddedInThisRun
  };
}

// If running directly (ESM compatible approach)
// In ESM, import.meta.url will be defined and can be compared to process.argv[1]
const scriptPath = path.resolve(process.argv[1]);
// Check if the module is being run directly
if (import.meta.url === `file://${scriptPath}`) {
  handler() 
    .then(result => {
      log.debug('Local run completed with result:');
      console.dir(result, { depth: null });
    })
    .catch(err => {
      log.error('Local run failed with error:');
      console.error(err);
    });
}