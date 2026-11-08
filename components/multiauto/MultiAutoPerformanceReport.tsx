
import React, { useMemo, useState, useEffect } from 'react';
import { 
  Activity, Clock, Cpu, HardDrive, Wrench, Layers, 
  History as HistoryIcon, Terminal, Info, Box, Settings2, 
  Gauge, ArrowRight, Thermometer, Wind, Timer, CheckCircle2,
  Monitor, ChevronRight, Zap, ShieldCheck, Droplets, MousePointer2, AlertTriangle,
  Smartphone, Disc, Target, Eye, ScanLine, Minimize2, Maximize2, X, Calendar, ChevronLeft,
  Shield, Check, MessageSquare, AlertOctagon
} from 'lucide-react';
import { 
  ImportRecord, ProductionHistoryRecord, NetDataRecord, 
  StageProgress, Language, MachineSetup 
} from '../../types';
import { translations } from '../../data/locales';

interface MultiAutoPerformanceReportProps {
  importData: ImportRecord[];
  historyData: ProductionHistoryRecord[];
  netData: NetDataRecord[];
  machineStatuses?: MachineSetup[];
  targetPnl?: number;
  language?: Language;
}

// Helper to get specs
const getSpecsHelper = (model: string, code: string, stage: string, netData: NetDataRecord[]) => {
  const net = netData.find(n => n.model === model && n.code === code);
  if (!net) return { points: 0, seconds: 0, table: 0, pad: 0, air: 0 };
  let points = net.stage === stage ? net.stage1Points : (net.stage2 === stage ? (net.stage2Points || 0) : (net.stage3 === stage ? (net.stage3Points || 0) : (net.stage4 === stage ? (net.stage4Points || 0) : net.stage1Points)));
  if (points === 0) points = net.stage1Points || 1;
  return { points, seconds: net.timePerPoint || 1.5, table: net.tableTemp || 0, pad: net.padTemp || 0, air: net.airPressure || 0 };
};

