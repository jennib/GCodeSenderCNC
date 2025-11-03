import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertTriangle, X } from './Icons';
import { TimeEstimate, Tool } from '../types';

interface PreflightChecklistModalProps {
    isOpen: boolean;
    onCancel: () => void;
    onConfirm: (options: { isDryRun: boolean }) => void;
    jobInfo: {
        fileName: string;
        gcodeLines: string[];
        timeEstimate: TimeEstimate;
        startLine: number;
    };
    isHomed: boolean;
    warnings: { type: string; message: string; line?: number }[];
    selectedTool: Tool | null;
}

const PreflightChecklistModal: React.FC<PreflightChecklistModalProps> = ({
    isOpen,
    onCancel,
    onConfirm,
    jobInfo,
    isHomed,
    warnings,
    selectedTool,
}) => {
    const [isDryRun, setIsDryRun] = useState(false);
    const [skipPreflight, setSkipPreflight] = useState(() => {
        try {
            return localStorage.getItem('cnc-app-skip-preflight') === 'true';
        } catch {
            return false;
        }
    });

    useEffect(() => {
        if (isOpen && skipPreflight && warnings.length === 0) {
            onConfirm({ isDryRun: false });
        }
    }, [isOpen, skipPreflight, warnings, onConfirm]);

    const handleConfirm = () => {
        if (skipPreflight) {
            try {
                localStorage.setItem('cnc-app-skip-preflight', 'true');
            } catch (error) {
                console.error("Could not save preflight preference:", error);
            }
        }
        onConfirm({ isDryRun });
    };

    if (!isOpen || (skipPreflight && warnings.length === 0)) {
        return null;
    }

    const formatTime = (totalSeconds: number) => {
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = Math.round(totalSeconds % 60);
        let timeString = '';
        if (hours > 0) timeString += `${hours}h `;
        if (minutes > 0) timeString += `${minutes}m `;
        if (seconds > 0 || (hours === 0 && minutes === 0)) timeString += `${seconds}s`;
        return timeString.trim();
    };

    const ChecklistItem: React.FC<{ isMet: boolean; text: React.ReactNode; subtext?: string }> = ({ isMet, text, subtext }) => (
        <div className="flex items-start">
            <div className="flex-shrink-0 mt-1">
                {isMet ? <CheckCircle className="w-5 h-5 text-accent-green" /> : <AlertTriangle className="w-5 h-5 text-accent-yellow" />}
            </div>
            <div className="ml-3">
                <p className={`font-semibold ${isMet ? 'text-text-primary' : 'text-accent-yellow'}`}>{text}</p>
                {subtext && <p className="text-xs text-text-secondary">{subtext}</p>}
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 flex items-center justify-center" onClick={onCancel} aria-modal="true" role="dialog">
            <div className="bg-surface rounded-lg shadow-2xl w-full max-w-2xl border border-secondary transform transition-all" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-secondary flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-text-primary">Pre-flight Checklist</h2>
                    <button onClick={onCancel} className="p-1 rounded-md text-text-secondary hover:text-text-primary hover:bg-secondary">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    <div className="bg-background p-4 rounded-md">
                        <h3 className="font-bold text-lg mb-2 truncate" title={jobInfo.fileName}>{jobInfo.fileName}</h3>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                            <div><span className="font-semibold">Lines:</span> {jobInfo.gcodeLines.length}</div>
                            <div><span className="font-semibold">Start at:</span> Line {jobInfo.startLine + 1}</div>
                            <div><span className="font-semibold">Est. Time:</span> {formatTime(jobInfo.timeEstimate.totalSeconds)}</div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <h3 className="font-bold text-text-secondary">System Checks</h3>
                            <ChecklistItem isMet={isHomed} text="Machine is Homed" subtext="Ensures machine knows its position." />
                            <ChecklistItem isMet={!!selectedTool} text="Tool Selected" subtext={selectedTool ? `Using: ${selectedTool.name} (Ø${selectedTool.diameter}mm)` : "No tool selected from library."} />
                            <ChecklistItem isMet={warnings.length === 0} text="G-Code Analysis" subtext={warnings.length > 0 ? `${warnings.length} potential issue(s) found.` : "No obvious issues found."} />
                        </div>
                        <div className="space-y-4">
                            <h3 className="font-bold text-text-secondary">Operator Checks</h3>
                            <ChecklistItem isMet={false} text="Workpiece is Secure" />
                            <ChecklistItem isMet={false} text="Work Zero is Set (WCS)" />
                            <ChecklistItem isMet={false} text="Correct Tool is in Spindle" />
                            <ChecklistItem isMet={false} text="Area is Clear & Safe" />
                        </div>
                    </div>

                    {warnings.length > 0 && (
                        <div className="bg-accent-yellow/10 border-l-4 border-accent-yellow p-4 rounded-r-md max-h-32 overflow-y-auto">
                            <h4 className="font-bold text-accent-yellow mb-2">G-Code Warnings</h4>
                            <ul className="text-sm text-accent-yellow list-disc list-inside">
                                {warnings.map((w, i) => <li key={i}>{w.line && `L${w.line}: `}{w.message}</li>)}
                            </ul>
                        </div>
                    )}
                </div>

                <div className="bg-background px-6 py-4 flex justify-between items-center rounded-b-lg">
                    <div className="flex items-center">
                        <input id="dry-run" type="checkbox" checked={isDryRun} onChange={e => setIsDryRun(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" />
                        <label htmlFor="dry-run" className="ml-2 block text-sm text-text-primary">Perform Dry Run (no spindle/laser)</label>
                    </div>
                    <div className="flex items-center gap-4">
                        <button onClick={onCancel} className="px-4 py-2 bg-secondary text-white font-semibold rounded-md hover:bg-secondary-focus">Cancel</button>
                        <button onClick={handleConfirm} className="px-6 py-2 bg-primary text-white font-bold rounded-md hover:bg-primary-focus flex items-center gap-2">
                            {isDryRun ? 'Start Dry Run' : 'Start Job'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PreflightChecklistModal;