# Mac Daily Pipeline Execution

This system automatically runs the ingestion pipeline once per day when you log into your Mac. It's designed to be lightweight, reliable, and work seamlessly with your normal usage patterns.

## Quick Start

```bash
# Run the setup (requires sudo for LaunchAgent management)
sudo pnpm run power:manage
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
sudo pnpm run power:manage
```

On first run, you'll see:
1. Current configuration status
2. Simple enable/disable option for daily pipeline
3. LaunchAgent setup

### Subsequent Runs
```bash
sudo pnpm run power:manage
```

Shows current status and options:
1. Keep current configuration (enabled/disabled)
2. Toggle pipeline execution on/off
3. Test pipeline manually
4. View recent pipeline run history
5. Show help information

### Manual Pipeline Test
Test the pipeline without affecting the daily execution tracking:
```bash
sudo pnpm run power:manage
# Choose the manual test option
```

### Pipeline Run History
Every pipeline execution is logged with:
- **Timestamp and duration** of each run
- **Success/failure status** and error details
- **Sites processed** and statistics
- **Power source** at time of execution

View recent runs through the management script menu.

## Configuration Details

### Files Created/Modified

#### Project Files
- `.power-management-config` - Simple enabled/disabled state
- `.last-pipeline-run` - Timestamp tracking for rate limiting
- `~/Library/LaunchAgents/com.browse-dot-show.daily-pipeline.plist` - LaunchAgent

#### Log Files
- `scripts/automation-logs/daily-pipeline.log` - Execution logs
- `scripts/automation-logs/daily-pipeline-error.log` - Error logs
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
   cat .power-management-config
   ```

2. **Check LaunchAgent status:**
   ```bash
   launchctl list | grep com.browse-dot-show.daily-pipeline
   ```

3. **Check last run status:**
   ```bash
   cat .last-pipeline-run
   ```

4. **View execution logs:**
   ```bash
   tail -f scripts/automation-logs/daily-pipeline.log
   ```

### Pipeline Runs Too Often

This shouldn't happen due to timestamp checking, but if it does:
1. Check `.last-pipeline-run` file contents
2. Verify system clock is correct
3. Check for multiple LaunchAgent instances

### Manual Commands

```bash
# Check LaunchAgent status
launchctl list | grep com.browse-dot-show.daily-pipeline

# Check power source and battery
pmset -g ps

# View recent logs
tail -20 scripts/automation-logs/daily-pipeline.log

# Test timestamp checking
node -e "console.log(new Date(JSON.parse(require('fs').readFileSync('.last-pipeline-run')).lastSuccessTimestamp))"
```

## Uninstalling

To completely remove daily pipeline execution:

```bash
# Run the management script
sudo pnpm run power:manage

# Choose the disable option
```

Or manually:

```bash
# Remove LaunchAgent
launchctl unload ~/Library/LaunchAgents/com.browse-dot-show.daily-pipeline.plist
rm ~/Library/LaunchAgents/com.browse-dot-show.daily-pipeline.plist

# Remove config files
rm .power-management-config
rm .last-pipeline-run
```

## Security Considerations

- **Sudo required**: LaunchAgent setup requires root privileges (one-time)
- **Local execution**: All scripts run locally, no network dependencies during setup
- **Log files**: May contain system information, stored in project directory
- **LaunchAgent**: Runs with user privileges, not root

## Limitations

- **macOS only**: Uses macOS-specific LaunchAgent
- **Login dependency**: Only runs when you log in (not when machine boots without login)
- **Single pipeline**: Designed for one ingestion pipeline per machine
- **User session**: Requires user login to trigger execution

## Advantages Over Scheduled Wake

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
3. Run `sudo pnpm run power:manage` to check configuration
4. Check LaunchAgent status with `launchctl`