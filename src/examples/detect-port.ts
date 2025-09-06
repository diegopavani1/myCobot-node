#!/usr/bin/env node

/**
 * Port Detection Utility
 * Helps identify the correct serial port for the myCobot 280 M5
 */

import { SerialPort } from 'serialport';

/**
 * Port information interface based on SerialPort.list() return type
 */
interface PortInfo {
  readonly path: string;
  readonly manufacturer?: string | undefined;
  readonly productId?: string | undefined;
  readonly vendorId?: string | undefined;
  readonly serialNumber?: string | undefined;
  readonly pnpId?: string | undefined;
}

/**
 * Find potential myCobot serial ports
 * @returns Promise that resolves when scan is complete
 */
async function findMyCobotPort(): Promise<void> {
  try {
    console.log('Scanning for available serial ports...\n');
    
    const ports = await SerialPort.list();
    
    if (ports.length === 0) {
      console.log('No serial ports found. Please check your myCobot connection.');
      
      return;
    }

    console.log('Available serial ports:');
    console.log('='.repeat(80));
    
    ports.forEach((port, index) => {
      console.log(`${index + 1}. ${port.path}`);
      console.log(`   Manufacturer: ${port.manufacturer ?? 'Unknown'}`);
      console.log(`   Product ID: ${port.productId ?? 'Unknown'}`);
      console.log(`   Vendor ID: ${port.vendorId ?? 'Unknown'}`);
      console.log(`   Serial Number: ${port.serialNumber ?? 'Unknown'}`);
      console.log('');
    });

    // Try to identify likely myCobot ports
    const likelyPorts = ports.filter((port) => {
      const manufacturer = (port.manufacturer ?? '').toLowerCase();
      const path = port.path.toLowerCase();
      
      return (
        manufacturer.includes('wch.cn') ||
        manufacturer.includes('ftdi') ||
        manufacturer.includes('ch340') ||
        manufacturer.includes('ch341') ||
        path.includes('usbserial') ||
        path.includes('ttyusb') ||
        path.includes('ttyacm')
      );
    });

    if (likelyPorts.length > 0) {
      console.log('🤖 Likely myCobot ports:');
      console.log('='.repeat(50));
      
      likelyPorts.forEach((port, index) => {
        console.log(`${index + 1}. ${port.path} (${port.manufacturer ?? 'Unknown manufacturer'})`);
      });
      
      if (likelyPorts.length === 1) {
        console.log(`\n✅ Recommended port: ${likelyPorts[0]?.path ?? 'unknown'}`);
        console.log('Use this port path in your myCobot controller configuration.');
      } else {
        console.log('\n⚠️  Multiple potential ports found. Try each one to find the correct myCobot port.');
      }
    } else {
      console.log('⚠️  No obvious myCobot ports detected.');
      console.log('Try each available port, starting with /dev/ttyUSB* or /dev/ttyACM* on Linux,');
      console.log('COM* on Windows, or /dev/tty.usbserial* on macOS.');
    }

    console.log('\n📝 Usage instructions:');
    console.log('1. Connect your myCobot 280 M5 via USB');
    console.log('2. Ensure the robot is powered on (8-12V DC supply)');
    console.log('3. Make sure the M5Stack Basic firmware is in "Transponder" mode');
    console.log('4. Use the detected port path in your controller configuration');
    
  } catch (error) {
    console.error('❌ Error scanning serial ports:', (error as Error).message);
    process.exit(1);
  }
}

// Run the port detection if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  void findMyCobotPort();
}

export default findMyCobotPort;
