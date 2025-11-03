
import React from 'react';
import { CheckCircle, X } from './Icons';

const h = React.createElement;

const NotificationItem = ({ notification, onDismiss }) => {
    const { id, message, type } = notification;

    const getStyles = () => {
        switch (type) {
            case 'success':
                return {
                    icon: h(CheckCircle, { className: "w-6 h-6 text-accent-green" }),
                    bg: 'bg-accent-green/20',
                    border: 'border-accent-green',
                };
            // Can add other types like 'error' later
            default:
                return {
                    icon: null,
                    bg: 'bg-secondary',
                    border: 'border-secondary',
                };
        }
    };

    const styles = getStyles();

    return h('div', {
        className: `max-w-sm w-full bg-surface shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden border-l-4 ${styles.border} mb-4`
    },
        h('div', { className: "p-4" },
            h('div', { className: "flex items-start" },
                h('div', { className: "flex-shrink-0" }, styles.icon),
                h('div', { className: "ml-3 w-0 flex-1 pt-0.5" },
                    h('p', { className: "text-sm font-medium text-text-primary" }, message)
                ),
                h('div', { className: "ml-4 flex-shrink-0 flex" },
                    h('button', {
                        onClick: () => onDismiss(id),
                        className: "rounded-md inline-flex text-text-secondary hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                    },
                        h('span', { className: "sr-only" }, "Close"),
                        h(X, { className: "h-5 w-5" })
                    )
                )
            )
        )
    );
};

export const NotificationContainer = ({ notifications, onDismiss }) => {
    return h('div', {
        'aria-live': "assertive",
        className: "fixed inset-0 flex items-end px-4 py-6 pointer-events-none sm:p-6 sm:items-start z-50"
    },
        h('div', { className: "w-full flex flex-col items-center space-y-4 sm:items-end" },
            notifications.map(notification =>
                h(NotificationItem, {
                    key: notification.id,
                    notification: notification,
                    onDismiss: onDismiss
                })
            )
        )
    );
};
