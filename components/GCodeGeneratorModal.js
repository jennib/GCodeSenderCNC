
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

    // --- Pocket State ---
    const [pocketParams, setPocketParams] = useState({
        shape: 'rect',
        width: 80, length: 50, cornerRadius: 5, diameter: 60,
        depth: -10, depthPerPass: 2, toolDiameter: 6, stepover: 40,
        feed: 500, plungeFeed: 150, spindle: 8000, safeZ: 5,
    });

    // --- Profile State ---
    const [profileParams, setProfileParams] = useState({
        shape: 'rect',
        width: 80, length: 50, cornerRadius: 10, diameter: 60,
        depth: -12, depthPerPass: 3, toolDiameter: 6, cutSide: 'outside',
        tabsEnabled: true, numTabs: 4, tabWidth: 6, tabHeight: 2,
        feed: 600, spindle: 9000, safeZ: 5,
    });


    useEffect(() => {
        if (isOpen) {
            handleGenerate();
        }
    }, [isOpen, activeTab, surfaceParams, drillParams, drillType, pocketParams, profileParams]);
    
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
            let lastX = x;
            x = direction === 1 ? startX + width : startX;
            code.push(`G1 X${x.toFixed(3)} F${feed}`);
            paths.push({ d: `M${lastX} ${y} L${x} ${y}`, stroke: 'var(--color-primary)' });
            
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

    const generatePocketCode = () => {
        const { shape, width, length, cornerRadius, diameter, depth, depthPerPass, toolDiameter, stepover, feed, plungeFeed, spindle, safeZ } = pocketParams;
        if ([depth, depthPerPass, toolDiameter, stepover, feed, plungeFeed, spindle, safeZ].some(p => p === '' || p === null)) return { code: [], paths: [] };
        
        const code = [`(--- Pocket Operation: ${shape} ---)`, `G21 G90`, `M3 S${spindle}`, `G0 Z${safeZ}`];
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

                const effectiveRadius = Math.min(cornerRadius, width / 2, length / 2);
                const clearingWidth = width - 2 * toolRadius;
                const clearingLength = length - 2 * toolRadius;

                // Raster clearing
                let y = toolRadius;
                let direction = 1;
                while (y <= length - toolRadius) {
                    let lastX = (direction === 1) ? toolRadius : width - toolRadius;
                    let nextX = (direction === 1) ? width - toolRadius : toolRadius;
                    code.push(`G1 X${nextX.toFixed(3)} Y${y.toFixed(3)} F${feed}`);
                    paths.push({ d: `M${lastX} ${y} L${nextX} ${y}`, stroke: 'var(--color-primary)' });
                    
                    y += stepoverDist;
                    direction *= -1;
                    if (y <= length - toolRadius) {
                        code.push(`G1 Y${y.toFixed(3)}`);
                        paths.push({ d: `M${nextX} ${y - stepoverDist} L${nextX} ${y}`, stroke: 'var(--color-text-secondary)' });
                    }
                }
                
                // Finishing pass
                const r = effectiveRadius - toolRadius;
                code.push(`G0 X${(width - toolRadius - r).toFixed(3)} Y${toolRadius.toFixed(3)}`);
                code.push(`G1 Z${currentDepth.toFixed(3)} F${plungeFeed}`);
                code.push(`G1 Y${(length - toolRadius - r).toFixed(3)} F${feed}`);
                code.push(`G2 X${(width - toolRadius).toFixed(3)} Y${(length - toolRadius).toFixed(3)} I${r.toFixed(3)} J0`);
                code.push(`G1 X${(toolRadius + r).toFixed(3)}`);
                code.push(`G2 X${toolRadius.toFixed(3)} Y${(length - toolRadius - r).toFixed(3)} I0 J${-r.toFixed(3)}`);
                code.push(`G1 Y${(toolRadius + r).toFixed(3)}`);
                code.push(`G2 X${(toolRadius + r).toFixed(3)} Y${toolRadius.toFixed(3)} I${-r.toFixed(3)} J0`);
                code.push(`G1 X${(width - toolRadius - r).toFixed(3)}`);
                 paths.push({
                    d: `M ${toolRadius} ${toolRadius+r} L ${toolRadius} ${length-toolRadius-r} A ${r} ${r} 0 0 1 ${toolRadius+r} ${length-toolRadius} L ${width-toolRadius-r} ${length-toolRadius} A ${r} ${r} 0 0 1 ${width-toolRadius} ${length-toolRadius-r} L ${width-toolRadius} ${toolRadius+r} A ${r} ${r} 0 0 1 ${width-toolRadius-r} ${toolRadius} L ${toolRadius+r} ${toolRadius} A ${r} ${r} 0 0 1 ${toolRadius} ${toolRadius+r}`,
                    stroke: 'var(--color-accent-green)', 'strokeWidth': '2%'
                });
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
                 code.push(`G1 X${(centerX + maxRadius).toFixed(3)} Y${centerY.toFixed(3)} F${feed}`);
                 code.push(`G2 I${-maxRadius.toFixed(3)} J0`);
                 paths.push({ cx: centerX, cy: centerY, r: maxRadius, stroke: 'var(--color-accent-green)', fill: 'none', strokeWidth: '2%'});
            }
        }
        
        code.push(`G0 Z${safeZ}`, `M5`, `G0 X0 Y0`);
        const bounds = shape === 'rect' ? { minX: 0, minY: 0, maxX: width, maxY: length } : { minX: 0, minY: 0, maxX: diameter, maxY: diameter };
        return { code, paths, bounds };
    };

    const generateProfileCode = () => {
        const { shape, width, length, cornerRadius, diameter, depth, depthPerPass, toolDiameter, cutSide, tabsEnabled, numTabs, tabWidth, tabHeight, feed, spindle, safeZ } = profileParams;

        const code = [`(--- Profile Operation: ${shape}, ${cutSide} ---)`, `G21 G90`, `M3 S${spindle}`];
        const paths = [];
        const toolRadius = toolDiameter / 2;
        let offset = 0;
        if (cutSide === 'outside') offset = toolRadius;
        if (cutSide === 'inside') offset = -toolRadius;

        const bounds = shape === 'rect' ? { minX: -offset, minY: -offset, maxX: width + offset, maxY: length + offset } : { minX: -diameter / 2 - offset, minY: -diameter / 2 - offset, maxX: diameter / 2 + offset, maxY: diameter / 2 + offset };

        // Draw original shape for reference
        if (shape === 'rect') {
             paths.push({ d: `M 0 ${cornerRadius} L 0 ${length-cornerRadius} A ${cornerRadius} ${cornerRadius} 0 0 1 ${cornerRadius} ${length} L ${width-cornerRadius} ${length} A ${cornerRadius} ${cornerRadius} 0 0 1 ${width} ${length-cornerRadius} L ${width} ${cornerRadius} A ${cornerRadius} ${cornerRadius} 0 0 1 ${width-cornerRadius} 0 L ${cornerRadius} 0 A ${cornerRadius} ${cornerRadius} 0 0 1 0 ${cornerRadius}`, stroke: 'var(--color-text-secondary)', strokeDasharray: '4 2', strokeWidth: '0.5%' });
        } else {
            paths.push({ cx: diameter/2, cy: diameter/2, r: diameter/2, stroke: 'var(--color-text-secondary)', fill: 'none', strokeDasharray: '4 2', strokeWidth: '0.5%'});
        }

        let currentDepth = 0;
        while (currentDepth > depth) {
            currentDepth = Math.max(depth, currentDepth - depthPerPass);
            const isFinalPass = currentDepth === depth;

            if (shape === 'rect') {
                const r = Math.max(0, cornerRadius - offset);
                const w = width + offset * 2;
                const l = length + offset * 2;

                const p1 = { x: -offset + r, y: -offset };
                const p2 = { x: w - r, y: -offset };
                const p3 = { x: w, y: -offset + r };
                const p4 = { x: w, y: l - r };
                const p5 = { x: w - r, y: l };
                const p6 = { x: -offset + r, y: l };
                const p7 = { x: -offset, y: l - r };
                const p8 = { x: -offset, y: -offset + r };

                code.push(`G0 X${p2.x.toFixed(3)} Y${p2.y.toFixed(3)} Z${safeZ}`);
                code.push(`G1 Z${currentDepth.toFixed(3)} F${feed/2}`);

                code.push(`G1 X${p1.x.toFixed(3)} F${feed}`);
                code.push(`G2 X${-offset.toFixed(3)} Y${p8.y.toFixed(3)} I0 J${r.toFixed(3)}`);
                code.push(`G1 Y${p7.y.toFixed(3)}`);
                code.push(`G2 X${p6.x.toFixed(3)} Y${l.toFixed(3)} I${r.toFixed(3)} J0`);
                code.push(`G1 X${p5.x.toFixed(3)}`);
                code.push(`G2 X${w.toFixed(3)} Y${p4.y.toFixed(3)} I0 J${-r.toFixed(3)}`);
                code.push(`G1 Y${p3.y.toFixed(3)}`);
                code.push(`G2 X${p2.x.toFixed(3)} Y${-offset.toFixed(3)} I${-r.toFixed(3)} J0`);
                
                 paths.push({ d: `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y} A ${r} ${r} 0 0 0 ${p3.x} ${p3.y} L ${p4.x} ${p4.y} A ${r} ${r} 0 0 0 ${p5.x} ${p5.y} L ${p6.x} ${p6.y} A ${r} ${r} 0 0 0 ${p7.x} ${p7.y} L ${p8.x} ${p8.y} A ${r} ${r} 0 0 0 ${p1.x} ${p1.y}`, stroke: 'var(--color-primary)', fill: 'none', strokeWidth: '1%'});
            
            } else { // Circle
                const radius = diameter / 2 + offset;
                const centerX = diameter / 2;
                const centerY = diameter / 2;
                code.push(`G0 X${(centerX + radius).toFixed(3)} Y${centerY.toFixed(3)} Z${safeZ}`);
                code.push(`G1 Z${currentDepth.toFixed(3)} F${feed/2}`);
                code.push(`G2 I${-radius.toFixed(3)} J0 F${feed}`);
                paths.push({ cx: centerX, cy: centerY, r: radius, stroke: 'var(--color-primary)', fill: 'none', strokeWidth: '1%'});
            }
        }
        
        // TODO: Implement tabs logic for final pass
        
        code.push(`G0 Z${safeZ}`, `M5`);
        return { code, paths, bounds };
    };

    const handleGenerate = useCallback(() => {
        let result;
        if (activeTab === 'surfacing') result = generateSurfacingCode();
        else if (activeTab === 'drilling') result = generateDrillingCode();
        else if (activeTab === 'pocket') result = generatePocketCode();
        else if (activeTab === 'profile') result = generateProfileCode();

        setGeneratedGCode(result.code.join('\n'));
        setPreviewPaths({ paths: result.paths, bounds: result.bounds });
    }, [activeTab, surfaceParams, drillParams, drillType, pocketParams, profileParams]);
    
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
        h(RadioGroup, { options: [
            { value: 'single', label: 'Single' }, 
            { value: 'rect', label: 'Rectangular' },
            { value: 'circ', label: 'Circular' }
        ], selected: drillType, onChange: setDrillType }),
        
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

    const renderPocketForm = () => h('div', { className: 'space-y-4' },
        h(RadioGroup, { options: [{ value: 'rect', label: 'Rectangle' }, { value: 'circ', label: 'Circle' }], selected: pocketParams.shape, onChange: val => setPocketParams(p => ({...p, shape: val})) }),
        pocketParams.shape === 'rect' ? h(React.Fragment, null,
            h(Input, { label: 'Width (X), Length (Y)', valueX: pocketParams.width, valueY: pocketParams.length, onChangeX: e => handleParamChange(setPocketParams, pocketParams, 'width', e.target.value), onChangeY: e => handleParamChange(setPocketParams, pocketParams, 'length', e.target.value), isXY: true, unit }),
            h(Input, { label: 'Corner Radius', value: pocketParams.cornerRadius, onChange: e => handleParamChange(setPocketParams, pocketParams, 'cornerRadius', e.target.value), unit })
        ) : h(React.Fragment, null,
            h(Input, { label: 'Diameter', value: pocketParams.diameter, onChange: e => handleParamChange(setPocketParams, pocketParams, 'diameter', e.target.value), unit })
        ),
        h('hr', { className: 'border-secondary' }),
        h('div', { className: 'grid grid-cols-2 gap-4' },
            h(Input, { label: 'Total Depth', value: pocketParams.depth, onChange: e => handleParamChange(setPocketParams, pocketParams, 'depth', e.target.value), unit, help: 'Negative value' }),
            h(Input, { label: 'Depth per Pass', value: pocketParams.depthPerPass, onChange: e => handleParamChange(setPocketParams, pocketParams, 'depthPerPass', e.target.value), unit })
        ),
        h('div', { className: 'grid grid-cols-2 gap-4' },
            h(Input, { label: 'Tool Diameter', value: pocketParams.toolDiameter, onChange: e => handleParamChange(setPocketParams, pocketParams, 'toolDiameter', e.target.value), unit }),
            h(Input, { label: 'Stepover', value: pocketParams.stepover, onChange: e => handleParamChange(setPocketParams, pocketParams, 'stepover', e.target.value), unit: '%' })
        ),
        h('div', { className: 'grid grid-cols-2 gap-4' },
            h(Input, { label: 'Feed Rate', value: pocketParams.feed, onChange: e => handleParamChange(setPocketParams, pocketParams, 'feed', e.target.value), unit: unit + '/min' }),
            h(Input, { label: 'Plunge Rate', value: pocketParams.plungeFeed, onChange: e => handleParamChange(setPocketParams, pocketParams, 'plungeFeed', e.target.value), unit: unit + '/min' })
        )
    );
    
    const renderProfileForm = () => h('div', { className: 'space-y-4' },
        h(RadioGroup, { options: [{ value: 'rect', label: 'Rectangle' }, { value: 'circ', label: 'Circle' }], selected: profileParams.shape, onChange: val => setProfileParams(p => ({...p, shape: val})) }),
        profileParams.shape === 'rect' ? h(React.Fragment, null,
            h(Input, { label: 'Width (X), Length (Y)', valueX: profileParams.width, valueY: profileParams.length, onChangeX: e => handleParamChange(setProfileParams, profileParams, 'width', e.target.value), onChangeY: e => handleParamChange(setProfileParams, profileParams, 'length', e.target.value), isXY: true, unit }),
            h(Input, { label: 'Corner Radius', value: profileParams.cornerRadius, onChange: e => handleParamChange(setProfileParams, profileParams, 'cornerRadius', e.target.value), unit })
        ) : h(React.Fragment, null,
            h(Input, { label: 'Diameter', value: profileParams.diameter, onChange: e => handleParamChange(setProfileParams, profileParams, 'diameter', e.target.value), unit })
        ),
        h('hr', { className: 'border-secondary' }),
        h(RadioGroup, { label: 'Cut Side', options: [{ value: 'outside', label: 'Outside' }, { value: 'inside', label: 'Inside' }, { value: 'online', label: 'On-line' }], selected: profileParams.cutSide, onChange: val => setProfileParams(p => ({...p, cutSide: val})) }),
        h('div', { className: 'grid grid-cols-2 gap-4' },
            h(Input, { label: 'Total Depth', value: profileParams.depth, onChange: e => handleParamChange(setProfileParams, profileParams, 'depth', e.target.value), unit, help: 'Negative value' }),
            h(Input, { label: 'Depth per Pass', value: profileParams.depthPerPass, onChange: e => handleParamChange(setProfileParams, profileParams, 'depthPerPass', e.target.value), unit })
        ),
        h('hr', { className: 'border-secondary' }),
        h('label', { className: 'flex items-center gap-2 cursor-pointer' },
            h('input', { type: 'checkbox', checked: profileParams.tabsEnabled, onChange: e => setProfileParams(p => ({...p, tabsEnabled: e.target.checked})), className: 'h-4 w-4 rounded border-secondary text-primary' }),
            'Add Hold-down Tabs'
        ),
        profileParams.tabsEnabled && h('div', { className: 'grid grid-cols-3 gap-4 pl-6' },
             h(Input, { label: '# Tabs', value: profileParams.numTabs, onChange: e => handleParamChange(setProfileParams, profileParams, 'numTabs', e.target.value) }),
             h(Input, { label: 'Tab Width', value: profileParams.tabWidth, onChange: e => handleParamChange(setProfileParams, profileParams, 'tabWidth', e.target.value), unit }),
             h(Input, { label: 'Tab Height', value: profileParams.tabHeight, onChange: e => handleParamChange(setProfileParams, profileParams, 'tabHeight', e.target.value), unit, help: 'From bottom' })
        )
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
                        h(Tab, { label: 'Drilling', isActive: activeTab === 'drilling', onClick: () => setActiveTab('drilling') }),
                        h(Tab, { label: 'Pocket', isActive: activeTab === 'pocket', onClick: () => setActiveTab('pocket') }),
                        h(Tab, { label: 'Profile', isActive: activeTab === 'profile', onClick: () => setActiveTab('profile') })
                    ),
                    activeTab === 'surfacing' && renderSurfaceForm(),
                    activeTab === 'drilling' && renderDrillForm(),
                    activeTab === 'pocket' && renderPocketForm(),
                    activeTab === 'profile' && renderProfileForm()
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

