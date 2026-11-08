
import React, { useState, useMemo, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Download, Save, Edit2, FileText, Activity } from 'lucide-react';
import { ProductionHistoryRecord, NetDataRecord, UserRole } from '../../types';
import { exportToExcel } from '../../services/excelService';

interface MultiAutoProductionStatusKRProps {
  historyData: ProductionHistoryRecord[];
  netData: NetDataRecord[];
  targetPnl?: number; // Global default target
  userRole?: UserRole;
}

interface DailyConfig {
    target?: number;
    note?: string;
}

export const MultiAutoProductionStatusKR: React.FC<MultiAutoProductionStatusKRProps> = ({ 
    historyData, 
    netData, 
    targetPnl = 2400,
    userRole = 'user'
}) => {
    const [viewDate, setViewDate] = useState(new Date());
    
    // Local storage state for editable fields (Target & Notes)
    const [localConfig, setLocalConfig] = useState<Record<string, DailyConfig>>({});
    const [isEditing, setIsEditing] = useState(false);

    const currentMonth = viewDate.getMonth();
    const currentYear = viewDate.getFullYear();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    const STORAGE_KEY = `kr_report_config_${currentYear}_${currentMonth}`;

    // Load config from local storage on mount or month change
    useEffect(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                setLocalConfig(JSON.parse(saved));
            } else {
                setLocalConfig({});
            }
        } catch (e) {
            console.error("Failed to load report config", e);
        }
    }, [currentYear, currentMonth]);

    // Save handler
    const handleSaveConfig = () => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(localConfig));
        setIsEditing(false);
        alert("Đã lưu dữ liệu báo cáo!");
    };

    const updateDailyConfig = (day: number, field: keyof DailyConfig, value: any) => {
        setLocalConfig(prev => ({
            ...prev,
            [day]: {
                ...prev[day],
                [field]: value
            }
        }));
    };

    // Helper to find specific stage points
    const getStagePoints = (model: string, code: string, stageName: string) => {
        const net = netData.find(n => n.model === model && n.code === code);
        if (!net) return 1; // Default multiplier

        // Check exact stage match
        if (net.stage === stageName) return net.stage1Points || 0;
        if (net.stage2 === stageName) return net.stage2Points || 0;
        if (net.stage3 === stageName) return net.stage3Points || 0;
        if (net.stage4 === stageName) return net.stage4Points || 0;
        
        // Fallback for partial matches or if stage name varies slightly
        return net.stage1Points || 1;
    };

    // Helper to get Day of Week
    const getDayOfWeek = (day: number) => {
        const date = new Date(currentYear, currentMonth, day);
        const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
        return days[date.getDay()];
    };

    // --- DATA PROCESSING ---
    const reportData = useMemo(() => {
        const dailyData = new Map<number, { pnl: number; points: number; efficiency: number }>();

        // Initialize all days
        daysArray.forEach(day => {
            dailyData.set(day, { pnl: 0, points: 0, efficiency: 0 });
        });

        // Aggregate History Data
        historyData.forEach(record => {
            if (!record.date) return;
            const parts = record.date.split('/'); // DD/MM/YYYY
            if (parts.length !== 3) return;
            
            const rDay = parseInt(parts[0]);
            const rMonth = parseInt(parts[1]) - 1;
            const rYear = parseInt(parts[2]);

            if (rMonth === currentMonth && rYear === currentYear) {
                const dayStat = dailyData.get(rDay);
                if (dayStat) {
                    // PNL: Sum of quantities of ALL stages
                    dayStat.pnl += record.quantity;

                    // POINTS: Sum of (quantity * points_of_that_specific_stage)
                    const stageName = record.stageCompleted || record.stage;
                    const ptsPerUnit = getStagePoints(record.model, record.code, stageName);
                    
                    dayStat.points += record.quantity * ptsPerUnit;
                }
            }
        });

        // Calculate Efficiency based on Dynamic Target
        daysArray.forEach(day => {
            const stat = dailyData.get(day)!;
            // Use custom target if set, otherwise default prop
            const dailyTarget = localConfig[day]?.target || targetPnl;
            stat.efficiency = dailyTarget > 0 ? Math.round((stat.pnl / dailyTarget) * 100) : 0;
        });

        return dailyData;
    }, [historyData, netData, currentMonth, currentYear, daysArray, targetPnl, localConfig]);

    // --- EXPORT HANDLER ---
    const handleExport = () => {
        const headers = ["Item", ...daysArray.map(d => `${String(d).padStart(2, '0')}-${String(currentMonth + 1).padStart(2, '0')} (${getDayOfWeek(d)})`)];
        
        const rowTarget = ["일일목표량(PNL)", ...daysArray.map(d => localConfig[d]?.target || targetPnl)];
        const rowActual = ["일일실적(PNL)", ...daysArray.map(d => reportData.get(d)?.pnl || 0)];
        const rowPoints = ["일일실적(POINT)", ...daysArray.map(d => reportData.get(d)?.points || 0)];
        const rowEff = ["가동율(%)", ...daysArray.map(d => `${reportData.get(d)?.efficiency}%`)];
        const rowReason = ["사 유 (Ghi chú)", ...daysArray.map(d => localConfig[d]?.note || "")];

        exportToExcel(
            [headers, rowTarget, rowActual, rowPoints, rowEff, rowReason], 
            `Production_Report_KR_${currentMonth+1}_${currentYear}`
        );
    };

    const prevMonth = () => setViewDate(new Date(currentYear, currentMonth - 1, 1));
    const nextMonth = () => setViewDate(new Date(currentYear, currentMonth + 1, 1));
    const isAdmin = userRole === 'admin' || userRole === 'multiauto';

    return (
        <div className="p-3 md:p-4 h-full flex flex-col bg-slate-900 overflow-hidden text-slate-300">
            {/* Header Toolbar */}
            <div className="bg-slate-800 px-3 py-2 md:px-4 md:py-3 rounded-lg shadow-lg border border-slate-700 flex flex-col md:flex-row justify-between items-center gap-3 mb-3 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-900/50 rounded border border-blue-500 text-blue-400 shrink-0">
                        <FileText size={20} />
                    </div>
                    <div>
                        <h1 className="text-sm font-bold text-white uppercase tracking-tight font-mono">
                            생산 현황 (PRODUCTION KR)
                        </h1>
                        <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5 flex items-center gap-1">
                            <span className="w-1 h-1 bg-green-500 rounded-full animate-pulse"></span>
                            SYSTEM STATUS: ONLINE
                        </div>
                    </div>
                </div>

                {/* Date Navigation & Controls */}
                <div className="flex items-center gap-3 text-[10px] font-mono text-slate-400 bg-slate-900 px-2 py-1 rounded border border-slate-700 shadow-sm w-full md:w-auto justify-between md:justify-end">
                    <div className="flex items-center justify-between gap-2 bg-slate-800 p-1 rounded-lg border border-slate-700 w-full md:w-auto">
                        <button onClick={prevMonth} className="p-1 hover:bg-slate-700 rounded shadow-sm transition-all text-slate-300"><ChevronLeft size={14}/></button>
                        <span className="font-bold text-slate-300 text-xs text-center whitespace-nowrap px-2">
                            {currentYear}.{String(currentMonth + 1).padStart(2, '0')}
                        </span>
                        <button onClick={nextMonth} className="p-1 hover:bg-slate-700 rounded shadow-sm transition-all text-slate-300"><ChevronRight size={14}/></button>
                    </div>
                    
                    <div className="w-px h-3 bg-slate-600"></div>

                    <div className="flex gap-2">
                        {isEditing ? (
                            <button onClick={handleSaveConfig} className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded font-bold flex items-center gap-1 shadow-lg animate-pulse border border-blue-500">
                                <Save size={12}/> SAVE
                            </button>
                        ) : (
                            <button onClick={() => setIsEditing(true)} className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-1 rounded font-bold flex items-center gap-1 shadow-sm border border-slate-600">
                                <Edit2 size={12}/> EDIT
                            </button>
                        )}
                        <button onClick={handleExport} className="bg-green-700 hover:bg-green-600 text-white px-3 py-1 rounded font-bold flex items-center gap-1 shadow-lg transition-all active:scale-95 border border-green-600">
                            <Download size={12}/> XLSX
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Table Container */}
            <div className="flex-1 bg-slate-800 rounded-xl shadow-lg border border-slate-700 overflow-auto relative">
                <table className="text-xs text-left border-collapse w-full">
                    <thead className="bg-slate-900 text-slate-300 font-bold sticky top-0 z-40 shadow-sm h-10 font-mono">
                        <tr>
                            <th className="px-2 py-2 border border-slate-700 min-w-[200px] sticky left-0 z-50 bg-slate-900 text-center shadow-[1px_0_0_0_rgba(0,0,0,0.5)]">
                                생산현황 (Hạng mục)
                            </th>
                            {daysArray.map(day => {
                                const dayOfWeek = getDayOfWeek(day);
                                const isSunday = dayOfWeek === 'CN';
                                const isToday = day === new Date().getDate() && currentMonth === new Date().getMonth();
                                
                                return (
                                    <th key={day} className={`px-1 py-1 border border-slate-700 text-center min-w-[60px] w-[60px] ${isSunday ? 'bg-red-900/20 text-red-400' : ''} ${isToday ? 'bg-blue-900/30 ring-1 ring-inset ring-blue-500' : ''}`}>
                                        <div className="flex flex-col items-center">
                                            <span className={`text-[9px] ${isSunday ? 'text-red-500' : 'text-slate-500'}`}>{dayOfWeek}</span>
                                            <span className="text-sm font-bold">{String(day).padStart(2, '0')}</span>
                                        </div>
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>
                    <tbody>
                        {/* Target Row */}
                        <tr className="bg-slate-800 hover:bg-slate-700/50">
                            <td className="px-3 py-3 border border-slate-600 font-bold text-slate-200 bg-slate-900 sticky left-0 z-30 shadow-[1px_0_0_0_rgba(0,0,0,0.5)]">
                                <div className="flex items-center justify-between">
                                    <span>일일목표량(PNL)</span>
                                    {isAdmin && isEditing && <Edit2 size={12} className="text-blue-500 opacity-70"/>}
                                </div>
                            </td>
                            {daysArray.map(day => {
                                const dayOfWeek = getDayOfWeek(day);
                                const isSunday = dayOfWeek === 'CN';
                                return (
                                    <td key={day} className={`px-1 py-1 border border-slate-700 text-center font-bold text-white font-mono ${isSunday ? 'bg-red-900/10' : ''}`}>
                                        {isEditing && isAdmin ? (
                                            <input 
                                                type="number"
                                                className="w-full h-full text-center font-bold text-blue-400 bg-slate-900 border border-slate-600 rounded focus:border-blue-500 outline-none p-1"
                                                value={localConfig[day]?.target ?? targetPnl}
                                                onChange={(e) => updateDailyConfig(day, 'target', parseInt(e.target.value) || 0)}
                                            />
                                        ) : (
                                            <div className="py-1 text-slate-400">{localConfig[day]?.target ?? targetPnl}</div>
                                        )}
                                    </td>
                                );
                            })}
                        </tr>

                        {/* Actual PNL Row */}
                        <tr className="bg-slate-800 hover:bg-slate-700/50">
                            <td className="px-3 py-3 border border-slate-600 font-bold text-green-400 bg-slate-900 sticky left-0 z-30 shadow-[1px_0_0_0_rgba(0,0,0,0.5)]">
                                일일실적(PNL)
                            </td>
                            {daysArray.map(day => {
                                const val = reportData.get(day)?.pnl || 0;
                                const isSunday = getDayOfWeek(day) === 'CN';
                                return (
                                    <td key={day} className={`px-1 py-1 border border-slate-700 text-center font-bold font-mono ${val > 0 ? 'text-green-400' : 'text-slate-600'} ${isSunday ? 'bg-red-900/10' : ''}`}>
                                        {val > 0 ? val.toLocaleString() : '-'}
                                    </td>
                                );
                            })}
                        </tr>

                        {/* Actual POINT Row */}
                        <tr className="bg-slate-800 hover:bg-slate-700/50">
                            <td className="px-3 py-3 border border-slate-600 font-bold text-blue-400 bg-slate-900 sticky left-0 z-30 shadow-[1px_0_0_0_rgba(0,0,0,0.5)]">
                                일일실적(POINT)
                            </td>
                            {daysArray.map(day => {
                                const val = reportData.get(day)?.points || 0;
                                const isSunday = getDayOfWeek(day) === 'CN';
                                return (
                                    <td key={day} className={`px-1 py-1 border border-slate-700 text-center font-bold font-mono ${val > 0 ? 'text-blue-400' : 'text-slate-600'} ${isSunday ? 'bg-red-900/10' : ''}`}>
                                        {val > 0 ? val.toLocaleString() : '-'}
                                    </td>
                                );
                            })}
                        </tr>

                        {/* Efficiency Row */}
                        <tr className="bg-slate-800 hover:bg-slate-700/50 border-b-2 border-b-slate-600">
                            <td className="px-3 py-3 border border-slate-600 font-bold text-cyan-400 bg-slate-900 sticky left-0 z-30 shadow-[1px_0_0_0_rgba(0,0,0,0.5)]">
                                가동율(%)
                            </td>
                            {daysArray.map(day => {
                                const val = reportData.get(day)?.efficiency || 0;
                                const isSunday = getDayOfWeek(day) === 'CN';
                                let colorClass = 'text-slate-600';
                                if (val >= 100) colorClass = 'text-green-400';
                                else if (val > 0 && val < 50) colorClass = 'text-red-400';
                                else if (val > 0) colorClass = 'text-yellow-400';

                                return (
                                    <td key={day} className={`px-1 py-1 border border-slate-700 text-center font-bold font-mono ${colorClass} ${isSunday ? 'bg-red-900/10' : ''}`}>
                                        {val > 0 ? `${val}%` : '-'}
                                    </td>
                                );
                            })}
                        </tr>

                        {/* Reason Row (Footer - Editable Notes) */}
                        <tr className="bg-slate-800 hover:bg-slate-700/50">
                            <td className="px-3 py-3 border border-slate-600 font-bold text-orange-400 bg-slate-900 sticky left-0 z-30 shadow-[1px_0_0_0_rgba(0,0,0,0.5)]">
                                사 유 (Ghi chú)
                            </td>
                            {daysArray.map(day => {
                                const note = localConfig[day]?.note || "";
                                const isSunday = getDayOfWeek(day) === 'CN';

                                return (
                                    <td key={day} className={`px-1 py-1 border border-slate-700 text-center text-[10px] font-medium text-orange-200 relative group ${isSunday ? 'bg-red-900/10' : ''}`}>
                                        {isEditing ? (
                                            <input 
                                                type="text"
                                                className="w-full h-full text-center bg-slate-900 border border-slate-600 rounded text-orange-300 outline-none p-1 text-[10px] focus:border-orange-500"
                                                value={note}
                                                onChange={(e) => updateDailyConfig(day, 'note', e.target.value)}
                                            />
                                        ) : (
                                            <div className="py-1 px-1 flex items-center justify-center whitespace-nowrap overflow-hidden text-ellipsis" title={note}>
                                                {note}
                                            </div>
                                        )}
                                    </td>
                                );
                            })}
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
};
