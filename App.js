import React, { useState, useCallback, useRef, useEffect } from 'react';
import { SerialManager } from './services/serialService.js';
import { SimulatedSerialManager } from './services/simulatedSerialService.js';
import { JobStatus } from './types.js';
import SerialConnector from './components/SerialConnector.js';
import GCodePanel from './components/GCodePanel.js';
import Console from './components/Console.js';
import JogPanel from './components/JogPanel.js';
import MacrosPanel from './components/MacrosPanel.js';
import WebcamPanel from './components/WebcamPanel.js';
import PreflightChecklistModal from './components/PreflightChecklistModal.js';
import MacroEditorModal from './components/MacroEditorModal.js';
import SettingsModal from './components/SettingsModal.js';
import ToolLibraryModal from './components/ToolLibraryModal.js';
import GCodeGeneratorModal from './components/GCodeGeneratorModal.js';
import WelcomeModal from './components/WelcomeModal.js';
import { NotificationContainer } from './components/Notification.js';
import ThemeToggle from './components/ThemeToggle.js';
import StatusBar from './components/StatusBar.js';
import { AlertTriangle, OctagonAlert, Unlock, Settings, BookOpen } from './components/Icons.js';
import { estimateGCodeTime } from './services/gcodeTimeEstimator.js';
import { analyzeGCode } from './services/gcodeAnalyzer.js';
import { Analytics } from '@vercel/analytics/react';
import Footer from './components/Footer.js';
import UnsupportedBrowser from './components/UnsupportedBrowser.js';

