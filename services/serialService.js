export class SerialManager {
    port = null;
    reader = null;
    writer = null;
    callbacks;

    isJobRunning = false;
    isPaused = false;
    isStopped = false;
    isDryRun = false;
    currentLineIndex = 0;
    totalLines = 0;
    gcode = [];
    statusInterval = null;
    
    // State is now managed within the service to handle partial updates correctly.
    spindleDirection = 'off';
    lastStatus = {
        status: 'Idle',
        code: null,
        wpos: { x: 0, y: 0, z: 0 },
        mpos: { x: 0, y: 0, z: 0 },
        spindle: { state: 'off', speed: 0 },
        ov: [100, 100, 100],
    };

    linePromiseResolve = null;
    linePromiseReject = null;

    isDisconnecting = false;

    constructor(callbacks) {
        this.callbacks = callbacks;
    }

    async connect(baudRate) {
        if (!('serial' in navigator)) {
            this.callbacks.onError("Web Serial API not supported.");
            return;
        }

        try {
            this.port = await navigator.serial.requestPort();
            await this.port.open({ baudRate });
            
            // Reset state for new connection
            this.lastStatus = {
                status: 'Idle',
                code: null,
                wpos: { x: 0, y: 0, z: 0 },
                mpos: { x: 0, y: 0, z: 0 },
                spindle: { state: 'off', speed: 0 },
                ov: [100, 100, 100],
            };
            this.spindleDirection = 'off';

            const portInfo = this.port.getInfo();
            this.callbacks.onConnect(portInfo);
            
            this.port.addEventListener('disconnect', () => {
                this.disconnect();
            });

            const textDecoder = new TextDecoderStream();
            this.port.readable.pipeTo(textDecoder.writable);
            this.reader = textDecoder.readable.getReader();

            const textEncoder = new TextEncoderStream();
            textEncoder.readable.pipeTo(this.port.writable);
            this.writer = textEncoder.writable.getWriter();

            this.readLoop();
            
            this.statusInterval = window.setInterval(() => this.requestStatusUpdate(), 100);

        } catch (error) {
            if (error instanceof Error) {
                this.callbacks.onError(error.message);
            }
            throw error;
        }
    }

    async disconnect() {
        if (this.isDisconnecting || !this.port) return;
        this.isDisconnecting = true;

        if (this.statusInterval) {
            clearInterval(this.statusInterval);
            this.statusInterval = null;
        }
        if (this.isJobRunning) {
            this.stopJob();
        }
        
        await new Promise(resolve => setTimeout(resolve, 100));

        if (this.reader) {
            await this.reader.cancel().catch(() => {});
            this.reader = null;
        }
        if (this.writer) {
            await this.writer.abort().catch(() => {});
            this.writer = null;
        }
        if (this.port) {
            await this.port.close().catch(() => {});
            this.port = null;
        }
        this.callbacks.onDisconnect();
    }
    
    parseGrblStatus(statusStr) {
        try {
            const content = statusStr.slice(1, -1);
            const parts = content.split('|');
            const statusPart = parts[0];
            const parsed = {};

            const rawStatus = statusPart.split(':')[0].toLowerCase();
            let status;
            // Normalize all possible states to a consistent format.
            switch(rawStatus) {
                case 'idle': status = 'Idle'; break;
                case 'run': status = 'Run'; break;
                case 'hold': status = 'Hold'; break;
                case 'jog': status = 'Jog'; break;
                case 'alarm': status = 'Alarm'; break;
                case 'door': status = 'Door'; break;
                case 'check': status = 'Check'; break;
                case 'home':
                case 'homing': // Also catch 'homing' and normalize to 'Home'
                    status = 'Home'; 
                    break;
                case 'sleep': status = 'Sleep'; break;
                default:
                    // Try to capitalize unknown states as a fallback
                    status = rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1);
                    break;
            }

            let code = null;
            if (status === 'Alarm') {
                const alarmMatch = statusPart.match(/Alarm:(\d+)/);
                if (alarmMatch) {
                    code = parseInt(alarmMatch[1], 10);
                }
            }
            
            // Always include status and code to ensure state is fully updated.
            parsed.status = status;
            parsed.code = code;

            for (const part of parts) {
                if (part.startsWith('WPos:')) {
                    const coords = part.substring(5).split(',');
                    parsed.wpos = { x: parseFloat(coords[0]), y: parseFloat(coords[1]), z: parseFloat(coords[2]) };
                } else if (part.startsWith('MPos:')) {
                    const coords = part.substring(5).split(',');
                    parsed.mpos = { x: parseFloat(coords[0]), y: parseFloat(coords[1]), z: parseFloat(coords[2]) };
                } else if (part.startsWith('FS:')) {
                    const speeds = part.substring(3).split(',');
                    if (!parsed.spindle) parsed.spindle = {};
                    if (speeds.length > 1) {
                         parsed.spindle.speed = parseFloat(speeds[1]);
                    }
                } else if (part.startsWith('Ov:')) {
                    const ovParts = part.substring(3).split(',');
                    if (ovParts.length === 3) {
                        parsed.ov = ovParts.map(p => parseInt(p, 10));
                    }
                }
            }
            return parsed;
        } catch (e) {
            console.error("Failed to parse GRBL status:", statusStr, e);
            return null; // Failed to parse
        }
    }

    async readLoop() {
        let buffer = '';
        while (this.port?.readable && this.reader) {
            try {
                const { value, done } = await this.reader.read();
                if (done) {
                    break;
                }
                if (value) {
                    buffer += value;
                    const lines = buffer.split('\n');
                    buffer = lines.pop(); // Keep the last, possibly incomplete, line

                    lines.forEach(line => {
                        const trimmedValue = line.trim();
                        if (trimmedValue.startsWith('<') && trimmedValue.endsWith('>')) {
                            const statusUpdate = this.parseGrblStatus(trimmedValue);
                            if (statusUpdate) {
                                // Explicitly merge properties to prevent losing state from partial updates.
                                this.lastStatus.status = statusUpdate.status;
                                this.lastStatus.code = statusUpdate.code;
                                if (statusUpdate.wpos) this.lastStatus.wpos = statusUpdate.wpos;
                                if (statusUpdate.mpos) this.lastStatus.mpos = statusUpdate.mpos;
                                if (statusUpdate.ov) this.lastStatus.ov = statusUpdate.ov;
                                if (statusUpdate.spindle) {
                                    this.lastStatus.spindle = {
                                        ...this.lastStatus.spindle,
                                        ...statusUpdate.spindle,
                                    };
                                }
                        
                                // This logic must run *after* the new state is built.
                                if (this.lastStatus.spindle.speed === 0) {
                                    this.spindleDirection = 'off';
                                }
                                this.lastStatus.spindle.state = this.spindleDirection;
                        
                                // Send a deep clone to React to ensure re-render
                                this.callbacks.onStatus(JSON.parse(JSON.stringify(this.lastStatus)));
                            }
                        } else if (trimmedValue) {
                            if (trimmedValue.startsWith('error:')) {
                                // If a job is running (i.e., a promise is pending for an 'ok'),
                                // reject the promise and let the job handler log the error contextually.
                                // Otherwise, it's a manual command error, so report it directly.
                                if (this.linePromiseReject) {
                                    this.linePromiseReject(new Error(trimmedValue));
                                    this.linePromiseResolve = null;
                                    this.linePromiseReject = null;
                                } else {
                                    this.callbacks.onError(`GRBL Error: ${trimmedValue}`);
                                }
                            } else {
                                this.callbacks.onLog({ type: 'received', message: trimmedValue });
                                if (trimmedValue.startsWith('ok')) {
                                    if (this.linePromiseResolve) {
                                        this.linePromiseResolve();
                                        this.linePromiseResolve = null;
                                        this.linePromiseReject = null;
                                    }
                                }
                            }
                        }
                    });
                }
            } catch (error) {
                if (this.linePromiseReject) {
                    this.linePromiseReject(new Error("Serial connection lost during read."));
                    this.linePromiseResolve = null;
                    this.linePromiseReject = null;
                }
                const errorMessage = error instanceof Error ? error.message : "Unknown error";
                 if (this.isDisconnecting) {
                    // Error is expected during a manual disconnect.
                } else if (errorMessage.includes("device has been lost") || errorMessage.includes("The port is closed.")) {
                    this.callbacks.onError("Device disconnected unexpectedly. Please reconnect.");
                    this.disconnect();
                } else {
                    this.callbacks.onError("Error reading from serial port.");
                }
                break;
            }
        }
    }

    async sendLineAndWaitForOk(line, log = true) {
        return new Promise((resolve, reject) => {
            if (this.linePromiseResolve) {
                // This shouldn't happen with proper logic, but as a safeguard...
                return reject(new Error("Cannot send new line while another is awaiting 'ok'."));
            }
            this.linePromiseResolve = resolve;
            this.linePromiseReject = reject;
            this.sendLine(line, log).catch(err => {
                this.linePromiseResolve = null;
                this.linePromiseReject = null;
                reject(err);
            });
        });
    }

    async sendLine(line, log = true) {
        const upperLine = line.trim().toUpperCase();
        if (upperLine.startsWith('M3')) {
            this.spindleDirection = 'cw';
        } else if (upperLine.startsWith('M4')) {
            this.spindleDirection = 'ccw';
        } else if (upperLine.startsWith('M5')) {
            this.spindleDirection = 'off';
        }

        if (!this.writer) {
            return;
        }
        try {
            const command = line + '\n';
            await this.writer.write(command);
            if (log) {
                this.callbacks.onLog({ type: 'sent', message: line });
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            if (this.isDisconnecting) {
                // Expected error during disconnect.
            } else if (errorMessage.includes("device has been lost") || errorMessage.includes("The port is closed.")) {
                this.callbacks.onError("Device disconnected unexpectedly. Please reconnect.");
                this.disconnect();
            } else {
                this.callbacks.onError("Error writing to serial port.");
            }
            throw error;
        }
    }

    async sendRealtimeCommand(command) {
        if (!this.writer) {
            return;
        }
        try {
            await this.writer.write(command);
            // Real-time commands are not logged to the console to avoid clutter.
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            if (this.isDisconnecting) {
                // Expected error during disconnect.
            } else if (errorMessage.includes("device has been lost") || errorMessage.includes("The port is closed.")) {
                this.callbacks.onError("Device disconnected unexpectedly. Please reconnect.");
                this.disconnect();
            } else {
                this.callbacks.onError("Error writing to serial port.");
            }
            throw error;
        }
    }

    requestStatusUpdate() {
        if (this.writer) {
            // This write is silent and doesn't need to be awaited
            this.writer.write('?').catch(() => {});
        }
    }

    sendGCode(gcodeLines, options = {}) {
        if (this.isJobRunning) {
            this.callbacks.onError("A job is already running.");
            return;
        }

        const { startLine = 0, isDryRun = false } = options;

        this.gcode = gcodeLines;
        this.totalLines = gcodeLines.length;
        this.currentLineIndex = startLine;
        this.isDryRun = isDryRun;
        this.isJobRunning = true;
        this.isPaused = false;
        this.isStopped = false;

        let logMessage = `Starting G-code job from line ${startLine + 1}: ${this.totalLines} total lines.`;
        if (isDryRun) {
            logMessage += ' (Dry Run enabled)';
        }
        this.callbacks.onLog({ type: 'status', message: logMessage });
        
        // Fire initial progress update
        this.callbacks.onProgress({
            percentage: (this.currentLineIndex / this.totalLines) * 100,
            linesSent: this.currentLineIndex,
            totalLines: this.totalLines
        });

        this.sendNextLine();
    }

    async sendNextLine() {
        if (this.isStopped) {
            this.isJobRunning = false;
            this.callbacks.onLog({ type: 'status', message: 'Job stopped by user.' });
            return;
        }

        if (this.isPaused) {
            return;
        }
        
        if (this.currentLineIndex >= this.totalLines) {
            this.isJobRunning = false;
            return;
        }

        const line = this.gcode[this.currentLineIndex];
        const upperLine = line.toUpperCase().trim();

        if (this.isDryRun && (upperLine.startsWith('M3') || upperLine.startsWith('M4') || upperLine.startsWith('M5'))) {
            this.callbacks.onLog({ type: 'status', message: `Skipped (Dry Run): ${line}` });
            this.currentLineIndex++;
            this.callbacks.onProgress({
                percentage: (this.currentLineIndex / this.totalLines) * 100,
                linesSent: this.currentLineIndex,
                totalLines: this.totalLines
            });
            setTimeout(() => this.sendNextLine(), 0);
            return;
        }

        try {
            await this.sendLineAndWaitForOk(line);
            
            this.currentLineIndex++;

            this.callbacks.onProgress({
                percentage: (this.currentLineIndex / this.totalLines) * 100,
                linesSent: this.currentLineIndex,
                totalLines: this.totalLines
            });

            // Schedule the next line to be sent on the next frame to avoid deep call stacks.
            setTimeout(() => this.sendNextLine(), 0); 
        } catch (error) {
            this.isJobRunning = false;
            this.isStopped = true;
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            
            if (errorMessage.includes("device has been lost") || errorMessage.includes("The port is closed.")) {
                this.callbacks.onLog({ type: 'error', message: `Job aborted due to disconnection.` });
            } else if (!errorMessage.includes('Job stopped by user.')) {
                this.callbacks.onLog({ type: 'error', message: `Job halted on line ${this.currentLineIndex + 1}: ${this.gcode[this.currentLineIndex]}` });
                this.callbacks.onError(`Job halted due to GRBL error: ${errorMessage}`);
            }
        }
    }

    pause() {
        if (this.isJobRunning && !this.isPaused) {
            this.isPaused = true;
            this.sendRealtimeCommand('!'); // Feed Hold
            this.callbacks.onLog({ type: 'status', message: 'Job paused.' });
        }
    }

    resume() {
        if (this.isJobRunning && this.isPaused) {
            this.isPaused = false;
            this.sendRealtimeCommand('~'); // Cycle Resume
            this.callbacks.onLog({ type: 'status', message: 'Job resumed.' });
            this.sendNextLine();
        }
    }

    stopJob() {
        if (this.isJobRunning) {
            this.isStopped = true;
            this.sendRealtimeCommand('\x18'); // Soft-reset
            if (this.linePromiseReject) {
                this.linePromiseReject(new Error('Job stopped by user.'));
                this.linePromiseResolve = null;
                this.linePromiseReject = null;
            }
        }
    }
    
    emergencyStop() {
        this.isStopped = true;
        this.isJobRunning = false;
        if (this.linePromiseReject) {
            this.linePromiseReject(new Error('Emergency Stop'));
            this.linePromiseResolve = null;
            this.linePromiseReject = null;
        }
        this.sendRealtimeCommand('\x18'); // Soft Reset
    }
}