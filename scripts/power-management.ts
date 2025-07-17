#!/usr/bin/env tsx

import { execSync, spawn } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

interface PowerStatus {
  isOnAC: boolean;
  batteryLevel: number;
  isPoweredOff: boolean;
}

interface ScheduleConfig {
  wakeTime: string; // "01:00:00" format
  owner: string;
}

class MacPowerManager {
  private readonly CONFIG: ScheduleConfig = {
    wakeTime: "01:00:00", // 1:00 AM local time - TODO: make configurable in future
    owner: "browse-dot-show-ingestion"
  };

  private readonly MIN_BATTERY_LEVEL = 50; // Don't run script if battery < 50%

  constructor() {
    this.ensureRunningOnMac();
    this.ensureRootPrivileges();
  }

  /**
   * Main entry point for the power management script
   */
  async run(): Promise<void> {
    try {
      const args = process.argv.slice(2);
      
      if (args.includes('--help') || args.includes('-h')) {
        this.showHelp();
        return;
      }

      if (args.includes('--setup-schedule')) {
        await this.setupSchedule();
        return;
      }

      if (args.includes('--clear-schedule')) {
        await this.clearSchedule();
        return;
      }

      if (args.includes('--status')) {
        await this.showStatus();
        return;
      }

      if (args.includes('--wake-and-run')) {
        await this.wakeAndRunPipeline();
        return;
      }

      // Default behavior: setup schedule and show status
      await this.setupSchedule();
      await this.showStatus();
      
    } catch (error) {
      console.error('Power management error:', error);
      process.exit(1);
    }
  }

  /**
   * Sets up the daily 1 AM wake schedule
   */
  private async setupSchedule(): Promise<void> {
    console.log('Setting up power management schedule...\n');

    try {
      // Clear any existing repeating schedules first
      this.executeCommand('pmset repeat cancel', false);

      // Configure power settings to ensure proper wake behavior with lid closed
      console.log('Configuring power settings for reliable wake behavior...');
      
      // Enable wake when lid is opened (works even when closed due to schedule)
      this.executeCommand('pmset -a lidwake 1');
      
      // Disable AC wake to prevent unwanted wakes when plugging/unplugging
      this.executeCommand('pmset -a acwake 0');
      
      // Enable wake on ethernet magic packet (useful for remote management)
      this.executeCommand('pmset -c womp 1');
      
      // Keep system awake during TTY sessions (important for SSH management)
      this.executeCommand('pmset -a ttyskeepawake 1');

      console.log('Power settings configured successfully.\n');

      // Set up daily wake at 1 AM to run the ingestion pipeline
      const scheduleCommand = `pmset repeat wakeorpoweron MTWRFSU ${this.CONFIG.wakeTime}`;
      console.log(`Setting up daily wake schedule: ${this.CONFIG.wakeTime} every day`);
      this.executeCommand(scheduleCommand);

      console.log('✅ Power management schedule configured successfully!');
      console.log(`   • Mac will wake at ${this.CONFIG.wakeTime} daily (1:00 AM local time)`);
      console.log('   • Works with lid open or closed');
      console.log('   • Ingestion pipeline will run automatically after wake');
      console.log('   • System will return to sleep/off after completion\n');

    } catch (error) {
      throw new Error(`Failed to setup schedule: ${error}`);
    }
  }

  /**
   * Main logic for when the system wakes up at scheduled time
   */
  private async wakeAndRunPipeline(): Promise<void> {
    console.log('Mac woke up at scheduled time, checking conditions...\n');

    const powerStatus = this.getPowerStatus();
    
    console.log('Power Status:');
    console.log(`  • AC Power: ${powerStatus.isOnAC ? 'Connected' : 'Not connected'}`);
    console.log(`  • Battery Level: ${powerStatus.batteryLevel}%`);
    console.log(`  • Previously powered off: ${powerStatus.isPoweredOff ? 'Yes' : 'No (was sleeping)'}\n`);

    // Check battery level if running on battery
    if (!powerStatus.isOnAC && powerStatus.batteryLevel < this.MIN_BATTERY_LEVEL) {
      console.log(`⚠️  Battery level (${powerStatus.batteryLevel}%) is below minimum (${this.MIN_BATTERY_LEVEL}%)`);
      console.log('Returning to sleep/off without running ingestion pipeline...\n');
      await this.returnToPreviousState(powerStatus.isPoweredOff);
      return;
    }

    console.log('✅ Conditions met, running ingestion pipeline...\n');
    
    try {
      // Run the ingestion pipeline
      await this.runIngestionPipeline();
      
      console.log('\n✅ Ingestion pipeline completed successfully!');
      
    } catch (error) {
      console.error('❌ Ingestion pipeline failed:', error);
    }

    // Return to previous power state
    console.log('\nReturning to previous power state...');
    await this.returnToPreviousState(powerStatus.isPoweredOff);
  }

  /**
   * Gets current power and battery status
   */
  private getPowerStatus(): PowerStatus {
    try {
      const powerOutput = this.executeCommand('pmset -g ps', false);
      
      // Check if on AC power
      const isOnAC = powerOutput.includes("'AC Power'") || powerOutput.includes("AC attached");
      
      // Extract battery percentage
      const batteryMatch = powerOutput.match(/(\d+)%/);
      const batteryLevel = batteryMatch ? parseInt(batteryMatch[1], 10) : 100;

      // Determine if system was previously powered off vs sleeping
      // This is a heuristic - if we just booted recently, likely was powered off
      const uptimeOutput = this.executeCommand('uptime', false);
      const uptimeMatch = uptimeOutput.match(/up\s+(\d+):(\d+)/);
      const minutesUp = uptimeMatch ? parseInt(uptimeMatch[1]) * 60 + parseInt(uptimeMatch[2]) : 0;
      const isPoweredOff = minutesUp < 10; // Less than 10 minutes uptime suggests recent boot

      return {
        isOnAC,
        batteryLevel,
        isPoweredOff
      };
    } catch (error) {
      console.warn('Could not determine power status, assuming safe defaults');
      return {
        isOnAC: true,
        batteryLevel: 100,
        isPoweredOff: false
      };
    }
  }