const GRBL_ALARM_CODES = {
    1: { name: 'Hard limit', desc: 'A limit switch was triggered. Usually due to machine travel limits.', resolution: 'Check for obstructions. The machine may need to be moved off the switch manually. Use the "$X" command to unlock after clearing the issue, then perform a homing cycle ($H).' },
    2: { name: 'G-code motion command error', desc: 'The G-code motion target is invalid or exceeds machine travel limits.', resolution: 'Check your G-code file for errors near the last executed line. Use the "$X" command to unlock.' },
    3: { name: 'Reset while in motion', desc: 'The reset button was pressed while the machine was moving.', resolution: 'This is expected. Use "$X" to unlock the machine and resume work.' },
    4: { name: 'Probe fail', desc: 'The probing cycle failed to make contact or the probe is already triggered.', resolution: 'Check your probe wiring and ensure it is properly positioned. Use the "$X" command to unlock.' },
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

const DEFAULT_MACROS = [
    { name: 'Go to WCS Zero', commands: ['G90', 'G0 X0 Y0'] },
    { name: 'Safe Z & WCS Zero', commands: ['G90', 'G0 Z10', 'G0 X0 Y0'] },
    { name: 'Spindle On (1k RPM)', commands: ['M3 S1000'] },
    { name: 'Spindle Off', commands: ['M5'] },
    { name: 'Go to G54 Zero', commands: ['G54 G0 X0 Y0'] },
    { name: 'Reset All Offsets', commands: ['G92.1'] },
];

const DEFAULT_SETTINGS = {
    workArea: { x: 300, y: 300, z: 80 },
    spindle: { min: 0, max: 12000 },
    probe: { xOffset: 3.0, yOffset: 3.0, zOffset: 15.0 },
    scripts: {
        startup: ['G21', 'G90'].join('\n'), // Set units to mm, absolute positioning
        toolChange: ['M5', 'G0 Z10'].join('\n'), // Stop spindle, raise Z
        shutdown: ['M5', 'G0 X0 Y0'].join('\n') // Stop spindle, go to WCS zero
    }
};

const usePrevious = (value) => {
    const ref = useRef(undefined);
    useEffect(() => {
        ref.current = value;
    });
    return ref.current;
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
    const [isJogging, setIsJogging] = useState(false);
    const [flashingButton, setFlashingButton] = useState(null);
    const [notifications, setNotifications] = useState([]);
    const [isAudioUnlocked, setIsAudioUnlocked] = useState(false);
    const [timeEstimate, setTimeEstimate] = useState({ totalSeconds: 0, cumulativeSeconds: [] });

    const [isPreflightModalOpen, setIsPreflightModalOpen] = useState(false);
    const [jobStartOptions, setJobStartOptions] = useState({ startLine: 0, isDryRun: false });
    const [isHomedSinceConnect, setIsHomedSinceConnect] = useState(false);
    const [isMacroRunning, setIsMacroRunning] = useState(false);
    const [preflightWarnings, setPreflightWarnings] = useState([]);

    // Onboarding State
    const [isWelcomeModalOpen, setIsWelcomeModalOpen] = useState(false);
    const [cameFromWelcome, setCameFromWelcome] = useState(null);
    const [machineSetupCompleted, setMachineSetupCompleted] = useState(() => localStorage.getItem('cnc-app-machine-setup-complete') === 'true');

    // Macro Editing State
    const [isMacroEditorOpen, setIsMacroEditorOpen] = useState(false);
    const [editingMacroIndex, setEditingMacroIndex] = useState(null);
    const [isMacroEditMode, setIsMacroEditMode] = useState(false);

    // Advanced Features State
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    const [isToolLibraryModalOpen, setIsToolLibraryModalOpen] = useState(false);
    const [isGCodeGeneratorModalOpen, setIsGCodeGeneratorModalOpen] = useState(false);
    const [selectedToolId, setSelectedToolId] = useState(null);
    const [isVerbose, setIsVerbose] = useState(false);


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
    const [macros, setMacros] = useState(() => {
        try {
            const saved = localStorage.getItem('cnc-app-macros');
            return saved ? JSON.parse(saved) : DEFAULT_MACROS;
        } catch {
            return DEFAULT_MACROS;
        }
    });
    const [machineSettings, setMachineSettings] = useState(() => {
        try {
            const saved = localStorage.getItem('cnc-app-settings');
            const parsed = saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
            // Ensure probe settings exist from older configs
            if (!parsed.probe) {
                parsed.probe = DEFAULT_SETTINGS.probe;
            }
            return parsed;
        } catch {
            return DEFAULT_SETTINGS;
        }
    });
    const [toolLibrary, setToolLibrary] = useState(() => {
        try {
            const saved = localStorage.getItem('cnc-app-tool-library');
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });

    const serialManagerRef = useRef(null);
    const prevState = usePrevious(machineState);
    const jobStatusRef = useRef(jobStatus);
    const audioContextRef = useRef(null);
    const audioBufferRef = useRef(null);
    
    useEffect(() => {
        const onboardingComplete = localStorage.getItem('cnc-app-onboarding-complete');
        if (onboardingComplete !== 'true') {
            setIsWelcomeModalOpen(true);
        }
    }, []);

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

     useEffect(() => {
        try {
            localStorage.setItem('cnc-app-macros', JSON.stringify(macros));
        } catch (error) {
            console.error("Could not save macros to localStorage:", error);
            addNotification('Could not save macros.', 'error');
        }
    }, [macros]);

    useEffect(() => {
        try {
            localStorage.setItem('cnc-app-settings', JSON.stringify(machineSettings));
        } catch (error) {
            console.error("Could not save settings:", error);
        }
    }, [machineSettings]);

    useEffect(() => {
        try {
            localStorage.setItem('cnc-app-tool-library', JSON.stringify(toolLibrary));
        } catch (error) {
            console.error("Could not save tool library:", error);
        }
    }, [toolLibrary]);
    
    useEffect(() => {
        // We are no longer jogging if the machine reports back that it is idle or has an alarm.
        if (machineState?.status === 'Idle' || machineState?.status === 'Alarm') {
            setIsJogging(false);
        }
    }, [machineState?.status]);

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
        fetch('/completion-sound.mp3')
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

        // Add explanation for GRBL errors, preserving the original message context.
        if (processedLog.type === 'error' && processedLog.message.includes('error:')) {
            const codeMatch = processedLog.message.match(/error:(\d+)/);
            if (codeMatch && codeMatch[1]) {
                const code = parseInt(codeMatch[1], 10);
                const explanation = GRBL_ERROR_CODES[code];
                if (explanation) {
                    processedLog.message = `${processedLog.message} (${explanation})`;
                }
            }
        }

        setConsoleLogs(prev => {
            const trimmedMessage = processedLog.message.trim().toLowerCase();

            // Consolidate repeated 'ok' messages to prevent console spam.
            if (!isVerbose && processedLog.type === 'received' && trimmedMessage === 'ok') {
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
            return [...prev, processedLog].slice(-200); // Keep last 200 logs
        });
    }, [isVerbose]);
    
    useEffect(() => {
        if (prevState?.status === 'Home' && machineState?.status === 'Idle') {
            addNotification('Homing complete.', 'success');
            setIsHomedSinceConnect(true);
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
        setIsSerialApiSupported('serial' in navigator);
    }, []);

    const handleConnect = useCallback(async () => {
        if (!isSerialApiSupported && !useSimulator) return;

        const commonCallbacks = {
            onConnect: async (info) => {
                setIsConnected(true);
                setPortInfo(info);
                addLog({ type: 'status', message: `Connected to ${useSimulator ? 'simulator' : 'port'} at 115200 baud.` });
                setError(null);
                setIsSimulatedConnection(useSimulator);
                setIsHomedSinceConnect(false); // Reset homing status on new connection
                
                // Run startup script
                if (machineSettings.scripts.startup && serialManagerRef.current) {
                    addLog({ type: 'status', message: 'Running startup script...' });
                    const startupCommands = machineSettings.scripts.startup.split('\n').filter(cmd => cmd.trim() !== '');
                    for (const command of startupCommands) {
                        await serialManagerRef.current.sendLineAndWaitForOk(command);
                    }
                }
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
                setIsHomedSinceConnect(false);
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
            onStatus: (status, rawStatus) => {
                setMachineState(status);
                if (isVerbose && rawStatus) {
                    addLog({ type: 'status', message: rawStatus });
                }
            }
        };

        try {
            const manager = useSimulator
                ? new SimulatedSerialManager(commonCallbacks)
                : new SerialManager(commonCallbacks);
            
            serialManagerRef.current = manager; // Set ref before connect to use in onConnect
            await manager.connect(115200);
            
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            setError(`Failed to connect: ${errorMessage}`);
            addLog({ type: 'error', message: `Failed to connect: ${errorMessage}` });
        }
    }, [addLog, isSerialApiSupported, useSimulator, addNotification, playCompletionSound, machineSettings.scripts.startup, isVerbose]);

    const handleDisconnect = useCallback(async () => {
        if (jobStatus === JobStatus.Running || jobStatus === JobStatus.Paused) {
            if (!window.confirm("A job is currently running or paused. Are you sure you want to disconnect? This will stop the job.")) {
                return; // User cancelled the disconnect
            }
        }
        
        // Run shutdown script before disconnecting
        if (isConnected && machineSettings.scripts.shutdown && serialManagerRef.current) {
            addLog({ type: 'status', message: 'Running shutdown script...' });
            const shutdownCommands = machineSettings.scripts.shutdown.split('\n').filter(cmd => cmd.trim() !== '');
            for (const command of shutdownCommands) {
                await serialManagerRef.current.sendLineAndWaitForOk(command);
            }
        }

        await serialManagerRef.current?.disconnect();
    }, [jobStatus, isConnected, machineSettings.scripts.shutdown, addLog]);

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
        setSelectedToolId(null);
        setTimeEstimate(estimateGCodeTime(lines));
        addLog({ type: 'status', message: `Loaded ${name} (${lines.length} lines).` });
    };

    const handleClearFile = useCallback(() => {
        setGcodeLines([]);
        setFileName('');
        setProgress(0);
        setJobStatus(JobStatus.Idle);
        setSelectedToolId(null);
        setTimeEstimate({ totalSeconds: 0, cumulativeSeconds: [] });
        addLog({ type: 'status', message: 'G-code cleared from preview.' });
    }, [addLog]);
    
    const handleGeneratedGCodeLoad = (gcode, name) => {
        handleFileLoad(gcode, name);
        setIsGCodeGeneratorModalOpen(false);
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
    
    const handleStartJob = useCallback((startLine, isDryRun) => {
        const manager = serialManagerRef.current;
        if (!manager || !isConnected || gcodeLines.length === 0) return;
        setJobStatus(JobStatus.Running);
        manager.sendGCode(gcodeLines, { startLine, isDryRun });
    }, [isConnected, gcodeLines]);

    const handleStartJobConfirmed = useCallback((options) => {
        setIsPreflightModalOpen(false);
        handleStartJob(jobStartOptions.startLine, options.isDryRun);
    }, [jobStartOptions, handleStartJob]);


    const handleJobControl = useCallback((action, options) => {
        const manager = serialManagerRef.current;
        if (!manager || !isConnected) return;

        switch (action) {
            case 'start':
                if (gcodeLines.length > 0) {
                    const startLine = options?.startLine ?? 0;
                    setJobStartOptions({ startLine, isDryRun: false });

                    const warnings = analyzeGCode(gcodeLines, machineSettings);
                    setPreflightWarnings(warnings);
                    const hasErrors = warnings.some(w => w.type === 'error');

                    if (hasErrors) {
                        addNotification('Job has critical errors! Review in pre-flight check.', 'error');
                        setIsPreflightModalOpen(true);
                        return;
                    }
                    
                    const skipPreflight = localStorage.getItem('cnc-app-skip-preflight') === 'true';
                    if (skipPreflight) {
                        handleStartJob(startLine, false);
                    } else {
                        setIsPreflightModalOpen(true);
                    }
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
    }, [isConnected, gcodeLines, machineSettings, handleStartJob, addNotification]);
    
    const handleManualCommand = useCallback((command) => {
        serialManagerRef.current?.sendLine(command);
    }, []);

    const handleJog = (axis, direction, step) => {
        if (!serialManagerRef.current) return;

        if (axis === 'Z' && unit === 'mm' && step > 10) {
            addLog({ type: 'error', message: 'Z-axis jog step cannot exceed 10mm.' });
            return;
        }
        if (axis === 'Z' && unit === 'in' && step > 1) {
            addLog({ type: 'error', message: 'Z-axis jog step cannot exceed 1in.' });
            return;
        }

        const feedRate = 1000;
        const command = `$J=G91 ${axis}${step * direction} F${feedRate}`;
        
        setIsJogging(true); 
        serialManagerRef.current.sendLineAndWaitForOk(command).catch((err) => {
            const errorMessage = err instanceof Error ? err.message : "An error occurred during jog.";
            // Don't spam console with errors from rapid clicking
            if (!errorMessage.includes('Cannot send new line')) {
                addLog({ type: 'error', message: `Jog failed: ${errorMessage}` });
            }
            setIsJogging(false);
        });
    };

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

    const handleProbe = useCallback(async (axes) => {
        const manager = serialManagerRef.current;
        if (!manager || !isConnected) {
            addLog({ type: 'error', message: 'Cannot probe while disconnected.' });
            return;
        }

        const offsets = {
            x: machineSettings.probe.xOffset,
            y: machineSettings.probe.yOffset,
            z: machineSettings.probe.zOffset,
        };
    
        const probeTravel = unit === 'mm' ? 25 : 1.0;
        const probeFeed = unit === 'mm' ? 100 : 4;
        const retractDist = unit === 'mm' ? 5 : 0.2;
    
        addLog({ type: 'status', message: `Starting ${axes.toUpperCase()}-Probe cycle...` });
    
        try {
            const probeAxis = async (axis, offset, travelDir = -1) => {
                const travel = probeTravel * travelDir;
                await manager.sendLineAndWaitForOk(`G38.2 ${axis}${travel.toFixed(4)} F${probeFeed}`);
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
    
    }, [isConnected, addLog, addNotification, unit, setError, machineSettings.probe]);

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

        // Optimistically set the machine state to 'Home' to immediately lock the UI.
        // The regular status polling will then take over to keep the state in sync.
        setMachineState(prev => {
            const newPrev = prev || {
                status: 'Idle', code: null, wpos: { x: 0, y: 0, z: 0 }, mpos: { x: 0, y: 0, z: 0 },
                spindle: { state: 'off', speed: 0 }, ov: [100, 100, 100]
            };
            return { ...newPrev, status: 'Home' };
        });

        addLog({ type: 'status', message: `Starting homing cycle for: ${axes.toUpperCase()}...` });

        const commandMap = {
            all: ['$H'],
            x: ['$HX'],
            y: ['$HY'],
            z: ['$HZ'],
            xy: ['$HXY']
        };

        const commands = commandMap[axes];
        if (!commands) {
            addLog({ type: 'error', message: `Unknown homing command: ${axes}` });
            return;
        }

        for (const cmd of commands) {
            // Homing is a long process. We send the command and rely on status updates 
            // to manage the UI state, rather than waiting for an 'ok' that comes back immediately.
            manager.sendLine(cmd);
        }
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

    const handleRunMacro = useCallback(async (commands) => {
        const manager = serialManagerRef.current;
        if (!manager) return;

        // Replace placeholders in commands
        const processedCommands = commands.map(cmd => 
            cmd.replace(/{unit}/g, unit)
               .replace(/{safe_z}/g, unit === 'mm' ? '10' : '0.4')
        );

        setIsMacroRunning(true);
        addLog({ type: 'status', message: `Running macro: ${processedCommands.join('; ')}` });
        try {
            for (const command of processedCommands) {
                await manager.sendLineAndWaitForOk(command);
            }
            addLog({ type: 'status', message: 'Macro finished.' });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            addLog({ type: 'error', message: `Macro failed: ${errorMessage}` });
            setError(`Macro failed: ${errorMessage}`);
        } finally {
            setIsMacroRunning(false);
        }
    }, [addLog, unit, setError]);

    // --- Macro Editor Handlers ---
    const handleOpenMacroEditor = useCallback((index) => {
        setEditingMacroIndex(index);
        setIsMacroEditorOpen(true);
    }, []);

    const handleCloseMacroEditor = useCallback(() => {
        setIsMacroEditorOpen(false);
        setEditingMacroIndex(null);
    }, []);

    const handleSaveMacro = useCallback((macro, index) => {
        setMacros(prevMacros => {
            const newMacros = [...prevMacros];
            if (index !== null && index >= 0) {
                // Editing existing macro
                newMacros[index] = macro;
            } else {
                // Adding new macro
                newMacros.push(macro);
            }
            return newMacros;
        });
        addNotification('Macro saved!', 'success');
    }, [addNotification]);
    
    const handleDeleteMacro = useCallback((index) => {
        setMacros(prevMacros => prevMacros.filter((_, i) => i !== index));
        addNotification('Macro deleted!', 'success');
    }, [addNotification]);

    const handleExportSettings = useCallback(() => {
        const settingsToExport = {
            machineSettings,
            macros,
            toolLibrary,
        };
        const blob = new Blob([JSON.stringify(settingsToExport, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `mycnc-app-settings-${new Date().toISOString().slice(0,10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        addNotification('Settings exported successfully!', 'success');
    }, [machineSettings, macros, toolLibrary, addNotification]);
    
    const handleImportSettings = useCallback((imported) => {
        if (window.confirm("This will overwrite your current macros, settings, and tool library. Are you sure?")) {
            // Basic validation
            if (imported.machineSettings && imported.macros && imported.toolLibrary) {
                setMachineSettings(imported.machineSettings);
                setMacros(imported.macros);
                setToolLibrary(imported.toolLibrary);
                addNotification("Settings imported successfully!", 'success');
            } else {
                addNotification("Invalid settings file.", 'error');
            }
        }
    }, [addNotification]);

    if (!isSerialApiSupported && !useSimulator) {
        return React.createElement(UnsupportedBrowser, { useSimulator, onSimulatorChange: setUseSimulator });
    }

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


    const isAnyControlLocked = !isConnected || isJobActive || isJogging || isMacroRunning || (machineState?.status && ['Alarm', 'Home'].includes(machineState.status));
    const selectedTool = toolLibrary.find(t => t.id === selectedToolId) || null;
    
    const version = '0.5.0';
    
    // --- Welcome & Onboarding Handlers ---
    const handleCloseWelcomeModal = () => {
        setIsWelcomeModalOpen(false);
        localStorage.setItem('cnc-app-onboarding-complete', 'true');
    };

    const handleOpenSettingsFromWelcome = () => {
        setIsWelcomeModalOpen(false);
        setCameFromWelcome('settings');
        setIsSettingsModalOpen(true);
    };

    const handleOpenToolsFromWelcome = () => {
        setIsWelcomeModalOpen(false);
        setCameFromWelcome('tools');
        setIsToolLibraryModalOpen(true);
    };
    
    const handleSaveSettings = (newSettings) => {
        setMachineSettings(newSettings);
        setIsSettingsModalOpen(false);
        if (cameFromWelcome === 'settings') {
            setMachineSetupCompleted(true);
            localStorage.setItem('cnc-app-machine-setup-complete', 'true');
            setIsWelcomeModalOpen(true);
            setCameFromWelcome(null);
        }
    };

    const handleCancelSettings = () => {
        setIsSettingsModalOpen(false);
        if (cameFromWelcome === 'settings') {
            setIsWelcomeModalOpen(true);
            setCameFromWelcome(null);
        }
    };
    
    const handleSaveToolLibrary = (newLibrary) => {
        setToolLibrary(newLibrary);
        setIsToolLibraryModalOpen(false);
        if (cameFromWelcome === 'tools') {
            setIsWelcomeModalOpen(true);
            setCameFromWelcome(null);
        }
    };

    const handleCancelTools = () => {
        setIsToolLibraryModalOpen(false);
        if (cameFromWelcome === 'tools') {
            setIsWelcomeModalOpen(true);
            setCameFromWelcome(null);
        }
    };


    return React.createElement('div', { className: "min-h-screen bg-background font-sans text-text-primary flex flex-col" },
        React.createElement(Analytics, null),
        !isAudioUnlocked && React.createElement('div', { className: "bg-accent-yellow/20 text-accent-yellow text-center p-2 text-sm font-semibold animate-pulse" },
            "Click anywhere or press any key to enable sound notifications"
        ),
        React.createElement(NotificationContainer, {
            notifications: notifications,
            onDismiss: removeNotification
        }),
        React.createElement(WelcomeModal, {
            isOpen: isWelcomeModalOpen,
            onClose: handleCloseWelcomeModal,
            onOpenSettings: handleOpenSettingsFromWelcome,
            onOpenToolLibrary: handleOpenToolsFromWelcome,
            isMachineSetupComplete: machineSetupCompleted,
            isToolLibrarySetupComplete: toolLibrary.length > 0
        }),
        React.createElement(PreflightChecklistModal, {
            isOpen: isPreflightModalOpen,
            onCancel: () => setIsPreflightModalOpen(false),
            onConfirm: handleStartJobConfirmed,
            jobInfo: { fileName, gcodeLines, timeEstimate, startLine: jobStartOptions.startLine },
            isHomed: isHomedSinceConnect,
            warnings: preflightWarnings,
            selectedTool: selectedTool,
        }),
        React.createElement(MacroEditorModal, {
            isOpen: isMacroEditorOpen,
            onCancel: handleCloseMacroEditor,
            onSave: handleSaveMacro,
            onDelete: handleDeleteMacro,
            macro: editingMacroIndex !== null ? macros[editingMacroIndex] : null,
            index: editingMacroIndex
        }),
        React.createElement(SettingsModal, {
            isOpen: isSettingsModalOpen,
            onCancel: handleCancelSettings,
            onSave: handleSaveSettings,
            settings: machineSettings,
            onResetDialogs: () => {
                localStorage.removeItem('cnc-app-skip-preflight');
                addNotification("Dialog settings have been reset.", 'info');
            },
            onExport: handleExportSettings,
            onImport: handleImportSettings,
        }),
        React.createElement(ToolLibraryModal, {
            isOpen: isToolLibraryModalOpen,
            onCancel: handleCancelTools,
            onSave: handleSaveToolLibrary,
            library: toolLibrary
        }),
        React.createElement(GCodeGeneratorModal, {
            isOpen: isGCodeGeneratorModalOpen,
            onCancel: () => setIsGCodeGeneratorModalOpen(false),
            onLoadGCode: handleGeneratedGCodeLoad,
            unit: unit,
            settings: machineSettings,
            toolLibrary: toolLibrary
        }),
        React.createElement('header', { className: "bg-surface shadow-md p-4 flex justify-between items-center z-10 flex-shrink-0 gap-4" },
            React.createElement('div', { className: "flex items-center gap-2" },
                 React.createElement('img', { src: "/mycnc-logo.png", alt: 'mycnc.app logo', className: 'h-8 w-auto' }),
                 React.createElement('span', { className: 'text-xs text-text-secondary font-mono' }, version)
            ),
            React.createElement('div', { className: "flex items-center gap-4" },
                React.createElement('button', {
                    onClick: () => setIsToolLibraryModalOpen(true),
                    title: "Tool Library",
                    className: "p-2 rounded-md bg-secondary text-text-primary hover:bg-secondary-focus focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface"
                }, React.createElement(BookOpen, { className: 'w-5 h-5' })),
                React.createElement('button', {
                    onClick: () => setIsSettingsModalOpen(true),
                    title: "Machine Settings",
                    className: "p-2 rounded-md bg-secondary text-text-primary hover:bg-secondary-focus focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface"
                }, React.createElement(Settings, { className: 'w-5 h-5' })),
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
        React.createElement('div', { className: "bg-accent-yellow/20 text-accent-yellow text-center p-2 text-sm font-semibold flex items-center justify-center gap-2" }, 
            React.createElement(AlertTriangle, { className: "w-4 h-4" }),
            "Work in Progress: This software is for demonstration purposes only. Use at your own risk."
        ),
        React.createElement(StatusBar, {
            isConnected: isConnected,
            machineState: machineState,
            unit: unit,
            onEmergencyStop: handleEmergencyStop,
            flashingButton: flashingButton
        }),
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
        error && React.createElement('div', { className: "bg-accent-red/20 border-l-4 border-accent-red text-accent-red p-4 m-4 flex items-start", role: "alert" },
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
                    onClearFile: handleClearFile,
                    machineState: machineState,
                    onFeedOverride: handleFeedOverride,
                    timeEstimate: timeEstimate,
                    machineSettings: machineSettings,
                    toolLibrary: toolLibrary,
                    selectedToolId: selectedToolId,
                    onToolSelect: setSelectedToolId,
                    onOpenGenerator: () => setIsGCodeGeneratorModalOpen(true),
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
                    onFlash: flashControl,
                    unit: unit,
                    onUnitChange: handleUnitChange,
                    isJobActive: isJobActive,
                    isJogging: isJogging,
                    isMacroRunning: isMacroRunning,
                }),
                 React.createElement(WebcamPanel, {}),
                React.createElement(MacrosPanel, {
                    macros: macros,
                    onRunMacro: handleRunMacro,
                    onOpenEditor: handleOpenMacroEditor,
                    isEditMode: isMacroEditMode,
                    onToggleEditMode: () => setIsMacroEditMode(prev => !prev),
                    disabled: isAnyControlLocked
                }),
                React.createElement(Console, {
                    logs: consoleLogs,
                    onSendCommand: handleManualCommand,
                    isConnected: isConnected,
                    isJobActive: isJobActive,
                    isMacroRunning: isMacroRunning,
                    isLightMode: isLightMode,
                    isVerbose: isVerbose,
                    onVerboseChange: setIsVerbose,
                })
            )
        ),
        React.createElement(Footer, null)
    );
};

export default App;