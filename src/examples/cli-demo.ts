#!/usr/bin/env node

/**
 * myCobot CLI Demo
 * Interactive command-line interface for controlling the myCobot 280 M5
 * Demonstrates recording, playback, and manual control capabilities
 */

import readline from 'readline';
import { MyCobotController, MovementRecorder } from '../lib/index.js';
import type { TJointAngles, IRecordingFileInfo } from '../lib/index.js';

const DEFAULT_PORT = '/dev/tty.usbserial-59010016231';
const DEMO_SPEED = 50;

/**
 * Main CLI Application Class
 */
export class MyCobotCLI {
  private robot: MyCobotController | null = null;
  private recorder: MovementRecorder | null = null;
  private rl: readline.Interface | null = null;
  private isConnected = false;

  /**
   * Initialize the CLI application
   */
  async initialize(): Promise<void> {
    const portPath = process.argv[2] ?? DEFAULT_PORT;

    console.log('🤖 myCobot 280 M5 Control Interface');
    console.log('==================================');
    console.log(`Connecting to robot on port: ${portPath}`);
    console.log('(Use Ctrl+C to exit at any time)\n');

    try {
      // Initialize robot controller
      this.robot = new MyCobotController(portPath);
      await this.robot.connect();
      
      // Initialize movement recorder
      this.recorder = new MovementRecorder(this.robot, {
        sampleRate: 20,
        recordingMode: 'angles',
      });

      this.isConnected = true;
      
      this.rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      console.log('✅ Connected to myCobot successfully!\n');
      
      this._showMainMenu();

    } catch (error) {
      console.error(`❌ Failed to connect to myCobot: ${(error as Error).message}`);
      console.error('\nTroubleshooting:');
      console.error('1. Check the port path (run: npm run detect-port)');
      console.error('2. Ensure robot is powered and connected via USB');
      console.error('3. Verify M5Stack Basic firmware is in Transponder mode');
      process.exit(1);
    }
  }

  /**
   * Display the main menu
   */
  private _showMainMenu(): void {
    console.log('\n🎛️  Main Menu');
    console.log('=============');
    console.log('1. 🔧 Basic Control & Testing');
    console.log('2. 🎯 Manual Movement Demo');
    console.log('3. 📹 Record New Movement');
    console.log('4. 🎬 Play Recorded Movement');
    console.log('5. 📂 Manage Recordings');
    console.log('6. ℹ️  Robot Status');
    console.log('7. 🔌 Disconnect & Exit');
    
    if (!this.rl) {
      throw new Error('Readline interface not initialized');
    }

    this.rl.question('\nChoose an option (1-7): ', (answer: string) => {
      void this._handleMainMenuChoice(answer.trim());
    });
  }

  /**
   * Handle main menu selection
   * @param choice - User's menu choice
   */
  private async _handleMainMenuChoice(choice: string): Promise<void> {
    try {
      switch (choice) {
        case '1':
          await this._basicControlMenu();
          break;
        case '2':
          await this._manualMovementDemo();
          break;
        case '3':
          await this._recordMovement();
          break;
        case '4':
          await this._playRecordedMovement();
          break;
        case '5':
          await this._manageRecordings();
          break;
        case '6':
          await this._showRobotStatus();
          break;
        case '7':
          await this._exitApplication();
          break;
        default:
          console.log('❌ Invalid option. Please choose 1-7.');
          this._showMainMenu();
          break;
      }
    } catch (error) {
      console.error(`❌ Error: ${(error as Error).message}`);
      this._showMainMenu();
    }
  }

