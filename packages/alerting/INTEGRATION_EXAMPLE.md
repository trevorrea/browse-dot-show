# Alerting Integration Example

This document shows how to integrate the alerting package into the RSS retrieval Lambda to send Slack notifications when errors occur.

## Step 1: Add Alerting Dependency

Add the alerting package to your Lambda's `package.json`:

```json
{
  "devDependencies": {
    "@browse-dot-show/alerting": "workspace:*",
    // ... other dependencies
  }
}
```

## Step 2: Import and Initialize Alerting

Add this import to the top of your Lambda file:

```typescript
import { createAlertingServiceFromEnv } from '@browse-dot-show/alerting';

// Initialize alerting service
const alerting = createAlertingServiceFromEnv();
```

## Step 3: Add Alerting to Error Cases

Here are examples of how to add alerting to different error scenarios in the RSS retrieval Lambda:

### 1. RSS Feed Fetch Failures

```typescript
async function fetchRSSFeed(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.text();
  } catch (error) {
    log.error(`Error fetching RSS feed from ${url}:`, error);
    
    // Send alert for RSS feed fetch failures
    await alerting.sendError(
      `Failed to fetch RSS feed from ${url}`,
      error as Error,
      {
        source: 'rss-retrieval-lambda',
        metadata: {
          feedUrl: url,
          statusCode: error instanceof Error && error.message.includes('status') ? 
            error.message.match(/status: (\d+)/)?.[1] : undefined
        }
      }
    );
    
    throw error;
  }
}
```

### 2. RSS Parsing Failures

```typescript
async function parseRSSFeed(xmlContent: string): Promise<any> {
  const parser = new xml2js.Parser({
    mergeAttrs: true,
    valueProcessors: [xml2js.processors.parseNumbers, xml2js.processors.parseBooleans],
    attrValueProcessors: [xml2js.processors.parseNumbers, xml2js.processors.parseBooleans],
  });
  
  try {
    return await parser.parseStringPromise(xmlContent);
  } catch (error) {
    log.error('Error parsing RSS XML:', error);
    
    // Send alert for RSS parsing failures
    await alerting.sendError(
      'Failed to parse RSS feed XML content',
      error as Error,
      {
        source: 'rss-retrieval-lambda',
        metadata: {
          xmlContentLength: xmlContent.length,
          xmlContentPreview: xmlContent.substring(0, 200) + '...'
        }
      }
    );
    
    throw error;
  }
}
```

### 3. S3 Save Failures

```typescript
async function saveRSSFeedToS3(
  xmlContent: string, 
  podcastId: string,
  feedFile: string,
): Promise<void> {
  const filePath = path.join(getRSSDirectoryPrefix(), feedFile);
  
  try {
    await saveFile(filePath, xmlContent);
    log.debug(`RSS feed for ${podcastId} saved to ${filePath}`);
  } catch (error) {
    log.error(`Error saving RSS feed for ${podcastId}:`, error);
    
    // Send alert for S3 save failures
    await alerting.sendError(
      `Failed to save RSS feed to S3 for podcast ${podcastId}`,
      error as Error,
      {
        source: 'rss-retrieval-lambda',
        metadata: {
          podcastId,
          filePath,
          contentLength: xmlContent.length
        }
      }
    );
    
    throw error;
  }
}
```

### 4. Episode Manifest Issues (Critical)

```typescript
async function getOrCreateEpisodeManifest(): Promise<EpisodeManifest> {
  const episodeManifestKey = getEpisodeManifestKey();
  
  try {
    if (await fileExists(episodeManifestKey)) {
      const manifestBuffer = await getFile(episodeManifestKey);
      return JSON.parse(manifestBuffer.toString('utf-8')) as EpisodeManifest;
    } else {
      log.info(`Episode manifest not found at ${episodeManifestKey}, creating a new one.`);
      await createDirectory(getEpisodeManifestDirPrefix());
      const newManifest: EpisodeManifest = {
        lastUpdated: new Date().toISOString(),
        episodes: [],
      };
      await saveEpisodeManifest(newManifest);
      return newManifest;
    }
  } catch (error) {
    log.error('Error reading or creating episode manifest:', error);
    
    // Send critical alert for manifest issues
    await alerting.sendCritical(
      'Failed to read or create episode manifest',
      error as Error,
      {
        source: 'rss-retrieval-lambda',
        metadata: {
          manifestKey: episodeManifestKey
        }
      }
    );
    
    throw error;
  }
}
```

### 5. Audio Download Failures

```typescript
async function downloadEpisodeAudio(episode: EpisodeInManifest): Promise<string> {
  const url = episode.originalAudioURL;
  const audioFilename = getEpisodeAudioFilename(episode.fileKey);
  const podcastAudioKey = path.join(getAudioDirPrefix(), episode.podcastId, audioFilename);
  
  try {
    log.debug(`Downloading audio for episode: ${episode.title} (key: ${episode.fileKey}) from ${url}`);
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    await saveFile(podcastAudioKey, Buffer.from(arrayBuffer));
    log.info(`✅ Successfully downloaded: ${audioFilename} to ${podcastAudioKey}`);
    
    return podcastAudioKey;
  } catch (error) {
    log.error(`❌ Error downloading episode ${episode.title} (key: ${episode.fileKey}):`, error);
    
    // Send alert for download failures
    await alerting.sendError(
      `Failed to download audio for episode "${episode.title}"`,
      error as Error,
      {
        source: 'rss-retrieval-lambda',
        metadata: {
          episodeTitle: episode.title,
          episodeFileKey: episode.fileKey,
          podcastId: episode.podcastId,
          audioUrl: url,
          targetPath: podcastAudioKey
        }
      }
    );
    
    throw error;
  }
}
```

