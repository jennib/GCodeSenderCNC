import React, { useRef, useState, useEffect } from 'react';
import { JobStatus } from '../types.js';
import { Play, Pause, Square, Upload, FileText, Code, Eye, Maximize, Pencil, CheckCircle, X, Save } from './Icons.js';
import GCodeVisualizer from './GCodeVisualizer.js';
import GCodeLine from './GCodeLine.js';

const GCodePanel = ({ onFileLoad, fileName, gcodeLines, onJobControl, jobStatus, progress, isConnected, unit, onGCodeChange }) => {
    const fileInputRef = useRef(null);
    const visualizerRef = useRef(null);
    const [view, setView] = useState('visualizer');
    const [isEditing, setIsEditing] = useState(false);
    const [editedGCode, setEditedGCode] = useState('');

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

    const isJobActive = jobStatus === JobStatus.Running || jobStatus === JobStatus.Paused;
    const isReadyToStart = isConnected && gcodeLines.length > 0 && (jobStatus === JobStatus.Idle || jobStatus === JobStatus.Stopped || jobStatus === JobStatus.Complete);
    const currentLine = Math.floor((progress / 100) * gcodeLines.length);

    const renderContent = () => {
        if (gcodeLines.length > 0) {
            if (view === 'visualizer') {
                return React.createElement(GCodeVisualizer, { ref: visualizerRef, gcodeLines, currentLine, unit: unit });
            }
            if (view === 'code') {
                if (isEditing) {
                    return React.createElement('textarea', {
                        className: "w-full h-full absolute inset-0 bg-background font-mono text-sm p-2 rounded border border-secondary focus:ring-primary focus:border-primary",
                        value: editedGCode,
                        onChange: (e) => setEditedGCode(e.target.value),
                        spellCheck: "false"
                    });
                }
                return React.createElement('div', { className: "absolute inset-0 bg-background rounded p-2 overflow-y-auto font-mono text-sm" },
                    gcodeLines.map((line, index) =>
                        React.createElement(GCodeLine, {
                            key: index,
                            line: line,
                            lineNumber: index + 1,
                            isExecuted: index < currentLine
                        })
                    )
                );
            }
        }
        return React.createElement('div', { className: "flex flex-col items-center justify-center h-full text-text-secondary" },
            React.createElement(FileText, { className: "w-16 h-16 mb-4" }),
            React.createElement('p', null, "No G-code file loaded."),
            React.createElement('p', null, "Click \"Load File\" to begin.")
        );
    };

    const renderJobControls = () => {
        if (isReadyToStart) {
            return React.createElement('button', {
                onClick: () => onJobControl('start'),
                disabled: !isReadyToStart,
                className: "col-span-3 flex items-center justify-center gap-3 p-5 bg-accent-green text-white font-bold rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-surface transition-colors disabled:bg-secondary disabled:cursor-not-allowed text-xl"
            },
                React.createElement(Play, { className: "w-8 h-8" }),
                "Start Job"
            );
        }

        if (jobStatus === JobStatus.Running) {
            return [
                React.createElement('button', { key: 'pause', onClick: () => onJobControl('pause'), className: "flex items-center justify-center gap-3 p-5 bg-accent-yellow text-white font-bold rounded-md hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 focus:ring-offset-surface transition-colors text-xl" },
                    React.createElement(Pause, { className: "w-8 h-8" }),
                    "Pause"
                ),
                React.createElement('button', { key: 'stop', onClick: () => onJobControl('stop'), className: "col-span-2 flex items-center justify-center gap-3 p-5 bg-accent-red text-white font-bold rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-surface transition-colors text-xl" },
                    React.createElement(Square, { className: "w-8 h-8" }),
                    "Stop Job"
                )
            ];
        }

        if (jobStatus === JobStatus.Paused) {
            return [
                 React.createElement('button', { key: 'resume', onClick: () => onJobControl('resume'), className: "flex items-center justify-center gap-3 p-5 bg-accent-green text-white font-bold rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-surface transition-colors text-xl" },
                    React.createElement(Play, { className: "w-8 h-8" }),
                    "Resume"
                ),
                React.createElement('button', { key: 'stop', onClick: () => onJobControl('stop'), className: "col-span-2 flex items-center justify-center gap-3 p-5 bg-accent-red text-white font-bold rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-surface transition-colors text-xl" },
                    React.createElement(Square, { className: "w-8 h-8" }),
                    "Stop Job"
                )
            ];
        }

        return null;
    };


    return React.createElement('div', { className: "bg-surface rounded-lg shadow-lg flex flex-col p-4 h-full" },
        React.createElement('div', { className: "flex justify-between items-center mb-2 pb-4 border-b border-secondary" },
            React.createElement('div', { className: "flex items-center gap-4" },
                React.createElement('h2', { className: "text-lg font-bold" }, "G-Code"),
                React.createElement('div', { className: "flex items-center bg-background rounded-md p-1" },
                    React.createElement('button', { onClick: () => setView('visualizer'), title: "Visualizer View", className: `p-1 rounded transition-colors ${view === 'visualizer' ? 'bg-primary text-white' : 'hover:bg-secondary'}` },
                        React.createElement(Eye, { className: "w-5 h-5" })
                    ),
                    React.createElement('button', { onClick: () => setView('code'), title: "Code View", className: `p-1 rounded transition-colors ${view === 'code' ? 'bg-primary text-white' : 'hover:bg-secondary'}` },
                        React.createElement(Code, { className: "w-5 h-5" })
                    ),
                    view === 'visualizer' && gcodeLines.length > 0 && React.createElement('button', {
                        onClick: () => visualizerRef.current?.fitView(),
                        title: "Fit to View",
                        className: "p-1 rounded transition-colors hover:bg-secondary"
                    },
                        React.createElement(Maximize, { className: "w-5 h-5" })
                    )
                ),
                view === 'code' && gcodeLines.length > 0 && (
                    isEditing ? (
                        React.createElement('div', { className: 'flex items-center gap-2' },
                            React.createElement('button', { 
                                onClick: handleSave, 
                                className: "flex items-center gap-2 px-3 py-1 bg-accent-green text-white font-semibold rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors",
                                title: "Save Changes to Local Copy"
                            }, React.createElement(CheckCircle, {className: "w-4 h-4"}), "Save"),
                            React.createElement('button', { 
                                onClick: handleSaveToDisk, 
                                className: "flex items-center gap-2 px-3 py-1 bg-primary text-white font-semibold rounded-md hover:bg-primary-focus focus:outline-none focus:ring-2 focus:ring-primary transition-colors",
                                title: "Save to Disk"
                            }, React.createElement(Save, {className: "w-4 h-4"}), "Save to Disk"),
                            React.createElement('button', { 
                                onClick: handleCancel, 
                                className: "flex items-center gap-2 px-3 py-1 bg-secondary text-white font-semibold rounded-md hover:bg-secondary-focus focus:outline-none focus:ring-2 focus:ring-secondary transition-colors",
                                title: "Cancel"
                            }, React.createElement(X, {className: "w-4 h-4"}), "Cancel")
                        )
                    ) : (
                        React.createElement('button', { 
                            onClick: () => setIsEditing(true), 
                            className: "flex items-center gap-2 px-3 py-1 bg-secondary text-white font-semibold rounded-md hover:bg-secondary-focus focus:outline-none focus:ring-2 focus:ring-secondary transition-colors",
                            title: "Edit G-Code"
                        }, React.createElement(Pencil, {className: "w-4 h-4"}), "Edit")
                    )
                )
            ),
            React.createElement('div', { className: "flex items-center gap-2" },
                React.createElement('input', { type: "file", ref: fileInputRef, onChange: handleFileChange, className: "hidden", accept: ".gcode,.nc,.txt" }),
                React.createElement('button', { onClick: handleUploadClick, className: "flex items-center gap-2 px-4 py-2 bg-secondary text-white font-semibold rounded-md hover:bg-secondary-focus focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2 focus:ring-offset-surface transition-colors" },
                    React.createElement(Upload, { className: "w-5 h-5" }),
                    "Load File"
                )
            )
        ),
        fileName && React.createElement('p', { className: "text-sm text-text-secondary mb-2 truncate", title: fileName }, `File: ${fileName}`),
        
        React.createElement('div', { className: "space-y-4 flex-shrink-0 mb-4" },
            React.createElement('div', { className: "grid grid-cols-3 gap-4" },
                renderJobControls()
            ),
            React.createElement('div', { className: "w-full bg-secondary rounded-full h-4" },
                React.createElement('div', { className: "bg-primary h-4 rounded-full transition-all duration-300", style: { width: `${progress}%` } })
            ),
            React.createElement('div', { className: "flex justify-between items-center text-sm font-medium" },
                React.createElement('p', null, "Status: ", React.createElement('span', { className: "font-bold capitalize" }, jobStatus)),
                React.createElement('p', { className: "font-bold" }, `${progress.toFixed(1)}%`)
            )
        ),
        
        React.createElement('div', { className: "flex-grow relative min-h-0" },
            renderContent()
        )
    );
};

export default GCodePanel;