  /**
   * Basic control and testing menu
   */
  private async _basicControlMenu(): Promise<void> {
    console.log('\n🔧 Basic Control & Testing');
    console.log('==========================');
    console.log('1. Power On Servos');
    console.log('2. Power Off Servos');
    console.log('3. Release All Servos (Free Movement)');
    console.log('4. Move to Home Position (All zeros)');
    console.log('5. Test Gripper');
    console.log('6. Back to Main Menu');

    if (!this.rl) {
      throw new Error('Readline interface not initialized');
    }

    this.rl.question('\nChoose an option (1-6): ', async (answer: string) => {
      if (!this.robot) {
        throw new Error('Robot not initialized');
      }

      try {
        switch (answer.trim()) {
          case '1':
            console.log('⚡ Powering on servos...');
            await this.robot.powerOn();
            console.log('✅ Servos powered on');
            break;
          case '2':
            console.log('⚡ Powering off servos...');
            await this.robot.powerOff();
            console.log('✅ Servos powered off');
            break;
          case '3':
            console.log('🔓 Releasing all servos...');
            await this.robot.releaseAllServos();
            console.log('✅ All servos released (robot can be moved manually)');
            console.log('⚠️  WARNING: Support the robot arm to prevent falling!');
            break;
          case '4':
            console.log('🏠 Moving to home position...');
            await this.robot.powerOn();
            await new Promise((resolve) => setTimeout(resolve, 1000));
            await this.robot.sendAngles([0, 0, 0, 0, 0, 0], DEMO_SPEED);
            console.log('✅ Moved to home position');
            break;
          case '5':
            await this._testGripper();
            break;
          case '6':
            this._showMainMenu();
            
            return;
          default:
            console.log('❌ Invalid option');
            break;
        }
      } catch (error) {
        console.error(`❌ Error: ${(error as Error).message}`);
      }
      
      // Return to basic control menu
      setTimeout(() => void this._basicControlMenu(), 1000);
    });
  }

  /**
   * Test gripper functionality
   */
  private async _testGripper(): Promise<void> {
    console.log('🦾 Testing gripper...');
    
    if (!this.robot) {
      throw new Error('Robot not initialized');
    }

    try {
      console.log('Opening gripper...');
      await this.robot.setGripperState(0, 50); // Open
      await new Promise((resolve) => setTimeout(resolve, 2000));
      
      console.log('Closing gripper...');
      await this.robot.setGripperState(1, 50); // Close
      await new Promise((resolve) => setTimeout(resolve, 2000));
      
      console.log('Opening gripper again...');
      await this.robot.setGripperState(0, 50); // Open
      
      console.log('✅ Gripper test completed');
    } catch (error) {
      console.log('⚠️  Gripper test failed (gripper may not be connected)');
      console.log(`Error: ${(error as Error).message}`);
    }
  }

  /**
   * Manual movement demonstration
   */
  private async _manualMovementDemo(): Promise<void> {
    console.log('\n🎯 Manual Movement Demo');
    console.log('=======================');
    
    const demoSequence: Array<{ name: string; angles: TJointAngles }> = [
      { name: 'Home Position', angles: [0, 0, 0, 0, 0, 0] },
      { name: 'Raised Position', angles: [0, -30, -30, 0, 0, 0] },
      { name: 'Left Reach', angles: [45, -30, -30, 0, 0, 0] },
      { name: 'Right Reach', angles: [-45, -30, -30, 0, 0, 0] },
      { name: 'Up Reach', angles: [0, -60, -60, 30, 0, 0] },
      { name: 'Home Position', angles: [0, 0, 0, 0, 0, 0] },
    ];

    console.log('This demo will move the robot through a predefined sequence.');
    
    if (!this.rl) {
      throw new Error('Readline interface not initialized');
    }

    this.rl.question('Continue? (y/n): ', async (answer: string) => {
      if (answer.toLowerCase() !== 'y') {
        this._showMainMenu();
        
        return;
      }

      if (!this.robot) {
        throw new Error('Robot not initialized');
      }

      try {
        console.log('⚡ Powering on servos...');
        await this.robot.powerOn();
        await new Promise((resolve) => setTimeout(resolve, 1000));

        for (const [index, position] of demoSequence.entries()) {
          console.log(`\n📍 Step ${index + 1}: Moving to ${position.name}...`);
          await this.robot.sendAngles(position.angles, DEMO_SPEED);
          
          // Wait for movement to complete (estimated time)
          await new Promise((resolve) => setTimeout(resolve, 3000));
        }

        console.log('\n✅ Demo sequence completed!');
        console.log('🔓 Releasing servos for safety...');
        await this.robot.releaseAllServos();
        
      } catch (error) {
        console.error(`❌ Demo failed: ${(error as Error).message}`);
      }

      setTimeout(() => this._showMainMenu(), 2000);
    });
  }

