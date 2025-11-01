
import React from 'react';
import { Play, Square, AlertTriangle } from './Icons.js';

const h = React.createElement;

const ManualToolChangeModal = ({ isOpen, onContinue, onStop, toolInfo }) => {
    if (!isOpen) {
        return null;
    }

    return h('div', {
        className: "fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center",
        'aria-modal': "true",
        role: "dialog"
    },
        h('div', {
            className: "bg-surface rounded-lg shadow-2xl w-full max-w-md border border-secondary transform transition-all"
        },
            h('div', { className: "p-6 border-b border-secondary" },
                h('h2', { className: "text-2xl font-bold text-text-primary flex items-center gap-3" },
                    h(AlertTriangle, { className: "w-8 h-8 text-accent-yellow" }),
                    "Manual Tool Change Required"
                )
            ),
            h('div', { className: "p-6 text-center space-y-4" },
                h('p', { className: "text-lg text-text-secondary" }, "Please change to tool:"),
                h('div', { className: "bg-background py-4 px-6 rounded-md" },
                    h('span', { className: "text-5xl font-mono font-bold text-primary" }, `T${toolInfo.toolNumber}`)
                ),
                h('p', { className: "text-text-secondary" }, "Ensure the new tool is properly secured and your Z-axis zero is set correctly for it.")
            ),
            h('div', { className: "bg-background px-6 py-4 flex justify-between items-center rounded-b-lg" },
                h('button', {
                    onClick: onStop,
                    className: "px-6 py-2 bg-accent-red text-white font-bold rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 flex items-center gap-2"
                },
                    h(Square, { className: "w-5 h-5" }),
                    "Stop Job"
                ),
                h('button', {
                    onClick: onContinue,
                    className: "px-6 py-2 bg-accent-green text-white font-bold rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 flex items-center gap-2"
                },
                    h(Play, { className: "w-5 h-5" }),
                    "Continue Job"
                )
            )
        )
    );
};

export default ManualToolChangeModal;
