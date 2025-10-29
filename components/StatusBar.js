import React from 'react';
import { PowerOff, RotateCw, RotateCcw, OctagonAlert } from './Icons.js';

const h = React.createElement;

const StatusIndicator = ({ isConnected, machineState }) => {
    const getStatusIndicatorClass = () => {
        if (!isConnected) return 'bg-accent-yellow/20 text-accent-yellow';
        if (machineState?.status === 'Alarm') return 'bg-accent-red/20 text-accent-red';
        return 'bg-accent-green/20 text-accent-green';
    };

    const statusText = isConnected 
        ? (machineState?.status === 'Home' ? 'Homing' : machineState?.status || 'Connected') 
        : 'Disconnected';

    return h('div', { className: "flex items-center gap-2" },
        h('span', { className: "font-semibold text-sm text-text-secondary" }, "Status:"),
        h('span', { className: `px-3 py-1 text-sm rounded-full font-bold ${getStatusIndicatorClass()}` },
            statusText
        )
    );
};

const SpindleStatusIndicator = ({ machineState, isConnected }) => {
    if (!isConnected) {
        return h('div', { className: "flex items-center gap-2 text-sm text-text-secondary" },
            h(PowerOff, { className: "w-5 h-5" }),
            h('span', null, "Spindle Off")
        );
    }

    const spindleState = machineState?.spindle?.state || 'off';
    const spindleSpeed = machineState?.spindle?.speed || 0;

    if (spindleState === 'off' || spindleSpeed === 0) {
        return h('div', { className: "flex items-center gap-2 text-sm text-text-secondary" },
            h(PowerOff, { className: "w-5 h-5" }),
            h('span', null, "Spindle Off")
        );
    }
    
    const icon = spindleState === 'cw' 
        ? h(RotateCw, { className: "w-5 h-5 text-accent-green animate-spin-slow" })
        : h(RotateCcw, { className: "w-5 h-5 text-accent-green animate-spin-slow-reverse" });

    return h('div', { className: "flex items-center gap-2 text-sm text-text-primary" },
        icon,
        h('div', { className: 'flex flex-col leading-tight' },
            h('span', { className: 'font-bold' }, `${spindleSpeed.toLocaleString()} RPM`),
            h('span', { className: 'text-xs text-text-secondary' }, spindleState === 'cw' ? 'Clockwise' : 'Counter-CW')
        )
    );
};

const formatCoordinate = (val) => val?.toFixed(3) ?? '0.000';

const PositionDisplay = ({ title, pos, unit }) => {
    return h('div', { className: "flex items-center gap-3" },
        h('h4', { className: "text-sm font-bold text-text-secondary" }, title),
        h('div', { className: "flex gap-3 text-center font-mono bg-background px-2 py-1 rounded-md text-sm" },
            h('div', null, h('span', { className: "font-bold text-red-400" }, "X "), h('span', { className: "text-text-primary" }, formatCoordinate(pos?.x))),
            h('div', null, h('span', { className: "font-bold text-green-400" }, "Y "), h('span', { className: "text-text-primary" }, formatCoordinate(pos?.y))),
            h('div', null, h('span', { className: "font-bold text-blue-400" }, "Z "), h('span', { className: "text-text-primary" }, formatCoordinate(pos?.z))),
            h('span', { className: 'text-xs text-text-secondary ml-1 self-center' }, unit)
        )
    );
};

const StatusBar = ({ isConnected, machineState, unit, onEmergencyStop, flashingButton }) => {
    return h('div', { className: "bg-surface/50 border-b border-t border-secondary shadow-sm p-2 flex justify-between items-center z-10 flex-shrink-0 gap-4" },
        h('div', { className: 'flex items-center gap-6' },
            h(StatusIndicator, { isConnected, machineState }),
            h('div', { className: "h-6 border-l border-secondary" }),
            h(SpindleStatusIndicator, { isConnected, machineState }),
        ),
        h('div', { className: 'flex items-center gap-6' },
            h(PositionDisplay, { title: "WPos", pos: machineState?.wpos, unit }),
            h('div', { className: "h-6 border-l border-secondary" }),
            h(PositionDisplay, { title: "MPos", pos: machineState?.mpos, unit }),
        ),
        h('div', {},
             isConnected && h('button', {
                onClick: onEmergencyStop,
                className: `flex items-center gap-2 px-3 py-2 bg-red-600 text-white font-bold rounded-md hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-surface transition-all duration-100 animate-pulse ${flashingButton === 'estop' ? 'ring-4 ring-white ring-inset' : ''}`,
                title: "Emergency Stop (Soft Reset) (Hotkey: Esc)"
            },
                h(OctagonAlert, { className: "w-5 h-5" }),
                h('span', { className: "hidden md:inline" }, "E-STOP")
            )
        )
    );
};

export default StatusBar;
