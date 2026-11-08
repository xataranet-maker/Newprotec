
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Factory, Search, Play, CheckCircle2, Timer, Box, Pause, 
  AlertOctagon, MonitorPlay, Thermometer, Wind, Cpu, 
  Layers, Check, X, ScanBarcode, Keyboard, History, Zap, Target, ChevronDown, Activity, Monitor,
  Wrench, AlertTriangle, MessageSquare, RotateCcw, Camera, ChevronLeft, ChevronRight, Plus,
  LayoutGrid, List as ListIcon, PlayCircle, Info, Maximize2, Settings2, Calendar, ClipboardPaste, ListOrdered, Award
} from 'lucide-react';
import { ImportRecord, MachineSetup, AccessoryRecord, NetDataRecord, AccessoryUsageRecord, StageProgress, Language, FaultRecord } from '../../types';
import { translations } from '../../data/locales';
import { ScannerModal } from '../common/ScannerModal';

const MiniRadialProgress: React.FC<{ progress: number, color: string, isRunning: boolean }> = ({ progress, color, isRunning }) => {
    const stroke = 3;
    const radius = 16;
    const normalizedRadius = radius - stroke * 2;
    const circumference = normalizedRadius * 2 * Math.PI;
    const strokeDashoffset = circumference - (Math.min(100, progress) / 100) * circumference;

    return (
        <div className="relative flex items-center justify-center w-8 h-8 shrink-0">
            <svg height={radius * 2} width={radius * 2} className="transform -rotate-90">
                <circle
                    stroke="rgba(30, 41, 59, 0.5)"
                    fill="transparent"
                    strokeWidth={stroke}
                    r={normalizedRadius}
                    cx={radius}
                    cy={radius}
                />
                <circle
                    stroke={color}
                    fill="transparent"
                    strokeWidth={stroke}
                    strokeDasharray={circumference + ' ' + circumference}
                    style={{ strokeDashoffset, transition: 'stroke-dashoffset 0.5s linear' }}
                    strokeLinecap="round"
                    r={normalizedRadius}
                    cx={radius}
                    cy={radius}
                    className={isRunning ? 'drop-shadow-[0_0_3px_rgba(255,255,255,0.5)]' : ''}
                />
            </svg>
            <span className="absolute text-[7px] font-black text-white">{Math.round(progress)}%</span>
        </div>
    );
};

const StageMiniCard: React.FC<{
    stageName: string;
    status: string;
    machine?: string;
    accLot?: string;
    progress: number;
    onPause?: () => void;
    onFinish?: () => void;
    onFault?: () => void;
}> = ({ stageName, status, machine, accLot, progress, onPause, onFinish, onFault }) => {
    let statusColor = "bg-slate-800 text-slate-500 border-slate-700";
    let strokeColor = "#475569";
    if (status === 'RUNNING') {
        statusColor = "bg-blue-900/40 text-blue-400 border-blue-500/50 animate-pulse";
        strokeColor = "#3b82f6";
    }
    if (status === 'STOPPED') {
        statusColor = "bg-red-900/40 text-red-400 border-red-500/50";
        strokeColor = "#ef4444";
    }
    if (status === 'COMPLETED') {
        statusColor = "bg-green-900/40 text-green-400 border-green-500/50";
        strokeColor = "#22c55e";
    }

    return (
        <div className={`flex items-center gap-2 p-1.5 rounded-xl border ${statusColor} min-w-[120px] transition-all relative group/mini`}>
            <MiniRadialProgress progress={progress} color={strokeColor} isRunning={status === 'RUNNING'} />
            <div className="flex flex-col min-w-0">
                <span className="text-[8px] font-black uppercase truncate">{stageName}</span>
                <span className="text-[7px] font-mono truncate opacity-70">{machine || '---'}</span>
            </div>
            
            {status === 'RUNNING' && (
                <div className="absolute inset-0 bg-slate-900/95 hidden group-hover/mini:flex items-center justify-center gap-1.5 rounded-xl transition-all">
                    <button onClick={onFinish} title="Finish" className="p-1 bg-green-600 rounded-md text-white hover:scale-110 active:scale-90"><Check size={10}/></button>
                    <button onClick={onPause} title="Pause" className="p-1 bg-orange-600 rounded-md text-white hover:scale-110 active:scale-90"><Pause size={10}/></button>
                    <button onClick={onFault} title="Fault" className="p-1 bg-red-600 rounded-md text-white hover:scale-110 active:scale-90"><AlertTriangle size={10}/></button>
                </div>
            )}
        </div>
    );
};

