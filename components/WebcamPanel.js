import React, { useState, useRef, useEffect } from 'react';
import { Camera, CameraOff, AlertTriangle } from './Icons.js';

const h = React.createElement;

const WebcamPanel = () => {
    const [isWebcamOn, setIsWebcamOn] = useState(false);
    const [error, setError] = useState(null);
    const videoRef = useRef(null);
    const streamRef = useRef(null);

    useEffect(() => {
        const startWebcam = async () => {
            try {
                if (streamRef.current) {
                    streamRef.current.getTracks().forEach(track => track.stop());
                }
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                streamRef.current = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
                setError(null);
            } catch (err) {
                console.error("Webcam Error:", err);
                if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                    setError("Webcam access denied. Please allow camera permissions in your browser settings.");
                } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
                    setError("No webcam found. Please connect a camera and try again.");
                } else {
                    setError("Could not access webcam.");
                }
                setIsWebcamOn(false);
            }
        };

        const stopWebcam = () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
                streamRef.current = null;
            }
             if (videoRef.current) {
                videoRef.current.srcObject = null;
            }
        };

        if (isWebcamOn) {
            startWebcam();
        } else {
            stopWebcam();
        }

        return () => {
            stopWebcam();
        };
    }, [isWebcamOn]);

    return h('div', { className: 'bg-surface rounded-lg shadow-lg p-4' },
        h('div', { className: 'text-lg font-bold mb-4 pb-4 border-b border-secondary flex items-center justify-between' },
            h('div', { className: 'flex items-center gap-2' },
                isWebcamOn ? h(Camera, { className: 'w-5 h-5 text-primary' }) : h(CameraOff, { className: 'w-5 h-5 text-text-secondary' }),
                "Webcam"
            ),
            h('button', {
                onClick: () => setIsWebcamOn(prev => !prev),
                className: `flex items-center gap-2 px-3 py-1 ${isWebcamOn ? 'bg-accent-red hover:bg-red-700' : 'bg-secondary hover:bg-secondary-focus'} text-white font-semibold rounded-md focus:outline-none focus:ring-2 focus:ring-primary transition-colors text-sm`,
            },
                isWebcamOn ? h(CameraOff, { className: 'w-4 h-4' }) : h(Camera, { className: 'w-4 h-4' }),
                isWebcamOn ? 'Disable' : 'Enable'
            )
        ),
        h('div', { className: 'aspect-video bg-background rounded-md overflow-hidden flex items-center justify-center' },
            error && h('div', { className: 'text-center text-accent-yellow p-4' },
                h(AlertTriangle, { className: 'w-8 h-8 mx-auto mb-2' }),
                h('p', { className: 'text-sm font-semibold' }, error)
            ),
            !error && h('video', {
                ref: videoRef,
                autoPlay: true,
                playsInline: true,
                muted: true,
                className: `w-full h-full object-cover ${!isWebcamOn ? 'hidden' : ''}`
            })
        )
    );
};

export default WebcamPanel;
