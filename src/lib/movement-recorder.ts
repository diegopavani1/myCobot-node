import { performance } from 'perf_hooks';
import fs from 'fs/promises';
import type { MyCobotController } from './mycobot-controller.js';
import type { TJointAngles, TCartesianCoords, TMovementSpeed } from './command-ids.js';

/**
 * Recording mode type
 */
export type TRecordingMode = 'angles' | 'coords';

/**
 * Recording position data (can be either joint angles or cartesian coordinates)
 */
export type TRecordingPosition = TJointAngles | TCartesianCoords;

/**
 * Single recorded frame
 */
export interface IMovementFrame {
  /** Timestamp relative to recording start in milliseconds */
  readonly timestamp: number;
  /** Robot position (angles or coordinates depending on recording mode) */
  readonly position: TRecordingPosition;
  /** Recording mode used for this frame */
  readonly mode: TRecordingMode;
}

/**
 * Recording metadata
 */
export interface IRecordingMetadata {
  /** ISO string timestamp when recording was made */
  readonly recordedAt: string;
  /** Total duration of recording in milliseconds */
  readonly duration: number;
  /** Total number of frames captured */
  readonly frameCount: number;
  /** Sample rate used for recording in Hz */
  readonly sampleRate: number;
  /** Recording mode used */
  readonly recordingMode: TRecordingMode;
  /** Additional custom metadata */
  readonly [key: string]: unknown;
}

/**
 * Complete recording data structure
 */
export interface IRecordingData {
  /** Recording metadata */
  readonly metadata: IRecordingMetadata;
  /** Array of recorded frames */
  readonly frames: readonly IMovementFrame[];
}

/**
 * Recording file information
 */
export interface IRecordingFileInfo {
  /** Filename without path */
  readonly filename: string;
  /** Full file path */
  readonly path: string;
  /** Recording metadata */
  readonly metadata: IRecordingMetadata;
  /** Number of frames in recording */
  readonly frameCount: number;
}

/**
 * Movement recorder configuration options
 */
export interface IMovementRecorderOptions {
  /** Recording sample rate in Hz (default: 20) */
  readonly sampleRate?: number;
  /** Recording mode: 'angles' or 'coords' (default: 'angles') */
  readonly recordingMode?: TRecordingMode;
}

/**
 * Playback configuration options
 */
export interface IPlaybackOptions {
  /** Playback speed multiplier (default: 1.0) */
  readonly speed?: number;
  /** Robot movement speed for each frame (default: 100) */
  readonly moveSpeed?: TMovementSpeed;
  /** Whether to loop the playback (default: false) */
  readonly loop?: boolean;
}

/**
 * Recording metadata return type from stopRecording
 */
export interface IRecordingResult {
  /** Total recording duration in milliseconds */
  readonly duration: number;
  /** Number of frames captured */
  readonly frameCount: number;
  /** Sample rate used */
  readonly sampleRate: number;
  /** Recording mode used */
  readonly recordingMode: TRecordingMode;
  /** Average frame rate achieved */
  readonly averageFrameRate: number;
}

/**
 * Current recorder status
 */
export interface IRecorderStatus {
  /** Whether recording is currently active */
  readonly isRecording: boolean;
  /** Whether playback is currently active */
  readonly isPlaying: boolean;
  /** Configured sample rate */
  readonly sampleRate: number;
  /** Configured recording mode */
  readonly recordingMode: TRecordingMode;
  /** Number of frames in current recording */
  readonly currentFrameCount: number;
  /** Current recording duration (if recording) */
  readonly recordingDuration: number;
}

/**
 * Movement Recorder Class
 * Handles recording and playback of robot movements using temporal sampling
 * Implements "teach by demonstration" functionality
 */
export class MovementRecorder {
  private readonly robot: MyCobotController;
  private readonly sampleRate: number;
  private readonly recordingMode: TRecordingMode;
  
  private readonly recordingInterval: number; // ms
  private isRecording = false;
  private isPlaying = false;
  private recordingStartTime = 0;
  private currentRecording: IMovementFrame[] = [];
  private recordingTimer: NodeJS.Timeout | null = null;

  /**
   * Creates a new MovementRecorder instance
   * @param robot - The robot controller instance
   * @param options - Recording options
   */
  constructor(robot: MyCobotController, options: IMovementRecorderOptions = {}) {
    this.robot = robot;
    this.sampleRate = options.sampleRate ?? 20; // Hz
    this.recordingMode = options.recordingMode ?? 'angles';
    
    this.recordingInterval = 1000 / this.sampleRate; // ms
  }

  /**
   * Start recording robot movements
   * @returns Promise that resolves when recording starts
   */
  async startRecording(): Promise<void> {
    if (this.isRecording) {
      throw new Error('Recording already in progress');
    }
    if (this.isPlaying) {
      throw new Error('Cannot record while playing back a movement');
    }

    console.log(`Starting movement recording in ${this.recordingMode} mode...`);
    console.log(`Sample rate: ${this.sampleRate} Hz (${this.recordingInterval}ms interval)`);
    
    this.currentRecording = [];
    
    await this.robot.releaseAllServos();
    
    this.isRecording = true;
    this.recordingStartTime = performance.now();
    
    this._startRecordingLoop();
    
    console.log('Recording started. Move the robot manually to teach the movement.');
    console.log('Call stopRecording() when finished.');
  }

