import React, { useState, useEffect } from 'react';
import { Tool, MachineSettings } from '../types';
import { ToolSelector, Input, RadioGroup, SpindleAndFeedControls, ArrayControls } from './SharedControls';

interface GeneratorResult {
    gcode: string;
    paths: any[];
    bounds: any;
    error: string | null;
}
interface PocketGeneratorProps {
    onGenerate: (gcode: string, name: string) => void;
    onUpdate: (result: GeneratorResult) => void;
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

    const [arraySettings, setArraySettings] = useState({
        isEnabled: false,
        pattern: 'rect',
        rectCols: 3, rectRows: 2, rectSpacingX: 15, rectSpacingY: 15,
        circCopies: 6, circRadius: 40, circCenterX: 50, circCenterY: 50, circStartAngle: 0,
    });

    const handleParamChange = (field: keyof typeof params, value: string) => {
        const numValue = value === '' ? '' : parseFloat(value);
        if (isNaN(numValue as number)) return;
        setParams(p => ({ ...p, [field]: numValue }));
    };

    useEffect(() => {
        // G-code generation logic will be moved here.
        const toolIndex = toolLibrary.findIndex(t => t.id === params.toolId);
        if (toolIndex === -1) {
            onUpdate({ gcode: '', paths: [], bounds: {}, error: "Please select a tool." });
            return;
        };
        const selectedTool = toolLibrary[toolIndex];
        if (!selectedTool) {
            onUpdate({ gcode: '', paths: [], bounds: {}, error: "Please select a tool." });
            return;
        }
        const toolDiameter = selectedTool.diameter;

        const { shape, width, length, cornerRadius, diameter, depth, depthPerPass, stepover, feed, plungeFeed, spindle, safeZ } = params;
        if ([depth, depthPerPass, stepover, feed, plungeFeed, spindle, safeZ].some(p => p === '' || p === null)) {
            onUpdate({ gcode: '', paths: [], bounds: {}, error: "Please fill all required fields." });
            return;
        }
        
        const code = [
            `(--- Pocket Operation: ${shape} ---)`,
            `(Tool: ${selectedTool.name} - Ø${toolDiameter}${unit})`,
            `G21 G90`, `M3 S${spindle}`, `G0 Z${safeZ}`
        ];
        const paths = [];
        const toolRadius = toolDiameter / 2;
        const stepoverDist = toolDiameter * (stepover / 100);

        let currentDepth = 0;
        while (currentDepth > depth) {
            currentDepth = Math.max(depth, currentDepth - depthPerPass);
            code.push(`(--- Pass at Z=${currentDepth.toFixed(3)} ---)`);

            if (shape === 'rect') {
                const centerX = width / 2;
                const centerY = length / 2;
                code.push(`G0 X${centerX.toFixed(3)} Y${centerY.toFixed(3)}`);
                code.push(`G1 Z${currentDepth.toFixed(3)} F${plungeFeed}`);

                // Simplified raster clearing for now
                let y = toolRadius;
                while (y <= length - toolRadius) {
                    code.push(`G1 X${(width - toolRadius).toFixed(3)} Y${y.toFixed(3)} F${feed}`);
                    paths.push({ d: `M${toolRadius} ${y} L${width - toolRadius} ${y}`, stroke: 'var(--color-primary)' });
                    y += stepoverDist;
                    if (y <= length - toolRadius) {
                        code.push(`G1 X${toolRadius.toFixed(3)} Y${y.toFixed(3)} F${feed}`);
                        paths.push({ d: `M${width - toolRadius} ${y - stepoverDist} L${width - toolRadius} ${y}`, stroke: 'var(--color-text-secondary)' });
                    }
                }
            } else { // Circle
                const centerX = diameter / 2;
                const centerY = diameter / 2;
                const maxRadius = diameter / 2 - toolRadius;
                code.push(`G0 X${centerX.toFixed(3)} Y${centerY.toFixed(3)}`);
                code.push(`G1 Z${currentDepth.toFixed(3)} F${plungeFeed}`);
                
                let currentRadius = stepoverDist;
                while (currentRadius <= maxRadius) {
                    code.push(`G1 X${(centerX + currentRadius).toFixed(3)} Y${centerY.toFixed(3)} F${feed}`);
                    code.push(`G2 I${-currentRadius.toFixed(3)} J0`);
                    paths.push({ cx: centerX, cy: centerY, r: currentRadius, stroke: 'var(--color-primary)', fill: 'none', strokeWidth: '1%'});
                    currentRadius += stepoverDist;
                }
            }
        }
        
        code.push(`G0 Z${safeZ}`, `M5`, `G0 X0 Y0`);
        const bounds = shape === 'rect' ? { minX: 0, minY: 0, maxX: width, maxY: length } : { minX: 0, minY: 0, maxX: diameter, maxY: diameter };
        onUpdate({ gcode: code.join('\n'), paths, bounds, error: null });
    }, [params, arraySettings]);

    return (
        <div className='space-y-4'>
            <ToolSelector selectedId={params.toolId} onChange={(id) => setParams(p => ({ ...p, toolId: id }))} unit={unit} toolLibrary={toolLibrary} />
            <hr className='border-secondary' />
            <RadioGroup options={[{ value: 'rect', label: 'Rectangle' }, { value: 'circ', label: 'Circle' }]} selected={params.shape} onChange={val => setParams(p => ({...p, shape: val}))} />
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
            <ArrayControls settings={arraySettings} onChange={setArraySettings} unit={unit} />
        </div>
    );
};

export default PocketGenerator;