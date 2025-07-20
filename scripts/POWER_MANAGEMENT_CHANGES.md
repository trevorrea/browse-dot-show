# Power Management Script Changes

## Overview
This document summarizes the changes made to `scripts/power-management.ts` to implement a simplified login-based pipeline execution approach, replacing the complex scheduled wake system.

## New Approach: Login-Based Execution

### Problem with Previous Approach
- **Scheduled wake unreliable**: `pmset` scheduled wake doesn't work reliably with lid closed
- **Complex power management**: Required extensive `pmset` configuration and troubleshooting
- **Over-engineered**: Too many moving parts for a simple daily pipeline execution

### New Solution: Run on Login
- **Trigger**: LaunchAgent runs every time user logs in (including from lock screen)
- **Rate limiting**: Lightweight timestamp check - exit immediately if pipeline ran successfully in last 24 hours
- **Retry logic**: Retry if last *success* was > 24 hours ago (not just last attempt)
- **Failure tracking**: Track consecutive failures for future alerting (TODO: Slack after 4 failures)

## Implementation Details

### 1. Timestamp-Based Rate Limiting
- **File**: `.last-pipeline-run` in project root
- **Content**: JSON with `lastSuccessTimestamp`, `lastAttemptTimestamp`, `consecutiveFailures`
- **Check**: On every login, compare `lastSuccessTimestamp` to current time
- **Exit**: If successful run within 24 hours, exit immediately (< 10ms)

### 2. LaunchAgent Configuration
- **Trigger**: `RunAtLoad=true` (runs on every login)
- **No scheduling**: Removed all time-based scheduling
- **Lightweight**: Fast exit path when recently run

### 3. Retry Logic
- **Success criteria**: Pipeline completes without errors
- **Retry condition**: Last success > 24 hours ago
- **Failure tracking**: Increment counter on failure, reset on success
- **Future**: Alert to Slack after 4 consecutive failures

### 4. Removed Functionality
- **All `pmset` commands**: No more power management configuration
- **Scheduled wake**: No more wake scheduling
- **Time/day configuration**: No more complex scheduling UI
- **Power state management**: No more sleep/shutdown logic

### 5. Simplified Configuration
- **Enable/disable**: Simple on/off for daily pipeline
- **No scheduling**: No time or day selection needed
- **Automatic**: Runs when conditions are met (login + 24h elapsed)

## Technical Implementation

### New File Structure
```typescript
interface PipelineRunStatus {
  lastSuccessTimestamp?: number;
  lastAttemptTimestamp?: number;
  consecutiveFailures: number;
}
```

### New Methods
- `checkLastRun()`: Fast check if pipeline ran successfully in last 24 hours
- `recordSuccess()`: Update timestamps and reset failure counter
- `recordFailure()`: Update timestamps and increment failure counter
- `shouldRunPipeline()`: Determine if pipeline should run based on timestamps

### Updated LaunchAgent
```xml
<key>RunAtLoad</key>
<true/>
<!-- Removed time-based scheduling -->
```

### Removed Methods
- All `pmset` related methods
- Schedule configuration methods
- Power state management methods
- Wake time calculation methods

## User Experience Changes

### Before (Complex)
1. Interactive setup with time/day selection
2. Power management configuration
3. Scheduled wake setup
4. Complex troubleshooting when wake fails

### After (Simple)
1. Enable/disable daily pipeline
2. Automatic execution on login
3. No configuration needed
4. Reliable operation

## Files Modified
- `scripts/power-management.ts`: Complete rewrite for login-based approach
- `scripts/POWER_MANAGEMENT_CHANGES.md`: Updated to reflect new approach
- `POWER_MANAGEMENT.md`: Updated documentation for new approach

## Dependencies
- `prompts`: Still used for simple enable/disable configuration
- Removed: All `pmset` dependencies

## Backward Compatibility
- **Breaking change**: Completely new approach
- **Migration**: Existing `pmset` schedules should be cleared manually if desired
- **Config files**: Old config files will be ignored

## Usage
```bash
# Simple setup - just enable/disable
sudo pnpm run power:manage

# Pipeline runs automatically on login if:
# - Enabled in configuration
# - Last successful run > 24 hours ago
# - Power conditions met (AC power or battery > 50%)
```

## Benefits
- **Reliable**: No dependency on scheduled wake
- **Simple**: Minimal configuration required
- **Fast**: Quick exit when recently run
- **Maintainable**: Much less complex code
- **User-friendly**: Works with normal login patterns