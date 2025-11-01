

import React, { useState, useRef, useEffect } from 'react';
import { Send, ChevronRight, ChevronsLeft, ChevronsRight, Info, AlertTriangle, Maximize, Minimize } from './Icons.js';

const h = React.createElement;

const Console = ({ logs, onSendCommand, isConnected, isJobActive, isMacroRunning, isLightMode, isVerbose, onVerboseChange }) => {
    const [command, setCommand] = useState('');
    const [isFullscreen, setIsFullscreen] = useState(false);
    const logContainerRef = useRef(null);

    useEffect(() => {
        if (logContainerRef.current) {
            logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
        }
    }, [logs, isFullscreen]); // Re-check scroll on fullscreen toggle

    const handleSend = (e) => {
        e.preventDefault();
        if (command.trim() && isConnected && !isJobActive && !isMacroRunning) {
            onSendCommand(command.trim());
            setCommand('');
        }
    };

    const getLogColor = (type) => {
        if (isLightMode) {
            switch (type) {
                case 'sent': return 'text-blue-700';
                case 'received': return 'text-green-700';
                case 'status': return 'text-orange-600';
                case 'error': return 'text-red-700';
                default: return 'text-gray-600';
            }
        }
        switch (type) {
            case 'sent': return 'text-blue-400';
            case 'received': return 'text-green-400';
            case 'status': return 'text-yellow-400';
            case 'error': return 'text-red-400';
            default: return 'text-text-secondary';
        }
    };

    const getLogIcon = (type) => {
        const iconProps = { className: "w-4 h-4 mr-2 flex-shrink-0" };
        switch (type) {
            case 'sent': return h(ChevronsRight, iconProps);
            case 'received': return h(ChevronsLeft, iconProps);
            case 'status': return h(Info, iconProps);
            case 'error': return h(AlertTriangle, iconProps);
            default: return null;
        }
    };
    
    const containerClasses = isFullscreen
        ? "fixed inset-0 z-50 bg-surface p-4 flex flex-col"
        : "bg-surface rounded-lg shadow-lg flex flex-col p-4 flex-grow min-h-0";

    const isInputDisabled = !isConnected || isJobActive || isMacroRunning;
    
    const getPlaceholder = () => {
        if (!isConnected) return "Connect to send commands";
        if (isJobActive) return "Job running...";
        if (isMacroRunning) return "Macro running...";
        return "Enter G-code command...";
    };


    return h('div', { className: containerClasses },
        h('h2', { className: "text-lg font-bold mb-4 pb-4 border-b border-secondary flex-shrink-0 flex justify-between items-center" }, 
            "Console",
            h('div', { className: "flex items-center gap-4" },
                h('label', { title: "Toggle Verbose Output", className: "flex items-center gap-1.5 cursor-pointer text-sm text-text-secondary hover:text-text-primary" },
                    h('input', {
                        type: "checkbox",
                        checked: isVerbose,
                        onChange: (e) => onVerboseChange(e.target.checked),
                        className: "h-4 w-4 rounded border-secondary text-primary focus:ring-primary"
                    }),
                    "Verbose"
                ),
                h('button', {
                    onClick: () => setIsFullscreen(!isFullscreen),
                    title: isFullscreen ? "Minimize Console" : "Fullscreen Console",
                    className: "text-text-secondary hover:text-text-primary p-1 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface"
                },
                    isFullscreen
                        ? h(Minimize, { className: "w-5 h-5" })
                        : h(Maximize, { className: "w-5 h-5" })
                )
            )
        ),
        h('div', { ref: logContainerRef, className: "flex-grow bg-background rounded p-2 overflow-y-auto mb-4 font-mono text-sm min-h-[5rem]" },
            logs.map((log, index) =>
                h('div', { key: index, className: `flex items-start ${getLogColor(log.type)}` },
                    getLogIcon(log.type),
                    h('span', { className: "whitespace-pre-wrap break-all" }, log.message)
                )
            )
        ),
        h('form', { onSubmit: handleSend, className: "flex gap-2 flex-shrink-0 mt-auto" },
            h('div', { className: "relative flex-grow" },
                h(ChevronRight, { className: "w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" }),
                h('input', {
                    type: "text",
                    value: command,
                    onChange: (e) => setCommand(e.target.value),
                    placeholder: getPlaceholder(),
                    disabled: isInputDisabled,
                    className: "w-full bg-background border border-secondary rounded-md py-2 pr-12 pl-10 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:cursor-not-allowed"
                })
            ),
            h('button', {
                type: "submit",
                disabled: isInputDisabled || !command.trim(),
                className: "px-4 py-2 bg-primary text-white font-semibold rounded-md hover:bg-primary-focus focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface transition-colors disabled:bg-secondary disabled:cursor-not-allowed"
            },
                h(Send, { className: "w-5 h-5" })
            )
        )
    );
};

export default Console;
