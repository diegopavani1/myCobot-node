/**
 * myCobot Controller Library
 * A comprehensive Node.js library for controlling the myCobot 280 M5 robotic arm
 */

export { MyCobotController } from './mycobot-controller.js';
export type { 
  IMyCobotControllerOptions, 
  TPowerStatus, 
  TGripperMovementStatus, 
  TEncoderValue, 
  TEncoderValues 
} from './mycobot-controller.js';

export { MovementRecorder } from './movement-recorder.js';
export type {
  TRecordingMode,
  TRecordingPosition,
  IMovementFrame,
  IRecordingMetadata,
  IRecordingData,
  IRecordingFileInfo,
  IMovementRecorderOptions,
  IPlaybackOptions,
  IRecordingResult,
  IRecorderStatus
} from './movement-recorder.js';

export { COMMAND_IDS, PROTOCOL } from './command-ids.js';
export type {
  TCommandId,
  TJointAngles,
  TCartesianCoords,
  TGripperState,
  TMovementSpeed,
  TJointId,
  TCoordinateId,
  TInterpolationMode
} from './command-ids.js';

// Default export for convenience
export { MyCobotController as default } from './mycobot-controller.js';

