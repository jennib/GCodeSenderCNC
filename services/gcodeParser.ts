
export interface GCodePoint {
    x: number;
    y: number;
    z: number;
}

export interface GCodeSegment {
    type: 'G0' | 'G1' | 'G2' | 'G3';
    start: GCodePoint;
    end: GCodePoint;
    center?: GCodePoint;
    clockwise?: boolean;
    line: number;
}

export interface ParsedGCode {
    segments: GCodeSegment[];
    bounds: {
        minX: number;
        maxX: number;
        minY: number;
        maxY: number;
        minZ: number;
        maxZ: number;
    };
}
