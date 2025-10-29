
import React from 'react';
import { Contrast } from './Icons.js';

const h = React.createElement;

const ThemeToggle = ({ isLightMode, onToggle }) => {
    return h('button', {
        onClick: onToggle,
        title: "Toggle Light Mode",
        className: `p-2 rounded-md transition-colors ${isLightMode ? 'bg-primary text-white' : 'bg-secondary text-text-primary hover:bg-secondary-focus'} focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface`
    },
        h(Contrast, { className: "w-5 h-5" })
    );
};

export default ThemeToggle;