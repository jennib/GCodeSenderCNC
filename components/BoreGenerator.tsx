import React, { useState, useEffect } from 'react';
import { Tool, MachineSettings } from '../types';
import { ToolSelector, Input, SpindleAndFeedControls, ArrayControls } from './SharedControls';

interface BoreGeneratorProps {
    onGenerate: (gcode: string, name: string) => void;
    toolLibrary: Tool[];
    unit: 'mm' | 'in';
    settings: MachineSettings;
}

const BoreGenerator: React.FC<BoreGeneratorProps> = ({ onGenerate, toolLibrary, unit, settings }) => {
    const [params, setParams] = useState({
        centerX: 50,
        centerY: 50,
        holeDiameter: 20,
        holeDepth: -15,
        counterboreEnabled: true,
        cbDiameter: 30,
        cbDepth: -5,
        depthPerPass: 2,
        feed: 400,
        plungeFeed: 150,
        spindle: settings.spindle.max || 8000,
        safeZ: 5,
        toolId: null as number | null,
    });

    const handleParamChange = (field: keyof typeof params, value: string) => {
        const numValue = value === '' ? '' : parseFloat(value);
        if (isNaN(numValue as number)) return;
        setParams(p => ({ ...p, [field]: numValue }));
    };

    return (
        <div className='space-y-4'>
            <ToolSelector selectedId={params.toolId} onChange={(id) => setParams(p => ({ ...p, toolId: id }))} unit={unit} toolLibrary={toolLibrary} />
            <hr className='border-secondary' />
            <Input label='Center Point (X, Y)' valueX={params.centerX} valueY={params.centerY} onChangeX={e => handleParamChange('centerX', e.target.value)} onChangeY={e => handleParamChange('centerY', e.target.value)} isXY={true} unit={unit} />
            <div className='grid grid-cols-2 gap-4'>
                 <Input label={`Hole Diameter`} value={params.holeDiameter} onChange={e => handleParamChange('holeDiameter', e.target.value)} unit={unit} />
                 <Input label={`Hole Depth`} value={params.holeDepth} onChange={e => handleParamChange('holeDepth', e.target.value)} unit={unit} help='Negative value' />
            </div>
             <hr className='border-secondary' />
            <label className='flex items-center gap-2 cursor-pointer font-semibold'>
                <input type='checkbox' checked={params.counterboreEnabled} onChange={e => setParams(p => ({ ...p, counterboreEnabled: e.target.checked }))} className='h-4 w-4 rounded border-secondary text-primary' />
                Add Counterbore
            </label>
            {params.counterboreEnabled && <div className='grid grid-cols-2 gap-4 pl-6'>
                 <Input label={`CB Diameter`} value={params.cbDiameter} onChange={e => handleParamChange('cbDiameter', e.target.value)} unit={unit} />
                 <Input label={`CB Depth`} value={params.cbDepth} onChange={e => handleParamChange('cbDepth', e.target.value)} unit={unit} help='Negative value' />
            </div>}
            <SpindleAndFeedControls params={params} onParamChange={(field, value) => handleParamChange(field as any, value)} plunge={true} unit={unit} />
        </div>
    );
};

export default BoreGenerator;