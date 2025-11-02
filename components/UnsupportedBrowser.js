import React from 'react';
import { AlertTriangle } from './Icons.js';

const h = React.createElement;

const UnsupportedBrowser = () => {
    return h('div', { className: "bg-background text-text-primary min-h-screen flex flex-col items-center justify-center p-8 text-center" },
        h('div', { className: 'max-w-2xl' },
            h('svg', {
                viewBox: '0 0 420 100',
                className: 'h-16 w-auto mx-auto mb-8',
                'aria-label': 'mycnc.app logo'
            }, 
                h('g', {
                    transform: 'translate(48,48)',
                    fill: 'none',
                    stroke: 'var(--color-text-primary)',
                    strokeWidth: '4'
                },
                    h('circle', { r: '48', cx: '0', cy: '0' }),
                    h('path', { d: 'M 0,-48 A 48,48 0 0 1 30,16 L 10,6 A 12,12 0 0 0 0,-12 Z' }),
                    h('path', { d: 'M 0,-48 A 48,48 0 0 1 30,16 L 10,6 A 12,12 0 0 0 0,-12 Z', transform: 'rotate(120)' }),
                    h('path', { d: 'M 0,-48 A 48,48 0 0 1 30,16 L 10,6 A 12,12 0 0 0 0,-12 Z', transform: 'rotate(-120)' }),
                    h('circle', { r: '12', cx: '0', cy: '0' })
                ),
                h('text', {
                    x: '108',
                    y: '66',
                    fontFamily: "Inter, 'Segoe UI', Roboto, Arial, sans-serif",
                    fontWeight: '700',
                    fontSize: '64px',
                    letterSpacing: '-0.02em',
                    fill: 'var(--color-text-primary)'
                },
                    h('tspan', { style: { fill: 'var(--color-primary)' } }, 'mycnc'),
                    '.app'
                )
            ),
            h('div', { className: 'bg-accent-yellow/20 border-l-4 border-accent-yellow text-accent-yellow p-4 m-4 flex items-start', role: 'alert' },
                h(AlertTriangle, { className: 'h-8 w-8 mr-4 flex-shrink-0' }),
                h('div', { className: 'text-left' },
                    h('h2', { className: 'text-lg font-bold mb-2' }, 'Browser Not Supported or Mobile Device Detected'),
                    h('p', { className: 'mb-2' }, "This application requires the Web Serial API to communicate with CNC controllers. This API is currently supported in desktop versions of browsers like Google Chrome and Microsoft Edge."),
                    h('p', { className: 'mb-2' }, "Mobile browsers do not support this feature."),
                    h('p', null, "Please access this page from a compatible desktop browser."),
                    h('div', { className: 'mt-4' },
                        h('a', { href: 'https://developer.mozilla.org/en-US/docs/Web/API/Web_Serial_API#browser_compatibility', target: '_blank', rel: 'noopener noreferrer', className: 'text-primary font-semibold hover:underline' }, 'Check Web Serial API compatibility'),
                        h('span', { className: 'mx-2' }, '|'),
                        h('a', { href: 'https://caniuse.com/serial', target: '_blank', rel: 'noopener noreferrer', className: 'text-primary font-semibold hover:underline' }, "View on CanIUse.com")
                    )
                )
            )
        )
    );
};

export default UnsupportedBrowser;