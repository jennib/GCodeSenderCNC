import React from 'react';

interface FooterProps {
    onOpenContact: () => void;
}

const Footer: React.FC<FooterProps> = ({ onOpenContact }) => {
    const currentYear = new Date().getFullYear();
    return (
        <footer className="bg-surface text-text-secondary text-sm text-center p-4 mt-auto border-t border-secondary flex-shrink-0">
            <p>
                &copy; {currentYear} mycnc.app - A Web-Based G-Code Sender. 
                <button onClick={onOpenContact} className="ml-2 text-primary hover:underline font-semibold">
                    Contact Us
                </button>
            </p>
        </footer>
    );
};

export default Footer;
