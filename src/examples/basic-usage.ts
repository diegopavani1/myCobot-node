#!/usr/bin/env node

/**
 * Basic Usage Example
 * Demonstrates fundamental myCobot control operations
 */

import { MyCobotController, MovementRecorder } from '../lib/index.js';
import type { TJointAngles } from '../lib/index.js';

/**
 * Basic robot control example
 */
async function basicControlExample(): Promise<void> {
  const portPath = process.argv[2] ?? '/dev/tty.usbserial-59010016231';
  
  console.log('🤖 Basic myCobot Control Example');
  console.log('=================================\n');

  const robot = new MyCobotController(portPath);

  try {
    console.log(`📡 Connecting to robot on ${portPath}...`);
    await robot.connect();
    console.log('✅ Connected successfully!\n');

    console.log('⚡ Checking power status...');
    const isPowered = await robot.isPowerOn();
    
    console.log(`Power status: ${isPowered ? 'ON' : 'OFF'}\n`);

    // Power on servos
    console.log('🔋 Powering on servos...');
    await robot.powerOn();
    await new Promise((resolve) => setTimeout(resolve, 1000));

    console.log('📍 Reading current joint angles...');
    const currentAngles = await robot.getAngles();
    
    console.log('Current joint angles:');
    currentAngles.forEach((angle: number, index: number) => {
      console.log(`  Joint ${index + 1}: ${angle.toFixed(2)}°`);
    });

    console.log('\n🗺️  Reading current coordinates...');
    const currentCoords = await robot.getCoords();
    
    console.log('Current coordinates:');
    console.log(`  Position: X=${currentCoords[0].toFixed(1)}mm, Y=${currentCoords[1].toFixed(1)}mm, Z=${currentCoords[2].toFixed(1)}mm`);
    console.log(`  Rotation: Rx=${currentCoords[3].toFixed(1)}°, Ry=${currentCoords[4].toFixed(1)}°, Rz=${currentCoords[5].toFixed(1)}°`);

    console.log('\n🏠 Moving to home position...');
    await robot.sendAngles([0, 0, 0, 0, 0, 0], 50);
    await new Promise((resolve) => setTimeout(resolve, 3000));

    console.log('📈 Moving to raised position...');
    await robot.sendAngles([0, -30, -30, 0, 0, 0], 50);
    await new Promise((resolve) => setTimeout(resolve, 3000));

    console.log('🎯 Moving individual joint (base rotation)...');
    await robot.sendAngle(1, 45, 50);
    await new Promise((resolve) => setTimeout(resolve, 2000));

    console.log('🔄 Returning to home position...');
    await robot.sendAngles([0, 0, 0, 0, 0, 0], 50);
    await new Promise((resolve) => setTimeout(resolve, 3000));

    console.log('\n🦾 Testing gripper...');
    try {
      console.log('Opening gripper...');
      await robot.setGripperState(0, 50);
      await new Promise((resolve) => setTimeout(resolve, 1000));

      console.log('Closing gripper...');
      await robot.setGripperState(1, 50);
      await new Promise((resolve) => setTimeout(resolve, 1000));

      console.log('✅ Gripper test completed');
    } catch (error) {
      console.log(`⚠️  Gripper test skipped: ${(error as Error).message}`);
    }

    console.log('\n🔓 Releasing servos for safety...');
    await robot.releaseAllServos();

    console.log('\n✅ Basic control example completed successfully!');

  } catch (error) {
    console.error(`❌ Error: ${(error as Error).message}`);
  } finally {
    await robot.disconnect();
    console.log('🔌 Disconnected from robot');
  }
}

/**
 * Movement recording example
 */
async function recordingExample(): Promise<void> {
  const portPath = process.argv[2] ?? '/dev/tty.usbserial-59010016231';
  
  console.log('\n📹 Movement Recording Example');
  console.log('============================\n');

  const robot = new MyCobotController(portPath);
  const recorder = new MovementRecorder(robot);

  try {
    await robot.connect();
    console.log('✅ Connected to robot\n');

    // Create a simple programmatic movement to record
    console.log('🎯 Creating a demo movement to record...');
    
    await robot.powerOn();
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Start recording
    console.log('📹 Starting recording...');
    await recorder.startRecording();

    const movements: TJointAngles[] = [
      [0, 0, 0, 0, 0, 0],
      [0, -20, -20, 0, 0, 0],
      [30, -20, -20, 0, 0, 0],
      [-30, -20, -20, 0, 0, 0],
      [0, 0, 0, 0, 0, 0],
    ];

    for (const [index, angles] of movements.entries()) {
      console.log(`  Step ${index + 1}: Moving to [${angles.join(', ')}]`);
      await robot.sendAngles(angles, 30);
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    console.log('⏹️  Stopping recording...');
    const recordingInfo = await recorder.stopRecording();
    
    console.log(`✅ Recording completed: ${recordingInfo.frameCount} frames`);

    // Save the recording
    const filename = 'demo-movement.json';
    
    await recorder.saveRecording(filename, {
      description: 'Automated demo movement',
      created_by: 'basic-usage.ts example',
    });

    console.log(`💾 Saved recording as ${filename}`);

    // Play back the recording
    console.log('\n▶️  Playing back the recorded movement...');
    await recorder.playRecording(filename, {
      speed: 1.0,
      moveSpeed: 50,
    });

    console.log('✅ Playback completed!');

    // Clean up
    await robot.releaseAllServos();

  } catch (error) {
    console.error(`❌ Recording example error: ${(error as Error).message}`);
  } finally {
    await robot.disconnect();
  }
}

/**
 * Main function
 */
async function main(): Promise<void> {
  console.log('myCobot Node.js Library - Basic Usage Examples');
  console.log('===============================================\n');

  if (process.argv.length < 3) {
    console.log('Usage: node basic-usage.js <PORT_PATH> [example]');
    console.log('Examples:');
    console.log('  node basic-usage.js /dev/tty.usbserial-59010016231 basic     # Basic control');
    console.log('  node basic-usage.js /dev/tty.usbserial-59010016231 recording # Recording demo');
    console.log('  node basic-usage.js /dev/tty.usbserial-59010016231 both      # Both examples');
    console.log('\nRun "npm run detect-port" to find your robot\'s port.');
    process.exit(1);
  }

  const exampleType = process.argv[3] ?? 'both';

  try {
    switch (exampleType) {
      case 'basic':
        await basicControlExample();
        break;
      case 'recording':
        await recordingExample();
        break;
      case 'both':
      default:
        await basicControlExample();
        await recordingExample();
        break;
    }
  } catch (error) {
    console.error(`❌ Example failed: ${(error as Error).message}`);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  void main();
}

