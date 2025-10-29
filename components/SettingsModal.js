import React, { useState, useEffect } from 'react';
import { Save, X, BookOpen } from './Icons.js';

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

const SettingsModal = ({ isOpen, onCancel, onSave, settings, onOpenToolLibrary }) => {
    const [localSettings, setLocalSettings] = useState(settings);

    useEffect(() => {
        if (isOpen) {
            setLocalSettings(settings);
        }
    }, [isOpen, settings]);

    if (!isOpen) return null;

    const handleNumericChange = (category, field, value) => {
        const numValue = value === '' ? '' : parseFloat(value);
        setLocalSettings(prev => ({
            ...prev,
            [category]: {
                ...prev[category],
                [field]: numValue
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
        onSave(localSettings);
        onCancel();
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
                        h(InputGroup, { label: 'Work Area Dimensions' },
                            h(NumberInput, { id: 'work-x', value: localSettings.workArea.x, onChange: e => handleNumericChange('workArea', 'x', e.target.value), unit: 'mm' }),
                            h(NumberInput, { id: 'work-y', value: localSettings.workArea.y, onChange: e => handleNumericChange('workArea', 'y', e.target.value), unit: 'mm' }),
                            h(NumberInput, { id: 'work-z', value: localSettings.workArea.z, onChange: e => handleNumericChange('workArea', 'z', e.target.value), unit: 'mm' })
                        ),
                        h(InputGroup, { label: 'Spindle Speed Range' },
                            h(NumberInput, { id: 'spindle-min', value: localSettings.spindle.min, onChange: e => handleNumericChange('spindle', 'min', e.target.value), unit: 'RPM' }),
                            h(NumberInput, { id: 'spindle-max', value: localSettings.spindle.max, onChange: e => handleNumericChange('spindle', 'max', e.target.value), unit: 'RPM' })
                        ),
                        h('div', null, 
                           h('button', {
                                onClick: onOpenToolLibrary,
                                className: 'w-full flex items-center justify-center gap-2 px-4 py-2 bg-secondary text-white font-semibold rounded-md hover:bg-secondary-focus focus:outline-none focus:ring-2 focus:ring-primary'
                            }, h(BookOpen, {className: 'w-5 h-5'}), 'Open Tool Library')
                        )
                    ),
                    h('div', { className: 'space-y-4 bg-background p-4 rounded-md' },
                        h('h3', { className: 'text-sm font-bold text-text-secondary mb-2' }, 'Custom G-Code Scripts'),
                        h(ScriptInput, { label: 'Startup Script (on connect)', value: localSettings.scripts.startup, onChange: e => handleScriptChange('startup', e.target.value), placeholder: 'e.g., G21 G90' }),
                        h(ScriptInput, { label: 'Tool Change Script', value: localSettings.scripts.toolChange, onChange: e => handleScriptChange('toolChange', e.target.value), placeholder: 'e.g., M5 G0 Z10' }),
                        h(ScriptInput, { label: 'Shutdown Script (on disconnect)', value: localSettings.scripts.shutdown, onChange: e => handleScriptChange('shutdown', e.target.value), placeholder: 'e.g., M5 G0 X0 Y0' })
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