// --- COMPONENT: DEVICE INTEGRITY LOG ---
const DeviceIntegrityLog: React.FC<{ machine: any }> = ({ machine }) => {
    // 1. Lấy dữ liệu từ setup (DK Máy)
    const statusNote = machine.setup.note; // 'NORMAL', 'BROKEN', etc.
    const description = (machine.setup.description || '').toLowerCase();
    const isError = statusNote !== 'NORMAL';

    // 2. Logic phát hiện lỗi linh kiện qua từ khóa
    const hasPowerError = isError && (description.includes('nguồn') || description.includes('power') || description.includes('điện'));
    const hasSensorError = isError && (description.includes('cảm biến') || description.includes('sensor'));
    const hasOilError = isError && (description.includes('dầu') || description.includes('oil') || description.includes('bôi trơn'));
    const hasPistonError = isError && (description.includes('piston') || description.includes('áp lực') || description.includes('khí') || description.includes('pressure'));

    return (
        <div className="w-full bg-[#0a0f1e]/80 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-700">
            <style>{`
                @keyframes pulse-error-red {
                    0%, 100% { border-color: rgba(239, 68, 68, 0.4); background-color: rgba(239, 68, 68, 0.05); box-shadow: 0 0 5px rgba(239, 68, 68, 0.1); }
                    50% { border-color: rgba(239, 68, 68, 1); background-color: rgba(239, 68, 68, 0.2); box-shadow: 0 0 15px rgba(239, 68, 68, 0.3); }
                }
                .animate-pulse-red { animation: pulse-error-red 1.5s infinite; }
            `}</style>

            <div className="px-5 py-3 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded-md border ${isError ? 'bg-red-500/10 border-red-500/30 text-red-500' : 'bg-green-500/10 border-green-500/30 text-green-500'}`}>
                        <ShieldCheck size={16} />
                    </div>
                    <h3 className="text-[10px] font-black text-white uppercase tracking-[0.2em] font-mono">DEVICE INTEGRITY LOG</h3>
                </div>
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${isError ? 'bg-red-500 animate-ping' : 'bg-green-500'}`}></div>
                    <span className="text-[8px] font-mono text-slate-600 font-bold tracking-widest uppercase">HARDWARE_MONITOR_ACTIVE</span>
                </div>
            </div>

            <div className="p-5 flex flex-col lg:flex-row gap-6">
                {/* LEFT: COMPONENT CARDS */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
                    <StatusMiniCard 
                        label="NGUỒN (POWER)" 
                        val={hasPowerError ? "CRITICAL_ERR" : isError ? "MONITORING" : "STABLE"} 
                        icon={Zap} 
                        color={hasPowerError ? "text-red-500" : isError ? "text-slate-500" : "text-green-400"} 
                        isFlashing={hasPowerError} 
                    />
                    <StatusMiniCard 
                        label="DẦU MÁY (OIL)" 
                        val={hasOilError ? "LOW_LEVEL" : isError ? "MONITORING" : "92%"} 
                        icon={Droplets} 
                        color={hasOilError ? "text-red-500" : isError ? "text-slate-500" : "text-blue-400"} 
                        isFlashing={hasOilError} 
                    />
                    <StatusMiniCard 
                        label="CẢM BIẾN" 
                        val={hasSensorError ? "SIGNAL_LOST" : isError ? "MONITORING" : "ACTIVE"} 
                        icon={MousePointer2} 
                        color={hasSensorError ? "text-red-500" : isError ? "text-slate-500" : "text-cyan-400"} 
                        isFlashing={hasSensorError} 
                    />
                    <StatusMiniCard 
                        label="PISTON ÁP LỰC" 
                        val={hasPistonError ? "PRESSURE_NG" : isError ? "MONITORING" : "OPTIMAL"} 
                        icon={Activity} 
                        color={hasPistonError ? "text-red-500" : isError ? "text-slate-500" : "text-green-400"} 
                        isFlashing={hasPistonError} 
                    />
                </div>

                {/* RIGHT: SYSTEM LOG - CẬP NHẬT TỪ DK MÁY */}
                <div className="lg:w-[45%] bg-black/40 rounded-2xl border border-slate-800 p-4 flex flex-col relative group transition-all hover:border-slate-700">
                    <div className="flex items-center justify-between mb-3 border-b border-slate-800/50 pb-2">
                        <div className="flex items-center gap-2 text-slate-500">
                            <span className="font-mono text-[9px] font-bold">›_</span>
                            <span className="text-[9px] font-black uppercase tracking-widest">SYSTEM LOG</span>
                        </div>
                        {isError && <AlertOctagon size={12} className="text-red-500 animate-pulse" />}
                    </div>
                    
                    <div className="flex-1 font-mono text-[10px] leading-relaxed">
                        {isError ? (
                            <div className="space-y-2">
                                <div className="text-red-400 font-bold flex items-center gap-1.5 uppercase tracking-tighter">
                                    <AlertTriangle size={10}/> Detected Abnormal Status: {statusNote}
                                </div>
                                <div className="text-slate-300 italic p-2 bg-red-950/20 rounded border border-red-900/30">
                                    "{machine.setup.description || 'No detailed log provided from setup.'}"
                                </div>
                                <div className="text-[8px] text-slate-600 uppercase font-bold mt-2">
                                    Check Equipment Dashboard for Node {machine.name}
                                </div>
                            </div>
                        ) : (
                            <div className="text-slate-400 italic">
                                "System online. All sensors stable. Power grid verified. Lubrication level optimal. Communication with Node {machine.name} established."
                                <div className="mt-2 flex items-center gap-1.5 text-green-500 font-bold text-[8px] uppercase">
                                    <Check size={10}/> Last verification: {machine.setup.updatedAt}
                                </div>
                            </div>
                        )}
                    </div>
                    
                    <div className="absolute bottom-2 right-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        {isError ? <AlertOctagon size={48} className="text-red-500" /> : <ShieldCheck size={48} className="text-blue-500" />}
                    </div>
                </div>
            </div>
        </div>
    );
};

const StatusMiniCard: React.FC<{ label: string; val: string; icon: any; color: string; isFlashing?: boolean }> = ({ label, val, icon: Icon, color, isFlashing }) => (
    <div className={`bg-slate-900/60 rounded-xl border p-3 flex justify-between items-center transition-all ${isFlashing ? 'animate-pulse-red' : 'border-slate-800'}`}>
        <div className="flex flex-col gap-1">
            <span className="text-[8px] font-black text-slate-500 uppercase tracking-tighter">{label}</span>
            <span className={`text-xs font-black font-mono tracking-tight ${color}`}>{val}</span>
        </div>
        <div className={`p-2 rounded-lg bg-black/40 ${color} shadow-inner`}>
            <Icon size={14} className={isFlashing ? 'animate-bounce' : ''} />
        </div>
    </div>
);

// --- MÔ PHỎNG SMT REAL-TIME CHUẨN TRỤC X-Y ---
const MiniSMTSimulation: React.FC<{ isRunning: boolean; totalPoints: number; accumulatedTime: number; lastStartTimestamp?: number; }> = ({ isRunning, totalPoints = 12, accumulatedTime = 0, lastStartTimestamp }) => {
    const [now, setNow] = useState(Date.now());
    useEffect(() => {
        let timer: any;
        if (isRunning) timer = setInterval(() => setNow(Date.now()), 50); 
        return () => clearInterval(timer);
    }, [isRunning]);

    const TRACK_Y = 50; const FEEDER_X = 15; const CAM_L_X = 32; const TABLE_BASE_X = 58; const CAM_R_REST_X = 85;    
    const pointsCount = Math.max(1, totalPoints);
    const cols = Math.ceil(Math.sqrt(pointsCount));
    const rows = Math.ceil(pointsCount / cols);
    const timePerPoint = 11; const rowStepTime = 1; const pnlChangeTime = 3;    

    const liveSeconds = isRunning && lastStartTimestamp ? accumulatedTime + (now - lastStartTimestamp) / 1000 : accumulatedTime;
    const timeOneRow = (cols * timePerPoint) + rowStepTime;
    const timeFullPnl = (timeOneRow * rows) + pnlChangeTime;
    const timeInPnl = liveSeconds % timeFullPnl;
    
    let currentPointIdx = 0; let isRowStepping = false; let isPnlChanging = false; let timeInCycle = 0;

    if (timeInPnl >= (timeOneRow * rows)) { isPnlChanging = true; timeInCycle = timeInPnl - (timeOneRow * rows); }
    else {
        const currentLineIdx = Math.floor(timeInPnl / timeOneRow);
        const timeInRow = timeInPnl % timeOneRow;
        if (timeInRow >= (cols * timePerPoint)) { isRowStepping = true; currentPointIdx = Math.min(pointsCount - 1, (currentLineIdx * cols) + (cols - 1)); timeInCycle = timeInRow - (cols * timePerPoint); }
        else { const pointInRow = Math.floor(timeInRow / timePerPoint); currentPointIdx = Math.min(pointsCount - 1, (currentLineIdx * cols) + pointInRow); timeInCycle = timeInRow % timePerPoint; }
    }
    const colIdx = currentPointIdx % cols; const rowIdx = Math.floor(currentPointIdx / cols);
    const targetXOnPcb = cols > 1 ? 15 + (colIdx * (70 / (cols - 1))) : 50;
    const targetYOnPcb = rows > 1 ? 20 + (rowIdx * (60 / (rows - 1))) : 50;
    const tableWidthPerc = 40; const destX = (TABLE_BASE_X - tableWidthPerc/2) + (targetXOnPcb * tableWidthPerc / 100);
    const horizontalOffset = colIdx === 0 ? 4.5 : (colIdx === cols - 1 ? -4.5 : 0);
    const finalDestX = destX + horizontalOffset;

    let camRX = CAM_R_REST_X; let isFlashR = false; let flashRColor = 'bg-purple-900/40';
    if (!isPnlChanging && !isRowStepping) {
        if (timeInCycle < 1.5) camRX = CAM_R_REST_X - ((CAM_R_REST_X - finalDestX) * (timeInCycle / 1.5));
        else if (timeInCycle < 2.5) { camRX = finalDestX; isFlashR = true; flashRColor = (Math.floor(now / 200) % 2 === 0) ? 'bg-red-500' : 'bg-green-500'; }
        else if (timeInCycle < 4.0) camRX = finalDestX + ((CAM_R_REST_X - finalDestX) * ((timeInCycle - 2.5) / 1.5));
    }
    let headX = FEEDER_X; let isFlashL = false; let isMounting = false;
    if (!isPnlChanging && !isRowStepping && timeInCycle >= 4.0) {
        const headTime = timeInCycle - 4.0;
        if (headTime < 1.0) { headX = FEEDER_X + ((CAM_L_X - FEEDER_X) * headTime); }
        else if (headTime < 2.0) { headX = CAM_L_X; isFlashL = true; }
        else if (headTime < 3.5) { headX = CAM_L_X + ((finalDestX - CAM_L_X) * ((headTime - 2.0) / 1.5)); }
        else if (headTime < 5.0) { headX = finalDestX; isMounting = true; }
        else if (headTime < 7.0) { headX = finalDestX - ((finalDestX - FEEDER_X) * ((headTime - 5.0) / 2)); }
    }
    const tableHeightPerc = 40; let tableY = TRACK_Y;
    const verticalFineTune = rowIdx === 0 ? -0.84 : (rowIdx === 2 ? 0.84 : 0);
    const rowOffsetStep = rows > 1 ? (tableHeightPerc * 0.6) / (rows - 1) : 0;
    const verticalOffset = (rows > 1 ? (rows - 1) / 2 - rowIdx : 0) * rowOffsetStep + verticalFineTune;
    if (isPnlChanging) { if (timeInCycle < 1.5) tableY = -150; else tableY = 250; }
    else { const offsetFromCenter = (50 - targetYOnPcb) * (tableHeightPerc / 100); tableY = TRACK_Y + offsetFromCenter + verticalOffset; }

    return (
        <div className="relative w-full max-w-2xl h-60 bg-slate-900/60 rounded-3xl border border-slate-800 flex flex-col items-center justify-center overflow-hidden shadow-2xl group transition-all duration-500">
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle,_#1e293b_1.5px,_transparent_1.5px)] bg-[size:25px_25px]"></div>
            <div className="absolute w-full h-px bg-blue-500/20 border-t border-blue-500/10 z-0" style={{ top: `${TRACK_Y}%` }}></div>
            <div className="absolute flex flex-col items-center gap-1 z-10" style={{ left: `${FEEDER_X}%`, top: `${TRACK_Y}%`, transform: 'translate(-50%, -50%)' }}><div className="w-12 h-16 bg-slate-800 rounded-lg border-2 border-slate-700 flex flex-col items-center justify-around p-1 shadow-lg"><Smartphone size={16} className="text-blue-500/30" /></div></div>
            <div className="absolute flex flex-col items-center gap-1 z-20" style={{ left: `${CAM_L_X}%`, top: `${TRACK_Y}%`, transform: 'translate(-50%, -50%)' }}><div className={`w-8 h-8 rounded-full bg-slate-950 border-2 border-slate-700 flex items-center justify-center shadow-lg transition-all duration-100 ${isFlashL ? 'ring-4 ring-white shadow-[0_0_20px_white]' : ''}`}><div className={`w-3 h-3 rounded-full ${isFlashL ? 'bg-white' : 'bg-blue-900/30'} border border-slate-700`}></div></div></div>
            <div className="absolute z-10 transition-all duration-1000 ease-in-out" style={{ left: `${TABLE_BASE_X}%`, top: `${tableY}%`, transform: `translate(-50%, -50%)` }}><div className="w-56 h-40 bg-slate-950 rounded-xl border-2 border-slate-800 relative overflow-hidden shadow-2xl p-4"><div className="h-full relative z-10 grid" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, gridTemplateRows: `repeat(${rows}, 1fr)`, gap: '4px' }}>{Array.from({ length: pointsCount }).map((_, i) => { const isDone = isRunning && !isPnlChanging && i < currentPointIdx; const isCurrent = isRunning && !isPnlChanging && i === currentPointIdx; return (<div key={i} className={`w-full h-full border rounded-sm flex items-center justify-center transition-all duration-500 ${isCurrent ? 'border-blue-500 bg-blue-500/10' : isDone ? 'border-cyan-400 bg-cyan-400/30 shadow-[inset_0_0_10px_rgba(34,211,238,0.2)]' : 'border-slate-800'}`}><div className={`w-1.5 h-1.5 rounded-full transition-all duration-700 ${isDone ? 'bg-cyan-400 shadow-[0_0_15px_#22d3ee] scale-110' : isCurrent ? 'bg-white animate-ping' : 'bg-slate-800'}`}></div></div>); })}</div></div></div>
            <div className="absolute flex flex-col items-center gap-1 z-30 transition-all duration-100" style={{ left: `${camRX}%`, top: `${TRACK_Y}%`, transform: 'translate(-50%, -50%)' }}><div className={`w-9 h-9 rounded-full bg-slate-950 border-2 border-slate-700 flex items-center justify-center shadow-lg transition-colors duration-100 ${isFlashR ? 'ring-2 ring-red-500' : ''}`}><div className={`w-4 h-4 rounded-full transition-colors duration-100 ${isFlashR ? flashRColor : 'bg-purple-900/40'} border border-slate-700`}></div></div></div>
            <div className="absolute z-40 flex flex-col items-center transition-all duration-100" style={{ top: `${TRACK_Y}%`, left: `${headX}%`, transform: 'translate(-50%, -50%)' }}><div className={`w-20 h-28 bg-slate-900 rounded-2xl border-4 border-slate-600 shadow-[0_25px_80px_rgba(0,0,0,1)] relative overflow-hidden flex flex-col items-center justify-center transition-all duration-200 ${isMounting ? 'scale-90 bg-slate-800 border-blue-500' : ''}`}><Cpu size={28} className={`z-10 transition-colors ${isMounting ? 'text-blue-400' : 'text-slate-500'}`}/><div className="absolute bottom-0 w-8 h-4 bg-slate-400 rounded-t-sm shadow-2xl border-x border-t border-slate-300"></div></div><div className="absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 w-[2px] h-[2000px] bg-slate-800/40 -z-10"></div></div>
            <div className="absolute bottom-3 left-0 right-0 text-center"><span className={`text-[7px] font-black uppercase tracking-[0.6em] transition-colors ${isRunning ? 'text-green-400 animate-pulse' : 'text-slate-700'}`}>{isPnlChanging ? 'PNL_SWAP_ACTIVE' : isRowStepping ? 'ALIGING_ROW' : isRunning ? 'REALTIME_PRODUCTION_SYNC' : 'CORE_STANDBY'}</span></div>
        </div>
    );
};

// --- BIỂU ĐỒ TICK RADIAL (FIXED CLIPPING) ---
const TickRadial: React.FC<{ progress: number; color: string; size: number; strokeWidth: number; isRunning?: boolean; label?: string; fontSize?: string; disableRotation?: boolean; }> = ({ progress, color, size, strokeWidth, isRunning, label = "", fontSize = "text-4xl", disableRotation = false }) => {
  const ticks = 100; 
  const cx = size / 2; 
  const cy = size / 2; 
  // Giảm bán kính để nhường chỗ cho stroke-width và hiệu ứng đổ bóng
  const innerRadius = (size / 2) * 0.75; 
  const outerRadius = (size / 2) * 0.90; 
  const activeTicks = Math.round((progress / 100) * ticks);
  
  return (
    <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <svg 
        viewBox={`0 0 ${size} ${size}`} 
        className={`w-full h-full transform -rotate-90 transition-transform duration-1000 overflow-visible ${isRunning && !disableRotation ? 'animate-rotate-slow' : ''}`}
      >
        {Array.from({ length: ticks }).map((_, i) => {
          const angle = (i * 360) / ticks; const rad = (angle * Math.PI) / 180; const x1 = cx + innerRadius * Math.cos(rad); const y1 = cy + innerRadius * Math.sin(rad); const x2 = cx + outerRadius * Math.cos(rad); const y2 = cy + outerRadius * Math.sin(rad); const isActive = i < activeTicks;
          return (
            <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={isActive ? color : '#0f172a'} strokeWidth={isActive ? strokeWidth : strokeWidth * 0.5} strokeLinecap="round" className="transition-all duration-500" style={{ filter: isActive ? `drop-shadow(0 0 4px ${color})` : 'none', opacity: isActive ? 1 : 0.2 }} />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none transform rotate-0">{label && <span className="text-[7px] font-black text-blue-400/40 uppercase tracking-widest mb-0.5">{label}</span>}<span className={`${fontSize} font-black text-white font-mono leading-none tracking-tighter`}>{Math.round(progress)}<small className="text-[10px] text-slate-500 font-normal">%</small></span></div>
    </div>
  );
};

// --- THANH TIMELINE 24 GIỜ ---
const ChronoTimeline24: React.FC<{ machineName: string; history: ProductionHistoryRecord[]; currentJob: any; netData: NetDataRecord[] }> = ({ machineName, history, currentJob, netData }) => {
    const totalMinutes = 24 * 60; 
    const getRelMinutes = (timeStr: string) => {
        if (!timeStr || !timeStr.includes(':')) return 0;
        const [h, m] = timeStr.split(':').map(Number);
        const totalAbsolute = h * 60 + m;
        let rel = totalAbsolute - 480;
        if (rel < 0) rel += 1440; 
        return rel;
    };
    const formatDuration = (mins: number) => {
        const h = Math.floor(mins / 60); const m = Math.round(mins % 60);
        return h > 0 ? `${h}h ${m}m` : `${m}m`;
    };
    const segments = useMemo(() => {
        const activeSegments: { start: number; end: number; type: 'DONE' | 'LIVE' }[] = [];
        history.forEach(h => {
            if (h.machine === machineName && h.productionStartTime) {
                const startRel = getRelMinutes(h.productionStartTime);
                const specs = getSpecsHelper(h.model, h.code, h.stageCompleted || h.stage, netData);
                const theoreticalDurationMins = (h.quantity * specs.points * specs.seconds) / 60;
                let endRel = startRel + theoreticalDurationMins;
                activeSegments.push({ start: startRel, end: Math.min(endRel, 1440), type: 'DONE' });
            }
        });
        if (currentJob && currentJob.status === 'RUNNING' && currentJob.startTime) {
            const startRel = getRelMinutes(currentJob.startTime);
            const nowTime = new Date();
            const nowRel = getRelMinutes(`${String(nowTime.getHours()).padStart(2, '0')}:${String(nowTime.getMinutes()).padStart(2, '0')}`);
            if (nowRel > startRel) activeSegments.push({ start: startRel, end: nowRel, type: 'LIVE' });
        }
        activeSegments.sort((a, b) => a.start - b.start);
        const allSegments: { start: number; width: number; type: 'DONE' | 'LIVE' | 'STOP'; duration: number }[] = [];
        let cursor = 0;
        activeSegments.forEach(seg => {
            if (seg.start > cursor) {
                const stopDur = seg.start - cursor;
                allSegments.push({ start: cursor, width: (stopDur / totalMinutes) * 100, type: 'STOP', duration: stopDur });
            }
            const runDur = seg.end - seg.start;
            allSegments.push({ start: seg.start, width: (runDur / totalMinutes) * 100, type: seg.type, duration: runDur });
            cursor = Math.max(cursor, seg.end);
        });
        if (cursor < 1440) {
            const finalStopDur = 1440 - cursor;
            allSegments.push({ start: cursor, width: (finalStopDur / totalMinutes) * 100, type: 'STOP', duration: finalStopDur });
        }
        return allSegments;
    }, [machineName, history, currentJob, netData]);

    const timeLabels = useMemo(() => {
        const labels = [];
        for (let i = 0; i <= 24; i += 2) {
            let h = (8 + i) % 24;
            labels.push(String(h).padStart(2, '0') + ':00');
        }
        return labels;
    }, []);

    return (
        <div className="flex flex-col gap-1 w-full px-2">
            <div className="flex justify-between px-0.5 text-[7px] font-black text-slate-600 font-mono">{timeLabels.map((lbl, i) => (<span key={i} className="opacity-100">{lbl}</span>))}</div>
            <div className="h-6 w-full bg-slate-950 rounded-md border border-slate-800 overflow-hidden flex relative shadow-inner group">
                {segments.map((seg, i) => (
                    <div key={i} className={`absolute h-full border-x border-black/10 transition-all duration-300 cursor-help ${seg.type === 'LIVE' ? 'bg-green-500 animate-pulse' : seg.type === 'DONE' ? 'bg-blue-600 hover:brightness-125' : 'bg-red-900/40 hover:bg-red-600/60'}`} style={{ left: `${(seg.start / totalMinutes) * 100}%`, width: `${seg.width}%` }} title={seg.type === 'STOP' ? `Dừng máy: ${formatDuration(seg.duration)}` : `Hoạt động: ${formatDuration(seg.duration)}`}></div>
                ))}
            </div>
        </div>
    );
};

// --- MAIN COMPONENT ---
export const MultiAutoPerformanceReport: React.FC<MultiAutoPerformanceReportProps> = ({ 
    importData, historyData, netData, machineStatuses = [], targetPnl = 500
}) => {
  const [selectedId, setSelectedId] = useState<number | null>(machineStatuses[0]?.id || null);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getLogicalDateStr = (dt: Date) => {
    const logical = new Date(dt);
    if (dt.getHours() < 8) logical.setDate(logical.getDate() - 1);
    const d = String(logical.getDate()).padStart(2, '0');
    const m = String(logical.getMonth() + 1).padStart(2, '0');
    return `${d}/${m}/${logical.getFullYear()}`;
  };

  const machineStats = useMemo(() => {
    const VN_DATE = getLogicalDateStr(new Date(now));
    return machineStatuses.map((setup) => {
      const machineName = setup.name;
      let totalPNL = 0; let totalPoints = 0;
      let liveStatus: any = 'READY'; let currentModel = '--'; let currentCode = '--'; let currentLot = '--'; let currentStage = '--';
      let lotTarget = 0; let lotEfficiency = 0; let startTime = ''; let accumulatedTime = 0; let lastStartTimestamp: number | undefined;

      const completedToday = historyData.filter(h => h.machine === machineName && h.date === VN_DATE);
      completedToday.forEach(job => {
          totalPNL += job.quantity;
          const { points } = getSpecsHelper(job.model, job.code, job.stageCompleted || job.stage, netData);
          totalPoints += (job.quantity * points);
      });

      const activeRecord = importData.find(r => r.productionProgress && Object.values(r.productionProgress).some((p: any) => p.machine === machineName && (p.status === 'RUNNING' || p.status === 'STOPPED')));
      if (activeRecord) {
        const entry = Object.entries(activeRecord.productionProgress!).find(([_, p]: [string, any]) => p.machine === machineName);
        if (entry) {
          const [stage, p] = entry as [string, StageProgress];
          currentModel = activeRecord.model; currentCode = activeRecord.code; currentLot = activeRecord.lotNo; currentStage = stage;
          lotTarget = activeRecord.quantity; liveStatus = p.status; startTime = p.startTime || '';
          accumulatedTime = p.accumulatedTime || 0; lastStartTimestamp = p.lastStartTimestamp;
          const { points, seconds } = getSpecsHelper(currentModel, currentCode, currentStage, netData);
          let elapsed = p.accumulatedTime || 0;
          if (p.status === 'RUNNING' && p.lastStartTimestamp) elapsed += (now - p.lastStartTimestamp) / 1000;
          const livePnl = (points > 0 && seconds > 0) ? Math.floor(elapsed / (points * seconds)) : 0;
          totalPNL += livePnl; totalPoints += (livePnl * points);
          lotEfficiency = Math.min(100, Math.round((livePnl / (lotTarget || 1)) * 100));
        }
      }
      if (setup.note !== 'NORMAL') liveStatus = setup.note;
      const efficiency = Math.min(100, Math.round((totalPNL / (targetPnl || 500)) * 100));
      return { id: setup.id, name: setup.name, totalPNL, totalPoints, efficiency, liveStatus, currentModel, currentCode, currentLot, currentStage, lotTarget, lotEfficiency, startTime, accumulatedTime, lastStartTimestamp, setup, specs: getSpecsHelper(currentModel, currentCode, currentStage, netData) };
    });
  }, [historyData, importData, netData, machineStatuses, now, targetPnl]);

  const activeMachine = machineStats.find(m => m.id === selectedId) || machineStats[0];
  const VN_LOGICAL_DATE = useMemo(() => getLogicalDateStr(new Date(now)), [now]);
  
  const selectedHistoryCurrentDay = useMemo(() => {
      return historyData.filter(h => h.machine === activeMachine.name && h.date === VN_LOGICAL_DATE).sort((a,b) => b.historyId - a.historyId);
  }, [historyData, activeMachine.name, VN_LOGICAL_DATE]);

  return (
    <div className="h-full bg-[#020617] flex flex-col font-sans text-slate-300 overflow-hidden">
        <style>{`
          @keyframes rotate-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          .animate-rotate-slow { animation: rotate-slow 15s linear infinite; }
        `}</style>
        <div className="flex-1 overflow-auto custom-scrollbar">
            <div className="flex h-full min-w-[1280px]">
                <div className="w-64 border-r border-slate-800 bg-[#070b14] flex flex-col shrink-0 shadow-xl">
                    <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between"><h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Node Explorer</h3></div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
                        {machineStats.map(m => (
                            <div key={m.id} onClick={() => setSelectedId(m.id)} className={`p-2 rounded-xl border transition-all cursor-pointer group flex items-center gap-3 relative overflow-hidden ${selectedId === m.id ? 'bg-slate-800 border-blue-500 shadow-lg' : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'}`}>
                                <TickRadial progress={m.efficiency} color={m.liveStatus === 'BROKEN' ? '#ef4444' : '#3b82f6'} size={40} strokeWidth={2} fontSize="text-[9px]" isRunning={m.liveStatus === 'RUNNING'} />
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-center mb-0.5"><span className={`text-[10px] font-black font-mono tracking-tighter ${selectedId === m.id ? 'text-blue-400' : 'text-slate-400'}`}>{m.name}</span><div className={`w-1.5 h-1.5 rounded-full ${m.liveStatus === 'RUNNING' ? 'bg-green-500 animate-pulse' : 'bg-slate-700'}`}></div></div>
                                    <div className="flex justify-between text-[8px] font-bold text-slate-600 uppercase"><span>PNL: <b className="text-slate-300">{m.totalPNL}</b></span><span className="text-blue-500/60 font-mono">Target: {targetPnl}</span></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="flex-1 flex flex-col bg-[#020617] relative">
                    <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle,_#1e293b_1px,_transparent_1px)] bg-[size:20px:20px]"></div>
                    <div className="flex-1 p-6 flex flex-col items-center gap-6 relative z-10">
                        <div className="w-full flex flex-col items-center gap-4">
                            <div className="text-center"><h2 className="text-base font-black text-white uppercase tracking-[0.4em] flex items-center justify-center gap-3"><Monitor size={18} className="text-blue-500"/>Operational Core</h2><p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mt-1">Focus Node: <span className="text-blue-400">{activeMachine.name}</span></p></div>
                            <div className="flex flex-col xl:flex-row items-center justify-center gap-8 xl:gap-12 py-4 w-full px-4">
                                <div className="flex-1 w-full max-w-2xl"><MiniSMTSimulation isRunning={activeMachine.liveStatus === 'RUNNING'} totalPoints={activeMachine.specs.points} accumulatedTime={activeMachine.accumulatedTime} lastStartTimestamp={activeMachine.lastStartTimestamp} /></div>
                                <div className="relative shrink-0"><TickRadial progress={activeMachine.lotEfficiency} color={activeMachine.liveStatus === 'BROKEN' ? '#ef4444' : '#3b82f6'} size={180} strokeWidth={3} isRunning={activeMachine.liveStatus === 'RUNNING'} disableRotation={true} label="Lot Progress" /></div>
                            </div>
                            <div className="mt-2 flex justify-center"><div className={`px-6 py-2 rounded-xl bg-slate-900 border border-slate-800 text-[10px] font-black uppercase tracking-widest flex items-center gap-3 shadow-2xl ${activeMachine.liveStatus === 'RUNNING' ? 'text-green-400 border-green-500/30' : 'text-orange-400 border-orange-500/30'}`}><span className={`w-2.5 h-2.5 rounded-full ${activeMachine.liveStatus === 'RUNNING' ? 'bg-green-500 animate-pulse shadow-[0_0_10px_green]' : 'bg-orange-500'}`}></span>{activeMachine.liveStatus} ENGINE STATUS</div></div>
                        </div>
                        <div className="w-full max-w-5xl flex flex-col gap-5 pb-8">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                                <div className="bg-[#0f172a]/80 backdrop-blur-md rounded-2xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col transition-colors hover:border-blue-500/30">
                                    <div className="px-5 py-3 bg-slate-900/80 border-b border-slate-800 flex items-center gap-2"><Box size={16} className="text-blue-400"/><h4 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">Batch Manifest</h4></div>
                                    <div className="p-5 grid grid-cols-2 gap-y-4">
                                        <div className="space-y-1.5"><label className="text-[9px] font-black text-slate-600 uppercase block">Model</label><div className="text-sm font-black text-white uppercase truncate">{activeMachine.currentModel}</div></div>
                                        <div className="space-y-1.5"><label className="text-[9px] font-black text-slate-600 uppercase block">Lot No</label><div className="text-sm font-black text-yellow-500 font-mono tracking-wider">{activeMachine.currentLot}</div></div>
                                        <div className="space-y-1.5"><label className="text-[9px] font-black text-purple-400 bg-purple-900/20 px-2 py-0.5 rounded border border-purple-500/30 w-fit">{activeMachine.currentStage}</label></div>
                                        <div className="space-y-1.5"><label className="text-[9px] font-black text-blue-400 font-mono">{activeMachine.lotTarget.toLocaleString()} <span className="text-[9px] text-slate-600">PNL</span></label></div>
                                    </div>
                                </div>
                                <div className="bg-[#0f172a]/80 backdrop-blur-md rounded-2xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col transition-colors hover:border-cyan-500/30">
                                    <div className="px-5 py-3 bg-slate-900/80 border-b border-slate-800 flex items-center gap-2"><Settings2 size={16} className="text-cyan-400"/><h4 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">Hardware Sync</h4></div>
                                    <div className="p-5 grid grid-cols-2 gap-3">
                                        <div className="bg-slate-950 p-2 rounded-xl border border-slate-800 flex justify-between items-center"><div className="flex flex-col"><span className="text-[8px] font-black text-slate-600 uppercase">T-Table</span><span className="text-xs font-mono font-black text-orange-400">{activeMachine.specs.table}°C</span></div><Thermometer size={14} className="text-slate-700"/></div>
                                        <div className="bg-slate-950 p-2 rounded-xl border border-slate-700 flex justify-between items-center"><div className="flex flex-col"><span className="text-[8px] font-black text-slate-600 uppercase">T-Pad</span><span className="text-xs font-mono font-black text-yellow-400">{activeMachine.specs.pad}°C</span></div><Layers size={14} className="text-slate-700"/></div>
                                        <div className="bg-slate-950 p-2 rounded-xl border border-slate-700 flex justify-between items-center"><div className="flex flex-col"><span className="text-[8px] font-black text-slate-600 uppercase">Pressure</span><span className="text-xs font-mono font-black text-cyan-400">{activeMachine.specs.air} bar</span></div><Wind size={14} className="text-slate-700"/></div>
                                        <div className="bg-slate-950 p-2 rounded-xl border border-slate-700 flex justify-between items-center"><div className="flex flex-col"><span className="text-[8px] font-black text-slate-600 uppercase">Cycle</span><span className="text-xs font-mono font-black text-purple-400">{activeMachine.specs.seconds}s</span></div><Timer size={14} className="text-slate-700"/></div>
                                    </div>
                                </div>
                            </div>
                            
                            {/* DYNAMIC INTEGRITY LOG CONNECTION */}
                            <DeviceIntegrityLog machine={activeMachine} />
                        </div>
                    </div>
                </div>
                <div className="w-80 border-l border-slate-800 bg-[#070b14] flex flex-col shrink-0 shadow-xl">
                    <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex items-gap-3"><HistoryIcon size={18} className="text-blue-500"/><h3 className="text-[10px] font-black uppercase tracking-widest text-white leading-none">Execution Logs</h3></div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-slate-950/20">
                        {selectedHistoryCurrentDay.length === 0 ? <div className="py-24 text-center text-slate-800 italic text-[9px] uppercase font-black">No records today</div> : selectedHistoryCurrentDay.map(log => (
                            <div key={log.historyId} className="bg-slate-900/60 border border-slate-800/50 rounded-2xl p-4 shadow-lg"><div className="flex justify-between items-start mb-2.5"><div className="text-[10px] font-black text-slate-100 uppercase truncate max-w-[130px]">{log.model}</div><span className="text-[8px] font-mono text-slate-600 bg-black/60 px-1.5 py-0.5 rounded">{log.completedAt.split(' ')[1]}</span></div><div className="flex justify-between items-center text-[9px] border-t border-slate-800 pt-2.5"><span className="font-mono text-yellow-600 font-black uppercase">{log.lotNo}</span><span className="text-blue-400 font-black font-mono">{log.quantity} PNL</span></div></div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
        <div className="h-28 bg-black border-t border-slate-800 flex flex-col shrink-0 px-8 justify-center gap-3 z-50">
            <div className="flex justify-between items-center"><div className="flex items-center gap-8"><h4 className="text-[10px] font-black text-slate-600 tracking-[0.3em] uppercase flex items-center gap-3"><Gauge size={16} className="text-blue-500"/> 24H Timeline</h4><div className="flex gap-6 text-[8px] font-black uppercase text-slate-500"><div className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div> Processed</div><div className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div> Live</div><div className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-red-600 rounded-full"></div> Inactive</div></div></div><div className="text-[9px] font-black text-slate-600 font-mono bg-[#070b14] px-4 py-1.5 rounded-full border border-slate-800">NODE_ACTIVE: <span className="text-white uppercase">{activeMachine.name}</span></div></div>
            <ChronoTimeline24 machineName={activeMachine.name} history={selectedHistoryCurrentDay} currentJob={{ status: activeMachine.liveStatus, startTime: activeMachine.startTime, model: activeMachine.currentModel }} netData={netData} />
        </div>
    </div>
  );
};

export default MultiAutoPerformanceReport;
