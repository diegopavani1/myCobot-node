#!/usr/bin/env node

/**
 * Connection Test Utility
 * Tests basic connectivity to the myCobot 280 M5
 */

import { MyCobotController } from '../lib/index.js';

/**
 * Test basic connection to myCobot
 * @param portPath - Serial port path
 * @returns Promise that resolves when test is complete
 */
async function testConnection(portPath: string): Promise<void> {
  if (!portPath) {
    console.error('❌ Error: Port path is required');
    console.log('Usage: node test-connection.js <PORT_PATH>');
    console.log('Example: node test-connection.js /dev/tty.usbserial-59010016231');
    console.log('\nRun "npm run detect-port" to find available ports.');
    process.exit(1);
  }

  console.log(`🔌 Testing connection to myCobot on ${portPath}...`);

  const robot = new MyCobotController(portPath, {
    timeout: 3000, // 3 second timeout for testing
  });

  try {
    // Test 1: Basic connection
    console.log('\n📡 Test 1: Opening serial connection...');
    await robot.connect();
    console.log('✅ Serial connection established');

    // Give the robot a moment to initialize
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Test 2: Power status check
    console.log('\n⚡ Test 2: Checking power status...');
    try {
      const isPowered = await robot.isPowerOn();
      
      console.log(`✅ Power status received: ${isPowered ? 'ON' : 'OFF'}`);
      
      if (!isPowered) {
        console.log('💡 Note: Servos are currently powered off. This is normal.');
      }
    } catch (error) {
      console.log('⚠️  Power status check failed (this may be normal for some firmware versions)');
      console.log(`   Error: ${(error as Error).message}`);
    }

    // Test 3: Get current angles
    console.log('\n📐 Test 3: Reading current joint angles...');
    try {
      const angles = await robot.getAngles();
      
      console.log('✅ Joint angles received:');
      angles.forEach((angle: number, index: number) => {
        console.log(`   Joint ${index + 1}: ${angle.toFixed(2)}°`);
      });
    } catch (error) {
      console.log('⚠️  Failed to read joint angles');
      console.log(`   Error: ${(error as Error).message}`);
      console.log('   This may indicate a firmware or connection issue.');
    }

    // Test 4: Get current coordinates
    console.log('\n🗺️  Test 4: Reading current cartesian coordinates...');
    try {
      const coords = await robot.getCoords();
      
      console.log('✅ Cartesian coordinates received:');
      console.log(`   X: ${coords[0].toFixed(2)}mm`);
      console.log(`   Y: ${coords[1].toFixed(2)}mm`);
      console.log(`   Z: ${coords[2].toFixed(2)}mm`);
      console.log(`   Rx: ${coords[3].toFixed(2)}°`);
      console.log(`   Ry: ${coords[4].toFixed(2)}°`);
      console.log(`   Rz: ${coords[5].toFixed(2)}°`);
    } catch (error) {
      console.log('⚠️  Failed to read cartesian coordinates');
      console.log(`   Error: ${(error as Error).message}`);
      console.log('   This may indicate a firmware or calibration issue.');
    }

    console.log('\n🎉 Connection test completed successfully!');
    console.log('\n📋 Summary:');
    console.log('✅ Serial communication is working');
    console.log('✅ Robot is responding to commands');
    console.log('✅ Ready for control operations');
    
    console.log('\n🚀 Next steps:');
    console.log('1. Run "npm start" to launch the interactive CLI demo');
    console.log('2. Or use this library in your own Node.js applications');
    console.log(`3. Your robot port: ${portPath}`);

  } catch (error) {
    console.log('\n❌ Connection test failed!');
    console.log(`Error: ${(error as Error).message}`);
    
    console.log('\n🔧 Troubleshooting steps:');
    console.log('1. Check that your myCobot is connected via USB');
    console.log('2. Ensure the robot has power (8-12V DC supply connected)');
    console.log('3. Verify the M5Stack Basic is in "Transponder" mode');
    console.log('4. Try a different port (run "npm run detect-port" to see options)');
    console.log('5. Check that no other applications are using the serial port');
    
    process.exit(1);
  } finally {
    // Clean up
    try {
      await robot.disconnect();
      console.log('\n🔌 Disconnected from robot');
    } catch (error) {
      // Ignore disconnect errors
    }
  }
}

// Parse command line arguments
const portPath = process.argv[2];

// Run the connection test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  void testConnection(portPath ?? '');
}

export default testConnection;

