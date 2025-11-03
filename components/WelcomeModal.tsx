import React from 'react';
import { CheckCircle, Circle, Settings, Tool } from './Icons';

interface WelcomeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onOpenSettings: () => void;
    onTrySimulator: () => void;
    onOpenToolLibrary: () => void;
    isMachineSetupComplete: boolean;
    isToolLibrarySetupComplete: boolean;
}

const WelcomeModal: React.FC<WelcomeModalProps> = ({
    isOpen,
    onClose,
    onOpenSettings,
    onTrySimulator,
    onOpenToolLibrary,
    isMachineSetupComplete,
    isToolLibrarySetupComplete
}) => {
    if (!isOpen) return null;

    const allTasksComplete = isMachineSetupComplete && isToolLibrarySetupComplete;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50">
            <div className="bg-surface rounded-lg shadow-2xl p-8 max-w-lg w-full transform transition-all">
                <h2 className="text-2xl font-bold text-text-primary mb-4">Welcome to mycnc.app!</h2>
                <p className="text-text-secondary mb-6">This is a web-based G-code sender for GRBL-compatible CNC machines. It allows you to connect to your machine, load G-code files, and control your CNC right from a compatible browser (like Chrome or Edge).</p>

                <p className="text-text-secondary mb-6">
                    To get started, please complete the following setup steps. This ensures the application has the correct parameters for your specific machine.
                </p>

                <ul className="space-y-4 mb-8">
                    <li className="flex items-center">
                        {isMachineSetupComplete ? (
                            <CheckCircle className="w-6 h-6 text-accent-green mr-3" />
                        ) : (
                            <Circle className="w-6 h-6 text-text-secondary mr-3" />
                        )}
                        <div className="flex-grow">
                            <span className={`font-semibold ${isMachineSetupComplete ? 'line-through text-text-secondary' : 'text-text-primary'}`}>
                                Configure Machine Settings
                            </span>
                            <p className="text-sm text-text-secondary">Define your machine's work area and other properties.</p>
                        </div>
                        <button onClick={onOpenSettings} className="ml-4 px-4 py-2 text-sm font-medium bg-secondary text-text-primary rounded-md hover:bg-secondary-focus">
                            <Settings className="w-5 h-5 inline-block mr-2" />
                            Settings
                        </button>
                    </li>
                    <li className="flex items-center">
                        {isToolLibrarySetupComplete ? (
                            <CheckCircle className="w-6 h-6 text-accent-green mr-3" />
                        ) : (
                            <Circle className="w-6 h-6 text-text-secondary mr-3" />
                        )}
                        <div className="flex-grow">
                            <span className={`font-semibold ${isToolLibrarySetupComplete ? 'line-through text-text-secondary' : 'text-text-primary'}`}>
                                Add a Tool to the Library
                            </span>
                            <p className="text-sm text-text-secondary">Create at least one tool for use in G-code generation.</p>
                        </div>
                        <button onClick={onOpenToolLibrary} className="ml-4 px-4 py-2 text-sm font-medium bg-secondary text-text-primary rounded-md hover:bg-secondary-focus">
                            <Tool className="w-5 h-5 inline-block mr-2" />
                            Tools
                        </button>
                    </li>
                </ul>

                <div className="space-y-4">
                    <button
                        onClick={onClose}
                        disabled={!allTasksComplete}
                        className="w-full px-6 py-3 bg-primary text-white font-bold rounded-md hover:bg-primary-focus focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors"
                    >
                        Get Started
                    </button>
                    <p className="text-center text-sm text-text-secondary">or</p>
                    <button
                        onClick={onTrySimulator}
                        className="w-full px-6 py-2 bg-secondary text-text-primary font-semibold rounded-md hover:bg-secondary-focus focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface transition-colors"
                    >
                        Try with Simulator
                    </button>
                </div>
            </div>
        </div>
    );
};

export default WelcomeModal;