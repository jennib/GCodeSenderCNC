
import React from 'react';
import { Power, PowerOff, Radio } from './Icons.js';

const h = React.createElement;

const SerialConnector = ({
    isConnected,
    isSimulated,
    portInfo,
    onConnect,
    onDisconnect,
    isApiSupported,
    useSimulator,
    onSimulatorChange
}) => {
    return h('div', { className: "flex items-center gap-4" },
        h('div', { className: "flex items-center gap-2" },
            h('input', {
                type: "checkbox",
                id: "simulator-checkbox",
                checked: useSimulator,
                onChange: (e) => onSimulatorChange(e.target.checked),
                disabled: isConnected,
                className: "h-4 w-4 rounded border-secondary text-primary focus:ring-primary disabled:opacity-50"
            }),
            h('label', { htmlFor: "simulator-checkbox", className: `text-sm ${isConnected ? 'text-text-secondary' : ''}` },
                "Use Simulator"
            )
        ),
        isConnected ?
            h('div', { className: "flex items-center gap-2 text-accent-green" },
                h(Radio, { className: "w-5 h-5 animate-pulse" }),
                h('span', { className: "text-sm font-medium" }, `Connected ${isSimulated ? '(Simulated)' : ''}`),
                portInfo && !isSimulated && h('span', { className: "text-xs text-text-secondary" },
                    `(VID: ${portInfo.usbVendorId}, PID: ${portInfo.usbProductId})`
                )
            ) :
            h('div', { className: "flex items-center gap-2 text-accent-yellow" },
                h(Radio, { className: "w-5 h-5" }),
                h('span', { className: "text-sm font-medium" }, "Disconnected")
            ),
        isConnected ?
            h('button', {
                onClick: onDisconnect,
                className: "flex items-center gap-2 px-4 py-2 bg-accent-red text-white font-semibold rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-background transition-colors"
            },
                h(PowerOff, { className: "w-5 h-5" }),
                "Disconnect"
            ) :
            h('button', {
                onClick: onConnect,
                disabled: !isApiSupported && !useSimulator,
                className: "flex items-center gap-2 px-4 py-2 bg-primary text-white font-semibold rounded-md hover:bg-primary-focus focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background transition-colors disabled:bg-secondary disabled:cursor-not-allowed"
            },
                h(Power, { className: "w-5 h-5" }),
                "Connect"
            )
    );
};

export default SerialConnector;
