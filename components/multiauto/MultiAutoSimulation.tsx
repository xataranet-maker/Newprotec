
import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, Activity, Cpu, Timer, Clock, Smartphone, Monitor, Check,
  Thermometer, Wind, Zap as LucideZap, Droplets, Move, MousePointer2, Server,
  ChevronLeft, ChevronRight, LayoutGrid, HardDrive, Wrench, Layers, Hash,
  ChevronUp, ChevronDown, Minimize2, Maximize2, AlertTriangle, AlertOctagon, PackageX, History
} from 'lucide-react';
import { 
  MachineSetup, ProductionHistoryRecord, NetDataRecord, ImportRecord, StageProgress, RepairRecord
} from '../../types';

interface MultiAutoSimulationProps {
  machineStatuses: MachineSetup[];
  importData: ImportRecord[];
  historyData: ProductionHistoryRecord[];
  netData: NetDataRecord[];
  repairHistory: RepairRecord[];
  onClose: () => void;
  initialMachineIndex?: number;
  defaultExpanded?: boolean;
}

type SimState = 
    | 'IDLE' 
    | 'CAM_R_TO_POINT' | 'CAM_R_SCAN' | 'CAM_R_TO_REST'
    | 'HEAD_TO_CAM_L' | 'HEAD_CAM_L_SCAN' | 'HEAD_TO_POINT' | 'HEAD_MOUNT' | 'HEAD_TO_FEEDER'
    | 'TABLE_STEPPING' | 'TABLE_EJECT' | 'TABLE_ENTRY';

