# CORS Error Analysis & Proposed Fixes

## Problem Summary

The hardfork.browse.show site is experiencing CORS-related errors when trying to access the search API. The CloudWatch logs show:

1. **CORS Preflight Issue**: `Response to preflight request doesn't pass access control check: It does not have HTTP ok status`
2. **S3 Access Issue**: Lambda receives 403 error when accessing `s3://hardfork-browse-dot-show/search-index/orama_index.msp`
3. **Network Error**: `POST https://ug6fh4ldw6.execute-api.us-east-1.amazonaws.com/prod/ net::ERR_FAILED`

## Analysis Findings

### ✅ What's Working Correctly:
1. **File Location**: Search index exists at correct S3 path: `s3://hardfork-browse-dot-show/search-index/orama_index.msp` (101MB file)
2. **Lambda Environment**: Correct environment variables:
   - `SITE_ID`: "hardfork"
   - `S3_BUCKET_NAME`: "hardfork-browse-dot-show"
   - `LOG_LEVEL`: "info"
3. **IAM Permissions**: Lambda has proper S3 permissions for the bucket
4. **Infrastructure**: All AWS resources properly created and named

### ❓ Root Cause Analysis:

The issue appears to be a **Lambda execution failure during CORS preflight**, not a pure CORS configuration issue. The sequence is:

1. Browser sends OPTIONS request (CORS preflight)
2. API Gateway routes to Lambda
3. Lambda starts processing and tries to initialize Orama index
4. **Lambda fails with 403 S3 error** during initialization
5. Lambda returns error response (not proper CORS response)
6. Browser rejects the preflight response

### 🔍 Key Differences from Working listenfairplay.com:

**CRITICAL FINDING**: Listenfairplay uses the OLD pre-multi-site architecture!

**Listenfairplay (working):**
- Lambda name: `search-indexed-transcripts` (no site suffix)
- Environment: Only `S3_BUCKET_NAME: "listen-fair-play-s3-dev"` and `LOG_LEVEL` 
- **Missing**: `SITE_ID`, `FILE_STORAGE_ENV` 
- Bucket: `listen-fair-play-s3-dev` (old naming pattern)
- API: `search-transcripts-api-dev`
- CORS: `["https://drvuopx7zxbrt.cloudfront.net", "https://listenfairplay.com"]`

**Hardfork (failing):**
- Lambda name: `search-indexed-transcripts-hardfork` (site-specific)
- Environment: `S3_BUCKET_NAME`, `LOG_LEVEL`, `SITE_ID: "hardfork"`
- **Missing**: `FILE_STORAGE_ENV` 
- Bucket: `hardfork-browse-dot-show` (new site-specific pattern)
- API: `search-transcripts-api-hardfork` 
- CORS: Should include `https://hardfork.browse.show`

**Root cause**: New site-aware code is missing `FILE_STORAGE_ENV=prod-s3`, causing incorrect S3 path resolution!

## Proposed Solutions

### Solution 1: Add Missing FILE_STORAGE_ENV (MOST LIKELY)

**Problem**: Hardfork Lambda is missing `FILE_STORAGE_ENV=prod-s3`, causing the new site-aware S3 path resolution to default to local mode and use incorrect paths.

**Fix**: Add missing environment variable to Lambda:

```terraform
# In terraform/main.tf, search lambda environment_variables:
environment_variables = {
  S3_BUCKET_NAME     = module.s3_bucket.bucket_name
  LOG_LEVEL          = var.log_level
  SITE_ID            = var.site_id
  FILE_STORAGE_ENV   = "prod-s3"  # CRITICAL: Add this line
}
```

### Solution 2: Fix Lambda OPTIONS Handling (Secondary)

**Problem**: Lambda is trying to initialize Orama index even for OPTIONS requests, causing unnecessary S3 calls and potential failures.

**Fix**: Update search Lambda to return immediately for OPTIONS requests without S3 initialization:

```typescript
// In search-indexed-transcripts.ts
export async function handler(event: any): Promise<SearchResponse> {
  // Handle CORS preflight FIRST, before any S3 operations
  if (event.requestContext?.http?.method === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': 'https://hardfork.browse.show',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '300'
      },
      body: ''
    };
  }
  
  // Continue with normal processing for non-OPTIONS requests...
}
```

### Solution 3: API Gateway CORS Headers (Unlikely but verify)

**Problem**: API Gateway may not be returning proper CORS headers.

**Fix**: Verify Terraform CORS configuration includes hardfork domain:

```terraform
cors_configuration {
  allow_origins = concat(
    ["https://${module.cloudfront.cloudfront_domain_name}"],
    (var.enable_custom_domain_on_cloudfront && var.custom_domain_name != "") ? ["https://${var.custom_domain_name}"] : []
  )
  # Should include: https://hardfork.browse.show
}
```

## Implementation Plan

### Phase 1: Immediate Fix (MOST LIKELY)
1. Add `FILE_STORAGE_ENV=prod-s3` to search Lambda environment variables in terraform
2. Redeploy Lambda infrastructure
3. Test S3 path resolution works correctly

### Phase 2: OPTIONS Handling (If Phase 1 insufficient)
1. Update `packages/search/search-lambda/search-indexed-transcripts.ts`
2. Move OPTIONS handling to very beginning of handler
3. Return proper CORS headers without S3 initialization
4. Redeploy search Lambda

### Phase 3: API Gateway Verification (If needed)
1. Compare working listenfairplay API Gateway configuration
2. Verify CORS origins include hardfork.browse.show
3. Update if necessary

## Testing Strategy

1. **Pre-deployment**: Test OPTIONS handling in local search lambda
2. **Post-deployment**: Verify CORS preflight succeeds in browser
3. **Full test**: Confirm search functionality works end-to-end
4. **Comparison**: Ensure matches working listenfairplay.com behavior

## Expected Resolution

After implementing Solution 1, the sequence should be:
1. Browser sends OPTIONS request 
2. API Gateway routes to Lambda
3. **Lambda immediately returns CORS headers** (no S3 calls)
4. Browser accepts preflight response
5. Browser sends actual POST request
6. Lambda processes search normally

This should resolve both the CORS preflight issue and prevent unnecessary S3 calls during OPTIONS requests.