### 6. Lambda Invocation Failures

```typescript
async function triggerTranscriptionLambda(): Promise<void> {
  try {
    const command = new InvokeCommand({
      FunctionName: WHISPER_LAMBDA_NAME,
      InvocationType: 'Event',
    });
    await LAMBDA_CLIENT.send(command);
    log.info(`Successfully invoked ${WHISPER_LAMBDA_NAME}`);
  } catch (error) {
    log.error(`Error invoking ${WHISPER_LAMBDA_NAME}:`, error);
    
    // Send alert for Lambda invocation failures
    await alerting.sendError(
      `Failed to invoke transcription Lambda (${WHISPER_LAMBDA_NAME})`,
      error as Error,
      {
        source: 'rss-retrieval-lambda',
        metadata: {
          targetLambda: WHISPER_LAMBDA_NAME
        }
      }
    );
    
    // Don't re-throw - this shouldn't stop the main processing
  }
}
```

### 7. Main Handler Error Handling

```typescript
export async function handler(): Promise<void> {
  log.info(`🟢 Starting retrieve-rss-feeds-and-download-audio-files > handler`);
  const lambdaStartTime = Date.now();

  // Send info alert when Lambda starts
  await alerting.sendInfo(
    'RSS retrieval Lambda started processing',
    undefined,
    {
      source: 'rss-retrieval-lambda',
      metadata: {
        startTime: new Date().toISOString(),
        siteId: getCurrentSiteId()
      }
    }
  );

  try {
    // Your existing Lambda logic here
    // ...
    
    // Send success alert
    const processingTime = Date.now() - lambdaStartTime;
    await alerting.sendInfo(
      'RSS retrieval Lambda completed successfully',
      undefined,
      {
        source: 'rss-retrieval-lambda',
        metadata: {
          processingTimeMs: processingTime,
          activeFeedsProcessed: activeFeeds.length,
          newlyDownloadedFiles: allNewlyDownloadedS3AudioKeys.length,
          siteId: getCurrentSiteId()
        }
      }
    );
    
  } catch (error) {
    log.error('❌ Fatal error in RSS feed processing handler:', error);
    
    // Send critical alert for fatal errors
    await alerting.sendCritical(
      'Fatal error in RSS retrieval Lambda',
      error as Error,
      {
        source: 'rss-retrieval-lambda',
        metadata: {
          processingTimeMs: Date.now() - lambdaStartTime,
          siteId: getCurrentSiteId()
        }
      }
    );
    
    // Re-throw to mark Lambda as failed
    throw error;
  }
}
```

### 8. Local Development Error Handling

```typescript
// For local development, call the handler directly
if (scriptUrl.startsWith('file://') && scriptUrl.endsWith(scriptPath)) {
  log.info('🚀 Starting podcast RSS feed retrieval & manifest update...');
  handler()
    .then(() => {
      log.info('✅ Processing completed successfully.');
      process.exit(0);
    })
    .catch(async (error) => {
      log.error('❌ Processing failed with an error:', error);
      
      // Send critical alert for local execution failures
      await alerting.sendCritical(
        'Local RSS retrieval execution failed',
        error as Error,
        {
          source: 'rss-retrieval-lambda',
          environment: 'local'
        }
      );
      
      process.exit(1);
    });
}
```

## Step 4: Environment Variables

Make sure to set up the required environment variables in your Lambda configuration:

```bash
# Slack Configuration
SLACK_BOT_TOKEN=xoxb-your-bot-token-here
SLACK_CHANNEL_ID=C1234567890
SLACK_WORKSPACE_DOMAIN=you-can-sit-with-us

# Optional AWS Configuration (for CloudWatch links)
AWS_ACCOUNT_ID=123456789012
```

## Benefits of This Integration

1. **Immediate Visibility**: Get notified instantly when RSS feeds fail to fetch
2. **Rich Context**: Each alert includes relevant metadata like URLs, episode titles, and error details
3. **CloudWatch Integration**: Direct links to CloudWatch logs for AWS errors
4. **Severity Levels**: Different alert types for different error scenarios
5. **@here Mentions**: Critical errors automatically mention the team
6. **Graceful Degradation**: Alerting failures don't break the main Lambda functionality

## Alert Types Used

- **Info**: Lambda start/completion, successful operations
- **Warning**: Feed parsing issues, non-critical problems
- **Error**: Download failures, S3 issues, Lambda invocation failures
- **Critical**: Manifest issues, fatal errors that stop processing

This integration ensures that your team is immediately aware of any issues with the RSS retrieval process, allowing for quick response and resolution.