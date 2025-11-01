
export enum JobStatus {
    Idle = 'idle',
    Running = 'running',
    Paused = 'paused',
    Stopped = 'stopped',
    Complete = 'complete',
}

export interface PortInfo {
    usbVendorId?: number;
    usbProductId?: number;
}

export interface ConsoleLog {
    type: 'sent' | 'received' | 'status' | 'error';
    message: string;
}

export interface MachinePosition {
    x: number;
    y: number;
    z: number;
}

export interface SpindleState {
    state: 'cw' | 'ccw' | 'off';
    speed: number;
}

export interface MachineState {
    status: 'Idle' | 'Run' | 'Hold' | 'Jog' | 'Alarm' | 'Door' | 'Check' | 'Home' | 'Sleep' | string;
    code: number | null;
    wpos: MachinePosition;
    mpos: MachinePosition;
    wco?: MachinePosition;
    spindle: SpindleState;
    ov: [number, number, number];
}

export interface Macro {
    name: string;
    commands: string[];
}

export interface MachineSettings {
    workArea: { x: number; y: number; z: number };
    spindle: { min: number; max: number };
    probe: { xOffset: number; yOffset: number; zOffset: number; feedRate: number; };
    scripts: {
        startup: string;
        /** G-code to execute for an automatic tool change. Use {T} as a placeholder for the tool number. */
        automaticToolChange: string;
        /** G-code to execute before pausing for a manual tool change (e.g., raise Z, stop spindle). Use {T} as a placeholder for the tool number. Do not include M0. */
        manualToolChange: string;
        shutdown: string;
    };
}

export interface Tool {
    id: number;
    name: string;
    diameter: number;
    position?: number;
}

export interface GCodeAnalysisWarning {
    type: 'error' | 'warning';
    message: string;
}

export interface GCodeTimeEstimate {
    totalSeconds: number;
    cumulativeSeconds: number[];
}

export interface Notification {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
  timerId?: number;
}