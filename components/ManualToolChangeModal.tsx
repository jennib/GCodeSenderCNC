import React from 'react';
import { Play, Square, AlertTriangle } from './Icons';

interface ManualToolChangeModalProps {
    isOpen: boolean;
    onContinue: () => void;
    onStop: () => void;
    toolInfo: {
        toolNumber: number | null;
    };
}

const ManualToolChangeModal: React.FC<ManualToolChangeModalProps> = ({ isOpen, onContinue, onStop, toolInfo }) => {
    if (!isOpen) {
        return null;
    }

    return (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center" aria-modal="true" role="dialog">
            <div className="bg-surface rounded-lg shadow-2xl w-full max-w-md border border-secondary transform transition-all">
                <div className="p-6 border-b border-secondary">
                    <h2 className="text-2xl font-bold text-text-primary flex items-center gap-3">
                        <AlertTriangle className="w-8 h-8 text-accent-yellow" />
                        Manual Tool Change Required
                    </h2>
                </div>
                <div className="p-6 text-center space-y-4">
                    <p className="text-lg text-text-secondary">Please change to tool:</p>
                    <div className="bg-background py-4 px-6 rounded-md">
                        <span className="text-5xl font-mono font-bold text-primary">T{toolInfo.toolNumber}</span>
                    </div>
                    <p className="text-text-secondary">Ensure the new tool is properly secured and your Z-axis zero is set correctly for it.</p>
                </div>
                <div className="bg-background px-6 py-4 flex justify-between items-center rounded-b-lg">
                    <button
                        onClick={onStop}
                        className="px-6 py-2 bg-accent-red text-white font-bold rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 flex items-center gap-2"
                    >
                        <Square className="w-5 h-5" />
                        Stop Job
                    </button>
                    <button
                        onClick={onContinue}
                        className="px-6 py-2 bg-accent-green text-white font-bold rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 flex items-center gap-2"
                    >
                        <Play className="w-5 h-5" />
                        Continue Job
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ManualToolChangeModal;
