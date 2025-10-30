
import React, { useState, useEffect, useCallback } from 'react';
import { X, Save, Zap } from './Icons.js';

const h = React.createElement;

const GCodeGeneratorModal = ({ isOpen, onCancel, onLoadGCode, unit, settings }) => {
    const [activeTab, setActiveTab] = useState('surfacing');
    const [generatedGCode, setGeneratedGCode] = useState('');
    const [previewPaths, setPreviewPaths] = useState({ paths: [], bounds: { minX: 0, maxX: 100, minY: 0, maxY: 100 } });

    // --- Surfacing State ---
    const [surfaceParams, setSurfaceParams] = useState({
        width: 100, length: 100, depth: -1, toolDiameter: 6, stepover: 40,
        feed: 800, spindle: 8000, safeZ: 5, startX: 0, startY: 0,
    });

    // --- Drilling State ---
    const [drillType, setDrillType] = useState('single');
    const [drillParams, setDrillParams] = useState({
        depth: -5, peck: 2, retract: 2, feed: 150, safeZ: 5,
        singleX: 10, singleY: 10,
        rectCols: 4, rectRows: 3, rectSpacingX: 25, rectSpacingY: 20, rectStartX: 10, rectStartY: 10,
        circCenterX: 50, circCenterY: 50, circRadius: 40, circHoles: 6, circStartAngle: 0,
    });

    useEffect(() => {
        if (isOpen) {
            handleGenerate();
        }
    }, [isOpen, activeTab, surfaceParams, drillParams, drillType]);
    
    const handleParamChange = (setter, params, field, value) => {
        const numValue = value === '' ? '' : parseFloat(value);
        if (isNaN(numValue)) return;
        setter({ ...params, [field]: numValue });
    };

    const generateSurfacingCode = () => {
        const { width, length, depth, toolDiameter, stepover, feed, spindle, safeZ, startX, startY } = surfaceParams;
        if ([width, length, depth, toolDiameter, stepover, feed, spindle, safeZ].some(p => p === '' || p === null)) return { code: [], paths: [] };
        
        const code = [
            `(--- Surfacing Operation ---)`,
            `(Width: ${width}, Length: ${length}, Depth: ${depth})`,
            `(Tool Dia: ${toolDiameter}, Stepover: ${stepover}%)`,
            `G21 G90`, // mm, absolute
            `M3 S${spindle}`,
            `G0 Z${safeZ}`,
            `G0 X${startX.toFixed(3)} Y${startY.toFixed(3)}`,
        ];
        
        const paths = [];
        const step = toolDiameter * (stepover / 100);
        let y = startY;
        let x = startX;
        let direction = 1;

        code.push(`G1 Z${depth.toFixed(3)} F${Math.round(feed / 2)}`);

        while (y <= length + startY) {
            x = direction === 1 ? startX + width : startX;
            code.push(`G1 X${x.toFixed(3)} F${feed}`);
            paths.push({ d: `M${startX + width - x} ${y} L${x} ${y}`, stroke: 'var(--color-primary)' });
            
            y += step;
            if (y <= length + startY) {
                code.push(`G1 Y${y.toFixed(3)}`);
                paths.push({ d: `M${x} ${y-step} L${x} ${y}`, stroke: 'var(--color-text-secondary)' });
            }
            direction *= -1;
        }

        code.push(`G0 Z${safeZ}`, `M5`, `G0 X${startX.toFixed(3)} Y${startY.toFixed(3)}`);
        
        return { 
            code, 
            paths,
            bounds: { minX: startX, minY: startY, maxX: startX + width, maxY: startY + length } 
        };
    };

    const generateDrillingCode = () => {
        const { depth, peck, retract, feed, safeZ } = drillParams;
        if ([depth, peck, retract, feed, safeZ].some(p => p === '' || p === null)) return { code: [], paths: [] };
        
        const code = [
            `(--- Drilling Operation: ${drillType} ---)`,
            `(Depth: ${depth}, Peck: ${peck}, Retract: ${retract})`,
            `G21 G90`, // mm, absolute
        ];
        
        const paths = [];
        const points = [];

        if (drillType === 'single') {
            points.push({ x: drillParams.singleX, y: drillParams.singleY });
        } else if (drillType === 'rect') {
            const { rectCols, rectRows, rectSpacingX, rectSpacingY, rectStartX, rectStartY } = drillParams;
            for (let r = 0; r < rectRows; r++) {
                for (let c = 0; c < rectCols; c++) {
                    points.push({ x: rectStartX + c * rectSpacingX, y: rectStartY + r * rectSpacingY });
                }
            }
        } else if (drillType === 'circ') {
            const { circHoles, circRadius, circCenterX, circCenterY, circStartAngle } = drillParams;
            const angleStep = 360 / circHoles;
            for (let i = 0; i < circHoles; i++) {
                const angle = (circStartAngle + i * angleStep) * (Math.PI / 180);
                points.push({
                    x: circCenterX + circRadius * Math.cos(angle),
                    y: circCenterY + circRadius * Math.sin(angle),
                });
            }
        }

        points.forEach(p => {
            code.push(`G0 X${p.x.toFixed(3)} Y${p.y.toFixed(3)}`);
            code.push(`G0 Z${safeZ}`);
            
            let currentDepth = 0;
            while (currentDepth > depth) {
                currentDepth = Math.max(depth, currentDepth - peck);
                code.push(`G1 Z${currentDepth.toFixed(3)} F${feed}`);
                if (currentDepth > depth) {
                    code.push(`G0 Z${retract}`);
                }
            }
            code.push(`G0 Z${safeZ}`);
            paths.push({ cx: p.x, cy: p.y, r: 2, fill: 'var(--color-primary)' });
        });
        
        const bounds = points.reduce((acc, p) => ({
            minX: Math.min(acc.minX, p.x - 2), maxX: Math.max(acc.maxX, p.x + 2),
            minY: Math.min(acc.minY, p.y - 2), maxY: Math.max(acc.maxY, p.y + 2),
        }), { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity });
        
        return { code, paths, bounds };
    };

    const handleGenerate = useCallback(() => {
        let result;
        if (activeTab === 'surfacing') {
            result = generateSurfacingCode();
        } else {
            result = generateDrillingCode();
        }
        setGeneratedGCode(result.code.join('\n'));
        setPreviewPaths({ paths: result.paths, bounds: result.bounds });
    }, [activeTab, surfaceParams, drillParams, drillType]);
    
    if (!isOpen) return null;

    const renderSurfaceForm = () => h('div', { className: 'space-y-4' },
        h('div', { className: 'grid grid-cols-2 gap-4' },
             h(Input, { label: `Width (X)`, value: surfaceParams.width, onChange: e => handleParamChange(setSurfaceParams, surfaceParams, 'width', e.target.value), unit }),
             h(Input, { label: `Length (Y)`, value: surfaceParams.length, onChange: e => handleParamChange(setSurfaceParams, surfaceParams, 'length', e.target.value), unit })
        ),
        h(Input, { label: 'Final Depth', value: surfaceParams.depth, onChange: e => handleParamChange(setSurfaceParams, surfaceParams, 'depth', e.target.value), unit, help: 'Should be negative' }),
        h('div', { className: 'grid grid-cols-2 gap-4' },
            h(Input, { label: 'Tool Dia.', value: surfaceParams.toolDiameter, onChange: e => handleParamChange(setSurfaceParams, surfaceParams, 'toolDiameter', e.target.value), unit }),
            h(Input, { label: 'Stepover', value: surfaceParams.stepover, onChange: e => handleParamChange(setSurfaceParams, surfaceParams, 'stepover', e.target.value), unit: '%' })
        ),
         h('div', { className: 'grid grid-cols-2 gap-4' },
            h(Input, { label: 'Feed Rate', value: surfaceParams.feed, onChange: e => handleParamChange(setSurfaceParams, surfaceParams, 'feed', e.target.value), unit: unit + '/min' }),
            h(Input, { label: 'Spindle', value: surfaceParams.spindle, onChange: e => handleParamChange(setSurfaceParams, surfaceParams, 'spindle', e.target.value), unit: 'RPM' })
        ),
        h(Input, { label: 'Safe Z', value: surfaceParams.safeZ, onChange: e => handleParamChange(setSurfaceParams, surfaceParams, 'safeZ', e.target.value), unit }),
    );
    
    const renderDrillForm = () => h('div', { className: 'space-y-4' },
        h('div', { className: 'flex bg-secondary rounded-md p-1'},
             h(DrillTypeButton, { type: 'single', label: 'Single', current: drillType, onClick: setDrillType }),
             h(DrillTypeButton, { type: 'rect', label: 'Rectangular', current: drillType, onClick: setDrillType }),
             h(DrillTypeButton, { type: 'circ', label: 'Circular', current: drillType, onClick: setDrillType })
        ),
        
        drillType === 'single' && h(Input, { label: 'Center X, Y', valueX: drillParams.singleX, valueY: drillParams.singleY, onChangeX: e => handleParamChange(setDrillParams, drillParams, 'singleX', e.target.value), onChangeY: e => handleParamChange(setDrillParams, drillParams, 'singleY', e.target.value), isXY: true, unit }),
        drillType === 'rect' && h(React.Fragment, null,
            h(Input, { label: 'Columns, Rows', valueX: drillParams.rectCols, valueY: drillParams.rectRows, onChangeX: e => handleParamChange(setDrillParams, drillParams, 'rectCols', e.target.value), onChangeY: e => handleParamChange(setDrillParams, drillParams, 'rectRows', e.target.value), isXY: true }),
            h(Input, { label: 'Spacing X, Y', valueX: drillParams.rectSpacingX, valueY: drillParams.rectSpacingY, onChangeX: e => handleParamChange(setDrillParams, drillParams, 'rectSpacingX', e.target.value), onChangeY: e => handleParamChange(setDrillParams, drillParams, 'rectSpacingY', e.target.value), isXY: true, unit }),
            h(Input, { label: 'Start X, Y', valueX: drillParams.rectStartX, valueY: drillParams.rectStartY, onChangeX: e => handleParamChange(setDrillParams, drillParams, 'rectStartX', e.target.value), onChangeY: e => handleParamChange(setDrillParams, drillParams, 'rectStartY', e.target.value), isXY: true, unit })
        ),
        drillType === 'circ' && h(React.Fragment, null,
            h(Input, { label: 'Center X, Y', valueX: drillParams.circCenterX, valueY: drillParams.circCenterY, onChangeX: e => handleParamChange(setDrillParams, drillParams, 'circCenterX', e.target.value), onChangeY: e => handleParamChange(setDrillParams, drillParams, 'circCenterY', e.target.value), isXY: true, unit }),
            h(Input, { label: 'Radius', value: drillParams.circRadius, onChange: e => handleParamChange(setDrillParams, drillParams, 'circRadius', e.target.value), unit }),
            h('div', { className: 'grid grid-cols-2 gap-4' },
                h(Input, { label: '# of Holes', value: drillParams.circHoles, onChange: e => handleParamChange(setDrillParams, drillParams, 'circHoles', e.target.value) }),
                h(Input, { label: 'Start Angle', value: drillParams.circStartAngle, onChange: e => handleParamChange(setDrillParams, drillParams, 'circStartAngle', e.target.value), unit: '°' }),
            )
        ),
        
        h('hr', { className: 'border-secondary' }),
        h('div', { className: 'grid grid-cols-2 gap-4' },
            h(Input, { label: 'Final Depth', value: drillParams.depth, onChange: e => handleParamChange(setDrillParams, drillParams, 'depth', e.target.value), unit, help: 'Should be negative' }),
            h(Input, { label: 'Peck Depth', value: drillParams.peck, onChange: e => handleParamChange(setDrillParams, drillParams, 'peck', e.target.value), unit, help: 'Depth per plunge' })
        ),
         h('div', { className: 'grid grid-cols-2 gap-4' },
            h(Input, { label: 'Retract Height', value: drillParams.retract, onChange: e => handleParamChange(setDrillParams, drillParams, 'retract', e.target.value), unit, help: 'Height after each peck' }),
            h(Input, { label: 'Plunge Feed', value: drillParams.feed, onChange: e => handleParamChange(setDrillParams, drillParams, 'feed', e.target.value), unit: unit + '/min' })
        ),
    );

    return h('div', { className: 'fixed inset-0 bg-background/80 backdrop-blur-sm z-40 flex items-center justify-center', onClick: onCancel },
        h('div', { className: 'bg-surface rounded-lg shadow-2xl w-full max-w-4xl border border-secondary transform transition-all max-h-[90vh] flex flex-col', onClick: e => e.stopPropagation() },
            h('div', { className: 'p-6 border-b border-secondary flex justify-between items-center' },
                h('h2', { className: 'text-2xl font-bold text-text-primary' }, 'G-Code Generator'),
                h('button', { onClick: onCancel, className: 'p-1 rounded-md text-text-secondary hover:text-text-primary' }, h(X, { className: 'w-6 h-6' }))
            ),
            h('div', { className: 'p-6 flex-grow grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto' },
                h('div', { className: 'space-y-4' },
                    h('div', { className: 'flex border-b border-secondary' },
                        h(Tab, { label: 'Surfacing', isActive: activeTab === 'surfacing', onClick: () => setActiveTab('surfacing') }),
                        h(Tab, { label: 'Drilling', isActive: activeTab === 'drilling', onClick: () => setActiveTab('drilling') })
                    ),
                    activeTab === 'surfacing' ? renderSurfaceForm() : renderDrillForm()
                ),
                h('div', { className: 'bg-background p-4 rounded-md flex flex-col gap-4' },
                    h(Preview, { paths: previewPaths.paths, bounds: previewPaths.bounds }),
                    h('textarea', {
                        readOnly: true, value: generatedGCode,
                        className: 'w-full flex-grow bg-secondary font-mono text-sm p-2 rounded-md border border-secondary focus:outline-none focus:ring-1 focus:ring-primary',
                        rows: 8,
                    })
                )
            ),
            h('div', { className: 'bg-background px-6 py-4 flex justify-end gap-4 rounded-b-lg' },
                h('button', { onClick: onCancel, className: 'px-4 py-2 bg-secondary text-white font-semibold rounded-md hover:bg-secondary-focus' }, 'Cancel'),
                h('button', {
                    onClick: () => onLoadGCode(generatedGCode, `${activeTab}_generated.gcode`),
                    disabled: !generatedGCode,
                    className: 'px-6 py-2 bg-primary text-white font-bold rounded-md hover:bg-primary-focus disabled:bg-secondary disabled:cursor-not-allowed flex items-center gap-2'
                }, h(Save, { className: 'w-5 h-5' }), 'Load into Sender')
            )
        )
    );
};