interface MultiAutoProductionProps {
    data: ImportRecord[];
    onUpdateStatus: (id: number, newStatus: 'RUNNING' | 'COMPLETED' | 'STOPPED', stopReason?: string, stage?: string, extra?: any) => void;
    onUpdateMachine: (id: number, machine: string, stage?: string, moldNo?: string) => void;
    onLinkAccessory: (productionId: number, accessoryLot: string, quantity: number, stage?: string) => void;
    onUpdateMpsBatch?: (updates: {id: number, mpsDate: string, stayDurationMinutes: number, stayDurationHuman: string}[]) => void;
    machineStatuses: MachineSetup[];
    accessoriesData: AccessoryRecord[];
    accessoriesUsage?: AccessoryUsageRecord[];
    netData: NetDataRecord[];
    language?: Language;
    faultRecords?: FaultRecord[];
}

export const MultiAutoProduction: React.FC<MultiAutoProductionProps> = ({ 
    data, onUpdateStatus, onUpdateMachine, onLinkAccessory, onUpdateMpsBatch, machineStatuses, 
    accessoriesData, accessoriesUsage = [], netData, language = 'vi', faultRecords = []
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeLotId, setActiveLotId] = useState<number | null>(null);
  const [sidebarSearch, setSidebarSearch] = useState('');
  const [nowTs, setNowTs] = useState(Date.now());
  const sidebarInputRef = useRef<HTMLInputElement>(null);
  
  const [tempAccessoryByStage, setTempAccessoryByStage] = useState<Record<string, string>>({});
  const [isMpsPasteOpen, setIsMpsPasteOpen] = useState(false);
  const [mpsPasteText, setMpsPasteText] = useState('');
  const [reportingFault, setReportingFault] = useState<{ id: number, stage: string } | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setNowTs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const selectedRecord = useMemo(() => data.find(r => r.id === activeLotId), [data, activeLotId]);
  
  const machinesCurrentlyRunning = useMemo(() => {
    const busy = new Set<string>();
    data.forEach(record => {
        if (record.productionProgress) {
            (Object.values(record.productionProgress) as StageProgress[]).forEach((p) => {
                if (p.machine && (p.status === 'RUNNING' || p.status === 'STOPPED')) {
                    busy.add(p.machine);
                }
            });
        }
    });
    return busy;
  }, [data]);

  const busyAccessoryLots = useMemo(() => {
    const busy = new Set<string>();
    data.forEach(r => {
        if (r.productionProgress) {
            (Object.values(r.productionProgress) as StageProgress[]).forEach((p) => {
                if (p.accessoryLot && p.status !== 'COMPLETED') {
                    p.accessoryLot.split(',').forEach((l: string) => {
                        const trimmed = l.trim();
                        if (trimmed) busy.add(trimmed);
                    });
                }
            });
        }
    });
    return busy;
  }, [data]);

  const selectedStages = useMemo(() => {
    if (!selectedRecord) return [];
    const net = netData.find(n => n.model === selectedRecord.model && n.code === selectedRecord.code);
    const stages = [];
    if (net) {
        if (net.stage) stages.push({ name: net.stage, pts: net.stage1Points });
        if (net.stage2) stages.push({ name: net.stage2, pts: net.stage2Points });
        if (net.stage3) stages.push({ name: net.stage3, pts: net.stage3Points });
        if (net.stage4) stages.push({ name: net.stage4, pts: net.stage4Points });
    } else {
        stages.push({ name: selectedRecord.stage, pts: 0 });
    }
    return stages;
  }, [selectedRecord, netData]);

  const runningRecords = useMemo(() => {
      return data.filter(r => r.productionProgress && (Object.values(r.productionProgress) as StageProgress[]).some((p) => p.status === 'RUNNING' || p.status === 'STOPPED'));
  }, [data]);

  const waitingRecords = useMemo(() => {
      const list = data.filter(r => r.isVerified && (!r.productionProgress || (Object.values(r.productionProgress) as StageProgress[]).every((p) => p.status === 'PENDING')));
      return list.sort((a, b) => {
          const dateA = a.mpsDate ? new Date(a.mpsDate.split('/').reverse().join('-')).getTime() : Infinity;
          const dateB = b.mpsDate ? new Date(b.mpsDate.split('/').reverse().join('-')).getTime() : Infinity;
          if (dateA !== dateB) return dateA - dateB;
          return (b.stayDurationMinutes || 0) - (a.stayDurationMinutes || 0);
      });
  }, [data]);

  const earliestMpsDate = useMemo(() => {
      let minVal = Infinity;
      waitingRecords.forEach(r => {
          if (!r.mpsDate) return;
          const parts = r.mpsDate.split('/');
          const dateVal = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0])).getTime();
          if (dateVal < minVal) minVal = dateVal;
      });
      return minVal === Infinity ? null : minVal;
  }, [waitingRecords]);

  const handleAddToHub = (id: number) => {
      setActiveLotId(id);
      if (!isSidebarOpen) setIsSidebarOpen(true);
  };

  const handleSidebarFastInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
        const val = sidebarSearch.trim().toUpperCase();
        const matched = data.find(r => r.lotNo === val || r.model === val);
        if (matched) {
            setActiveLotId(matched.id);
            setSidebarSearch('');
            if (!isSidebarOpen) setIsSidebarOpen(true);
        } else {
            alert("Không tìm thấy lô hàng: " + val);
        }
    }
  };

  const parseKoreanTimeToMinutes = (koreanStr: string): number => {
      if (!koreanStr) return 0;
      const days = parseInt(koreanStr.match(/(\d+)일/)?.[1] || '0');
      const hours = parseInt(koreanStr.match(/(\d+)시간/)?.[1] || '0');
      const minutes = parseInt(koreanStr.match(/(\d+)분/)?.[1] || '0');
      return days * 1440 + hours * 60 + minutes;
  };

  const handleApplyMpsPaste = () => {
      if (!mpsPasteText.trim() || !onUpdateMpsBatch) return;
      const pattern = /([A-Z0-9_-]+)\s+(\d{1,2}\/\d{1,2}\/\d{4})\s+((?:\d+일\s*)?(?:\d+시간\s*)?(?:\d+분)?)/gi;
      let match;
      const batchUpdates = [];
      while ((match = pattern.exec(mpsPasteText)) !== null) {
          const lotNo = match[1].toUpperCase();
          const targets = data.filter(r => r.lotNo === lotNo);
          targets.forEach(t => {
              batchUpdates.push({
                  id: t.id, mpsDate: match[2],
                  stayDurationMinutes: parseKoreanTimeToMinutes(match[3].trim()),
                  stayDurationHuman: match[3].trim()
              });
          });
      }
      if (batchUpdates.length > 0) onUpdateMpsBatch(batchUpdates);
      setMpsPasteText('');
      setIsMpsPasteOpen(false);
  };

  const handleQuickStart = (stageName: string) => {
      if (!selectedRecord) return;
      const prog = selectedRecord.productionProgress?.[stageName];
      if (prog?.machine && machinesCurrentlyRunning.has(prog.machine)) {
          alert(`Máy ${prog.machine} đang bận chạy lô khác. Đã vào Queue.`);
          return;
      }
      if (!prog?.machine || !prog?.accessoryLot) {
          alert("Vui lòng chọn Máy và Lot Phụ liệu trước!");
          return;
      }
      onUpdateStatus(selectedRecord.id, 'RUNNING', undefined, stageName);
  };

  const handleReportFault = (faultName: string) => {
    if (!reportingFault) return;
    onUpdateStatus(reportingFault.id, 'STOPPED', faultName, reportingFault.stage);
    setReportingFault(null);
  };

  // Logic cải tiến: Lọc Lot PL khả dụng (đã trừ tiêu hao thực tế)
  const getCompatibleAccessories = (model: string, stage: string) => {
      const stockMap = new Map<string, { lot: string, qty: number, expDate: string }>();
      
      accessoriesData.forEach(item => {
          if (item.model === model && item.stage === stage) { 
              if (!stockMap.has(item.lotNo)) {
                  stockMap.set(item.lotNo, { lot: item.lotNo, qty: 0, expDate: item.expirationDate || '' });
              }
              stockMap.get(item.lotNo)!.qty += item.quantity;
          }
      });
      
      // Trừ đi lượng đã được gán (usage) để ra tồn thực tế
      accessoriesUsage.forEach(use => {
          if (stockMap.has(use.accessoryLotNo)) {
              stockMap.get(use.accessoryLotNo)!.qty -= use.quantity;
          }
      });

      return Array.from(stockMap.values()).filter(i => i.qty > 0);
  };

  const handleAddAccessoryToStage = (stageName: string, stagePoints: number) => {
      if (!selectedRecord) return;
      const lotToLink = tempAccessoryByStage[stageName]?.toUpperCase();
      if (!lotToLink) return;

      const compatible = getCompatibleAccessories(selectedRecord.model, stageName);
      const selectedItem = compatible.find(i => i.lot === lotToLink);

      if (!selectedItem) {
          alert("Lot phụ liệu không hợp lệ hoặc đã hết hàng.");
          return;
      }

      // Tính toán lượng tiêu hao: PNL * Points
      const qtyToConsume = selectedRecord.quantity * (stagePoints || 1);

      if (busyAccessoryLots.has(lotToLink)) {
          const currentLots = selectedRecord.productionProgress?.[stageName]?.accessoryLot || '';
          if (!currentLots.includes(lotToLink)) {
              alert(`Lot phụ liệu ${lotToLink} đang được sử dụng ở đơn khác.`);
              return;
          }
      }

      onLinkAccessory(selectedRecord.id, lotToLink, qtyToConsume, stageName);
      setTempAccessoryByStage(prev => ({ ...prev, [stageName]: '' }));
  };

  return (
    <div className="flex h-full bg-[#020617] overflow-hidden text-slate-300 font-sans">
      <div className={`bg-slate-900 border-r border-slate-800 transition-all duration-500 flex flex-col relative shrink-0 shadow-2xl z-20 ${isSidebarOpen ? 'w-[320px]' : 'w-0'}`}>
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-xl z-30">
              {isSidebarOpen ? <ChevronLeft size={16}/> : <ChevronRight size={16}/>}
          </button>
          <div className={`flex flex-col h-full ${!isSidebarOpen && 'hidden'}`}>
              <div className="p-4 bg-slate-800/50 border-b border-slate-700 flex flex-col gap-3">
                  <div className="flex justify-between items-center">
                    <h2 className="text-[10px] font-black uppercase tracking-widest text-blue-400 flex items-center gap-2">
                        <Zap size={14}/> Thao tác nhanh
                    </h2>
                    <span className="text-[9px] font-bold text-slate-500 font-mono">FAST_ENTRY</span>
                  </div>
                  <div className="relative">
                      <input 
                        ref={sidebarInputRef} type="text" value={sidebarSearch}
                        onChange={(e) => setSidebarSearch(e.target.value)}
                        onKeyDown={handleSidebarFastInput}
                        placeholder="Nhập/Bắn mã Lot..."
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-green-400 font-mono focus:border-blue-500 outline-none shadow-inner"
                      />
                      <ScanBarcode size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600"/>
                  </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar text-slate-300">
                  {!selectedRecord ? (
                      <div className="h-full flex flex-col items-center justify-center text-center opacity-30 gap-3 py-20">
                          <MonitorPlay size={48}/>
                          <p className="text-[10px] font-bold uppercase px-4 leading-relaxed">Dán MPS hoặc nhập Lot vào ô trên hoặc chọn (+) từ danh sách</p>
                      </div>
                  ) : (
                      <div className="space-y-6 animate-in fade-in slide-in-from-left-4">
                          <div className="bg-slate-800 rounded-xl p-4 border border-blue-500/30 shadow-inner relative group">
                              <button onClick={() => setActiveLotId(null)} className="absolute top-2 right-2 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"><X size={14}/></button>
                              <span className="text-[8px] font-black text-blue-500 uppercase block mb-1">Cấu hình sản xuất:</span>
                              <h3 className="text-sm font-black text-white truncate">{selectedRecord.model}</h3>
                              <div className="flex justify-between items-center mt-2">
                                  <span className="text-[10px] font-mono text-yellow-500 font-bold">{selectedRecord.lotNo}</span>
                                  <span className="text-[10px] font-black text-slate-500">{selectedRecord.quantity} PNL</span>
                              </div>
                          </div>
                          <div className="space-y-4">
                              <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><Settings2 size={12}/> Thiết lập công đoạn</h4>
                              {selectedStages.map((stage, idx) => {
                                  const prog = selectedRecord.productionProgress?.[stage.name] || { status: 'PENDING' };
                                  const isDone = prog.status === 'COMPLETED';
                                  const isRun = prog.status === 'RUNNING';
                                  const isStop = prog.status === 'STOPPED';
                                  
                                  const compatibleAccessories = getCompatibleAccessories(selectedRecord.model, stage.name);
                                  const isMachineTrulyBusy = prog.machine && machinesCurrentlyRunning.has(prog.machine);

                                  return (
                                      <div key={idx} className={`p-3 rounded-xl border-2 transition-all ${isDone ? 'bg-green-900/10 border-green-500/30 opacity-60' : 'bg-slate-800/50 border-slate-700'}`}>
                                          <div className="flex justify-between items-center mb-3">
                                              <span className="text-[10px] font-black text-white">{idx+1}. {stage.name}</span>
                                              {isDone && <CheckCircle2 size={14} className="text-green-500"/>}
                                          </div>
                                          <div className="space-y-2">
                                              <select 
                                                value={prog.machine || ''}
                                                onChange={(e) => onUpdateMachine(selectedRecord.id, e.target.value, stage.name)}
                                                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-[10px] font-bold outline-none focus:border-blue-500"
                                                disabled={isDone || isRun}
                                              >
                                                  <option value="">-- Chọn máy --</option>
                                                  {machineStatuses.map(m => {
                                                      const isBusy = machinesCurrentlyRunning.has(m.name) && m.name !== prog.machine;
                                                      return <option key={m.id} value={m.name} disabled={m.note !== 'NORMAL'}>
                                                          {m.name} {isBusy ? '(ĐANG CHẠY - HÀNG CHỜ)' : ''} {m.note !== 'NORMAL' ? `(${m.note})` : ''}
                                                      </option>;
                                                  })}
                                              </select>

                                              <div className="flex flex-wrap gap-1 mb-1">
                                                  {prog.accessoryLot ? prog.accessoryLot.split(', ').map((lot, lIdx) => (
                                                      <span key={lIdx} className="bg-blue-900/40 text-blue-300 border border-blue-800 px-1.5 py-0.5 rounded text-[8px] font-mono flex items-center gap-1">
                                                          {lot}
                                                          {(!isDone && !isRun) && (
                                                              <button onClick={() => {
                                                                  const rem = prog.accessoryLot?.split(', ').filter(l => l !== lot).join(', ');
                                                                  onUpdateStatus(selectedRecord.id, prog.status, undefined, stage.name, { accessoryLot: rem });
                                                              }} className="hover:text-red-400"><X size={8}/></button>
                                                          )}
                                                      </span>
                                                  )) : <span className="text-[8px] text-slate-600 italic">Chưa gán phụ liệu</span>}
                                              </div>

                                              {!isDone && !isRun && (
                                                  <div className="flex gap-1">
                                                      <div className="relative flex-1">
                                                          <input 
                                                            list={`acc-list-${stage.name}`} type="text" value={tempAccessoryByStage[stage.name] || ''}
                                                            onChange={(e) => setTempAccessoryByStage(prev => ({ ...prev, [stage.name]: e.target.value }))}
                                                            placeholder="Lot phụ liệu..."
                                                            className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-[10px] font-mono outline-none focus:border-green-500 uppercase"
                                                          />
                                                          <datalist id={`acc-list-${stage.name}`}>
                                                              {compatibleAccessories.map(a => {
                                                                  const isBusy = busyAccessoryLots.has(a.lot) && !prog.accessoryLot?.includes(a.lot);
                                                                  return <option key={a.lot} value={a.lot}>{isBusy ? `[BẬN] ${a.lot}` : a.lot} (Tồn: {a.qty})</option>;
                                                              })}
                                                          </datalist>
                                                      </div>
                                                      <button onClick={() => handleAddAccessoryToStage(stage.name, stage.pts)} className="p-1.5 bg-green-600 text-white rounded hover:bg-green-500"><Plus size={14}/></button>
                                                  </div>
                                              )}
                                              
                                              {(!isDone && !isRun && !isStop) && (
                                                  <button onClick={() => handleQuickStart(stage.name)} disabled={isMachineTrulyBusy} className={`w-full py-1.5 rounded text-[9px] font-black uppercase shadow-lg border-b-2 transition-all active:scale-95 ${isMachineTrulyBusy ? 'bg-slate-700 text-slate-500 border-slate-800 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 text-white border-blue-800'}`}>
                                                      {isMachineTrulyBusy ? 'MÁY ĐANG BẬN - ĐÃ VÀO QUEUE' : 'BẮT ĐẦU'}
                                                  </button>
                                              )}
                                              {isRun && (
                                                   <div className="grid grid-cols-3 gap-1">
                                                       <button onClick={() => onUpdateStatus(selectedRecord.id, 'COMPLETED', undefined, stage.name)} className="py-1.5 bg-green-600 hover:bg-green-500 text-white rounded text-[9px] font-black uppercase shadow-lg border-b-2 border-green-800">Finish</button>
                                                       <button onClick={() => onUpdateStatus(selectedRecord.id, 'STOPPED', 'Tạm dừng thủ công', stage.name)} className="py-1.5 bg-orange-600 hover:bg-orange-500 text-white rounded text-[9px] font-black uppercase shadow-lg border-b-2 border-orange-800">Pause</button>
                                                       <button onClick={() => setReportingFault({ id: selectedRecord.id, stage: stage.name })} className="py-1.5 bg-red-600 hover:bg-red-500 text-white rounded text-[9px] font-black uppercase shadow-lg border-b-2 border-red-800">Fault</button>
                                                   </div>
                                              )}
                                              {isStop && <button onClick={() => onUpdateStatus(selectedRecord.id, 'RUNNING', undefined, stage.name)} className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[9px] font-black uppercase shadow-lg border-b-2 border-indigo-800 active:scale-95 transition-all">Tiếp tục (Resume)</button>}
                                          </div>
                                      </div>
                                  );
                              })}
                          </div>
                      </div>
                  )}
              </div>
          </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0">
          <div className="p-4 bg-slate-900/50 border-b border-slate-800 shrink-0">
              <div className="flex items-center justify-between mb-3 px-1">
                  <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><Activity size={14} className="text-green-400"/> Đang sản xuất (Live Status)</h3>
                  <span className="text-[9px] font-mono text-slate-600">{runningRecords.length} Lots active</span>
              </div>
              <div className="flex gap-4 overflow-x-auto pb-2 custom-scrollbar scroll-smooth">
                  {runningRecords.length === 0 ? <div className="w-full py-6 text-center text-slate-700 italic text-[10px] uppercase border border-dashed border-slate-800 rounded-xl">Chưa có lô hàng nào đang vận hành</div> : (
                      runningRecords.map(r => {
                        const activeMachines = Array.from(new Set(Object.values(r.productionProgress || {}).filter((p: any) => p.status === 'RUNNING' || p.status === 'STOPPED').map((p: any) => p.machine))).filter(Boolean);
                        return (
                          <div key={r.id} className="bg-slate-800 border border-slate-700 rounded-2xl p-3 min-w-[340px] flex flex-col gap-3 shadow-2xl hover:border-blue-500/50 transition-all shrink-0">
                              <div className="flex justify-between items-start border-b border-slate-700/50 pb-2">
                                  <div className="min-w-0"><div className="text-[10px] font-black text-white uppercase truncate">{r.model}</div><div className="text-[9px] font-mono text-yellow-500 font-bold">{r.lotNo}</div></div>
                                  <button onClick={() => handleAddToHub(r.id)} className="p-1 hover:bg-slate-700 rounded text-blue-400"><Maximize2 size={14}/></button>
                              </div>
                              <div className="bg-slate-900/80 px-3 py-1.5 rounded-xl border border-blue-500/20 flex items-center gap-2 shadow-inner">
                                  <div className="p-1 bg-blue-600 rounded-md text-white"><Monitor size={10}/></div>
                                  <div className="flex items-center gap-1.5 flex-1 min-w-0 overflow-hidden">
                                      <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Node_Active:</span>
                                      <span className="text-[11px] font-black text-white font-mono truncate uppercase tracking-tighter">{activeMachines.join(' | ') || 'DISCONNECTED'}</span>
                                  </div>
                                  <div className={`w-1.5 h-1.5 rounded-full ${activeMachines.length > 0 ? 'bg-green-500 animate-pulse' : 'bg-slate-700'}`}></div>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                  {Object.keys(r.productionProgress || {}).map(stName => {
                                      const p = r.productionProgress![stName];
                                      const net = netData.find(n => n.model === r.model && n.code === r.code);
                                      let pts = 1;
                                      if (net) {
                                          if (net.stage === stName) pts = net.stage1Points || 1;
                                          else if (net.stage2 === stName) pts = net.stage2Points || 1;
                                          else if (net.stage3 === stName) pts = net.stage3Points || 1;
                                          else if (net.stage4 === stName) pts = net.stage4Points || 1;
                                      }
                                      let livePercent = 0;
                                      if (p.status === 'COMPLETED') livePercent = 100;
                                      else if (p.status === 'RUNNING' || p.status === 'STOPPED') {
                                          let elapsed = p.accumulatedTime || 0;
                                          if (p.status === 'RUNNING' && p.lastStartTimestamp) elapsed += (nowTs - p.lastStartTimestamp) / 1000;
                                          const totalEstSeconds = r.quantity * pts * (net?.timePerPoint || 1.5);
                                          if (totalEstSeconds > 0) livePercent = Math.min(99.9, Math.round((elapsed / totalEstSeconds) * 100 * 10) / 10);
                                      }
                                      return <StageMiniCard key={stName} stageName={stName} status={p.status} machine={p.machine} progress={livePercent} onPause={() => onUpdateStatus(r.id, 'STOPPED', 'Tạm dừng thủ công', stName)} onFinish={() => onUpdateStatus(r.id, 'COMPLETED', undefined, stName)} onFault={() => setReportingFault({ id: r.id, stage: stName })}/>;
                                  })}
                              </div>
                          </div>
                        );
                      })
                  )}
              </div>
          </div>

          <div className="flex-1 flex flex-col min-h-0 bg-[#020617]">
                <div className="p-4 bg-slate-950/40 border-b border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4">
                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><History size={14}/> Danh sách chờ làm việc</h3>
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <button onClick={() => setIsMpsPasteOpen(!isMpsPasteOpen)} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all shadow-md active:scale-95 border ${isMpsPasteOpen ? 'bg-orange-600 text-white border-orange-500' : 'bg-slate-800 text-orange-400 border-orange-800/50 hover:bg-slate-700'}`}><ClipboardPaste size={14}/> Dán MPS</button>
                        <div className="relative w-64"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} /><input type="text" placeholder="Tìm model, lô..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-full pl-9 pr-4 py-1.5 text-[10px] text-white focus:border-blue-500 outline-none shadow-inner"/></div>
                    </div>
                </div>
                {isMpsPasteOpen && (
                    <div className="p-4 bg-slate-900 border-b border-slate-700 animate-in slide-in-from-top-4 duration-300">
                        <div className="max-w-4xl mx-auto space-y-3">
                             <div className="flex justify-between items-center"><label className="text-[10px] font-black text-orange-400 uppercase tracking-widest">Dán MPS [LOT] [NGÀY] [THỜI GIAN TIẾNG HÀN]</label><div className="flex gap-2"><button onClick={handleApplyMpsPaste} className="bg-green-600 hover:bg-green-500 text-white px-3 py-1 rounded text-[10px] font-black uppercase border-b-2 border-green-800">Cập nhật ngay</button><button onClick={() => { setMpsPasteText(''); setIsMpsPasteOpen(false); }} className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-1 rounded text-[10px] font-black uppercase">Đóng</button></div></div>
                             <textarea value={mpsPasteText} onChange={e => setMpsPasteText(e.target.value)} placeholder="Ví dụ: LOT001 20/01/2026 2일 5시간 30분" className="w-full h-24 bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs font-mono text-cyan-400 focus:border-orange-500 outline-none shadow-inner resize-none"/>
                        </div>
                    </div>
                )}
                <div className="flex-1 overflow-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse text-[11px]">
                        <thead className="bg-slate-900 text-slate-500 uppercase font-black font-mono border-b border-slate-800 sticky top-0 z-10 shadow-sm">
                            <tr><th className="px-4 py-4 w-12 text-center">Nạp</th><th className="px-4 py-4 w-20 text-center">Ưu Tiên</th><th className="px-4 py-4">Sản Phẩm / Lô TP</th><th className="px-4 py-4">Công Đoạn</th><th className="px-4 py-4 text-center">Ngày lên KH MPS</th><th className="px-4 py-4 text-center">Tồn tại BP</th><th className="px-4 py-4 text-right">Số Lượng</th><th className="px-4 py-4 text-center">Trạng Thái</th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                            {waitingRecords.filter(r => r.model.includes(searchTerm) || r.lotNo.includes(searchTerm)).map((record, index) => {
                                let isHighlighted = false;
                                if (record.mpsDate && earliestMpsDate) {
                                    const parts = record.mpsDate.split('/');
                                    const mpsVal = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0])).getTime();
                                    if (mpsVal === earliestMpsDate) isHighlighted = true;
                                }
                                const isAssignedToMachine = (Object.values(record.productionProgress || {}) as StageProgress[]).some((p) => p.machine);
                                return (
                                    <tr key={record.id} className={`hover:bg-blue-900/5 transition-colors group ${isHighlighted ? 'bg-orange-500/10 border-y border-orange-500/30' : ''} ${isAssignedToMachine ? 'bg-blue-900/5' : ''}`}>
                                        <td className="px-4 py-3 text-center"><button onClick={() => handleAddToHub(record.id)} className="p-1.5 bg-blue-600/20 text-blue-400 rounded-lg hover:bg-blue-600 hover:text-white transition-all active:scale-90 border border-blue-500/30"><Plus size={16}/></button></td>
                                        <td className="px-4 py-3 text-center"><div className="flex flex-col items-center gap-0.5">{index === 0 ? <div className="flex flex-col items-center animate-bounce"><Award size={18} className="text-yellow-500 fill-yellow-500/20"/><span className="text-[10px] font-black text-yellow-500 font-mono">UT-01</span></div> : <div className="bg-slate-900 border border-slate-700 rounded px-2 py-0.5 min-w-[45px] text-center"><span className="text-[9px] font-black text-slate-500 font-mono">UT-{String(index + 1).padStart(2, '0')}</span></div>}</div></td>
                                        <td className="px-4 py-3"><div className="font-bold text-white uppercase text-[12px]">{record.model}</div><div className="text-[10px] font-mono font-bold text-yellow-500 flex items-center gap-1 mt-1 uppercase"><Box size={10}/> {record.lotNo}</div></td>
                                        <td className="px-4 py-3"><span className="bg-slate-900 border border-slate-700 px-2 py-1 rounded text-[10px] font-black text-slate-400 uppercase">{record.stage}</span></td>
                                        <td className="px-4 py-3 text-center"><div className="flex items-center justify-center gap-2"><Calendar size={14} className={isHighlighted ? 'text-orange-500' : 'text-slate-600'}/><span className={`font-mono font-black text-[12px] ${isHighlighted ? 'text-orange-400' : 'text-slate-500'}`}>{record.mpsDate || '--/--/----'}</span></div></td>
                                        <td className="px-4 py-3 text-center"><div className="flex flex-col items-center gap-1"><span className={`font-mono font-bold text-[11px] ${record.stayDurationMinutes && record.stayDurationMinutes > 2880 ? 'text-red-500' : 'text-slate-400'}`}>{record.stayDurationHuman || '---'}</span>{record.stayDurationMinutes && record.stayDurationMinutes > 2880 && <AlertTriangle size={12} className="text-red-500 animate-pulse"/>}</div></td>
                                        <td className="px-4 py-3 text-right font-black text-white text-sm font-mono">{record.quantity.toLocaleString()}</td>
                                        <td className="px-4 py-3 text-center">{isAssignedToMachine ? <div className="flex flex-col items-center gap-1"><ListOrdered size={16} className="text-blue-400 animate-pulse" /><span className="text-[8px] font-black text-blue-500 uppercase whitespace-nowrap">QUEUE</span></div> : <span className="text-[9px] font-black text-slate-600 uppercase border border-slate-800 px-2 py-0.5 rounded">Pending</span>}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
          </div>
      </div>
      {reportingFault && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
              <div className="bg-slate-800 rounded-2xl border border-red-500/50 shadow-2xl max-w-sm w-full overflow-hidden">
                  <div className="px-5 py-3 bg-red-600 text-white flex justify-between items-center font-black uppercase text-xs"><h2>Báo cáo sự cố hệ thống</h2><button onClick={() => setReportingFault(null)}><X size={18}/></button></div>
                  <div className="p-6 space-y-4">
                      <p className="text-[10px] text-slate-400 uppercase font-bold text-center">Chọn loại lỗi phát sinh tại công đoạn {reportingFault.stage}</p>
                      <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto custom-scrollbar">{faultRecords.length > 0 ? faultRecords.map(f => (<button key={f.id} onClick={() => handleReportFault(f.errorName)} className="w-full p-2 bg-slate-900 hover:bg-red-900/20 border border-slate-700 hover:border-red-500 rounded text-[11px] font-bold text-slate-300 text-left transition-all">{f.errorName}</button>)) : <p className="text-center text-slate-500 text-xs py-4 italic">Chưa có danh mục lỗi</p>}<button onClick={() => handleReportFault('Lỗi không xác định')} className="w-full p-2 bg-slate-700 hover:bg-red-600 text-white rounded text-[11px] font-bold">Lỗi khác...</button></div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