const formatHMS = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = Math.floor(totalSeconds % 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const MECHANICAL_Y_LINE = 30; 
const FEEDER_X = 12;          
const LEFT_CAM_X = 22;        
const REST_CAM_R_X = 88;      
const TABLE_LEFT_X = 35;      

export const MultiAutoSimulation: React.FC<MultiAutoSimulationProps> = ({
  machineStatuses, importData, historyData, netData, onClose, initialMachineIndex = 0, defaultExpanded = true
}) => {
  const [machineIdx, setMachineIdx] = useState(initialMachineIndex);
  const [currentPointIdx, setCurrentPointIdx] = useState(0); 
  const [currentPnlIdx, setCurrentPnlIdx] = useState(0); 
  const [simState, setSimState] = useState<SimState>('IDLE');
  const [isFlashL, setIsFlashL] = useState(false);
  const [isFlashR, setIsFlashR] = useState(false);
  const [liveTimeSeconds, setLiveTimeSeconds] = useState(0);
  
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const activeMachine = machineStatuses[machineIdx];
  const isMachineOnline = activeMachine.note === 'NORMAL';
  
  const getDeviceStatus = (key: string) => {
      const desc = activeMachine.description || '';
      const line = desc.split('\n').find(l => l.startsWith(`[CHECK]${key}|`));
      return line ? line.split('|')[1] : 'OK';
  };

  const activeProduction = useMemo(() => {
    return importData.find(r => {
        if (!r.productionProgress) return false;
        return Object.values(r.productionProgress).some((p: any) => p.machine === activeMachine.name && (p.status === 'RUNNING' || p.status === 'STOPPED'));
    });
  }, [activeMachine, importData]);

  const currentStageName = useMemo(() => {
    if (!activeProduction) return null;
    return Object.entries(activeProduction.productionProgress || {}).find(([_, p]: any) => p.machine === activeMachine.name)?.[0] || null;
  }, [activeProduction, activeMachine]);

  const isLotRunning = useMemo(() => {
    if (!activeProduction || !currentStageName) return false;
    return activeProduction.productionProgress?.[currentStageName]?.status === 'RUNNING';
  }, [activeProduction, currentStageName]);

  const activeNet = useMemo(() => {
    if (!activeProduction) return null;
    return netData.find(n => n.model === activeProduction.model && n.code === activeProduction.code);
  }, [activeProduction, netData]);

  const totalPointsPerPnl = useMemo(() => {
      if (!activeProduction || !activeNet || !currentStageName) return 9;
      if (activeNet.stage === currentStageName) return activeNet.stage1Points || 9;
      if (activeNet.stage2 === currentStageName) return activeNet.stage2Points || 9;
      if (activeNet.stage3 === currentStageName) return activeNet.stage3Points || 9;
      if (activeNet.stage4 === currentStageName) return activeNet.stage4Points || 9;
      return 9;
  }, [activeProduction, activeNet, currentStageName]);

  const totalPnlInLot = activeProduction ? activeProduction.quantity : 1;

  useEffect(() => {
      if (activeProduction && currentStageName && activeNet) {
          const prog = activeProduction.productionProgress?.[currentStageName] as StageProgress;
          const tpp = activeNet.timePerPoint || 1.5;
          const ptsPerPnl = totalPointsPerPnl || 9;

          let totalSeconds = prog.accumulatedTime || 0;
          if (prog.status === 'RUNNING' && prog.lastStartTimestamp) {
              totalSeconds += (Date.now() - prog.lastStartTimestamp) / 1000;
          }

          if (tpp > 0) {
              const totalPointsDone = Math.floor(totalSeconds / tpp);
              const pnlDone = Math.floor(totalPointsDone / (ptsPerPnl || 1));
              const ptIdx = totalPointsDone % ptsPerPnl;

              setCurrentPnlIdx(pnlDone);
              setCurrentPointIdx(ptIdx); 
              setLiveTimeSeconds(Math.floor(totalSeconds));
              setSimState('IDLE'); 
              setIsFlashL(false);
              setIsFlashR(false);
          }
      } else {
          setCurrentPointIdx(0);
          setCurrentPnlIdx(0);
          setSimState('IDLE');
          setLiveTimeSeconds(0);
      }
  }, [machineIdx, activeProduction, currentStageName, activeNet, totalPointsPerPnl]);

  const cycleTime = activeNet?.timePerPoint || 1.5;
  
  const realTimeStats = useMemo(() => {
      if (!activeProduction) return { pnl: 0, points: 0 };
      const totalPointsDone = cycleTime > 0 ? Math.floor(liveTimeSeconds / cycleTime) : 0;
      const pnlDone = Math.floor(totalPointsDone / (totalPointsPerPnl || 1));
      return { pnl: pnlDone, points: totalPointsDone };
  }, [liveTimeSeconds, cycleTime, totalPointsPerPnl, activeProduction]);

  const lotProgressPercent = useMemo(() => {
    if (totalPnlInLot === 0) return 0;
    return Math.min(100, Math.round((realTimeStats.pnl / totalPnlInLot) * 100));
  }, [realTimeStats.pnl, totalPnlInLot]);

  useEffect(() => {
    if (!activeProduction || !currentStageName || !isLotRunning) return;
    const p = activeProduction.productionProgress?.[currentStageName] as StageProgress;
    const updateTime = () => {
        let total = p.accumulatedTime || 0;
        if (p.status === 'RUNNING' && p.lastStartTimestamp) {
            total += (Date.now() - p.lastStartTimestamp) / 1000;
        }
        setLiveTimeSeconds(Math.floor(total));
    };
    updateTime(); 
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [activeProduction, currentStageName, isLotRunning]);

  const pointsPerRow = useMemo(() => Math.ceil(Math.sqrt(totalPointsPerPnl || 1)), [totalPointsPerPnl]);

  const gridPoints = useMemo(() => {
      const pts = [];
      const cols = pointsPerRow;
      const rows = Math.ceil((totalPointsPerPnl || 1) / cols);
      for (let i = 0; i < (totalPointsPerPnl || 9); i++) {
          const r = Math.floor(i / cols);
          const c = i % cols;
          let y = rows > 1 ? 15 + (r * (85-15)/(rows-1)) : 50;
          if (r === 0) y -= 1;
          if (r === 2) y += 1;
          pts.push({
              x: cols > 1 ? 15 + (c * (85-15)/(cols-1)) : 50,
              y: y,
              isLastInRow: (i + 1) % cols === 0 || (i === (totalPointsPerPnl || 9) - 1)
          });
      }
      return pts;
  }, [totalPointsPerPnl, pointsPerRow]);

  const targetPoint = gridPoints[currentPointIdx] || gridPoints[0];

  useEffect(() => {
    if (!isMachineOnline || !isLotRunning) {
        setSimState('IDLE');
        return;
    }

    const runSequence = async () => {
        if (currentPointIdx >= totalPointsPerPnl) {
             setCurrentPointIdx(0);
             setCurrentPnlIdx(p => p + 1);
             return;
        }

        setSimState('CAM_R_TO_POINT'); 
        await new Promise(r => setTimeout(r, 1000));
        
        setSimState('CAM_R_SCAN'); 
        setIsFlashR(true);
        await new Promise(r => setTimeout(r, 1000));
        setIsFlashR(false);

        setSimState('CAM_R_TO_REST');
        await new Promise(r => setTimeout(r, 1000));

        setSimState('HEAD_TO_CAM_L'); 
        await new Promise(r => setTimeout(r, 500));

        setSimState('HEAD_CAM_L_SCAN'); 
        setIsFlashL(true);
        await new Promise(r => setTimeout(r, 1000));
        setIsFlashL(false);

        setSimState('HEAD_TO_POINT');
        await new Promise(r => setTimeout(r, 1000));

        setSimState('HEAD_MOUNT');
        await new Promise(r => setTimeout(r, 1000));

        setSimState('HEAD_TO_FEEDER');
        await new Promise(r => setTimeout(r, 1000));

        const isLastInPnl = currentPointIdx >= totalPointsPerPnl - 1;

        if (isLastInPnl) {
            setSimState('TABLE_EJECT');
            await new Promise(r => setTimeout(r, 2000));
            setCurrentPointIdx(0);
            setCurrentPnlIdx(prev => (prev + 1));
            await new Promise(r => setTimeout(r, 1000)); 
            setSimState('TABLE_ENTRY');
            await new Promise(r => setTimeout(r, 2000));
        } else if (targetPoint.isLastInRow) {
            setSimState('TABLE_STEPPING');
            await new Promise(r => setTimeout(r, 500));
            setCurrentPointIdx(prev => prev + 1);
        } else {
            setCurrentPointIdx(prev => prev + 1);
        }
    };

    runSequence();
  }, [isMachineOnline, isLotRunning, currentPointIdx, targetPoint, totalPointsPerPnl]);

  const headX = useMemo(() => {
      switch (simState) {
          case 'HEAD_TO_CAM_L': case 'HEAD_CAM_L_SCAN': return LEFT_CAM_X; 
          case 'HEAD_TO_POINT': case 'HEAD_MOUNT': return TABLE_LEFT_X + (targetPoint.x * 50 / 100);
          default: return FEEDER_X; 
      }
  }, [simState, targetPoint]);

  const camRX = useMemo(() => {
      switch (simState) {
          case 'CAM_R_TO_POINT': case 'CAM_R_SCAN': return TABLE_LEFT_X + (targetPoint.x * 50 / 100);
          default: return REST_CAM_R_X; 
      }
  }, [simState, targetPoint]);

  const tableTranslateY = useMemo(() => {
      if (simState === 'TABLE_EJECT') return '-150%';
      if (simState === 'TABLE_ENTRY') return '150%';
      return `-${targetPoint.y}%`;
  }, [targetPoint.y, simState]);

  const handlePrevMachine = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMachineIdx(prev => (prev - 1 + machineStatuses.length) % machineStatuses.length);
  };

  const handleNextMachine = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMachineIdx(prev => (prev + 1) % machineStatuses.length);
  };

  return (
    <div 
        className={`fixed left-0 right-0 z-[2000] bg-[#020617] flex flex-col font-sans text-slate-300 uppercase overflow-hidden border-t-2 border-blue-600 shadow-[0_-10px_40px_rgba(0,0,0,0.8)] transition-all duration-300 ease-in-out
            ${isExpanded ? 'h-[90vh] bottom-0' : 'h-14 bottom-0'}
        `}
    >
      <style>{`
        .industrial-trans { transition: all 1.0s cubic-bezier(0.4, 0, 0.2, 1); }
        .head-trans { transition: all 1.0s cubic-bezier(0.4, 0, 0.2, 1); }
        .head-fast-trans { transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1); }
        .table-trans { transition: all 0.5s ease-in-out; }
        .flash-glow { filter: brightness(4) drop-shadow(0 0 40px white); }
        .bg-tech { background-color: #050810; background-image: radial-gradient(#1e293b 1px, transparent 1px); background-size: 30px 30px; }
      `}</style>

      <div 
        className={`h-14 border-b flex items-center justify-between px-4 shrink-0 z-50 shadow-2xl cursor-pointer transition-colors relative
            ${!isMachineOnline ? 'bg-red-950 border-red-800' : 'bg-slate-900 border-slate-800 hover:bg-slate-800'}
        `}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="absolute inset-0 bg-blue-900/10 pointer-events-none">
             <div className="h-full bg-blue-600/10 transition-all duration-1000" style={{ width: `${lotProgressPercent}%` }}></div>
        </div>
        <div className={`absolute bottom-0 left-0 h-[2px] transition-all duration-1000 ${!isMachineOnline ? 'bg-red-500 shadow-[0_0_10px_red]' : 'bg-green-500 shadow-[0_0_10px_#22c55e]'}`} style={{ width: `${lotProgressPercent}%` }}></div>

        <div className="flex items-center gap-4 z-10">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-white shadow-lg border ${!isMachineOnline ? 'bg-red-600 border-red-400' : 'bg-blue-600 border-blue-400'}`}>PT</div>
            
            <div className="flex items-center bg-slate-950 rounded-lg border border-slate-700 overflow-hidden shadow-inner">
                <button onClick={handlePrevMachine} className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"><ChevronLeft size={16}/></button>
                <div className="px-3 py-1 text-center min-w-[120px]">
                    <div className={`text-[11px] font-black leading-none ${!isMachineOnline ? 'text-red-500' : 'text-blue-400'}`}>{activeMachine.name}</div>
                    <div className="text-[8px] text-slate-500 font-bold leading-none mt-0.5">ID: {machineIdx + 1}</div>
                </div>
                <button onClick={handleNextMachine} className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"><ChevronRight size={16}/></button>
            </div>

            <div className="hidden md:flex items-center gap-4 border-l border-slate-700 pl-4">
                <div>
                    <span className="text-[8px] font-black text-slate-500 block">MODEL</span>
                    <span className="text-[11px] font-bold text-white block">{activeProduction?.model || '--'}</span>
                </div>
                <div>
                    <span className="text-[8px] font-black text-slate-500 block">TIẾN ĐỘ (PNL)</span>
                    <span className="text-[11px] font-bold text-yellow-400 block">{realTimeStats.pnl.toLocaleString()} / {totalPnlInLot.toLocaleString()}</span>
                </div>
                <div>
                    <span className="text-[8px] font-black text-slate-500 block">TRẠNG THÁI</span>
                    <span className={`text-[11px] font-black block ${!isMachineOnline ? 'text-red-500 animate-pulse' : isLotRunning ? 'text-green-500 animate-pulse' : 'text-slate-400'}`}>
                        {!isMachineOnline ? activeMachine.note : isLotRunning ? 'RUNNING' : 'STOPPED'}
                    </span>
                </div>
            </div>
        </div>

        <div className="flex items-center gap-2 z-10">
             <div className="hidden md:flex items-center gap-1.5 px-3 py-1 bg-slate-950/50 rounded-full border border-slate-700 mr-2">
                 <LucideZap size={12} className="text-blue-400"/>
                 <span className="text-[10px] font-mono font-bold text-slate-300">{formatHMS(liveTimeSeconds)}</span>
             </div>
             <button className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white border border-slate-700 transition-all shadow-sm">
                {isExpanded ? <ChevronDown size={18}/> : <ChevronUp size={18}/>}
             </button>
             <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="p-2 bg-red-900/20 hover:bg-red-600 text-red-400 hover:text-white rounded-lg transition-all border border-red-900/50 ml-2 group">
                 <X size={18} className="group-hover:rotate-90 transition-transform"/>
             </button>
        </div>
      </div>

      <div className={`flex-1 overflow-x-auto overflow-y-hidden bg-black/80 ${!isExpanded ? 'pointer-events-none opacity-0' : 'opacity-100'}`}>
        <div className="flex min-w-[1280px] h-full"> 
        
            <div className="w-[280px] border-r border-slate-800 bg-[#0a0f1e] flex flex-col shrink-0 z-50 shadow-2xl h-full">
                <section className="p-5 border-b border-slate-800 bg-slate-900/50">
                    <h3 className="text-[10px] font-black text-cyan-400 tracking-widest flex items-center gap-2 mb-4 uppercase">
                        <Activity size={14}/> Node Telemetry
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                        <SensorMini label="Table Temp" val={`${activeNet?.tableTemp || 0}°C`} color="orange" icon={Thermometer}/>
                        <SensorMini label="Pad Temp" val={`${activeNet?.padTemp || 0}°C`} color="yellow" icon={Thermometer}/>
                        <SensorMini label="Air Pressure" val={`${activeNet?.airPressure || 0} bar`} color="cyan" icon={Wind}/>
                        <SensorMini label="Cycle Time" val={`${activeNet?.timePerPoint || 1.5}s`} color="purple" icon={Timer}/>
                    </div>
                </section>

                <section className="p-5 border-b border-slate-800 bg-black/20">
                    <h3 className="text-[10px] font-black text-green-400 tracking-widest flex items-center gap-2 mb-4 uppercase">
                        <Server size={14}/> Device Health
                    </h3>
                    <div className="space-y-2">
                        <DeviceStatusRow label="NGUỒN (POWER)" status={getDeviceStatus('POWER')} icon={LucideZap} />
                        <DeviceStatusRow label="SENSOR HÀNH TRÌNH" status={getDeviceStatus('SENSOR')} icon={MousePointer2} />
                        <DeviceStatusRow label="DẦU BÔI TRƠN" status={getDeviceStatus('OIL')} icon={Droplets} />
                        <DeviceStatusRow label="PISTON ÁP LỰC" status={getDeviceStatus('MOTOR')} icon={Cpu} />
                        <DeviceStatusRow label="TRỤC X / Y" status={getDeviceStatus('AIR')} icon={Move} />
                    </div>
                </section>
                
                <section className="flex-1 flex flex-col min-h-0 bg-black/10">
                    <div className="px-5 py-3 bg-slate-900/80 border-b border-slate-800"><h3 className="text-[10px] font-black text-purple-400 tracking-widest uppercase flex items-center gap-2"><History size={14}/> Production Yield</h3></div>
                    <div className="flex-1 overflow-y-auto no-scrollbar">
                        <table className="w-full text-left text-[9px]">
                            <tbody className="divide-y divide-slate-800/30">
                                {historyData.filter(h => h.machine === activeMachine.name).slice(0, 15).map((h, i) => (
                                    <tr key={i} className="hover:bg-white/5 transition-colors">
                                        <td className="px-5 py-3 font-bold text-slate-400 truncate max-w-[120px]">{h.model}</td>
                                        <td className="px-5 py-3 text-right font-mono text-blue-400 font-bold">{h.quantity}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>

            <div className="flex-1 bg-tech relative flex items-center justify-center overflow-hidden min-w-[500px]">
                {!isMachineOnline && (
                    <div className="absolute inset-0 z-[60] bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center animate-in fade-in duration-300">
                        {activeMachine.note === 'BROKEN' ? (
                            <AlertTriangle size={120} className="text-red-600 animate-bounce mb-6 filter drop-shadow-[0_0_20px_rgba(220,38,38,0.5)]" />
                        ) : activeMachine.note === 'WAITING_MATERIAL' ? (
                            <Layers size={120} className="text-orange-500 animate-pulse mb-6 filter drop-shadow-[0_0_20px_rgba(249,115,22,0.5)]" />
                        ) : (
                            <PackageX size={120} className="text-slate-500 mb-6" />
                        )}
                        <h2 className="text-5xl font-black text-white mt-2 uppercase tracking-widest text-shadow-lg text-center">{activeMachine.note.replace('_', ' ')}</h2>
                        <div className="mt-6 px-8 py-4 bg-slate-900/90 border-2 border-red-500/50 rounded-xl max-w-xl text-center shadow-2xl">
                             <p className="text-xl text-red-200 font-mono font-bold leading-relaxed">{activeMachine.description || 'Hệ thống dừng hoạt động. Vui lòng kiểm tra thiết bị.'}</p>
                        </div>
                    </div>
                )}
                
                <div className="absolute w-full h-px bg-blue-500/20 border-t border-blue-500/10 shadow-[0_0_20px_rgba(59,130,246,0.2)] z-0" style={{ top: `${MECHANICAL_Y_LINE}%` }}></div>

                <div className="absolute -translate-y-1/2 w-[8%] h-40 bg-slate-800 border-4 border-slate-700 rounded-xl flex flex-col items-center justify-center shadow-2xl z-20" style={{ top: `${MECHANICAL_Y_LINE}%`, left: `${FEEDER_X}%`, transform: 'translate(-50%, -50%)' }}>
                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent"></div>
                    <span className="text-[7px] font-black text-slate-600 mb-2">FEEDER</span>
                    <Smartphone size={24} className="text-blue-500 opacity-20"/>
                </div>

                <div className={`absolute -translate-y-1/2 transition-all z-30 ${isFlashL ? 'flash-glow' : ''}`} style={{ top: `${MECHANICAL_Y_LINE}%`, left: `${LEFT_CAM_X}%`, transform: 'translate(-50%, -50%)' }}>
                    <div className="w-16 h-16 bg-slate-900 rounded-2xl border-4 border-slate-700 flex items-center justify-center shadow-[0_20px_50px_rgba(0,0,0,1)]">
                        <div className="w-10 h-10 rounded-full bg-black border-2 border-slate-800 flex items-center justify-center">
                            <div className={`w-4 h-4 rounded-full transition-colors ${isFlashL ? 'bg-white shadow-[0_0_30px_white]' : 'bg-blue-900/30'}`}></div>
                        </div>
                        <span className="absolute -bottom-6 text-[8px] font-black text-slate-600 tracking-widest">CAM_LEFT</span>
                    </div>
                </div>

                <div 
                    className="absolute bg-[#0f172a] rounded-xl border-[10px] border-slate-800 shadow-[0_0_150px_rgba(0,0,0,1)] z-10 overflow-hidden table-trans"
                    style={{ 
                        width: `50%`, height: '500px', left: `${TABLE_LEFT_X}%`, top: `${MECHANICAL_Y_LINE}%`,
                        transform: `translateY(${tableTranslateY})`,
                        transitionDuration: (simState === 'TABLE_STEPPING') ? '0.5s' : (simState === 'TABLE_EJECT' || simState === 'TABLE_ENTRY') ? '2.0s' : '0s'
                    }}
                >
                    <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle,_#1e293b_1px,_transparent_1px)] bg-[size:40px_40px]"></div>
                    <div className="absolute inset-0">
                        {isLotRunning && gridPoints.map((p, i) => (
                            <div 
                                key={i} 
                                className={`absolute w-10 h-10 rounded-lg border-2 transition-all duration-500 flex items-center justify-center font-black text-[10px]
                                    ${i === currentPointIdx ? 'bg-blue-600 border-blue-400 shadow-[0_0_30px_rgba(59,130,246,0.8)] text-white scale-125 z-20' : 
                                    i < currentPointIdx ? 'bg-green-900/50 border-green-700 text-green-500' : 'bg-slate-900 border-slate-700 text-slate-700'}
                                `} 
                                style={{ left: `${p.x}%`, top: `${p.y}%`, transform: 'translate(-50%, -50%)' }}
                            >
                                {i + 1}
                                {i < currentPointIdx && <div className="absolute -top-1.5 -right-1.5 bg-green-500 rounded-full p-0.5 text-white shadow-lg border border-white/20"><Check size={8} strokeWidth={4}/></div>}
                            </div>
                        ))}
                    </div>
                </div>

                <div 
                    className={`absolute -translate-y-1/2 transition-all z-30 ${isFlashR ? 'flash-glow' : ''} industrial-trans`}
                    style={{ top: `${MECHANICAL_Y_LINE}%`, left: `${camRX}%`, transform: 'translate(-50%, -50%)' }}
                >
                    <div className="w-16 h-16 bg-slate-900 rounded-2xl border-4 border-slate-700 flex flex-col items-center justify-center shadow-[0_20px_50px_rgba(0,0,0,1)]">
                        <div className="w-10 h-10 rounded-full bg-black border-2 border-slate-800 flex items-center justify-center">
                            <div className={`w-4 h-4 rounded-full transition-colors duration-100 ${isFlashR ? 'bg-white shadow-[0_0_30px_white]' : 'bg-blue-900/30'}`}></div>
                        </div>
                        <span className="absolute -bottom-6 text-[8px] font-black text-slate-600 tracking-widest">CAM_RIGHT</span>
                    </div>
                </div>

                <div 
                    className={`absolute z-40 ${simState === 'HEAD_TO_CAM_L' ? 'head-fast-trans' : 'head-trans'}`} 
                    style={{ 
                        top: `${MECHANICAL_Y_LINE}%`, left: `${headX}%`, transform: 'translate(-50%, -50%)'
                    }}
                >
                    <div className={`w-12 h-16 bg-slate-900 rounded-2xl border-2 border-slate-600 shadow-[0_15px_40px_rgba(0,0,0,0.8)] relative overflow-hidden flex flex-col items-center justify-center transition-all duration-200 ${simState === 'HEAD_MOUNT' ? 'scale-90 border-blue-500 bg-slate-800' : ''}`}>
                        <Cpu size={20} className={`z-10 transition-colors ${simState === 'HEAD_MOUNT' ? 'text-blue-400' : 'text-slate-500'}`}/>
                        <div className="absolute bottom-0 w-6 h-2 bg-slate-400 rounded-t-sm shadow-xl border-x border-t border-slate-300"></div>
                    </div>
                    <div className="absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 w-[1px] h-[2000px] bg-slate-800/30 -z-10"></div>
                </div>

                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-[#0a0f1e]/80 backdrop-blur-3xl px-12 py-4 rounded-full border border-slate-800 shadow-[0_0_100px_rgba(0,0,0,0.8)] flex items-center gap-12 z-[70] min-w-[500px] justify-between">
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            {!isMachineOnline ? (
                                <AlertTriangle size={24} className="text-red-500 animate-bounce"/>
                            ) : (
                                <Activity size={24} className="text-blue-500 animate-pulse"/>
                            )}
                            <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-400 rounded-full blur-sm"></div>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[8px] font-black text-slate-600 tracking-widest uppercase mb-0.5">Execution State</span>
                            <span className={`text-xs font-black font-mono tracking-widest ${isLotRunning ? 'text-blue-400' : !isMachineOnline ? 'text-red-500' : 'text-orange-400'}`}>
                                {isLotRunning ? simState.replace(/_/g, ' ') : !isMachineOnline ? 'SYSTEM_ERROR' : 'SYSTEM_IDLE'}
                            </span>
                        </div>
                    </div>
                    
                    <div className="flex flex-col items-center border-x border-slate-800 px-12">
                        <span className="text-[8px] font-black text-slate-600 uppercase mb-1">Current Point</span>
                        <span className="text-xl font-black text-white font-mono leading-none">
                            NODE {Math.min(currentPointIdx + 1, totalPointsPerPnl)} / {totalPointsPerPnl}
                        </span>
                    </div>

                    <div className="flex flex-col items-end">
                        <span className="text-[8px] font-black text-slate-600 uppercase mb-1">Uptime</span>
                        <span className="text-sm font-black text-slate-300 font-mono leading-none tracking-tighter">{formatHMS(liveTimeSeconds)}</span>
                    </div>
                </div>
            </div>

            <div className="w-[350px] border-l border-slate-800 bg-[#0a0f1e] flex flex-col shrink-0 z-50 overflow-y-auto no-scrollbar shadow-2xl p-6 gap-6 h-full">
                <div className="bg-slate-900/50 rounded-2xl border border-slate-800 p-8 flex flex-col items-center shadow-2xl relative overflow-hidden group shrink-0">
                    <div className="absolute -top-10 -right-10 w-40 h-40 bg-cyan-600/5 blur-[80px] rounded-full group-hover:bg-cyan-600/10 transition-colors"></div>
                    <div className="relative w-64 h-64 flex items-center justify-center">
                        <svg viewBox="0 0 240 240" className="w-full h-full transform -rotate-90">
                            {Array.from({ length: 100 }).map((_, i) => { 
                                const angle = (i * 360) / 100;
                                const isActive = isLotRunning && (i / 100) * 100 < lotProgressPercent;
                                const rad = (angle * Math.PI) / 180;
                                const cx = 120; const cy = 120;
                                const x1 = cx + 80 * Math.cos(rad); const y1 = cy + 80 * Math.sin(rad);
                                const x2 = cx + 100 * Math.cos(rad); const y2 = cy + 100 * Math.sin(rad);
                                return (<line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={isActive ? '#06b6d4' : '#1e293b'} strokeWidth={isActive ? "2" : "1"} strokeLinecap="round" className="transition-all duration-300" style={{ filter: isActive ? 'drop-shadow(0 0 4px #06b6d4)' : 'none' }} />);
                            })}
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-cyan-400 font-bold tracking-[0.2em] text-xs mb-1 animate-pulse">OEE LIVE</span>
                            <span className="text-6xl font-black text-white font-mono tracking-tighter drop-shadow-xl">{lotProgressPercent}<span className="text-2xl text-slate-500">%</span></span>
                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-2">Real-time Efficiency</span>
                        </div>
                    </div>
                    <div className="w-full grid grid-cols-2 mt-8 text-center divide-x divide-slate-800 border-t border-slate-800 pt-4">
                        <div className="flex flex-col"><span className="text-[8px] font-black text-slate-600 uppercase">Target (PNL)</span><span className="text-lg font-black text-blue-400 font-mono">{activeProduction?.quantity || '---'}</span></div>
                        <div className="flex flex-col"><span className="text-[8px] font-black text-slate-600 uppercase">Complete (PNL)</span><span className="text-lg font-black text-green-400 font-mono">{isLotRunning ? realTimeStats.pnl : '---'}</span></div>
                    </div>
                </div>

                <section className="bg-slate-900/50 rounded-2xl border border-slate-800 p-6 shadow-xl space-y-5 shrink-0">
                    <div className="flex items-center gap-3 border-b border-slate-800 pb-3"><Monitor size={18} className="text-blue-500"/><h3 className="text-[10px] font-black text-blue-400 tracking-widest uppercase font-mono">Real-time Manifest</h3></div>
                    <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                        <InfoBox label="Model Name" val={isLotRunning ? activeProduction?.model : '---'} color="text-white" />
                        <InfoBox label="Serial Lot" val={isLotRunning ? activeProduction?.lotNo : '---'} color="text-yellow-500" />
                        <InfoBox label="Points/Pnl" val={isLotRunning ? totalPointsPerPnl : '---'} color="text-purple-400" />
                        <InfoBox label="Work Stage" val={currentStageName || '---'} color="text-slate-400" />
                        <InfoBox label="Total Points" val={isLotRunning ? realTimeStats.points.toLocaleString() : '---'} color="text-green-400" />
                    </div>
                </section>

                <section className="mt-auto bg-slate-900/50 rounded-2xl border border-slate-800 p-6 shadow-xl space-y-4 shrink-0">
                    <div className="flex justify-between items-center mb-1"><h3 className="text-[10px] font-black text-orange-400 tracking-widest uppercase flex items-center gap-2 font-mono">Job Progress</h3><span className="text-xs font-black text-white font-mono">{lotProgressPercent}%</span></div>
                    <div className="w-full h-1.5 bg-slate-950 rounded-full border border-slate-800 overflow-hidden relative shadow-inner"><div className="h-full bg-gradient-to-r from-blue-600 to-cyan-400 rounded-full transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(59,130,246,0.5)]" style={{ width: `${lotProgressPercent}%` }} /></div>
                    <div className="flex justify-between text-[8px] font-black text-slate-600 uppercase font-mono tracking-tighter"><div className="flex items-center gap-1.5"><Clock size={12}/> Start: {activeProduction?.productionProgress?.[currentStageName!]?.startTime || '--:--'}</div><div className="flex items-center gap-1.5 text-blue-400">Sync_Active <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping"></div></div></div>
                </section>
            </div>
        </div>
      </div>
    </div>
  );
};

const SensorMini = ({ label, val, color, icon: Icon }: any) => (
    <div className="bg-black/40 p-3 rounded-xl border border-slate-800 flex flex-col gap-1 relative group overflow-hidden hover:border-slate-600 transition-colors">
        <div className={`absolute top-0 right-0 w-1 h-full bg-${color}-500 opacity-20`}></div>
        <span className="text-[8px] text-slate-600 font-black uppercase tracking-tighter mb-0.5 flex items-center gap-1">{Icon && <Icon size={10} />} {label}</span>
        <span className={`text-[11px] font-black text-${color}-400 font-mono tracking-tighter`}>{val}</span>
    </div>
);

const DeviceStatusRow = ({ label, status, icon: Icon }: any) => (
    <div className="flex justify-between items-center bg-slate-900/50 p-2 rounded border border-slate-800">
        <div className="flex items-center gap-2"><Icon size={12} className="text-slate-500" /><span className="text-[9px] font-bold text-slate-400 uppercase">{label}</span></div>
        <span className={`text-[9px] font-black px-1.5 rounded ${status === 'OK' ? 'text-green-500 bg-green-900/20' : 'text-red-500 bg-red-900/20 animate-pulse'}`}>{status}</span>
    </div>
);

const InfoBox = ({ label, val, color }: any) => (
    <div className="flex flex-col gap-1"><span className="text-[7px] font-black text-slate-600 uppercase tracking-tighter">{label}</span><span className={`text-[11px] font-black ${color} truncate font-mono tracking-tight`}>{val || '---'}</span></div>
);
