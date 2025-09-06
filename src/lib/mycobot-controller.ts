import { SerialPort } from 'serialport';
import { 
  COMMAND_IDS, 
  PROTOCOL, 
  type TCommandId, 
  type TJointAngles, 
  type TCartesianCoords, 
  type TGripperState, 
  type TMovementSpeed, 
  type TJointId, 
  type TCoordinateId, 
  type TInterpolationMode 
} from './command-ids.js';

/**
 * Configuration options for MyCobotController
 */
export interface IMyCobotControllerOptions {
  /** Serial communication baud rate (default: 115200) */
  readonly baudRate?: number;
  /** Response timeout in milliseconds (default: 2000) */
  readonly timeout?: number;
}

/**
 * Response queue item for managing async command-response pairs
 */
interface IResponseQueueItem {
  readonly command: TCommandId;
  readonly resolve: (result: unknown) => void;
  readonly reject: (error: Error) => void;
}

/**
 * Robot power status response
 */
export type TPowerStatus = boolean;

/**
 * Gripper movement status response
 */
export type TGripperMovementStatus = boolean;

/**
 * Encoder value type
 */
export type TEncoderValue = number;

/**
 * Array of encoder values for all 6 joints
 */
export type TEncoderValues = readonly [number, number, number, number, number, number];

/**
 * Raw command data for encoding
 */
type TCommandData = readonly number[] | null;

/**
 * MyCobot Controller Class
 * Provides high-level control interface for the myCobot 280 M5 robotic arm
 * Handles serial communication protocol, data encoding/decoding, and movement control
 */
export class MyCobotController {
  private readonly portPath: string;
  private readonly baudRate: number;
  private readonly timeout: number;
  
  private port: SerialPort | null = null;
  private buffer = Buffer.alloc(0);
  private readonly responseQueue: IResponseQueueItem[] = [];
  private isConnected = false;

  /**
   * Creates a new MyCobot controller instance
   * @param portPath - Serial port path (e.g., '/dev/tty.usbserial-*', 'COM3')
   * @param options - Configuration options
   */
  constructor(portPath: string, options: IMyCobotControllerOptions = {}) {
    this.portPath = portPath;
    this.baudRate = options.baudRate ?? 115200;
    this.timeout = options.timeout ?? 500;
    
    this._initializePort();
  }

  /**
   * Initialize the serial port connection
   */
  private _initializePort(): void {
    this.port = new SerialPort({
      path: this.portPath,
      baudRate: this.baudRate,
      autoOpen: false,
      rtscts: false,
    });

    this.port.on('data', (data: Buffer) => {
      this.buffer = Buffer.concat([this.buffer, data]);
      this._parseResponses();
    });

    this.port.on('open', () => {
      this.isConnected = true;
      console.log(`Connected to myCobot on ${this.portPath} at ${this.baudRate} bps`);
    });

    this.port.on('close', () => {
      this.isConnected = false;
      console.log('Connection to myCobot closed');
    });

    this.port.on('error', (error: Error) => {
      console.error('Serial port error:', error.message);
      this.isConnected = false;
    });
  }

