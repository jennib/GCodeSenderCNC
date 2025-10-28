import React, { useState, useRef, useEffect } from 'react';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Home, Pin, ChevronDown } from './Icons.js';

const h = React.createElement;

const formatCoordinate = (val) => val?.toFixed(3) ?? '0.000';

const PositionDisplay = ({ title, pos, unit }) => h('div', null,
    h('h4', { className: "text-sm font-bold text-text-secondary mb-1" }, title),
    h('div', { className: "grid grid-cols-3 gap-2 text-center font-mono bg-background p-2 rounded-md" },
        h('div', null, h('span', { className: "font-bold text-red-400" }, "X "), `${formatCoordinate(pos?.x)}`, h('span', { className: 'text-xs text-text-secondary ml-1' }, unit)),
        h('div', null, h('span', { className: "font-bold text-green-400" }, "Y "), `${formatCoordinate(pos?.y)}`, h('span', { className: 'text-xs text-text-secondary ml-1' }, unit)),
        h('div', null, h('span', { className: "font-bold text-blue-400" }, "Z "), `${formatCoordinate(pos?.z)}`, h('span', { className: 'text-xs text-text-secondary ml-1' }, unit))
    )
);


const JogButton = ({ onClick, children, className = '', title, disabled = false, isFlashing = false }) => h('button', {
    title: title,
    onClick: onClick,
    disabled: disabled,
    className: `flex items-center justify-center p-4 bg-secondary text-white font-bold rounded-md hover:bg-secondary-focus focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface transition-all duration-100 disabled:bg-background disabled:text-text-secondary disabled:cursor-not-allowed ${isFlashing ? 'ring-2 ring-primary ring-inset' : ''} ${className}`
}, children);

const MenuItem = ({ onClick, children }) => h('button', {
    onClick: onClick,
    className: "w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-primary transition-colors"
}, children);

const UnitToggle = ({ unit, onUnitChange, disabled }) => h('div', { className: "flex bg-background rounded-md p-1" },
    h('button', {
        onClick: () => onUnitChange('mm'),
        disabled,
        className: `px-4 py-1 text-sm font-semibold rounded ${unit === 'mm' ? 'bg-primary text-white' : 'hover:bg-secondary-focus'} transition-colors disabled:opacity-50`
    }, "mm"),
    h('button', {
        onClick: () => onUnitChange('in'),
        disabled,
        className: `px-4 py-1 text-sm font-semibold rounded ${unit === 'in' ? 'bg-primary text-white' : 'hover:bg-secondary-focus'} transition-colors disabled:opacity-50`
    }, "in")
);

