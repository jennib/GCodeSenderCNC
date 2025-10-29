import React, { useRef, useEffect, useState, useCallback, useImperativeHandle } from 'react';
import { parseGCode } from '../services/gcodeParser.js';

// --- WebGL Helper Functions ---
const createShader = (gl, type, source) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
};

const createProgram = (gl, vertexShader, fragmentShader) => {
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('Unable to initialize the shader program: ' + gl.getProgramInfoLog(program));
        return null;
    }
    return program;
};

const vertexShaderSource = `
    attribute vec4 aVertexPosition;
    attribute vec4 aVertexColor;

    uniform mat4 uModelViewMatrix;
    uniform mat4 uProjectionMatrix;

    varying lowp vec4 vColor;

    void main(void) {
      gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
      vColor = aVertexColor;
    }
`;

const fragmentShaderSource = `
    varying lowp vec4 vColor;

    void main(void) {
      gl_FragColor = vColor;
    }
`;

// --- Matrix Math (gl-matrix simplified) ---
const mat4 = {
    create: () => new Float32Array(16),
    identity: (out) => { out.set([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]); return out; },
    multiply: (out, a, b) => {
        let a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
        let a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
        let a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
        let a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];
        let b0 = b[0], b1 = b[1], b2 = b[2], b3 = b[3];
        out[0] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
        out[1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
        out[2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
        out[3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
        b0 = b[4]; b1 = b[5]; b2 = b[6]; b3 = b[7];
        out[4] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
        out[5] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
        out[6] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
        out[7] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
        b0 = b[8]; b1 = b[9]; b2 = b[10]; b3 = b[11];
        out[8] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
        out[9] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
        out[10] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
        out[11] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
        b0 = b[12]; b1 = b[13]; b2 = b[14]; b3 = b[15];
        out[12] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
        out[13] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
        out[14] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
        out[15] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
        return out;
    },
    translate: (out, a, v) => {
        let x = v[0], y = v[1], z = v[2];
        out.set(a);
        out[12] = a[12] + a[0] * x + a[4] * y + a[8] * z;
        out[13] = a[13] + a[1] * x + a[5] * y + a[9] * z;
        out[14] = a[14] + a[2] * x + a[6] * y + a[10] * z;
        return out;
    },
    rotate: (out, a, rad, axis) => {
        let x = axis[0], y = axis[1], z = axis[2], len = Math.hypot(x,y,z);
        if (len < 1e-6) return null;
        len = 1 / len; x *= len; y *= len; z *= len;
        let s = Math.sin(rad), c = Math.cos(rad), t = 1 - c;
        let a00 = a[0], a01 = a[1], a02 = a[2];
        let a10 = a[4], a11 = a[5], a12 = a[6];
        let a20 = a[8], a21 = a[9], a22 = a[10];
        let b00 = x * x * t + c, b01 = y * x * t + z * s, b02 = z * x * t - y * s;
        let b10 = x * y * t - z * s, b11 = y * y * t + c, b12 = z * y * t + x * s;
        let b20 = x * z * t + y * s, b21 = y * z * t - x * s, b22 = z * z * t + c;
        out[0] = a00 * b00 + a10 * b01 + a20 * b02;
        out[1] = a01 * b00 + a11 * b01 + a21 * b02;
        out[2] = a02 * b00 + a12 * b01 + a22 * b02;
        out[4] = a00 * b10 + a10 * b11 + a20 * b12;
        out[5] = a01 * b10 + a11 * b11 + a21 * b12;
        out[6] = a02 * b10 + a12 * b11 + a22 * b12;
        out[8] = a00 * b20 + a10 * b21 + a20 * b22;
        out[9] = a01 * b20 + a11 * b21 + a21 * b22;
        out[10] = a02 * b20 + a12 * b21 + a22 * b22;
        if (a !== out) {
            out[3] = a[3]; out[7] = a[7]; out[11] = a[11];
            out[12] = a[12]; out[13] = a[13]; out[14] = a[14]; out[15] = a[15];
        }
        return out;
    },
    perspective: (out, fovy, aspect, near, far) => {
        const f = 1.0 / Math.tan(fovy / 2);
        out[0] = f / aspect; out[1] = 0; out[2] = 0; out[3] = 0;
        out[4] = 0; out[5] = f; out[6] = 0; out[7] = 0;
        out[8] = 0; out[9] = 0; out[11] = -1; out[12] = 0; out[13] = 0; out[15] = 0;
        if (far != null && far !== Infinity) {
            const nf = 1 / (near - far);
            out[10] = (far + near) * nf;
            out[14] = 2 * far * near * nf;
        } else {
            out[10] = -1;
            out[14] = -2 * near;
        }
        return out;
    },
    lookAt: (out, eye, center, up) => {
        let x0, x1, x2, y0, y1, y2, z0, z1, z2, len;
        z0 = eye[0] - center[0]; z1 = eye[1] - center[1]; z2 = eye[2] - center[2];
        len = 1 / Math.hypot(z0,z1,z2); z0 *= len; z1 *= len; z2 *= len;
        x0 = up[1] * z2 - up[2] * z1; x1 = up[2] * z0 - up[0] * z2; x2 = up[0] * z1 - up[1] * z0;
        len = 1 / Math.hypot(x0,x1,x2); x0 *= len; x1 *= len; x2 *= len;
        y0 = z1 * x2 - z2 * x1; y1 = z2 * x0 - z0 * x2; y2 = z0 * x1 - z1 * x0;
        out[0]=x0; out[1]=y0; out[2]=z0; out[3]=0;
        out[4]=x1; out[5]=y1; out[6]=z1; out[7]=0;
        out[8]=x2; out[9]=y2; out[10]=z2; out[11]=0;
        out[12]=-(x0*eye[0]+x1*eye[1]+x2*eye[2]);
        out[13]=-(y0*eye[0]+y1*eye[1]+y2*eye[2]);
        out[14]=-(z0*eye[0]+z1*eye[1]+z2*eye[2]);
        out[15]=1;
        return out;
    }
};

const GCodeVisualizer = React.forwardRef(({ gcodeLines, currentLine, hoveredLineIndex }, ref) => {
    const canvasRef = useRef(null);
    const glRef = useRef(null);
    const programInfoRef = useRef(null);
    const buffersRef = useRef(null);
    const requestRef = useRef();

    const [parsedGCode, setParsedGCode] = useState(null);
    const [camera, setCamera] = useState({
        target: [0, 0, 0],
        distance: 100,
        rotation: [Math.PI / 4, -Math.PI / 4] // [alpha, beta]
    });
    const mouseState = useRef({ isDown: false, lastPos: { x: 0, y: 0 }, button: 0 });

    const createToolModel = (position) => {
        const { x, y, z } = position;
        const toolHeight = 20;
        const toolRadius = 3;
        const holderHeight = 10;
        const holderRadius = 8;
        const vertices = [];
    
        const addQuad = (p1, p2, p3, p4) => vertices.push(...p1, ...p2, ...p3, ...p1, ...p3, ...p4);
    
        // Tip
        vertices.push(x, y, z, x - toolRadius, y, z + toolHeight, x + toolRadius, y, z + toolHeight);
    
        // Body (simplified cylinder)
        const sides = 8;
        for (let i = 0; i < sides; i++) {
            const a1 = (i / sides) * 2 * Math.PI;
            const a2 = ((i + 1) / sides) * 2 * Math.PI;
            const x1 = Math.cos(a1) * toolRadius;
            const z1 = Math.sin(a1) * toolRadius;
            const x2 = Math.cos(a2) * toolRadius;
            const z2 = Math.sin(a2) * toolRadius;
            addQuad(
                [x + x1, y + z1, z + toolHeight],
                [x + x2, y + z2, z + toolHeight],
                [x + x2, y + z2, z + toolHeight + holderHeight],
                [x + x1, y + z1, z + toolHeight + holderHeight]
            );
        }
    
        return {
            vertices: new Float32Array(vertices),
            colors: new Float32Array(Array(vertices.length / 3).fill([1.0, 0.2, 0.2, 1.0]).flat()) // Red
        };
    };

    const fitView = useCallback((bounds) => {
        if (!bounds || bounds.minX === Infinity) {
            setCamera(prev => ({ ...prev, target: [0,0,0], distance: 100 }));
            return;
        }

        const centerX = (bounds.minX + bounds.maxX) / 2;
        const centerY = (bounds.minY + bounds.maxY) / 2;
        const centerZ = (bounds.minZ + bounds.maxZ) / 2;

        const sizeX = bounds.maxX - bounds.minX;
        const sizeY = bounds.maxY - bounds.minY;
        const sizeZ = bounds.maxZ - bounds.minZ;
        const maxDim = Math.max(sizeX, sizeY, sizeZ);
        
        const distance = maxDim * 1.5; // Adjust multiplier for padding

        setCamera(prev => ({
            ...prev,
            target: [centerX, centerY, centerZ],
            distance: Math.max(distance, 20) // Ensure a minimum distance
        }));
    }, []);

    useImperativeHandle(ref, () => ({
        fitView: () => fitView(parsedGCode?.bounds),
        zoomIn: () => setCamera(c => ({...c, distance: c.distance / 1.5})),
        zoomOut: () => setCamera(c => ({...c, distance: c.distance * 1.5})),
    }));

    useEffect(() => {
        const parsed = parseGCode(gcodeLines);
        setParsedGCode(parsed);
        fitView(parsed.bounds);
    }, [gcodeLines, fitView]);

    useEffect(() => {
        const gl = glRef.current;
        if (!gl || !parsedGCode) return;

        const { segments } = parsedGCode;
        const vertices = [];
        const colors = [];

        const colorRapid = [0.28, 0.33, 0.41, 1.0]; // secondary
        const colorCut = [0.58, 0.64, 0.72, 1.0];   // text-secondary
        const colorExecutedRapid = [0.05, 0.58, 0.53, 1.0]; // primary
        const colorExecutedCut = [0.06, 0.72, 0.51, 1.0];  // accent-green
        const colorHighlight = [1.0, 1.0, 0.0, 1.0]; // Yellow

        segments.forEach((seg, i) => {
            let color;
            const isHovered = i === hoveredLineIndex;

            if (isHovered) {
                color = colorHighlight;
            } else if (i < currentLine) {
                color = seg.type === 'G0' ? colorExecutedRapid : colorExecutedCut;
            } else {
                color = seg.type === 'G0' ? colorRapid : colorCut;
            }

            if (seg.type === 'G2' || seg.type === 'G3') {
                const arcPoints = 20;
                const radius = Math.hypot(seg.start.x - seg.center.x, seg.start.y - seg.center.y);
                let startAngle = Math.atan2(seg.start.y - seg.center.y, seg.start.x - seg.center.x);
                let endAngle = Math.atan2(seg.end.y - seg.center.y, seg.end.x - seg.center.x);
                
                let angleDiff = endAngle - startAngle;
                if (seg.clockwise && angleDiff > 0) angleDiff -= 2 * Math.PI;
                if (!seg.clockwise && angleDiff < 0) angleDiff += 2 * Math.PI;

                for (let j = 0; j < arcPoints; j++) {
                    const p1_angle = startAngle + (j / arcPoints) * angleDiff;
                    const p2_angle = startAngle + ((j + 1) / arcPoints) * angleDiff;
                    const p1_z = seg.start.z + (seg.end.z - seg.start.z) * (j / arcPoints);
                    const p2_z = seg.start.z + (seg.end.z - seg.start.z) * ((j + 1) / arcPoints);

                    vertices.push(
                        seg.center.x + Math.cos(p1_angle) * radius, seg.center.y + Math.sin(p1_angle) * radius, p1_z,
                        seg.center.x + Math.cos(p2_angle) * radius, seg.center.y + Math.sin(p2_angle) * radius, p2_z
                    );
                    colors.push(...color, ...color);
                }
            } else { // G0, G1
                vertices.push(
                    seg.start.x, seg.start.y, seg.start.z,
                    seg.end.x, seg.end.y, seg.end.z
                );
                colors.push(...color, ...color);
            }
        });
        
        let toolModel = null;
        if(currentLine > 0 && currentLine <= segments.length){
            toolModel = createToolModel(segments[currentLine - 1].end);
        }

        const positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

        const colorBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);

        let toolPositionBuffer = null, toolColorBuffer = null;
        if (toolModel) {
            toolPositionBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, toolPositionBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, toolModel.vertices, gl.STATIC_DRAW);
            
            toolColorBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, toolColorBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, toolModel.colors, gl.STATIC_DRAW);
        }

        buffersRef.current = { 
            position: positionBuffer, 
            color: colorBuffer, 
            vertexCount: vertices.length / 3,
            toolPosition: toolPositionBuffer,
            toolColor: toolColorBuffer,
            toolVertexCount: toolModel ? toolModel.vertices.length / 3 : 0
        };

    }, [parsedGCode, currentLine, hoveredLineIndex]);

    const drawScene = useCallback(() => {
        const gl = glRef.current;
        const programInfo = programInfoRef.current;
        const buffers = buffersRef.current;

        if (!gl || !programInfo || !buffers) return;

        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        gl.clearColor(0.117, 0.16, 0.23, 1.0); // background color
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        const projectionMatrix = mat4.create();
        mat4.perspective(projectionMatrix, 45 * Math.PI / 180, gl.canvas.clientWidth / gl.canvas.clientHeight, 0.1, 10000);

        const viewMatrix = mat4.create();
        const eye = [
            camera.target[0] + camera.distance * Math.cos(camera.rotation[0]) * Math.cos(camera.rotation[1]),
            camera.target[1] + camera.distance * Math.sin(camera.rotation[1]),
            camera.target[2] + camera.distance * Math.sin(camera.rotation[0]) * Math.cos(camera.rotation[1])
        ];
        mat4.lookAt(viewMatrix, eye, camera.target, [0, 1, 0]);

        gl.useProgram(programInfo.program);
        gl.uniformMatrix4fv(programInfo.uniformLocations.projectionMatrix, false, projectionMatrix);
        gl.uniformMatrix4fv(programInfo.uniformLocations.modelViewMatrix, false, viewMatrix);
        
        // Draw Toolpath
        if (buffers.position) {
            gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
            gl.vertexAttribPointer(programInfo.attribLocations.vertexPosition, 3, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);

            gl.bindBuffer(gl.ARRAY_BUFFER, buffers.color);
            gl.vertexAttribPointer(programInfo.attribLocations.vertexColor, 4, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(programInfo.attribLocations.vertexColor);
            
            gl.drawArrays(gl.LINES, 0, buffers.vertexCount);
        }

        // Draw Tool
        if (buffers.toolPosition) {
             gl.bindBuffer(gl.ARRAY_BUFFER, buffers.toolPosition);
            gl.vertexAttribPointer(programInfo.attribLocations.vertexPosition, 3, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);

            gl.bindBuffer(gl.ARRAY_BUFFER, buffers.toolColor);
            gl.vertexAttribPointer(programInfo.attribLocations.vertexColor, 4, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(programInfo.attribLocations.vertexColor);

            gl.drawArrays(gl.TRIANGLES, 0, buffers.toolVertexCount);
        }

    }, [camera]);

    useEffect(() => {
        const canvas = canvasRef.current;
        const gl = canvas.getContext('webgl', { antialias: true });
        if (!gl) { console.error("WebGL not supported"); return; }
        glRef.current = gl;

        const vs = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
        const fs = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
        const program = createProgram(gl, vs, fs);

        programInfoRef.current = {
            program: program,
            attribLocations: {
                vertexPosition: gl.getAttribLocation(program, 'aVertexPosition'),
                vertexColor: gl.getAttribLocation(program, 'aVertexColor'),
            },
            uniformLocations: {
                projectionMatrix: gl.getUniformLocation(program, 'uProjectionMatrix'),
                modelViewMatrix: gl.getUniformLocation(program, 'uModelViewMatrix'),
            },
        };
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL);
        
        const handleResize = () => {
            canvas.width = canvas.clientWidth;
            canvas.height = canvas.clientHeight;
        };
        const resizeObserver = new ResizeObserver(handleResize);
        resizeObserver.observe(canvas);
        handleResize();

        return () => resizeObserver.disconnect();
    }, []);

    useEffect(() => {
        requestRef.current = requestAnimationFrame(drawScene);
        return () => cancelAnimationFrame(requestRef.current);
    }, [drawScene]);
    
    // --- Mouse Controls ---
    useEffect(() => {
        const canvas = canvasRef.current;
        const handleMouseDown = e => {
            mouseState.current = { isDown: true, lastPos: { x: e.clientX, y: e.clientY }, button: e.button };
        };
        const handleMouseUp = () => {
            mouseState.current.isDown = false;
        };
        const handleMouseMove = e => {
            if (!mouseState.current.isDown) return;
            const dx = e.clientX - mouseState.current.lastPos.x;
            const dy = e.clientY - mouseState.current.lastPos.y;

            if (mouseState.current.button === 0) { // Left-click: Rotate
                setCamera(c => {
                    const newRotation = [...c.rotation];
                    newRotation[0] -= dx * 0.01;
                    newRotation[1] -= dy * 0.01;
                    newRotation[1] = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, newRotation[1]));
                    return { ...c, rotation: newRotation };
                });
            } else if (mouseState.current.button === 2) { // Right-click: Pan
                const factor = 0.1 * (camera.distance / 100);
                setCamera(c => {
                    const newTarget = [...c.target];
                    newTarget[0] += (dx * -Math.sin(c.rotation[0]) + dy * Math.cos(c.rotation[0])*Math.sin(c.rotation[1])) * factor;
                    newTarget[1] += dy * -Math.cos(c.rotation[1]) * factor;
                    newTarget[2] += (dx * Math.cos(c.rotation[0]) + dy * Math.sin(c.rotation[0])*Math.sin(c.rotation[1])) * factor;
                    return { ...c, target: newTarget };
                });
            }

            mouseState.current.lastPos = { x: e.clientX, y: e.clientY };
        };
        const handleWheel = e => {
            e.preventDefault();
            const scale = e.deltaY < 0 ? 0.8 : 1.2;
            setCamera(c => ({ ...c, distance: Math.max(1, c.distance * scale) }));
        };
        const handleContextMenu = e => e.preventDefault();
        
        canvas.addEventListener('mousedown', handleMouseDown);
        canvas.addEventListener('mouseup', handleMouseUp);
        canvas.addEventListener('mouseleave', handleMouseUp);
        canvas.addEventListener('mousemove', handleMouseMove);
        canvas.addEventListener('wheel', handleWheel);
        canvas.addEventListener('contextmenu', handleContextMenu);
        
        return () => {
            canvas.removeEventListener('mousedown', handleMouseDown);
            canvas.removeEventListener('mouseup', handleMouseUp);
            canvas.removeEventListener('mouseleave', handleMouseUp);
            canvas.removeEventListener('mousemove', handleMouseMove);
            canvas.removeEventListener('wheel', handleWheel);
            canvas.removeEventListener('contextmenu', handleContextMenu);
        };
    }, [camera]);


    return React.createElement('div', { className: "w-full h-full bg-background rounded cursor-grab active:cursor-grabbing" },
        React.createElement('canvas', { ref: canvasRef, className: "w-full h-full" })
    );
});

export default GCodeVisualizer;
