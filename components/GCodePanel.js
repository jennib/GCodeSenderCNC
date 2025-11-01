

import React, { useRef, useState, useEffect } from 'react';
import { JobStatus } from '../types.js';
import { Play, Pause, Square, Upload, FileText, Code, Eye, Maximize, Pencil, CheckCircle, X, Save, Plus, Minus, RefreshCw, Percent, ZoomIn, ZoomOut, Clock, BookOpen, Crosshair } from './Icons.js';
import GCodeVisualizer from './GCodeVisualizer.js';
import GCodeLine from './GCodeLine.js';

const h = React.createElement;

const FeedrateOverrideControl = ({ onFeedOverride, currentFeedrate, className = '' }) => {
    return h('div', { className: `bg-background p-3 rounded-md ${className}` },
        h('h4', { className: 'text-sm font-bold text-text-secondary mb-2 text-center' }, 'Feed Rate Override'),
        h('div', { className: 'flex items-center justify-center gap-4 mb-3' },
            h(Percent, { className: 'w-8 h-8 text-primary' }),
            h('span', { className: 'text-4xl font-mono font-bold' }, currentFeedrate),
        ),
        h('div', { className: 'grid grid-cols-5 gap-2 text-sm' },
            h('button', { title: 'Decrease Feed Rate by 10%', onClick: () => onFeedOverride('dec10'), className: 'p-2 bg-secondary rounded hover:bg-secondary-focus flex items-center justify-center font-bold' }, h(Minus, { className: 'w-4 h-4 mr-1' }), '10%'),
            h('button', { title: 'Decrease Feed Rate by 1%', onClick: () => onFeedOverride('dec1'), className: 'p-2 bg-secondary rounded hover:bg-secondary-focus flex items-center justify-center font-bold' }, h(Minus, { className: 'w-4 h-4 mr-1' }), '1%'),
            h('button', { title: 'Reset Feed Rate to 100%', onClick: () => onFeedOverride('reset'), className: 'p-2 bg-primary rounded hover:bg-primary-focus flex items-center justify-center' }, h(RefreshCw, { className: 'w-5 h-5' })),
            h('button', { title: 'Increase Feed Rate by 1%', onClick: () => onFeedOverride('inc1'), className: 'p-2 bg-secondary rounded hover:bg-secondary-focus flex items-center justify-center font-bold' }, h(Plus, { className: 'w-4 h-4 mr-1' }), '1%'),
            h('button', { title: 'Increase Feed Rate by 10%', onClick: () => onFeedOverride('inc10'), className: 'p-2 bg-secondary rounded hover:bg-secondary-focus flex items-center justify-center font-bold' }, h(Plus, { className: 'w-4 h-4 mr-1' }), '10%'),
        )
    );
};

const formatTime = (totalSeconds) => {
    if (totalSeconds === Infinity) return '∞';
    if (totalSeconds < 1) return '...';
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);

    const hh = String(hours).padStart(2, '0');
    const mm = String(minutes).padStart(2, '0');
    const ss = String(seconds).padStart(2, '0');

    return `${hh}:${mm}:${ss}`;
};