  /**
   * Stop recording robot movements
   * @returns Promise that resolves with recording metadata
   */
  async stopRecording(): Promise<IRecordingResult> {
    if (!this.isRecording) {
      throw new Error('No recording in progress');
    }

    this._stopRecordingLoop();
    this.isRecording = false;
    
    const recordingDuration = performance.now() - this.recordingStartTime;
    const frameCount = this.currentRecording.length;
    
    console.log(`Recording stopped. Captured ${frameCount} frames in ${(recordingDuration / 1000).toFixed(2)}s`);
    
    await this.robot.powerOn();
    
    return {
      duration: recordingDuration,
      frameCount,
      sampleRate: this.sampleRate,
      recordingMode: this.recordingMode,
      averageFrameRate: frameCount / (recordingDuration / 1000),
    };
  }

  /**
   * Start the recording loop
   */
  private _startRecordingLoop(): void {
    const recordFrame = async (): Promise<void> => {
      if (!this.isRecording) {
        return;
      }

      try {
        const currentTime = performance.now() - this.recordingStartTime;
        let position: TRecordingPosition;

        if (this.recordingMode === 'angles') {
          position = await this.robot.getAngles();
        } else if (this.recordingMode === 'coords') {
          position = await this.robot.getCoords();
        } else {
          throw new Error(`Invalid recording mode: ${this.recordingMode}`);
        }

        const frame: IMovementFrame = {
          timestamp: currentTime,
          position,
          mode: this.recordingMode,
        };

        this.currentRecording.push(frame);

        this.recordingTimer = setTimeout(() => {
          void recordFrame();
        }, this.recordingInterval);
      } catch (error) {
        console.error('Error during recording frame capture:', (error as Error).message);
        
        this.recordingTimer = setTimeout(() => {
          void recordFrame();
        }, this.recordingInterval);
      }
    };

    void recordFrame();
  }

  /**
   * Stop the recording loop
   */
  private _stopRecordingLoop(): void {
    if (this.recordingTimer) {
      clearTimeout(this.recordingTimer);
      this.recordingTimer = null;
    }
  }

  /**
   * Save the current recording to a file
   * @param filename - The filename to save to
   * @param metadata - Additional metadata to include
   * @returns Promise that resolves when file is saved
   */
  async saveRecording(filename: string, metadata: Record<string, unknown> = {}): Promise<void> {
    if (this.currentRecording.length === 0) {
      throw new Error('No recording to save. Record a movement first.');
    }

    const recordingData: IRecordingData = {
      metadata: {
        recordedAt: new Date().toISOString(),
        duration: this.currentRecording[this.currentRecording.length - 1]?.timestamp ?? 0,
        frameCount: this.currentRecording.length,
        sampleRate: this.sampleRate,
        recordingMode: this.recordingMode,
        ...metadata,
      },
      frames: this.currentRecording,
    };

    try {
      await fs.writeFile(filename, JSON.stringify(recordingData, null, 2), 'utf8');
      console.log(`Recording saved to ${filename}`);
      console.log(`Frames: ${recordingData.frames.length}, Duration: ${(recordingData.metadata.duration / 1000).toFixed(2)}s`);
    } catch (error) {
      throw new Error(`Failed to save recording: ${(error as Error).message}`);
    }
  }

