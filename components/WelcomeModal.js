

import React from 'react';
import { Settings, BookOpen, Upload, X, CheckCircle } from './Icons.js';

const h = React.createElement;

const WelcomeModal = ({ isOpen, onClose, onOpenSettings, onOpenToolLibrary, isMachineSetupComplete, isToolLibrarySetupComplete }) => {
    if (!isOpen) {
        return null;
    }

    const Step = ({ icon, title, description, buttonText, onButtonClick, isComplete }) => h('div', { className: 'flex items-start gap-4 py-2' },
        h('div', { className: 'flex-shrink-0 w-8 h-8 flex items-center justify-center mt-1' },
            isComplete ?
                h(CheckCircle, { className: 'w-8 h-8 text-accent-green' }) :
                h('div', { className: 'w-7 h-7 rounded-full border-2 border-secondary bg-background' })
        ),
        h('div', { className: 'flex-grow' },
            h('h3', { className: `font-bold text-lg ${isComplete ? 'text-text-secondary line-through' : 'text-text-primary'}` }, title),
            h('p', { className: 'text-text-secondary text-sm mt-1' }, description),
            (buttonText && !isComplete) && h('button', {
                onClick: onButtonClick,
                className: 'mt-3 px-3 py-1 bg-primary text-white text-sm font-semibold rounded-md hover:bg-primary-focus focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface'
            }, buttonText)
        )
    );

    return h('div', {
        className: 'fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center',
        'aria-modal': true,
        role: 'dialog'
    },
        h('div', {
            className: 'bg-surface rounded-lg shadow-2xl w-full max-w-2xl border border-secondary transform transition-all',
        },
            h('div', { className: 'p-6 border-b border-secondary flex justify-between items-center' },
                h('h2', { className: 'text-2xl font-bold text-text-primary' }, "Welcome to mycnc.app!"),
                h('button', {
                    onClick: onClose,
                    className: "p-1 rounded-md text-text-secondary hover:text-text-primary hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-primary",
                    'aria-label': "Close welcome guide"
                }, h(X, { className: 'w-6 h-6' }))
            ),
            h('div', { className: 'p-8 space-y-4' },
                h('p', { className: 'text-center text-lg text-text-secondary' }, "Here's a quick guide to get you started:"),
                h(Step, {
                    icon: h(Settings, { className: 'w-7 h-7 text-white' }),
                    title: "1. Configure Your Machine",
                    description: "Tell the sender about your CNC's work area and spindle. This is crucial for safety checks and accurate previews.",
                    buttonText: "Open Machine Settings",
                    onButtonClick: onOpenSettings,
                    isComplete: isMachineSetupComplete
                }),
                h(Step, {
                    icon: h(BookOpen, { className: 'w-7 h-7 text-white' }),
                    title: "2. Add Your First Tool",
                    description: "Create a tool library so the application knows the diameter of your bits for previews and G-code generation.",
                    buttonText: "Open Tool Library",
                    onButtonClick: onOpenToolLibrary,
                    isComplete: isToolLibrarySetupComplete
                }),
                h(Step, {
                    icon: h(Upload, { className: 'w-7 h-7 text-white' }),
                    title: "3. Load G-Code & Start",
                    description: "Load a file, complete the pre-flight checklist, and you're ready to make chips!",
                    isComplete: false, // This step is informational
                }),
                 h('p', { className: 'text-center text-xs text-text-secondary pt-4 border-t border-secondary' }, "Remember, this is demonstration software. Always monitor your machine and use it at your own risk.")
            ),
            h('div', { className: 'bg-background px-6 py-4 flex justify-end rounded-b-lg' },
                h('button', {
                    onClick: onClose,
                    className: 'px-8 py-3 bg-primary text-white font-bold rounded-md hover:bg-primary-focus focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background'
                }, "Got it, Let's Go!")
            )
        )
    );
};

export default WelcomeModal;