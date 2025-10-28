import React, { useState, useCallback, useRef, useEffect } from 'react';
import { SerialManager } from './services/serialService.js';
import { SimulatedSerialManager } from './services/simulatedSerialService.js';
import { JobStatus } from './types.js';
import SerialConnector from './components/SerialConnector.js';
import GCodePanel from './components/GCodePanel.js';
import Console from './components/Console.js';
import JogPanel from './components/JogPanel.js';
import { NotificationContainer } from './components/Notification.js';
import ThemeToggle from './components/ThemeToggle.js';
import { AlertTriangle, OctagonAlert, Unlock } from './components/Icons.js';

const GRBL_ALARM_CODES = {
    1: { name: 'Hard limit', desc: 'A limit switch was triggered. Usually due to machine travel limits.', resolution: 'Check for obstructions. The machine may need to be moved off the switch manually. Use the "$X" command to unlock after clearing the issue, then perform a homing cycle ($H).' },
    2: { name: 'G-code motion command error', desc: 'The G-code motion target is invalid or exceeds machine travel limits.', resolution: 'Check your G-code file for errors near the last executed line. Use the "$X" command to unlock.' },
    3: { name: 'Reset while in motion', desc: 'The reset button was pressed while the machine was moving.', resolution: 'This is expected. Use "$X" to unlock the machine and resume work.' },
    4: { name: 'Probe fail', desc: 'The probing cycle failed to make contact or the probe is already triggered.', resolution: 'Check your probe wiring and ensure it is properly positioned. Use "$X" to unlock.' },
    5: { name: 'Probe fail, travel error', desc: 'The probing cycle failed to clear the probe switch.', resolution: 'Check probe wiring and setup. The machine may require a soft-reset (E-STOP). Use "$X" to unlock.' },
    8: { name: 'Homing fail, pull-off', desc: "The homing cycle failed because the machine couldn't move off the limit switches.", resolution: 'Check for mechanical issues or obstructions. Use "$X" to unlock.' },
    9: { name: 'Homing fail, not found', desc: 'The homing cycle failed because the limit switches were not triggered.', resolution: 'Check limit switch wiring and functionality. Use "$X" to unlock.' },
    'default': { name: 'Unknown Alarm', desc: 'An unspecified alarm has occurred.', resolution: 'Try unlocking with "$X". If that fails, a soft-reset (E-STOP button) may be required.' }
};

const usePrevious = (value) => {
    const ref = useRef();
    useEffect(() => {
        ref.current = value;
    });
    return ref.current;
};

const StatusIndicator = ({ isConnected, machineState }) => {
    const getStatusIndicatorClass = () => {
        if (!isConnected) return 'bg-accent-yellow/20 text-accent-yellow';
        if (machineState?.status === 'Alarm') return 'bg-accent-red/20 text-accent-red';
        return 'bg-accent-green/20 text-accent-green';
    };

    const statusText = isConnected ? machineState?.status || 'Connected' : 'Disconnected';

    return React.createElement('div', { className: "flex items-center gap-2" },
        React.createElement('span', { className: "font-semibold text-sm text-text-secondary" }, "Status:"),
        React.createElement('span', { className: `px-3 py-1 text-sm rounded-full font-bold ${getStatusIndicatorClass()}` },
            statusText
        )
    );
};

