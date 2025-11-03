
import React, { useState } from 'react';

const Tooltip = ({ children, content, title }) => {
    const [visible, setVisible] = useState(false);

    const show = () => setVisible(true);
    const hide = () => setVisible(false);

    return (
        <span className="relative inline-block" onMouseEnter={show} onMouseLeave={hide}>
            {children}
            {visible && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-xs bg-background border border-secondary text-text-primary text-sm rounded-md shadow-lg z-20 p-3">
                    {title && <h4 className="font-bold mb-1 border-b border-secondary pb-1">{title}</h4>}
                    <p className="text-text-secondary">{content}</p>
                </div>
            )}
        </span>
    );
};

export default Tooltip;
