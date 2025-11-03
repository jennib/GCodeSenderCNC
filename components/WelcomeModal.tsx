import React from 'react';
import { X, Settings, BookOpen, CheckCircle, ArrowRight } from './Icons';

interface WelcomeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onOpenSettings: () => void;
    onOpenToolLibrary: () => void;
    isMachineSetupComplete: boolean;
    isToolLibrarySetupComplete: boolean;
}

const SetupStep: React.FC<{ isComplete: boolean; title: string; description: string; onAction: () => void; actionText: string; }> = ({
    isComplete,
    title,
    description,
    onAction,
    actionText
}) => (
    <div className={`flex items-start p-4 rounded-lg ${isComplete ? 'bg-green-500/10' : 'bg-secondary/50'}`}>
        <div className="flex-shrink-0">
            {isComplete ? <CheckCircle className="w-6 h-6 text-accent-green" /> : <Settings className="w-6 h-6 text-text-secondary" />}
        </div>
        <div className="ml-4 flex-grow">
            <h4 className="font-bold text-text-primary">{title}</h4>
            <p className="text-sm text-text-secondary mt-1">{description}</p>
        </div>
        <div className="ml-4 flex-shrink-0 self-center">
            <button onClick={onAction} className="flex items-center gap-2 px-3 py-1 bg-primary text-white text-sm font-semibold rounded-md hover:bg-primary-focus">
                {actionText} <ArrowRight className="w-4 h-4" />
            </button>
        </div>
    </div>
);


const WelcomeModal: React.FC<WelcomeModalProps> = ({
    isOpen,
    onClose,
    onOpenSettings,
    onOpenToolLibrary,
    isMachineSetupComplete,
    isToolLibrarySetupComplete
}) => {
    if (!isOpen) {
        return null;
    }

    return (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center" onClick={onClose} aria-modal="true" role="dialog">
            <div className="bg-surface rounded-lg shadow-2xl w-full max-w-3xl border border-secondary transform transition-all" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-secondary flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-text-primary">Welcome to mycnc.app!</h2>
                    <button onClick={onClose} className="p-1 rounded-md text-text-secondary hover:text-text-primary hover:bg-secondary">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-8">
                    <p className="text-lg text-text-secondary mb-6">Let's get your machine set up. Here are a couple of recommended first steps to ensure everything runs smoothly.</p>

                    <div className="space-y-4">
                        <SetupStep
                            isComplete={isMachineSetupComplete}
                            title="Configure Machine Settings"
                            description="Define your machine's work area, spindle speed, and other core parameters."
                            onAction={onOpenSettings}
                            actionText="Open Settings"
                        />
                        <SetupStep
                            isComplete={isToolLibrarySetupComplete}
                            title="Create a Tool Library"
                            description="Add the tools you'll be using. This helps with G-code generation and analysis."
                            onAction={onOpenToolLibrary}
                            actionText="Open Library"
                        />
                    </div>
                </div>

                <div className="bg-background px-6 py-4 flex justify-end items-center rounded-b-lg">
                    <button onClick={onClose} className="px-6 py-2 bg-primary text-white font-bold rounded-md hover:bg-primary-focus">Get Started</button>
                </div>
            </div>
        </div>
    );
};

export default WelcomeModal;