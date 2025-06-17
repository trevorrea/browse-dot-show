# S3 File Structure Issue Analysis

## Problem Statement

The search Lambda is receiving a 403 error when trying to access the Orama search index file from S3. The root cause is a **path mismatch** between where the file exists and where the Lambda is looking for it.

### Current State
- **File exists at**: `s3://hardfork-browse-dot-show/search-index/orama_index.msp`
- **Lambda looking for**: `s3://hardfork-browse-dot-show/sites/hardfork/search-index/orama_index.msp`

## Architecture Understanding

### Site-Specific Bucket Strategy
From analyzing the Terraform configuration:
- Each site gets its own S3 bucket: `{site_id}-{base_bucket_name}` (e.g., `hardfork-browse-dot-show`)
- Bucket isolation provides complete data separation between sites
- AWS resources are tagged per site for organization and billing

### Local vs AWS File Structure Requirements

#### Local Development (`FILE_STORAGE_ENV === 'local'`)
**Needs site disambiguation** because multiple sites share the same filesystem:
```
aws-local-dev/s3/sites/
├── hardfork/
│   ├── search-index/orama_index.msp
│   ├── audio/
│   └── transcripts/
├── listenfairplay/
│   ├── search-index/orama_index.msp
│   └── ...
└── naddpod/
    └── ...
```

#### AWS S3 (`FILE_STORAGE_ENV !== 'local'`)
**No site disambiguation needed** because bucket itself is site-specific:
```
s3://hardfork-browse-dot-show/
├── search-index/orama_index.msp
├── audio/
├── transcripts/
└── episode-manifest/

s3://listenfairplay-browse-dot-show/
├── search-index/orama_index.msp
└── ...
```

## Current Implementation Issues

### 1. Constants Package (`packages/constants/index.ts`)
```typescript
export function getSearchIndexKey(): string {
  const siteId = getSiteId();
  return `sites/${siteId}/search-index/orama_index.msp`;  // ❌ Always includes sites/ prefix
}
```

### 2. S3 Client (`packages/s3/index.ts`)
```typescript
function getLocalFilePath(key: string): string {
  const siteId = process.env.CURRENT_SITE_ID;
  
  if (siteId && !key.startsWith('sites/')) {
    // Site-specific local path: aws-local-dev/s3/sites/{siteId}/{key}
    // Only add the site prefix if the key doesn't already include it
    const result = path.join(LOCAL_S3_PATH, 'sites', siteId, key);
    return result;
  }
  
  // Legacy path for backwards compatibility, or if key already includes site prefix
  const result = path.join(LOCAL_S3_PATH, key);
  return result;
}
```
**Problem**: The `getLocalFilePath` logic correctly handles local paths but the keys from constants already include the `sites/` prefix, causing double-prefixing locally and wrong paths in AWS.

### 3. Bucket Naming Logic
```typescript
function getBucketName(): string {
  const siteId = process.env.CURRENT_SITE_ID;
  
  if (siteId && FILE_STORAGE_ENV === 'prod-s3') {
    return `browse-dot-show-${siteId}-s3-prod`;  // ❌ Wrong pattern
  }
  // ...
}
```
**Problem**: The bucket naming pattern doesn't match the Terraform-created buckets (`{site_id}-browse-dot-show`).

## Required Solution

### 1. Environment-Aware Key Generation
Constants should generate different keys based on storage environment:
```typescript
export function getSearchIndexKey(): string {
  const isLocalEnvironment = process.env.FILE_STORAGE_ENV === 'local';
  
  if (isLocalEnvironment) {
    const siteId = getSiteId();
    return `sites/${siteId}/search-index/orama_index.msp`;
  } else {
    // In AWS, bucket is already site-specific
    return `search-index/orama_index.msp`;
  }
}
```

### 2. Correct Bucket Naming
Update `getBucketName()` to match Terraform bucket naming pattern:
```typescript
function getBucketName(): string {
  const siteId = process.env.CURRENT_SITE_ID || process.env.SITE_ID;
  
  if (siteId && FILE_STORAGE_ENV !== 'local') {
    return `${siteId}-browse-dot-show`;  // Matches Terraform pattern
  }
  
  // Legacy buckets for non-site-aware operations
  return FILE_STORAGE_ENV === 'prod-s3' ? PROD_BUCKET_NAME : DEV_BUCKET_NAME;
}
```

### 3. Simplified Local Path Logic
With environment-aware keys, local path logic becomes simpler:
```typescript
function getLocalFilePath(key: string): string {
  return path.join(LOCAL_S3_PATH, key);  // Key already includes sites/ prefix when needed
}
```

## Impact Analysis

### Files Requiring Updates
1. `packages/constants/index.ts` - All key generation functions
2. `packages/s3/index.ts` - Bucket naming and path resolution
3. All Lambda functions - Ensure proper environment variable setting

### Affected Functionality
- ✅ **RSS Retrieval**: Already working (uses correct bucket naming)
- ✅ **Audio Processing**: Already working 
- ✅ **SRT Indexing**: Creates files in correct S3 location
- ❌ **Search Lambda**: Fails due to path mismatch (current issue)
- ❌ **Local Development**: May have path inconsistencies

