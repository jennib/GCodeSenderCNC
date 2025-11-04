import React, { useState, useEffect } from 'react';
import { Tool, MachineSettings } from '../types';
import { ToolSelector, Input, RadioGroup, SpindleAndFeedControls } from './SharedControls';

interface PocketGeneratorProps {
    onUpdate: (params: any) => void;
    toolLibrary: Tool[];
    unit: 'mm' | 'in';
    settings: MachineSettings;
}

const PocketGenerator: React.FC<PocketGeneratorProps> = ({ onUpdate, toolLibrary, unit, settings }) => {
    const [params, setParams] = useState({
        shape: 'rect',
        width: 80,
        length: 50,
        cornerRadius: 5,
        diameter: 60,
        depth: -10,
        depthPerPass: 2,
        stepover: 40,
        feed: 500,
        plungeFeed: 150,
        spindle: settings.spindle.max || 8000,
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
            <RadioGroup options={[{ value: 'rect', label: 'Rectangle' }, { value: 'circ', label: 'Circle' }]} selected={params.shape} onChange={val => { const newParams = { ...params, shape: val }; setParams(newParams); onUpdate(newParams); }} />
            {params.shape === 'rect' ? <>
                <Input label='Width (X), Length (Y)' valueX={params.width} valueY={params.length} onChangeX={e => handleParamChange('width', e.target.value)} onChangeY={e => handleParamChange('length', e.target.value)} isXY={true} unit={unit} />
                <Input label='Corner Radius' value={params.cornerRadius} onChange={e => handleParamChange('cornerRadius', e.target.value)} unit={unit} />
            </> : <>
                <Input label='Diameter' value={params.diameter} onChange={e => handleParamChange('diameter', e.target.value)} unit={unit} />
            </>}
            <hr className='border-secondary' />
            <div className='grid grid-cols-2 gap-4'>
                <Input label='Total Depth' value={params.depth} onChange={e => handleParamChange('depth', e.target.value)} unit={unit} help='Negative value' />
                <Input label='Depth per Pass' value={params.depthPerPass} onChange={e => handleParamChange('depthPerPass', e.target.value)} unit={unit} />
            </div>
            <Input label='Stepover' value={params.stepover} onChange={e => handleParamChange('stepover', e.target.value)} unit='%' />
            <SpindleAndFeedControls params={params} onParamChange={(field, value) => handleParamChange(field as any, value)} plunge={true} unit={unit} />
        </div>
    );
};

export default PocketGenerator;