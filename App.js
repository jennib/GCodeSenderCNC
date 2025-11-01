
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
import { NotificationContainer } from './components/Notification.js';
import ThemeToggle from './components/ThemeToggle.js';
import StatusBar from './components/StatusBar.js';
import { AlertTriangle, OctagonAlert, Unlock, Settings, Maximize, Minimize, BookOpen } from './components/Icons.js';
import { estimateGCodeTime } from './services/gcodeTimeEstimator.js';
import { analyzeGCode } from './services/gcodeAnalyzer.js';
import { Analytics } from '@vercel/analytics/react';
import Footer from './components/Footer.js';
import ContactModal from './components/ContactModal.js';
import UnsupportedBrowser from './components/UnsupportedBrowser.js';
import ManualToolChangeModal from './components/ManualToolChangeModal.js';
import GCodeGeneratorModal from './components/GCodeGeneratorModal.js';
import WelcomeModal from './components/WelcomeModal.js';

const h = React.createElement;

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
    0: "No error - Possible crash dump of your controller. Please seek advice from your controller vendor.",
    1: "G-code words consist of a letter and a value. Letter was not found.",
    2: "Numeric value format is not valid or missing an expected value.",
    3: "Machine ‘$’ system command was not recognized or supported.",
    4: "Negative value received for an expected positive value.",
    5: "Homing cycle is not enabled via settings.",
    6: "Minimum step pulse time must be greater than 3usec",
    7: "EEPROM read failed. Reset and restored to default values.",
    8: "Machine ‘$’ command cannot be used unless Machine is IDLE. Ensures smooth operation during a job.",
    9: "G-code locked out during alarm or jog state",
    10: "Soft limits cannot be enabled without homing also enabled.",
    11: "Max characters per line exceeded. Line was not processed and executed.",
    12: "‘$’ setting value exceeds the maximum step rate supported.",
    13: "Safety door detected as opened and door state initiated.",
    14: "(Machine-Mega Only) Build info or start up line exceeded EEPROM line length limit.",
    15: "Jog target exceeds machine travel. Command ignored.",
    16: "Jog command with no ‘=’ or contains prohibited g-code.",
    17: "Laser mode requires PWM output. Your controller may not be suited to running this firmware or no pin is assigned to regulate laser power.",
    18: "No homing cycle defined in settings, check peripherals tab to ensure you have at least one axis homing.",
    20: "Unsupported or invalid g-code command found in block.",
    21: "More than one g-code command from same modal group found in block.",
    22: "Feed rate has not yet been set or is undefined.",
    23: "G-code command in block requires an integer value.",
    24: "Two G-code commands that both require the use of the XYZ axis words were detected in the block.",
    25: "A G-code word was repeated in the block.",
    26: "A G-code command implicitly or explicitly requires XYZ axis words in the block, but none were detected.",
    27: "N line number value is not within the valid range of 1 – 9,999,999.",
    28: "A G-code command was sent, but is missing some required P or L value words in the line.",
    29: "Machine supports six work coordinate systems G54-G59. G59.1, G59.2, and G59.3 are not supported.",
    30: "The G53 G-code command requires either a G0 seek or G1 feed motion mode to be active. A different motion was active.",
    31: "There are unused axis words in the block and G80 motion mode cancel is active.",
    32: "A G2 or G3 arc was commanded but there are no XYZ axis words in the selected plane to trace the arc.",
    33: "The motion command has an invalid target. G2, G3, and G38.2 generates this error, if the arc is impossible to generate or if the probe target is the current position.",
    34: "A G2 or G3 arc, traced with the radius definition, had a mathematical error when computing the arc geometry. Try either breaking up the arc into semi-circles or quadrants, or redefine them with the arc offset definition.",
    35: "A G2 or G3 arc, traced with the offset definition, is missing the IJK offset word in the selected plane to trace the arc.",
    36: "There are unused, leftover G-code words that aren’t used by any command in the block.",
    37: "The G43.1 dynamic tool length offset command cannot apply an offset to an axis other than its configured axis. The Machine default axis is the Z-axis.",
    38: "An invalid tool number sent to the parser",
    39: "P parameter value is too large. P values are generally in seconds not milliseconds. Please adjust to a lower number.",
    60: "SD card failed to initialize, Card is likely not inserted OR try ejecting and re-inserting your SD card.",
    61: "SD card failed to read, the most common cause is special characters in your filename, please remove any non-letters or numbers. If this fails, try deleting and replacing your file or formatting your SD card.",
    62: "SD card failed to open directory, the most common causes are: Controller has just connected to Commander, SD card not being inserted or special characters in your filename, please remove any non-letters or numbers. If this fails, try deleting and replacing your folder or formatting your SD card.",
    63: "SD card directory not found. Likely the folder doesn't exist, check your SD card.",
    64: "SD card file empty, you likely have uploaded a blank file by mistake. Please recompile your job and re-upload.",
    65: "SD card file not found.  Likely the file doesn't exist, check your SD card.",
    66: "SD card failed to open. Likely the SD card may need to be formatted. Please ensure to make any back ups before formatting!",
    67: "SD card is busy. Likely the SD is doing something else right now. Please try again shortly or remove and re-insert your SD card.",
    68: "SD failed to delete directory. Please try to delete the folder using your desktop PC.",
    69: "SD failed to delete file. Please try to delete the file using your desktop PC.",
    70: "Bluetooth failed to start. Try power-cycling your controller or seek advice from your controller vendor.",
    71: "Wifi failed to start. Try power-cycling your controller or seek advice from your controller vendor.",
    80: "Number is out of range for setting. Likely the setting you are trying to change does not exist.",
    81: "Invalid value for setting, The value entered is either not in the right range or may not be the right value i.e: Letter entered when it must a number.",
    90: "Failed to send message, seek advice from your controller vendor.",
    100: "Failed to store setting, seek advice from your controller vendor.",
    101: "Failed to get setting status, seek advice from your controller vendor.",
    110: "Authentication failed. You may have a password required to access your controller.",
    120: "Another interface is busy, Close out of any WebUI windows or wait until they finish uploading your job file before proceeding."
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
    probe: { xOffset: 3.0, yOffset: 3.0, zOffset: 15.0, feedRate: 25 },
    hasATC: false,
    scripts: {
        startup: ['G21', 'G90'].join('\n'), // Set units to mm, absolute positioning
        automaticToolChange: 'M6 T{T}', // Standard ATC command
        manualToolChange: ['M5', 'G0 Z10'].join('\n'), // Stop spindle, raise Z before pausing
        shutdown: ['M5', 'G0 X0 Y0'].join('\n') // Stop spindle, go to WCS zero
    }
};

