

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
import { AlertTriangle, OctagonAlert, Unlock, RotateCw, RotateCcw, PowerOff } from './components/Icons.js';
import { estimateGCodeTime } from './services/gcodeTimeEstimator.js';

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

const GRBL_ERROR_CODES = {
    1: 'G-code words consist of a letter and a value. Letter was not found.',
    2: 'Numeric value format is not valid or missing an expected value.',
    3: "Grbl '$' system command was not recognized or supported.",
    4: 'Negative value received for an expected positive value.',
    5: 'Homing cycle is not enabled via settings.',
    6: 'Minimum step pulse time must be greater than 3usec.',
    7: 'EEPROM read failed. Reset and restore factory settings.',
    8: 'Grbl not in idle state. Commands cannot be executed.',
    9: 'G-code locked out during alarm or jog state.',
    10: 'Soft limits cannot be enabled without homing being enabled.',
    11: 'Max characters per line exceeded. Line was not processed.',
    12: 'Grbl setting value exceeds the maximum step rate.',
    13: 'Safety door was detected as opened and door state initiated.',
    14: 'Build info or startup line exceeded EEPROM line length limit.',
    15: 'Jog target exceeds machine travel. Command ignored.',
    16: "Jog command with no '=' or contains prohibited g-code.",
    17: 'Laser mode requires PWM output.',
    20: 'Unsupported or invalid g-code command found in block.',
    21: 'More than one g-code command from same modal group found in block.',
    22: 'Feed rate has not been set or is undefined.',
    23: 'G-code command in block requires an integer value.',
    24: 'Two g-code commands that both require the use of the XYZ axis words were detected in the block.',
    25: 'A G-code word was repeated in the block.',
    26: 'A G-code command implicitly or explicitly requires XYZ axis words in the block, but none were detected.',
    27: 'N-line number value is not within the valid range of 1 - 9,999,999.',
    28: 'A G-code command was sent, but is missing some required P or L value words in the line.',
    29: 'Grbl supports six work coordinate systems G54-G59. G59.1, G59.2, and G59.3 are not supported.',
    30: 'The G53 G-code command requires either a G0 or G1 motion mode to be active. A different motion was active.',
    31: 'There are unused axis words in the block and G80 motion mode cancel is active.',
    32: 'A G2 or G3 arc was commanded but there is no XYZ axis word in the selected plane to trace the arc.',
    33: 'The motion command has an invalid target. G2, G3, and G38.2 generates this error.',
    34: 'A G2 or G3 arc, traced with the radius definition, had a mathematical error when computing the arc geometry. Try either breaking up the arc into multiple smaller arcs or turning on calculated arcs.',
    35: 'A G2 or G3 arc, traced with the offset definition, is missing the I or J router words in the selected plane to trace the arc.',
    36: 'There are unused axis words in the block and G80 motion mode cancel is active.',
    37: 'The G43.1 dynamic tool length offset command cannot apply an offset to an axis other than its configured axis.',
    38: 'Tool number greater than max supported value.',
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

const SpindleStatusIndicator = ({ machineState, isConnected }) => {
    if (!isConnected) {
        return null; // Don't show anything if not connected
    }

    const spindleState = machineState?.spindle?.state || 'off';
    const spindleSpeed = machineState?.spindle?.speed || 0;

    if (spindleState === 'off' || spindleSpeed === 0) {
        return React.createElement('div', { className: "flex items-center gap-2 text-sm text-text-secondary" },
            React.createElement(PowerOff, { className: "w-5 h-5" }),
            React.createElement('span', null, "Spindle Off")
        );
    }
    
    const icon = spindleState === 'cw' 
        ? React.createElement(RotateCw, { className: "w-5 h-5 text-accent-green animate-spin-slow" })
        : React.createElement(RotateCcw, { className: "w-5 h-5 text-accent-green animate-spin-slow-reverse" });

    return React.createElement('div', { className: "flex items-center gap-2 text-sm text-text-primary" },
        icon,
        React.createElement('div', { className: 'flex flex-col leading-tight' },
            React.createElement('span', { className: 'font-bold' }, `${spindleSpeed.toLocaleString()} RPM`),
            React.createElement('span', { className: 'text-xs text-text-secondary' }, spindleState === 'cw' ? 'Clockwise' : 'Counter-CW')
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
    const [flashingButton, setFlashingButton] = useState(null);
    const [notifications, setNotifications] = useState([]);
    const [isJogging, setIsJogging] = useState(false);
    const [isAudioUnlocked, setIsAudioUnlocked] = useState(false);
    const [timeEstimate, setTimeEstimate] = useState({ totalSeconds: 0, cumulativeSeconds: [] });

    // Persisted State
    const [jogStep, setJogStep] = useState(() => {
        try {
            const saved = localStorage.getItem('cnc-app-jogstep');
            return saved !== null ? JSON.parse(saved) : 1;
        } catch { return 1; }
    });
    const [unit, setUnit] = useState(() => {
        try {
            const saved = localStorage.getItem('cnc-app-unit');
            return saved !== null ? JSON.parse(saved) : 'mm';
        } catch { return 'mm'; }
    });
    const [isLightMode, setIsLightMode] = useState(() => {
        try {
            const saved = localStorage.getItem('cnc-app-theme');
            return saved !== null ? JSON.parse(saved) : false;
        } catch { return false; }
    });

    const serialManagerRef = useRef(null);
    const prevState = usePrevious(machineState);
    const jobStatusRef = useRef(jobStatus);
    const audioContextRef = useRef(null);
    const audioBufferRef = useRef(null);
    
    useEffect(() => {
        jobStatusRef.current = jobStatus;
    }, [jobStatus]);

    useEffect(() => {
        localStorage.setItem('cnc-app-theme', JSON.stringify(isLightMode));
        document.documentElement.classList.toggle('light-mode', isLightMode);
    }, [isLightMode]);

    useEffect(() => {
        localStorage.setItem('cnc-app-unit', JSON.stringify(unit));
    }, [unit]);

    useEffect(() => {
        localStorage.setItem('cnc-app-jogstep', JSON.stringify(jogStep));
    }, [jogStep]);

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

    useEffect(() => {
        // This effect runs once on mount to initialize the audio system.
        const context = new (window.AudioContext || window.webkitAudioContext)();
        audioContextRef.current = context;

        // Pre-load the audio file to be ready for playback.
        fetch('/assets/completion-sound.mp3')
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.arrayBuffer();
            })
            .then(arrayBuffer => context.decodeAudioData(arrayBuffer))
            .then(decodedData => {
                audioBufferRef.current = decodedData;
            })
            .catch(error => {
                console.error("Failed to load or decode completion sound:", error);
                addNotification('Could not load notification sound.', 'error');
            });

        const unlockAudio = () => {
            if (context.state === 'suspended') {
                context.resume().then(() => {
                    setIsAudioUnlocked(true);
                    // Clean up listeners once the context is unlocked.
                    document.removeEventListener('click', unlockAudio);
                    document.removeEventListener('keydown', unlockAudio);
                });
            } else {
                // If it's already running, we can just clean up.
                setIsAudioUnlocked(true);
                document.removeEventListener('click', unlockAudio);
                document.removeEventListener('keydown', unlockAudio);
            }
        };

        // Browsers require a user gesture to start AudioContext.
        // We listen for the first click or keydown anywhere.
        document.addEventListener('click', unlockAudio);
        document.addEventListener('keydown', unlockAudio);

        return () => {
            // Cleanup on unmount
            document.removeEventListener('click', unlockAudio);
            document.removeEventListener('keydown', unlockAudio);
            context.close();
        };
    }, [addNotification]);

    const playCompletionSound = useCallback(() => {
        const audioContext = audioContextRef.current;
        const audioBuffer = audioBufferRef.current;

        if (audioBuffer && audioContext && audioContext.state === 'running') {
            const source = audioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioContext.destination);
            source.start(0);
        } else {
            console.warn("Could not play sound: AudioContext not running or sound buffer not loaded.");
        }
    }, []);

    const addLog = useCallback((log) => {
        let processedLog = { ...log };

        // Add explanation for GRBL errors
        if (processedLog.type === 'error' && processedLog.message.includes('error:')) {
            const codeMatch = processedLog.message.match(/error:(\d+)/);
            if (codeMatch && codeMatch[1]) {
                const code = parseInt(codeMatch[1], 10);
                const explanation = GRBL_ERROR_CODES[code];
                const originalError = `error:${code}`;

                if (explanation) {
                    // The message from onError can be long, but for the console, we want it concise.
                    processedLog.message = `${originalError} (${explanation})`;
                } else {
                    processedLog.message = originalError; // Fallback to just the error code
                }
            }
        }

        setConsoleLogs(prev => {
            const trimmedMessage = processedLog.message.trim().toLowerCase();

            // Consolidate repeated 'ok' messages to prevent console spam.
            if (processedLog.type === 'received' && trimmedMessage === 'ok') {
                const lastLog = prev.length > 0 ? prev[prev.length - 1] : null;

                // Check if the last log was also an 'ok' message that we can append to.
                if (lastLog && lastLog.type === 'received' && /^ok\.*$/.test(lastLog.message)) {
                    // If the line has space, append a dot.
                    if (lastLog.message.length < 60) {
                        const newLogs = [...prev];
                        newLogs[newLogs.length - 1] = { ...lastLog, message: lastLog.message + '.' };
                        return newLogs;
                    } 
                    // If the line is full, we fall through to add a new 'ok' log on a new line.
                }
            }
            
            // For any other message, or the first 'ok' in a sequence.
            return [...prev, processedLog].slice(-20); // Keep last 20 logs
        });
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
                if (p.percentage >= 100 && jobStatusRef.current !== JobStatus.Complete) {
                    setJobStatus(JobStatus.Complete);
                    addLog({type: 'status', message: 'Job complete!'});
                    addNotification('Job complete!', 'success');
                    playCompletionSound();
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
    }, [addLog, isSerialApiSupported, useSimulator, addNotification, playCompletionSound]);

    const handleDisconnect = useCallback(async () => {
        if (jobStatus === JobStatus.Running || jobStatus === JobStatus.Paused) {
            if (!window.confirm("A job is currently running or paused. Are you sure you want to disconnect? This will stop the job.")) {
                return; // User cancelled the disconnect
            }
        }
        await serialManagerRef.current?.disconnect();
    }, [jobStatus]);

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
        setTimeEstimate(estimateGCodeTime(lines));
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
        setTimeEstimate(estimateGCodeTime(lines));
        addLog({ type: 'status', message: `G-code modified (${lines.length} lines).` });
    };

    const handleJobControl = useCallback((action) => {
        const manager = serialManagerRef.current;
        if (!manager || !isConnected) return;

        switch (action) {
            case 'start':
                if (gcodeLines.length > 0) {
                    setJobStatus(currentStatus => {
                        if (currentStatus === JobStatus.Idle || currentStatus === JobStatus.Stopped || currentStatus === JobStatus.Complete) {
                            manager.sendGCode(gcodeLines);
                            return JobStatus.Running;
                        }
                        return currentStatus;
                    });
                }
                break;
            case 'pause':
                setJobStatus(currentStatus => {
                    if (currentStatus === JobStatus.Running) {
                        manager.pause();
                        return JobStatus.Paused;
                    }
                    return currentStatus;
                });
                break;
            case 'resume':
                setJobStatus(currentStatus => {
                    if (currentStatus === JobStatus.Paused) {
                        manager.resume();
                        return JobStatus.Running;
                    }
                    return currentStatus;
                });
                break;
            case 'stop':
                setJobStatus(currentStatus => {
                    if (currentStatus === JobStatus.Running || currentStatus === JobStatus.Paused) {
                        manager.stopJob();
                        setProgress(0);
                        return JobStatus.Stopped;
                    }
                    return currentStatus;
                });
                break;
        }
    }, [isConnected, gcodeLines]);
    
    const handleManualCommand = useCallback((command) => {
        serialManagerRef.current?.sendLine(command);
    }, []);

    useEffect(() => {
        // A jog command is finished when the machine state transitions from 'Jog' back to a non-jog state.
        // This effect handles unlocking the controls once that transition is detected.
        if (isJogging && prevState?.status === 'Jog' && machineState?.status !== 'Jog') {
            setIsJogging(false);
        }
    }, [isJogging, machineState, prevState]);

    const handleJog = useCallback((axis, direction, step) => {
        // Use the `isJogging` state and current machine status to prevent sending new commands
        // while a jog is in progress. Adding these to the dependency array ensures
        // this callback always has the freshest state.
        if (isJogging || machineState?.status === 'Jog' || !serialManagerRef.current) {
            return;
        }

        if (axis === 'Z' && unit === 'mm' && step > 10) {
            addLog({ type: 'error', message: 'Z-axis jog step cannot exceed 10mm.' });
            return;
        }
        if (axis === 'Z' && unit === 'in' && step > 0.4) {
            addLog({ type: 'error', message: 'Z-axis jog step cannot exceed 0.4in.' });
            return;
        }

        setIsJogging(true);

        const feedRate = 1000;
        const command = `$J=G91 ${axis}${step * direction} F${feedRate}`;
        
        serialManagerRef.current.sendLine(command).catch((err) => {
            setIsJogging(false); // Reset on error
            const errorMessage = err instanceof Error ? err.message : "An error occurred during jog.";
            addLog({ type: 'error', message: `Jog failed: ${errorMessage}` });
        });
    }, [addLog, unit, isJogging, machineState]);

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

    const handleSpindleCommand = useCallback((command, speed) => {
        const manager = serialManagerRef.current;
        if (!manager || !isConnected) return;

        let gcode = '';
        switch (command) {
            case 'cw':
                gcode = `M3 S${speed}`;
                break;
            case 'ccw':
                gcode = `M4 S${speed}`;
                break;
            case 'off':
                gcode = 'M5';
                break;
            default:
                return;
        }

        manager.sendLine(gcode);
    }, [isConnected]);
    
    const handleFeedOverride = useCallback((command) => {
        const manager = serialManagerRef.current;
        if (!manager) return;

        const commandMap = {
            'reset': '\x90', // Set to 100%
            'inc10': '\x91', // Increase 10%
            'dec10': '\x92', // Decrease 10%
            'inc1': '\x93',  // Increase 1%
            'dec1': '\x94',  // Decrease 1%
        };

        if (commandMap[command]) {
            manager.sendRealtimeCommand(commandMap[command]);
        }
    }, []);

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

    const handleProbe = useCallback(async (axes, offsets) => {
        const manager = serialManagerRef.current;
        if (!manager || !isConnected) {
            addLog({ type: 'error', message: 'Cannot probe while disconnected.' });
            return;
        }
    
        const probeTravel = unit === 'mm' ? -25 : -1.0;
        const probeFeed = unit === 'mm' ? 25 : 1;
        const retractDist = unit === 'mm' ? 5 : 0.2;
    
        addLog({ type: 'status', message: `Starting ${axes.toUpperCase()}-Probe cycle...` });
    
        try {
            const probeAxis = async (axis, offset, travelDir = -1) => {
                const travel = probeTravel * travelDir;
                await manager.sendLineAndWaitForOk(`G38.2 ${axis}${travel} F${probeFeed}`);
                addLog({ type: 'status', message: `Probe contact detected on ${axis}.` });
                await manager.sendLineAndWaitForOk(`G10 L20 P1 ${axis}${offset}`);
                addLog({ type: 'status', message: `${axis}-axis zero set to ${offset}${unit}.` });
                await manager.sendLineAndWaitForOk('G91');
                await manager.sendLineAndWaitForOk(`G0 ${axis}${retractDist * -travelDir}`);
                await manager.sendLineAndWaitForOk('G90');
            };

            if (axes.includes('X')) {
                await probeAxis('X', offsets.x);
            }
            if (axes.includes('Y')) {
                await probeAxis('Y', offsets.y);
            }
            if (axes.includes('Z')) {
                await probeAxis('Z', offsets.z);
            }
    
            addLog({ type: 'status', message: 'Probe cycle complete.' });
            addNotification(`${axes.toUpperCase()}-Probe cycle complete.`, 'success');
    
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            addLog({ type: 'error', message: `Probe cycle failed: ${errorMessage}` });
            setError(`Probe cycle failed: ${errorMessage}`);
            // It's good practice to send a soft-reset to clear any alarm state from a failed probe
            manager.sendLine('\x18', false);
        }
    
    }, [isConnected, addLog, addNotification, unit, setError]);

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

    useEffect(() => {
        const handleBeforeUnload = (event) => {
            if (isJobActive) {
                event.preventDefault();
                event.returnValue = ''; // Required for Chrome
                return ''; // For other browsers
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [isJobActive]);


    return React.createElement('div', { className: "min-h-screen bg-background font-sans text-text-primary flex flex-col" },
        !isAudioUnlocked && React.createElement('div', { className: "bg-accent-yellow/20 text-accent-yellow text-center p-2 text-sm font-semibold animate-pulse" },
            "Click anywhere or press any key to enable sound notifications"
        ),
        React.createElement(NotificationContainer, {
            notifications: notifications,
            onDismiss: removeNotification
        }),
        React.createElement('header', { className: "bg-surface shadow-md p-4 flex justify-between items-center z-10 flex-shrink-0 gap-4" },
            React.createElement('div', { className: "flex items-center gap-4" },
                React.createElement('h1', { className: "text-xl font-bold hidden sm:block" }, "CNC G-Code Sender", React.createElement('span', { className: "ml-2 bg-primary/20 text-primary text-xs font-semibold px-2 py-0.5 rounded-full align-middle" }, "Milestone 2")),
                React.createElement(StatusIndicator, { isConnected: isConnected, machineState: machineState }),
                React.createElement(SpindleStatusIndicator, { isConnected: isConnected, machineState: machineState })
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
                    isLightMode: isLightMode,
                    onToggle: () => setIsLightMode(prev => !prev)
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
        React.createElement('main', { className: "flex-grow p-4 grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-0" },
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
                    machineState: machineState,
                    onFeedOverride: handleFeedOverride,
                    timeEstimate: timeEstimate
                })
            ),
            React.createElement('div', { className: "flex flex-col gap-4 overflow-hidden min-h-0" },
                React.createElement(JogPanel, {
                    isConnected: isConnected,
                    machineState: machineState,
                    onJog: handleJog,
                    onHome: handleHome,
                    onSetZero: handleSetZero,
                    onSpindleCommand: handleSpindleCommand,
                    onProbe: handleProbe,
                    jogStep: jogStep,
                    onStepChange: setJogStep,
                    flashingButton: flashingButton,
                    unit: unit,
                    onUnitChange: handleUnitChange,
                    isJogging: isJogging,
                    isJobActive: isJobActive
                }),
                React.createElement(Console, {
                    logs: consoleLogs,
                    onSendCommand: handleManualCommand,
                    isConnected: isConnected,
                    isJobActive: isJobActive,
                    isLightMode: isLightMode
                })
            )
        )
    );
};

export default App;