  /**
   * Open the serial port connection
   * @returns Promise that resolves when connection is established
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isConnected) {
        resolve();

        return;
      }

      if (!this.port) {
        reject(new Error('Serial port not initialized'));

        return;
      }

      this.port.open((error: Error | null) => {
        if (error) {
          reject(new Error(`Failed to open port: ${error.message}`));

          return;
        }
        
        setTimeout(() => {
          resolve();
        }, 1500);
      });
    });
  }

  /**
   * Close the serial port connection
   * @returns Promise that resolves when connection is closed
   */
  async disconnect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.isConnected) {
        resolve();

        return;
      }

      if (!this.port) {
        reject(new Error('Serial port not initialized'));

        return;
      }

      this.port.close((error: Error | null) => {
        if (error) {
          reject(new Error(`Failed to close port: ${error.message}`));

          return;
        }
        resolve();
      });
    });
  }

  /**
   * Parse incoming responses from the robot
   * Handles packet fragmentation and validates protocol structure
   */
  private _parseResponses(): void {
    while (this.buffer.length >= PROTOCOL.MIN_PACKET_SIZE) {
      let startIndex = -1;
      
      for (let i = 0; i < this.buffer.length - 1; i += 1) {
        if (this.buffer[i] === PROTOCOL.HEADER && this.buffer[i + 1] === PROTOCOL.HEADER) {
          startIndex = i;
          break;
        }
      }

      if (startIndex === -1) {
        this.buffer = Buffer.alloc(0);
        return;
      }

      if (startIndex > 0) {
        this.buffer = this.buffer.slice(startIndex);
      }

      if (this.buffer.length < 3) {
        return;
      }

      const length = this.buffer[2];
      
      if (typeof length === 'undefined') {
        return;
      }
      
      const packetLength = PROTOCOL.HEADER_SIZE + PROTOCOL.LENGTH_SIZE + length;

      if (this.buffer.length < packetLength) {
        return;
      }

      const packet = this.buffer.slice(0, packetLength);
      
      if (packet[packetLength - 1] === PROTOCOL.FOOTER) {
        const commandId = packet[3] as TCommandId;
        const data = packet.slice(4, packetLength - 1);
        
        this._handleResponse(commandId, data);
      }

      this.buffer = this.buffer.slice(packetLength);
    }
  }

  /**
   * Handle a complete response packet
   * @param commandId - The command ID from the response
   * @param data - The data payload
   */
  /**
   * Get command-specific timeout (matching Python library behavior)
   * @param commandId - The command ID
   * @returns Timeout in milliseconds
   */
  private _getCommandTimeout(commandId: TCommandId): number {
    switch (commandId) {
      case COMMAND_IDS.POWER_ON:
        return 8000;
      case COMMAND_IDS.POWER_OFF:
      case COMMAND_IDS.RELEASE_ALL_SERVOS:
        return 3000;
      case COMMAND_IDS.SEND_ANGLE:
      case COMMAND_IDS.SEND_ANGLES:
      case COMMAND_IDS.SEND_COORD:
      case COMMAND_IDS.SEND_COORDS:
        return 300;
      default:
        return 500;
    }
  }

  private _handleResponse(commandId: TCommandId, data: Buffer): void {
    if (this.responseQueue.length > 0) {
      const pendingResponse = this.responseQueue.find((item) => item.command === commandId);
      
      if (pendingResponse) {
        const index = this.responseQueue.indexOf(pendingResponse);
        
        this.responseQueue.splice(index, 1);
        
        const decodedData = this._decodeData(commandId, data);
        
        pendingResponse.resolve(decodedData);
      }
    }
  }

  /**
   * Decode response data based on command type
   * @param commandId - The command ID
   * @param data - Raw data buffer
   * @returns Decoded data
   */
  private _decodeData(commandId: TCommandId, data: Buffer): unknown {
    switch (commandId) {
      case COMMAND_IDS.SOFTWARE_VERSION:
        return data.length > 0 ? data[0] : 0;
      case COMMAND_IDS.GET_ANGLES:
      case COMMAND_IDS.GET_COORDS:
      case COMMAND_IDS.GET_ENCODERS: {
        const decoded: number[] = [];
        
        for (let i = 0; i < data.length; i += 2) {
          decoded.push(data.readInt16BE(i) / 100.0);
        }
        
        if (decoded.length === 6) {
          return decoded as unknown as TJointAngles | TCartesianCoords | TEncoderValues;
        }
        
        return decoded;
      }
      case COMMAND_IDS.IS_POWER_ON:
      case COMMAND_IDS.IS_GRIPPER_MOVING:
      case COMMAND_IDS.IS_MOVING:
      case COMMAND_IDS.IS_IN_POSITION:
      case COMMAND_IDS.IS_SERVO_ENABLE:
        return data[0] === 1;
      case COMMAND_IDS.GET_ENCODER:
        return data.readInt16BE(0) / 100.0;
      case COMMAND_IDS.GET_SPEED:
      case COMMAND_IDS.GET_GRIPPER_VALUE:
        return data.length > 0 ? data[0] : 0;
      default:
        return data;
    }
  }

  /**
   * Encode command data for transmission
   * @param commandId - The command ID
   * @param data - Data to encode
   * @returns Encoded data buffer
   */
  private _encodeData(commandId: TCommandId, data: TCommandData): Buffer {
    if (!data || data.length === 0) {
      return Buffer.alloc(0);
    }

    let buffer: Buffer;
    
    switch (commandId) {
      case COMMAND_IDS.SEND_ANGLES: {
        if (data.length < 7) {
          throw new Error('SEND_ANGLES requires 7 data values');
        }
        
        buffer = Buffer.alloc(13);
        for (let i = 0; i < 6; i += 1) {
          const angle = data[i];
          
          if (typeof angle !== 'number') {
            throw new Error(`Invalid angle at index ${i}`);
          }
          
          buffer.writeInt16BE(Math.round(angle * 100), i * 2);
        }
        
        const speed = data[6];
        
        if (typeof speed !== 'number') {
          throw new Error('Invalid speed value');
        }
        
        buffer.writeUInt8(speed, 12);
        
        return buffer;
      }
      case COMMAND_IDS.SEND_ANGLE: {
        if (data.length < 3) {
          throw new Error('SEND_ANGLE requires 3 data values');
        }
        
        const jointId = data[0];
        const angle = data[1];
        const speed = data[2];
        
        if (typeof jointId !== 'number' || typeof angle !== 'number' || typeof speed !== 'number') {
          throw new Error('Invalid data values for SEND_ANGLE');
        }
        
        buffer = Buffer.alloc(4);
        buffer.writeUInt8(jointId, 0);
        buffer.writeInt16BE(Math.round(angle * 100), 1);
        buffer.writeUInt8(speed, 3);
        
        return buffer;
      }
      case COMMAND_IDS.SEND_COORDS: {
        if (data.length < 8) {
          throw new Error('SEND_COORDS requires 8 data values');
        }
        
        buffer = Buffer.alloc(14);
        for (let i = 0; i < 6; i += 1) {
          const coord = data[i];
          
          if (typeof coord !== 'number') {
            throw new Error(`Invalid coordinate at index ${i}`);
          }
          
          buffer.writeInt16BE(Math.round(coord * 100), i * 2);
        }
        
        const speed = data[6];
        const mode = data[7];
        
        if (typeof speed !== 'number' || typeof mode !== 'number') {
          throw new Error('Invalid speed or mode values for SEND_COORDS');
        }
        
        buffer.writeUInt8(speed, 12);
        buffer.writeUInt8(mode, 13);
        
        return buffer;
      }
      case COMMAND_IDS.SEND_COORD: {
        if (data.length < 3) {
          throw new Error('SEND_COORD requires 3 data values');
        }
        
        const coord = data[0];
        const value = data[1];
        const speed = data[2];
        
        if (typeof coord !== 'number' || typeof value !== 'number' || typeof speed !== 'number') {
          throw new Error('Invalid data values for SEND_COORD');
        }
        
        buffer = Buffer.alloc(4);
        buffer.writeUInt8(coord, 0);
        buffer.writeInt16BE(Math.round(value * 100), 1);
        buffer.writeUInt8(speed, 3);
        
        return buffer;
      }
      case COMMAND_IDS.SET_GRIPPER_STATE:
      case COMMAND_IDS.SET_GRIPPER_VALUE: {
        if (data.length < 2) {
          throw new Error('Gripper commands require 2 data values');
        }
        
        const flagOrValue = data[0];
        const speed = data[1];
        
        if (typeof flagOrValue !== 'number' || typeof speed !== 'number') {
          throw new Error('Invalid data values for gripper command');
        }
        
        buffer = Buffer.alloc(2);
        buffer.writeUInt8(flagOrValue, 0);
        buffer.writeUInt8(speed, 1);
        
        return buffer;
      }
      default:
        // For simple data, convert to buffer
        if (Array.isArray(data)) {
          return Buffer.from(data);
        }
        
        // Single number case
        if (typeof data === 'number') {
          return Buffer.from([data]);
        }
        
        throw new Error('Invalid data type for encoding');
    }
  }

  /**
   * Send a command to the robot
   * @param commandId - Command ID from COMMAND_IDS
   * @param data - Command data payload
   * @param waitForResponse - Whether to wait for a response
   * @returns Promise that resolves with response data or void
   */
  private async _sendCommand<T = void>(
    commandId: TCommandId, 
    data: TCommandData = null, 
    waitForResponse = false
  ): Promise<T> {
    if (!this.isConnected) {
      throw new Error('Not connected to myCobot. Call connect() first.');
    }

    if (!this.port) {
      throw new Error('Serial port not initialized');
    }

    const encodedData = this._encodeData(commandId, data);
    const length = encodedData.length + 2; // Match Python: +2 for command ID + footer
    const totalLength = PROTOCOL.HEADER_SIZE + PROTOCOL.LENGTH_SIZE + PROTOCOL.COMMAND_ID_SIZE + encodedData.length + PROTOCOL.FOOTER_SIZE;
    
    const command = Buffer.alloc(totalLength);
    let offset = 0;

    command.writeUInt8(PROTOCOL.HEADER, offset);
    offset += 1;
    command.writeUInt8(PROTOCOL.HEADER, offset);
    offset += 1;

    command.writeUInt8(length, offset);
    offset += 1;

    command.writeUInt8(commandId, offset);
    offset += 1;

    if (encodedData.length > 0) {
      encodedData.copy(command, offset);
      offset += encodedData.length;
    }

    command.writeUInt8(PROTOCOL.FOOTER, offset);

    this.port.write(command);

    if (waitForResponse) {
      return new Promise<T>((resolve, reject) => {
        const commandTimeout = this._getCommandTimeout(commandId);
        const timeoutId = setTimeout(() => {
          const index = this.responseQueue.findIndex((item) => item.command === commandId);
          
          if (index >= 0) {
            this.responseQueue.splice(index, 1);
          }
          reject(new Error(`Command timeout: 0x${commandId.toString(16).toUpperCase()}`));
        }, commandTimeout);

        this.responseQueue.push({
          command: commandId,
          resolve: (result: unknown) => {
            clearTimeout(timeoutId);
            resolve(result as T);
          },
          reject: (error: Error) => {
            clearTimeout(timeoutId);
            reject(error);
          },
        });
      });
    }

    return Promise.resolve() as Promise<T>;
  }


  /**
   * Get system software version
   * @returns Promise that resolves with version number
   */
  async getSystemVersion(): Promise<number> {
    return this._sendCommand<number>(COMMAND_IDS.SOFTWARE_VERSION, null, true);
  }

  /**
   * Power on all servo motors
   * @returns Promise that resolves when command is sent
   */
  async powerOn(): Promise<void> {
    await this._sendCommand(COMMAND_IDS.POWER_ON);
  }

  /**
   * Power off all servo motors
   * @returns Promise that resolves when command is sent
   */
  async powerOff(): Promise<void> {
    await this._sendCommand(COMMAND_IDS.POWER_OFF);
  }

  /**
   * Check if servo motors are powered on
   * @returns Promise that resolves with power status
   */
  async isPowerOn(): Promise<TPowerStatus> {
    return this._sendCommand<TPowerStatus>(COMMAND_IDS.IS_POWER_ON, null, true);
  }

  /**
   * Release all servo motors (free movement mode)
   * WARNING: The arm may fall due to gravity
   * @returns Promise that resolves when command is sent
   */
  async releaseAllServos(): Promise<void> {
    await this._sendCommand(COMMAND_IDS.RELEASE_ALL_SERVOS);
  }

  /**
   * Check if a specific servo is enabled
   * @param servoId - Servo ID (1-6)
   * @returns Promise that resolves with servo enable status
   */
  async isServoEnable(servoId: TJointId): Promise<boolean> {
    if (servoId < 1 || servoId > 6) {
      throw new Error('Servo ID must be between 1 and 6');
    }
    return this._sendCommand<boolean>(COMMAND_IDS.IS_SERVO_ENABLE, [servoId], true);
  }

  /**
   * Release a specific servo motor
   * @param servoId - Servo ID (1-6)
   * @returns Promise that resolves when command is sent
   */
  async releaseServo(servoId: TJointId): Promise<void> {
    if (servoId < 1 || servoId > 6) {
      throw new Error('Servo ID must be between 1 and 6');
    }
    await this._sendCommand(COMMAND_IDS.RELEASE_SERVO, [servoId]);
  }

  /**
   * Focus (enable) a specific servo motor
   * @param servoId - Servo ID (1-6)
   * @returns Promise that resolves when command is sent
   */
  async focusServo(servoId: TJointId): Promise<void> {
    if (servoId < 1 || servoId > 6) {
      throw new Error('Servo ID must be between 1 and 6');
    }
    await this._sendCommand(COMMAND_IDS.FOCUS_SERVO, [servoId]);
  }

  /**
   * Get current robot movement speed
   * @returns Promise that resolves with current speed
   */
  async getSpeed(): Promise<number> {
    return this._sendCommand<number>(COMMAND_IDS.GET_SPEED, null, true);
  }

  /**
   * Set robot movement speed
   * @param speed - Movement speed (0-100)
   * @returns Promise that resolves when command is sent
   */
  async setSpeed(speed: TMovementSpeed): Promise<void> {
    if (speed < 0 || speed > 100) {
      throw new Error('Speed must be between 0 and 100');
    }
    await this._sendCommand(COMMAND_IDS.SET_SPEED, [speed]);
  }

  /**
   * Get current angles of all six joints
   * @returns Promise that resolves with array of 6 angles in degrees
   */
  async getAngles(): Promise<TJointAngles> {
    return this._sendCommand<TJointAngles>(COMMAND_IDS.GET_ANGLES, null, true);
  }

  /**
   * Set angles for all six joints
   * @param angles - Array of 6 angles in degrees
   * @param speed - Movement speed (0-100)
   * @returns Promise that resolves when command is sent
   */
  async sendAngles(angles: TJointAngles, speed: TMovementSpeed): Promise<void> {
    if (angles.length !== 6) {
      throw new Error('Angles must be an array of exactly 6 numbers');
    }
    if (speed < 0 || speed > 100) {
      throw new Error('Speed must be between 0 and 100');
    }

    const data = [...angles, speed] as const;
    
    await this._sendCommand(COMMAND_IDS.SEND_ANGLES, data);
  }

  /**
   * Set angle for a single joint
   * @param jointId - Joint ID (1-6)
   * @param angle - Angle in degrees
   * @param speed - Movement speed (0-100)
   * @returns Promise that resolves when command is sent
   */
  async sendAngle(jointId: TJointId, angle: number, speed: TMovementSpeed): Promise<void> {
    if (jointId < 1 || jointId > 6) {
      throw new Error('Joint ID must be between 1 and 6');
    }
    if (speed < 0 || speed > 100) {
      throw new Error('Speed must be between 0 and 100');
    }

    const data = [jointId, angle, speed] as const;
    
    await this._sendCommand(COMMAND_IDS.SEND_ANGLE, data);
  }

  /**
   * Get current cartesian coordinates of the end-effector
   * @returns Promise that resolves with [x, y, z, rx, ry, rz]
   */
  async getCoords(): Promise<TCartesianCoords> {
    return this._sendCommand<TCartesianCoords>(COMMAND_IDS.GET_COORDS, null, true);
  }

  /**
   * Move end-effector to cartesian coordinates
   * @param coords - Array of 6 coordinates [x, y, z, rx, ry, rz]
   * @param speed - Movement speed (0-100)
   * @param mode - Interpolation mode (0: angular, 1: linear)
   * @returns Promise that resolves when command is sent
   */
  async sendCoords(coords: TCartesianCoords, speed: TMovementSpeed, mode: TInterpolationMode = 0): Promise<void> {
    if (coords.length !== 6) {
      throw new Error('Coordinates must be an array of exactly 6 numbers');
    }
    if (speed < 0 || speed > 100) {
      throw new Error('Speed must be between 0 and 100');
    }
    if (mode !== 0 && mode !== 1) {
      throw new Error('Mode must be 0 (angular) or 1 (linear)');
    }

    const data = [...coords, speed, mode] as const;
    
    await this._sendCommand(COMMAND_IDS.SEND_COORDS, data);
  }

  /**
   * Set a single coordinate value
   * @param coord - Coordinate index (1-6: x, y, z, rx, ry, rz)
   * @param value - Coordinate value
   * @param speed - Movement speed (0-100)
   * @returns Promise that resolves when command is sent
   */
  async sendCoord(coord: TCoordinateId, value: number, speed: TMovementSpeed): Promise<void> {
    if (coord < 1 || coord > 6) {
      throw new Error('Coordinate index must be between 1 and 6');
    }
    if (speed < 0 || speed > 100) {
      throw new Error('Speed must be between 0 and 100');
    }

    const data = [coord, value, speed] as const;
    
    await this._sendCommand(COMMAND_IDS.SEND_COORD, data);
  }

  /**
   * Pause current movement
   * @returns Promise that resolves when command is sent
   */
  async pause(): Promise<void> {
    await this._sendCommand(COMMAND_IDS.PAUSE);
  }

  /**
   * Resume paused movement
   * @returns Promise that resolves when command is sent
   */
  async resume(): Promise<void> {
    await this._sendCommand(COMMAND_IDS.RESUME);
  }

  /**
   * Stop current movement
   * @returns Promise that resolves when command is sent
   */
  async stop(): Promise<void> {
    await this._sendCommand(COMMAND_IDS.STOP);
  }

  /**
   * Check if robot is currently moving
   * @returns Promise that resolves with movement status
   */
  async isMoving(): Promise<boolean> {
    return this._sendCommand<boolean>(COMMAND_IDS.IS_MOVING, null, true);
  }

  /**
   * Check if robot is in target position
   * @returns Promise that resolves with position status
   */
  async isInPosition(): Promise<boolean> {
    return this._sendCommand<boolean>(COMMAND_IDS.IS_IN_POSITION, null, true);
  }

  /**
   * Set gripper state
   * @param state - Gripper state (0: open, 1: close)
   * @param speed - Gripper speed (0-100)
   * @returns Promise that resolves when command is sent
   */
  async setGripperState(state: TGripperState, speed: TMovementSpeed): Promise<void> {
    if (state !== 0 && state !== 1) {
      throw new Error('Gripper state must be 0 (open) or 1 (close)');
    }
    if (speed < 0 || speed > 100) {
      throw new Error('Speed must be between 0 and 100');
    }

    const data = [state, speed] as const;
    
    await this._sendCommand(COMMAND_IDS.SET_GRIPPER_STATE, data);
  }

  /**
   * Set gripper value (position)
   * @param value - Gripper position value
   * @param speed - Gripper speed (0-100)
   * @returns Promise that resolves when command is sent
   */
  async setGripperValue(value: number, speed: TMovementSpeed): Promise<void> {
    if (speed < 0 || speed > 100) {
      throw new Error('Speed must be between 0 and 100');
    }

    const data = [value, speed] as const;
    
    await this._sendCommand(COMMAND_IDS.SET_GRIPPER_VALUE, data);
  }

  /**
   * Initialize gripper
   * @returns Promise that resolves when command is sent
   */
  async setGripperIni(): Promise<void> {
    await this._sendCommand(COMMAND_IDS.SET_GRIPPER_INI);
  }

  /**
   * Get current gripper value
   * @returns Promise that resolves with gripper position value
   */
  async getGripperValue(): Promise<number> {
    return this._sendCommand<number>(COMMAND_IDS.GET_GRIPPER_VALUE, null, true);
  }

  /**
   * Check if gripper is moving
   * @returns Promise that resolves with movement status
   */
  async isGripperMoving(): Promise<TGripperMovementStatus> {
    return this._sendCommand<TGripperMovementStatus>(COMMAND_IDS.IS_GRIPPER_MOVING, null, true);
  }

  /**
   * Get encoder value for a specific joint
   * @param jointId - Joint ID (1-6)
   * @returns Promise that resolves with encoder value
   */
  async getEncoder(jointId: TJointId): Promise<TEncoderValue> {
    if (jointId < 1 || jointId > 6) {
      throw new Error('Joint ID must be between 1 and 6');
    }

    return this._sendCommand<TEncoderValue>(COMMAND_IDS.GET_ENCODER, [jointId], true);
  }

  /**
   * Get encoder values for all joints
   * @returns Promise that resolves with array of 6 encoder values
   */
  async getEncoders(): Promise<TEncoderValues> {
    return this._sendCommand<TEncoderValues>(COMMAND_IDS.GET_ENCODERS, null, true);
  }

  /**
   * Set encoder value for a specific joint
   * @param jointId - Joint ID (1-6)
   * @param value - Encoder value
   * @returns Promise that resolves when command is sent
   */
  async setEncoder(jointId: TJointId, value: number): Promise<void> {
    if (jointId < 1 || jointId > 6) {
      throw new Error('Joint ID must be between 1 and 6');
    }

    const data = [jointId, value] as const;
    
    await this._sendCommand(COMMAND_IDS.SET_ENCODER, data);
  }

  /**
   * Set encoder values for all joints
   * @param encoders - Array of 6 encoder values
   * @returns Promise that resolves when command is sent
   */
  async setEncoders(encoders: TEncoderValues): Promise<void> {
    if (encoders.length !== 6) {
      throw new Error('Encoders must be an array of exactly 6 numbers');
    }

    await this._sendCommand(COMMAND_IDS.SET_ENCODERS, encoders);
  }
}

export default MyCobotController;
