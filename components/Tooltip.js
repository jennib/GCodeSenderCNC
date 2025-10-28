import React, { useState } from 'react';

const h = React.createElement;

const Tooltip = ({ children, content, title }) => {
    const [visible, setVisible] = useState(false);

    const show = () => setVisible(true);
    const hide = () => setVisible(false);

    return h('span', {
        className: 'relative inline-block',
        onMouseEnter: show,
        onMouseLeave: hide
    },
        children,
        visible && h('div', {
            className: "absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-xs bg-background border border-secondary text-text-primary text-sm rounded-md shadow-lg z-20 p-3"
        },
            title && h('h4', { className: "font-bold mb-1 border-b border-secondary pb-1" }, title),
            h('p', { className: "text-text-secondary" }, content)
        )
    );
};

export default Tooltip;