const JogPanelControls = React.memo(({ isConnected, onJog, onHome, onSetZero, jogStep, onStepChange, flashingButton, unit, onUnitChange }) => {
    const [isHomeMenuOpen, setIsHomeMenuOpen] = useState(false);
    const [isZeroMenuOpen, setIsZeroMenuOpen] = useState(false);
    const homeMenuRef = useRef(null);
    const zeroMenuRef = useRef(null);
    
    const mmStepSizes = [0.01, 0.1, 1, 10, 50];
    const inStepSizes = [0.001, 0.01, 0.1, 1, 2];
    const stepSizes = unit === 'mm' ? mmStepSizes : inStepSizes;


    useEffect(() => {
        const handleClickOutside = (event) => {
            if (homeMenuRef.current && !homeMenuRef.current.contains(event.target)) {
                setIsHomeMenuOpen(false);
            }
            if (zeroMenuRef.current && !zeroMenuRef.current.contains(event.target)) {
                setIsZeroMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const zStepLimit = unit === 'mm' ? 10 : 0.4;
    const isZJogDisabled = jogStep > zStepLimit;

    return h(React.Fragment, null,
        h('div', { className: "flex justify-between items-end"},
            h('div', null,
                h('h4', { className: "text-sm font-bold text-text-secondary mb-2" }, `Step Size (${unit})`),
                h('div', { className: "grid grid-cols-5 gap-2" },
                    stepSizes.map((size, index) => {
                        const id = `step-${size}`;
                        const isFlashing = flashingButton === id;
                        return h('button', {
                            key: size,
                            title: `Set step size to ${size}${unit} (Hotkey: ${index + 1})`,
                            onClick: () => onStepChange(size),
                            disabled: !isConnected,
                            className: `py-2 px-4 text-sm font-semibold rounded-md transition-all duration-100 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface disabled:cursor-not-allowed disabled:bg-background disabled:text-text-secondary ${jogStep === size ? 'bg-primary text-white' : 'bg-secondary text-white hover:bg-secondary-focus'} ${isFlashing ? 'ring-2 ring-primary ring-inset' : ''}`
                        }, size)
                    })
                )
            ),
             h(UnitToggle, { unit: unit, onUnitChange: onUnitChange, disabled: !isConnected })
        ),
        h('div', { className: "grid grid-cols-3 gap-4 items-center" },
            h('div', { className: "col-span-2 flex justify-center items-center" },
                 h('div', { className: "grid grid-cols-3 grid-rows-3 gap-2 w-64" },
                    h('div', { className: "col-start-2 row-start-1" },
                        h(JogButton, { title: `Y+ ${jogStep}${unit} (ArrowUp)`, onClick: () => onJog('Y', 1, jogStep), disabled: !isConnected, isFlashing: flashingButton === 'jog-y-plus' }, h(ArrowUp, { className: "w-8 h-8" }))
                    ),
                    h('div', { className: "col-start-1 row-start-2" },
                        h(JogButton, { title: `X- ${jogStep}${unit} (ArrowLeft)`, onClick: () => onJog('X', -1, jogStep), disabled: !isConnected, isFlashing: flashingButton === 'jog-x-minus' }, h(ArrowLeft, { className: "w-8 h-8" }))
                    ),
                    h('div', { className: "col-start-3 row-start-2" },
                        h(JogButton, { title: `X+ ${jogStep}${unit} (ArrowRight)`, onClick: () => onJog('X', 1, jogStep), disabled: !isConnected, isFlashing: flashingButton === 'jog-x-plus' }, h(ArrowRight, { className: "w-8 h-8" }))
                    ),
                    h('div', { className: "col-start-2 row-start-3" },
                        h(JogButton, { title: `Y- ${jogStep}${unit} (ArrowDown)`, onClick: () => onJog('Y', -1, jogStep), disabled: !isConnected, isFlashing: flashingButton === 'jog-y-minus' }, h(ArrowDown, { className: "w-8 h-8" }))
                    )
                )
            ),
            h('div', { className: "flex flex-col gap-2" },
                h(JogButton, { title: isZJogDisabled ? `Z-axis step limited to ${zStepLimit}${unit}` : `Z+ ${jogStep}${unit} (PageUp)`, onClick: () => onJog('Z', 1, jogStep), disabled: !isConnected || isZJogDisabled, isFlashing: flashingButton === 'jog-z-plus' }, h(ArrowUp, { className: "w-8 h-8" })),
                h('div', { className: "text-center font-bold text-lg" }, "Z"),
                h(JogButton, { title: isZJogDisabled ? `Z-axis step limited to ${zStepLimit}${unit}` : `Z- ${jogStep}${unit} (PageDown)`, onClick: () => onJog('Z', -1, jogStep), disabled: !isConnected || isZJogDisabled, isFlashing: flashingButton === 'jog-z-minus' }, h(ArrowDown, { className: "w-8 h-8" }))
            )
        ),
        h('div', { className: "grid grid-cols-2 gap-4" },
            h('div', { className: "relative", ref: homeMenuRef },
                h(JogButton, { title: "Home Axes", onClick: () => setIsHomeMenuOpen(p => !p), disabled: !isConnected, className: "gap-2 w-full justify-between" },
                    h('div', { className: "flex items-center gap-2" },
                        h(Home, { className: "w-5 h-5" }), " Home"
                    ),
                    h(ChevronDown, { className: `w-4 h-4 transition-transform ${isHomeMenuOpen ? 'rotate-180' : ''}` })
                ),
                isHomeMenuOpen && h('div', { className: "absolute bottom-full mb-2 w-full bg-secondary rounded-md shadow-lg z-10 overflow-hidden" },
                    h(MenuItem, { onClick: () => { onHome('all'); setIsHomeMenuOpen(false); } }, "Home All"),
                    h(MenuItem, { onClick: () => { onHome('xy'); setIsHomeMenuOpen(false); } }, "Home XY"),
                    h(MenuItem, { onClick: () => { onHome('x'); setIsHomeMenuOpen(false); } }, "Home X"),
                    h(MenuItem, { onClick: () => { onHome('y'); setIsHomeMenuOpen(false); } }, "Home Y"),
                    h(MenuItem, { onClick: () => { onHome('z'); setIsHomeMenuOpen(false); } }, "Home Z")
                )
            ),
            h('div', { className: "relative", ref: zeroMenuRef },
                h(JogButton, { title: "Set Work Zero", onClick: () => setIsZeroMenuOpen(p => !p), disabled: !isConnected, className: "gap-2 w-full justify-between" },
                    h('div', { className: "flex items-center gap-2" },
                        h(Pin, { className: "w-5 h-5" }), " Set Zero"
                    ),
                    h(ChevronDown, { className: `w-4 h-4 transition-transform ${isZeroMenuOpen ? 'rotate-180' : ''}` })
                ),
                isZeroMenuOpen && h('div', { className: "absolute bottom-full mb-2 w-full bg-secondary rounded-md shadow-lg z-10 overflow-hidden" },
                    h(MenuItem, { onClick: () => { onSetZero('all'); setIsZeroMenuOpen(false); } }, "Zero All"),
                    h(MenuItem, { onClick: () => { onSetZero('xy'); setIsZeroMenuOpen(false); } }, "Zero XY"),
                    h(MenuItem, { onClick: () => { onSetZero('x'); setIsZeroMenuOpen(false); } }, "Zero X"),
                    h(MenuItem, { onClick: () => { onSetZero('y'); setIsZeroMenuOpen(false); } }, "Zero Y"),
                    h(MenuItem, { onClick: () => { onSetZero('z'); setIsZeroMenuOpen(false); } }, "Zero Z")
                )
            )
        )
    );
});


const JogPanel = ({ isConnected, machineState, onJog, onHome, onSetZero, jogStep, onStepChange, flashingButton, unit, onUnitChange }) => {
    
    return h('div', { className: "bg-surface rounded-lg shadow-lg p-4 flex-shrink-0" },
        h('h2', { className: "text-lg font-bold mb-4 pb-4 border-b border-secondary" }, "Jog Control"),
        h('div', { className: "space-y-4" },
            h(PositionDisplay, { title: "Work Position (WPos)", pos: machineState?.wpos ?? null, unit: unit }),
            h(PositionDisplay, { title: "Machine Position (MPos)", pos: machineState?.mpos ?? null, unit: unit }),
            h(JogPanelControls, { isConnected, onJog, onHome, onSetZero, jogStep, onStepChange, flashingButton, unit, onUnitChange })
        )
    );
};

export default JogPanel;