  /**
   * Record a new movement
   */
  private async _recordMovement(): Promise<void> {
    console.log('\n📹 Record New Movement');
    console.log('======================');
    console.log('This will record the robot\'s position as you move it manually.');
    console.log('Make sure to support the robot arm during recording!');
    
    if (!this.rl) {
      throw new Error('Readline interface not initialized');
    }

    this.rl.question('\nReady to start recording? (y/n): ', async (answer: string) => {
      if (answer.toLowerCase() !== 'y') {
        this._showMainMenu();
        
        return;
      }

      if (!this.recorder) {
        throw new Error('Recorder not initialized');
      }

      try {
        // Start recording
        await this.recorder.startRecording();
        
        console.log('\n🔴 RECORDING IN PROGRESS');
        console.log('========================');
        console.log('Move the robot manually to teach the desired movement.');
        console.log('The robot will sample positions 20 times per second.');
        
        // Set up a way to stop recording
        console.log('\n⏹️  Press ENTER to stop recording...');
        
        const recordingPromise = new Promise<void>((resolve) => {
          const onKeyPress = (): void => {
            process.stdin.setRawMode(false);
            process.stdin.pause();
            process.stdin.removeListener('data', onKeyPress);
            resolve();
          };

          process.stdin.setRawMode(true);
          process.stdin.resume();
          process.stdin.on('data', onKeyPress);
        });

        await recordingPromise;

        // Stop recording
        const recordingInfo = await this.recorder.stopRecording();
        
        console.log('\n✅ Recording completed!');
        console.log(`📊 Captured ${recordingInfo.frameCount} frames`);
        console.log(`⏱️  Duration: ${(recordingInfo.duration / 1000).toFixed(2)} seconds`);

        // Save recording
        if (!this.rl) {
          throw new Error('Readline interface not initialized');
        }

        this.rl.question('\nEnter filename to save (e.g., my_movement.json): ', async (filename: string) => {
          if (!filename.trim()) {
            console.log('❌ No filename provided. Recording not saved.');
            this._showMainMenu();
            
            return;
          }

          let finalFilename = filename;
          
          if (!finalFilename.endsWith('.json')) {
            finalFilename += '.json';
          }

          if (!this.recorder) {
            throw new Error('Recorder not initialized');
          }

          try {
            await this.recorder.saveRecording(finalFilename);
            console.log(`✅ Movement saved as ${finalFilename}`);
          } catch (error) {
            console.error(`❌ Failed to save recording: ${(error as Error).message}`);
          }

          setTimeout(() => this._showMainMenu(), 1000);
        });

      } catch (error) {
        console.error(`❌ Recording failed: ${(error as Error).message}`);
        setTimeout(() => this._showMainMenu(), 1000);
      }
    });
  }

  /**
   * Play a recorded movement
   */
  private async _playRecordedMovement(): Promise<void> {
    console.log('\n🎬 Play Recorded Movement');
    console.log('=========================');

    if (!this.recorder) {
      throw new Error('Recorder not initialized');
    }

    try {
      const recordings = await this.recorder.listRecordings('.');
      
      if (recordings.length === 0) {
        console.log('📂 No recordings found in current directory.');
        console.log('Record a movement first (option 3) or check your file paths.');
        setTimeout(() => this._showMainMenu(), 2000);
        
        return;
      }

      console.log('Available recordings:');
      recordings.forEach((recording: IRecordingFileInfo, index: number) => {
        const { filename, frameCount, metadata } = recording;
        const duration = metadata?.duration ? (metadata.duration / 1000).toFixed(1) : '?';
        
        console.log(`${index + 1}. ${filename} (${frameCount} frames, ${duration}s)`);
      });

      if (!this.rl) {
        throw new Error('Readline interface not initialized');
      }

      this.rl.question('\nSelect recording number: ', async (answer: string) => {
        const recordingIndex = parseInt(answer, 10) - 1;
        
        if (recordingIndex < 0 || recordingIndex >= recordings.length) {
          console.log('❌ Invalid recording number');
          setTimeout(() => this._showMainMenu(), 1000);
          
          return;
        }

        const selectedRecording = recordings[recordingIndex];
        
        if (!selectedRecording) {
          console.log('❌ Recording not found');
          setTimeout(() => this._showMainMenu(), 1000);
          
          return;
        }

        console.log(`Selected: ${selectedRecording.filename}`);
        
        if (!this.rl) {
          throw new Error('Readline interface not initialized');
        }

        this.rl.question('Playback speed (0.1-3.0, default 1.0): ', async (speedInput: string) => {
          let speed = 1.0;
          
          if (speedInput.trim()) {
            speed = parseFloat(speedInput);
            if (speed < 0.1 || speed > 3.0) {
              console.log('❌ Invalid speed, using 1.0');
              speed = 1.0;
            }
          }

          if (!this.recorder) {
            throw new Error('Recorder not initialized');
          }

          try {
            console.log(`\n▶️  Playing ${selectedRecording.filename} at ${speed}x speed...`);
            
            await this.recorder.playRecording(selectedRecording.path, {
              speed,
              moveSpeed: 100,
              loop: false,
            });

            console.log('✅ Playback completed!');
            
          } catch (error) {
            console.error(`❌ Playback failed: ${(error as Error).message}`);
          }

          setTimeout(() => this._showMainMenu(), 1000);
        });
      });

    } catch (error) {
      console.error(`❌ Error loading recordings: ${(error as Error).message}`);
      setTimeout(() => this._showMainMenu(), 1000);
    }
  }

