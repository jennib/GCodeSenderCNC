
import React from 'react';
import { CheckCircle, X } from './Icons';

interface Notification {
    id: number;
    message: string;
    type: 'success' | 'error' | 'info';
    timerId?: number;
}

interface NotificationItemProps {
    notification: Notification;
    onDismiss: (id: number) => void;
}
const NotificationItem: React.FC<NotificationItemProps> = ({ notification, onDismiss }) => {
    const { id, message, type } = notification;

    const getStyles = () => {
        switch (type) {
            case 'success':
                return {
                    icon: <CheckCircle className="w-6 h-6 text-accent-green" />,
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

    return (
        <div className={`max-w-sm w-full bg-surface shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden border-l-4 ${styles.border} mb-4`}>
            <div className="p-4">
                <div className="flex items-start">
                    <div className="flex-shrink-0">{styles.icon}</div>
                    <div className="ml-3 w-0 flex-1 pt-0.5">
                        <p className="text-sm font-medium text-text-primary">{message}</p>
                    </div>
                    <div className="ml-4 flex-shrink-0 flex">
                        <button
                            onClick={() => onDismiss(id)}
                            className="rounded-md inline-flex text-text-secondary hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                        >
                            <span className="sr-only">Close</span>
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

interface NotificationContainerProps {
    notifications: Notification[];
    onDismiss: (id: number) => void;
}

export const NotificationContainer: React.FC<NotificationContainerProps> = ({ notifications, onDismiss }) => {
    return (
        <div
            aria-live="assertive"
            className="fixed inset-0 flex items-end px-4 py-6 pointer-events-none sm:p-6 sm:items-start z-50"
        >
            <div className="w-full flex flex-col items-center space-y-4 sm:items-end">
                {notifications.map(notification => (
                    <NotificationItem key={notification.id} notification={notification} onDismiss={onDismiss} />
                ))}
            </div>
        </div>
    );
};