const usePrevious = (value) => {
    const ref = useRef();
    useEffect(() => {
        ref.current = value;
    });
    return ref.current;
};

const buildTimestamp = 'v24.07.30.1'; // Static version identifier

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
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Modal States
    const [isMacroEditorOpen, setIsMacroEditorOpen] = useState(false);
    const [editingMacroIndex, setEditingMacroIndex] = useState(null);
    const [isMacroEditMode, setIsMacroEditMode] = useState(false);
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    const [isToolLibraryModalOpen, setIsToolLibraryModalOpen] = useState(false);
    const [isContactModalOpen, setIsContactModalOpen] = useState(false);
    const [isGeneratorModalOpen, setIsGeneratorModalOpen] = useState(false);
    const [isWelcomeModalOpen, setIsWelcomeModalOpen] = useState(false);
    const [isToolChangeModalOpen, setIsToolChangeModalOpen] = useState(false);
    
    const [toolChangeInfo, setToolChangeInfo] = useState({ toolNumber: null });
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
            let parsed = saved ? JSON.parse(saved) : { ...DEFAULT_SETTINGS };
             if (!parsed.probe) {
                parsed.probe = { ...DEFAULT_SETTINGS.probe };
            }
            if (parsed.probe && typeof parsed.probe.feedRate === 'undefined') {
                parsed.probe.feedRate = DEFAULT_SETTINGS.probe.feedRate;
            }
            if (!parsed.scripts) {
                parsed.scripts = { ...DEFAULT_SETTINGS.scripts };
            } else {
                if (typeof parsed.scripts.automaticToolChange === 'undefined') {
                    parsed.scripts.automaticToolChange = DEFAULT_SETTINGS.scripts.automaticToolChange;
                }
                if (typeof parsed.scripts.manualToolChange === 'undefined') {
                    parsed.scripts.manualToolChange = DEFAULT_SETTINGS.scripts.manualToolChange;
                }
            }
            if (typeof parsed.hasATC === 'undefined') {
                parsed.hasATC = false;
            }
            return parsed;
        } catch {
            return { ...DEFAULT_SETTINGS };
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
    const toolChangePromiseRef = useRef(null);
    
    useEffect(() => {
        const hasSeenWelcome = localStorage.getItem('cnc-app-seen-welcome');
        if (!hasSeenWelcome) {
            setIsWelcomeModalOpen(true);
        }
    }, []);

    const handleCloseWelcome = () => {
        localStorage.setItem('cnc-app-seen-welcome', 'true');
        setIsWelcomeModalOpen(false);
    };

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
        const timerId = window.setTimeout(() => {
            removeNotification(id);
        }, duration);
        setNotifications(prev => [...prev, { id, message, type, timerId }]);
    }, [removeNotification]);

    useEffect(() => {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) {
            console.error("AudioContext not supported by this browser.");
            return;
        }
        const context = new AudioContext();
        audioContextRef.current = context;

        fetch('/completion-sound.mp3')
            .then(response => {
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                return response.arrayBuffer();
            })
            .then(arrayBuffer => context.decodeAudioData(arrayBuffer))
            .then(decodedData => { audioBufferRef.current = decodedData; })
            .catch(error => {
                console.error("Failed to load or decode completion sound:", error);
                addNotification('Could not load notification sound.', 'error');
            });

        const unlockAudio = () => {
            if (context.state === 'suspended') {
                context.resume().then(() => {
                    setIsAudioUnlocked(true);
                    document.removeEventListener('click', unlockAudio);
                    document.removeEventListener('keydown', unlockAudio);
                });
            } else {
                setIsAudioUnlocked(true);
                document.removeEventListener('click', unlockAudio);
                document.removeEventListener('keydown', unlockAudio);
            }
        };

        document.addEventListener('click', unlockAudio);
        document.addEventListener('keydown', unlockAudio);

        return () => {
            document.removeEventListener('click', unlockAudio);
            document.removeEventListener('keydown', unlockAudio);
            context.close();
        };
    }, [addNotification]);
    
    useEffect(() => {
        const onFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', onFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
    }, []);

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
        let processedLog = { ...log, timestamp: new Date() };

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
            if (!isVerbose && processedLog.type === 'received' && trimmedMessage === 'ok') {
                const lastLog = prev.length > 0 ? prev[prev.length - 1] : null;
                if (lastLog && lastLog.type === 'received' && /^ok\.*$/.test(lastLog.message)) {
                    if (lastLog.message.length < 60) {
                        const newLogs = [...prev];
                        newLogs[newLogs.length - 1] = { ...lastLog, message: lastLog.message + '.' };
                        return newLogs;
                    } 
                }
            }
            return [...prev, processedLog].slice(-200);
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
            onConnect: async (info) => {
                setIsConnected(true);
                setPortInfo(info);
                addLog({ type: 'status', message: `Connected to ${useSimulator ? 'simulator' : 'port'} at 115200 baud.` });
                setError(null);
                setIsSimulatedConnection(useSimulator);
                setIsHomedSinceConnect(false);
                
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

        const serialCallbacks = {
            ...commonCallbacks,
            onManualToolChangeRequired: (toolNumber) => {
                return new Promise((resolve, reject) => {
                    setToolChangeInfo({ toolNumber });
                    setIsToolChangeModalOpen(true);
                    toolChangePromiseRef.current = { resolve, reject };
                });
            }
        };

        try {
            const manager = useSimulator
                ? new SimulatedSerialManager(serialCallbacks)
                : new SerialManager(serialCallbacks);
            
            serialManagerRef.current = manager;
            await manager.connect(115200);
            
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            setError(`Failed to connect: ${errorMessage}`);
            addLog({ type: 'error', message: `Failed to connect: ${errorMessage}` });
        }
    }, [addLog, isSerialApiSupported, useSimulator, addNotification, playCompletionSound, machineSettings.scripts, isVerbose]);

    const handleDisconnect = useCallback(async () => {
        if (jobStatus === JobStatus.Running || jobStatus === JobStatus.Paused) {
            if (!window.confirm("A job is currently running or paused. Are you sure you want to disconnect? This will stop the job.")) {
                return;
            }
        }
        
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
        const lines = content.split('\n')
            .map(l => l.replace(/\(.*\)/g, ''))
            .map(l => l.split(';')[0])
            .map(l => l.trim())
            .filter(l => l && l !== '%');

        setGcodeLines(lines);
        setFileName(name);
        setProgress(0);
        setJobStatus(JobStatus.Idle);
        setSelectedToolId(null);
        setTimeEstimate(estimateGCodeTime(lines));
        addLog({ type: 'status', message: `Loaded ${name} (${lines.length} lines).` });
    };
    
    const handleLoadGeneratedGCode = (gcode, name) => {
        handleFileLoad(gcode, name);
        setIsGeneratorModalOpen(false);
    };

    const handleClearFile = () => {
        setGcodeLines([]);
        setFileName('');
        setProgress(0);
        setJobStatus(JobStatus.Idle);
        setTimeEstimate({ totalSeconds: 0, cumulativeSeconds: [] });
        addLog({ type: 'status', message: 'G-code cleared.' });
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

    const handleStartJobConfirmed = useCallback((options) => {
        const manager = serialManagerRef.current;
        if (!manager || !isConnected || gcodeLines.length === 0) return;

        setIsPreflightModalOpen(false);
        setJobStatus(JobStatus.Running);
        manager.sendGCode(gcodeLines, toolLibrary, machineSettings, {
            startLine: jobStartOptions.startLine,
            isDryRun: options.isDryRun
        });
    }, [isConnected, gcodeLines, jobStartOptions, toolLibrary, machineSettings]);

    const handleJobControl = useCallback((action, options) => {
        const manager = serialManagerRef.current;
        if (!manager || !isConnected) return;

        switch (action) {
            case 'start':
                if (gcodeLines.length > 0) {
                    const warnings = analyzeGCode(gcodeLines, machineSettings);
                    setPreflightWarnings(warnings);
                    setJobStartOptions({ startLine: options?.startLine ?? 0, isDryRun: false });
                    setIsPreflightModalOpen(true);
                }
                break;
            case 'pause':
                setJobStatus(currentStatus => (currentStatus === JobStatus.Running) ? (manager.pause(), JobStatus.Paused) : currentStatus);
                break;
            case 'resume':
                setJobStatus(currentStatus => (currentStatus === JobStatus.Paused) ? (manager.resume(), JobStatus.Running) : currentStatus);
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
    }, [isConnected, gcodeLines, machineSettings]);
    
    const handleManualCommand = useCallback((command) => {
        serialManagerRef.current?.sendLine(command);
    }, []);

    const handleJog = (axis, direction, step) => {
        if (!serialManagerRef.current) return;
        if (axis === 'Z' && unit === 'mm' && step > 10) { addLog({ type: 'error', message: 'Z-axis jog step cannot exceed 10mm.' }); return; }
        if (axis === 'Z' && unit === 'in' && step > 1) { addLog({ type: 'error', message: 'Z-axis jog step cannot exceed 1in.' }); return; }
        const feedRate = 1000;
        const command = `$J=G91 ${axis}${step * direction} F${feedRate}`;
        setIsJogging(true); 
        serialManagerRef.current.sendLineAndWaitForOk(command).catch((err) => {
            const errorMessage = err instanceof Error ? err.message : "An error occurred during jog.";
            if (!errorMessage.includes('Cannot send new line')) { addLog({ type: 'error', message: `Jog failed: ${errorMessage}` }); }
            setIsJogging(false);
        });
    };

    const flashControl = useCallback((buttonId) => {
        setFlashingButton(buttonId);
        setTimeout(() => setFlashingButton(null), 200);
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
        let gcode = command === 'cw' ? `M3 S${speed}` : command === 'ccw' ? `M4 S${speed}` : 'M5';
        manager.sendLine(gcode);
    }, [isConnected]);
    
    const handleFeedOverride = useCallback((command) => {
        const manager = serialManagerRef.current;
        if (!manager) return;
        const commandMap = { 'reset': '\x90', 'inc10': '\x91', 'dec10': '\x92', 'inc1': '\x93', 'dec1': '\x94' };
        if (commandMap[command]) manager.sendRealtimeCommand(commandMap[command]);
    }, []);

    const isAlarm = machineState?.status === 'Alarm';

    const handleUnitChange = useCallback((newUnit) => {
        if (newUnit === unit || !serialManagerRef.current) return;
        const command = newUnit === 'mm' ? 'G21' : 'G20';
        serialManagerRef.current.sendLine(command);
        setUnit(newUnit);
        addLog({ type: 'status', message: `Units set to ${newUnit === 'mm' ? 'millimeters' : 'inches'}.` });
        setJogStep(newUnit === 'mm' ? 1 : 0.1);
    }, [unit, addLog]);

    const handleProbe = useCallback(async (axes) => {
        const manager = serialManagerRef.current;
        if (!manager || !isConnected) { addLog({ type: 'error', message: 'Cannot probe while disconnected.' }); return; }
        const offsets = { x: machineSettings.probe.xOffset, y: machineSettings.probe.yOffset, z: machineSettings.probe.zOffset };
        const probeTravel = unit === 'mm' ? -25 : -1.0;
        const probeFeed = machineSettings.probe.feedRate || 25;
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
            if (axes.includes('X') && offsets.x !== undefined) await probeAxis('X', offsets.x);
            if (axes.includes('Y') && offsets.y !== undefined) await probeAxis('Y', offsets.y);
            if (axes.includes('Z') && offsets.z !== undefined) await probeAxis('Z', offsets.z);
            addLog({ type: 'status', message: 'Probe cycle complete.' });
            addNotification(`${axes.toUpperCase()}-Probe cycle complete.`, 'success');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            addLog({ type: 'error', message: `Probe cycle failed: ${errorMessage}` });
            setError(`Probe cycle failed: ${errorMessage}`);
            manager.sendLine('\x18', false);
        }
    }, [isConnected, addLog, addNotification, unit, setError, machineSettings.probe]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!isConnected || (document.activeElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName))) return;
            let handled = true;
            switch (e.key.toLowerCase()) {
                case 'arrowup': handleJog('Y', 1, jogStep); flashControl('jog-y-plus'); break;
                case 'arrowdown': handleJog('Y', -1, jogStep); flashControl('jog-y-minus'); break;
                case 'arrowleft': handleJog('X', -1, jogStep); flashControl('jog-x-minus'); break;
                case 'arrowright': handleJog('X', 1, jogStep); flashControl('jog-x-plus'); break;
                case 'pageup': handleJog('Z', 1, jogStep); flashControl('jog-z-plus'); break;
                case 'pagedown': handleJog('Z', -1, jogStep); flashControl('jog-z-minus'); break;
                case 'escape': handleEmergencyStop(); flashControl('estop'); break;
                case 'x': if (isAlarm) { handleManualCommand('$X'); flashControl('unlock-button'); } else { handled = false; } break;
                case '1': case '2': case '3': case '4': case '5':
                    const stepSizes = unit === 'mm' ? [0.01, 0.1, 1, 10, 50] : [0.001, 0.01, 0.1, 1, 2];
                    const newStep = stepSizes[parseInt(e.key) - 1];
                    if (newStep) { setJogStep(newStep); flashControl(`step-${newStep}`); }
                    break;
                default: handled = false; break;
            }
            if (handled) e.preventDefault();
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isConnected, jogStep, handleJog, flashControl, handleEmergencyStop, isAlarm, handleManualCommand, unit]);

    const handleHome = useCallback((axes) => {
        const manager = serialManagerRef.current;
        if (!manager) return;
        setMachineState(prev => ({ ...(prev || { status: 'Idle', code: null, wpos:{x:0,y:0,z:0}, mpos:{x:0,y:0,z:0}, spindle:{state: 'off', speed: 0}, ov:[100,100,100] }), status: 'Home' }));
        addLog({ type: 'status', message: `Starting homing cycle for: ${axes.toUpperCase()}...` });
        const commands = { all: ['$H'], x: ['$HX'], y: ['$HY'], z: ['$HZ'], xy: ['$HXY'] }[axes];
        if (commands) commands.forEach(cmd => manager.sendLine(cmd));
    }, [addLog]);

    const handleSetZero = useCallback((axes) => {
        let command = 'G10 L20 P1';
        if (axes === 'all') command += ' X0 Y0 Z0';
        else if (axes === 'xy') command += ' X0 Y0';
        else command += ` ${axes.toUpperCase()}0`;
        serialManagerRef.current?.sendLine(command);
        addLog({type: 'status', message: `Work coordinate origin set for ${axes.toUpperCase()}.`});
    }, [addLog]);

    const handleRunMacro = useCallback(async (commands) => {
        const manager = serialManagerRef.current;
        if (!manager) return;
        const processedCommands = commands.map(cmd => cmd.replace(/{unit}/g, unit).replace(/{safe_z}/g, unit === 'mm' ? '10' : '0.4'));
        setIsMacroRunning(true);
        addLog({ type: 'status', message: `Running macro: ${processedCommands.join('; ')}` });
        try {
            for (const command of processedCommands) await manager.sendLineAndWaitForOk(command);
            addLog({ type: 'status', message: 'Macro finished.' });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            addLog({ type: 'error', message: `Macro failed: ${errorMessage}` });
            setError(`Macro failed: ${errorMessage}`);
        } finally {
            setIsMacroRunning(false);
        }
    }, [addLog, unit, setError]);
    
    const handleToggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => alert(`Error: ${err.message}`));
        } else {
            if (document.exitFullscreen) document.exitFullscreen();
        }
    };

    const isJobActive = jobStatus === JobStatus.Running || jobStatus === JobStatus.Paused;
    const isMobile = typeof window.orientation !== 'undefined' || navigator.userAgent.indexOf('IEMobile') !== -1;

    if (!isSerialApiSupported || isMobile) return h(UnsupportedBrowser, null);
    
    const alarmInfo = isAlarm ? (GRBL_ALARM_CODES[machineState.code] || GRBL_ALARM_CODES.default) : null;
    const isAnyControlLocked = !isConnected || isJobActive || isJogging || isMacroRunning || (machineState?.status && ['Alarm', 'Home'].includes(machineState.status));
    
    const handleSaveSettings = (newSettings) => { setMachineSettings(newSettings); setIsSettingsModalOpen(false); };
    const handleSaveToolLibrary = (newLibrary) => { setToolLibrary(newLibrary); setIsToolLibraryModalOpen(false); };
    
    const handleSaveMacro = useCallback((macro, index) => {
        setMacros(prevMacros => {
            const newMacros = [...prevMacros];
            if (index !== null && index >= 0) newMacros[index] = macro; else newMacros.push(macro);
            return newMacros;
        });
        addNotification('Macro saved!', 'success');
        setIsMacroEditorOpen(false);
    }, [addNotification]);
    
    const handleDeleteMacro = useCallback((index) => {
        setMacros(prevMacros => prevMacros.filter((_, i) => i !== index));
        addNotification('Macro deleted!', 'success');
        setIsMacroEditorOpen(false);
    }, [addNotification]);

    const handleExportSettings = useCallback(() => {
        const settingsToExport = { machineSettings, macros, toolLibrary };
        const blob = new Blob([JSON.stringify(settingsToExport, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `mycnc-app-settings-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        addNotification('Settings exported successfully!', 'success');
    }, [machineSettings, macros, toolLibrary, addNotification]);

    const handleImportSettings = useCallback((imported) => {
        if (window.confirm("This will overwrite your current macros, settings, and tool library. Are you sure?")) {
            if (imported.machineSettings && imported.macros && imported.toolLibrary) {
                if (!imported.machineSettings.probe) imported.machineSettings.probe = { ...DEFAULT_SETTINGS.probe };
                if (imported.machineSettings.probe && typeof imported.machineSettings.probe.feedRate === 'undefined') imported.machineSettings.probe.feedRate = DEFAULT_SETTINGS.probe.feedRate;
                if (!imported.machineSettings.scripts) imported.machineSettings.scripts = { ...DEFAULT_SETTINGS.scripts };
                else {
                    if (typeof imported.machineSettings.scripts.automaticToolChange === 'undefined') imported.machineSettings.scripts.automaticToolChange = DEFAULT_SETTINGS.scripts.automaticToolChange;
                    if (typeof imported.machineSettings.scripts.manualToolChange === 'undefined') imported.machineSettings.scripts.manualToolChange = DEFAULT_SETTINGS.scripts.manualToolChange;
                }
                if (typeof imported.machineSettings.hasATC === 'undefined') {
                    imported.machineSettings.hasATC = false;
                }
                setMachineSettings(imported.machineSettings);
                setMacros(imported.macros);
                setToolLibrary(imported.toolLibrary);
                addNotification("Settings imported successfully!", 'success');
            } else { addNotification("Invalid settings file.", 'error'); }
        }
    }, [addNotification]);

    const handleResetDialogs = useCallback(() => {
        localStorage.removeItem('cnc-app-skip-preflight');
        addNotification("Dialog settings have been reset.", 'info');
    }, [addNotification]);

    return h('div', { className: "min-h-screen bg-background font-sans text-text-primary flex flex-col" },
        h(Analytics, null),
        !isAudioUnlocked && h('div', { className: "bg-accent-yellow/20 text-accent-yellow text-center p-2 text-sm font-semibold animate-pulse" }, "Click anywhere or press any key to enable sound notifications"),
        h(NotificationContainer, { notifications, onDismiss: removeNotification }),
        h(ContactModal, { isOpen: isContactModalOpen, onClose: () => setIsContactModalOpen(false) }),
        h(WelcomeModal, { 
            isOpen: isWelcomeModalOpen, 
            onClose: handleCloseWelcome,
            onOpenSettings: () => { handleCloseWelcome(); setIsSettingsModalOpen(true); },
            onOpenToolLibrary: () => { handleCloseWelcome(); setIsToolLibraryModalOpen(true); },
            isMachineSetupComplete: JSON.stringify(machineSettings) !== JSON.stringify(DEFAULT_SETTINGS),
            isToolLibrarySetupComplete: toolLibrary.length > 0
        }),
        h(GCodeGeneratorModal, { isOpen: isGeneratorModalOpen, onCancel: () => setIsGeneratorModalOpen(false), onLoadGCode: handleLoadGeneratedGCode, unit, settings: machineSettings, toolLibrary }),
        h(PreflightChecklistModal, { isOpen: isPreflightModalOpen, onCancel: () => setIsPreflightModalOpen(false), onConfirm: handleStartJobConfirmed, jobInfo: { fileName, gcodeLines, timeEstimate, startLine: jobStartOptions.startLine }, isHomed: isHomedSinceConnect, warnings: preflightWarnings, selectedTool: toolLibrary.find(t => t.id === selectedToolId) || null }),
        h(MacroEditorModal, { isOpen: isMacroEditorOpen, onCancel: () => setIsMacroEditorOpen(false), onSave: handleSaveMacro, onDelete: handleDeleteMacro, macro: editingMacroIndex !== null ? macros[editingMacroIndex] : null, index: editingMacroIndex }),
        h(SettingsModal, { isOpen: isSettingsModalOpen, onCancel: () => setIsSettingsModalOpen(false), onSave: handleSaveSettings, settings: machineSettings, onExport: handleExportSettings, onImport: handleImportSettings, onResetDialogs: handleResetDialogs }),
        h(ToolLibraryModal, { isOpen: isToolLibraryModalOpen, onCancel: () => setIsToolLibraryModalOpen(false), onSave: handleSaveToolLibrary, library: toolLibrary }),
        h(ManualToolChangeModal, {
            isOpen: isToolChangeModalOpen,
            onContinue: () => {
                setIsToolChangeModalOpen(false);
                if (toolChangePromiseRef.current) { toolChangePromiseRef.current.resolve(); toolChangePromiseRef.current = null; }
            },
            onStop: () => {
                setIsToolChangeModalOpen(false);
                if (toolChangePromiseRef.current) { toolChangePromiseRef.current.reject(new Error("Job stopped by user during tool change.")); toolChangePromiseRef.current = null; }
                handleJobControl('stop');
            },
            toolInfo: toolChangeInfo
        }),

        h('header', { className: "bg-surface shadow-md p-4 flex justify-between items-center z-10 flex-shrink-0 gap-4" },
            h('div', { className: "flex items-center gap-4" },
                h('svg', { viewBox: '0 0 460 100', className: 'h-8 w-auto', 'aria-label': 'mycnc.app logo' },
                    h('g', { transform: 'translate(48,48)', fill: 'none', stroke: 'var(--color-text-primary)', strokeWidth: '4' },
                        h('circle', { r: '48', cx: '0', cy: '0' }),
                        h('path', { d: 'M 0,-48 A 48,48 0 0 1 30,16 L 10,6 A 12,12 0 0 0 0,-12 Z' }),
                        h('path', { d: 'M 0,-48 A 48,48 0 0 1 30,16 L 10,6 A 12,12 0 0 0 0,-12 Z', transform: 'rotate(120)' }),
                        h('path', { d: 'M 0,-48 A 48,48 0 0 1 30,16 L 10,6 A 12,12 0 0 0 0,-12 Z', transform: 'rotate(-120)' }),
                        h('circle', { r: '12', cx: '0', cy: '0' })
                    ),
                    h('text', { x: '108', y: '66', fontFamily: "Inter, 'Segoe UI', Roboto, Arial, sans-serif", fontWeight: '700', fontSize: '64px', letterSpacing: '-0.02em', fill: 'var(--color-text-primary)' },
                        h('tspan', { style: { fill: 'var(--color-primary)' } }, 'mycnc'), '.app'
                    )
                ),
                h('span', { className: 'text-xs text-text-secondary font-mono pt-1' }, buildTimestamp)
            ),
            h('div', { className: "flex items-center gap-4" },
                h('button', { onClick: handleToggleFullscreen, title: isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen", className: "p-2 rounded-md bg-secondary text-text-primary hover:bg-secondary-focus focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface" }, isFullscreen ? h(Minimize, { className: 'w-5 h-5' }) : h(Maximize, { className: 'w-5 h-5' })),
                h('button', { onClick: () => setIsToolLibraryModalOpen(true), title: "Tool Library", className: "p-2 rounded-md bg-secondary text-text-primary hover:bg-secondary-focus focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface" }, h(BookOpen, { className: 'w-5 h-5' })),
                h('button', { onClick: () => setIsSettingsModalOpen(true), title: "Machine Settings", className: "p-2 rounded-md bg-secondary text-text-primary hover:bg-secondary-focus focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface" }, h(Settings, { className: 'w-5 h-5' })),
                h(ThemeToggle, { isLightMode: isLightMode, onToggle: () => setIsLightMode((prev) => !prev) }),
                h(SerialConnector, { isConnected: isConnected, portInfo: portInfo, onConnect: handleConnect, onDisconnect: handleDisconnect, isApiSupported: isSerialApiSupported, isSimulated: isSimulatedConnection, useSimulator: useSimulator, onSimulatorChange: setUseSimulator })
            )
        ),

        h('div', { className: "bg-accent-yellow/20 text-accent-yellow text-center p-2 text-sm font-semibold flex items-center justify-center gap-2" }, h(AlertTriangle, { className: "w-4 h-4" }), "Work in Progress: This software is for demonstration purposes only. Use at your own risk."),

        h(StatusBar, { isConnected, machineState, unit, onEmergencyStop: handleEmergencyStop, flashingButton }),

        isAlarm && h('div', { className: "bg-accent-red/20 border-b-4 border-accent-red text-accent-red p-4 m-4 flex items-start", role: "alert" },
            h(OctagonAlert, { className: "h-8 w-8 mr-4 flex-shrink-0" }),
            h('div', { className: "flex-grow" },
                h('h3', { className: "font-bold text-lg" }, `Machine Alarm: ${alarmInfo.name}`),
                h('p', { className: "text-sm" }, alarmInfo.desc),
                h('p', { className: "text-sm mt-2" }, h('strong', null, "Resolution: "), alarmInfo.resolution)
            ),
            h('button', { id: "unlock-button", title: "Unlock Machine (Hotkey: x)", onClick: () => handleManualCommand('$X'), className: `ml-4 flex items-center gap-2 px-4 py-2 bg-accent-red text-white font-semibold rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-background transition-all duration-100 ${flashingButton === 'unlock-button' ? 'ring-4 ring-white ring-inset' : ''}` },
                h(Unlock, { className: "w-5 h-5" }),
                "Unlock ($X)"
            )
        ),
        error && h('div', { className: "bg-accent-red/20 border-l-4 border-accent-red text-accent-red p-4 m-4 flex items-start", role: "alert" },
            h(AlertTriangle, { className: "h-6 w-6 mr-3 flex-shrink-0" }),
            h('p', null, error),
            h('button', { onClick: () => setError(null), className: "ml-auto font-bold" }, "X")
        ),

        h('main', { className: "flex-grow p-4 grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-0" },
            h('div', { className: "min-h-[60vh] lg:min-h-0" },
                h(GCodePanel, { 
                    onFileLoad: handleFileLoad, 
                    fileName, 
                    gcodeLines, 
                    onJobControl: handleJobControl, 
                    jobStatus, 
                    progress, 
                    isConnected, 
                    unit, 
                    onGCodeChange: handleGCodeChange, 
                    machineState, 
                    onFeedOverride: handleFeedOverride, 
                    timeEstimate, 
                    machineSettings, 
                    toolLibrary, 
                    selectedToolId, 
                    onToolSelect: setSelectedToolId, 
                    onOpenGenerator: () => setIsGeneratorModalOpen(true), 
                    onClearFile: handleClearFile 
                })
            ),
            h('div', { className: "flex flex-col gap-4 overflow-hidden min-h-0" },
                h(JogPanel, { 
                    isConnected, 
                    machineState, 
                    onJog: handleJog, 
                    onHome: handleHome, 
                    onSetZero: handleSetZero, 
                    onSpindleCommand: handleSpindleCommand, 
                    onProbe: handleProbe, 
                    jogStep, 
                    onStepChange: setJogStep, 
                    flashingButton, 
                    onFlash: flashControl, 
                    unit, 
                    onUnitChange: handleUnitChange, 
                    isJobActive, 
                    isJogging, 
                    isMacroRunning 
                }),
                h(WebcamPanel, {}),
                h(MacrosPanel, { 
                    macros: macros, 
                    onRunMacro: handleRunMacro, 
                    onOpenEditor: (index) => { setEditingMacroIndex(index); setIsMacroEditorOpen(true); }, 
                    isEditMode: isMacroEditMode, 
                    onToggleEditMode: () => setIsMacroEditMode(prev => !prev), 
                    disabled: isAnyControlLocked 
                }),
                h(Console, { logs: consoleLogs, onSendCommand: handleManualCommand, isConnected, isJobActive, isMacroRunning, isLightMode, isVerbose, onVerboseChange: setIsVerbose })
            )
        ),
        h(Footer, { onContactClick: () => setIsContactModalOpen(true) })
    );
};

export default App;