### Environment Variable Dependencies
Critical environment variables for proper operation:
- `FILE_STORAGE_ENV`: Determines storage backend (`local`, `dev-s3`, `prod-s3`)
- `CURRENT_SITE_ID` or `SITE_ID`: Site identifier for path/bucket resolution
- `S3_BUCKET_NAME`: For Lambda environment (should match bucket created by Terraform)

## Testing Strategy

### Local Development Tests
- File operations with `FILE_STORAGE_ENV=local`
- Multi-site isolation verification
- Path resolution correctness

### AWS Environment Tests  
- File operations with `FILE_STORAGE_ENV=prod-s3`
- Bucket name resolution
- Cross-Lambda file sharing (e.g., indexing → search)

### Edge Cases
- Missing environment variables
- Legacy bucket operations
- Site ID validation
- File path normalization

## Implementation Plan

1. **Phase 1**: Create comprehensive tests for current behavior
2. **Phase 2**: Refactor S3 client with environment-aware logic
3. **Phase 3**: Update constants package for dual-mode operation
4. **Phase 4**: Verify all Lambda functions have correct env vars
5. **Phase 5**: End-to-end testing in both local and AWS environments

---

## 🚀 **CURRENT STATUS & PROGRESS REPORT**

### ✅ **COMPLETED: Tasks 1 & 2 (Dec 17, 2024)**

#### Task 1: Analysis & Documentation ✅
- **Comprehensive analysis** documented above with root cause identification
- **Architecture understanding** clarified: local needs site prefixing, AWS doesn't
- **Testing strategy** defined for both environments

#### Task 2: S3 Module Restructuring & Test Foundation ✅
- **Code restructured**: `packages/s3/index.ts` → `packages/s3/client.ts` + exports
- **Test suite created**: `packages/s3/client.spec.ts` with 20 comprehensive tests
- **Local development fixed**: All environment variable handling issues resolved
- **Test results**: ✅ All 20 tests passing

### 🔍 **KEY FINDINGS FROM TEST IMPLEMENTATION**

#### Issues Discovered & Fixed for Local Development:
1. **Environment Variable Timing**: `FILE_STORAGE_ENV` was a static constant, preventing test environment changes
   - **Solution**: Changed to dynamic `getFileStorageEnv()` function
2. **S3 Client Initialization**: Was trying to initialize AWS credentials even in local mode
   - **Solution**: Lazy initialization with environment-aware credential handling
3. **Bucket Name Logic**: Was returning AWS bucket names even in local mode
   - **Solution**: Return empty string for local environment (no bucket needed)

#### Test Coverage Achieved:
- ✅ **Local environment**: Fully working with proper site prefixing
- ✅ **Environment detection**: Dynamic switching between local/AWS modes
- ✅ **File operations**: Save, retrieve, delete, list, create directories
- ✅ **Edge cases**: Missing env vars, empty keys, special characters
- ❌ **AWS environment bugs**: Intentionally demonstrating issues to fix

### 📋 **READY FOR TASK 3: AWS Environment Fixes**

#### Specific Issues to Fix (Confirmed by Tests):
1. **Bucket Naming Pattern Mismatch**:
   - Current: `browse-dot-show-hardfork-s3-prod`
   - Required: `hardfork-browse-dot-show` (to match Terraform)

2. **Constants Package Path Generation**:
   - Currently: Always returns `sites/{siteId}/search-index/orama_index.msp`
   - Required: Environment-aware paths (with/without `sites/` prefix)

3. **SITE_ID vs CURRENT_SITE_ID**:
   - Lambda environment uses `SITE_ID` (from Terraform)
   - Local development uses `CURRENT_SITE_ID`
   - Need consistent handling of both

#### Files to Modify in Task 3:
1. **`packages/s3/client.ts`**:
   - Fix `getBucketName()` for correct Terraform pattern
   - Handle both `SITE_ID` and `CURRENT_SITE_ID` environment variables

2. **`packages/constants/index.ts`**:
   - Make all key generation functions environment-aware
   - Return different paths for local vs AWS environments

3. **Update tests** to verify fixes work correctly

### 🎯 **IMMEDIATE NEXT STEPS FOR TASK 3**

1. Update `getBucketName()` in `packages/s3/client.ts` to use correct pattern
2. Update all key generation functions in `packages/constants/index.ts`
3. Handle dual environment variable naming (`SITE_ID` vs `CURRENT_SITE_ID`)
4. Update failing test expectations to verify fixes
5. Test end-to-end with actual Lambda environment variables

### 🔗 **VERIFICATION PLAN**

After Task 3 implementation:
1. **Unit tests**: All S3 client tests should pass
2. **Constants tests**: Key generation should work for both environments  
3. **Integration test**: Deploy search Lambda and verify 403 error is resolved
4. **Local development**: Ensure no regressions in local workflows

---

**QUESTION FOR USER**: Are you ready to proceed with Task 3 to implement the AWS environment fixes described above?