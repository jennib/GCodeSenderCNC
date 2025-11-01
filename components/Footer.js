import React from 'react';

const h = React.createElement;

const Footer = ({ onContactClick }) => {
    const currentYear = new Date().getFullYear();
    return h('footer', { className: "bg-surface text-text-secondary text-sm text-center p-4 mt-auto border-t border-secondary flex-shrink-0" },
        h('p', null,
            `© ${currentYear} mycnc.app - A Web-Based G-Code Sender. `,
            h('button', { onClick: onContactClick, className: "ml-1 text-primary hover:underline font-semibold" },
                "Contact Us"
            )
        )
    );
};

export default Footer;
