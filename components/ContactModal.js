import React, { useState } from 'react';
import { X, Send } from './Icons.js';

const h = React.createElement;

const ContactModal = ({ isOpen, onClose }) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    if (!isOpen) {
        return null;
    }

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!name || !email || !message) {
            setError('All fields are required.');
            return;
        }
        if (!/\S+@\S+\.\S+/.test(email)) {
            setError('Please enter a valid email address.');
            return;
        }
        setError('');

        const subject = encodeURIComponent("Contact from CNC Sender App");
        const body = encodeURIComponent(
`Name: ${name}
Email: ${email}

Message:
${message}`
        );

        window.location.href = `mailto:tutti.studios@gmail.com?subject=${subject}&body=${body}`;
        onClose();
    };

    return h('div', {
        className: "fixed inset-0 bg-background/80 backdrop-blur-sm z-40 flex items-center justify-center",
        onClick: onClose,
        'aria-modal': "true",
        role: "dialog"
    },
        h('div', {
            className: "bg-surface rounded-lg shadow-2xl w-full max-w-lg border border-secondary transform transition-all",
            onClick: e => e.stopPropagation()
        },
            h('div', { className: "p-6 border-b border-secondary flex justify-between items-center" },
                h('h2', { className: "text-2xl font-bold text-text-primary" }, "Contact Us"),
                h('button', {
                    onClick: onClose,
                    className: "p-1 rounded-md text-text-secondary hover:text-text-primary hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-primary",
                    'aria-label': "Close contact form"
                }, h(X, { className: "w-6 h-6" }))
            ),
            h('form', { onSubmit: handleSubmit },
                h('div', { className: "p-6 space-y-4" },
                    error && h('div', { className: "bg-accent-red/20 text-accent-red p-3 rounded-md text-sm font-semibold" }, error),
                    h('div', null,
                        h('label', { htmlFor: "contact-name", className: "block text-sm font-medium text-text-secondary mb-1" }, "Your Name"),
                        h('input', {
                            id: "contact-name",
                            type: "text",
                            value: name,
                            onChange: e => setName(e.target.value),
                            required: true,
                            className: "w-full bg-background border border-secondary rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                        })
                    ),
                    h('div', null,
                        h('label', { htmlFor: "contact-email", className: "block text-sm font-medium text-text-secondary mb-1" }, "Your Email"),
                        h('input', {
                            id: "contact-email",
                            type: "email",
                            value: email,
                            onChange: e => setEmail(e.target.value),
                            required: true,
                            className: "w-full bg-background border border-secondary rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                        })
                    ),
                    h('div', null,
                        h('label', { htmlFor: "contact-message", className: "block text-sm font-medium text-text-secondary mb-1" }, "Message"),
                        h('textarea', {
                            id: "contact-message",
                            value: message,
                            onChange: e => setMessage(e.target.value),
                            required: true,
                            rows: 5,
                            className: "w-full bg-background border border-secondary rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                        })
                    ),
                    h('p', { className: "text-xs text-text-secondary" }, "This will open your default email client to send the message.")
                ),
                h('div', { className: "bg-background px-6 py-4 flex justify-end items-center gap-4 rounded-b-lg" },
                    h('button', {
                        type: "button",
                        onClick: onClose,
                        className: "px-4 py-2 bg-secondary text-white font-semibold rounded-md hover:bg-secondary-focus"
                    }, "Cancel"),
                    h('button', {
                        type: "submit",
                        className: "px-6 py-2 bg-primary text-white font-bold rounded-md hover:bg-primary-focus flex items-center gap-2"
                    }, h(Send, { className: "w-5 h-5" }), "Send Message")
                )
            )
        )
    );
};

export default ContactModal;
