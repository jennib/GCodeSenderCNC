import React, { useState, useEffect } from 'react';
import { Tool, MachineSettings } from '../types';
import { ToolSelector, Input, RadioGroup, SpindleAndFeedControls } from './SharedControls';

interface SurfacingGeneratorProps {
    onUpdate: (params: any) => void;
    toolLibrary: Tool[];
    unit: 'mm' | 'in';
    settings: MachineSettings;
}

const SurfacingGenerator: React.FC<SurfacingGeneratorProps> = ({ onUpdate, toolLibrary, unit, settings }) => {
    const [params, setParams] = useState({
        width: 100,
        length: 100,
        depth: -1,
        stepover: 40,
        feed: 800,
        spindle: settings.spindle.max || 8000,
        safeZ: 5,
        startX: 0,
        startY: 0,
        toolId: null as number | null,
        direction: 'horizontal',
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
            <div className='grid grid-cols-2 gap-4'>
                <Input label={`Width (X)`} value={params.width} onChange={e => handleParamChange('width', e.target.value)} unit={unit} />
                <Input label={`Length (Y)`} value={params.length} onChange={e => handleParamChange('length', e.target.value)} unit={unit} />
            </div>
            <RadioGroup label='Milling Direction' options={[{ value: 'horizontal', label: 'Horizontal (X)' }, { value: 'vertical', label: 'Vertical (Y)' }]} selected={params.direction} onChange={val => { const newParams = { ...params, direction: val }; setParams(newParams); onUpdate(newParams); }} />
            <Input label='Final Depth' value={params.depth} onChange={e => handleParamChange('depth', e.target.value)} unit={unit} help='Should be negative' />
            <Input label='Stepover' value={params.stepover} onChange={e => handleParamChange('stepover', e.target.value)} unit='%' />
            <SpindleAndFeedControls params={params} onParamChange={(field, value) => handleParamChange(field as any, value)} unit={unit} />
        </div>
    );
};

export default SurfacingGenerator;