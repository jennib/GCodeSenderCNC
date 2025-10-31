

import React, { useState, useEffect, useCallback } from 'react';
import { X, Save, Zap, ZoomIn, ZoomOut, Maximize, AlertTriangle } from './Icons.js';
import { FONTS } from '../services/cncFonts.js';
import { parseGCode } from '../services/gcodeParser.js';

const h = React.createElement;

const GCodeGeneratorModal = ({ isOpen, onCancel, onLoadGCode, unit, settings, toolLibrary }) => {
    const [activeTab, setActiveTab] = useState('surfacing');
    const [generatedGCode, setGeneratedGCode] = useState('');
    const [previewPaths, setPreviewPaths] = useState({ paths: [], bounds: { minX: 0, maxX: 100, minY: 0, maxY: 100 } });
    const [viewBox, setViewBox] = useState('0 0 100 100');
    const [generationError, setGenerationError] = useState(null);


    // --- Surfacing State ---
    const [surfaceParams, setSurfaceParams] = useState({
        width: 100, length: 100, depth: -1, stepover: 40,
        feed: 800, spindle: 8000, safeZ: 5, startX: 0, startY: 0,
        toolId: null,
    });

    // --- Drilling State ---
    const [drillType, setDrillType] = useState('single');
    const [drillParams, setDrillParams] = useState({
        depth: -5, peck: 2, retract: 2, feed: 150, spindle: 8000, safeZ: 5,
        singleX: 10, singleY: 10,
        rectCols: 4, rectRows: 3, rectSpacingX: 25, rectSpacingY: 20, rectStartX: 10, rectStartY: 10,
        circCenterX: 50, circCenterY: 50, circRadius: 40, circHoles: 6, circStartAngle: 0,
        toolId: null,
    });
    
    // --- Bore State ---
    const [boreParams, setBoreParams] = useState({
        centerX: 50, centerY: 50,
        holeDiameter: 20, holeDepth: -15,
        counterboreEnabled: true,
        cbDiameter: 30, cbDepth: -5,
        depthPerPass: 2, feed: 400, plungeFeed: 150, spindle: 8000, safeZ: 5,
        toolId: null,
    });


    // --- Pocket State ---
    const [pocketParams, setPocketParams] = useState({
        shape: 'rect',
        width: 80, length: 50, cornerRadius: 5, diameter: 60,
        depth: -10, depthPerPass: 2, stepover: 40,
        feed: 500, plungeFeed: 150, spindle: 8000, safeZ: 5,
        toolId: null,
    });

    // --- Profile State ---
    const [profileParams, setProfileParams] = useState({
        shape: 'rect',
        width: 80, length: 50, cornerRadius: 10, diameter: 60,
        depth: -12, depthPerPass: 3, cutSide: 'outside',
        tabsEnabled: true, numTabs: 4, tabWidth: 6, tabHeight: 2,
        feed: 600, spindle: 9000, safeZ: 5,
        toolId: null,
    });

    // --- Slot State ---
    const [slotParams, setSlotParams] = useState({
        type: 'straight',
        slotWidth: 6, depth: -5, depthPerPass: 2,
        feed: 400, spindle: 8000, safeZ: 5,
        startX: 10, startY: 10, endX: 90, endY: 20,
        centerX: 50, centerY: 50, radius: 40, startAngle: 45, endAngle: 135,
        toolId: null,
    });

    // --- Text State ---
    const [textParams, setTextParams] = useState({
        text: 'HELLO',
        font: 'Sans-serif Stick',
        height: 10,
        spacing: 2,
        startX: 10,
        startY: 10,
        alignment: 'left',
        depth: -0.5,
        feed: 300,
        spindle: 10000,
        safeZ: 5,
        toolId: null,
    });

    // --- Thread Milling State ---
    const [threadParams, setThreadParams] = useState({
        type: 'internal',
        hand: 'right',
        diameter: 6,
        pitch: 1,
        depth: 10,
        feed: 200,
        spindle: 10000,
        safeZ: 5,
        toolId: null,
    });
    
    // --- Array State (now universal) ---
    const [arraySettings, setArraySettings] = useState({
        isEnabled: false,
        pattern: 'rect',
        rectCols: 3, rectRows: 2, rectSpacingX: 15, rectSpacingY: 15,
        circCopies: 6, circRadius: 40, circCenterX: 50, circCenterY: 50, circStartAngle: 0,
    });
    
    const calculateViewBox = useCallback((bounds) => {
        if (!bounds || bounds.minX === Infinity) return '0 -100 100 100';
        const { minX = 0, minY = 0, maxX = 100, maxY = 100 } = bounds;
        const width = Math.abs(maxX - minX) || 100;
        const height = Math.abs(maxY - minY) || 100;
        const padding = Math.max(width, height) * 0.15;

        const vbMinX = minX - padding;
        const vbWidth = width + padding * 2;
        
        // Because of the scale(1, -1) transform, the Y coordinates are flipped.
        // The top of the viewbox needs to be the negated maximum Y coordinate.
        const vbMinY = -(maxY + padding);
        const vbHeight = height + padding * 2;

        return `${vbMinX} ${vbMinY} ${vbWidth} ${vbHeight}`;
    }, []);

    const fitView = useCallback(() => {
        setViewBox(calculateViewBox(previewPaths.bounds));
    }, [previewPaths.bounds, calculateViewBox]);

    const handleZoom = (factor) => {
        setViewBox(currentViewBox => {
            const parts = currentViewBox.split(' ').map(parseFloat);
            if (parts.length !== 4) return currentViewBox;
            let [x, y, w, h] = parts;
            const newW = w * factor;
            const newH = h * factor;
            const newX = x + (w - newW) / 2;
            const newY = y + (h - newH) / 2;
            return `${newX} ${newY} ${newW} ${newH}`;
        });
    };

    useEffect(() => {
        // Reset array settings when switching tabs for a cleaner workflow
        const showArray = !['surfacing', 'drilling'].includes(activeTab);
        setArraySettings(prev => ({
            ...prev,
            isEnabled: showArray ? prev.isEnabled : false
        }));
    }, [activeTab]);


    useEffect(() => {
        if (isOpen) {
            handleGenerate();
        }
    }, [isOpen, activeTab, surfaceParams, drillParams, drillType, boreParams, pocketParams, profileParams, slotParams, textParams, threadParams, arraySettings]);
    
     useEffect(() => {
        fitView();
    }, [previewPaths.bounds, fitView]);
    
    const handleParamChange = (setter, params, field, value) => {
        const numValue = value === '' ? '' : parseFloat(value);
        if (isNaN(numValue)) return;
        setter({ ...params, [field]: numValue });
    };

    const generateSurfacingCode = () => {
        const selectedTool = toolLibrary.find(t => t.id === surfaceParams.toolId);
        if (!selectedTool) return { error: "Please select a tool." };
        const toolDiameter = selectedTool.diameter;

        const { width, length, depth, stepover, feed, spindle, safeZ, startX, startY } = surfaceParams;
        if ([width, length, depth, stepover, feed, spindle, safeZ].some(p => p === '' || p === null)) return { error: "Please fill all required fields." };
        
        const code = [
            `(--- Surfacing Operation ---)`,
            `(Tool: ${selectedTool.name} - Ø${toolDiameter}${unit})`,
            `(Width: ${width}, Length: ${length}, Depth: ${depth})`,
            `(Stepover: ${stepover}%)`,
            `T${selectedTool.id} M6`,
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
        const selectedTool = toolLibrary.find(t => t.id === drillParams.toolId);
        if (!selectedTool) return { error: "Please select a tool." };

        const { depth, peck, retract, feed, spindle, safeZ } = drillParams;
        if ([depth, peck, retract, feed, spindle, safeZ].some(p => p === '' || p === null)) return { error: "Please fill all required fields." };
        
        const code = [
            `(--- Drilling Operation: ${drillType} ---)`,
            `(Tool: ${selectedTool.name})`,
            `(Depth: ${depth}, Peck: ${peck}, Retract: ${retract})`,
            `T${selectedTool.id} M6`,
            `G21 G90`, // mm, absolute
            `M3 S${spindle}`,
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
            paths.push({ cx: p.x, cy: p.y, r: selectedTool.diameter / 2, fill: 'var(--color-primary)' });
        });
        
        code.push('M5');

        const bounds = points.reduce((acc, p) => ({
            minX: Math.min(acc.minX, p.x - 2), maxX: Math.max(acc.maxX, p.x + 2),
            minY: Math.min(acc.minY, p.y - 2), maxY: Math.max(acc.maxY, p.y + 2),
        }), { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity });
        
        return { code, paths, bounds };
    };

    const generateBoreCode = () => {
        const selectedTool = toolLibrary.find(t => t.id === boreParams.toolId);
        if (!selectedTool) return { error: "Please select a tool." };
        const toolDiameter = selectedTool.diameter;

        const { centerX, centerY, holeDiameter, holeDepth, counterboreEnabled, cbDiameter, cbDepth, depthPerPass, feed, plungeFeed, spindle, safeZ } = boreParams;
        if ([centerX, centerY, holeDiameter, holeDepth, depthPerPass, feed, plungeFeed, spindle, safeZ].some(p => p === '' || p === null)) return { error: "Please fill all required fields." };
        if (counterboreEnabled && ([cbDiameter, cbDepth].some(p => p === '' || p === null))) return { error: "Please fill counterbore fields." };

        if (toolDiameter >= holeDiameter) return { error: "Tool diameter must be smaller than hole diameter." };
        if (counterboreEnabled && toolDiameter >= cbDiameter) return { error: "Tool diameter must be smaller than counterbore diameter." };
        if (counterboreEnabled && cbDiameter <= holeDiameter) return { error: "Counterbore must be larger than hole." };

        const code = [
            `(--- Bore/Counterbore Operation ---)`,
            `(Tool: ${selectedTool.name} - Ø${toolDiameter}${unit})`,
            `T${selectedTool.id} M6`,
            `G21 G90`,
            `M3 S${spindle}`,
        ];
        const paths = [];

        const millCircularPocket = (diameter, startZ, endZ) => {
            const radius = (diameter - toolDiameter) / 2;
            code.push(`(--- Milling pocket Ø${diameter} from Z${startZ} to Z${endZ} ---)`);
            
            let currentZ = startZ;
            while (currentZ > endZ) {
                currentZ = Math.max(endZ, currentZ - depthPerPass);
                code.push(`G0 X${centerX.toFixed(3)} Y${centerY.toFixed(3)}`);
                code.push(`G1 Z${currentZ.toFixed(3)} F${plungeFeed}`);
                code.push(`G1 X${(centerX + radius).toFixed(3)} F${feed}`);
                code.push(`G2 I${-radius.toFixed(3)} J0`);
                code.push(`G1 X${centerX.toFixed(3)}`);
            }
        };

        code.push(`G0 Z${safeZ}`);

        if (counterboreEnabled) {
            millCircularPocket(cbDiameter, 0, cbDepth);
            paths.push({ cx: centerX, cy: centerY, r: cbDiameter / 2, stroke: 'var(--color-accent-yellow)', fill: 'none', strokeWidth: '1%' });
        }
        
        millCircularPocket(holeDiameter, counterboreEnabled ? cbDepth : 0, holeDepth);
        paths.push({ cx: centerX, cy: centerY, r: holeDiameter / 2, stroke: 'var(--color-primary)', fill: 'none', strokeWidth: '1%' });


        code.push(`G0 Z${safeZ}`, `M5`);
        const maxDiameter = counterboreEnabled ? cbDiameter : holeDiameter;
        const bounds = { minX: centerX - maxDiameter/2, maxX: centerX + maxDiameter/2, minY: centerY - maxDiameter/2, maxY: centerY + maxDiameter/2 };
        return { code, paths, bounds };
    };

    const generatePocketCode = () => {
        const selectedTool = toolLibrary.find(t => t.id === pocketParams.toolId);
        if (!selectedTool) return { error: "Please select a tool." };
        const toolDiameter = selectedTool.diameter;

        const { shape, width, length, cornerRadius, diameter, depth, depthPerPass, stepover, feed, plungeFeed, spindle, safeZ } = pocketParams;
        if ([depth, depthPerPass, stepover, feed, plungeFeed, spindle, safeZ].some(p => p === '' || p === null)) return { error: "Please fill all required fields." };
        
        const code = [
            `(--- Pocket Operation: ${shape} ---)`,
            `(Tool: ${selectedTool.name} - Ø${toolDiameter}${unit})`,
            `T${selectedTool.id} M6`,
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

                const effectiveRadius = Math.min(cornerRadius, width / 2, length / 2);

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
                if (r > 0) code.push(`G2 X${(width - toolRadius).toFixed(3)} Y${(length - toolRadius).toFixed(3)} I${r.toFixed(3)} J0`);
                code.push(`G1 X${(toolRadius + r).toFixed(3)}`);
                if (r > 0) code.push(`G2 X${toolRadius.toFixed(3)} Y${(length - toolRadius - r).toFixed(3)} I0 J${-r.toFixed(3)}`);
                code.push(`G1 Y${(toolRadius + r).toFixed(3)}`);
                if (r > 0) code.push(`G2 X${(toolRadius + r).toFixed(3)} Y${toolRadius.toFixed(3)} I${-r.toFixed(3)} J0`);
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
        const selectedTool = toolLibrary.find(t => t.id === profileParams.toolId);
        if (!selectedTool) return { error: "Please select a tool." };
        const toolDiameter = selectedTool.diameter;

        const { shape, width, length, cornerRadius, diameter, depth, depthPerPass, cutSide, tabsEnabled, numTabs, tabWidth, tabHeight, feed, spindle, safeZ } = profileParams;

        const code = [
            `(--- Profile Operation: ${shape}, ${cutSide} ---)`,
            `(Tool: ${selectedTool.name} - Ø${toolDiameter}${unit})`,
            `T${selectedTool.id} M6`,
            `G21 G90`, `M3 S${spindle}`];
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
                if (r > 0) code.push(`G2 X${(-offset).toFixed(3)} Y${p8.y.toFixed(3)} I0 J${r.toFixed(3)}`);
                code.push(`G1 Y${p7.y.toFixed(3)}`);
                if (r > 0) code.push(`G2 X${p6.x.toFixed(3)} Y${l.toFixed(3)} I${r.toFixed(3)} J0`);
                code.push(`G1 X${p5.x.toFixed(3)}`);
                if (r > 0) code.push(`G2 X${w.toFixed(3)} Y${p4.y.toFixed(3)} I0 J${-r.toFixed(3)}`);
                code.push(`G1 Y${p3.y.toFixed(3)}`);
                if (r > 0) code.push(`G2 X${p2.x.toFixed(3)} Y${(-offset).toFixed(3)} I${-r.toFixed(3)} J0`);
                
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

    const generateSlotCode = () => {
        const selectedTool = toolLibrary.find(t => t.id === slotParams.toolId);
        if (!selectedTool) return { error: "Please select a tool." };
        const toolDiameter = selectedTool.diameter;
        
        const { type, slotWidth, depth, depthPerPass, feed, spindle, safeZ, startX, startY, endX, endY, centerX, centerY, radius, startAngle, endAngle } = slotParams;
        const params = [slotWidth, depth, depthPerPass, feed, spindle, safeZ];
        if (params.some(p => p === '' || p === null)) return { error: "Please fill all required fields." };

        const code = [
            `(--- Slot Operation: ${type} ---)`,
            `(Tool: ${selectedTool.name} - Ø${toolDiameter}${unit})`,
            `T${selectedTool.id} M6`,
            `G21 G90`, `M3 S${spindle}`
        ];
        const paths = [];
        let bounds = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity };
        const updateBounds = (x, y) => {
            bounds.minX = Math.min(bounds.minX, x);
            bounds.maxX = Math.max(bounds.maxX, x);
            bounds.minY = Math.min(bounds.minY, y);
            bounds.maxY = Math.max(bounds.maxY, y);
        };
        
        const offsets = [];
        if (slotWidth <= toolDiameter) {
            offsets.push(0);
        } else {
            const wallOffset = (slotWidth - toolDiameter) / 2;
            offsets.push(-wallOffset, wallOffset);
            if (slotWidth > toolDiameter * 2) {
                 offsets.push(0); // Add a center pass
            }
        }
        offsets.sort((a,b) => a-b);


        let currentDepth = 0;
        while (currentDepth > depth) {
            currentDepth = Math.max(depth, currentDepth - depthPerPass);
            code.push(`(--- Pass at Z=${currentDepth.toFixed(3)} ---)`);

            for (const offset of offsets) {
                if (type === 'straight') {
                    const angle = Math.atan2(endY - startY, endX - startX);
                    const perpAngle = angle + Math.PI / 2;

                    const dx = Math.cos(perpAngle) * offset;
                    const dy = Math.sin(perpAngle) * offset;

                    const passStartX = startX + dx;
                    const passStartY = startY + dy;
                    const passEndX = endX + dx;
                    const passEndY = endY + dy;

                    code.push(`G0 Z${safeZ}`);
                    code.push(`G0 X${passStartX.toFixed(3)} Y${passStartY.toFixed(3)}`);
                    code.push(`G1 Z${currentDepth.toFixed(3)} F${feed / 2}`);
                    code.push(`G1 X${passEndX.toFixed(3)} Y${passEndY.toFixed(3)} F${feed}`);

                    if (currentDepth === Math.max(depth, -depthPerPass)) {
                        paths.push({ d: `M${passStartX} ${passStartY} L${passEndX} ${passEndY}`, stroke: 'var(--color-primary)', strokeWidth: `${toolDiameter}%` });
                        updateBounds(passStartX, passStartY);
                        updateBounds(passEndX, passEndY);
                    }
                } else { // arc
                    const passRadius = radius + offset;
                    if (passRadius <= 0) continue;

                    const startRad = startAngle * (Math.PI / 180);
                    const endRad = endAngle * (Math.PI / 180);

                    const passStartX = centerX + passRadius * Math.cos(startRad);
                    const passStartY = centerY + passRadius * Math.sin(startRad);
                    const passEndX = centerX + passRadius * Math.cos(endRad);
                    const passEndY = centerY + passRadius * Math.sin(endRad);

                    const gCodeArc = (endAngle > startAngle) ? 'G3' : 'G2';
                    const sweepFlag = (endAngle > startAngle) ? 1 : 0;
                    
                    const I = centerX - passStartX;
                    const J = centerY - passStartY;
                    
                    code.push(`G0 Z${safeZ}`);
                    code.push(`G0 X${passStartX.toFixed(3)} Y${passStartY.toFixed(3)}`);
                    code.push(`G1 Z${currentDepth.toFixed(3)} F${feed / 2}`);
                    code.push(`${gCodeArc} X${passEndX.toFixed(3)} Y${passEndY.toFixed(3)} I${I.toFixed(3)} J${J.toFixed(3)} F${feed}`);
                    
                    if (currentDepth === Math.max(depth, -depthPerPass)) {
                        const largeArcFlag = Math.abs(endAngle - startAngle) > 180 ? 1 : 0;
                        paths.push({ d: `M ${passStartX} ${passStartY} A ${passRadius} ${passRadius} 0 ${largeArcFlag} ${sweepFlag} ${passEndX} ${passEndY}`, stroke: 'var(--color-primary)', fill: 'none', strokeWidth: `${toolDiameter}%` });
                        // Simple bounding box for arc
                        updateBounds(centerX - passRadius, centerY - passRadius);
                        updateBounds(centerX + passRadius, centerY + passRadius);
                    }
                }
            }
        }

        code.push(`G0 Z${safeZ}`, `M5`);
        return { code, paths, bounds };
    };
    
    const generateTextCode = () => {
        const selectedTool = toolLibrary.find(t => t.id === textParams.toolId);
        if (!selectedTool) return { error: "Please select a tool." };

        const { text, font, height, spacing, startX, startY, alignment, depth, feed, spindle, safeZ } = textParams;
        if ([height, spacing, startX, startY, depth, feed, spindle, safeZ].some(p => p === '' || p === null) || !text) return { error: "Please fill all required fields." };

        const fontData = FONTS[font];
        if (!fontData) {
             return { error: `Font "${font}" not found.` };
        }

        const code = [];
        const paths = [];
        const FONT_BASE_HEIGHT = 7;
        const FONT_BASE_WIDTH = 5;

        const scale = height / FONT_BASE_HEIGHT;
        const charWidth = FONT_BASE_WIDTH * scale;
        const totalTextWidth = (text.length * charWidth) + Math.max(0, (text.length - 1) * spacing);

        let currentX = startX;
        if (alignment === 'center') {
            currentX -= totalTextWidth / 2;
        } else if (alignment === 'right') {
            currentX -= totalTextWidth;
        }

        const startOffsetX = currentX;

        code.push(`(--- Text Engraving ---)`);
        code.push(`(Tool: ${selectedTool.name})`);
        code.push(`(Text: ${text}, Font: ${font})`);
        code.push(`T${selectedTool.id} M6`);
        code.push(`G21 G90`);
        code.push(`M3 S${spindle}`);

        for (let i = 0; i < text.length; i++) {
            const char = text[i].toUpperCase();
            const charData = fontData.characters[char];
            
            if (charData) {
                if (fontData.type === 'stroke') {
                    for (const stroke of charData) {
                        const p1 = {
                            x: startOffsetX + i * (charWidth + spacing) + stroke.p1.x * scale,
                            y: startY + stroke.p1.y * scale
                        };
                        const p2 = {
                            x: startOffsetX + i * (charWidth + spacing) + stroke.p2.x * scale,
                            y: startY + stroke.p2.y * scale
                        };

                        code.push(`G0 Z${safeZ}`);
                        code.push(`G0 X${p1.x.toFixed(3)} Y${p1.y.toFixed(3)}`);
                        code.push(`G1 Z${depth.toFixed(3)} F${feed / 2}`);
                        code.push(`G1 X${p2.x.toFixed(3)} Y${p2.y.toFixed(3)} F${feed}`);
                        code.push(`G0 Z${safeZ}`);

                        paths.push({ d: `M${p1.x} ${p1.y} L${p2.x} ${p2.y}`, stroke: 'var(--color-primary)' });
                    }
                } else if (fontData.type === 'outline') {
                    for (const path of charData) {
                        if (path.length === 0) continue;

                        const scaledPath = path.map(p => ({
                           x: startOffsetX + i * (charWidth + spacing) + p.x * scale,
                           y: startY + p.y * scale
                        }));

                        code.push(`G0 Z${safeZ}`);
                        code.push(`G0 X${scaledPath[0].x.toFixed(3)} Y${scaledPath[0].y.toFixed(3)}`);
                        code.push(`G1 Z${depth.toFixed(3)} F${feed / 2}`);
                        
                        for (let j = 1; j < scaledPath.length; j++) {
                           code.push(`G1 X${scaledPath[j].x.toFixed(3)} Y${scaledPath[j].y.toFixed(3)} F${feed}`);
                        }
                        
                        if (scaledPath[0].x !== scaledPath[scaledPath.length-1].x || scaledPath[0].y !== scaledPath[scaledPath.length-1].y) {
                           code.push(`G1 X${scaledPath[0].x.toFixed(3)} Y${scaledPath[0].y.toFixed(3)} F${feed}`);
                        }
                        code.push(`G0 Z${safeZ}`);

                        const pathString = "M" + scaledPath.map(p => `${p.x} ${p.y}`).join(" L ") + " Z";
                        paths.push({ d: pathString, stroke: 'var(--color-primary)', 'strokeWidth': '1%', fill: 'none' });
                    }
                }
            }
        }

        code.push('M5');
        code.push(`G0 X${startX.toFixed(3)} Y${startY.toFixed(3)}`);
        
        const bounds = { minX: startOffsetX, maxX: startOffsetX + totalTextWidth, minY: startY, maxY: startY + height };
        
        return { code, paths, bounds };
    };

    const generateThreadMillingCode = () => {
        const selectedTool = toolLibrary.find(t => t.id === threadParams.toolId);
        if (!selectedTool) return { error: "Please select a tool." };
        const toolDiameter = selectedTool.diameter;

        const { type, hand, diameter, pitch, depth, feed, spindle, safeZ } = threadParams;
        if ([diameter, pitch, depth, feed, spindle, safeZ].some(p => p === '' || p === null || p <= 0)) {
            return { error: "Invalid Parameters. All values must be positive." };
        }
        if (toolDiameter >= diameter && type === 'internal') {
            return { error: "Tool diameter must be smaller than thread diameter for internal threads." };
        }

        const code = [
            `(--- Thread Milling Operation ---)`,
            `(Tool: ${selectedTool.name} - Ø${toolDiameter}${unit})`,
            `(Type: ${type}, Hand: ${hand})`,
            `(Diameter: ${diameter}, Pitch: ${pitch}, Depth: ${depth})`,
            `(Feed: ${feed}, Spindle: ${spindle})`,
            `T${selectedTool.id} M6`,
            `G21 G90`,
            `M3 S${spindle}`,
            `G0 Z${safeZ}`,
        ];
        const paths = [];

        const centerX = 0; // Assume centered at origin for simplicity
        const centerY = 0;
        
        let pathRadius, helicalDirection;

        // Climb milling logic
        if (type === 'internal') {
            pathRadius = (diameter - toolDiameter) / 2;
            helicalDirection = (hand === 'right') ? 'G3' : 'G2'; // CCW for RH internal climb
        } else { // external
            pathRadius = (diameter + toolDiameter) / 2;
            helicalDirection = (hand === 'right') ? 'G2' : 'G3'; // CW for RH external climb
        }
        
        if (pathRadius <= 0) return { error: "Invalid tool/thread diameter combination." };

        // Preview paths
        paths.push({ cx: centerX, cy: centerY, r: diameter / 2, stroke: 'var(--color-text-secondary)', strokeDasharray: '4 2', strokeWidth: '0.5%', fill: 'none' });
        paths.push({ cx: centerX, cy: centerY, r: pathRadius, stroke: 'var(--color-primary)', strokeWidth: '1%', fill: 'none' });

        if (type === 'internal') {
            const preDrillRadius = diameter - pitch; // Approximation for pre-drill size
            paths.push({ cx: centerX, cy: centerY, r: preDrillRadius / 2, stroke: 'var(--color-accent-yellow)', strokeDasharray: '2 2', strokeWidth: '0.5%', fill: 'none' });
        }
        
        const startX = centerX + pathRadius;

        // Start sequence (move to bottom and lead-in)
        code.push(`G0 X${centerX.toFixed(3)} Y${centerY.toFixed(3)}`);
        code.push(`G1 Z${(-depth).toFixed(3)} F${feed / 2}`);
        code.push(`G1 X${startX.toFixed(3)} F${feed}`); // Straight lead-in from center

        // Helical motion upwards (climb milling)
        let currentZ = -depth;
        while (currentZ < 0) {
            currentZ = Math.min(0, currentZ + pitch);
            code.push(`${helicalDirection} I${-pathRadius.toFixed(3)} J0 Z${currentZ.toFixed(3)} F${feed}`);
        }

        // Retract
        code.push(`G1 X${centerX.toFixed(3)} F${feed}`); // Straight lead-out to center
        code.push(`G0 Z${safeZ.toFixed(3)}`);
        code.push(`M5`);
        code.push(`G0 X0 Y0`);

        const boundsRadius = type === 'internal' ? diameter / 2 : pathRadius;
        const bounds = { minX: centerX - boundsRadius, maxX: centerX + boundsRadius, minY: centerY - boundsRadius, maxY: centerY + boundsRadius };
        
        return { code, paths, bounds };
    };
    
    const applyArrayPattern = (singleOpResult) => {
        const { code: singleCode, paths: singlePaths, bounds: singleBounds } = singleOpResult;
        const { pattern, rectCols, rectRows, rectSpacingX, rectSpacingY, circCopies, circRadius, circCenterX, circCenterY, circStartAngle } = arraySettings;
        const inputLines = singleCode;
        
        const transformLine = (line, offset) => {
            const upperLine = line.toUpperCase();
            if (!/G[0-3]\s/.test(upperLine) || (!upperLine.includes('X') && !upperLine.includes('Y'))) {
                 return line;
            }
             
            let transformed = line;
            transformed = transformed.replace(/X\s*([-+]?\d*\.?\d+)/i, (match, val) => `X${(parseFloat(val) + offset.x).toFixed(3)}`);
            transformed = transformed.replace(/Y\s*([-+]?\d*\.?\d+)/i, (match, val) => `Y${(parseFloat(val) + offset.y).toFixed(3)}`);
            
            return transformed;
        };
        
        const offsets = [];
        if (pattern === 'rect') {
            for (let row = 0; row < rectRows; row++) {
                for (let col = 0; col < rectCols; col++) {
                    offsets.push({ x: col * rectSpacingX, y: row * rectSpacingY });
                }
            }
        } else { // circ
            const angleStep = circCopies > 0 ? 360 / circCopies : 0;
            for (let i = 0; i < circCopies; i++) {
                const angle = (circStartAngle + i * angleStep) * (Math.PI / 180);
                offsets.push({
                    x: circCenterX + circRadius * Math.cos(angle),
                    y: circCenterY + circRadius * Math.sin(angle),
                });
            }
        }

        const finalCode = [];
        const finalPaths = [];
        const finalBounds = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity };
        
        offsets.forEach(offset => {
            finalCode.push(`(--- Repetition at X${offset.x.toFixed(3)} Y${offset.y.toFixed(3)} ---)`);
            inputLines.forEach(line => {
                // Don't transform metadata or tool changes
                if (line.startsWith('(') || /T\d+\s*M6/.test(line)) {
                    // Only add tool change once
                    if (!finalCode.includes(line)) finalCode.unshift(line);
                } else {
                    finalCode.push(transformLine(line, offset));
                }
            });

            singlePaths.forEach(p => {
                 let newPath = {...p};
                 if(p.d) { // path
                     newPath.d = p.d.replace(/([ML])(\s*[\d\.-]+)(\s*,?\s*)([\d\.-]+)/g, (match, cmd, x, sep, y) => {
                         return `${cmd} ${parseFloat(x) + offset.x} ${sep} ${parseFloat(y) + offset.y}`;
                     });
                 }
                 if(p.cx !== undefined) { // circle
                     newPath.cx = p.cx + offset.x;
                     newPath.cy = p.cy + offset.y;
                 }
                 finalPaths.push(newPath);
            });
            
            finalBounds.minX = Math.min(finalBounds.minX, singleBounds.minX + offset.x);
            finalBounds.maxX = Math.max(finalBounds.maxX, singleBounds.maxX + offset.x);
            finalBounds.minY = Math.min(finalBounds.minY, singleBounds.minY + offset.y);
            finalBounds.maxY = Math.max(finalBounds.maxY, singleBounds.maxY + offset.y);
        });

        return { code: finalCode, paths: finalPaths, bounds: finalBounds };
    };

    const handleGenerate = useCallback(() => {
        setGenerationError(null);
        let result = { code: [], paths: [], bounds: {}, error: null };
        if (activeTab === 'surfacing') result = generateSurfacingCode();
        else if (activeTab === 'drilling') result = generateDrillingCode();
        else if (activeTab === 'bore') result = generateBoreCode();
        else if (activeTab === 'pocket') result = generatePocketCode();
        else if (activeTab === 'profile') result = generateProfileCode();
        else if (activeTab === 'slot') result = generateSlotCode();
        else if (activeTab === 'text') result = generateTextCode();
        else if (activeTab === 'thread') result = generateThreadMillingCode();
        
        if (result.error) {
            setGenerationError(result.error);
            setGeneratedGCode('');
            setPreviewPaths({ paths: [], bounds: {} });
            return;
        }

        const showArray = !['surfacing', 'drilling'].includes(activeTab);
        if (showArray && arraySettings.isEnabled && result.code.length > 0) {
             result = applyArrayPattern(result);
        }

        setGeneratedGCode(result.code.join('\n'));
        setPreviewPaths({ paths: result.paths, bounds: result.bounds });
    }, [activeTab, surfaceParams, drillParams, drillType, boreParams, pocketParams, profileParams, slotParams, textParams, threadParams, toolLibrary, arraySettings]);
    
    if (!isOpen) return null;
    
    const ToolSelector = ({ selectedId, onChange, colSpan = 'col-span-full' }) => h('div', { className: colSpan },
        h('label', { className: 'block text-sm font-medium text-text-secondary mb-1' }, 'Tool'),
        h('select', {
            value: selectedId || '',
            onChange: e => onChange(e.target.value ? parseInt(e.target.value, 10) : null),
            className: 'w-full bg-background border-secondary rounded-md py-1 px-2 focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50',
            disabled: !toolLibrary || toolLibrary.length === 0
        },
            h('option', { value: '' }, toolLibrary && toolLibrary.length > 0 ? 'Select a tool...' : 'No tools in library'),
            toolLibrary && toolLibrary.map(tool => h('option', { key: tool.id, value: tool.id }, `${tool.name} (Ø ${tool.diameter}${unit})`))
        ),
        (!toolLibrary || toolLibrary.length === 0) && h('p', { className: 'text-xs text-text-secondary mt-1' },
            'Add tools in the Tool Library to enable generation.'
        )
    );

    const ArrayControls = ({ settings, onChange }) => {
        const handleToggle = (e) => {
            onChange({ ...settings, isEnabled: e.target.checked });
        };
    
        const isVisible = !['surfacing', 'drilling'].includes(activeTab);
        if (!isVisible) return null;

        return h('div', { className: 'bg-background/50 p-4 rounded-md' },
            h('label', { className: 'flex items-center gap-2 cursor-pointer font-semibold text-text-primary' },
                h('input', {
                    type: 'checkbox',
                    checked: settings.isEnabled,
                    onChange: handleToggle,
                    className: 'h-4 w-4 rounded border-secondary text-primary focus:ring-primary'
                }),
                'Enable Array Pattern'
            ),
            settings.isEnabled && h('div', { className: 'mt-4 pt-4 border-t border-secondary space-y-4' },
                h(RadioGroup, { options: [{ value: 'rect', label: 'Rectangular Grid' }, { value: 'circ', label: 'Circular Array' }], selected: settings.pattern, onChange: val => onChange({ ...settings, pattern: val }) }),
                settings.pattern === 'rect' ? h(React.Fragment, null,
                    h(Input, { label: 'Columns, Rows', valueX: settings.rectCols, valueY: settings.rectRows, onChangeX: e => handleParamChange(onChange, settings, 'rectCols', e.target.value), onChangeY: e => handleParamChange(onChange, settings, 'rectRows', e.target.value), isXY: true }),
                    h(Input, { label: 'Spacing (X, Y)', valueX: settings.rectSpacingX, valueY: settings.rectSpacingY, onChangeX: e => handleParamChange(onChange, settings, 'rectSpacingX', e.target.value), onChangeY: e => handleParamChange(onChange, settings, 'rectSpacingY', e.target.value), isXY: true, unit }),
                ) : h(React.Fragment, null,
                    h(Input, { label: 'Number of Copies', value: settings.circCopies, onChange: e => handleParamChange(onChange, settings, 'circCopies', e.target.value) }),
                    h(Input, { label: 'Center (X, Y)', valueX: settings.circCenterX, valueY: settings.circCenterY, onChangeX: e => handleParamChange(onChange, settings, 'circCenterX', e.target.value), onChangeY: e => handleParamChange(onChange, settings, 'circCenterY', e.target.value), isXY: true, unit }),
                    h(Input, { label: 'Radius', value: settings.circRadius, onChange: e => handleParamChange(onChange, settings, 'circRadius', e.target.value), unit }),
                    h(Input, { label: 'Start Angle', value: settings.circStartAngle, onChange: e => handleParamChange(onChange, settings, 'circStartAngle', e.target.value), unit: '°' }),
                )
            )
        );
    };

    const SpindleAndFeedControls = ({ params, onParamChange, feedLabel = 'Feed Rate', plunge, plungeLabel = 'Plunge Rate' }) => h(React.Fragment, null,
        h('hr', { className: 'border-secondary' }),
        h('div', { className: 'grid grid-cols-2 gap-4' },
            h(Input, { label: feedLabel, value: params.feed, onChange: e => onParamChange('feed', e.target.value), unit: unit + '/min' }),
            h(Input, { label: 'Spindle Speed', value: params.spindle, onChange: e => onParamChange('spindle', e.target.value), unit: 'RPM' })
        ),
        plunge && h(Input, { label: plungeLabel, value: params.plungeFeed, onChange: e => onParamChange('plungeFeed', e.target.value), unit: unit + '/min' }),
        h(Input, { label: 'Safe Z', value: params.safeZ, onChange: e => onParamChange('safeZ', e.target.value), unit, help: 'Rapid height above stock' }),
    );

    const renderSurfaceForm = () => h('div', { className: 'space-y-4' },
        h(ToolSelector, { selectedId: surfaceParams.toolId, onChange: (id) => setSurfaceParams(p => ({ ...p, toolId: id })) }),
        h('hr', { className: 'border-secondary' }),
        h('div', { className: 'grid grid-cols-2 gap-4' },
             h(Input, { label: `Width (X)`, value: surfaceParams.width, onChange: e => handleParamChange(setSurfaceParams, surfaceParams, 'width', e.target.value), unit }),
             h(Input, { label: `Length (Y)`, value: surfaceParams.length, onChange: e => handleParamChange(setSurfaceParams, surfaceParams, 'length', e.target.value), unit })
        ),
        h(Input, { label: 'Final Depth', value: surfaceParams.depth, onChange: e => handleParamChange(setSurfaceParams, surfaceParams, 'depth', e.target.value), unit, help: 'Should be negative' }),
        h(Input, { label: 'Stepover', value: surfaceParams.stepover, onChange: e => handleParamChange(setSurfaceParams, surfaceParams, 'stepover', e.target.value), unit: '%' }),
        h(SpindleAndFeedControls, { params: surfaceParams, onParamChange: (field, value) => handleParamChange(setSurfaceParams, surfaceParams, field, value) })
    );
    
    const renderDrillForm = () => h('div', { className: 'space-y-4' },
        h(ToolSelector, { selectedId: drillParams.toolId, onChange: (id) => setDrillParams(p => ({ ...p, toolId: id })) }),
        h('hr', { className: 'border-secondary' }),
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
        h(SpindleAndFeedControls, { params: drillParams, feedLabel: "Drill Feed", onParamChange: (field, value) => handleParamChange(setDrillParams, drillParams, field, value) })
    );
    
    const renderBoreForm = () => h('div', { className: 'space-y-4' },
        h(ToolSelector, { selectedId: boreParams.toolId, onChange: (id) => setBoreParams(p => ({ ...p, toolId: id })) }),
        h('hr', { className: 'border-secondary' }),
        h(Input, { label: 'Center Point (X, Y)', valueX: boreParams.centerX, valueY: boreParams.centerY, onChangeX: e => handleParamChange(setBoreParams, boreParams, 'centerX', e.target.value), onChangeY: e => handleParamChange(setBoreParams, boreParams, 'centerY', e.target.value), isXY: true, unit }),
        h('div', { className: 'grid grid-cols-2 gap-4' },
             h(Input, { label: `Hole Diameter`, value: boreParams.holeDiameter, onChange: e => handleParamChange(setBoreParams, boreParams, 'holeDiameter', e.target.value), unit }),
             h(Input, { label: `Hole Depth`, value: boreParams.holeDepth, onChange: e => handleParamChange(setBoreParams, boreParams, 'holeDepth', e.target.value), unit, help: 'Negative value' })
        ),
         h('hr', { className: 'border-secondary' }),
        h('label', { className: 'flex items-center gap-2 cursor-pointer font-semibold' },
            h('input', { type: 'checkbox', checked: boreParams.counterboreEnabled, onChange: e => setBoreParams(p => ({ ...p, counterboreEnabled: e.target.checked })), className: 'h-4 w-4 rounded border-secondary text-primary' }),
            'Add Counterbore'
        ),
        boreParams.counterboreEnabled && h('div', { className: 'grid grid-cols-2 gap-4 pl-6' },
             h(Input, { label: `CB Diameter`, value: boreParams.cbDiameter, onChange: e => handleParamChange(setBoreParams, boreParams, 'cbDiameter', e.target.value), unit }),
             h(Input, { label: `CB Depth`, value: boreParams.cbDepth, onChange: e => handleParamChange(setBoreParams, boreParams, 'cbDepth', e.target.value), unit, help: 'Negative value' })
        ),
        h(SpindleAndFeedControls, { params: boreParams, onParamChange: (field, value) => handleParamChange(setBoreParams, boreParams, field, value), plunge: true })
    );

    const renderPocketForm = () => h('div', { className: 'space-y-4' },
        h(ToolSelector, { selectedId: pocketParams.toolId, onChange: (id) => setPocketParams(p => ({ ...p, toolId: id })) }),
        h('hr', { className: 'border-secondary' }),
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
        h(Input, { label: 'Stepover', value: pocketParams.stepover, onChange: e => handleParamChange(setPocketParams, pocketParams, 'stepover', e.target.value), unit: '%' }),
        h(SpindleAndFeedControls, { params: pocketParams, onParamChange: (field, value) => handleParamChange(setPocketParams, pocketParams, field, value), plunge: true }),
        h(ArrayControls, { settings: arraySettings, onChange: setArraySettings })
    );
    
    const renderProfileForm = () => h('div', { className: 'space-y-4' },
        h(ToolSelector, { selectedId: profileParams.toolId, onChange: (id) => setProfileParams(p => ({ ...p, toolId: id })) }),
        h('hr', { className: 'border-secondary' }),
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
        h(SpindleAndFeedControls, { params: profileParams, onParamChange: (field, value) => handleParamChange(setProfileParams, profileParams, field, value) }),
        h('hr', { className: 'border-secondary' }),
        h('label', { className: 'flex items-center gap-2 cursor-pointer' },
            h('input', { type: 'checkbox', checked: profileParams.tabsEnabled, onChange: e => setProfileParams(p => ({...p, tabsEnabled: e.target.checked})), className: 'h-4 w-4 rounded border-secondary text-primary' }),
            'Add Hold-down Tabs'
        ),
        profileParams.tabsEnabled && h('div', { className: 'grid grid-cols-3 gap-4 pl-6' },
             h(Input, { label: '# Tabs', value: profileParams.numTabs, onChange: e => handleParamChange(setProfileParams, profileParams, 'numTabs', e.target.value) }),
             h(Input, { label: 'Tab Width', value: profileParams.tabWidth, onChange: e => handleParamChange(setProfileParams, profileParams, 'tabWidth', e.target.value), unit }),
             h(Input, { label: 'Tab Height', value: profileParams.tabHeight, onChange: e => handleParamChange(setProfileParams, profileParams, 'tabHeight', e.target.value), unit, help: 'From bottom' })
        ),
        h(ArrayControls, { settings: arraySettings, onChange: setArraySettings })
    );

    const renderSlotForm = () => h('div', { className: 'space-y-4' },
        h(ToolSelector, { selectedId: slotParams.toolId, onChange: (id) => setSlotParams(p => ({ ...p, toolId: id })) }),
        h('hr', { className: 'border-secondary' }),
        h(RadioGroup, { options: [{ value: 'straight', label: 'Straight' }, { value: 'arc', label: 'Arc' }], selected: slotParams.type, onChange: val => setSlotParams(p => ({...p, type: val})) }),
        slotParams.type === 'straight' ? h(React.Fragment, null,
            h(Input, { label: 'Start Point (X, Y)', valueX: slotParams.startX, valueY: slotParams.startY, onChangeX: e => handleParamChange(setSlotParams, slotParams, 'startX', e.target.value), onChangeY: e => handleParamChange(setSlotParams, slotParams, 'startY', e.target.value), isXY: true, unit }),
            h(Input, { label: 'End Point (X, Y)', valueX: slotParams.endX, valueY: slotParams.endY, onChangeX: e => handleParamChange(setSlotParams, slotParams, 'endX', e.target.value), onChangeY: e => handleParamChange(setSlotParams, slotParams, 'endY', e.target.value), isXY: true, unit }),
        ) : h(React.Fragment, null,
            h(Input, { label: 'Center Point (X, Y)', valueX: slotParams.centerX, valueY: slotParams.centerY, onChangeX: e => handleParamChange(setSlotParams, slotParams, 'centerX', e.target.value), onChangeY: e => handleParamChange(setSlotParams, slotParams, 'centerY', e.target.value), isXY: true, unit }),
            h(Input, { label: 'Radius', value: slotParams.radius, onChange: e => handleParamChange(setSlotParams, slotParams, 'radius', e.target.value), unit }),
            h(Input, { label: 'Start, End Angle', valueX: slotParams.startAngle, valueY: slotParams.endAngle, onChangeX: e => handleParamChange(setSlotParams, slotParams, 'startAngle', e.target.value), onChangeY: e => handleParamChange(setSlotParams, slotParams, 'endAngle', e.target.value), isXY: true, unit: '°' }),
        ),
        h('hr', { className: 'border-secondary' }),
        h(Input, { label: 'Slot Width', value: slotParams.slotWidth, onChange: e => handleParamChange(setSlotParams, slotParams, 'slotWidth', e.target.value), unit }),
        h('div', { className: 'grid grid-cols-2 gap-4' },
            h(Input, { label: 'Total Depth', value: slotParams.depth, onChange: e => handleParamChange(setSlotParams, slotParams, 'depth', e.target.value), unit, help: 'Negative value' }),
            h(Input, { label: 'Depth per Pass', value: slotParams.depthPerPass, onChange: e => handleParamChange(setSlotParams, slotParams, 'depthPerPass', e.target.value), unit })
        ),
        h(SpindleAndFeedControls, { params: slotParams, onParamChange: (field, value) => handleParamChange(setSlotParams, slotParams, field, value) }),
        h(ArrayControls, { settings: arraySettings, onChange: setArraySettings })
    );
    
    const renderTextForm = () => h('div', { className: 'space-y-4' },
        h(ToolSelector, { selectedId: textParams.toolId, onChange: (id) => setTextParams(p => ({ ...p, toolId: id })) }),
        h('hr', { className: 'border-secondary' }),
        h('div', null,
            h('label', { className: 'block text-sm font-medium text-text-secondary mb-1' }, 'Font'),
            h('select', {
                value: textParams.font,
                onChange: e => setTextParams(p => ({...p, font: e.target.value})),
                className: 'w-full bg-background border-secondary rounded-md py-1 px-2 focus:outline-none focus:ring-1 focus:ring-primary'
            }, Object.keys(FONTS).map(name => h('option', { key: name, value: name }, name)))
        ),
        h('div', null,
            h('label', { className: 'block text-sm font-medium text-text-secondary mb-1' }, 'Text Content'),
            h('textarea', {
                value: textParams.text,
                onChange: e => setTextParams(p => ({ ...p, text: e.target.value })),
                rows: 2,
                className: 'w-full bg-background border-secondary rounded-md py-1 px-2 focus:outline-none focus:ring-1 focus:ring-primary font-mono uppercase'
            })
        ),
        h('div', { className: 'grid grid-cols-2 gap-4' },
            h(Input, { label: 'Char Height', value: textParams.height, onChange: e => handleParamChange(setTextParams, textParams, 'height', e.target.value), unit }),
            h(Input, { label: 'Char Spacing', value: textParams.spacing, onChange: e => handleParamChange(setTextParams, textParams, 'spacing', e.target.value), unit })
        ),
        h(RadioGroup, { label: 'Alignment', options: [{ value: 'left', label: 'Left' }, { value: 'center', label: 'Center' }, { value: 'right', label: 'Right' }], selected: textParams.alignment, onChange: val => setTextParams(p => ({...p, alignment: val})) }),
        h(Input, { label: 'Start Point (X, Y)', valueX: textParams.startX, valueY: textParams.startY, onChangeX: e => handleParamChange(setTextParams, textParams, 'startX', e.target.value), onChangeY: e => handleParamChange(setTextParams, textParams, 'startY', e.target.value), isXY: true, unit, help: 'Alignment reference point' }),
        h('hr', { className: 'border-secondary' }),
        h(Input, { label: 'Engraving Depth', value: textParams.depth, onChange: e => handleParamChange(setTextParams, textParams, 'depth', e.target.value), unit, help: 'Negative value' }),
        h(SpindleAndFeedControls, { params: textParams, onParamChange: (field, value) => handleParamChange(setTextParams, textParams, field, value) }),
        h(ArrayControls, { settings: arraySettings, onChange: setArraySettings })
    );

    const renderThreadMillingForm = () => h('div', { className: 'space-y-4' },
        h(ToolSelector, { selectedId: threadParams.toolId, onChange: (id) => setThreadParams(p => ({ ...p, toolId: id })) }),
        h('hr', { className: 'border-secondary' }),
        h(RadioGroup, { label: 'Type', options: [{ value: 'internal', label: 'Internal' }, { value: 'external', label: 'External' }], selected: threadParams.type, onChange: val => setThreadParams(p => ({...p, type: val})) }),
        h(RadioGroup, { label: 'Hand', options: [{ value: 'right', label: 'Right-Hand' }, { value: 'left', label: 'Left-Hand' }], selected: threadParams.hand, onChange: val => setThreadParams(p => ({...p, hand: val})) }),
        h('hr', { className: 'border-secondary' }),
        h('div', { className: 'grid grid-cols-2 gap-4' },
            h(Input, { label: 'Thread Diameter', value: threadParams.diameter, onChange: e => handleParamChange(setThreadParams, threadParams, 'diameter', e.target.value), unit, help: 'Major diameter' }),
            h(Input, { label: 'Pitch', value: threadParams.pitch, onChange: e => handleParamChange(setThreadParams, threadParams, 'pitch', e.target.value), unit, help: 'Distance between threads' })
        ),
        h(Input, { label: 'Thread Depth', value: threadParams.depth, onChange: e => handleParamChange(setThreadParams, threadParams, 'depth', e.target.value), unit, help: 'Length of thread' }),
        h(SpindleAndFeedControls, { params: threadParams, onParamChange: (field, value) => handleParamChange(setThreadParams, threadParams, field, value) }),
        h(ArrayControls, { settings: arraySettings, onChange: setArraySettings })
    );
    
    const getParamsForTab = (tab) => {
        switch(tab) {
            case 'surfacing': return surfaceParams;
            case 'drilling': return drillParams;
            case 'bore': return boreParams;
            case 'pocket': return pocketParams;
            case 'profile': return profileParams;
            case 'slot': return slotParams;
            case 'text': return textParams;
            case 'thread': return threadParams;
            default: return null;
        }
    }
    const currentParams = getParamsForTab(activeTab);
    const isLoadDisabled = !generatedGCode || (currentParams && currentParams.toolId === null) || !!generationError;

    const renderPreviewContent = () => {
        if (currentParams && currentParams.toolId === null) {
            return h('div', { className: 'aspect-square w-full bg-secondary rounded flex items-center justify-center p-4 text-center text-text-secondary' },
                'Please select a tool to generate a preview.'
            );
        }
        if (generationError) {
            return h('div', { className: 'aspect-square w-full bg-secondary rounded flex items-center justify-center p-4 text-center' },
                h('div', { className: 'text-accent-yellow' },
                    h(AlertTriangle, { className: 'w-10 h-10 mx-auto mb-2' }),
                    h('p', { className: 'font-bold' }, 'Generation Failed'),
                    h('p', { className: 'text-sm' }, generationError)
                )
            );
        }
        return h(Preview, { paths: previewPaths.paths, viewBox });
    };

    return h('div', { className: 'fixed inset-0 bg-background/80 backdrop-blur-sm z-40 flex items-center justify-center', onClick: onCancel },
        h('div', { className: 'bg-surface rounded-lg shadow-2xl w-full max-w-4xl border border-secondary transform transition-all max-h-[90vh] flex flex-col', onClick: e => e.stopPropagation() },
            h('div', { className: 'p-6 border-b border-secondary flex justify-between items-center' },
                h('h2', { className: 'text-2xl font-bold text-text-primary' }, 'G-Code Generator'),
                h('button', { onClick: onCancel, className: 'p-1 rounded-md text-text-secondary hover:text-text-primary' }, h(X, { className: 'w-6 h-6' }))
            ),
            h('div', { className: 'p-6 flex-grow grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto' },
                h('div', { className: 'space-y-4' },
                    h('div', { className: 'flex border-b border-secondary flex-wrap' },
                        h('div', { className: 'w-full text-xs text-text-secondary uppercase tracking-wider' }, 'Milling'),
                        h(Tab, { label: 'Surfacing', isActive: activeTab === 'surfacing', onClick: () => setActiveTab('surfacing') }),
                        h(Tab, { label: 'Drilling', isActive: activeTab === 'drilling', onClick: () => setActiveTab('drilling') }),
                        h(Tab, { label: 'Bore', isActive: activeTab === 'bore', onClick: () => setActiveTab('bore') }),
                        h(Tab, { label: 'Pocket', isActive: activeTab === 'pocket', onClick: () => setActiveTab('pocket') }),
                        h(Tab, { label: 'Profile', isActive: activeTab === 'profile', onClick: () => setActiveTab('profile') }),
                        h(Tab, { label: 'Slot', isActive: activeTab === 'slot', onClick: () => setActiveTab('slot') }),
                        h(Tab, { label: 'Thread', isActive: activeTab === 'thread', onClick: () => setActiveTab('thread') }),
                        h('div', { className: 'w-full text-xs text-text-secondary uppercase tracking-wider mt-2' }, 'Text & Engraving'),
                        h(Tab, { label: 'Text', isActive: activeTab === 'text', onClick: () => setActiveTab('text') })
                    ),
                    activeTab === 'surfacing' && renderSurfaceForm(),
                    activeTab === 'drilling' && renderDrillForm(),
                    activeTab === 'bore' && renderBoreForm(),
                    activeTab === 'pocket' && renderPocketForm(),
                    activeTab === 'profile' && renderProfileForm(),
                    activeTab === 'slot' && renderSlotForm(),
                    activeTab === 'text' && renderTextForm(),
                    activeTab === 'thread' && renderThreadMillingForm(),
                ),
                h('div', { className: 'bg-background p-4 rounded-md flex flex-col gap-4' },
                     h('div', { className: 'flex justify-between items-center border-b border-secondary pb-2 mb-2' },
                        h('h3', { className: 'font-bold' }, '2D Preview'),
                        h('div', { className: 'flex items-center gap-1' },
                            h('button', { onClick: () => handleZoom(1.5), title: 'Zoom Out', className: 'p-1.5 rounded-md hover:bg-secondary' }, h(ZoomOut, { className: 'w-5 h-5 text-text-secondary' })),
                            h('button', { onClick: () => handleZoom(1 / 1.5), title: 'Zoom In', className: 'p-1.5 rounded-md hover:bg-secondary' }, h(ZoomIn, { className: 'w-5 h-5 text-text-secondary' })),
                            h('button', { onClick: fitView, title: 'Fit to View', className: 'p-1.5 rounded-md hover:bg-secondary' }, h(Maximize, { className: 'w-5 h-5 text-text-secondary' }))
                        )
                    ),
                    renderPreviewContent(),
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
                    disabled: isLoadDisabled,
                    title: isLoadDisabled ? (generationError || 'Please select a tool') : 'Load G-Code',
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

const Preview = ({ paths, viewBox }) => {
    const [vbMinX, vbMinY, vbWidth, vbHeight] = viewBox.split(' ').map(parseFloat);

    const gridElements = [];
    const labelElements = [];
    const majorDim = Math.max(vbWidth, vbHeight);
    const magnitudes = [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000];
    const targetLines = 8;
    const roughSpacing = majorDim / targetLines;
    const spacing = magnitudes.find(m => m > roughSpacing) || magnitudes[magnitudes.length - 1];

    const gridLineStyle = { stroke: 'var(--color-secondary)', strokeWidth: '0.25%', vectorEffect: 'non-scaling-stroke' };
    const axisLineStyle = { stroke: 'var(--color-secondary-focus)', strokeWidth: '0.5%', vectorEffect: 'non-scaling-stroke' };
    const labelStyle = { fontSize: '4%', fill: 'var(--color-text-secondary)', vectorEffect: 'non-scaling-stroke' };

    if (spacing > 0 && isFinite(vbMinX) && isFinite(vbWidth)) {
        const startX = Math.floor(vbMinX / spacing) * spacing;
        for (let x = startX; x <= vbMinX + vbWidth; x += spacing) {
            gridElements.push(h('line', { key: `v-${x}`, x1: x, y1: vbMinY, x2: x, y2: vbMinY + vbHeight, ...gridLineStyle }));
             // Add labels along the top edge
            labelElements.push(h('text', {
                key: `lx-${x}`, x: x, y: vbMinY,
                transform: `scale(1, -1)`,
                style: { ...labelStyle, textAnchor: 'middle', dominantBaseline: 'hanging' }
            }, x.toFixed(0)));
        }
    }
    if (spacing > 0 && isFinite(vbMinY) && isFinite(vbHeight)) {
        const startY = Math.floor(vbMinY / spacing) * spacing;
        for (let y = startY; y <= vbMinY + vbHeight; y += spacing) {
            gridElements.push(h('line', { key: `h-${y}`, x1: vbMinX, y1: y, x2: vbMinX + vbWidth, y2: y, ...gridLineStyle }));
            const yFlipped = -y;
             // Add labels along the left edge
            labelElements.push(h('text', {
                key: `ly-${y}`, x: vbMinX, y: y,
                transform: `scale(1, -1)`,
                style: { ...labelStyle, textAnchor: 'start', dominantBaseline: 'middle' }
            }, yFlipped.toFixed(0)));
        }
    }
    
    // Y-Axis
    if (0 >= vbMinX && 0 <= vbMinX + vbWidth) {
        gridElements.push(h('line', { key: 'axis-y', x1: 0, y1: vbMinY, x2: 0, y2: vbMinY + vbHeight, ...axisLineStyle }));
    }
    // X-Axis
    if (0 >= vbMinY && 0 <= vbMinY + vbHeight) {
        gridElements.push(h('line', { key: 'axis-x', x1: vbMinX, y1: 0, x2: vbMinX + vbWidth, y2: 0, ...axisLineStyle }));
    }

    return h('div', { className: 'aspect-square w-full bg-secondary rounded' },
        h('svg', { viewBox, className: 'w-full h-full' },
             h('g', { transform: 'scale(1, -1)' },
                h('g', { key: 'grid-group' }, gridElements),
                h('g', { key: 'path-group' },
                    paths.map((p, i) => {
                        if (p.d) {
                            return h('path', { key: i, d: p.d, stroke: p.stroke, fill: p.fill || 'none', strokeWidth: p.strokeWidth || '1%', strokeDasharray: p.strokeDasharray, style: { vectorEffect: 'non-scaling-stroke' } });
                        }
                        if (p.cx !== undefined) {
                            return h('circle', { key: i, cx: p.cx, cy: p.cy, r: p.r, fill: p.fill || 'none', stroke: p.stroke, strokeWidth: p.strokeWidth || '1%', strokeDasharray: p.strokeDasharray, style: { vectorEffect: 'non-scaling-stroke' } });
                        }
                        return null;
                    })
                )
            ),
             h('g', { key: 'label-group' }, labelElements)
        )
    );
};


export default GCodeGeneratorModal;