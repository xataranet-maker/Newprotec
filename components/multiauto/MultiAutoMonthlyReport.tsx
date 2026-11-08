
import React, { useMemo, useState, useEffect } from 'react';
import { 
    CalendarDays, ChevronLeft, ChevronRight, Clock, Activity, 
    Target, CheckCircle2, Zap, TrendingUp, Hourglass, Monitor,
    Timer, AlertTriangle, Edit, Save, X, Download
} from 'lucide-react';
import { ProductionHistoryRecord, NetDataRecord, Language, MachineSetup } from '../../types';
import { translations } from '../../data/locales';
import { exportToExcel } from '../../services/excelService';

interface MultiAutoMonthlyReportProps {
  moduleName?: string;
  historyData: ProductionHistoryRecord[]; 
  netData: NetDataRecord[]; 
  machines?: MachineSetup[]; 
  language?: Language;
  targetPnl?: number; 
  onUpdateTarget?: (val: number) => void;
}

interface DailyStats {
  pnl: number;
  points: number;
  runTimeSeconds: number;
}

const SHIFT_SECONDS = 20 * 3600; // 20 giờ tiêu chuẩn (72000 giây)

const MachineGraphic: React.FC<{ status: string }> = ({ status }) => {
    let greenLight = '#052e16';
    let redLight = '#450a0a';
    let yellowLight = '#422006';
    let blueLight = '#172554';
    let screenColor = '#020617';
    let screenLine = '#22c55e'; 

    if (status === 'BROKEN') { redLight = '#ef4444'; screenColor = '#450a0a'; screenLine = '#ef4444'; }
    else if (status === 'WAITING' || status === 'NO_STOCK' || status === 'MISMATCH') { yellowLight = '#eab308'; screenColor = '#422006'; screenLine = '#eab308'; }
    else if (status === 'RUNNING') { greenLight = '#22c55e'; }
    else if (status === 'COMPLETED') { blueLight = '#3b82f6'; }

    return (
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-sm">
            <rect width="100" height="100" fill="#1e293b" />
            <rect x="5" y="5" width="90" height="90" rx="2" fill="#334155" stroke="#475569" strokeWidth="2" />
            <rect x="10" y="10" width="80" height="12" fill="#0f172a" stroke="#1e293b" strokeWidth="1" />
            <rect x="30" y="12" width="8" height="8" fill={redLight} className={status === 'BROKEN' ? 'animate-pulse' : ''} />
            <rect x="42" y="12" width="8" height="8" fill={greenLight} className={status === 'RUNNING' ? 'animate-pulse' : ''} />
            <rect x="54" y="12" width="8" height="8" fill={yellowLight} className={status === 'WAITING' ? 'animate-pulse' : ''} />
            <rect x="66" y="12" width="8" height="8" fill={blueLight} />
            <rect x="35" y="28" width="55" height="40" fill="#475569" stroke="#64748b" strokeWidth="1" />
            <rect x="38" y="31" width="49" height="34" fill={screenColor} />
            {status === 'BROKEN' ? (
                 <path d="M 45 40 L 80 55 M 80 40 L 45 55" fill="none" stroke="#ef4444" strokeWidth="3" />
            ) : (
                 <path d="M 45 48 L 55 55 L 75 40" fill="none" stroke={screenLine} strokeWidth="2" />
            )}
            <rect x="10" y="75" width="80" height="15" fill="#1e293b" stroke="#000" />
        </svg>
    );
};

