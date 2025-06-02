# Listen Fair Play

A podcast archiving and searching application:
1. Retrieves podcast RSS feeds
2. Downloads audio files
3. Transcribes audio using OpenAI's Whisper API
4. Provides a search interface for transcripts

## AWS Architecture

See [`diagrams/README.md`](./diagrams/README.md)

## Local Development

- For developing the React web appplication, see [`packages/client/README.md`](/packages/client/README.md)
- For developing Lambda functions, see [`packages/ingestion/README.md`](/packages/ingestion/README.md) & [packages/search/README.md](/packages/search/README.md)

## Deployment

This project uses Terraform for deploying infrastructure to AWS. The deployment process is managed locally through shell scripts.

### Prerequisites

To deploy this application, you'll need:

1. [Terraform](https://developer.hashicorp.com/terraform/install) (>= 1.0.0)
2. [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)
3. Node.js 20 or later
4. pnpm 10 or later

For detailed installation and configuration instructions, see [scripts/deploy/README.md](./scripts/deploy/README.md).

### AWS Authentication

Log into an AWS Account / Role, with sufficient permissions to create both infrastructure resources & IAM Roles/Policies, in the AWS CLI via SSO. For @jackkoppa, the Role name used is kept at https://github.com/jackkoppa/listen-fair-play-private - you can use your own Account / Role to host the app, so long as it has sufficient permissions.

### Configuration

1. Create a `.env.local` file in the project root:
   ```bash
   cp .env.local.example .env.local
   ```

2. Add your AWS profile and OpenAI API key to `.env.local`

### Deployment Commands

```bash
# Log in with AWS SSO first
aws sso login --profile YourProfileName

# Deploy to development environment
./scripts/deploy/deploy.sh dev

# Destroy an environment (use with caution!)
./scripts/deploy/destroy.sh dev
```

## Testing/Triggering AWS functionality

**non-exhaustive**

```bash
# Manually trigger the first of the Lambda functions
./scripts/trigger-retrieve-rss-lambda.sh
```

## More Resources

For more detailed deployment instructions, troubleshooting, and configuration options, see [scripts/deploy/README.md](./scripts/deploy/README.md).