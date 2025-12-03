import { ProgramNode, Waypoint } from '@universal-robots/contribution-api';

export interface EllipsePgNode extends ProgramNode {
    type: string;
    parameters: {
        waypoint: Waypoint,
        isDefined: boolean;
    };
    lockChildren?: boolean;
    allowsChildren?: boolean;
}

export const waypoint_empty: Waypoint = {
    frame: 'base',
    pose: {
        orientation: [0, 0, 0],
        position: [0, 0, 0]

    },
    qNear: {
        base: 0,
        elbow: 0,
        shoulder: 0,
        wrist1: 0,
        wrist2: 0,
        wrist3: 0,
    }
}

export const NUMBER_OF_WAYPOINTS = 16;
export const HORIZONTAL_RADIUS_IN_M = 0.200;
export const VERTICAL_RADIUS_IN_M = 0.120;
export const SHARED_TOOL_SPEED_IN_M_S = 0.25;
export const SHARED_TOOL_ACCELERATION_IN_M_S2 = 1.2;
export const SHARED_BLEND_RADIUS_IN_M = 0.003;
export const ANGULAR_STEP_DISTANCE = (2 * Math.PI) / NUMBER_OF_WAYPOINTS;