export const MultiAutoMonthlyReport: React.FC<MultiAutoMonthlyReportProps> = ({ 
    moduleName = 'Multi Auto', historyData = [], netData = [], machines = [], language = 'vi', targetPnl = 500, onUpdateTarget
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const t = translations[language] || translations['en'];
  
  // State for Editing Target
  const [isEditingTarget, setIsEditingTarget] = useState(false);
  const [tempTarget, setTempTarget] = useState(targetPnl);

  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Real-time timer to ensure the "Current Day" highlight shifts exactly at 8AM
  const [now, setNow] = useState(new Date());

  useEffect(() => {
      const timer = setInterval(() => setNow(new Date()), 60000); // Check every minute
      return () => clearInterval(timer);
  }, []);

  // Determine current "Production Day" for highlighting
  const currentProductionDay = useMemo(() => {
      const d = new Date(now);
      if (d.getHours() < 8) {
          d.setDate(d.getDate() - 1);
      }
      return d.getDate();
  }, [now]);

  // Update temp target when prop changes
  useEffect(() => {
      setTempTarget(targetPnl);
  }, [targetPnl]);

  const handleSaveTarget = () => {
      if (onUpdateTarget) {
          onUpdateTarget(tempTarget);
      }
      setIsEditingTarget(false);
  };

  const handleCancelEdit = () => {
      setTempTarget(targetPnl);
      setIsEditingTarget(false);
  };

  // Danh sách máy cố định hoặc lấy từ history
  const machineList = useMemo(() => {
      if (machines && machines.length > 0) return machines.map(m => m.name);
      const uniqueNames = Array.from(new Set((historyData || []).map(h => h.machine))).filter(Boolean) as string[];
      return uniqueNames.length > 0 ? uniqueNames.sort() : ['Multi 01', 'Multi 02', 'Multi 03', 'Multi 04'];
  }, [machines, historyData]);

  const reportData = useMemo(() => {
      const dataMap = new Map<string, Map<number, DailyStats>>();
      machineList.forEach(m => {
          const dayMap = new Map<number, DailyStats>();
          daysArray.forEach(d => dayMap.set(d, { pnl: 0, points: 0, runTimeSeconds: 0 }));
          dataMap.set(m, dayMap);
      });

      if (historyData && Array.isArray(historyData)) {
          historyData.forEach(record => {
              if (!record.date || !record.machine) return;
              const parts = record.date.split('/');
              if (parts.length !== 3) return;

              const d = parseInt(parts[0]);
              const m = parseInt(parts[1]);
              const y = parseInt(parts[2]);
              
              if ((m - 1) === currentMonth && y === currentYear) {
                  const machineMap = dataMap.get(record.machine);
                  if (machineMap) {
                      const dayStats = machineMap.get(d);
                      if (dayStats) {
                          dayStats.pnl += (record.quantity || 0);
                          
                          // Tìm định mức để tính runTimeSeconds lý thuyết
                          const net = (netData || []).find(n => n.model === record.model && n.code === record.code);
                          let ptsPerPnl = 0;
                          if (net) {
                              const stage = record.stageCompleted || record.stage;
                              if (net.stage === stage) ptsPerPnl = net.stage1Points || 0;
                              else if (net.stage2 === stage) ptsPerPnl = net.stage2Points || 0;
                              else if (net.stage3 === stage) ptsPerPnl = net.stage3Points || 0;
                              else if (net.stage4 === stage) ptsPerPnl = net.stage4Points || 0;
                          }

                          const jobPoints = (record.quantity || 0) * (ptsPerPnl || 1);
                          dayStats.points += jobPoints;
                          // Cộng dồn thời gian chạy máy (Số điểm * thời gian mỗi điểm)
                          dayStats.runTimeSeconds += (jobPoints * (net?.timePerPoint || 1.5));
                      }
                  }
              }
          });
      }
      return dataMap;
  }, [historyData, netData, currentMonth, currentYear, machineList, daysArray]);

  const prevMonth = () => setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentYear, currentMonth + 1, 1));

  const formatRemainingTime = (runTimeSec: number) => {
      const remainingSec = Math.max(0, SHIFT_SECONDS - runTimeSec);
      const h = Math.floor(remainingSec / 3600);
      const m = Math.floor((remainingSec % 3600) / 60);
      return `${h}h${m > 0 ? ` ${m}p` : ''}`;
  };

  const handleExportExcel = () => {
    const headers = ["Thiết bị", "Hạng mục", ...daysArray.map(d => `Ngày ${d}`)];
    const rows: any[] = [];

    machineList.forEach(mName => {
        const statsMap = reportData.get(mName);
        
        // Row 1: Target
        const rowTarget = [mName, "Mục tiêu (PNL)", ...daysArray.map(d => targetPnl)];
        
        // Row 2: Actual
        const rowActual = ["", "Thực tế (PNL)", ...daysArray.map(d => statsMap?.get(d)?.pnl || 0)];
        
        // Row 3: Points
        const rowPoints = ["", "Điểm gắn (Point)", ...daysArray.map(d => statsMap?.get(d)?.points || 0)];
        
        // Row 4: Rate
        const rowRate = ["", "Hoàn thành (%)", ...daysArray.map(d => {
            const pnl = statsMap?.get(d)?.pnl || 0;
            return targetPnl > 0 ? Math.round((pnl / targetPnl) * 100) + '%' : '0%';
        })];
        
        // Row 5: Time remaining
        const rowTime = ["", "TG chưa HT (h)", ...daysArray.map(d => {
            const runTime = statsMap?.get(d)?.runTimeSeconds || 0;
            return formatRemainingTime(runTime);
        })];

        rows.push(rowTarget, rowActual, rowPoints, rowRate, rowTime);
    });

    exportToExcel([headers, ...rows], `BaoCao_HieuSuatThang_${moduleName}_${currentMonth + 1}_${currentYear}`);
  };

  return (
    <div className="p-3 md:p-4 h-full flex flex-col bg-slate-900 overflow-hidden">
        {/* Header */}
        <div className="bg-slate-800 px-3 py-2 md:px-4 md:py-3 rounded-lg shadow-lg border border-slate-700 flex flex-col md:flex-row justify-between items-center gap-3 mb-3 shrink-0">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-red-900/50 rounded border border-red-500 text-red-400 shrink-0">
                    <CalendarDays size={20} />
                </div>
                <div>
                    <h1 className="text-sm font-bold text-white uppercase tracking-tight font-mono">
                        {t.monthly_report} ({moduleName})
                    </h1>
                    <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5 flex items-center gap-1">
                        <span className="w-1 h-1 bg-green-500 rounded-full animate-pulse"></span>
                        SYSTEM STATUS: ONLINE
                    </div>
                </div>
            </div>

            {/* Target Edit Section */}
            <div className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-700 shadow-inner">
                {isEditingTarget ? (
                    <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Set Target:</span>
                        <input 
                            type="number" 
                            className="w-16 bg-slate-800 border border-slate-600 rounded px-1 py-0.5 text-center font-bold text-white text-xs outline-none focus:border-blue-500"
                            value={tempTarget}
                            onChange={(e) => setTempTarget(parseInt(e.target.value) || 0)}
                            autoFocus
                        />
                        <button onClick={handleSaveTarget} className="p-1 bg-green-600 hover:bg-green-500 text-white rounded transition-colors"><Save size={12}/></button>
                        <button onClick={handleCancelEdit} className="p-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded transition-colors"><X size={12}/></button>
                    </div>
                ) : (
                    <div className="flex items-center gap-2 group cursor-pointer" onClick={() => onUpdateTarget && setIsEditingTarget(true)}>
                        <Target size={14} className="text-orange-500"/>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Target:</span>
                        <span className="text-xs font-black text-white font-mono">{targetPnl}</span>
                        {onUpdateTarget && <Edit size={12} className="text-slate-600 group-hover:text-blue-400 transition-colors opacity-0 group-hover:opacity-100"/>}
                    </div>
                )}
            </div>

            {/* Right Side: System Info */}
            <div className="flex items-center gap-3 text-[10px] font-mono text-slate-400 bg-slate-900 px-2 py-1 rounded border border-slate-700 shadow-sm w-full md:w-auto justify-between md:justify-end">
                <div className="flex items-center justify-between gap-2 bg-slate-800 p-1 rounded-lg border border-slate-700 w-full md:w-auto">
                    <button onClick={prevMonth} className="p-1 hover:bg-slate-700 rounded shadow-sm transition-all text-slate-300"><ChevronLeft size={14}/></button>
                    <span className="font-bold text-slate-300 text-xs text-center whitespace-nowrap px-2">
                        {currentMonth + 1} / {currentYear}
                    </span>
                    <button onClick={nextMonth} className="p-1 hover:bg-slate-700 rounded shadow-sm transition-all text-slate-300"><ChevronRight size={14}/></button>
                </div>
                <div className="w-px h-3 bg-slate-600"></div>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={handleExportExcel}
                        className="bg-green-600 hover:bg-green-500 text-white px-3 py-1.5 rounded-lg font-black text-[10px] uppercase shadow-lg flex items-center gap-2 transition-all active:scale-95 border-b-2 border-green-800"
                    >
                        <Download size={14}/> XUẤT EXCEL
                    </button>
                    <div className="w-px h-3 bg-slate-600 mx-1"></div>
                    <Activity size={10} className="text-blue-500"/> <span className="font-bold text-slate-300">CPU: 25%</span>
                </div>
            </div>
        </div>

        {/* Matrix Table */}
        <div className="flex-1 bg-slate-800 rounded-xl shadow-lg border border-slate-700 overflow-auto relative">
            <table className="text-xs text-left border-collapse w-full">
                <thead className="bg-slate-900 text-slate-300 font-bold sticky top-0 z-40 shadow-sm h-10 font-mono">
                    <tr>
                        <th colSpan={2} className="px-2 py-2 border border-slate-700 min-w-[240px] sticky left-0 z-50 bg-slate-900 text-center shadow-[1px_0_0_0_rgba(0,0,0,0.5)]">
                            설비 & 표적
                        </th>
                        {daysArray.map(day => (
                            <th 
                                key={day} 
                                className={`px-1 py-2 border border-slate-700 text-center min-w-[60px] w-[60px]
                                    ${day === currentProductionDay ? 'bg-yellow-900/50 text-yellow-300 border-yellow-700' : 'text-slate-400'}
                                `}
                            >
                                {day === currentProductionDay ? (
                                    <div className="flex flex-col items-center">
                                        <span>{day}</span>
                                        <div className="text-[8px] bg-yellow-600 text-black px-1 rounded flex items-center gap-0.5 mt-0.5">
                                            <Clock size={8}/> {t.now}
                                        </div>
                                    </div>
                                ) : day}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {machineList.map((mName) => {
                        const stats = reportData.get(mName);
                        // Lookup machine status from props to update visual
                        const machineInfo = machines.find(m => m.name === mName);
                        let graphicStatus = 'READY';
                        
                        const isBroken = machineInfo?.note === 'BROKEN';
                        const isWaiting = machineInfo?.note === 'WAITING_MATERIAL';
                        const isNoStock = machineInfo?.note === 'NO_STOCK';
                        const isMismatch = machineInfo?.note === 'MODEL_MISMATCH';
                        
                        if (isBroken) graphicStatus = 'BROKEN';
                        else if (isWaiting) graphicStatus = 'WAITING';
                        else if (isNoStock) graphicStatus = 'NO_STOCK';
                        else if (isMismatch) graphicStatus = 'MISMATCH';
                        else if (stats?.get(new Date().getDate())?.pnl || 0 > 0) graphicStatus = 'RUNNING'; // Simple fallback if online

                        return (
                            <React.Fragment key={mName}>
                                {/* Row 1: 일일 목표 (PNL) (Contains Machine Image in rowspan) */}
                                <tr className="bg-slate-800 border-t-2 border-slate-950">
                                    <td 
                                        rowSpan={5} 
                                        className="px-2 py-2 border border-slate-600 font-bold text-slate-200 bg-slate-900 sticky left-0 z-30 text-center text-sm border-b-2 border-b-slate-500 min-w-[120px] max-w-[120px]"
                                    >
                                        <div className="flex flex-col items-center justify-center h-full gap-2">
                                            <div className="w-24 h-24 bg-slate-800 rounded border border-slate-600 p-1">
                                                <MachineGraphic status={graphicStatus} />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold font-mono text-cyan-400">{mName}</span>
                                                {machineInfo?.note !== 'NORMAL' && (
                                                    <span className="text-[9px] text-red-500 font-bold animate-pulse">
                                                        {machineInfo?.note === 'BROKEN' ? 'MÁY HỎNG' : machineInfo?.note}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-2 py-1.5 border border-slate-700 text-slate-400 font-bold text-[10px] bg-slate-800 sticky left-[120px] z-30 whitespace-nowrap min-w-[120px] shadow-[1px_0_0_0_rgba(0,0,0,0.5)] uppercase">
                                        일일 목표 (PNL)
                                    </td>
                                    {daysArray.map(day => {
                                        const isToday = day === currentProductionDay;
                                        let cellClass = '';
                                        if (isToday) {
                                            if (isBroken) cellClass = 'bg-red-900/50 text-red-300';
                                            else if (isWaiting) cellClass = 'bg-orange-900/50 text-orange-300';
                                            else if (isNoStock) cellClass = 'bg-slate-700 text-slate-300';
                                            else if (isMismatch) cellClass = 'bg-yellow-900/50 text-yellow-300';
                                            else cellClass = 'bg-yellow-900/20'; 
                                        }

                                        return (
                                            <td key={day} className={`px-1 py-1 border border-slate-700 text-center text-slate-500 font-mono ${cellClass}`}>
                                                {targetPnl}
                                            </td>
                                        );
                                    })}
                                </tr>

                                {/* Row 2: 일일 실적 (PNL) */}
                                <tr className="bg-slate-800 hover:bg-slate-700/50">
                                    <td className="px-2 py-1.5 border border-slate-700 text-blue-400 font-bold text-[10px] bg-slate-800 sticky left-[120px] z-30 whitespace-nowrap min-w-[120px] shadow-[1px_0_0_0_rgba(0,0,0,0.5)] uppercase">
                                        일일 실적 (PNL)
                                    </td>
                                    {daysArray.map(day => {
                                        const val = stats?.get(day)?.pnl || 0;
                                        const isToday = day === currentProductionDay;
                                        let cellClass = '';
                                        if (isToday) {
                                            if (isBroken) cellClass = 'bg-red-900/50 text-red-300';
                                            else if (isWaiting) cellClass = 'bg-orange-900/50 text-orange-300';
                                            else if (isNoStock) cellClass = 'bg-slate-700 text-slate-300';
                                            else if (isMismatch) cellClass = 'bg-yellow-900/50 text-yellow-300';
                                            else cellClass = 'bg-yellow-900/20';
                                        }

                                        return (
                                            <td key={day} className={`px-1 py-1 border border-slate-700 text-center font-bold font-mono ${val >= targetPnl ? 'text-green-400' : 'text-slate-400'} ${cellClass}`}>
                                                {val > 0 ? val.toLocaleString() : '-'}
                                            </td>
                                        );
                                    })}
                                </tr>

                                {/* Row 3: 일일 실적 (POINT) */}
                                <tr className="bg-slate-800 hover:bg-slate-700/50">
                                    <td className="px-2 py-1.5 border border-slate-700 text-purple-400 font-bold text-[10px] bg-slate-800 sticky left-[120px] z-30 whitespace-nowrap min-w-[120px] shadow-[1px_0_0_0_rgba(0,0,0,0.5)] uppercase">
                                        일일 실적 (POINT)
                                    </td>
                                    {daysArray.map(day => {
                                        const val = stats?.get(day)?.points || 0;
                                        const isToday = day === currentProductionDay;
                                        let cellClass = '';
                                        if (isToday) {
                                            if (isBroken) cellClass = 'bg-red-900/50 text-red-300';
                                            else if (isWaiting) cellClass = 'bg-orange-900/50 text-orange-300';
                                            else if (isNoStock) cellClass = 'bg-slate-700 text-slate-300';
                                            else if (isMismatch) cellClass = 'bg-yellow-900/50 text-yellow-300';
                                            else cellClass = 'bg-yellow-900/20';
                                        }

                                        return (
                                            <td key={day} className={`px-1 py-1 border border-slate-700 text-center text-purple-400 font-mono ${cellClass}`}>
                                                {val > 0 ? val.toLocaleString() : '-'}
                                            </td>
                                        );
                                    })}
                                </tr>

                                {/* Row 4: 활동률 (%) */}
                                <tr className="bg-slate-800 hover:bg-slate-700/50">
                                    <td className="px-2 py-1.5 border border-slate-700 text-cyan-400 font-bold text-[10px] bg-slate-800 sticky left-[120px] z-30 whitespace-nowrap min-w-[120px] shadow-[1px_0_0_0_rgba(0,0,0,0.5)] uppercase">
                                        활동률 (%)
                                    </td>
                                    {daysArray.map(day => {
                                        const pnl = stats?.get(day)?.pnl || 0;
                                        const rate = targetPnl > 0 ? Math.round((pnl / targetPnl) * 100) : 0;
                                        let color = 'text-slate-500';
                                        if (pnl > 0) color = rate >= 100 ? 'text-green-400 font-bold' : 'text-red-400';
                                        
                                        const isToday = day === currentProductionDay;
                                        let cellClass = '';
                                        if (isToday) {
                                            if (isBroken) cellClass = 'bg-red-900/50 text-red-300';
                                            else if (isWaiting) cellClass = 'bg-orange-900/50 text-orange-300';
                                            else if (isNoStock) cellClass = 'bg-slate-700 text-slate-300';
                                            else if (isMismatch) cellClass = 'bg-yellow-900/50 text-yellow-300';
                                            else cellClass = 'bg-yellow-900/20';
                                        }

                                        return (
                                            <td key={day} className={`px-1 py-1 border border-slate-700 text-center font-bold font-mono ${color} ${cellClass}`}>
                                                {pnl > 0 ? `${rate}%` : '-'}
                                            </td>
                                        );
                                    })}
                                </tr>

                                {/* Row 5: 남은 미완료 시간. */}
                                <tr className="bg-slate-800 hover:bg-slate-700/50 border-b-2 border-b-slate-600">
                                    <td className="px-2 py-1.5 border border-slate-700 text-orange-500 font-bold text-[10px] bg-slate-800 sticky left-[120px] z-30 whitespace-nowrap min-w-[120px] shadow-[1px_0_0_0_rgba(0,0,0,0.5)] uppercase">
                                        남은 미완료 시간.
                                    </td>
                                    {daysArray.map(day => {
                                        const runTime = stats?.get(day)?.runTimeSeconds || 0;
                                        // Kiểm tra nếu là tương lai thì không hiện
                                        const isFuture = new Date(currentYear, currentMonth, day, 23, 59) > new Date();
                                        if (isFuture) return <td key={day} className="border border-slate-700 bg-slate-900"></td>;
                                        
                                        let cellClass = '';
                                        const isToday = day === currentProductionDay;
                                        if (isToday) {
                                            if (isBroken) cellClass = 'bg-red-900/50 text-red-300';
                                            else if (isWaiting) cellClass = 'bg-orange-900/50 text-orange-300';
                                            else if (isNoStock) cellClass = 'bg-slate-700 text-slate-300';
                                            else if (isMismatch) cellClass = 'bg-yellow-900/50 text-yellow-300';
                                            else cellClass = 'bg-yellow-900/20';
                                        }

                                        return (
                                            <td key={day} className={`px-1 py-1 border border-slate-700 text-center text-orange-500 font-mono font-medium text-[10px] ${cellClass}`}>
                                                {formatRemainingTime(runTime)}
                                            </td>
                                        );
                                    })}
                                </tr>
                            </React.Fragment>
                        );
                    })}
                </tbody>
            </table>
        </div>
    </div>
  );
};
