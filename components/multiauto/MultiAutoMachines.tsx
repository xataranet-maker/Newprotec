
import React, { useMemo, useState, useEffect } from 'react';
import { 
  CircuitBoard, Activity, Clock, Hourglass, Cpu, 
  HardDrive, Wrench, Layers, History, X, User, Tag, Timer, 
  Zap, Wind, MousePointer2, Droplets, Monitor, Maximize2,
  Thermometer, Power, Wifi, ShieldCheck, Settings2, BarChart3, TrendingUp, Target, AlertTriangle
} from 'lucide-react';
import { ImportRecord, MachineSetup, StageProgress, NetDataRecord, Language, ProductionHistoryRecord, RepairRecord, AccessoryUsageRecord } from '../../types';
import { translations } from '../../data/locales';

interface MultiAutoMachinesProps {
  moduleName?: string;
  data: ImportRecord[];
  onUpdateStatus: (id: number, newStatus: 'RUNNING' | 'COMPLETED' | 'STOPPED', stopReason?: string, stage?: string) => void;
  machineStatuses: MachineSetup[];
  onUpdateMachineSetup?: (machines: MachineSetup[]) => void; 
  netData: NetDataRecord[]; 
  historyData?: ProductionHistoryRecord[]; 
  repairHistory?: RepairRecord[]; 
  language?: Language;
  accessoriesUsage?: AccessoryUsageRecord[];
  targetPnl?: number;
}

