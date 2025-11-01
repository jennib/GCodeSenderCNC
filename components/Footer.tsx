import React from 'react';

const Footer: React.FC = () => {
    const currentYear = new Date().getFullYear();
    return (
        <footer className="bg-surface text-text-secondary text-sm text-center p-4 mt-auto border-t border-secondary flex-shrink-0">
            <p>
                &copy; {currentYear} mycnc.app - A Web-Based G-Code Sender. 
                Contact: <a href="mailto:tutti.studios@gmail.com" className="ml-1 text-primary hover:underline font-semibold">
                    tutti.studios@gmail.com
                </a>
            </p>
        </footer>
    );
};

export default Footer;