  /**
   * Load a recording from a file
   * @param filename - The filename to load from
   * @returns Promise that resolves with recording data
   */
  async loadRecording(filename: string): Promise<IRecordingData> {
    try {
      const fileContent = await fs.readFile(filename, 'utf8');
      const recordingData = JSON.parse(fileContent) as IRecordingData;

      if (!recordingData.frames || !Array.isArray(recordingData.frames)) {
        throw new Error('Invalid recording file format: missing frames array');
      }

      if (recordingData.frames.length === 0) {
        throw new Error('Recording file contains no frames');
      }

      // Validate frame structure
      const firstFrame = recordingData.frames[0];
      
      if (typeof firstFrame?.timestamp !== 'number' || !Array.isArray(firstFrame.position)) {
        throw new Error('Invalid recording file format: invalid frame structure');
      }

      console.log(`Loaded recording from ${filename}`);
      console.log(`Frames: ${recordingData.frames.length}, Mode: ${recordingData.metadata?.recordingMode ?? 'unknown'}`);
      
      return recordingData;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new Error(`Recording file not found: ${filename}`);
      }
      throw new Error(`Failed to load recording: ${(error as Error).message}`);
    }
  }

  /**
   * Play back a recorded movement
   * @param recording - Filename string or recording data object
   * @param options - Playback options
   * @returns Promise that resolves when playback completes
   */
  async playRecording(recording: string | IRecordingData, options: IPlaybackOptions = {}): Promise<void> {
    if (this.isRecording) {
      throw new Error('Cannot play while recording');
    }
    if (this.isPlaying) {
      throw new Error('Playback already in progress');
    }

    const {
      speed = 1.0,
      moveSpeed = 100,
      loop = false,
    } = options;

    // Load recording if filename provided
    let recordingData: IRecordingData;
    
    if (typeof recording === 'string') {
      recordingData = await this.loadRecording(recording);
    } else if (typeof recording === 'object' && recording.frames) {
      recordingData = recording;
    } else {
      throw new Error('Invalid recording parameter: must be filename or recording data object');
    }

    console.log('Starting playback...');
    console.log(`Speed: ${speed}x, Move Speed: ${moveSpeed}, Loop: ${loop}`);
    
    // Power on servos for movement
    await this.robot.powerOn();
    await new Promise((resolve) => setTimeout(resolve, 1000));

    this.isPlaying = true;

    try {
      do {
        await this._playRecordingOnce(recordingData, speed, moveSpeed);
        
        if (loop && this.isPlaying) {
          console.log('Looping playback...');
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      } while (loop && this.isPlaying);
    } finally {
      this.isPlaying = false;
    }

    console.log('Playback completed.');
  }

  /**
   * Play back a recording once
   * @param recordingData - Recording data
   * @param speed - Playback speed multiplier
   * @param moveSpeed - Robot movement speed
   */
  private async _playRecordingOnce(recordingData: IRecordingData, speed: number, moveSpeed: TMovementSpeed): Promise<void> {
    const { frames } = recordingData;
    const { recordingMode } = recordingData.metadata;

    for (let i = 0; i < frames.length && this.isPlaying; i += 1) {
      const frame = frames[i];

      if (!frame) {
        continue;
      }

      try {
        // Send movement command
        if (recordingMode === 'angles') {
          await this.robot.sendAngles(frame.position as TJointAngles, moveSpeed);
        } else if (recordingMode === 'coords') {
          await this.robot.sendCoords(frame.position as TCartesianCoords, moveSpeed, 1); // Linear interpolation for coords
        } else {
          console.warn(`Unknown recording mode: ${recordingMode}, treating as angles`);
          await this.robot.sendAngles(frame.position as TJointAngles, moveSpeed);
        }

        // Calculate delay to next frame
        if (i < frames.length - 1) {
          const currentFrame = frames[i];
          const nextFrame = frames[i + 1];
          
          if (currentFrame && nextFrame) {
            const originalDelay = nextFrame.timestamp - currentFrame.timestamp;
            const adjustedDelay = originalDelay / speed;

            if (adjustedDelay > 0) {
              await new Promise((resolve) => setTimeout(resolve, adjustedDelay));
            }
          }
        }
      } catch (error) {
        console.error(`Error playing frame ${i}:`, (error as Error).message);
        
        // Continue playback despite errors
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
    }
  }

  /**
   * Stop current playback
   * @returns Promise that resolves when playback stops
   */
  async stopPlayback(): Promise<void> {
    if (!this.isPlaying) {
      console.log('No playback in progress');
      
      return;
    }

    console.log('Stopping playback...');
    this.isPlaying = false;
    
    // Wait a moment for the playback loop to recognize the stop signal
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  /**
   * Get current recording status
   * @returns Status information
   */
  getStatus(): IRecorderStatus {
    return {
      isRecording: this.isRecording,
      isPlaying: this.isPlaying,
      sampleRate: this.sampleRate,
      recordingMode: this.recordingMode,
      currentFrameCount: this.currentRecording.length,
      recordingDuration: this.isRecording 
        ? performance.now() - this.recordingStartTime 
        : 0,
    };
  }

  /**
   * Get the current recording data (if any)
   * @returns Current recording frames
   */
  getCurrentRecording(): readonly IMovementFrame[] {
    return [...this.currentRecording]; // Return a copy to prevent external modification
  }

  /**
   * Clear the current recording
   */
  clearRecording(): void {
    if (this.isRecording) {
      throw new Error('Cannot clear recording while recording is in progress');
    }
    
    this.currentRecording = [];
    console.log('Current recording cleared');
  }

  /**
   * List available recording files in a directory
   * @param directory - Directory to search (default: current directory)
   * @returns Promise that resolves with array of recording file info
   */
  async listRecordings(directory = '.'): Promise<IRecordingFileInfo[]> {
    try {
      const files = await fs.readdir(directory);
      const recordings: IRecordingFileInfo[] = [];

      for (const file of files) {
        if (file.endsWith('.json')) {
          try {
            const recordingData = await this.loadRecording(`${directory}/${file}`);
            
            recordings.push({
              filename: file,
              path: `${directory}/${file}`,
              metadata: recordingData.metadata,
              frameCount: recordingData.frames.length,
            });
          } catch (error) {
            // Skip files that aren't valid recordings
            console.warn(`Skipping ${file}: not a valid recording file`);
          }
        }
      }

      return recordings.sort((a, b) => a.filename.localeCompare(b.filename));
    } catch (error) {
      throw new Error(`Failed to list recordings: ${(error as Error).message}`);
    }
  }
}

export default MovementRecorder;

