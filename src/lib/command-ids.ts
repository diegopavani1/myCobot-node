/**
 * Command IDs (Genre) for myCobot serial protocol communication
 * These hexadecimal values correspond to specific robot operations
 */

export const COMMAND_IDS = {
  SOFTWARE_VERSION: 0x02,
  GET_ANGLES: 0x20,
  SEND_ANGLES: 0x22,
  SEND_ANGLE: 0x21,
  GET_COORDS: 0x23,
  SEND_COORD: 0x24,
  SEND_COORDS: 0x25,
  PAUSE: 0x26,
  RESUME: 0x28,
  STOP: 0x29,
  IS_IN_POSITION: 0x2A,
  IS_MOVING: 0x2B,
  POWER_ON: 0x10,
  POWER_OFF: 0x11,
  IS_POWER_ON: 0x12,
  RELEASE_ALL_SERVOS: 0x13,
  IS_SERVO_ENABLE: 0x50,
  RELEASE_SERVO: 0x56,
  FOCUS_SERVO: 0x57,
  GET_SPEED: 0x40,
  SET_SPEED: 0x41,
  GET_GRIPPER_VALUE: 0x65,
  SET_GRIPPER_STATE: 0x66,
  SET_GRIPPER_VALUE: 0x67,
  SET_GRIPPER_INI: 0x68,
  IS_GRIPPER_MOVING: 0x69,
  JOG_ANGLE: 0x30,
  JOG_COORD: 0x32,
  SET_ENCODER: 0x3A,
  GET_ENCODER: 0x3B,
  SET_ENCODERS: 0x3C,
  GET_ENCODERS: 0x3D,
} as const;

export const PROTOCOL = {
  HEADER: 0xFE,
  FOOTER: 0xFA,
  HEADER_SIZE: 2,
  FOOTER_SIZE: 1,
  LENGTH_SIZE: 1,
  COMMAND_ID_SIZE: 1,
  MIN_PACKET_SIZE: 5,
} as const;

export type TCommandId = typeof COMMAND_IDS[keyof typeof COMMAND_IDS];
export type TJointAngles = readonly [number, number, number, number, number, number];
export type TCartesianCoords = readonly [number, number, number, number, number, number];
export type TGripperState = 0 | 1;
export type TMovementSpeed = number;
export type TJointId = 1 | 2 | 3 | 4 | 5 | 6;
export type TCoordinateId = 1 | 2 | 3 | 4 | 5 | 6;
export type TInterpolationMode = 0 | 1;

export default COMMAND_IDS;

