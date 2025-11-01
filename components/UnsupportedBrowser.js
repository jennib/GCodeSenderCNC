import React from 'react';
import { AlertTriangle } from './Icons.js';

const h = React.createElement;

const UnsupportedBrowser = ({ useSimulator, onSimulatorChange }) => {
    return h('div', { className: "bg-background text-text-primary min-h-screen flex flex-col items-center justify-center p-8 text-center" },
        h('div', { className: 'max-w-2xl' },
            h(AlertTriangle, { className: 'w-20 h-20 text-accent-yellow mx-auto mb-6' }),
            h('h1', { className: 'text-4xl font-bold text-text-primary mb-4' }, "Browser Not Supported"),
            h('p', { className: 'text-lg text-text-secondary mb-6' },
                "We're sorry, but your browser does not support the Web Serial API, which is required for this application to connect to a physical CNC machine."
            ),
            h('div', { className: 'bg-surface p-6 rounded-lg' },
                h('h2', { className: 'text-xl font-semibold text-text-primary mb-3' }, "For physical machine control, please use a supported browser:"),
                h('ul', { className: 'list-disc list-inside text-left text-text-secondary space-y-2' },
                    h('li', null, "Google Chrome (version 78+)"),
                    h('li', null, "Microsoft Edge (version 78+)"),
                    h('li', null, 
                        "Mozilla Firefox (version 119+), with the ",
                        h('code', { className: 'bg-background px-1.5 py-0.5 rounded-md font-mono' }, 'dom.w3c_serial.enabled'),
                        " flag enabled in ",
                        h('code', { className: 'bg-background px-1.5 py-0.5 rounded-md font-mono' }, 'about:config'),
                        "."
                    )
                )
            ),
             h('div', { className: 'mt-8 bg-surface p-6 rounded-lg' },
                h('h2', { className: 'text-xl font-semibold text-text-primary mb-3' }, "Try the Simulator"),
                h('p', { className: 'text-text-secondary mb-4' },
                    "You can still explore the application's features using the built-in simulator."
                ),
                h('label', {
                    className: 'mt-2 inline-flex items-center gap-3 cursor-pointer text-lg p-3 rounded-md bg-secondary hover:bg-secondary-focus',
                },
                    h('input', {
                        type: 'checkbox',
                        checked: useSimulator,
                        onChange: e => onSimulatorChange(e.target.checked),
                        className: 'h-6 w-6 rounded border-secondary text-primary focus:ring-primary'
                    }),
                    h('span', {className: 'font-semibold'}, 'Use Simulator')
                )
            )
        )
    );
};

export default UnsupportedBrowser;
