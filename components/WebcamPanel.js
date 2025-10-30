
import React, { useState, useRef, useEffect } from 'react';
import { Camera, CameraOff, AlertTriangle, PictureInPicture, Dock } from './Icons.js';

const h = React.createElement;

const WebcamPanel = () => {
    const [isWebcamOn, setIsWebcamOn] = useState(false);
    const [isInPiP, setIsInPiP] = useState(false);
    const [error, setError] = useState(null);
    const videoRef = useRef(null);
    const streamRef = useRef(null);

    const isPiPSupported = 'pictureInPictureEnabled' in document;

    const handleTogglePiP = async () => {
        if (!videoRef.current || !isPiPSupported) return;
        try {
            if (document.pictureInPictureElement) {
                await document.exitPictureInPicture();
            } else if (videoRef.current.srcObject) {
                await videoRef.current.requestPictureInPicture();
            }
        } catch (pipError) {
            console.error("PiP Error:", pipError);
            setError("Could not enter Picture-in-Picture mode.");
        }
    };
    
    const handleToggleWebcam = async () => {
        if (isWebcamOn && document.pictureInPictureElement) {
            await document.exitPictureInPicture();
        }
        setIsWebcamOn(prev => !prev);
    };

    useEffect(() => {
        const videoElement = videoRef.current;
        if (!videoElement) return;

        const onEnterPiP = () => setIsInPiP(true);
        const onLeavePiP = () => setIsInPiP(false);

        videoElement.addEventListener('enterpictureinpicture', onEnterPiP);
        videoElement.addEventListener('leavepictureinpicture', onLeavePiP);

        return () => {
            videoElement.removeEventListener('enterpictureinpicture', onEnterPiP);
            videoElement.removeEventListener('leavepictureinpicture', onLeavePiP);
        };
    }, []);

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

    const renderBody = () => {
        if (!isWebcamOn) {
            return null;
        }

        if (isInPiP) {
            return h('div', { className: 'aspect-video bg-background rounded-md flex flex-col items-center justify-center text-text-secondary' },
                h('p', { className: 'mb-4 font-semibold' }, 'Webcam is in Picture-in-Picture mode.'),
                h('button', {
                    onClick: handleTogglePiP,
                    className: 'flex items-center gap-2 px-4 py-2 bg-secondary text-white font-semibold rounded-md hover:bg-secondary-focus focus:outline-none focus:ring-2 focus:ring-primary'
                }, h(Dock, { className: 'w-5 h-5' }), 'Dock to Panel')
            );
        }

        return h('div', { className: 'aspect-video bg-background rounded-md overflow-hidden flex items-center justify-center' },
            error && h('div', { className: 'text-center text-accent-yellow p-4' },
                h(AlertTriangle, { className: 'w-8 h-8 mx-auto mb-2' }),
                h('p', { className: 'text-sm font-semibold' }, error)
            ),
            !error && h('video', {
                ref: videoRef,
                autoPlay: true,
                playsInline: true,
                muted: true,
                className: 'w-full h-full object-cover'
            })
        );
    };

    return h('div', { className: 'bg-surface rounded-lg shadow-lg p-4' },
        h('div', { className: `text-lg font-bold flex items-center justify-between ${isWebcamOn ? 'pb-4 border-b border-secondary mb-4' : ''}` },
            h('div', { className: 'flex items-center gap-2' },
                isWebcamOn ? h(Camera, { className: 'w-5 h-5 text-primary' }) : h(CameraOff, { className: 'w-5 h-5 text-text-secondary' }),
                "Webcam"
            ),
            h('div', { className: 'flex items-center gap-2' },
                (isWebcamOn && isPiPSupported && !isInPiP) && h('button', {
                    onClick: handleTogglePiP,
                    title: 'Picture-in-Picture',
                    className: 'p-1 rounded-md text-text-secondary hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-primary',
                }, h(PictureInPicture, { className: 'w-5 h-5' })),

                h('button', {
                    onClick: handleToggleWebcam,
                    className: `flex items-center gap-2 px-3 py-1 ${isWebcamOn ? 'bg-accent-red hover:bg-red-700' : 'bg-secondary hover:bg-secondary-focus'} text-white font-semibold rounded-md focus:outline-none focus:ring-2 focus:ring-primary transition-colors text-sm`,
                },
                    isWebcamOn ? h(CameraOff, { className: 'w-4 h-4' }) : h(Camera, { className: 'w-4 h-4' }),
                    isWebcamOn ? 'Disable' : 'Enable'
                )
            )
        ),
        renderBody()
    );
};

export default WebcamPanel;