  /**
   * Runs the ingestion pipeline
   */
  private async runIngestionPipeline(): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log('Starting ingestion pipeline...');
      
      // Use the existing npm script from package.json
      const child = spawn('pnpm', ['run', 'ingestion:run-pipeline:triggered-by-schedule'], {
        stdio: 'inherit',
        cwd: process.cwd(),
        env: {
          ...process.env,
          NODE_OPTIONS: '--max-old-space-size=8192'
        }
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Ingestion pipeline exited with code ${code}`));
        }
      });

      child.on('error', (error) => {
        reject(new Error(`Failed to start ingestion pipeline: ${error.message}`));
      });
    });
  }

  /**
   * Returns the system to its previous power state
   */
  private async returnToPreviousState(wasPoweredOff: boolean): Promise<void> {
    const powerStatus = this.getPowerStatus();
    
    if (powerStatus.isOnAC) {
      if (wasPoweredOff) {
        console.log('System was previously powered off and is on AC power - shutting down...');
        this.executeCommand('shutdown -h now');
      } else {
        console.log('System was previously sleeping and is on AC power - going to sleep...');
        this.executeCommand('pmset sleepnow');
      }
    } else {
      // On battery power
      if (wasPoweredOff) {
        console.log('System was previously powered off and is on battery - shutting down...');
        this.executeCommand('shutdown -h now');
      } else {
        console.log('System was previously sleeping and is on battery - going to sleep...');
        this.executeCommand('pmset sleepnow');
      }
    }
  }

  /**
   * Clears all scheduled power events
   */
  private async clearSchedule(): Promise<void> {
    console.log('Clearing power management schedule...');
    
    try {
      this.executeCommand('pmset repeat cancel');
      console.log('✅ Schedule cleared successfully!');
    } catch (error) {
      throw new Error(`Failed to clear schedule: ${error}`);
    }
  }

  /**
   * Shows current power management status
   */
  private async showStatus(): Promise<void> {
    console.log('=== Power Management Status ===\n');
    
    try {
      console.log('Current Power Settings:');
      const settings = this.executeCommand('pmset -g', false);
      console.log(settings);
      
      console.log('\nScheduled Events:');
      const schedule = this.executeCommand('pmset -g sched', false);
      console.log(schedule);
      
      console.log('\nCurrent Power Source:');
      const powerSource = this.executeCommand('pmset -g ps', false);
      console.log(powerSource);
      
    } catch (error) {
      console.error('Failed to get status:', error);
    }
  }

  /**
   * Shows help information
   */
  private showHelp(): void {
    console.log(`
Mac Power Management for Ingestion Pipeline

DESCRIPTION:
  This script configures your Mac to automatically wake up at 1:00 AM daily,
  run the ingestion pipeline, and return to sleep/off state. Works with laptop
  lid open or closed.

USAGE:
  pnpm run power:setup           # Setup the daily schedule (default)
  pnpm run power:status          # Show current power management status
  pnpm run power:clear           # Clear all scheduled power events
  pnpm run power:wake-and-run    # Manual trigger of wake-and-run logic

BEHAVIOR:
  • Wakes at 1:00 AM daily (local time)
  • If on AC power: always runs pipeline, then returns to previous state
  • If on battery: only runs if battery > 50%, otherwise returns to sleep/off
  • If previously powered off: shuts down after completion
  • If previously sleeping: goes back to sleep after completion
  • Works reliably with MacBook lid closed or open

REQUIREMENTS:
  • Must run with sudo privileges (for pmset commands)
  • Only works on macOS systems
  • Designed for unattended operation

EXAMPLES:
  sudo pnpm run power:setup     # Initial setup
  sudo pnpm run power:status    # Check what's configured
  sudo pnpm run power:clear     # Remove all scheduled events

Note: The wake time (1:00 AM) is currently hardcoded but may be made 
configurable in future versions.
`);
  }

  /**
   * Executes a shell command and returns output
   */
  private executeCommand(command: string, throwOnError: boolean = true): string {
    try {
      const result = execSync(command, { 
        encoding: 'utf8',
        stdio: throwOnError ? 'pipe' : ['pipe', 'pipe', 'ignore']
      });
      return result.trim();
    } catch (error) {
      if (throwOnError) {
        throw new Error(`Command failed: ${command}\n${error}`);
      }
      return '';
    }
  }

  /**
   * Ensures this script is running on macOS
   */
  private ensureRunningOnMac(): void {
    if (process.platform !== 'darwin') {
      throw new Error('This script only works on macOS systems');
    }
  }

  /**
   * Ensures the script is running with root privileges
   */
  private ensureRootPrivileges(): void {
    if (process.getuid && process.getuid() !== 0) {
      throw new Error('This script must be run with sudo privileges for pmset commands');
    }
  }
}

// Run the script if called directly
if (require.main === module) {
  const manager = new MacPowerManager();
  manager.run().catch((error) => {
    console.error('Fatal error:', error.message);
    process.exit(1);
  });
}

export default MacPowerManager;