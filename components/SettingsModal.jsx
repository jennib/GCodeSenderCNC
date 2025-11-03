import React, { useState, useEffect, useRef } from 'react';
import { Save, X, Upload, Download } from './Icons';

const h = React.createElement;

const InputGroup = ({ label, children }) => h('div', null,
    h('label', { className: 'block text-sm font-bold text-text-secondary mb-2' }, label),
    h('div', { className: 'flex items-center gap-2' }, children)
);

const NumberInput = ({ id, value, onChange, unit }) => h('div', { className: 'relative flex-grow' },
    h('input', {
        id, type: 'number', value, onChange,
        className: 'w-full bg-background border border-secondary rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary'
    }),
    unit && h('span', { className: 'absolute right-3 top-1/2 -translate-y-1/2 text-sm text-text-secondary' }, unit)
);

const ScriptInput = ({ label, value, onChange, placeholder }) => h('div', null,
    h('label', { className: 'block text-sm font-medium text-text-secondary mb-1' }, label),
    h('textarea', {
        value, onChange, rows: 4, placeholder,
        className: 'w-full bg-background border border-secondary rounded-md py-2 px-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary',
        spellCheck: 'false'
    })
);

const SettingsModal = ({ isOpen, onCancel, onSave, settings, onResetDialogs, onExport, onImport }) => {
    const [localSettings, setLocalSettings] = useState(settings);
    const importFileRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            setLocalSettings(JSON.parse(JSON.stringify(settings)));
        }
    }, [isOpen, settings]);

    if (!isOpen) return null;

    const handleNestedNumericChange = (category, field, value) => {
        // Keep the value as a string during editing to allow partial input like "1." or "-"
        setLocalSettings(prev => ({
            ...prev,
            [category]: {
                ...prev[category],
                [field]: value
            }
        }));
    };

    const handleScriptChange = (scriptName, value) => {
        setLocalSettings(prev => ({
            ...prev,
            scripts: {
                ...prev.scripts,
                [scriptName]: value
            }
        }));
    };
    
    const handleSave = () => {
        // Deep clone to avoid mutating state directly
        const settingsToSave = JSON.parse(JSON.stringify(localSettings));
        
        // Define which fields need to be parsed to numbers
        const numericFields = {
            workArea: ['x', 'y', 'z'],
            spindle: ['min', 'max'],
            probe: ['xOffset', 'yOffset', 'zOffset', 'feedRate']
        };

        // Iterate and parse string inputs back to numbers
        for (const category in numericFields) {
            if (settingsToSave[category]) {
                for (const field of numericFields[category]) {
                    const value = settingsToSave[category][field];
                    // Coerce to number, default to 0 if invalid
                    settingsToSave[category][field] = parseFloat(value) || 0;
                }
            }
        }

        onSave(settingsToSave);
        onCancel();
    };

    const handleFileImport = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedData = JSON.parse(e.target.result);
                onImport(importedData);
                onCancel(); // Close modal on successful import
            } catch (error) {
                console.error("Failed to parse settings file:", error);
                alert("Error: Could not read or parse the settings file. Please ensure it's a valid JSON file.");
            }
        };
        reader.readAsText(file);
        event.target.value = null; // Reset file input
    };

    return h('div', {
        className: 'fixed inset-0 bg-background/80 backdrop-blur-sm z-40 flex items-center justify-center',
        onClick: onCancel, 'aria-modal': true, role: 'dialog'
    },
        h('div', {
            className: 'bg-surface rounded-lg shadow-2xl w-full max-w-2xl border border-secondary transform transition-all max-h-[90vh] flex flex-col',
            onClick: e => e.stopPropagation()
        },
            h('div', { className: 'p-6 border-b border-secondary flex justify-between items-center flex-shrink-0' },
                h('h2', { className: 'text-2xl font-bold text-text-primary' }, 'Machine Settings'),
                h('button', { onClick: onCancel, className: "p-1 rounded-md text-text-secondary hover:text-text-primary hover:bg-secondary" }, h(X, { className: 'w-6 h-6' }))
            ),
            h('div', { className: 'p-6 space-y-6 overflow-y-auto' },
                h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-6' },
                    h('div', { className: 'space-y-4 bg-background p-4 rounded-md' },
                        h(InputGroup, { label: 'Work Area Dimensions (mm)' },
                            h(NumberInput, { id: 'work-x', value: localSettings.workArea.x, onChange: e => handleNestedNumericChange('workArea', 'x', e.target.value), unit: 'X' }),
                            h(NumberInput, { id: 'work-y', value: localSettings.workArea.y, onChange: e => handleNestedNumericChange('workArea', 'y', e.target.value), unit: 'Y' }),
                            h(NumberInput, { id: 'work-z', value: localSettings.workArea.z, onChange: e => handleNestedNumericChange('workArea', 'z', e.target.value), unit: 'Z' })
                        ),
                        h(InputGroup, { label: 'Spindle Speed Range (RPM)' },
                            h(NumberInput, { id: 'spindle-min', value: localSettings.spindle.min, onChange: e => handleNestedNumericChange('spindle', 'min', e.target.value), unit: 'Min' }),
                            h(NumberInput, { id: 'spindle-max', value: localSettings.spindle.max, onChange: e => handleNestedNumericChange('spindle', 'max', e.target.value), unit: 'Max' })
                        ),
                        h(InputGroup, { label: 'Probe Offsets (mm)' },
                             h(NumberInput, { id: 'probe-x', value: localSettings.probe.xOffset, onChange: e => handleNestedNumericChange('probe', 'xOffset', e.target.value), unit: 'X Offset' }),
                             h(NumberInput, { id: 'probe-y', value: localSettings.probe.yOffset, onChange: e => handleNestedNumericChange('probe', 'yOffset', e.target.value), unit: 'Y Offset' }),
                             h(NumberInput, { id: 'probe-z', value: localSettings.probe.zOffset, onChange: e => handleNestedNumericChange('probe', 'zOffset', e.target.value), unit: 'Z Offset' })
                        ),
                        h(InputGroup, { label: 'Probe Feed Rate'},
                            h(NumberInput, { id: 'probe-feed', value: localSettings.probe.feedRate, onChange: e => handleNestedNumericChange('probe', 'feedRate', e.target.value), unit: 'mm/min' })
                        )
                    ),
                    h('div', { className: 'space-y-4 bg-background p-4 rounded-md' },
                        h('h3', { className: 'text-sm font-bold text-text-secondary mb-2' }, 'Custom G-Code Scripts'),
                        h(ScriptInput, { label: 'Startup Script (on connect)', value: localSettings.scripts.startup, onChange: e => handleScriptChange('startup', e.target.value), placeholder: 'e.g., G21 G90' }),
                        h(ScriptInput, { label: 'Tool Change Script', value: localSettings.scripts.toolChange, onChange: e => handleScriptChange('toolChange', e.target.value), placeholder: 'e.g., M5 G0 Z10' }),
                        h(ScriptInput, { label: 'Shutdown Script (on disconnect)', value: localSettings.scripts.shutdown, onChange: e => handleScriptChange('shutdown', e.target.value), placeholder: 'e.g., M5 G0 X0 Y0' })
                    )
                ),
                h('div', { className: 'bg-background p-4 rounded-md' },
                    h('h3', { className: 'text-sm font-bold text-text-secondary mb-2' }, 'Configuration'),
                    h('div', { className: 'flex items-center justify-between' },
                        h('p', { className: 'text-sm' }, 'Export/Import all settings, macros, and tools.'),
                        h('div', { className: 'flex gap-2' },
                            h('input', { type: 'file', ref: importFileRef, className: 'hidden', accept: '.json', onChange: handleFileImport }),
                            h('button', {
                                onClick: () => importFileRef.current.click(),
                                className: 'flex items-center gap-2 px-4 py-2 bg-secondary text-white text-sm font-semibold rounded-md hover:bg-secondary-focus'
                            }, h(Upload, { className: 'w-4 h-4' }), 'Import'),
                            h('button', {
                                onClick: onExport,
                                className: 'flex items-center gap-2 px-4 py-2 bg-secondary text-white text-sm font-semibold rounded-md hover:bg-secondary-focus'
                            }, h(Download, { className: 'w-4 h-4' }), 'Export')
                        )
                    )
                ),
                h('div', { className: 'bg-background p-4 rounded-md' },
                    h('h3', { className: 'text-sm font-bold text-text-secondary mb-2' }, 'Interface Settings'),
                    h('div', { className: 'flex items-center justify-between' },
                        h('p', { className: 'text-sm' }, 'Reset "Don\'t show again" dialogs.'),
                        h('button', {
                            onClick: onResetDialogs,
                            className: 'px-4 py-2 bg-secondary text-white text-sm font-semibold rounded-md hover:bg-secondary-focus focus:outline-none focus:ring-2 focus:ring-secondary'
                        }, 'Reset Dialogs')
                    )
                )
            ),
            h('div', { className: 'bg-background px-6 py-4 flex justify-end items-center rounded-b-lg flex-shrink-0' },
                h('div', { className: 'flex items-center gap-4' },
                    h('button', { onClick: onCancel, className: 'px-4 py-2 bg-secondary text-white font-semibold rounded-md hover:bg-secondary-focus' }, 'Cancel'),
                    h('button', { onClick: handleSave, className: 'px-6 py-2 bg-primary text-white font-bold rounded-md hover:bg-primary-focus flex items-center gap-2' }, h(Save, { className: 'w-5 h-5' }), 'Save Settings')
                )
            )
        )
    );
};

export default SettingsModal;