const GCodePanel = ({ 
    onFileLoad, fileName, gcodeLines, onJobControl, 
    jobStatus, progress, isConnected, unit, onGCodeChange, 
    machineState, onFeedOverride, timeEstimate, 
    machineSettings, toolLibrary, selectedToolId, onToolSelect 
}) => {
    const fileInputRef = useRef(null);
    const visualizerRef = useRef(null);
    const codeContainerRef = useRef(null);
    const [view, setView] = useState('visualizer');
    const [isEditing, setIsEditing] = useState(false);
    const [editedGCode, setEditedGCode] = useState('');
    const [isDraggingOver, setIsDraggingOver] = useState(false);
    const [hoveredLineIndex, setHoveredLineIndex] = useState(null);

    useEffect(() => {
        setEditedGCode(gcodeLines.join('\n'));
        setIsEditing(false); // Exit edit mode on new file load
    }, [gcodeLines]);

    const handleFileChange = (event) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const content = e.target?.result;
                onFileLoad(content, file.name);
            };
            reader.readAsText(file);
            setView('visualizer'); // Default to visualizer on new file
        }
    };
    
    const handleSave = () => {
        onGCodeChange(editedGCode);
        setIsEditing(false);
    };

    const handleCancel = () => {
        setEditedGCode(gcodeLines.join('\n'));
        setIsEditing(false);
    };

    const handleSaveToDisk = () => {
        const blob = new Blob([editedGCode], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;

        let suggestedFilename = fileName || 'untitled.gcode';
        if (suggestedFilename.endsWith(' (edited)')) {
            const base = suggestedFilename.replace(' (edited)', '');
            const parts = base.split('.');
            if (parts.length > 1) {
                const ext = parts.pop();
                suggestedFilename = `${parts.join('.')}-edited.${ext}`;
            } else {
                suggestedFilename = `${base}-edited`;
            }
        }
        
        a.download = suggestedFilename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleRunFromLine = (lineNumber) => {
        // Line numbers are 1-based, array indices are 0-based
        onJobControl('start', { startLine: lineNumber - 1 });
    };

    const isHoming = machineState?.status === 'Home';
    const isJobActive = jobStatus === JobStatus.Running || jobStatus === JobStatus.Paused;
    const isReadyToStart = isConnected && gcodeLines.length > 0 && (jobStatus === JobStatus.Idle || jobStatus === JobStatus.Stopped || jobStatus === JobStatus.Complete) && !isHoming;
    const totalLines = gcodeLines.length;
    const currentLine = Math.floor((progress / 100) * totalLines);

    useEffect(() => {
        if ((jobStatus === JobStatus.Running || jobStatus === JobStatus.Paused) && view === 'code' && codeContainerRef.current) {
            const lineIndexToScroll = currentLine;

            if (lineIndexToScroll >= gcodeLines.length) return;
            
            const container = codeContainerRef.current;
            const lineElement = container.children[lineIndexToScroll];

            if (lineElement) {
                const containerHeight = container.clientHeight;
                const lineElementOffsetTop = lineElement.offsetTop;
                const lineElementHeight = lineElement.offsetHeight;
                const scrollTop = lineElementOffsetTop - (containerHeight / 2) + (lineElementHeight / 2);
                container.scrollTo({ top: scrollTop, behavior: 'smooth' });
            }
        }
    }, [currentLine, jobStatus, view, gcodeLines.length]);
    
    const handleDragOver = (e) => { e.preventDefault(); };
    const handleDragEnter = (e) => { e.preventDefault(); setIsDraggingOver(true); };
    const handleDragLeave = (e) => { e.preventDefault(); setIsDraggingOver(false); };
    const handleDrop = (e) => {
        e.preventDefault();
        setIsDraggingOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file && (file.name.endsWith('.gcode') || file.name.endsWith('.nc') || file.name.endsWith('.txt'))) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                onFileLoad(ev.target?.result, file.name);
            };
            reader.readAsText(file);
            setView('visualizer');
        }
    };

    const renderContent = () => {
        if (gcodeLines.length > 0) {
            if (view === 'visualizer') {
                return h(GCodeVisualizer, { ref: visualizerRef, gcodeLines, currentLine, unit, hoveredLineIndex, machineSettings });
            }
            if (view === 'code') {
                if (isEditing) {
                    return h('textarea', {
                        className: "w-full h-full absolute inset-0 bg-background font-mono text-sm p-2 rounded border border-secondary focus:ring-primary focus:border-primary",
                        value: editedGCode,
                        onChange: (e) => setEditedGCode(e.target.value),
                        spellCheck: "false"
                    });
                }
                return h('div', { ref: codeContainerRef, className: "absolute inset-0 bg-background rounded p-2 overflow-y-auto font-mono text-sm" },
                    gcodeLines.map((line, index) =>
                        h(GCodeLine, {
                            key: index, line, lineNumber: index + 1,
                            isExecuted: index < currentLine,
                            isCurrent: isJobActive && (index === currentLine),
                            isHovered: index === hoveredLineIndex,
                            onRunFromHere: handleRunFromLine,
                            isActionable: isReadyToStart,
                            onMouseEnter: () => setHoveredLineIndex(index),
                            onMouseLeave: () => setHoveredLineIndex(null)
                        })
                    )
                );
            }
        }
        return h('div', { className: "flex flex-col items-center justify-center h-full text-text-secondary" },
            h(FileText, { className: "w-16 h-16 mb-4" }),
            h('p', null, "No G-code file loaded."),
            h('p', null, "Click \"Load File\" or drag and drop here to begin.")
        );
    };

    const renderJobControls = () => {
        if (isReadyToStart) {
            return h('button', { onClick: () => onJobControl('start', { startLine: 0 }), disabled: !isReadyToStart, className: "col-span-3 flex items-center justify-center gap-3 p-5 bg-accent-green text-white font-bold rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-surface transition-colors disabled:bg-secondary disabled:cursor-not-allowed text-xl" },
                h(Play, { className: "w-8 h-8" }), "Start Job"
            );
        }
        if (jobStatus === JobStatus.Running) {
            return [
                h('button', { key: 'pause', onClick: () => onJobControl('pause'), disabled: isHoming, className: "flex items-center justify-center gap-3 p-5 bg-accent-yellow text-white font-bold rounded-md hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 focus:ring-offset-surface transition-colors text-xl disabled:bg-secondary disabled:cursor-not-allowed" },
                    h(Pause, { className: "w-8 h-8" }), "Pause"
                ),
                h('button', { key: 'stop', onClick: () => onJobControl('stop'), disabled: isHoming, className: "col-span-2 flex items-center justify-center gap-3 p-5 bg-accent-red text-white font-bold rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-surface transition-colors text-xl disabled:bg-secondary disabled:cursor-not-allowed" },
                    h(Square, { className: "w-8 h-8" }), "Stop Job"
                )
            ];
        }
        if (jobStatus === JobStatus.Paused) {
            return [
                 h('button', { key: 'resume', onClick: () => onJobControl('resume'), disabled: isHoming, className: "flex items-center justify-center gap-3 p-5 bg-accent-green text-white font-bold rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-surface transition-colors text-xl disabled:bg-secondary disabled:cursor-not-allowed" },
                    h(Play, { className: "w-8 h-8" }), "Resume"
                ),
                h('button', { key: 'stop', onClick: () => onJobControl('stop'), disabled: isHoming, className: "col-span-2 flex items-center justify-center gap-3 p-5 bg-accent-red text-white font-bold rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-surface transition-colors text-xl disabled:bg-secondary disabled:cursor-not-allowed" },
                    h(Square, { className: "w-8 h-8" }), "Stop Job"
                )
            ];
        }
        return null;
    };

    const { totalSeconds, cumulativeSeconds } = timeEstimate || { totalSeconds: 0, cumulativeSeconds: [] };
    let displayTime = totalSeconds, timeLabel = "Est. Time", timeTitle = "Estimated Job Time";
    if (isJobActive && totalSeconds > 0 && cumulativeSeconds) {
        const feedMultiplier = (machineState?.ov?.[0] ?? 100) / 100;
        timeLabel = "Time Rem."; timeTitle = "Estimated Time Remaining";
        if (feedMultiplier > 0) {
            const timeElapsedAt100 = (currentLine > 0 && cumulativeSeconds[currentLine - 1]) ? cumulativeSeconds[currentLine - 1] : 0;
            const timeRemainingAt100 = totalSeconds - timeElapsedAt100;
            displayTime = timeRemainingAt100 / feedMultiplier;
        } else {
            displayTime = Infinity;
        }
    }

    return h('div', { className: "bg-surface rounded-lg shadow-lg flex flex-col p-4 h-full relative", onDragEnter: handleDragEnter, onDragOver: handleDragOver, onDragLeave: handleDragLeave, onDrop: handleDrop },
        h('div', { className: "flex justify-between items-center mb-2 pb-4 border-b border-secondary" },
            h('div', { className: "flex items-center gap-4" },
                h('h2', { className: "text-lg font-bold" }, "G-Code"),
                h('div', { className: "flex items-center bg-background rounded-md p-1" },
                    h('button', { onClick: () => setView('visualizer'), title: "Visualizer View", className: `p-1 rounded transition-colors ${view === 'visualizer' ? 'bg-primary text-white' : 'hover:bg-secondary'}` }, h(Eye, { className: "w-5 h-5" })),
                    h('button', { onClick: () => setView('code'), title: "Code View", className: `p-1 rounded transition-colors ${view === 'code' ? 'bg-primary text-white' : 'hover:bg-secondary'}` }, h(Code, { className: "w-5 h-5" })),
                    view === 'visualizer' && gcodeLines.length > 0 && h(React.Fragment, null,
                        h('button', { onClick: () => visualizerRef.current?.resetView(), title: "Reset to Top-Down View", className: "p-1 rounded transition-colors hover:bg-secondary" }, h(Crosshair, { className: "w-5 h-5" })),
                        h('button', { onClick: () => visualizerRef.current?.fitView(), title: "Fit to View", className: "p-1 rounded transition-colors hover:bg-secondary" }, h(Maximize, { className: "w-5 h-5" })),
                        h('button', { onClick: () => visualizerRef.current?.zoomIn(), title: "Zoom In", className: "p-1 rounded transition-colors hover:bg-secondary" }, h(ZoomIn, { className: "w-5 h-5" })),
                        h('button', { onClick: () => visualizerRef.current?.zoomOut(), title: "Zoom Out", className: "p-1 rounded transition-colors hover:bg-secondary" }, h(ZoomOut, { className: "w-5 h-5" }))
                    )
                ),
                view === 'code' && gcodeLines.length > 0 && (isEditing ?
                    h('div', { className: 'flex items-center gap-2' },
                        h('button', { onClick: handleSave, className: "flex items-center gap-2 px-3 py-1 bg-accent-green text-white font-semibold rounded-md hover:bg-green-600", title: "Save Changes" }, h(CheckCircle, {className: "w-4 h-4"}), "Save"),
                        h('button', { onClick: handleSaveToDisk, className: "flex items-center gap-2 px-3 py-1 bg-primary text-white font-semibold rounded-md hover:bg-primary-focus", title: "Save to Disk" }, h(Save, {className: "w-4 h-4"}), "Save to Disk"),
                        h('button', { onClick: handleCancel, className: "flex items-center gap-2 px-3 py-1 bg-secondary text-white font-semibold rounded-md hover:bg-secondary-focus", title: "Cancel" }, h(X, {className: "w-4 h-4"}), "Cancel")
                    ) :
                    h('button', { onClick: () => setIsEditing(true), className: "flex items-center gap-2 px-3 py-1 bg-secondary text-white font-semibold rounded-md hover:bg-secondary-focus", title: "Edit G-Code" }, h(Pencil, {className: "w-4 h-4"}), "Edit")
                )
            ),
            h('div', { className: "flex items-center gap-2" },
                h('input', { type: "file", ref: fileInputRef, onChange: handleFileChange, className: "hidden", accept: ".gcode,.nc,.txt" }),
                h('button', { onClick: handleUploadClick, disabled: isJobActive, className: "flex items-center gap-2 px-4 py-2 bg-secondary text-white font-semibold rounded-md hover:bg-secondary-focus disabled:opacity-50" }, h(Upload, { className: "w-5 h-5" }), "Load File")
            )
        ),
        fileName && h('div', { className: 'grid grid-cols-2 gap-4 mb-2' },
            h('p', { className: "text-sm text-text-secondary truncate", title: fileName }, h('strong', null, 'File: '), fileName),
            h('div', { className: 'flex items-center gap-2' },
                h(BookOpen, { className: 'w-5 h-5 text-text-secondary flex-shrink-0' }),
                h('select', { value: selectedToolId || '', onChange: e => onToolSelect(e.target.value ? parseInt(e.target.value, 10) : null), disabled: isJobActive || !toolLibrary || toolLibrary.length === 0, className: 'w-full bg-background border border-secondary rounded-md py-1 px-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50' },
                    h('option', { value: '' }, toolLibrary && toolLibrary.length > 0 ? 'Select a tool...' : 'No tools in library'),
                    toolLibrary && toolLibrary.map(tool => h('option', { key: tool.id, value: tool.id }, tool.name))
                )
            )
        ),
        h('div', { className: "space-y-4 flex-shrink-0 mb-4" },
            h('div', { className: "grid grid-cols-3 gap-4" }, renderJobControls()),
            h('div', { className: "w-full bg-secondary rounded-full h-4" }, h('div', { className: "bg-primary h-4 rounded-full transition-all duration-300", style: { width: `${progress}%` } })),
            h('div', { className: "flex justify-between items-center text-sm font-medium" },
                h('p', null, "Status: ", h('span', { className: "font-bold capitalize" }, jobStatus), (isJobActive && totalLines > 0) && h('span', { className: 'ml-2 font-mono text-text-secondary bg-background px-2 py-0.5 rounded-md' }, `${currentLine} / ${totalLines}`)),
                h('div', { className: "flex items-center gap-4" },
                    (gcodeLines.length > 0 && totalSeconds > 0) && h('div', { title: timeTitle, className: 'flex items-center gap-1.5 text-text-secondary' }, h(Clock, { className: 'w-4 h-4' }), h('span', null, `${timeLabel}:`), h('span', { className: 'font-mono ml-1' }, formatTime(displayTime))),
                    h('p', { className: "font-bold" }, `${progress.toFixed(1)}%`)
                )
            )
        ),
        h('div', { className: "flex-grow relative min-h-0" },
            renderContent(),
            isDraggingOver && h('div', { className: "absolute inset-0 bg-primary/70 border-4 border-dashed border-primary-focus rounded-lg flex flex-col items-center justify-center pointer-events-none" }, h(Upload, { className: "w-24 h-24 text-white" }), h('p', { className: "text-2xl font-bold text-white mt-4" }, "Drop G-code file here"))
        ),
        isJobActive && h(FeedrateOverrideControl, { onFeedOverride, currentFeedrate: machineState?.ov?.[0] ?? 100, className: 'mt-4 flex-shrink-0' })
    );
};

export default GCodePanel;
