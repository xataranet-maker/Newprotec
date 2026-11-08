
import React, { useMemo } from 'react';
import { 
  Cpu, Activity, Users, Monitor, CheckCircle2,
  Sun, Moon, LayoutGrid, CalendarRange, Factory, Layers,
  BarChart3, Package
} from 'lucide-react';
import { 
  ImportRecord, ExportRecord, StaffRecord, 
  ProductionHistoryRecord, NetDataRecord, Language, MachineSetup, AttendanceRecord, OvertimeRecord, HRAnnouncement, ProductionPlan, UserAccount 
} from '../../types';

interface DashboardProps {
    activeModule: string;
    multiAuto: { imports: ImportRecord[], exports: ExportRecord[], machineStatuses: MachineSetup[] };
    language: Language;
    qualityMetrics?: any;
    onNavigate: (id: string) => void;
    deptTargets: Record<string, number>;
    allNetData: NetDataRecord[];
    allHistoryData: ProductionHistoryRecord[];
    allStaffData: StaffRecord[];
    attendanceHistory: AttendanceRecord[];
    overtimeRecords: OvertimeRecord[];
    announcements?: HRAnnouncement[]; 
    onAddPlan: (plan: ProductionPlan) => void;
    currentUser?: UserAccount | null;
}

export const Dashboard: React.FC<DashboardProps> = ({ 
    multiAuto, language, onNavigate, deptTargets, allNetData, allHistoryData, allStaffData, attendanceHistory, announcements = []
}) => {
    const todayISO = new Date().toISOString().split('T')[0];
    
    // Ngày sản xuất (Logical Date): Chuyển ngày lúc 8h sáng
    const logicalDate = useMemo(() => {
        const now = new Date();
        if (now.getHours() < 8) now.setDate(now.getDate() - 1);
        const d = String(now.getDate()).padStart(2, '0');
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const y = now.getFullYear();
        return `${d}/${m}/${y}`;
    }, []);

    // --- LOGIC: TÍNH MÁY ĐANG CHẠY MULTI AUTO ---
    const systemStatus = useMemo(() => {
        const imports = multiAuto.imports || [];
        const activeMachines = new Set<string>();
        imports.forEach(record => {
            if (record.productionProgress) {
                Object.values(record.productionProgress).forEach((p: any) => {
                    if (p.status === 'RUNNING' && p.machine) {
                        activeMachines.add(`MULTI-${p.machine}`);
                    }
                });
            }
        });

        const totalNodes = multiAuto.machineStatuses?.length || 8;
        return {
            activeCount: activeMachines.size,
            totalCount: totalNodes
        };
    }, [multiAuto]);

    // --- SẢN LƯỢNG NGÀY ---
    const dailyOutput = useMemo(() => {
        return allHistoryData
            .filter(h => h.date === logicalDate && (h.department === 'MULTI' || !h.department))
            .reduce((sum, item) => sum + (item.quantity || 0), 0);
    }, [allHistoryData, logicalDate]);

    const targetOutput = (deptTargets['Multi Auto'] || 500) * (multiAuto.machineStatuses?.length || 8);
    const efficiency = Math.min(100, targetOutput > 0 ? Math.round((dailyOutput / targetOutput) * 100) : 0);

    // --- NHÂN SỰ MULTI AUTO ---
    const multiStaff = useMemo(() => {
        return allStaffData.filter(s => !s.department || s.department.toUpperCase() === 'MULTI');
    }, [allStaffData]);

    const presentStaffCount = useMemo(() => {
        return multiStaff.filter(s => {
            const rec = attendanceHistory.find(ah => ah.employeeId === s.employeeId && ah.date === todayISO);
            return rec && ['PRESENT', 'Đúng giờ', 'Đủ công', 'Đi muộn', 'Về sớm'].includes(rec.status);
        }).length;
    }, [multiStaff, attendanceHistory, todayISO]);

    const recentAnnouncements = announcements.slice(0, 3);

    return (
        <div className="h-full bg-[#020617] flex flex-col p-6 overflow-y-auto custom-scrollbar gap-6">
            <style>{`
                @keyframes shine { from { left: -100%; } to { left: 100%; } }
                .shimmer { position: relative; overflow: hidden; }
                .shimmer::after { content: ''; position: absolute; top: 0; left: -100%; width: 50%; height: 100%; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent); animation: shine 3s infinite; }
            `}</style>

            {/* WELCOME BAR - Live Machine Count */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-800/40 px-3 py-3 md:px-6 md:py-4 rounded-3xl border border-slate-700/50 shadow-2xl relative overflow-hidden shimmer">
                <div className="flex items-center gap-2.5 md:gap-5 relative z-10 w-full md:w-auto">
                    <div className="p-2.5 md:p-4 bg-blue-600 rounded-2xl shadow-[0_0_25px_rgba(37,99,235,0.4)] text-white shrink-0">
                        <Activity className="w-5 h-5 md:w-8 md:h-8 animate-pulse" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <h1 className="text-[15px] sm:text-xl md:text-2xl font-black text-white uppercase tracking-tighter font-mono truncate">
                            COMMAND HUB | <span className="text-blue-400">{systemStatus.activeCount}</span>/{systemStatus.totalCount} MÁY ĐANG CHẠY
                        </h1>
                        <p className="text-[9px] md:text-xs text-slate-500 font-bold uppercase tracking-widest mt-0.5 md:mt-1">
                            Hệ thống giám sát Multi Auto <span className="text-blue-400">Thời gian thực</span> | Ngày: {logicalDate}
                        </p>
                    </div>
                </div>
                
                <div className="flex gap-4 relative z-10 w-full md:w-auto justify-start md:justify-end border-t border-slate-700/30 pt-2 md:pt-0 md:border-none">
                    <div className="text-left md:text-right border-r border-slate-700 pr-4 md:pr-6">
                        <div className="text-[8px] md:text-[10px] font-black text-slate-500 uppercase mb-1">Status</div>
                        <div className="flex items-center gap-1.5 text-[10px] md:text-sm font-black text-green-400">
                             <CheckCircle2 size={12} className="md:w-4 md:h-4"/> ONLINE
                        </div>
                    </div>
                    <div className="text-left md:text-right">
                        <div className="text-[8px] md:text-[10px] font-black text-slate-500 uppercase mb-1">Current Shift</div>
                        <div className="flex items-center gap-1.5 text-[10px] md:text-sm font-black text-orange-400">
                             {new Date().getHours() >= 8 && new Date().getHours() < 20 ? <><Sun size={12} className="md:w-4 md:h-4"/> DAY_SHIFT</> : <><Moon size={12} className="md:w-4 md:h-4"/> NIGHT_SHIFT</>}
                        </div>
                    </div>
                </div>
            </div>

            {/* MULTI AUTO HERO CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                
                {/* 1. SẢN LƯỢNG NGÀY & TIẾN ĐỘ */}
                <div 
                    onClick={() => onNavigate('prod_report')}
                    className="bg-[#0f172a] rounded-2xl border-2 border-blue-500/40 p-5 cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl flex flex-col justify-between group relative overflow-hidden"
                >
                    <div className="flex justify-between items-start relative z-10">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-blue-600 text-white shadow-lg">
                                <Cpu size={20} />
                            </div>
                            <div>
                                <h3 className="font-black text-white text-sm tracking-widest">MULTI AUTO</h3>
                                <p className="text-[10px] text-slate-500 font-bold uppercase">Sản lượng hoàn thành</p>
                            </div>
                        </div>
                        <div className="text-[10px] font-black font-mono px-2 py-1 rounded bg-black/40 border border-slate-800 text-blue-400">
                            {efficiency}% EFF
                        </div>
                    </div>

                    <div className="mt-6 grid grid-cols-2 gap-4 relative z-10">
                        <div className="bg-[#020617] rounded-xl p-3 border border-slate-800/50">
                            <div className="text-[9px] text-slate-500 font-black uppercase mb-1">Sản lượng đạt</div>
                            <div className="flex items-baseline gap-1">
                                <span className="text-xl font-black text-white font-mono">{dailyOutput.toLocaleString()}</span>
                                <span className="text-[10px] text-slate-600 font-bold uppercase">PNL</span>
                            </div>
                        </div>
                        <div className="bg-[#020617] rounded-xl p-3 border border-slate-800/50">
                            <div className="text-[9px] text-slate-500 font-black uppercase mb-1">Mục tiêu ca</div>
                            <div className="flex items-baseline gap-1">
                                <span className="text-xl font-black text-white font-mono">{targetOutput.toLocaleString()}</span>
                                <span className="text-[10px] text-slate-600 font-bold uppercase">PNL</span>
                            </div>
                        </div>
                    </div>

                    <div className="mt-4 space-y-1 relative z-10">
                        <div className="flex justify-between text-[9px] font-black uppercase tracking-tighter text-slate-500 px-1">
                            <span>Hiệu suất</span>
                            <span>{dailyOutput.toLocaleString()} / {targetOutput.toLocaleString()}</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800 shadow-inner">
                            <div 
                                className="h-full transition-all duration-1000 bg-blue-600 shadow-[0_0_8px_currentColor]" 
                                style={{ width: `${efficiency}%` }}
                            ></div>
                        </div>
                    </div>
                </div>

                {/* 2. TRẠNG THÁI MÁY MÓC */}
                <div 
                    onClick={() => onNavigate('model_tracking')}
                    className="bg-[#0f172a] rounded-2xl border-2 border-cyan-500/40 p-5 cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl flex flex-col justify-between group relative overflow-hidden"
                >
                    <div className="flex justify-between items-start relative z-10">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-cyan-600 text-white shadow-lg">
                                <Activity size={20} />
                            </div>
                            <div>
                                <h3 className="font-black text-white text-sm tracking-widest">TRẠM MÁY</h3>
                                <p className="text-[10px] text-slate-500 font-bold uppercase">Vận hành thời gian thực</p>
                            </div>
                        </div>
                        <div className="text-[10px] font-black font-mono px-2 py-1 rounded bg-black/40 border border-slate-800 text-cyan-400">
                            LIVE
                        </div>
                    </div>

                    <div className="mt-6 grid grid-cols-2 gap-4 relative z-10">
                        <div className="bg-[#020617] rounded-xl p-3 border border-slate-800/50">
                            <div className="text-[9px] text-slate-500 font-black uppercase mb-1">Đang chạy</div>
                            <div className="flex items-baseline gap-1">
                                <span className="text-xl font-black text-green-400 font-mono">{systemStatus.activeCount}</span>
                                <span className="text-[10px] text-slate-600 font-bold uppercase">MÁY</span>
                            </div>
                        </div>
                        <div className="bg-[#020617] rounded-xl p-3 border border-slate-800/50">
                            <div className="text-[9px] text-slate-500 font-black uppercase mb-1">Tổng trạm</div>
                            <div className="flex items-baseline gap-1">
                                <span className="text-xl font-black text-white font-mono">{systemStatus.totalCount}</span>
                                <span className="text-[10px] text-slate-600 font-bold uppercase">MÁY</span>
                            </div>
                        </div>
                    </div>

                    <div className="mt-4 space-y-1 relative z-10">
                        <div className="flex justify-between text-[9px] font-black uppercase tracking-tighter text-slate-500 px-1">
                            <span>Tỉ lệ vận hành</span>
                            <span>{Math.round((systemStatus.activeCount / (systemStatus.totalCount || 1)) * 100)}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800 shadow-inner">
                            <div 
                                className="h-full transition-all duration-1000 bg-cyan-500 shadow-[0_0_8px_currentColor]" 
                                style={{ width: `${Math.round((systemStatus.activeCount / (systemStatus.totalCount || 1)) * 100)}%` }}
                            ></div>
                        </div>
                    </div>
                </div>

                {/* 3. ĐIỂM DANH NHÂN SỰ */}
                <div 
                    onClick={() => onNavigate('multi_staff')}
                    className="bg-[#0f172a] rounded-2xl border-2 border-emerald-500/40 p-5 cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl flex flex-col justify-between group relative overflow-hidden"
                >
                    <div className="flex justify-between items-start relative z-10">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-emerald-600 text-white shadow-lg">
                                <Users size={20} />
                            </div>
                            <div>
                                <h3 className="font-black text-white text-sm tracking-widest">NHÂN SỰ</h3>
                                <p className="text-[10px] text-slate-500 font-bold uppercase">Điểm danh ngày</p>
                            </div>
                        </div>
                        <div className="text-[10px] font-black font-mono px-2 py-1 rounded bg-black/40 border border-slate-800 text-emerald-400">
                            {multiStaff.length > 0 ? Math.round((presentStaffCount / multiStaff.length) * 100) : 0}% CÔNG
                        </div>
                    </div>

                    <div className="mt-6 grid grid-cols-2 gap-4 relative z-10">
                        <div className="bg-[#020617] rounded-xl p-3 border border-slate-800/50">
                            <div className="text-[9px] text-slate-500 font-black uppercase mb-1">Hiện diện</div>
                            <div className="flex items-baseline gap-1">
                                <span className="text-xl font-black text-emerald-400 font-mono">{presentStaffCount}</span>
                                <span className="text-[10px] text-slate-600 font-bold uppercase">NGƯỜI</span>
                            </div>
                        </div>
                        <div className="bg-[#020617] rounded-xl p-3 border border-slate-800/50">
                            <div className="text-[9px] text-slate-500 font-black uppercase mb-1">Tổng định biên</div>
                            <div className="flex items-baseline gap-1">
                                <span className="text-xl font-black text-white font-mono">{multiStaff.length}</span>
                                <span className="text-[10px] text-slate-600 font-bold uppercase">NGƯỜI</span>
                            </div>
                        </div>
                    </div>

                    <div className="mt-4 space-y-1 relative z-10">
                        <div className="flex justify-between text-[9px] font-black uppercase tracking-tighter text-slate-500 px-1">
                            <span>Chuyên cần</span>
                            <span>{presentStaffCount} / {multiStaff.length}</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800 shadow-inner">
                            <div 
                                className="h-full transition-all duration-1000 bg-emerald-500 shadow-[0_0_8px_currentColor]" 
                                style={{ width: `${multiStaff.length > 0 ? Math.round((presentStaffCount / multiStaff.length) * 100) : 0}%` }}
                            ></div>
                        </div>
                    </div>
                </div>

                {/* 4. KHO & TỒN THÀNH PHẨM */}
                <div 
                    onClick={() => onNavigate('inventory')}
                    className="bg-[#0f172a] rounded-2xl border-2 border-amber-500/40 p-5 cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl flex flex-col justify-between group relative overflow-hidden"
                >
                    <div className="flex justify-between items-start relative z-10">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-amber-600 text-white shadow-lg">
                                <Package size={20} />
                            </div>
                            <div>
                                <h3 className="font-black text-white text-sm tracking-widest">KHO MULTI</h3>
                                <p className="text-[10px] text-slate-500 font-bold uppercase">Tồn kho & Lô hàng</p>
                            </div>
                        </div>
                        <div className="text-[10px] font-black font-mono px-2 py-1 rounded bg-black/40 border border-slate-800 text-amber-400">
                            KHO
                        </div>
                    </div>

                    <div className="mt-6 grid grid-cols-2 gap-4 relative z-10">
                        <div className="bg-[#020617] rounded-xl p-3 border border-slate-800/50">
                            <div className="text-[9px] text-slate-500 font-black uppercase mb-1">Lô nhập TP</div>
                            <div className="flex items-baseline gap-1">
                                <span className="text-xl font-black text-white font-mono">{multiAuto.imports?.length || 0}</span>
                                <span className="text-[10px] text-slate-600 font-bold uppercase">LÔ</span>
                            </div>
                        </div>
                        <div className="bg-[#020617] rounded-xl p-3 border border-slate-800/50">
                            <div className="text-[9px] text-slate-500 font-black uppercase mb-1">Lệnh xuất</div>
                            <div className="flex items-baseline gap-1">
                                <span className="text-xl font-black text-amber-400 font-mono">{multiAuto.exports?.length || 0}</span>
                                <span className="text-[10px] text-slate-600 font-bold uppercase">ĐỢT</span>
                            </div>
                        </div>
                    </div>

                    <div className="mt-4 space-y-1 relative z-10">
                        <div className="flex justify-between text-[9px] font-black uppercase tracking-tighter text-slate-500 px-1">
                            <span>Tình trạng kho</span>
                            <span>Hoạt động ổn định</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800 shadow-inner">
                            <div className="h-full bg-amber-500 shadow-[0_0_8px_currentColor]" style={{ width: '100%' }}></div>
                        </div>
                    </div>
                </div>

            </div>

            {/* LOWER SECTION: NOTICES & RECENT ACTIVITY */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-20">
                
                {/* ANNOUNCEMENTS (LATEST 3) */}
                <div className="lg:col-span-8 flex flex-col gap-4">
                    <div className="flex items-center justify-between px-2">
                        <h2 className="text-xs font-black text-slate-500 uppercase tracking-[0.3em] flex items-center gap-2">
                            <Monitor size={14}/> Bulletin Board (Latest)
                        </h2>
                        <button onClick={() => onNavigate('home_announcements')} className="text-[10px] font-bold text-blue-400 hover:underline uppercase">View All</button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {recentAnnouncements.length === 0 ? (
                            <div className="col-span-3 bg-slate-800/30 rounded-2xl p-10 border border-dashed border-slate-700 text-center italic text-slate-600">
                                Chưa có thông báo hệ thống mới.
                            </div>
                        ) : recentAnnouncements.map(ann => (
                            <div 
                                key={ann.id} 
                                onClick={() => onNavigate('home_announcements')}
                                className="bg-[#0f172a] rounded-2xl p-4 border border-slate-800 hover:border-red-500/50 transition-all cursor-pointer group shadow-xl"
                            >
                                <div className="flex justify-between items-start mb-3">
                                    <span className={`text-[8px] font-black px-2 py-0.5 rounded border ${ann.priority === 'URGENT' ? 'bg-red-900/40 text-red-400 border-red-500' : 'bg-blue-900/40 text-blue-400 border-blue-500'}`}>
                                        {ann.priority}
                                    </span>
                                    <span className="text-[8px] font-mono text-slate-600">{ann.date}</span>
                                </div>
                                <h4 className="text-xs font-bold text-slate-200 line-clamp-1 group-hover:text-blue-400 transition-colors uppercase mb-2">{ann.title}</h4>
                                <p className="text-[10px] text-slate-500 line-clamp-3 leading-relaxed mb-3 italic">"{ann.content}"</p>
                                <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-600 mt-auto pt-2 border-t border-slate-800">
                                    <Users size={10}/> {ann.sender || 'ADMIN'}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* QUICK LINKS / UTILITIES */}
                <div className="lg:col-span-4 flex flex-col gap-4">
                     <h2 className="text-xs font-black text-slate-500 uppercase tracking-[0.3em] px-2 flex items-center gap-2">
                        <LayoutGrid size={14}/> Fast Actions
                    </h2>
                    <div className="bg-slate-800/40 rounded-2xl border border-slate-700/50 p-5 flex-1 shadow-2xl grid grid-cols-2 gap-3">
                         <button onClick={() => onNavigate('production')} className="bg-slate-900 hover:bg-blue-600 hover:text-white transition-all rounded-xl p-3 border border-slate-700 flex flex-col items-center justify-center gap-2 group">
                             <Factory size={24} className="text-blue-400 group-hover:text-white" />
                             <span className="text-[9px] font-black uppercase">Trạm sản xuất</span>
                         </button>
                         <button onClick={() => onNavigate('model_tracking')} className="bg-slate-900 hover:bg-cyan-600 hover:text-white transition-all rounded-xl p-3 border border-slate-700 flex flex-col items-center justify-center gap-2 group">
                             <Activity size={24} className="text-cyan-400 group-hover:text-white" />
                             <span className="text-[9px] font-black uppercase">Hiệu suất máy</span>
                         </button>
                         <button onClick={() => onNavigate('planning_hub')} className="bg-slate-900 hover:bg-indigo-600 hover:text-white transition-all rounded-xl p-3 border border-slate-700 flex flex-col items-center justify-center gap-2 group">
                             <CalendarRange size={24} className="text-indigo-400 group-hover:text-white" />
                             <span className="text-[9px] font-black uppercase">Điều phối KH</span>
                         </button>
                         <button onClick={() => onNavigate('staff_list')} className="bg-slate-900 hover:bg-purple-600 hover:text-white transition-all rounded-xl p-3 border border-slate-700 flex flex-col items-center justify-center gap-2 group">
                             <Users size={24} className="text-purple-400 group-hover:text-white" />
                             <span className="text-[9px] font-black uppercase">DS Nhân Viên</span>
                         </button>
                    </div>
                </div>

            </div>
        </div>
    );
};

