import React, { useState } from 'react';
import { Tool, MachineSettings } from '../types';
import { ToolSelector, Input, RadioGroup, SpindleAndFeedControls, ArrayControls } from './SharedControls';

interface ProfileGeneratorProps {
    onUpdate: (params: any) => void;
    toolLibrary: Tool[];
    unit: 'mm' | 'in';
    settings: MachineSettings;
}

const ProfileGenerator: React.FC<ProfileGeneratorProps> = ({ onUpdate, toolLibrary, unit, settings }) => {
    const [params, setParams] = useState({
        shape: 'rect',
        width: 80, length: 50, cornerRadius: 10, diameter: 60,
        depth: -12, depthPerPass: 3, cutSide: 'outside',
        tabsEnabled: true, numTabs: 4, tabWidth: 6, tabHeight: 2,
        feed: 600, spindle: settings.spindle.max || 9000, safeZ: 5,
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
                <Input label='Width (X), Length (Y)' valueX={params.width} valueY={params.length} onChangeX={e => handleParamChange('width', e.target.value)} onChangeY={e => handleParamChange('length', e.target.value)} isXY unit={unit} />
                <Input label='Corner Radius' value={params.cornerRadius} onChange={e => handleParamChange('cornerRadius', e.target.value)} unit={unit} />
            </> : <>
                <Input label='Diameter' value={params.diameter} onChange={e => handleParamChange('diameter', e.target.value)} unit={unit} />
            </>}
            <hr className='border-secondary' />
            <RadioGroup label='Cut Side' options={[{ value: 'outside', label: 'Outside' }, { value: 'inside', label: 'Inside' }, { value: 'online', label: 'On-line' }]} selected={params.cutSide} onChange={val => { const newParams = { ...params, cutSide: val }; setParams(newParams); onUpdate(newParams); }} />
            <div className='grid grid-cols-2 gap-4'>
                <Input label='Total Depth' value={params.depth} onChange={e => handleParamChange('depth', e.target.value)} unit={unit} help='Negative value' />
                <Input label='Depth per Pass' value={params.depthPerPass} onChange={e => handleParamChange('depthPerPass', e.target.value)} unit={unit} />
            </div>
            <SpindleAndFeedControls params={params} onParamChange={(field, value) => handleParamChange(field as any, value)} unit={unit} />
        </div>
    );
};

export default ProfileGenerator;