# Ingestion Automation

This system automatically runs the ingestion pipeline once per day when you log into your Mac. It's designed to be lightweight, reliable, and work seamlessly with your normal usage patterns.

## Quick Start

```bash
# Run the setup (requires sudo for LaunchAgent management)
sudo pnpm run ingestion:automation:manage
```

## What It Does

### Automatic Daily Execution
- **Runs once per day maximum** - uses timestamp tracking to ensure pipeline doesn't run multiple times
- **Triggered on login** - executes when you log in (including unlocking from lock screen)
- **Fast exit** - if pipeline already ran successfully in last 24 hours, exits in milliseconds
- **Smart retry** - retries if last successful run was more than 24 hours ago

### Power-Aware Operation
- **AC Power**: Always runs the pipeline
- **Battery Power**: Only runs if battery > 50%
- **Low Battery**: Skips pipeline execution

### Lightweight Design
- **No scheduled wake**: Eliminates unreliable `pmset` scheduling
- **No power management**: No complex system configuration required
- **Login-based**: Works with normal Mac usage patterns
- **Quick checks**: Fast timestamp verification before any heavy operations

## System Requirements

- **macOS only** (uses LaunchAgent)
- **Sudo privileges** required for LaunchAgent setup (one-time)
- **Node.js and pnpm** for running the TypeScript scripts

## How It Works

### 1. Login Trigger
A LaunchAgent is configured to run every time you log in:
```xml
<key>RunAtLoad</key>
<true/>
```

### 2. Timestamp Check
On every execution, the script:
1. Checks `.last-pipeline-run` file for last successful run timestamp
2. If successful run within 24 hours, exits immediately (< 10ms)
3. If no recent success, proceeds with pipeline execution

### 3. Automatic Execution
When conditions are met:
- Checks power source and battery level
- Runs the ingestion pipeline if power conditions allow
- Records success/failure timestamps
- Tracks consecutive failures for future alerting

## Usage

### Initial Setup
```bash
sudo pnpm run ingestion:automation:manage
```

On first run, you'll see:
1. Current configuration status
2. Simple enable/disable option for automation
3. LaunchAgent setup

### Subsequent Runs
```bash
sudo pnpm run ingestion:automation:manage
```

Shows current status and options:
1. Keep current configuration (enabled/disabled)
2. Toggle automation on/off
3. Test pipeline manually
4. View recent pipeline run history
5. Show help information

### Manual Pipeline Test
Test the pipeline without affecting the automation tracking:
```bash
sudo pnpm run ingestion:automation:manage
# Choose the manual test option
```

## Configuration Details

### Files Created/Modified

#### Project Files
- `.automation-config` - Simple enabled/disabled state
- `.last-pipeline-run` - Timestamp tracking for rate limiting
- `~/Library/LaunchAgents/com.browse-dot-show.ingestion-automation.plist` - LaunchAgent

#### Log Files
- `scripts/automation-logs/automation.log` - Execution logs
- `scripts/automation-logs/automation-error.log` - Error logs
- `ingestion-pipeline-runs.md` - Pipeline execution history (git-ignored)

### Execution Logic

| Condition | Action |
|-----------|---------|
| Last success < 24 hours ago | ✅ Exit immediately (no pipeline run) |
| Last success ≥ 24 hours ago + AC Power | ✅ Run pipeline |
| Last success ≥ 24 hours ago + Battery > 50% | ✅ Run pipeline |
| Last success ≥ 24 hours ago + Battery ≤ 50% | ❌ Skip pipeline (record attempt) |

### Retry Behavior

| Scenario | Behavior |
|----------|----------|
| Pipeline succeeds | Reset failure counter, update success timestamp |
| Pipeline fails | Increment failure counter, update attempt timestamp |
| 4+ consecutive failures | TODO: Send Slack alert (future enhancement) |

## Troubleshooting

### Pipeline Doesn't Run

1. **Check if enabled:**
   ```bash
   cat .automation-config
   ```

2. **Check LaunchAgent status:**
   ```bash
   launchctl list | grep com.browse-dot-show.ingestion-automation
   ```

3. **Check last run status:**
   ```bash
   cat .last-pipeline-run
   ```

4. **View execution logs:**
   ```bash
   tail -f scripts/automation-logs/automation.log
   ```

### Pipeline Runs Too Often

This shouldn't happen due to timestamp checking, but if it does:
1. Check `.last-pipeline-run` file contents
2. Verify system clock is correct
3. Check for multiple LaunchAgent instances

### Manual Commands

```bash
# Check LaunchAgent status
launchctl list | grep com.browse-dot-show.ingestion-automation

# Check power source and battery
pmset -g ps

# View recent logs
tail -20 scripts/automation-logs/automation.log

# Test timestamp checking
node -e "console.log(new Date(JSON.parse(require('fs').readFileSync('.last-pipeline-run')).lastSuccessTimestamp))"
```

## Uninstalling

To completely remove ingestion automation:

```bash
# Run the management script
sudo pnpm run ingestion:automation:manage

# Choose the disable option
```

Or manually:

```bash
# Remove LaunchAgent
launchctl unload ~/Library/LaunchAgents/com.browse-dot-show.ingestion-automation.plist
rm ~/Library/LaunchAgents/com.browse-dot-show.ingestion-automation.plist

# Remove config files
rm .automation-config
rm .last-pipeline-run
```

## Technical Background

### Previous Approach: Scheduled Wake
We initially tried using macOS's `pmset` command to schedule automatic wake events and run the pipeline at specific times. However, this approach proved unreliable, especially when the MacBook lid was closed. The scheduled wake functionality didn't work consistently across different Mac configurations and sleep states.

### Current Approach: Login-Based Execution
The current system takes a much simpler and more reliable approach:
- Triggers on user login (including unlock from lock screen)
- Uses timestamp tracking to ensure once-per-day execution
- Eliminates dependency on scheduled wake functionality
- Works consistently regardless of lid position or sleep state

## Advantages

- **Reliable**: No dependency on `pmset` scheduled wake working with lid closed
- **Simple**: No complex power management configuration
- **Lightweight**: Fast exit when recently run
- **User-friendly**: Works with normal login patterns
- **Maintainable**: Much simpler codebase and troubleshooting

## Future Enhancements

- [ ] Slack notifications after consecutive failures
- [ ] Email notifications on completion/failure
- [ ] Web dashboard for monitoring runs across multiple machines
- [ ] Configurable retry intervals
- [ ] Integration with calendar systems for skip days

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review log files in `scripts/automation-logs/`
3. Run `sudo pnpm run ingestion:automation:manage` to check configuration
4. Check LaunchAgent status with `launchctl` 