const App = () => {
    const [isConnected, setIsConnected] = useState(false);
    const [isSimulatedConnection, setIsSimulatedConnection] = useState(false);
    const [portInfo, setPortInfo] = useState(null);
    const [gcodeLines, setGcodeLines] = useState([]);
    const [fileName, setFileName] = useState('');
    const [jobStatus, setJobStatus] = useState(JobStatus.Idle);
    const [progress, setProgress] = useState(0);
    const [consoleLogs, setConsoleLogs] = useState([]);
    const [error, setError] = useState(null);
    const [isSerialApiSupported, setIsSerialApiSupported] = useState(true);
    const [useSimulator, setUseSimulator] = useState(false);
    const [machineState, setMachineState] = useState(null);
    const [jogStep, setJogStep] = useState(1);
    const [flashingButton, setFlashingButton] = useState(null);
    const [notifications, setNotifications] = useState([]);
    const [unit, setUnit] = useState('mm');
    const [isHighContrast, setIsHighContrast] = useState(false);

    const serialManagerRef = useRef(null);
    const prevState = usePrevious(machineState);

    useEffect(() => {
        document.documentElement.classList.toggle('high-contrast', isHighContrast);
    }, [isHighContrast]);

    const removeNotification = useCallback((id) => {
        setNotifications(prev => {
            const notificationToRemove = prev.find(n => n.id === id);
            if (notificationToRemove && notificationToRemove.timerId) {
                clearTimeout(notificationToRemove.timerId);
            }
            return prev.filter(n => n.id !== id);
        });
    }, []);

    const addNotification = useCallback((message, type = 'success', duration = 5000) => {
        const id = Date.now() + Math.random();
        const timerId = setTimeout(() => {
            removeNotification(id);
        }, duration);
        setNotifications(prev => [...prev, { id, message, type, timerId }]);
    }, [removeNotification]);

    const addLog = useCallback((log) => {
        setConsoleLogs(prev => [...prev, log].slice(-200)); // Keep last 200 logs
    }, []);
    
    useEffect(() => {
        if (prevState?.status === 'Home' && machineState?.status === 'Idle') {
            addNotification('Homing complete.', 'success');
        }
    }, [machineState, prevState, addNotification]);
    
    useEffect(() => {
        if (machineState?.status === 'Alarm' && (jobStatus === JobStatus.Running || jobStatus === JobStatus.Paused)) {
            setJobStatus(JobStatus.Stopped);
            setProgress(0);
            const alarmInfo = GRBL_ALARM_CODES[machineState.code] || GRBL_ALARM_CODES.default;
            addLog({ 
                type: 'error', 
                message: `Job aborted due to Alarm ${machineState.code}: ${alarmInfo.name}.`
            });
        }
    }, [machineState, jobStatus, addLog]);

    useEffect(() => {
        if ('serial' in navigator) {
            setIsSerialApiSupported(true);
        } else {
            setIsSerialApiSupported(false);
            setError("Web Serial API is not supported by your browser. Please use a compatible browser like Chrome, Edge, or enable it in Firefox (dom.w3c_serial.enabled).");
        }
    }, []);

    const handleConnect = useCallback(async () => {
        if (!isSerialApiSupported && !useSimulator) return;

        const commonCallbacks = {
            onConnect: (info) => {
                setIsConnected(true);
                setPortInfo(info);
                addLog({ type: 'status', message: `Connected to ${useSimulator ? 'simulator' : 'port'} at 115200 baud.` });
                setError(null);
                setIsSimulatedConnection(useSimulator);
            },
            onDisconnect: () => {
                setIsConnected(false);
                setPortInfo(null);
                setJobStatus(JobStatus.Idle);
                setProgress(0);
                setMachineState(null);
                addLog({ type: 'status', message: 'Disconnected.' });
                serialManagerRef.current = null;
                setIsSimulatedConnection(false);
            },
            onLog: addLog,
            onProgress: (p) => {
                setProgress(p.percentage);
                if (p.percentage >= 100) {
                    setJobStatus(JobStatus.Complete);
                    addLog({type: 'status', message: 'Job complete!'});
                }
            },
            onError: (message) => {
                setError(message);
                addLog({ type: 'error', message });
            },
            onStatus: (status) => {
                setMachineState(status);
            }
        };

        try {
            const manager = useSimulator
                ? new SimulatedSerialManager(commonCallbacks)
                : new SerialManager(commonCallbacks);
            
            await manager.connect(115200);
            serialManagerRef.current = manager;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            setError(`Failed to connect: ${errorMessage}`);
            addLog({ type: 'error', message: `Failed to connect: ${errorMessage}` });
        }
    }, [addLog, isSerialApiSupported, useSimulator]);

    const handleDisconnect = useCallback(async () => {
        await serialManagerRef.current?.disconnect();
    }, []);

    const handleFileLoad = (content, name) => {
        // More robustly clean and filter g-code lines
        const lines = content.split('\n')
            .map(l => l.replace(/\(.*\)/g, '')) // Remove parenthetical comments
            .map(l => l.split(';')[0]) // Remove semicolon comments
            .map(l => l.trim())
            .filter(l => l && l !== '%'); // Filter empty lines and program start/end markers

        setGcodeLines(lines);
        setFileName(name);
        setProgress(0);
        setJobStatus(JobStatus.Idle);
        addLog({ type: 'status', message: `Loaded ${name} (${lines.length} lines).` });
    };

    const handleGCodeChange = (content) => {
        const lines = content.split('\n')
            .map(l => l.replace(/\(.*\)/g, ''))
            .map(l => l.split(';')[0])
            .map(l => l.trim())
            .filter(l => l && l !== '%');

        setGcodeLines(lines);
        if (fileName && !fileName.endsWith(' (edited)')) {
            setFileName(`${fileName} (edited)`);
        } else if (!fileName) {
            setFileName('untitled.gcode (edited)');
        }
        setProgress(0);
        setJobStatus(JobStatus.Idle);
        addLog({ type: 'status', message: `G-code modified (${lines.length} lines).` });
    };

    const handleJobControl = useCallback((action) => {
        const manager = serialManagerRef.current;
        if (!manager || !isConnected) return;

        switch (action) {
            case 'start':
                if (gcodeLines.length > 0) {
                    setJobStatus(JobStatus.Running);
                    manager.sendGCode(gcodeLines);
                }
                break;
            case 'pause':
                setJobStatus(JobStatus.Paused);
                manager.pause();
                break;
            case 'resume':
                setJobStatus(JobStatus.Running);
                manager.resume();
                break;
            case 'stop':
                setJobStatus(JobStatus.Stopped);
                manager.stopJob();
                setProgress(0);
                break;
        }
    }, [isConnected, gcodeLines]);
    
    const handleManualCommand = useCallback((command) => {
        serialManagerRef.current?.sendLine(command);
    }, []);

    const handleJog = useCallback((axis, direction, step) => {
        if (axis === 'Z' && unit === 'mm' && step > 10) {
            addLog({ type: 'error', message: 'Z-axis jog step cannot exceed 10mm.' });
            return;
        }
        if (axis === 'Z' && unit === 'in' && step > 0.4) {
            addLog({ type: 'error', message: 'Z-axis jog step cannot exceed 0.4in.' });
            return;
        }

        const feedRate = 1000; // A reasonable default feed rate for jogging
        const command = `$J=G91 ${axis}${step * direction} F${feedRate}`;
        serialManagerRef.current?.sendLine(command);
    }, [addLog, unit]);

    const flashControl = useCallback((buttonId) => {
        setFlashingButton(buttonId);
        setTimeout(() => {
            setFlashingButton(null);
        }, 200);
    }, []);
    
    const handleEmergencyStop = useCallback(() => {
        serialManagerRef.current?.emergencyStop();
        setJobStatus(JobStatus.Stopped);
        setProgress(0);
        addLog({type: 'error', message: 'EMERGENCY STOP TRIGGERED (Soft Reset)'});
    }, [addLog]);
    
    const isAlarm = machineState?.status === 'Alarm';

    const handleUnitChange = useCallback((newUnit) => {
        if (newUnit === unit || !serialManagerRef.current) return;

        const command = newUnit === 'mm' ? 'G21' : 'G20';
        serialManagerRef.current.sendLine(command);
        setUnit(newUnit);
        addLog({ type: 'status', message: `Units set to ${newUnit === 'mm' ? 'millimeters' : 'inches'}.` });
        
        // Reset jog step to a sensible default for the new unit
        setJogStep(newUnit === 'mm' ? 1 : 0.1);

    }, [unit, addLog]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!isConnected) return;
            if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
                return;
            }

            let handled = true;
            switch (e.key.toLowerCase()) {
                // Jogging
                case 'arrowup':
                    handleJog('Y', 1, jogStep);
                    flashControl('jog-y-plus');
                    break;
                case 'arrowdown':
                    handleJog('Y', -1, jogStep);
                    flashControl('jog-y-minus');
                    break;
                case 'arrowleft':
                    handleJog('X', -1, jogStep);
                    flashControl('jog-x-minus');
                    break;
                case 'arrowright':
                    handleJog('X', 1, jogStep);
                    flashControl('jog-x-plus');
                    break;
                case 'pageup':
                    handleJog('Z', 1, jogStep);
                    flashControl('jog-z-plus');
                    break;
                case 'pagedown':
                    handleJog('Z', -1, jogStep);
                    flashControl('jog-z-minus');
                    break;
                
                // E-Stop
                case 'escape':
                    handleEmergencyStop();
                    flashControl('estop');
                    break;

                // Unlock
                case 'x':
                    if (isAlarm) {
                        handleManualCommand('$X');
                        flashControl('unlock-button');
                    } else {
                        handled = false;
                    }
                    break;

                // Step Size
                case '1': case '2': case '3': case '4': case '5':
                    const stepSizes = unit === 'mm' ? [0.01, 0.1, 1, 10, 50] : [0.001, 0.01, 0.1, 1, 2];
                    const stepIndex = parseInt(e.key) - 1;
                    if (stepIndex < stepSizes.length) {
                        const newStep = stepSizes[stepIndex];
                        setJogStep(newStep);
                        flashControl(`step-${newStep}`);
                    }
                    break;

                default:
                    handled = false;
                    break;
            }

            if (handled) {
                e.preventDefault();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isConnected, jogStep, handleJog, flashControl, handleEmergencyStop, isAlarm, handleManualCommand, unit]);

    const handleHome = useCallback((axes) => {
        const manager = serialManagerRef.current;
        if (!manager) return;

        const commandMap = {
            all: ['$H'],
            x: ['$HX'],
            y: ['$HY'],
            z: ['$HZ'],
            xy: ['$HX', '$HY']
        };

        const commands = commandMap[axes];
        commands.forEach(cmd => manager.sendLine(cmd));

        addLog({ type: 'status', message: `Homing command sent for: ${axes.toUpperCase()}` });
    }, [addLog]);

    const handleSetZero = useCallback((axes) => {
        let command = 'G10 L20 P1';
        switch (axes) {
            case 'all': command += ' X0 Y0 Z0'; break;
            case 'x':   command += ' X0'; break;
            case 'y':   command += ' Y0'; break;
            case 'z':   command += ' Z0'; break;
            case 'xy':  command += ' X0 Y0'; break;
        }
        serialManagerRef.current?.sendLine(command);
        addLog({type: 'status', message: `Work coordinate origin set for ${axes.toUpperCase()}.`});
    }, [addLog]);

    const alarmInfo = isAlarm ? (GRBL_ALARM_CODES[machineState.code] || GRBL_ALARM_CODES.default) : null;
    const isJobActive = jobStatus === JobStatus.Running || jobStatus === JobStatus.Paused;


    return React.createElement('div', { className: "min-h-screen bg-background font-sans text-text-primary flex flex-col" },
        React.createElement(NotificationContainer, {
            notifications: notifications,
            onDismiss: removeNotification
        }),
        React.createElement('header', { className: "bg-surface shadow-md p-4 flex justify-between items-center z-10 flex-shrink-0 gap-4" },
            React.createElement('div', { className: "flex items-center gap-4" },
                React.createElement('h1', { className: "text-xl font-bold hidden sm:block" }, "CNC G-Code Sender", React.createElement('span', { className: "ml-2 bg-primary/20 text-primary text-xs font-semibold px-2 py-0.5 rounded-full align-middle" }, "Milestone 2")),
                React.createElement(StatusIndicator, { isConnected: isConnected, machineState: machineState })
            ),
            React.createElement('div', { className: "flex items-center gap-4" },
                isConnected && React.createElement('button', {
                    onClick: handleEmergencyStop,
                    className: `flex items-center gap-2 px-3 py-2 bg-red-600 text-white font-bold rounded-md hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-surface transition-all duration-100 animate-pulse ${flashingButton === 'estop' ? 'ring-4 ring-white ring-inset' : ''}`,
                    title: "Emergency Stop (Soft Reset) (Hotkey: Esc)"
                },
                    React.createElement(OctagonAlert, { className: "w-5 h-5" }),
                    React.createElement('span', { className: "hidden md:inline" }, "E-STOP")
                ),
                React.createElement(ThemeToggle, {
                    isHighContrast: isHighContrast,
                    onToggle: () => setIsHighContrast(prev => !prev)
                }),
                React.createElement(SerialConnector, {
                    isConnected: isConnected,
                    portInfo: portInfo,
                    onConnect: handleConnect,
                    onDisconnect: handleDisconnect,
                    isApiSupported: isSerialApiSupported,
                    isSimulated: isSimulatedConnection,
                    useSimulator: useSimulator,
                    onSimulatorChange: setUseSimulator
                })
            )
        ),
        isAlarm && React.createElement('div', { className: "bg-accent-red/20 border-b-4 border-accent-red text-accent-red p-4 m-4 flex items-start", role: "alert" },
             React.createElement(OctagonAlert, { className: "h-8 w-8 mr-4 flex-shrink-0" }),
             React.createElement('div', { className: "flex-grow" },
                React.createElement('h3', { className: "font-bold text-lg" }, `Machine Alarm: ${alarmInfo.name}`),
                React.createElement('p', { className: "text-sm" }, alarmInfo.desc),
                React.createElement('p', { className: "text-sm mt-2" }, React.createElement('strong', null, "Resolution: "), alarmInfo.resolution)
            ),
            React.createElement('button', {
                id: 'unlock-button',
                title: 'Unlock Machine (Hotkey: x)',
                onClick: () => handleManualCommand('$X'),
                className: `ml-4 flex items-center gap-2 px-4 py-2 bg-accent-red text-white font-semibold rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-background transition-all duration-100 ${flashingButton === 'unlock-button' ? 'ring-4 ring-white ring-inset' : ''}`
            },
                React.createElement(Unlock, { className: "w-5 h-5" }),
                "Unlock ($X)"
            )
        ),
        !isSerialApiSupported && !useSimulator && React.createElement('div', { className: "bg-accent-yellow/20 border-l-4 border-accent-yellow text-accent-yellow p-4 m-4 flex items-start", role: "alert" },
            React.createElement(AlertTriangle, { className: "h-6 w-6 mr-3 flex-shrink-0" }),
            React.createElement('div', null,
                React.createElement('p', { className: "font-bold" }, "Browser Not Supported"),
                React.createElement('p', null, error)
            )
        ),
        error && (isSerialApiSupported || useSimulator) && React.createElement('div', { className: "bg-accent-red/20 border-l-4 border-accent-red text-accent-red p-4 m-4 flex items-start", role: "alert" },
            React.createElement(AlertTriangle, { className: "h-6 w-6 mr-3 flex-shrink-0" }),
            React.createElement('p', null, error),
            React.createElement('button', { onClick: () => setError(null), className: "ml-auto font-bold" }, "X")
        ),
        React.createElement('main', { className: "flex-grow p-4 grid grid-cols-1 lg:grid-cols-2 gap-4" },
            React.createElement('div', { className: "min-h-[60vh] lg:min-h-0" },
                React.createElement(GCodePanel, {
                    onFileLoad: handleFileLoad,
                    fileName: fileName,
                    gcodeLines: gcodeLines,
                    onJobControl: handleJobControl,
                    jobStatus: jobStatus,
                    progress: progress,
                    isConnected: isConnected,
                    unit: unit,
                    onGCodeChange: handleGCodeChange,
                    machineState: machineState
                })
            ),
            React.createElement('div', { className: "flex flex-col gap-4 overflow-hidden" },
                React.createElement(JogPanel, {
                    isConnected: isConnected,
                    machineState: machineState,
                    onJog: handleJog,
                    onHome: handleHome,
                    onSetZero: handleSetZero,
                    jogStep: jogStep,
                    onStepChange: setJogStep,
                    flashingButton: flashingButton,
                    unit: unit,
                    onUnitChange: handleUnitChange,
                }),
                React.createElement(Console, {
                    logs: consoleLogs,
                    onSendCommand: handleManualCommand,
                    isConnected: isConnected,
                    isJobActive: isJobActive,
                    isHighContrast: isHighContrast
                })
            )
        )
    );
};

export default App;