const Tab = ({ label, isActive, onClick }) => h('button', {
    onClick,
    className: `px-4 py-2 text-sm font-semibold -mb-px border-b-2 ${isActive ? 'border-primary text-primary' : 'border-transparent text-text-secondary hover:text-text-primary'}`
}, label);

const DrillTypeButton = ({ type, label, current, onClick }) => h('button', {
    onClick: () => onClick(type),
    className: `w-full p-1 rounded-md text-sm font-semibold transition-colors ${current === type ? 'bg-primary text-white' : 'hover:bg-secondary-focus'}`
}, label);

const Input = ({ label, value, valueX, valueY, onChange, onChangeX, onChangeY, unit, help, isXY = false }) => h('div', null,
    h('label', { className: 'block text-sm font-medium text-text-secondary mb-1' }, label),
    isXY ?
        h('div', { className: 'flex gap-2' },
            h('input', { type: 'number', value: valueX, onChange: onChangeX, className: 'w-full bg-background border-secondary rounded-md py-1 px-2 focus:outline-none focus:ring-1 focus:ring-primary' }),
            h('input', { type: 'number', value: valueY, onChange: onChangeY, className: 'w-full bg-background border-secondary rounded-md py-1 px-2 focus:outline-none focus:ring-1 focus:ring-primary' })
        )
        :
        h('div', { className: 'relative' },
            h('input', { type: 'number', value: value, onChange: onChange, className: 'w-full bg-background border-secondary rounded-md py-1 px-2 focus:outline-none focus:ring-1 focus:ring-primary' }),
            unit && h('span', { className: 'absolute right-2 top-1/2 -translate-y-1/2 text-xs text-text-secondary' }, unit)
        ),
    help && h('p', { className: 'text-xs text-text-secondary mt-1' }, help)
);

const Preview = ({ paths, bounds }) => {
    const { minX = 0, minY = 0, maxX = 100, maxY = 100 } = bounds;
    const width = maxX - minX || 100;
    const height = maxY - minY || 100;
    const viewBox = `${minX} ${minY} ${width} ${height}`;

    return h('div', { className: 'aspect-square w-full bg-secondary rounded' },
        h('svg', { viewBox, className: 'w-full h-full', style: { transform: 'scale(1, -1)' } }, // Flip Y-axis
            paths.map((p, i) => {
                if (p.d) { // It's a path
                    return h('path', { key: i, d: p.d, stroke: p.stroke, fill: 'none', strokeWidth: '1%' });
                }
                if (p.cx !== undefined) { // It's a circle
                    return h('circle', { key: i, cx: p.cx, cy: p.cy, r: p.r, fill: p.fill });
                }
                return null;
            })
        )
    );
};

export default GCodeGeneratorModal;
