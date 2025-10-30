
import React, { useState } from 'react';
import { Zap, Pencil, CheckCircle, PlusCircle, ChevronDown, ChevronUp } from './Icons.js';

const h = React.createElement;

const MacrosPanel = ({ macros, onRunMacro, onOpenEditor, isEditMode, onToggleEditMode, disabled }) => {
    const [isCollapsed, setIsCollapsed] = useState(true); // Default is collapsed

    const handleButtonClick = (e, index) => {
        // Prevent event bubbling up to the main button when clicking the small edit icon
        e.stopPropagation();
        if (isEditMode) {
            onOpenEditor(index);
        } else {
            onRunMacro(macros[index].commands);
        }
    };

    return h('div', { className: 'bg-surface rounded-lg shadow-lg p-4' },
        h('div', {
            onClick: () => setIsCollapsed(p => !p),
            className: 'flex items-center justify-between cursor-pointer',
            role: 'button',
            tabIndex: 0,
            'aria-expanded': !isCollapsed,
            'aria-controls': 'macros-panel-content',
            onKeyDown: (e) => { if (e.key === 'Enter' || e.key === ' ') setIsCollapsed(p => !p); }
        },
            h('div', { className: 'flex items-center gap-2 text-lg font-bold' },
                h(Zap, { className: 'w-5 h-5 text-primary' }),
                "Macros"
            ),
            h('div', { className: 'flex items-center gap-4' },
                h('button', {
                    onClick: (e) => { e.stopPropagation(); onToggleEditMode(); },
                    disabled: disabled && !isEditMode, // Can always exit edit mode
                    className: 'flex items-center gap-2 px-3 py-1 bg-secondary text-white font-semibold rounded-md hover:bg-secondary-focus focus:outline-none focus:ring-2 focus:ring-secondary transition-colors text-sm disabled:opacity-50',
                },
                    isEditMode
                        ? h(React.Fragment, null, h(CheckCircle, { className: 'w-4 h-4 text-accent-green' }), 'Done')
                        : h(React.Fragment, null, h(Pencil, { className: 'w-4 h-4' }), 'Edit')
                ),
                isCollapsed ? h(ChevronDown, { className: 'w-5 h-5 text-text-secondary' }) : h(ChevronUp, { className: 'w-5 h-5 text-text-secondary' })
            )
        ),

        !isCollapsed && h('div', {
            id: 'macros-panel-content',
            className: 'mt-4 pt-4 border-t border-secondary'
        },
            h('div', { className: 'grid grid-cols-2 sm:grid-cols-3 gap-2' },
                macros.map((macro, index) => h('button', {
                    key: index,
                    onClick: (e) => handleButtonClick(e, index),
                    disabled: disabled && !isEditMode,
                    className: 'relative p-3 bg-secondary rounded-md text-sm font-semibold hover:bg-secondary-focus focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface disabled:opacity-50 disabled:cursor-not-allowed text-left',
                    title: isEditMode ? `Edit "${macro.name}"` : macro.commands.join('; ')
                },
                    macro.name,
                    isEditMode && h('div', {
                        className: 'absolute top-1 right-1 p-1 rounded-full bg-primary/50 hover:bg-primary'
                    }, h(Pencil, { className: 'w-3 h-3 text-white' }))
                )),
                isEditMode && h('button', {
                    onClick: (e) => { e.stopPropagation(); onOpenEditor(null); }, // Stop propagation on Add
                    className: 'p-3 border-2 border-dashed border-secondary rounded-md text-sm font-semibold text-text-secondary hover:border-primary hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface flex flex-col items-center justify-center gap-1',
                }, h(PlusCircle, { className: 'w-6 h-6' }), 'Add Macro')
            )
        )
    );
};

export default MacrosPanel;