const formatSecondsToTime = (totalSeconds: number) => {
    const safeTotal = Math.max(0, Math.floor(totalSeconds));
    const h = Math.floor(safeTotal / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = safeTotal % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const getLogicalDateStr = (dt: Date) => {
    const logical = new Date(dt.getTime());
    if (dt.getHours() < 8) logical.setDate(logical.getDate() - 1);
    const d = String(logical.getDate()).padStart(2, '0');
    const m = String(logical.getMonth() + 1).padStart(2, '0');
    const y = logical.getFullYear();
    return `${d}/${m}/${y}`;
};

const MachineTimer: React.FC<{ lastStart?: number; accumulated: number; isRunning: boolean }> = ({ lastStart, accumulated, isRunning }) => {
    const [nowVal, setNowVal] = useState(Date.now());
    useEffect(() => {
        let timer: any;
        if (isRunning) timer = setInterval(() => setNowVal(Date.now()), 1000);
        return () => clearInterval(timer);
    }, [isRunning]);
    const totalSeconds = Math.floor((accumulated || 0) + (isRunning && lastStart ? (nowVal - lastStart) / 1000 : 0));
    return <>{formatSecondsToTime(totalSeconds)}</>;
};

const TickRadialProgress: React.FC<{ progress: number, color: string, isRunning: boolean }> = ({ progress, color, isRunning }) => {
    const ticks = 100; 
    const activeTicks = Math.round((progress / 100) * ticks);
    
    return (
        <div className="relative w-28 h-28 flex items-center justify-center shrink-0">
            <svg 
                viewBox="0 0 240 240" 
                className={`w-full h-full transform -rotate-90 transition-transform duration-1000 ${isRunning ? 'animate-rotate-slow' : ''}`}
            >
                {Array.from({ length: ticks }).map((_, i) => {
                    const angle = (i * 360) / ticks;
                    const isActive = i < activeTicks;
                    const rad = (angle * Math.PI) / 180;
                    const cx = 120;
                    const cy = 120;
                    const x1 = cx + 85 * Math.cos(rad);
                    const y1 = cy + 85 * Math.sin(rad);
                    const x2 = cx + 100 * Math.cos(rad);
                    const y2 = cy + 100 * Math.sin(rad);
                    return (
                        <line
                            key={i}
                            x1={x1} y1={y1} x2={x2} y2={y2}
                            stroke={isActive ? color : '#1e293b'}
                            strokeWidth={isActive ? "2" : "1"}
                            strokeLinecap="round"
                            style={{ transition: 'stroke 0.5s ease', filter: isActive ? `drop-shadow(0 0 4px ${color})` : 'none' }}
                        />
                    );
                })}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[9px] text-cyan-400 font-bold uppercase tracking-widest mb-1">Yield</span>
                <span className="text-2xl font-black text-white font-mono leading-none drop-shadow-md">{progress}<small className="text-xs text-slate-400">%</small></span>
            </div>
        </div>
    );
};

const TelemetryItem: React.FC<{ label: string, value: string, icon: any, color: string }> = ({ label, value, icon: Icon, color }) => (
    <div className="flex justify-between items-center px-1.5 bg-black/20 rounded py-0.5">
        <span className="flex items-center gap-1.5 text-[9px] font-black text-slate-500 uppercase tracking-tighter">
            <Icon size={10} className={color} /> {label}
        </span>
        <span className="text-[10px] font-mono text-slate-300 font-bold">{value}</span>
    </div>
);

export const MultiAutoMachines: React.FC<MultiAutoMachinesProps> = ({ 
    moduleName = 'Multi Auto', data, onUpdateStatus, machineStatuses, netData, historyData = [], repairHistory = [], language = 'en', targetPnl = 500
}) => {
  const t = translations[language];
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const machineStats = useMemo(() => {
    const VN_LOGICAL_DATE = getLogicalDateStr(new Date(currentTime));
    const currentHour = new Date(currentTime).getHours();
    const isDayShift = currentHour >= 8 && currentHour < 20;

    return machineStatuses.map(setup => {
        const picName = isDayShift ? setup.staffDay : setup.staffNight;
        let activeJob: any = null; let activeProg: any = null; let stageName = '--';

        data.forEach(record => {
            if (record.productionProgress) {
                Object.entries(record.productionProgress).forEach(([sName, p]: [string, any]) => {
                    if (p.machine === setup.name && (p.status === 'RUNNING' || p.status === 'STOPPED')) {
                        activeJob = record; activeProg = p; stageName = sName;
                    }
                });
            }
        });

        const net = netData.find(n => n.model === activeJob?.model && n.code === activeJob?.code);
        let ptsPerPnl = 1;
        if (net) {
            if (net.stage === stageName) ptsPerPnl = net.stage1Points || 1;
            else if (net.stage2 === stageName) ptsPerPnl = net.stage2Points || 1;
            else if (net.stage3 === stageName) ptsPerPnl = net.stage3Points || 1;
            else if (net.stage4 === stageName) ptsPerPnl = net.stage4Points || 1;
        }

        const tpp = net?.timePerPoint || 1.5;
        let elapsed = activeProg?.accumulatedTime || 0;
        if (activeProg?.status === 'RUNNING' && activeProg?.lastStartTimestamp) {
            elapsed += (currentTime - activeProg.lastStartTimestamp) / 1000;
        }
        
        const completedToday = (historyData || []).filter(h => h.machine === setup.name && h.date === VN_LOGICAL_DATE).reduce((s, h) => s + h.quantity, 0);
        const activeOutput = activeProg ? Math.floor(elapsed / (tpp * ptsPerPnl)) : 0;
        const totalOutput = completedToday + activeOutput;
        const dailyEfficiency = Math.min(100, Math.round((totalOutput / targetPnl) * 100));

        let statusDisplay: 'RUNNING' | 'STOPPED' | 'IDLE' = 'IDLE';
        let statusLabel = 'IDLE';
        let statusReason = setup.description || '';

        if (setup.note !== 'NORMAL') {
             statusDisplay = 'STOPPED';
             if (setup.note === 'BROKEN') statusLabel = 'ERROR';
             else if (setup.note === 'WAITING_MATERIAL') statusLabel = 'WAITING';
             else if (setup.note === 'NO_STOCK') statusLabel = 'EMPTY';
             else if (setup.note === 'MODEL_MISMATCH') statusLabel = 'WRONG_MDL';
             else statusLabel = 'STOPPED';
        } 
        else if (activeProg?.status === 'RUNNING') {
             statusDisplay = 'RUNNING'; statusLabel = 'RUNNING';
        }
        else if (activeProg?.status === 'STOPPED') {
             statusDisplay = 'STOPPED'; statusLabel = 'STOPPED';
        }

        const colorMap: Record<string, any> = {
            'RUNNING': { color: 'text-green-500', hex: '#22c55e', border: 'border-green-500/50', icon: Wifi, shadow: 'shadow-[0_0_15px_rgba(34,197,94,0.3)]' },
            'STOPPED': { color: 'text-red-500', hex: '#ef4444', border: 'border-red-500/50', icon: AlertTriangle, shadow: 'shadow-[0_0_15px_rgba(239,68,68,0.3)]' },
            'IDLE': { color: 'text-slate-600', hex: '#475569', border: 'border-slate-800', icon: Power, shadow: 'none' }
        };
        
        return {
            id: setup.id, name: setup.name, setup, activeJob, activeProg, stageName, dailyEfficiency, totalOutput, totalPoints: totalOutput * ptsPerPnl,
            netInfo: net, isBroken: setup.note === 'BROKEN' || setup.note === 'MODEL_MISMATCH', tpp, ptsPerPnl, statusDisplay, picName, statusLabel, statusReason,
            statusColorConfig: colorMap[statusDisplay] || colorMap['IDLE']
        };
    });
  }, [machineStatuses, data, historyData, currentTime, netData, targetPnl]);

  return (
    <div className="p-4 md:p-6 h-full overflow-y-auto bg-[#020617] flex flex-col gap-6 custom-scrollbar text-slate-200">
      <style>{`
        @keyframes rotate-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-rotate-slow { animation: rotate-slow 15s linear infinite; }
      `}</style>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {machineStats.map((m) => {
              const s = m.statusColorConfig;
              const isRunning = m.statusDisplay === 'RUNNING';
              const telemetry = {
                  table: m.netInfo?.tableTemp || 0,
                  pad: m.netInfo?.padTemp || 0,
                  pressure: m.netInfo?.airPressure || 6.5
              };

              return (
                <div key={m.id} className={`bg-[#0f172a] rounded-2xl border-2 overflow-hidden shadow-2xl transition-all duration-300 group hover:scale-[1.03] ${s.border} ${s.shadow}`}>
                     <div className="p-3 bg-slate-900/80 border-b border-slate-800 flex justify-between items-center">
                         <div className="flex items-center gap-2.5">
                            <Cpu size={16} className={m.statusDisplay === 'IDLE' ? 'text-slate-600' : 'text-blue-400'} />
                            <span className="text-[11px] font-black font-mono text-white uppercase tracking-tighter">{m.name}</span>
                         </div>
                         <div className="flex items-center gap-2">
                            <div className={`flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest ${s.color}`}>
                                <s.icon size={12} className={isRunning ? 'animate-pulse' : ''} /> {m.statusLabel}
                            </div>
                         </div>
                     </div>

                     <div className="p-4 space-y-4">
                         <div className="bg-[#020617] rounded-xl p-3 border border-slate-800 flex items-center gap-4 shadow-inner relative overflow-hidden group-hover:border-slate-700 transition-colors">
                            {m.isBroken && (
                                <div className="absolute inset-0 bg-red-900/80 z-10 flex flex-col items-center justify-center text-center p-2 backdrop-blur-sm animate-in fade-in">
                                    <AlertTriangle size={24} className="text-red-400 mb-1 animate-bounce"/>
                                    <span className="text-[10px] font-black text-white uppercase">{m.statusReason || 'SYSTEM ERROR'}</span>
                                </div>
                            )}

                            <div className="absolute top-0 right-0 p-2 opacity-5"><Monitor size={30} /></div>
                            
                            <TickRadialProgress progress={m.dailyEfficiency} color={s.hex} isRunning={isRunning} />
                            
                            <div className="flex-1 space-y-1 min-w-0 border-l border-slate-800 pl-4">
                                <div className="flex justify-between text-[9px] font-bold uppercase tracking-tight">
                                    <span className="text-slate-600">MDL:</span>
                                    <span className="text-blue-400 truncate ml-1 font-black">{m.activeJob?.model || '---'}</span>
                                </div>
                                <div className="flex justify-between text-[9px] font-bold uppercase tracking-tight">
                                    <span className="text-slate-600">LOT:</span>
                                    <span className="text-yellow-500 truncate ml-1 font-mono">{m.activeJob?.lotNo || '---'}</span>
                                </div>
                                <div className="flex justify-between text-[9px] font-bold uppercase tracking-tight">
                                    <span className="text-slate-600">STG:</span>
                                    <span className="text-purple-400 truncate ml-1">{m.stageName}</span>
                                </div>
                            </div>
                         </div>

                         <div className="space-y-1.5">
                            <div className="flex justify-between items-end">
                                <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-1.5">
                                    <Target size={12} className="text-slate-500"/> Output
                                </span>
                                <span className="text-[10px] font-black text-white font-mono">{m.totalOutput.toLocaleString()} / {targetPnl}</span>
                            </div>
                            <div className="h-1.5 w-full bg-slate-900 rounded-full border border-slate-800 overflow-hidden shadow-inner">
                                <div className={`h-full rounded-full transition-all duration-1000 ${isRunning ? 'bg-gradient-to-r from-blue-600 to-cyan-400 shadow-[0_0_8px_cyan]' : 'bg-slate-800'}`} style={{ width: `${m.dailyEfficiency}%` }}></div>
                            </div>
                         </div>

                         <div className="grid grid-cols-2 gap-2 border-t border-slate-800/50 pt-3.5">
                             <TelemetryItem label="Table" value={`${telemetry.table}°C`} icon={Thermometer} color="text-orange-500" />
                             <TelemetryItem label="Pad" value={`${telemetry.pad}°C`} icon={Layers} color="text-yellow-500" />
                             <TelemetryItem label="Air" value={`${telemetry.pressure} b`} icon={Wind} color="text-cyan-500" />
                             <TelemetryItem label="Cycle" value={`${m.tpp}s`} icon={Timer} color="text-blue-500" />
                         </div>

                         <div className="flex justify-between items-center border-t border-slate-800/50 pt-3 text-[10px] font-mono text-slate-600 font-bold uppercase tracking-tighter">
                             <div className="flex items-center gap-2">
                                <Timer size={12} className="text-slate-700" /> 
                                <span className={!isRunning ? 'text-slate-800' : 'text-slate-300'}>
                                    <MachineTimer lastStart={m.activeProg?.lastStartTimestamp} accumulated={m.activeProg?.accumulatedTime || 0} isRunning={isRunning} />
                                </span>
                             </div>
                             <div className="flex items-center gap-2">
                                <User size={12} className="text-slate-700" /> 
                                <span className={m.picName ? 'text-slate-300' : 'text-slate-800'}>
                                    {m.picName || '---'}
                                </span>
                             </div>
                         </div>
                     </div>
                </div>
              );
          })}
      </div>
    </div>
  );
};