const RadioGroup = ({ label, options, selected, onChange }) => h('div', { className: 'mb-2' },
    label && h('label', { className: 'block text-sm font-medium text-text-secondary mb-1' }, label),
    h('div', { className: 'flex bg-secondary rounded-md p-1' },
        options.map(opt => h('button', {
            key: opt.value,
            onClick: () => onChange(opt.value),
            className: `w-full p-1 rounded-md text-sm font-semibold transition-colors ${selected === opt.value ? 'bg-primary text-white' : 'hover:bg-secondary-focus'}`
        }, opt.label))
    )
);

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
    const width = (maxX - minX) || 100;
    const height = (maxY - minY) || 100;
    const padding = Math.max(width, height) * 0.1;
    const viewBox = `${minX - padding} ${minY - padding} ${width + padding * 2} ${height + padding * 2}`;

    return h('div', { className: 'aspect-square w-full bg-secondary rounded' },
        h('svg', { viewBox, className: 'w-full h-full', style: { transform: 'scale(1, -1)' } }, // Flip Y-axis
            paths.map((p, i) => {
                if (p.d) { // It's a path
                    return h('path', { key: i, d: p.d, stroke: p.stroke, fill: 'none', strokeWidth: p.strokeWidth || '1%' , strokeDasharray: p.strokeDasharray });
                }
                if (p.cx !== undefined) { // It's a circle
                    return h('circle', { key: i, cx: p.cx, cy: p.cy, r: p.r, fill: p.fill, stroke: p.stroke, strokeWidth: p.strokeWidth });
                }
                return null;
            })
        )
    );
};

export default GCodeGeneratorModal;