  /**
   * Manage recordings (list, delete)
   */
  private async _manageRecordings(): Promise<void> {
    console.log('\n📂 Manage Recordings');
    console.log('====================');

    if (!this.recorder) {
      throw new Error('Recorder not initialized');
    }

    try {
      const recordings = await this.recorder.listRecordings('.');
      
      if (recordings.length === 0) {
        console.log('📂 No recordings found in current directory.');
        setTimeout(() => this._showMainMenu(), 2000);
        
        return;
      }

      console.log('Available recordings:');
      recordings.forEach((recording: IRecordingFileInfo, index: number) => {
        const { filename, frameCount, metadata } = recording;
        const duration = metadata?.duration ? (metadata.duration / 1000).toFixed(1) : '?';
        const recordedAt = metadata?.recordedAt 
          ? new Date(metadata.recordedAt).toLocaleDateString() 
          : 'Unknown date';
        
        console.log(`${index + 1}. ${filename}`);
        console.log(`   📊 ${frameCount} frames, ${duration}s duration`);
        console.log(`   📅 Recorded: ${recordedAt}`);
        console.log('');
      });

      console.log('Options:');
      console.log('1. Back to main menu');
      console.log('2. Delete a recording');

      if (!this.rl) {
        throw new Error('Readline interface not initialized');
      }

      this.rl.question('Choose option: ', (answer: string) => {
        switch (answer.trim()) {
          case '1':
            this._showMainMenu();
            break;
          case '2':
            this._deleteRecording(recordings);
            break;
          default:
            console.log('❌ Invalid option');
            setTimeout(() => void this._manageRecordings(), 1000);
            break;
        }
      });

    } catch (error) {
      console.error(`❌ Error managing recordings: ${(error as Error).message}`);
      setTimeout(() => this._showMainMenu(), 1000);
    }
  }

  /**
   * Delete a recording
   * @param recordings - Available recordings
   */
  private _deleteRecording(recordings: IRecordingFileInfo[]): void {
    if (!this.rl) {
      throw new Error('Readline interface not initialized');
    }

    this.rl.question('Enter recording number to delete: ', async (answer: string) => {
      const recordingIndex = parseInt(answer, 10) - 1;
      
      if (recordingIndex < 0 || recordingIndex >= recordings.length) {
        console.log('❌ Invalid recording number');
        setTimeout(() => void this._manageRecordings(), 1000);
        
        return;
      }

      const recordingToDelete = recordings[recordingIndex];
      
      if (!recordingToDelete) {
        console.log('❌ Recording not found');
        setTimeout(() => void this._manageRecordings(), 1000);
        
        return;
      }

      if (!this.rl) {
        throw new Error('Readline interface not initialized');
      }

      this.rl.question(`⚠️  Delete ${recordingToDelete.filename}? This cannot be undone! (y/n): `, async (confirmation: string) => {
        if (confirmation.toLowerCase() === 'y') {
          try {
            const fs = await import('fs/promises');
            
            await fs.unlink(recordingToDelete.path);
            console.log(`✅ Deleted ${recordingToDelete.filename}`);
          } catch (error) {
            console.error(`❌ Failed to delete recording: ${(error as Error).message}`);
          }
        } else {
          console.log('❌ Delete cancelled');
        }
        
        setTimeout(() => void this._manageRecordings(), 1000);
      });
    });
  }

