# Listen Fair Play

A podcast archiving and searching application:
1. Retrieves podcast RSS feeds
2. Downloads audio files
3. Transcribes audio using OpenAI's Whisper API
4. Provides a search interface for transcripts

## Project Structure

- `/client`: React web application for searching transcripts
- `/processing`: AWS Lambda functions for podcast processing
  - `retrieve-rss-feeds-and-download-audio-files.ts`: Retrieves RSS feeds and downloads audio
  - `process-new-audio-files-via-whisper.ts`: Transcribes audio files via Whisper API
- `/diagrams`: Architecture diagrams

## AWS Architecture

See [`diagrams/README.md`](./diagrams/README.md)

## Local Development

- For developing the React web appplication, see [`client/README.md`](/client/README.md)
- For developing Lambda functions, see [`processing/README.md`](/processing/README.md)

## Deployment

*Coming soon: build & deploy steps run locally*