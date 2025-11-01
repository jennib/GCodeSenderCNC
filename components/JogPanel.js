import React, { useState, useEffect } from 'react';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Pin, RotateCw, RotateCcw, PowerOff, Probe } from './Icons.js';

const h = React.createElement;

const JogPanel = ({
    isConnected,
    machineState,
    onJog,
    onHome,
    onSetZero,
    onSpindleCommand,
    onProbe,
    jogStep,
    onStepChange,
    flashingButton,
    onFlash,
    unit,
    onUnitChange,
    isJobActive,
    isJogging,
    isMacroRunning,
}) => {
    const [spindleSpeed, setSpindleSpeed] = useState(1000);
    
    const isControlDisabled = !isConnected || isJobActive || isJogging || isMacroRunning || ['Alarm', 'Home', 'Jog'].includes(machineState?.status || '');
    const isZJogDisabledForStep = (unit === 'mm' && jogStep > 10) || (unit === 'in' && jogStep > 1);

    const JogButton = ({ id, axis, direction, icon, label, hotkey }) => {
        const isZButton = axis === 'Z';
        const isDisabled = isControlDisabled || (isZButton && isZJogDisabledForStep);

        let title = `${label} (${axis}${direction > 0 ? '+' : '-'}) (Hotkey: ${hotkey})`;
        if (isZButton && isZJogDisabledForStep) {
            title = `Z-Jog disabled for step size > ${unit === 'mm' ? '10mm' : '1in'}`;
        }
        
        return h('button', {
            id,
            onMouseDown: () => {
                onJog(axis, direction, jogStep);
                onFlash(id);
            },
            disabled: isDisabled,
            className: `flex items-center justify-center p-4 bg-secondary rounded-md hover:bg-secondary-focus focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface disabled:opacity-50 disabled:cursor-not-allowed ${flashingButton === id ? 'ring-4 ring-white ring-inset' : ''}`,
            title: title
        }, icon);
    };
    
    const stepSizes = unit === 'mm' ? [0.01, 0.1, 1, 10, 50] : [0.001, 0.01, 0.1, 1, 2];

    return h('div', { className: "bg-surface rounded-lg shadow-lg flex flex-col p-4 gap-4" },
        // Controls
        h('div', { className: "grid grid-cols-1 md:grid-cols-2 gap-4" },
            // Jog Controls
            h('div', { className: 'bg-background p-3 rounded-md' },
                h('h4', { className: 'text-sm font-bold text-text-secondary mb-2 text-center' }, 'Jog Control'),
                h('div', { className: 'grid grid-cols-3 grid-rows-3 gap-2' },
                    h('div', { className: 'col-start-1 row-start-1' }), // empty
                    h(JogButton, { id: 'jog-y-plus', axis: 'Y', direction: 1, icon: h(ArrowUp, { className: "w-6 h-6" }), label: 'Jog Y+', hotkey: 'Up Arrow' }),
                    h(JogButton, { id: 'jog-z-plus', axis: 'Z', direction: 1, icon: h(ArrowUp, { className: "w-6 h-6" }), label: 'Jog Z+', hotkey: 'Page Up' }),
                    h(JogButton, { id: 'jog-x-minus', axis: 'X', direction: -1, icon: h(ArrowLeft, { className: "w-6 h-6" }), label: 'Jog X-', hotkey: 'Left Arrow' }),
                    
                    h('div', { className: 'col-start-2 row-start-2 flex items-center justify-center' },
                        h(Pin, { className: "w-8 h-8 text-text-secondary" })
                    ),
                    
                    h(JogButton, { id: 'jog-x-plus', axis: 'X', direction: 1, icon: h(ArrowRight, { className: "w-6 h-6" }), label: 'Jog X+', hotkey: 'Right Arrow' }),
                    h('div', { className: 'col-start-1 row-start-3' }), // empty
                    h(JogButton, { id: 'jog-y-minus', axis: 'Y', direction: -1, icon: h(ArrowDown, { className: "w-6 h-6" }), label: 'Jog Y-', hotkey: 'Down Arrow' }),
                    h(JogButton, { id: 'jog-z-minus', axis: 'Z', direction: -1, icon: h(ArrowDown, { className: "w-6 h-6" }), label: 'Jog Z-', hotkey: 'Page Down' })
                ),
                h('div', { className: 'flex justify-between items-center mt-3' },
                    h('span', { className: 'text-sm text-text-secondary' }, 'Step:'),
                    h('div', { className: 'flex gap-1' },
                        stepSizes.map(step => h('button', {
                            key: step,
                            id: `step-${step}`,
                            onClick: () => onStepChange(step),
                            disabled: isControlDisabled,
                            className: `px-2 py-1 text-xs rounded-md transition-colors ${jogStep === step ? 'bg-primary text-white font-bold' : 'bg-secondary hover:bg-secondary-focus'} ${flashingButton === `step-${step}` ? 'ring-2 ring-white ring-inset' : ''} disabled:opacity-50 disabled:cursor-not-allowed`
                        }, step))
                    )
                ),
                h('div', { className: 'mt-3 border-t border-secondary pt-3' },
                    h('h4', { className: 'text-sm font-bold text-text-secondary mb-2 text-center' }, 'Homing'),
                    h('div', { className: 'grid grid-cols-1 gap-2 text-sm' },
                        h('button', { onClick: () => onHome('all'), disabled: isControlDisabled, className: 'p-2 bg-secondary rounded hover:bg-secondary-focus disabled:opacity-50 font-bold' }, 'Home All ($H)')
                    )
                )
            ),
            h('div', { className: 'flex flex-col gap-3' },
                h('div', { className: 'bg-background p-3 rounded-md' },
                    h('h4', { className: 'text-sm font-bold text-text-secondary mb-2' }, 'Set Zero'),
                     h('div', { className: 'space-y-2 text-sm' },
                        h('div', { className: 'grid grid-cols-3 gap-2' },
                            h('button', { onClick: () => onSetZero('all'), disabled: isControlDisabled, className: 'p-2 bg-secondary rounded hover:bg-secondary-focus disabled:opacity-50' }, 'Zero All'),
                            h('button', { onClick: () => onSetZero('xy'), disabled: isControlDisabled, className: 'p-2 bg-secondary rounded hover:bg-secondary-focus disabled:opacity-50' }, 'Zero XY'),
                            h('button', { onClick: () => onSetZero('z'), disabled: isControlDisabled, className: 'p-2 bg-secondary rounded hover:bg-secondary-focus disabled:opacity-50' }, 'Zero Z')
                        )
                    )
                ),
                h('div', { className: 'bg-background p-3 rounded-md' },
                    h('h4', { className: 'text-sm font-bold text-text-secondary mb-2' }, 'Units'),
                    h('div', { className: 'flex bg-secondary rounded-md p-1' },
                        h('button', { onClick: () => onUnitChange('mm'), disabled: isControlDisabled, className: `w-1/2 p-1 rounded-md text-sm font-semibold transition-colors ${unit === 'mm' ? 'bg-primary text-white' : 'hover:bg-secondary-focus'} disabled:opacity-50 disabled:cursor-not-allowed` }, 'mm'),
                        h('button', { onClick: () => onUnitChange('in'), disabled: isControlDisabled, className: `w-1/2 p-1 rounded-md text-sm font-semibold transition-colors ${unit === 'in' ? 'bg-primary text-white' : 'hover:bg-secondary-focus'} disabled:opacity-50 disabled:cursor-not-allowed` }, 'in')
                    )
                ),
                h('div', { className: 'bg-background p-3 rounded-md' },
                    h('h4', { className: 'text-sm font-bold text-text-secondary mb-2' }, 'Probe'),
                    h('div', { className: 'grid grid-cols-2 gap-2 text-sm' },
                        h('button', { onClick: () => onProbe('X'), disabled: isControlDisabled, className: 'p-2 bg-primary text-white font-semibold rounded hover:bg-primary-focus disabled:opacity-50' }, 'Probe X'),
                        h('button', { onClick: () => onProbe('Y'), disabled: isControlDisabled, className: 'p-2 bg-primary text-white font-semibold rounded hover:bg-primary-focus disabled:opacity-50' }, 'Probe Y'),
                        h('button', { onClick: () => onProbe('Z'), disabled: isControlDisabled, className: 'p-2 bg-primary text-white font-semibold rounded hover:bg-primary-focus disabled:opacity-50 flex items-center justify-center gap-1' }, h(Probe, { className: 'w-4 h-4' }), 'Probe Z'),
                        h('button', { onClick: () => onProbe('XY'), disabled: isControlDisabled, className: 'p-2 bg-primary text-white font-semibold rounded hover:bg-primary-focus disabled:opacity-50' }, 'Probe XY')
                    )
                ),
                h('div', { className: 'bg-background p-3 rounded-md' },
                    h('h4', { className: 'text-sm font-bold text-text-secondary mb-2' }, 'Spindle Control'),
                    h('div', { className: 'flex items-center gap-2' },
                        h('input', {
                            type: 'number', value: spindleSpeed,
                            onChange: e => setSpindleSpeed(parseInt(e.target.value, 10)),
                            disabled: isControlDisabled,
                            className: 'w-full bg-secondary border border-secondary rounded-md py-1.5 px-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:opacity-50',
                            'aria-label': 'Spindle Speed in RPM'
                        }),
                        h('span', { className: 'text-sm text-text-secondary' }, 'RPM')
                    ),
                    h('div', { className: 'grid grid-cols-3 gap-2 mt-2' },
                        h('button', { title: 'Spindle On (CW)', onClick: () => onSpindleCommand('cw', spindleSpeed), disabled: isControlDisabled, className: 'p-2 bg-secondary rounded hover:bg-secondary-focus disabled:opacity-50 flex justify-center' }, h(RotateCw, { className: 'w-5 h-5' })),
                        h('button', { title: 'Spindle On (CCW)', onClick: () => onSpindleCommand('ccw', spindleSpeed), disabled: isControlDisabled, className: 'p-2 bg-secondary rounded hover:bg-secondary-focus disabled:opacity-50 flex justify-center' }, h(RotateCcw, { className: 'w-5 h-5' })),
                        h('button', { title: 'Spindle Off', onClick: () => onSpindleCommand('off', 0), disabled: isControlDisabled, className: 'p-2 bg-secondary rounded hover:bg-secondary-focus disabled:opacity-50 flex justify-center' }, h(PowerOff, { className: 'w-5 h-5' }))
                    )
                )
            )
        )
    );
};

export default JogPanel;