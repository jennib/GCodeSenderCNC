import React from 'react';

const Footer = ({ onContactClick }) => {
    const currentYear = new Date().getFullYear();
    return (
        <footer className="bg-surface text-text-secondary text-sm text-center p-4 mt-auto border-t border-secondary flex-shrink-0">
            <p>
                {`© ${currentYear} mycnc.app - A Web-Based G-Code Sender. `}
                <button onClick={onContactClick} className="ml-1 text-primary hover:underline font-semibold">Contact Us</button>
            </p>
        </footer>
    );
};

export default Footer;