  /**
   * Show current robot status
   */
  private async _showRobotStatus(): Promise<void> {
    console.log('\nℹ️  Robot Status');
    console.log('================');

    if (!this.robot) {
      throw new Error('Robot not initialized');
    }

    try {
      // Check power status
      console.log('⚡ Power Status:');
      try {
        const isPowered = await this.robot.isPowerOn();
        
        console.log(`   Servos: ${isPowered ? '✅ ON' : '❌ OFF'}`);
      } catch (error) {
        console.log('   Servos: ❓ Unknown (command not supported)');
      }

      // Get current angles
      console.log('\n📐 Current Joint Angles:');
      try {
        const angles = await this.robot.getAngles();
        
        angles.forEach((angle: number, index: number) => {
          console.log(`   Joint ${index + 1}: ${angle.toFixed(2)}°`);
        });
      } catch (error) {
        console.log(`   ❌ Error reading angles: ${(error as Error).message}`);
      }

      // Get current coordinates
      console.log('\n🗺️  Current Cartesian Position:');
      try {
        const coords = await this.robot.getCoords();
        
        console.log(`   Position: X=${coords[0].toFixed(1)}mm, Y=${coords[1].toFixed(1)}mm, Z=${coords[2].toFixed(1)}mm`);
        console.log(`   Rotation: Rx=${coords[3].toFixed(1)}°, Ry=${coords[4].toFixed(1)}°, Rz=${coords[5].toFixed(1)}°`);
      } catch (error) {
        console.log(`   ❌ Error reading coordinates: ${(error as Error).message}`);
      }

      // Recording status
      if (this.recorder) {
        const recordingStatus = this.recorder.getStatus();
        
        console.log('\n📹 Recording Status:');
        console.log(`   Recording: ${recordingStatus.isRecording ? '🔴 ACTIVE' : '⏹️  STOPPED'}`);
        console.log(`   Playing: ${recordingStatus.isPlaying ? '▶️  ACTIVE' : '⏹️  STOPPED'}`);
        console.log(`   Sample Rate: ${recordingStatus.sampleRate} Hz`);
        console.log(`   Current Frames: ${recordingStatus.currentFrameCount}`);
      }

    } catch (error) {
      console.error(`❌ Error getting robot status: ${(error as Error).message}`);
    }

    setTimeout(() => this._showMainMenu(), 3000);
  }

  /**
   * Exit the application gracefully
   */
  private async _exitApplication(): Promise<void> {
    console.log('\n👋 Shutting down...');

    try {
      // Stop any recording
      if (this.recorder && this.recorder.getStatus().isRecording) {
        console.log('⏹️  Stopping recording...');
        await this.recorder.stopRecording();
      }

      // Stop any playback
      if (this.recorder && this.recorder.getStatus().isPlaying) {
        console.log('⏹️  Stopping playback...');
        await this.recorder.stopPlayback();
      }

      // Release servos for safety
      if (this.robot && this.isConnected) {
        console.log('🔓 Releasing servos for safety...');
        await this.robot.releaseAllServos();
      }

      // Disconnect from robot
      if (this.robot && this.isConnected) {
        console.log('🔌 Disconnecting from robot...');
        await this.robot.disconnect();
      }

      // Close readline interface
      if (this.rl) {
        this.rl.close();
      }

      console.log('✅ Shutdown complete. Goodbye!');
      process.exit(0);

    } catch (error) {
      console.error(`❌ Error during shutdown: ${(error as Error).message}`);
      process.exit(1);
    }
  }
}

/**
 * Main execution
 */
async function main(): Promise<void> {
  // Handle Ctrl+C gracefully
  process.on('SIGINT', async () => {
    console.log('\n\n⚠️  Interrupt received. Shutting down safely...');
    process.exit(0);
  });

  // Handle uncaught errors
  process.on('uncaughtException', (error: Error) => {
    console.error('❌ Uncaught exception:', error.message);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason: unknown) => {
    console.error('❌ Unhandled rejection:', reason);
    process.exit(1);
  });

  // Start the CLI application
  const cli = new MyCobotCLI();
  
  await cli.initialize();
}

// Run the application if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  void main();
}

export default MyCobotCLI;

