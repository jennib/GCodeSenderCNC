
import React from 'react';
import Tooltip from './Tooltip.js';

const h = React.createElement;

const GCODE_DEFINITIONS = {
    // G-Codes
    'G0': { name: 'Rapid Move', desc: 'Moves at maximum speed to a specified point. Used for non-cutting moves.' },
    'G1': { name: 'Linear Move', desc: 'Moves in a straight line at a specified feed rate (F). Used for cutting.' },
    'G2': { name: 'Clockwise Arc', desc: 'Creates a clockwise circular or helical motion.' },
    'G3': { name: 'Counter-Clockwise Arc', desc: 'Creates a counter-clockwise circular or helical motion.' },
    'G4': { name: 'Dwell', desc: 'Pauses the machine for a specified amount of time (P).' },
    'G10': { name: 'Set Work Coordinate Offset', desc: 'Sets the work coordinate system offsets.' },
    'G17': { name: 'XY Plane Select', desc: 'Sets the active plane for circular interpolation to XY.' },
    'G18': { name: 'XZ Plane Select', desc: 'Sets the active plane for circular interpolation to XZ.' },
    'G19': { name: 'YZ Plane Select', desc: 'Sets the active plane for circular interpolation to YZ.' },
    'G20': { name: 'Inches for Units', desc: 'Sets the machine units to inches.' },
    'G21': { name: 'Millimeters for Units', desc: 'Sets the machine units to millimeters.' },
    'G28': { name: 'Return to Home', desc: 'Returns the machine to its home position (machine zero).' },
    'G30': { name: 'Return to Secondary Home', desc: 'Returns to a secondary, user-defined home position.' },
    'G53': { name: 'Move in Machine Coordinates', desc: 'Temporarily overrides work offsets to move in the machine\'s native coordinate system.' },
    'G54': { name: 'Work Coordinate System 1', desc: 'Selects the first work coordinate system (WCS).' },
    'G55': { name: 'Work Coordinate System 2', desc: 'Selects the second work coordinate system (WCS).' },
    'G90': { name: 'Absolute Positioning', desc: 'Interprets all coordinates as absolute positions from the origin.' },
    'G91': { name: 'Incremental Positioning', desc: 'Interprets all coordinates as relative distances from the current position.' },
    'G92': { name: 'Set Position', desc: 'Sets the current position to a specified value, creating a temporary offset.' },
    'G94': { name: 'Units per Minute Feed Rate', desc: 'Sets the feed rate mode to units per minute.' },

    // M-Codes
    'M0': { name: 'Program Stop', desc: 'Stops the program. Requires user intervention to continue.' },
    'M1': { name: 'Optional Stop', desc: 'Stops the program if the optional stop switch on the machine is enabled.' },
    'M2': { name: 'End of Program', desc: 'Ends the program and resets the machine.' },
    'M3': { name: 'Spindle On, Clockwise', desc: 'Starts the spindle rotating clockwise at a specified speed (S).' },
    'M4': { name: 'Spindle On, Counter-Clockwise', desc: 'Starts the spindle rotating counter-clockwise at a specified speed (S).' },
    'M5': { name: 'Spindle Stop', desc: 'Stops the spindle from rotating.' },
    'M6': { name: 'Tool Change', desc: 'Initiates an automatic tool change sequence.' },
    'M8': { name: 'Coolant On (Flood)', desc: 'Turns on the flood coolant system.' },
    'M9': { name: 'Coolant Off', desc: 'Turns off all coolant systems.' },
    'M30': { name: 'Program End and Reset', desc: 'Ends the program and resets to the beginning. Similar to M2.' }
};

const PARAMETER_DEFINITIONS = {
    'X': 'X-Axis Coordinate',
    'Y': 'Y-Axis Coordinate',
    'Z': 'Z-Axis Coordinate',
    'F': 'Feed Rate (speed of cutting motion)',
    'S': 'Spindle Speed (in RPM)',
    'I': 'Arc Center X-offset (for G2/G3)',
    'J': 'Arc Center Y-offset (for G2/G3)',
    'P': 'Dwell Time or Parameter for G10/G92',
    'T': 'Tool Number (for M6)',
};

const GCodeLine = ({ line, lineNumber, isExecuted, isCurrent }) => {
    const parts = [];
    let lastIndex = 0;
    // Regex to find G/M codes, parameters with values, and comments
    const tokenRegex = /([GgMm]\d+(?:\.\d+)?)|([XxYyZzIiJjFfSsPpTt]\s*[-+]?\d+(?:\.\d+)?)|(;.*)|(\(.*\))/g;
    
    let match;
    while ((match = tokenRegex.exec(line)) !== null) {
        // Add text before the match
        if (match.index > lastIndex) {
            parts.push(line.substring(lastIndex, match.index));
        }

        const token = match[0];
        const upperToken = token.toUpperCase();
        let el = null;

        if (match[1]) { // G/M Code
            const code = upperToken.match(/[GgMm]\d+/)[0];
            const definition = GCODE_DEFINITIONS[code];
            if (definition) {
                el = h(Tooltip, {
                    title: `${code}: ${definition.name}`,
                    content: definition.desc
                }, h('span', { className: "text-purple-400 font-bold cursor-help" }, token));
            } else {
                el = h('span', { className: "text-purple-400 font-bold" }, token);
            }
        } else if (match[2]) { // Parameter
            const param = upperToken[0];
            const definition = PARAMETER_DEFINITIONS[param];
            if (definition) {
                 el = h(Tooltip, {
                    content: definition
                }, h('span', { className: "text-green-400 cursor-help" }, token));
            } else {
                 el = h('span', { className: "text-green-400" }, token);
            }
        } else if (match[3] || match[4]) { // Comment
            el = h('span', { className: "text-slate-500" }, token);
        }

        if (el) {
            parts.push(el);
        }
        lastIndex = match.index + token.length;
    }

    // Add remaining text after the last match
    if (lastIndex < line.length) {
        parts.push(line.substring(lastIndex));
    }
    
    const lineClasses = `flex rounded-sm hover:bg-white/5 transition-colors duration-100 ${isCurrent ? 'bg-primary/30' : isExecuted ? 'bg-primary/10' : ''}`;
    const lineNumberClasses = `w-12 text-right pr-4 select-none flex-shrink-0 ${isCurrent ? 'text-accent-red font-bold' : 'text-text-secondary'}`;

    return h('div', { className: lineClasses },
        h('span', { className: lineNumberClasses }, lineNumber),
        h('code', { className: 'whitespace-pre' }, parts)
    );
};

export default GCodeLine;
