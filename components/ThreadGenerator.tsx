import React, { useState } from 'react';
import { Tool, MachineSettings } from '../types';
import { ToolSelector, Input, RadioGroup, SpindleAndFeedControls } from './SharedControls';

interface ThreadGeneratorProps {
    onUpdate: (params: any) => void;
    toolLibrary: Tool[];
    unit: 'mm' | 'in';
    settings: MachineSettings;
}

const ThreadGenerator: React.FC<ThreadGeneratorProps> = ({ onUpdate, toolLibrary, unit, settings }) => {
    const [params, setParams] = useState({
        type: 'internal',
        hand: 'right',
        diameter: 6,
        pitch: 1,
        depth: 10,
        feed: 200,
        spindle: settings.spindle.max || 10000,
        safeZ: 5,
        toolId: null as number | null,
    });

    const handleParamChange = (field: keyof typeof params, value: string) => {
        const numValue = value === '' ? '' : parseFloat(value);
        if (isNaN(numValue as number)) return;
        const newParams = { ...params, [field]: numValue };
        setParams(newParams);
        onUpdate(newParams);
    };

    return (
        <div className='space-y-4'>
            <ToolSelector selectedId={params.toolId} onChange={(id) => { const newParams = { ...params, toolId: id }; setParams(newParams); onUpdate(newParams); }} unit={unit} toolLibrary={toolLibrary} />
            <hr className='border-secondary' />
            <RadioGroup label='Type' options={[{ value: 'internal', label: 'Internal' }, { value: 'external', label: 'External' }]} selected={params.type} onChange={val => { const newParams = { ...params, type: val }; setParams(newParams); onUpdate(newParams); }} />
            <RadioGroup label='Hand' options={[{ value: 'right', label: 'Right-Hand' }, { value: 'left', label: 'Left-Hand' }]} selected={params.hand} onChange={val => { const newParams = { ...params, hand: val }; setParams(newParams); onUpdate(newParams); }} />
            <hr className='border-secondary' />
            <div className='grid grid-cols-2 gap-4'>
                <Input label='Thread Diameter' value={params.diameter} onChange={e => handleParamChange('diameter', e.target.value)} unit={unit} help='Major diameter' />
                <Input label='Pitch' value={params.pitch} onChange={e => handleParamChange('pitch', e.target.value)} unit={unit} help='Distance between threads' />
            </div>
            <Input label='Thread Depth' value={params.depth} onChange={e => handleParamChange('depth', e.target.value)} unit={unit} help='Length of thread' />
            <SpindleAndFeedControls params={params} onParamChange={(field, value) => handleParamChange(field as any, value)} unit={unit} />
        </div>
    );
};

export default ThreadGenerator;