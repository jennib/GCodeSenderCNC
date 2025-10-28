import React from 'react';
import { Contrast } from './Icons.js';

const h = React.createElement;

const ThemeToggle = ({ isHighContrast, onToggle }) => {
    return h('button', {
        onClick: onToggle,
        title: "Toggle High Contrast Mode",
        className: `p-2 rounded-md transition-colors ${isHighContrast ? 'bg-primary text-white' : 'bg-secondary text-text-primary hover:bg-secondary-focus'} focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface`
    },
        h(Contrast, { className: "w-5 h-5" })
    );
};

export default ThemeToggle;
