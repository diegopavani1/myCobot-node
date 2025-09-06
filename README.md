# myCobot Controller for Node.js

A comprehensive Node.js library for controlling the myCobot 280 M5 robotic arm. This library provides a complete interface to control the robot through serial communication, including movement recording and playback capabilities.

## 🤖 About myCobot 280 M5

The myCobot 280 M5 is a 6-degree-of-freedom collaborative robot arm designed for education, research, and light industrial applications. Key specifications:

- **DOF**: 6 degrees of freedom
- **Payload**: 250g
- **Working Radius**: 280mm  
- **Repeatability**: ±0.5mm
- **Weight**: 850g
- **Power**: 8V-12V, 5A
- **Controller**: M5Stack Basic (ESP32) + M5Stack Atom (ESP32)
- **Communication**: USB Type-C

## ✨ Features

- **Complete Robot Control**: Joint angles, cartesian coordinates, power management
- **Movement Recording**: Record movements by manually moving the robot
- **Movement Playback**: Replay recorded movements with precise timing
- **Gripper Support**: Control attached grippers and end-effectors
- **Interactive CLI**: Full-featured command-line interface
- **Comprehensive Examples**: Ready-to-use examples and utilities
- **Type Safety**: Built with modern JavaScript/ES6+ modules
- **Error Handling**: Robust error handling and connection management

## 📋 Requirements

- **Node.js**: Version 16.0.0 or higher
- **myCobot 280 M5**: With M5Stack firmware in "Transponder" mode
- **USB Connection**: USB Type-C cable
- **Power Supply**: 12V DC, 3-5A power adapter

## 🚀 Quick Start

### Installation

1. **Clone or download** this library to your project directory
2. **Install dependencies**:
   ```bash
   npm install
   ```

### Hardware Setup

1. **Connect your myCobot**: 
   - Connect 12V power supply to the robot
   - Connect USB Type-C cable from robot to computer
   - Power on the robot

2. **Verify firmware**:
   - M5Stack Basic (base): Must be running "miniRobot" firmware in "Transponder" mode
   - M5Stack Atom (end-effector): Must be running "AtomMain" firmware

3. **Find your port**:
   ```bash
   npm run detect-port
   ```

### First Test

Test your connection:
```bash
npm run test-connection /dev/ttyUSB0  # Replace with your port
```

### Interactive Demo

Launch the full interactive CLI:
```bash
npm start  # Uses default port
# or
npm start /dev/ttyUSB0  # Specify port
```

## 📚 Library Usage

### Basic Control

```javascript
import { MyCobotController } from './lib/index.js';

// Create controller
const robot = new MyCobotController('/dev/ttyUSB0');

// Connect
await robot.connect();

// Power on servos
await robot.powerOn();

// Move to home position
await robot.sendAngles([0, 0, 0, 0, 0, 0], 50);

// Get current position
const angles = await robot.getAngles();
console.log('Joint angles:', angles);

// Move in cartesian space
await robot.sendCoords([200, 0, 200, 0, 0, 0], 50, 1);

// Control gripper
await robot.setGripperState(1, 50); // Close
await robot.setGripperState(0, 50); // Open

// Release servos and disconnect
await robot.releaseAllServos();
await robot.disconnect();
```

### Movement Recording

```javascript
import { MyCobotController, MovementRecorder } from './lib/index.js';

const robot = new MyCobotController('/dev/ttyUSB0');
const recorder = new MovementRecorder(robot);

await robot.connect();

// Start recording (robot enters free movement mode)
await recorder.startRecording();

// Move robot manually while recording...
// Call when done:
await recorder.stopRecording();

// Save recording
await recorder.saveRecording('my_movement.json');

// Play back later
await recorder.playRecording('my_movement.json', {
  speed: 1.0,    // Normal speed
  moveSpeed: 50, // Robot movement speed
  loop: false    // Don't loop
});

await robot.disconnect();
```

## 🎛️ API Reference

### MyCobotController Class

#### Constructor
```javascript
const robot = new MyCobotController(portPath, options)
```
- `portPath`: Serial port path (e.g., '/dev/ttyUSB0', 'COM3')
- `options`: Configuration options
  - `baudRate`: Serial baud rate (default: 115200)
  - `timeout`: Response timeout in ms (default: 2000)

#### Connection Methods
- `connect()`: Open serial connection
- `disconnect()`: Close serial connection

#### Power Management
- `powerOn()`: Power on all servos
- `powerOff()`: Power off all servos
- `isPowerOn()`: Check if servos are powered
- `releaseAllServos()`: Release servos (free movement mode)

#### Joint Space Control
- `getAngles()`: Get current joint angles (degrees)
- `sendAngles(angles, speed)`: Set all joint angles
- `sendAngle(jointId, angle, speed)`: Set single joint angle

#### Cartesian Space Control
- `getCoords()`: Get current cartesian coordinates
- `sendCoords(coords, speed, mode)`: Move to cartesian position
- `sendCoord(coord, value, speed)`: Set single coordinate

#### Gripper Control
- `setGripperState(state, speed)`: Open (0) or close (1) gripper
- `setGripperValue(value, speed)`: Set gripper position value
- `setGripperIni()`: Initialize gripper
- `isGripperMoving()`: Check if gripper is moving

#### Encoder Methods
- `getEncoder(jointId)`: Get single encoder value
- `getEncoders()`: Get all encoder values
- `setEncoder(jointId, value)`: Set single encoder value
- `setEncoders(encoders)`: Set all encoder values

### MovementRecorder Class

