
import React, { useState, useEffect } from 'react';
import { CheckCircle, X, AlertTriangle } from './Icons.js';

const h = React.createElement;

const ChecklistItem = ({ isMet, text, children }) => {
    return h('li', { className: 'flex items-start gap-3 py-2' },
        isMet
            ? h(CheckCircle, { className: 'w-6 h-6 text-accent-green flex-shrink-0 mt-0.5' })
            : h(AlertTriangle, { className: 'w-6 h-6 text-accent-yellow flex-shrink-0 mt-0.5' }),
        h('div', null,
            h('span', { className: `font-semibold ${isMet ? 'text-text-primary' : 'text-accent-yellow'}` }, text),
            children && h('div', { className: 'text-sm text-text-secondary mt-1' }, children)
        )
    );
};


const PreflightChecklistModal = ({ isOpen, onCancel, onConfirm, jobInfo, isHomed, warnings, selectedTool }) => {
    const [isWorkZeroSet, setIsWorkZeroSet] = useState(false);
    const [isToolpathChecked, setIsToolpathChecked] = useState(false);
    const [isToolConfirmed, setIsToolConfirmed] = useState(false);
    const [isDryRun, setIsDryRun] = useState(false);

    // Reset checkboxes when modal is opened
    useEffect(() => {
        if (isOpen) {
            setIsWorkZeroSet(false);
            setIsToolpathChecked(false);
            setIsToolConfirmed(false);
            setIsDryRun(false);
        }
    }, [isOpen]);

    if (!isOpen) {
        return null;
    }
    
    const allChecksPassed = isHomed && isWorkZeroSet && isToolpathChecked && (selectedTool ? isToolConfirmed : true);
    const { startLine = 0 } = jobInfo;
    const hasErrors = warnings.some(w => w.type === 'error');

    const formatTime = (totalSeconds) => {
        if (totalSeconds < 1) return '< 1 minute';
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        return `${hours > 0 ? `${hours}h ` : ''}${minutes}m`;
    };

    const WarningSection = () => {
        if (!warnings || warnings.length === 0) return null;
        
        return h('div', { className: 'bg-background p-4 rounded-md border-l-4 border-accent-yellow' },
            h('h3', { className: 'font-bold text-accent-yellow mb-2 flex items-center gap-2' }, 
                h(AlertTriangle, { className: 'w-5 h-5'}),
                'Pre-Run Analysis Warnings'
            ),
            h('ul', { className: 'space-y-1 text-sm' },
                warnings.map((w, i) => h('li', { 
                    key: i,
                    className: `pl-2 ${w.type === 'error' ? 'text-accent-red font-semibold' : 'text-accent-yellow'}`
                }, `- ${w.message}`))
            )
        );
    };

    return h('div', {
        className: 'fixed inset-0 bg-background/80 backdrop-blur-sm z-40 flex items-center justify-center',
        onClick: onCancel,
        'aria-modal': true,
        role: 'dialog'
    },
        h('div', {
            className: 'bg-surface rounded-lg shadow-2xl w-full max-w-lg border border-secondary transform transition-all',
            onClick: e => e.stopPropagation()
        },
            h('div', { className: 'p-6 border-b border-secondary' },
                h('h2', { className: 'text-2xl font-bold text-text-primary' }, 'Pre-Flight Checklist'),
                h('p', { className: 'text-text-secondary mt-1' }, 'Confirm machine state before starting job.')
            ),
            h('div', { className: 'p-6 space-y-4' },
                 h(WarningSection, {}),
                h('div', { className: 'bg-background p-4 rounded-md' },
                    h('h3', { className: 'font-bold text-text-primary mb-2' }, 'Job Summary'),
                    h('p', { className: 'text-sm text-text-secondary truncate' }, h('strong', null, 'File: '), jobInfo.fileName),
                    h('div', { className: 'grid grid-cols-2' },
                        h('p', { className: 'text-sm text-text-secondary' }, h('strong', null, 'Lines: '), `${jobInfo.gcodeLines.length.toLocaleString()}`),
                        h('p', { className: 'text-sm text-text-secondary' }, h('strong', null, 'Est. Time: '), formatTime(jobInfo.timeEstimate.totalSeconds))
                    ),
                    (startLine > 0) && h('p', { className: 'text-sm text-accent-yellow font-semibold mt-1' }, `Starting from line ${startLine + 1}`)
                ),

                h('ul', { className: 'space-y-2' },
                    h(ChecklistItem, { isMet: isHomed, text: 'Machine is Homed' },
                        !isHomed && h('p', null, 'The machine must be homed before starting a job. Use the "Home" command in the jog panel.')
                    ),
                    selectedTool && h(ChecklistItem, { isMet: isToolConfirmed, text: 'Correct Tool is Loaded' },
                        h('label', { className: 'flex items-center gap-2 mt-2 cursor-pointer' },
                            h('input', {
                                type: 'checkbox',
                                checked: isToolConfirmed,
                                onChange: e => setIsToolConfirmed(e.target.checked),
                                className: 'h-4 w-4 rounded border-secondary text-primary focus:ring-primary'
                            }),
                            h('span', null, 'I confirm ', h('strong', {className: 'text-primary'}, selectedTool.name), ' is in the spindle.')
                        )
                    ),
                    h(ChecklistItem, { isMet: isWorkZeroSet, text: 'Work Zero is Set' },
                        h('label', { className: 'flex items-center gap-2 mt-2 cursor-pointer' },
                            h('input', {
                                type: 'checkbox',
                                checked: isWorkZeroSet,
                                onChange: e => setIsWorkZeroSet(e.target.checked),
                                className: 'h-4 w-4 rounded border-secondary text-primary focus:ring-primary'
                            }),
                            'I have correctly set the WCS origin (X, Y, and Z zero) for this job.'
                        )
                    ),
                    h(ChecklistItem, { isMet: isToolpathChecked, text: 'Toolpath is Safe and Correct' },
                         h('label', { className: 'flex items-center gap-2 mt-2 cursor-pointer' },
                            h('input', {
                                type: 'checkbox',
                                checked: isToolpathChecked,
                                onChange: e => setIsToolpathChecked(e.target.checked),
                                className: 'h-4 w-4 rounded border-secondary text-primary focus:ring-primary'
                            }),
                            'I have verified the toolpath, clamps, and stock are clear and correct.'
                        )
                    )
                )
            ),
            h('div', { className: 'bg-background px-6 py-4 flex justify-between items-center rounded-b-lg' },
                h('label', { className: 'flex items-center gap-2 cursor-pointer text-sm font-semibold' },
                    h('input', {
                        type: 'checkbox',
                        checked: isDryRun,
                        onChange: e => setIsDryRun(e.target.checked),
                        className: 'h-5 w-5 rounded border-secondary text-primary focus:ring-primary'
                    }),
                    h('div', { className: 'flex flex-col' },
                        "Dry Run",
                        h('span', { className: 'text-xs font-normal text-text-secondary' }, '(ignore spindle commands)')
                    )
                ),
                h('div', { className: 'flex items-center gap-4' },
                    h('button', {
                        onClick: onCancel,
                        className: 'px-4 py-2 bg-secondary text-white font-semibold rounded-md hover:bg-secondary-focus focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2 focus:ring-offset-background'
                    }, 'Cancel'),
                    h('button', {
                        onClick: () => onConfirm({ isDryRun }),
                        disabled: !allChecksPassed || hasErrors,
                        title: hasErrors ? 'Cannot start job with critical errors (red warnings).' : (!allChecksPassed ? 'Complete all checklist items to start.' : 'Start Job'),
                        className: 'px-6 py-2 bg-accent-green text-white font-bold rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-background disabled:bg-secondary disabled:cursor-not-allowed flex items-center gap-2'
                    }, h(CheckCircle, { className: 'w-5 h-5' }), 'Confirm & Start Job')
                )
            )
        )
    );
};

export default PreflightChecklistModal;
