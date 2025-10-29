



import React from 'react';

const h = React.createElement;

export const Power = (props) => h('svg', { xmlns: "http://www.w3.org/2000/svg", width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", ...props },
    h('path', { d: "M18.36 6.64a9 9 0 1 1-12.73 0" }),
    h('line', { x1: "12", y1: "2", x2: "12", y2: "12" })
);

export const PowerOff = (props) => h('svg', { xmlns: "http://www.w3.org/2000/svg", width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", ...props },
    h('path', { d: "M18.36 6.64A9 9 0 0 1 20.77 15M6.16 6.16a9 9 0 1 0 12.73 0" }),
    h('path', { d: "M12 2v4" }),
    h('path', { d: "m2 2 20 20" })
);

export const Radio = (props) => h('svg', { xmlns: "http://www.w3.org/2000/svg", width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", ...props },
    h('path', { d: "M4.9 19.1C1 15.2 1 8.8 4.9 4.9" }),
    h('path', { d: "M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5" }),
    h('circle', { cx: "12", cy: "12", r: "2" }),
    h('path', { d: "M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5" }),
    h('path', { d: "M19.1 4.9C23 8.8 23 15.2 19.1 19.1" })
);

export const Play = (props) => h('svg', { xmlns: "http://www.w3.org/2000/svg", width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", ...props },
    h('polygon', { points: "5 3 19 12 5 21 5 3" })
);

export const Pause = (props) => h('svg', { xmlns: "http://www.w3.org/2000/svg", width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", ...props },
    h('rect', { x: "6", y: "4", width: "4", height: "16" }),
    h('rect', { x: "14", y: "4", width: "4", height: "16" })
);

export const Square = (props) => h('svg', { xmlns: "http://www.w3.org/2000/svg", width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", ...props },
    h('rect', { x: "3", y: "3", width: "18", height: "18", rx: "2", ry: "2" })
);

export const Upload = (props) => h('svg', { xmlns: "http://www.w3.org/2000/svg", width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", ...props },
    h('path', { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" }),
    h('polyline', { points: "17 8 12 3 7 8" }),
    h('line', { x1: "12", y1: "3", x2: "12", y2: "15" })
);

export const FileText = (props) => h('svg', { xmlns: "http://www.w3.org/2000/svg", width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", ...props },
    h('path', { d: "M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" }),
    h('polyline', { points: "14 2 14 8 20 8" }),
    h('line', { x1: "16", y1: "13", x2: "8", y2: "13" }),
    h('line', { x1: "16", y1: "17", x2: "8", y2: "17" }),
    h('line', { x1: "10", y1: "9", x2: "8", y2: "9" })
);

export const Send = (props) => h('svg', { xmlns: "http://www.w3.org/2000/svg", width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", ...props },
    h('line', { x1: "22", y1: "2", x2: "11", y2: "13" }),
    h('polygon', { points: "22 2 15 22 11 13 2 9 22 2" })
);

export const ChevronRight = (props) => h('svg', { xmlns: "http://www.w3.org/2000/svg", width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", ...props },
    h('polyline', { points: "9 18 15 12 9 6" })
);

export const ChevronsLeft = (props) => h('svg', { xmlns: "http://www.w3.org/2000/svg", width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", ...props },
    h('polyline', { points: "11 17 6 12 11 7" }),
    h('polyline', { points: "18 17 13 12 18 7" })
);

export const ChevronsRight = (props) => h('svg', { xmlns: "http://www.w3.org/2000/svg", width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", ...props },
    h('polyline', { points: "13 17 18 12 13 7" }),
    h('polyline', { points: "6 17 11 12 6 7" })
);

export const Info = (props) => h('svg', { xmlns: "http://www.w3.org/2000/svg", width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", ...props },
    h('circle', { cx: "12", cy: "12", r: "10" }),
    h('line', { x1: "12", y1: "16", x2: "12", y2: "12" }),
    h('line', { x1: "12", y1: "8", x2: "12.01", y2: "8" })
);

export const AlertTriangle = (props) => h('svg', { xmlns: "http://www.w3.org/2000/svg", width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", ...props },
    h('path', { d: "M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" }),
    h('line', { x1: "12", y1: "9", x2: "12", y2: "13" }),
    h('line', { x1: "12", y1: "17", x2: "12.01", y2: "17" })
);

export const Code = (props) => h('svg', { xmlns: "http://www.w3.org/2000/svg", width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", ...props },
    h('polyline', { points: "16 18 22 12 16 6" }),
    h('polyline', { points: "8 6 2 12 8 18" })
);

export const Eye = (props) => h('svg', { xmlns: "http://www.w3.org/2000/svg", width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", ...props },
    h('path', { d: "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" }),
    h('circle', { cx: "12", cy: "12", r: "3" })
);

export const ArrowUp = (props) => h('svg', { xmlns: "http://www.w3.org/2000/svg", width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", ...props },
    h('line', { x1: "12", y1: "19", x2: "12", y2: "5" }),
    h('polyline', { points: "5 12 12 5 19 12" })
);

export const ArrowDown = (props) => h('svg', { xmlns: "http://www.w3.org/2000/svg", width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", ...props },
    h('line', { x1: "12", y1: "5", x2: "12", y2: "19" }),
    h('polyline', { points: "19 12 12 19 5 12" })
);

export const ArrowLeft = (props) => h('svg', { xmlns: "http://www.w3.org/2000/svg", width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", ...props },
    h('line', { x1: "19", y1: "12", x2: "5", y2: "12" }),
    h('polyline', { points: "12 19 5 12 12 5" })
);

export const ArrowRight = (props) => h('svg', { xmlns: "http://www.w3.org/2000/svg", width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", ...props },
    h('line', { x1: "5", y1: "12", x2: "19", y2: "12" }),
    h('polyline', { points: "12 5 19 12 12 19" })
);

export const Home = (props) => h('svg', { xmlns: "http://www.w3.org/2000/svg", width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", ...props },
    h('path', { d: "m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" }),
    h('polyline', { points: "9 22 9 12 15 12 15 22" })
);

export const Pin = (props) => h('svg', { xmlns: "http://www.w3.org/2000/svg", width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", ...props },
    h('path', { d: "M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" }),
    h('circle', { cx: "12", cy: "10", r: "3" })
);

export const OctagonAlert = (props) => h('svg', { xmlns: "http://www.w3.org/2000/svg", width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", ...props },
    h('polygon', { points: "7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2" }),
    h('line', { x1: "12", y1: "8", x2: "12", y2: "12" }),
    h('line', { x1: "12", y1: "16", x2: "12.01", y2: "16" })
);

export const ChevronDown = (props) => h('svg', { xmlns: "http://www.w3.org/2000/svg", width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", ...props },
    h('polyline', { points: "6 9 12 15 18 9" })
);

export const Unlock = (props) => h('svg', { xmlns: "http://www.w3.org/2000/svg", width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", ...props },
    h('rect', { x: "3", y: "11", width: "18", height: "11", rx: "2", ry: "2" }),
    h('path', { d: "M7 11V7a5 5 0 0 1 9.9-1" })
);

export const CheckCircle = (props) => h('svg', { xmlns: "http://www.w3.org/2000/svg", width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", ...props },
    h('path', { d: "M22 11.08V12a10 10 0 1 1-5.93-9.14" }),
    h('polyline', { points: "22 4 12 14.01 9 11.01" })
);

export const X = (props) => h('svg', { xmlns: "http://www.w3.org/2000/svg", width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", ...props },
    h('line', { x1: "18", y1: "6", x2: "6", y2: "18" }),
    h('line', { x1: "6", y1: "6", x2: "18", y2: "18" })
);

export const Maximize = (props) => h('svg', { xmlns: "http://www.w3.org/2000/svg", width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", ...props },
    h('path', { d: "M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" })
);

export const Pencil = (props) => h('svg', { xmlns: "http://www.w3.org/2000/svg", width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", ...props },
    h('path', { d: "M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" }),
    h('path', { d: "m15 5 4 4" })
);

export const Save = (props) => h('svg', { xmlns: "http://www.w3.org/2000/svg", width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", ...props },
    h('path', { d: "M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" }),
    h('polyline', { points: "17 21 17 13 7 13 7 21" }),
    h('polyline', { points: "7 3 7 8 15 8" })
);

export const Minimize = (props) => h('svg', { xmlns: "http://www.w3.org/2000/svg", width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", ...props },
    h('path', { d: "M4 14h6v6" }),
    h('path', { d: "M20 10h-6V4" }),
    h('path', { d: "M14 10l7-7" }),
    h('path', { d: "M3 21l7-7" })
);

export const Contrast = (props) => h('svg', { xmlns: "http://www.w3.org/2000/svg", width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", ...props },
    h('circle', { cx: "12", cy: "12", r: "10" }),
    h('path', { d: "M12 18a6 6 0 0 0 0-12v12z" })
);

export const RotateCw = (props) => h('svg', { xmlns: "http://www.w3.org/2000/svg", width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", ...props },
    h('path', { d: "M20 12a8 8 0 1 1-8-8" }),
    h('path', { d: "M20 4v4h-4" })
);

export const RotateCcw = (props) => h('svg', { xmlns: "http://www.w3.org/2000/svg", width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", ...props },
    h('path', { d: "M4 12a8 8 0 1 0 8-8" }),
    h('path', { d: "M4 4v4h4" })
);

export const Plus = (props) => h('svg', { xmlns: "http://www.w3.org/2000/svg", width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", ...props },
    h('line', { x1: "12", y1: "5", x2: "12", y2: "19" }),
    h('line', { x1: "5", y1: "12", x2: "19", y2: "12" })
);

export const Minus = (props) => h('svg', { xmlns: "http://www.w3.org/2000/svg", width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", ...props },
    h('line', { x1: "5", y1: "12", x2: "19", y2: "12" })
);

export const RefreshCw = (props) => h('svg', { xmlns: "http://www.w3.org/2000/svg", width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", ...props },
    h('polyline', { points: "23 4 23 10 17 10" }),
    h('path', { d: "M20.49 15a9 9 0 1 1-2.12-9.36L23 10" })
);

export const Percent = (props) => h('svg', { xmlns: "http://www.w3.org/2000/svg", width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", ...props },
    h('line', { x1: "19", y1: "5", x2: "5", y2: "19" }),
    h('circle', { cx: "6.5", cy: "6.5", r: "2.5" }),
    h('circle', { cx: "17.5", cy: "17.5", r: "2.5" })
);

export const Probe = (props) => h('svg', { xmlns: "http://www.w3.org/2000/svg", width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", ...props },
    h('path', { d: "M12 2v14" }),
    h('path', { d: "m7 9 5 5 5-5" }),
    h('path', { d: "M3 20h18" })
);

export const ZoomIn = (props) => h('svg', { xmlns: "http://www.w3.org/2000/svg", width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", ...props },
    h('circle', { cx: "11", cy: "11", r: "8" }),
    h('line', { x1: "21", y1: "21", x2: "16.65", y2: "16.65" }),
    h('line', { x1: "11", y1: "8", x2: "11", y2: "14" }),
    h('line', { x1: "8", y1: "11", x2: "14", y2: "11" })
);

export const ZoomOut = (props) => h('svg', { xmlns: "http://www.w3.org/2000/svg", width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", ...props },
    h('circle', { cx: "11", cy: "11", r: "8" }),
    h('line', { x1: "21", y1: "21", x2: "16.65", y2: "16.65" }),
    h('line', { x1: "8", y1: "11", x2: "14", y2: "11" })
);

export const Clock = (props) => h('svg', { xmlns: "http://www.w3.org/2000/svg", width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", ...props },
    h('circle', { cx: "12", cy: "12", r: "10" }),
    h('polyline', { points: "12 6 12 12 16 14" })
);

export const Zap = (props) => h('svg', { xmlns: "http://www.w3.org/2000/svg", width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", ...props },
    h('polygon', { points: "13 2 3 14 12 14 11 22 21 10 12 10 13 2" })
);

export const Trash2 = (props) => h('svg', { xmlns: "http://www.w3.org/2000/svg", width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", ...props },
    h('path', { d: "M3 6h18" }),
    h('path', { d: "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" }),
    h('line', { x1: "10", y1: "11", x2: "10", y2: "17" }),
    h('line', { x1: "14", y1: "11", x2: "14", y2: "17" })
);

export const PlusCircle = (props) => h('svg', { xmlns: "http://www.w3.org/2000/svg", width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", ...props },
    h('circle', { cx: "12", cy: "12", r: "10" }),
    h('line', { x1: "12", y1: "8", x2: "12", y2: "16" }),
    h('line', { x1: "8", y1: "12", x2: "16", y2: "12" })
);