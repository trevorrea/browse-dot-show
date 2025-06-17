#!/bin/bash

# Bootstrap script to create Terraform state S3 bucket for a site
# This must be run before the main terraform deployment

set -e

if [ -z "$1" ]; then
    echo "Usage: $0 <site_id> [aws_profile]"
    echo "Example: $0 hardfork Administrator-browse.show-base-089994311986"
    exit 1
fi

SITE_ID="$1"
AWS_PROFILE="${2:-}"
AWS_REGION="${AWS_REGION:-us-east-1}"
BUCKET_NAME="${SITE_ID}-terraform-state"

echo "🚀 Bootstrapping Terraform state bucket for site: $SITE_ID"
echo "Bucket name: $BUCKET_NAME"
echo "AWS Region: $AWS_REGION"

# Set AWS profile flag if provided
AWS_PROFILE_FLAG=""
if [ -n "$AWS_PROFILE" ]; then
    echo "AWS Profile: $AWS_PROFILE"
    AWS_PROFILE_FLAG="--profile $AWS_PROFILE"
fi

# Check if bucket already exists
echo "Checking if bucket $BUCKET_NAME already exists..."
if aws s3api head-bucket --bucket "$BUCKET_NAME" $AWS_PROFILE_FLAG 2>/dev/null; then
    echo "✅ Bucket $BUCKET_NAME already exists"
else
    echo "Creating S3 bucket: $BUCKET_NAME"
    
    # Create bucket (handle us-east-1 special case)
    if [ "$AWS_REGION" = "us-east-1" ]; then
        aws s3api create-bucket --bucket "$BUCKET_NAME" $AWS_PROFILE_FLAG
    else
        aws s3api create-bucket --bucket "$BUCKET_NAME" --region "$AWS_REGION" --create-bucket-configuration LocationConstraint="$AWS_REGION" $AWS_PROFILE_FLAG
    fi
    
    # Enable versioning
    aws s3api put-bucket-versioning --bucket "$BUCKET_NAME" --versioning-configuration Status=Enabled $AWS_PROFILE_FLAG
    
    # Enable encryption
    aws s3api put-bucket-encryption --bucket "$BUCKET_NAME" --server-side-encryption-configuration '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}' $AWS_PROFILE_FLAG
    
    # Block public access
    aws s3api put-public-access-block --bucket "$BUCKET_NAME" --public-access-block-configuration '{"BlockPublicAcls":true,"IgnorePublicAcls":true,"BlockPublicPolicy":true,"RestrictPublicBuckets":true}' $AWS_PROFILE_FLAG
    
    echo "✅ Successfully created and configured bucket: $BUCKET_NAME"
fi

echo "🎉 Terraform state bucket bootstrap complete!"
echo "You can now run terraform init with the backend configuration." 