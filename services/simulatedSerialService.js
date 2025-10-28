

const getParam = (gcode, param) => {
    const regex = new RegExp(`${param}([-+]?[0-9]*\\.?[0-9]*)`, 'i');
    const match = gcode.match(regex);
    return match ? parseFloat(match[1]) : null;
};

export class SimulatedSerialManager {
    callbacks;
    statusInterval = null;
    position = {
        status: 'Idle',
        code: null,
        wpos: { x: 0, y: 0, z: 0 },
        mpos: { x: 0, y: 0, z: 0 },
    };

    isJobRunning = false;
    isPaused = false;
    isStopped = false;
    currentLineIndex = 0;
    totalLines = 0;
    gcode = [];
    
    constructor(callbacks) {
        this.callbacks = callbacks;
    }

    async connect(_baudRate) {
        this.callbacks.onConnect({ usbVendorId: 0xAAAA, usbProductId: 0xBBBB });
        this.callbacks.onLog({ type: 'received', message: "Grbl 1.1h ['$' for help]" });
        this.statusInterval = window.setInterval(() => {
            this.callbacks.onStatus(this.position);
        }, 250);
    }

    async disconnect() {
        if (this.statusInterval) {
            clearInterval(this.statusInterval);
            this.statusInterval = null;
        }
        this.callbacks.onDisconnect();
    }

    async sendOk(delay = 50) {
        return new Promise(resolve => {
            setTimeout(() => {
                this.callbacks.onLog({ type: 'received', message: 'ok' });
                resolve(true);
            }, delay);
        });
    }

    async sendLine(line, log = true) {
        if (log) {
            this.callbacks.onLog({ type: 'sent', message: line });
        }

        const upperLine = line.toUpperCase().trim();

        if (upperLine === '$X') {
            if (this.position.status === 'Alarm') {
                this.position.status = 'Idle';
                this.position.code = null;
                this.callbacks.onLog({ type: 'status', message: '[MSG:Caution: Unlocked]' });
            }
            await this.sendOk();
            return;
        }
        
        if (upperLine.startsWith('$J=G91')) {
            const x = getParam(upperLine, 'X') || 0;
            const y = getParam(upperLine, 'Y') || 0;
            const z = getParam(upperLine, 'Z') || 0;
            this.position.wpos.x += x;
            this.position.wpos.y += y;
            this.position.wpos.z += z;
            this.position.mpos.x += x;
            this.position.mpos.y += y;
            this.position.mpos.z += z;
            this.position.status = 'Jog';
            await this.sendOk();
            this.position.status = 'Idle';
            return;
        }

        if (upperLine.startsWith('G10 L20 P1')) {
            const xParam = getParam(upperLine, 'X');
            const yParam = getParam(upperLine, 'Y');
            const zParam = getParam(upperLine, 'Z');
            
            // This command sets the origin of the current work coordinate system.
            // It modifies the WCS offset, which changes WPos but not MPos.
            if (xParam === 0) {
                this.position.wpos.x = 0;
            }
            if (yParam === 0) {
                this.position.wpos.y = 0;
            }
            if (zParam === 0) {
                this.position.wpos.z = 0;
            }
            await this.sendOk();
            return;
        }

        if (upperLine.startsWith('$H')) {
            this.position.status = 'Home';
            // Simulate homing process running in the background
            setTimeout(() => {
                if(upperLine === '$H' || upperLine.includes('X')) this.position.mpos.x = 0;
                if(upperLine === '$H' || upperLine.includes('Y')) this.position.mpos.y = 0;
                if(upperLine === '$H' || upperLine.includes('Z')) this.position.mpos.z = 0;
                this.position.status = 'Idle';
            }, 1000); // Homing takes time
            
            // GRBL sends 'ok' immediately after receiving the command
            await this.sendOk(100); 
            return;
        }
        
        await this.sendOk();
    }

    sendGCode(gcodeLines) {
        if (this.isJobRunning) {
            this.callbacks.onError("A job is already running.");
            return;
        }
        this.gcode = gcodeLines;
        this.totalLines = gcodeLines.length;
        this.currentLineIndex = 0;
        this.isJobRunning = true;
        this.isPaused = false;
        this.isStopped = false;
        this.position.status = 'Run';

        this.callbacks.onLog({ type: 'status', message: `Starting G-code job: ${this.totalLines} lines.` });
        this.sendNextLine();
    }

    async sendNextLine() {
        if (this.isStopped) {
            this.isJobRunning = false;
            this.position.status = 'Idle';
            this.callbacks.onLog({ type: 'status', message: 'Job stopped by user.' });
            return;
        }

        if (this.isPaused) {
            return;
        }
        
        if (this.currentLineIndex >= this.totalLines) {
            this.isJobRunning = false;
            this.position.status = 'Idle';
            this.callbacks.onProgress({ percentage: 100, linesSent: this.currentLineIndex, totalLines: this.totalLines });
            return;
        }

        const line = this.gcode[this.currentLineIndex];
        // Simulate line processing
        const upperLine = line.toUpperCase();
        if (upperLine.startsWith('G0') || upperLine.startsWith('G1')) {
            const x = getParam(upperLine, 'X');
            const y = getParam(upperLine, 'Y');
            const z = getParam(upperLine, 'Z');
            if(x !== null) this.position.wpos.x = this.position.mpos.x = x;
            if(y !== null) this.position.wpos.y = this.position.mpos.y = y;
            if(z !== null) this.position.wpos.z = this.position.mpos.z = z;
        }
        
        await this.sendLine(line, false);
        this.currentLineIndex++;
        
        this.callbacks.onProgress({
            percentage: (this.currentLineIndex / this.totalLines) * 100,
            linesSent: this.currentLineIndex,
            totalLines: this.totalLines
        });

        setTimeout(() => this.sendNextLine(), 50); 
    }

    pause() {
        if (this.isJobRunning && !this.isPaused) {
            this.isPaused = true;
            this.position.status = 'Hold';
            this.callbacks.onLog({ type: 'status', message: 'Job paused.' });
        }
    }

    resume() {
        if (this.isJobRunning && this.isPaused) {
            this.isPaused = false;
            this.position.status = 'Run';
            this.callbacks.onLog({ type: 'status', message: 'Job resumed.' });
            this.sendNextLine();
        }
    }

    stopJob() {
        if (this.isJobRunning) {
            this.isStopped = true;
            this.isJobRunning = false;
            this.position.status = 'Alarm';
            this.position.code = 3; // Reset while in motion
            this.callbacks.onLog({ type: 'status', message: 'Job stopped. Soft-reset sent to clear buffer and stop spindle.' });
        }
    }

    emergencyStop() {
        this.isStopped = true;
        this.isJobRunning = false;
        this.position.status = 'Alarm';
        this.position.code = 3; // Simulate a reset while in motion alarm
        this.callbacks.onLog({ type: 'sent', message: 'CTRL-X' });
    }
}