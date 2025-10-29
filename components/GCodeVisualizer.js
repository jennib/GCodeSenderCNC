
import React, { useRef, useEffect, useState, useCallback, useImperativeHandle } from 'react';
import { parseGCode } from '../services/gcodeParser.js';

const drawSpindle = (ctx, scale, position) => {
    if (!position) return;

    ctx.save();
    
    const spindleRadius = 5 / scale; // Target a 5px radius
    const crosshairSize = 8 / scale; // Target an 8px crosshair radius

    // Outer circle
    ctx.strokeStyle = '#EF4444'; // accent-red
    ctx.fillStyle = 'rgba(239, 68, 68, 0.3)'; // semi-transparent red
    ctx.lineWidth = 1.5 / scale; // Keep line width consistent

    ctx.beginPath();
    ctx.arc(position.x, position.y, spindleRadius, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();

    // Crosshairs
    ctx.beginPath();
    ctx.lineWidth = 1 / scale;
    ctx.moveTo(position.x - crosshairSize, position.y);
    ctx.lineTo(position.x + crosshairSize, position.y);
    ctx.moveTo(position.x, position.y - crosshairSize);
    ctx.lineTo(position.x, position.y + crosshairSize);
    ctx.stroke();

    ctx.restore();
};


const GCodeVisualizer = React.forwardRef(({ gcodeLines, currentLine, unit }, ref) => {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const [parsedGCode, setParsedGCode] = useState(null);
    const [viewTransform, setViewTransform] = useState({ scale: 1, offsetX: 0, offsetY: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const [panStart, setPanStart] = useState({ x: 0, y: 0 });
    const [visualizerSpindlePosition, setVisualizerSpindlePosition] = useState({ x: 0, y: 0 });

    const fitToView = useCallback((bounds, canvasWidth, canvasHeight) => {
        if (!bounds || bounds.minX === Infinity) {
            setViewTransform({ scale: 10, offsetX: canvasWidth / 2, offsetY: canvasHeight / 2 });
            return;
        }

        const modelWidth = bounds.maxX - bounds.minX;
        const modelHeight = bounds.maxY - bounds.minY;

        if (modelWidth === 0 && modelHeight === 0) {
             setViewTransform({ scale: 10, offsetX: canvasWidth / 2 - bounds.minX * 10, offsetY: canvasHeight / 2 + bounds.minY * 10 });
             return;
        }

        const padding = 50;
        const scaleX = (canvasWidth - padding * 2) / (modelWidth || 1);
        const scaleY = (canvasHeight - padding * 2) / (modelHeight || 1);
        const scale = Math.min(scaleX, scaleY);

        const offsetX = (canvasWidth / 2) - ((bounds.minX + modelWidth / 2) * scale);
        const offsetY = (canvasHeight / 2) + ((bounds.minY + modelHeight / 2) * scale);

        setViewTransform({ scale, offsetX, offsetY });
    }, []);
    
    useImperativeHandle(ref, () => ({
        fitView: () => {
            if (containerRef.current && parsedGCode) {
                const { width, height } = containerRef.current.getBoundingClientRect();
                fitToView(parsedGCode.bounds, width, height);
            }
        }
    }));

    const drawOrigin = (ctx, width, height) => {
        ctx.save();
        const originX = 30;
        const originY = height - 30;
        const axisLength = 20;

        ctx.strokeStyle = '#EF4444'; // Red for X
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(originX, originY);
        ctx.lineTo(originX + axisLength, originY);
        ctx.stroke();
        ctx.fillStyle = '#F1F5F9';
        ctx.font = '12px sans-serif';
        ctx.fillText('X', originX + axisLength + 5, originY + 4);

        ctx.strokeStyle = '#10B981'; // Green for Y
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(originX, originY);
        ctx.lineTo(originX, originY - axisLength);
        ctx.stroke();
        ctx.fillText('Y', originX - 4, originY - axisLength - 5);

        ctx.restore();
    };

    const drawScaleBar = (ctx, width, height, scale, unit) => {
        if (scale <= 0) return;
        ctx.save();
        
        const targetPixelWidth = 100;
        const realWidth = targetPixelWidth / scale;
        
        // Find a "nice" number for the scale bar length (e.g., 1, 2, 5, 10, 20, 50...)
        const magnitude = Math.pow(10, Math.floor(Math.log10(realWidth)));
        const residual = realWidth / magnitude;
        let niceNumber;
        if (residual > 5) niceNumber = 10 * magnitude;
        else if (residual > 2) niceNumber = 5 * magnitude;
        else if (residual > 1) niceNumber = 2 * magnitude;
        else niceNumber = magnitude;

        const barPixelWidth = niceNumber * scale;
        const barX = width - barPixelWidth - 20;
        const barY = height - 20;
        
        ctx.strokeStyle = '#F1F5F9';
        ctx.fillStyle = '#F1F5F9';
        ctx.lineWidth = 2;
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';

        ctx.beginPath();
        ctx.moveTo(barX, barY);
        ctx.lineTo(barX + barPixelWidth, barY);
        ctx.moveTo(barX, barY - 5);
        ctx.lineTo(barX, barY + 5);
        ctx.moveTo(barX + barPixelWidth, barY - 5);
        ctx.lineTo(barX + barPixelWidth, barY + 5);
        ctx.stroke();
        
        const label = niceNumber < 1 ? niceNumber.toPrecision(1) : niceNumber.toLocaleString();
        ctx.fillText(`${label} ${unit}`, barX + barPixelWidth / 2, barY - 10);
        
        ctx.restore();
    };

    const drawWorkOrigin = (ctx, scale) => {
        ctx.save();
        const crosshairSize = 10 / scale;
        ctx.strokeStyle = '#F59E0B'; // accent-yellow
        ctx.lineWidth = 1 / scale;
        
        // Circle
        ctx.beginPath();
        ctx.arc(0, 0, crosshairSize / 2, 0, 2 * Math.PI);
        ctx.stroke();
        
        // Lines
        ctx.beginPath();
        ctx.moveTo(-crosshairSize, 0);
        ctx.lineTo(crosshairSize, 0);
        ctx.moveTo(0, -crosshairSize);
        ctx.lineTo(0, crosshairSize);
        ctx.stroke();

        ctx.restore();
    };

    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas || !parsedGCode) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        const { scale, offsetX, offsetY } = viewTransform;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw G-Code and Work Origin
        ctx.save();
        ctx.translate(offsetX, offsetY);
        ctx.scale(scale, -scale);

        drawWorkOrigin(ctx, scale);

        parsedGCode.segments.forEach((segment, index) => {
            const isExecuted = index < currentLine;
            ctx.beginPath();
            ctx.moveTo(segment.start.x, segment.start.y);

            if (segment.type === 'G0') {
                ctx.strokeStyle = isExecuted ? '#0D9488' : '#475569';
                ctx.setLineDash([2 / scale, 2 / scale]);
                ctx.lineWidth = 1 / scale;
                ctx.lineTo(segment.end.x, segment.end.y);
            } else if (segment.type === 'G1') {
                ctx.strokeStyle = isExecuted ? '#10B981' : '#94A3B8';
                ctx.setLineDash([]);
                ctx.lineWidth = 1.5 / scale;
                ctx.lineTo(segment.end.x, segment.end.y);
            } else if ((segment.type === 'G2' || segment.type === 'G3') && segment.center) {
                const radius = Math.sqrt(
                    Math.pow(segment.start.x - segment.center.x, 2) + 
                    Math.pow(segment.start.y - segment.center.y, 2)
                );
                const startAngle = Math.atan2(segment.start.y - segment.center.y, segment.start.x - segment.center.x);
                const endAngle = Math.atan2(segment.end.y - segment.center.y, segment.end.x - segment.center.x);

                ctx.strokeStyle = isExecuted ? '#10B981' : '#94A3B8';
                ctx.setLineDash([]);
                ctx.lineWidth = 1.5 / scale;
                ctx.arc(segment.center.x, segment.center.y, radius, startAngle, endAngle, !segment.clockwise);
            }
            ctx.stroke();
        });

        // Draw spindle on top of the path
        drawSpindle(ctx, scale, visualizerSpindlePosition);

        ctx.restore();

        // Draw Overlays
        drawOrigin(ctx, canvas.width, canvas.height);
        drawScaleBar(ctx, canvas.width, canvas.height, viewTransform.scale, unit);

    }, [parsedGCode, currentLine, viewTransform, unit, visualizerSpindlePosition]);
    
    useEffect(() => {
        const parsed = parseGCode(gcodeLines);
        setParsedGCode(parsed);
        setVisualizerSpindlePosition({ x: 0, y: 0 }); // Reset position on new file
        if (canvasRef.current && containerRef.current) {
            const { width, height } = containerRef.current.getBoundingClientRect();
            fitToView(parsed.bounds, width, height);
        }
    }, [gcodeLines, fitToView]);

    useEffect(() => {
        if (!parsedGCode || currentLine <= 0 || currentLine > parsedGCode.segments.length) {
            setVisualizerSpindlePosition({ x: 0, y: 0 });
            return;
        }
        const lastSegment = parsedGCode.segments[currentLine - 1];
        if (lastSegment) {
            setVisualizerSpindlePosition(lastSegment.end);
        }
    }, [currentLine, parsedGCode]);


    useEffect(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;
        
        const resizeObserver = new ResizeObserver(() => {
            const { width, height } = container.getBoundingClientRect();
            canvas.width = width;
            canvas.height = height;
            draw();
        });
        
        resizeObserver.observe(container);
        draw();
        
        return () => resizeObserver.disconnect();

    }, [draw]);

    const handleMouseDown = (e) => {
        setIsPanning(true);
        setPanStart({ x: e.clientX - viewTransform.offsetX, y: e.clientY - viewTransform.offsetY });
    };

    const handleMouseMove = (e) => {
        if (isPanning) {
            setViewTransform(prev => ({
                ...prev,
                offsetX: e.clientX - panStart.x,
                offsetY: e.clientY - panStart.y,
            }));
        }
    };

    const handleMouseUpOrLeave = () => {
        setIsPanning(false);
    };

    const handleWheel = (e) => {
        e.preventDefault();
        const scaleAmount = 1.1;
        const newScale = e.deltaY < 0 ? viewTransform.scale * scaleAmount : viewTransform.scale / scaleAmount;

        const rect = canvasRef.current.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const newOffsetX = mouseX - (mouseX - viewTransform.offsetX) * (newScale / viewTransform.scale);
        const newOffsetY = mouseY - (mouseY - viewTransform.offsetY) * (newScale / viewTransform.scale);

        setViewTransform({ scale: newScale, offsetX: newOffsetX, offsetY: newOffsetY });
    };
    
    return React.createElement('div', { ref: containerRef, className: "w-full h-full bg-background rounded cursor-grab active:cursor-grabbing" },
        React.createElement('canvas', {
            ref: canvasRef,
            onMouseDown: handleMouseDown,
            onMouseMove: handleMouseMove,
            onMouseUp: handleMouseUpOrLeave,
            onMouseLeave: handleMouseUpOrLeave,
            onWheel: handleWheel
        })
    );
});

export default GCodeVisualizer;