#### Constructor
```javascript
const recorder = new MovementRecorder(robot, options)
```
- `robot`: MyCobotController instance
- `options`: Recording options
  - `sampleRate`: Recording frequency in Hz (default: 20)
  - `recordingMode`: 'angles' or 'coords' (default: 'angles')

#### Recording Methods
- `startRecording()`: Start recording robot movement
- `stopRecording()`: Stop recording and return metadata
- `saveRecording(filename, metadata)`: Save recording to file
- `clearRecording()`: Clear current recording data

#### Playback Methods
- `loadRecording(filename)`: Load recording from file
- `playRecording(recording, options)`: Play back movement
- `stopPlayback()`: Stop current playback
- `listRecordings(directory)`: List available recordings

#### Status Methods
- `getStatus()`: Get recording/playback status
- `getCurrentRecording()`: Get current recording frames

## 📁 File Structure

```
mycobot-plugin/
├── lib/                      # Core library files
│   ├── command-ids.js        # Protocol command definitions
│   ├── mycobot-controller.js # Main robot controller class
│   ├── movement-recorder.js  # Recording and playback functionality
│   └── index.js             # Main library exports
├── examples/                 # Example scripts and demos
│   ├── cli-demo.js          # Interactive CLI application
│   ├── detect-port.js       # Port detection utility
│   ├── test-connection.js   # Connection testing utility
│   └── basic-usage.js       # Basic usage examples
├── package.json             # Project configuration
├── .eslintrc.json          # Code style configuration
└── README.md               # This file
```

## 🛠️ Available Scripts

- `npm start`: Launch interactive CLI demo
- `npm run detect-port`: Detect available serial ports
- `npm run test-connection <port>`: Test connection to robot
- `npm run demo`: Launch CLI demo (same as start)

## 🔧 Troubleshooting

### Connection Issues

1. **Port not found**:
   - Run `npm run detect-port` to find available ports
   - Check USB cable connection
   - Verify robot power supply

2. **Connection timeout**:
   - Ensure M5Stack Basic firmware is in "Transponder" mode
   - Check if another application is using the serial port
   - Try different baud rate (115200 is standard)

3. **Command not responding**:
   - Verify firmware versions (miniRobot + AtomMain)
   - Check power supply stability (12V, 3-5A recommended)
   - Restart robot and reconnect

### Recording Issues

1. **No frames recorded**:
   - Ensure robot is in free movement mode during recording
   - Check if `getAngles()` or `getCoords()` commands work
   - Verify recording sample rate isn't too high

2. **Playback issues**:
   - Check if servos are powered on before playback
   - Verify recording file format is valid JSON
   - Ensure movement speed isn't too high

### Firmware Setup

The myCobot 280 M5 requires specific firmware configuration:

1. **M5Stack Basic (Base)**:
   - Flash with "miniRobot" firmware
   - Set to "Transponder" mode after startup
   - This enables serial command forwarding

2. **M5Stack Atom (End-effector)**:
   - Flash with "AtomMain" firmware
   - Handles servo control communication

## 🔒 Safety Notes

- **Always support the robot arm** when servos are released
- **Use appropriate movement speeds** to prevent damage
- **Respect payload limits** (250g maximum)
- **Ensure stable power supply** to prevent unexpected movements
- **Keep emergency stop accessible** (power switch)

## 📖 Examples

### Simple Movement Sequence

```javascript
import { MyCobotController } from './lib/index.js';

const robot = new MyCobotController('/dev/ttyUSB0');

await robot.connect();
await robot.powerOn();

// Define a sequence of positions
const sequence = [
  [0, 0, 0, 0, 0, 0],           // Home
  [0, -30, -30, 0, 0, 0],       // Raised
  [45, -30, -30, 0, 0, 0],      // Left reach
  [-45, -30, -30, 0, 0, 0],     // Right reach
  [0, 0, 0, 0, 0, 0],           // Back to home
];

for (const position of sequence) {
  await robot.sendAngles(position, 50);
  await new Promise(resolve => setTimeout(resolve, 2000));
}

await robot.releaseAllServos();
await robot.disconnect();
```

### Advanced Recording with Metadata

```javascript
import { MovementRecorder } from './lib/index.js';

const recorder = new MovementRecorder(robot, {
  sampleRate: 30,        // 30 Hz recording
  recordingMode: 'coords' // Record cartesian coordinates
});

await recorder.startRecording();
// ... manual movement ...
await recorder.stopRecording();

await recorder.saveRecording('precise_movement.json', {
  description: 'High precision assembly task',
  operator: 'John Doe',
  task_type: 'pick_and_place',
  created_at: new Date().toISOString(),
});

// Later playback with high precision
await recorder.playRecording('precise_movement.json', {
  speed: 0.5,     // Half speed for precision
  moveSpeed: 20,  // Very slow robot movements
  loop: true      // Continuous operation
});
```

## 🤝 Contributing

This library follows the Airbnb JavaScript Style Guide. When contributing:

1. Use descriptive variable and function names
2. Avoid variable shadowing
3. Use consistent async/await patterns
4. Include comprehensive error handling
5. Add JSDoc comments for public methods
6. Follow the established project structure

## 📄 License

MIT License - see LICENSE file for details.

## 🔗 Related Resources

- [Elephant Robotics Official Documentation](https://docs.elephantrobotics.com/)
- [M5Stack Documentation](https://docs.m5stack.com/)
- [myCobot Firmware Downloads](https://github.com/elephantrobotics/myCobot)
- [Node.js SerialPort Documentation](https://serialport.io/)

