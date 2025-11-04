import React, { useState } from 'react';
import { Tool, MachineSettings } from '../types';
import { ToolSelector, Input, RadioGroup, SpindleAndFeedControls } from './SharedControls';
import { FONTS } from '../services/cncFonts.js';

interface TextGeneratorProps {
    onUpdate: (params: any) => void;
    toolLibrary: Tool[];
    unit: 'mm' | 'in';
    settings: MachineSettings;
}

const TextGenerator: React.FC<TextGeneratorProps> = ({ onUpdate, toolLibrary, unit, settings }) => {
    const [params, setParams] = useState({
        text: 'HELLO',
        font: 'Sans-serif Stick',
        height: 10,
        spacing: 2,
        startX: 10,
        startY: 10,
        alignment: 'left',
        depth: -0.5,
        feed: 300,
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
            <div>
                <label className='block text-sm font-medium text-text-secondary mb-1'>Font</label>
                <select value={params.font} onChange={e => { const newParams = { ...params, font: e.target.value }; setParams(newParams); onUpdate(newParams); }} className='w-full bg-background border-secondary rounded-md py-1 px-2 focus:outline-none focus:ring-1 focus:ring-primary'>{Object.keys(FONTS).map(name => <option key={name} value={name}>{name}</option>)}</select>
            </div>
            <div>
                <label className='block text-sm font-medium text-text-secondary mb-1'>Text Content</label>
                <textarea value={params.text} onChange={e => { const newParams = { ...params, text: e.target.value }; setParams(newParams); onUpdate(newParams); }} rows={2} className='w-full bg-background border-secondary rounded-md py-1 px-2 focus:outline-none focus:ring-1 focus:ring-primary font-mono uppercase' />
            </div>
            <div className='grid grid-cols-2 gap-4'>
                <Input label='Char Height' value={params.height} onChange={e => handleParamChange('height', e.target.value)} unit={unit} />
                <Input label='Char Spacing' value={params.spacing} onChange={e => handleParamChange('spacing', e.target.value)} unit={unit} />
            </div>
            <RadioGroup label='Alignment' options={[{ value: 'left', label: 'Left' }, { value: 'center', label: 'Center' }, { value: 'right', label: 'Right' }]} selected={params.alignment} onChange={val => { const newParams = { ...params, alignment: val }; setParams(newParams); onUpdate(newParams); }} />
            <Input label='Start Point (X, Y)' valueX={params.startX} valueY={params.startY} onChangeX={e => handleParamChange('startX', e.target.value)} onChangeY={e => handleParamChange('startY', e.target.value)} isXY unit={unit} help='Alignment reference point' />
            <hr className='border-secondary' />
            <Input label='Engraving Depth' value={params.depth} onChange={e => handleParamChange('depth', e.target.value)} unit={unit} help='Negative value' />
            <SpindleAndFeedControls params={params} onParamChange={(field, value) => handleParamChange(field as any, value)} unit={unit} />
        </div>
    );
};

export default TextGenerator;