import React, { useState } from 'react';
import { Tool, MachineSettings } from '../types';
import { ToolSelector, Input, RadioGroup, SpindleAndFeedControls } from './SharedControls';

interface SlotGeneratorProps {
    onUpdate: (params: any) => void;
    toolLibrary: Tool[];
    unit: 'mm' | 'in';
    settings: MachineSettings;
}

const SlotGenerator: React.FC<SlotGeneratorProps> = ({ onUpdate, toolLibrary, unit, settings }) => {
    const [params, setParams] = useState({
        type: 'straight',
        slotWidth: 6, depth: -5, depthPerPass: 2,
        feed: 400, spindle: settings.spindle.max || 8000, safeZ: 5,
        startX: 10, startY: 10, endX: 90, endY: 20,
        centerX: 50, centerY: 50, radius: 40, startAngle: 45, endAngle: 135,
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
            <RadioGroup options={[{ value: 'straight', label: 'Straight' }, { value: 'arc', label: 'Arc' }]} selected={params.type} onChange={val => { const newParams = { ...params, type: val }; setParams(newParams); onUpdate(newParams); }} />
            {params.type === 'straight' ? <>
                <Input label='Start Point (X, Y)' valueX={params.startX} valueY={params.startY} onChangeX={e => handleParamChange('startX', e.target.value)} onChangeY={e => handleParamChange('startY', e.target.value)} isXY unit={unit} />
                <Input label='End Point (X, Y)' valueX={params.endX} valueY={params.endY} onChangeX={e => handleParamChange('endX', e.target.value)} onChangeY={e => handleParamChange('endY', e.target.value)} isXY unit={unit} />
            </> : <>
                <Input label='Center Point (X, Y)' valueX={params.centerX} valueY={params.centerY} onChangeX={e => handleParamChange('centerX', e.target.value)} onChangeY={e => handleParamChange('centerY', e.target.value)} isXY unit={unit} />
                <Input label='Radius' value={params.radius} onChange={e => handleParamChange('radius', e.target.value)} unit={unit} />
                <Input label='Start, End Angle' valueX={params.startAngle} valueY={params.endAngle} onChangeX={e => handleParamChange('startAngle', e.target.value)} onChangeY={e => handleParamChange('endAngle', e.target.value)} isXY unit='°' />
            </>}
            <hr className='border-secondary' />
            <Input label='Slot Width' value={params.slotWidth} onChange={e => handleParamChange('slotWidth', e.target.value)} unit={unit} />
            <div className='grid grid-cols-2 gap-4'>
                <Input label='Total Depth' value={params.depth} onChange={e => handleParamChange('depth', e.target.value)} unit={unit} help='Negative value' />
                <Input label='Depth per Pass' value={params.depthPerPass} onChange={e => handleParamChange('depthPerPass', e.target.value)} unit={unit} />
            </div>
            <SpindleAndFeedControls params={params} onParamChange={(field, value) => handleParamChange(field as any, value)} unit={unit} />
        </div>
    );
};

export default SlotGenerator;