
import React, { useState, useMemo } from 'react';
import { Calendar, Clock, Save, Search, Filter, CheckCircle2, User, Layers, Cpu, HardDrive, Wrench, ChevronLeft, BarChart3, Users, List, Hash, FileUp, Sun, Moon } from 'lucide-react';
import { StaffRecord, OvertimeRecord } from '../../types';

interface HROvertimeProps {
    allStaff: StaffRecord[];
    overtimeRecords: OvertimeRecord[];
    onUpdateOvertime: (records: OvertimeRecord[]) => void;
    viewMode?: 'HR_DASHBOARD' | 'DEPT_ENTRY'; 
    targetDept?: string;
}

const DEPARTMENTS = [
    { id: 'MULTI', label: 'Multi Auto', icon: Cpu, color: 'blue', bg: 'bg-blue-600', text: 'text-blue-500', border: 'border-blue-500' },
    { id: 'STIFF', label: 'Stiff', icon: HardDrive, color: 'green', bg: 'bg-green-600', text: 'text-green-500', border: 'border-green-500' },
    { id: 'MOLD', label: 'Khuôn & Jig', icon: Wrench, color: 'orange', bg: 'bg-orange-600', text: 'text-orange-500', border: 'border-orange-500' },
    { id: 'STAMPING', label: 'Dập Tự Động', icon: Layers, color: 'purple', bg: 'bg-purple-600', text: 'text-purple-500', border: 'border-purple-500' },
];

export const HROvertime: React.FC<HROvertimeProps> = ({ 
    allStaff, 
    overtimeRecords, 
    onUpdateOvertime,
    viewMode = 'HR_DASHBOARD',
    targetDept
}) => {
    const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterDept, setFilterDept] = useState<string>('ALL'); 
    const [filterShift, setFilterShift] = useState<string>('ALL'); 
    const [activeDeptId, setActiveDeptId] = useState<string | null>(viewMode === 'DEPT_ENTRY' ? (targetDept || 'MULTI') : null);
    const [pendingChanges, setPendingChanges] = useState<Record<number, { hours: number, reason: string }>>({});

    const deptStats = useMemo(() => {
        const stats: Record<string, { people: number, totalHours: number }> = {};
        DEPARTMENTS.forEach(d => stats[d.id] = { people: 0, totalHours: 0 });
        overtimeRecords.forEach(rec => {
            if (rec.date === selectedDate && stats[rec.department]) {
                stats[rec.department].people += 1;
                stats[rec.department].totalHours += Math.floor(rec.hours); // Floor rounding
            }
        });
        return stats;
    }, [overtimeRecords, selectedDate]);

    const filteredStaff = useMemo(() => {
        if (!activeDeptId) return [];
        return allStaff.filter(staff => {
            const matchesDept = staff.department === activeDeptId;
            const matchesSearch = staff.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || staff.employeeId.toLowerCase().includes(searchTerm.toLowerCase());
            return matchesDept && matchesSearch;
        });
    }, [allStaff, activeDeptId, searchTerm]);

    const displayRecords = useMemo(() => {
        return overtimeRecords.filter(r => {
            const matchesDate = r.date === selectedDate;
            const matchesDept = filterDept === 'ALL' || r.department === filterDept;
            const matchesShift = filterShift === 'ALL' || (r.shift || 'DAY') === filterShift;
            const matchesSearch = searchTerm === '' || r.staffName.toLowerCase().includes(searchTerm.toLowerCase()) || r.employeeId.toLowerCase().includes(searchTerm.toLowerCase());
            return matchesDate && matchesDept && matchesShift && matchesSearch;
        }).sort((a,b) => a.department.localeCompare(b.department));
    }, [overtimeRecords, selectedDate, filterDept, filterShift, searchTerm]);

    const handleInputChange = (staffId: number, field: 'hours' | 'reason', value: string | number) => {
        setPendingChanges(prev => ({
            ...prev,
            [staffId]: {
                ...prev[staffId],
                hours: field === 'hours' ? Math.floor(Number(value)) : (prev[staffId]?.hours ?? Math.floor(getExistingRecord(staffId)?.hours ?? 0)),
                reason: field === 'reason' ? String(value) : (prev[staffId]?.reason ?? getExistingRecord(staffId)?.reason ?? '')
            }
        }));
    };

    const getExistingRecord = (staffId: number) => {
        return overtimeRecords.find(r => r.staffId === staffId && r.date === selectedDate);
    };

    const handleSave = () => {
        let updatedRecords = [...overtimeRecords];
        (Object.entries(pendingChanges) as [string, { hours: number, reason: string }][]).forEach(([sId, data]) => {
            const staffId = Number(sId);
            const existingIndex = updatedRecords.findIndex(r => r.staffId === staffId && r.date === selectedDate);
            if (data.hours > 0) {
                const staff = allStaff.find(s => s.id === staffId);
                const newRecord: OvertimeRecord = {
                    id: existingIndex >= 0 ? updatedRecords[existingIndex].id : Date.now() + Math.random(),
                    staffId: staffId, staffName: staff?.fullName || 'Unknown', employeeId: staff?.employeeId || 'Unknown', department: staff?.department || 'Unknown',
                    date: selectedDate, hours: Math.floor(data.hours), shift: staff?.shift, reason: data.reason, timestamp: new Date().toLocaleString()
                };
                if (existingIndex >= 0) updatedRecords[existingIndex] = newRecord;
                else updatedRecords.push(newRecord);
            } else if (existingIndex >= 0) {
                updatedRecords = updatedRecords.filter((_, idx) => idx !== existingIndex);
            }
        });
        onUpdateOvertime(updatedRecords);
        setPendingChanges({});
        alert(`Đã cập nhật dữ liệu tăng ca ngày ${selectedDate}`);
    };

    if (viewMode === 'HR_DASHBOARD' && !activeDeptId) {
        return (
            <div className="flex flex-col h-full bg-slate-900 text-slate-300 p-6 font-sans overflow-y-auto custom-scrollbar">
                 <div className="mb-8 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-white flex items-center gap-3"><Clock className="text-orange-500" size={32}/> TỔNG HỢP TĂNG CA TOÀN CÔNG TY</h2>
                        <p className="text-slate-400 mt-1 text-sm">Chọn ngày và phòng ban để xem chi tiết</p>
                    </div>
                    <div className="flex items-center gap-2 bg-slate-800 p-2 rounded-lg border border-slate-700 shadow-lg">
                         <span className="text-xs font-bold text-slate-400 px-2 uppercase">Ngày dữ liệu:</span>
                         <div className="flex items-center gap-2 bg-slate-900 border border-slate-600 rounded px-3 py-1.5">
                            <Calendar size={16} className="text-orange-500"/><input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="bg-transparent border-none text-sm font-bold text-white focus:outline-none [color-scheme:dark]"/>
                        </div>
                    </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                     {DEPARTMENTS.map(dept => {
                         const stats = deptStats[dept.id] || { people: 0, totalHours: 0 };
                         return (
                            <div key={dept.id} onClick={() => setActiveDeptId(dept.id)} className={`relative bg-slate-800 rounded-xl p-6 border-2 border-transparent hover:${dept.border} cursor-pointer transition-all duration-300 group shadow-lg hover:-translate-y-1`}>
                                <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity`}><dept.icon size={80} className={dept.text}/></div>
                                <div className="flex items-center gap-3 mb-4"><div className={`p-3 rounded-lg ${dept.bg} text-white shadow-lg`}><dept.icon size={24} /></div><h3 className="text-lg font-bold text-white uppercase tracking-wide">{dept.label}</h3></div>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-end border-b border-slate-700 pb-2"><span className="text-sm text-slate-400 font-medium">Nhân sự ĐK</span><div className="flex items-center gap-2"><Users size={18} className={dept.text}/><span className="text-2xl font-bold text-white">{stats.people}</span></div></div>
                                    <div className="flex justify-between items-end"><span className="text-sm text-slate-400 font-medium">Tổng giờ</span><div className="flex items-center gap-2"><Clock size={18} className="text-orange-400"/><span className="text-2xl font-bold text-orange-400">{stats.totalHours}h</span></div></div>
                                </div>
                                <div className="mt-4 pt-4 flex justify-end"><span className={`text-xs font-bold ${dept.text} flex items-center gap-1 group-hover:underline`}>Xem nhập liệu <ChevronLeft size={14} className="rotate-180"/></span></div>
                            </div>
                         );
                     })}
                 </div>

                 <div className="flex-1 flex flex-col min-h-0">
                     <div className="flex flex-col md:flex-row justify-between items-end mb-3 gap-3">
                         <h3 className="text-sm font-bold text-slate-400 uppercase flex items-center gap-2 font-mono"><List size={16} /> Danh sách chi tiết ({displayRecords.length} bản ghi)</h3>
                         <div className="flex flex-wrap gap-2 items-center w-full md:w-auto">
                            <div className="relative"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" size={14} /><input type="text" placeholder="Tìm tên, mã..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-8 pr-3 py-1.5 bg-slate-800 border border-slate-600 rounded text-xs text-white focus:outline-none focus:border-blue-500 w-32 md:w-48"/></div>
                            <select value={filterDept} onChange={(e) => setFilterDept(e.target.value)} className="bg-slate-800 border border-slate-600 text-white text-xs rounded px-2 py-1.5 outline-none focus:border-blue-500"><option value="ALL">Tất cả BP</option>{DEPARTMENTS.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}</select>
                            <select value={filterShift} onChange={(e) => setFilterShift(e.target.value)} className="bg-slate-800 border border-slate-600 text-white text-xs rounded px-2 py-1.5 outline-none focus:border-blue-500"><option value="ALL">Tất cả Ca</option><option value="DAY">Ca Ngày</option><option value="NIGHT">Ca Đêm</option></select>
                         </div>
                     </div>
                     <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden shadow-lg flex-1 flex flex-col">
                        <div className="grid grid-cols-12 gap-2 p-3 bg-slate-900/80 border-b border-slate-700 text-[10px] font-bold text-slate-500 uppercase tracking-wider sticky top-0 z-10">
                            <div className="col-span-2 flex items-center gap-1"><Calendar size={12}/> Ngày</div><div className="col-span-1 flex items-center gap-1"><Hash size={12}/> Mã NV</div><div className="col-span-3 flex items-center gap-1"><User size={12}/> Họ Tên</div><div className="col-span-2 flex items-center gap-1"><Layers size={12}/> Bộ Phận</div><div className="col-span-1 text-center">Ca</div><div className="col-span-1 text-center flex justify-center items-center gap-1"><Clock size={12}/> Giờ</div><div className="col-span-2">Ghi Chú</div>
                        </div>
                        <div className="divide-y divide-slate-700/50 overflow-y-auto custom-scrollbar flex-1 bg-slate-800">
                            {displayRecords.length === 0 ? <div className="p-12 text-center text-slate-500 text-xs italic">Chưa có dữ liệu tăng ca.</div> : displayRecords.map((record) => {
                                const deptInfo = DEPARTMENTS.find(d => d.id === record.department);
                                return (
                                    <div key={record.id} className="grid grid-cols-12 gap-2 p-3 items-center hover:bg-white/5 transition-all group text-xs text-slate-300">
                                        <div className="col-span-2 font-mono text-slate-500 group-hover:text-slate-400">{record.date.split('-').reverse().join('/')}</div>
                                        <div className="col-span-1 font-mono font-bold text-slate-400 group-hover:text-white truncate">{record.employeeId}</div>
                                        <div className="col-span-3 font-bold text-white flex items-center gap-2 truncate"><div className={`w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-[10px] font-bold bg-slate-700 text-slate-300`}>{record.staffName.charAt(0)}</div><span className="truncate">{record.staffName}</span></div>
                                        <div className="col-span-2"><span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${deptInfo?.id === 'MULTI' ? 'bg-blue-900/30 text-blue-400 border-blue-800' : deptInfo?.id === 'STIFF' ? 'bg-green-900/30 text-green-400 border-green-800' : deptInfo?.id === 'MOLD' ? 'bg-orange-900/30 text-orange-400 border-orange-800' : 'bg-purple-900/30 text-purple-400 border-purple-800'}`}>{deptInfo?.label || record.department}</span></div>
                                        <div className="col-span-1 text-center">{record.shift === 'DAY' ? <span className="text-[9px] bg-orange-900/30 text-orange-400 px-1.5 py-0.5 rounded font-bold">Ngày</span> : <span className="text-[9px] bg-purple-900/30 text-purple-400 px-1.5 py-0.5 rounded font-bold">Đêm</span>}</div>
                                        <div className="col-span-1 text-center"><span className="font-mono font-bold text-orange-400 bg-orange-900/20 px-2 py-0.5 rounded border border-orange-900/50">{Math.floor(record.hours)}h</span></div>
                                        <div className="col-span-2 text-[10px] text-slate-500 italic truncate">{record.reason || '-'}</div>
                                    </div>
                                )
                            })}
                        </div>
                     </div>
                 </div>
            </div>
        );
    }

    const activeDeptInfo = DEPARTMENTS.find(d => d.id === activeDeptId);
    return (
        <div className="flex flex-col h-full bg-slate-900 text-slate-300 font-sans">
            <div className="bg-slate-800 p-4 border-b border-slate-700 flex flex-col md:flex-row gap-4 items-center justify-between shrink-0">
                <div className="flex items-center gap-4 w-full md:w-auto">
                    {viewMode === 'HR_DASHBOARD' && <button onClick={() => setActiveDeptId(null)} className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white"><ChevronLeft size={20}/></button>}
                    <div className="flex items-center gap-3"><div className={`p-2 rounded ${activeDeptInfo?.bg || 'bg-slate-700'} text-white`}>{activeDeptInfo?.icon ? <activeDeptInfo.icon size={20}/> : <Layers size={20}/>}</div><div><h2 className="text-lg font-bold text-white uppercase">{activeDeptInfo?.label || activeDeptId}</h2><div className="flex items-center gap-2 text-xs text-slate-400"><Clock size={12}/><span>Ngày:</span><input type="date" value={selectedDate} onChange={(e) => { setSelectedDate(e.target.value); setPendingChanges({}); }} className="bg-transparent border-none font-bold text-orange-400 focus:outline-none p-0 w-24 cursor-pointer [color-scheme:dark]"/></div></div></div>
                </div>
                <div className="flex items-center gap-4 w-full md:w-auto"><div className="relative flex-1 md:w-64"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} /><input type="text" placeholder="Tìm nhân viên..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-600 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none text-sm"/></div><button onClick={handleSave} className="bg-green-600 hover:bg-green-500 text-white font-bold px-6 py-2 rounded-lg shadow-lg flex items-center gap-2 active:scale-95 transition-all">LƯU</button></div>
            </div>
            <div className="flex-1 overflow-hidden flex flex-col bg-slate-900"><div className="overflow-y-auto flex-1 custom-scrollbar"><table className="w-full text-sm text-left"><thead className="text-xs text-slate-400 uppercase bg-slate-800/80 backdrop-blur sticky top-0 z-10 font-bold border-b border-slate-700"><tr><th className="px-6 py-4 w-[60px]">#</th><th className="px-6 py-4">Nhân viên</th><th className="px-6 py-4">Mã số</th><th className="px-6 py-4 text-center">Ca</th><th className="px-6 py-4 text-center w-[150px]">Giờ tăng ca</th><th className="px-6 py-4">Lý do / Ghi chú</th><th className="px-6 py-4 text-center w-[100px]">TT</th></tr></thead><tbody className="divide-y divide-slate-800">{filteredStaff.map((staff, index) => { const existing = getExistingRecord(staff.id); const pending = pendingChanges[staff.id]; const hours = pending?.hours ?? Math.floor(existing?.hours || 0); const reason = pending?.reason ?? existing?.reason ?? ''; const isModified = pending !== undefined; return (<tr key={staff.id} className={`hover:bg-slate-800/5 transition-colors ${isModified ? 'bg-blue-900/10' : ''}`}><td className="px-6 py-3 text-slate-500">{index + 1}</td><td className="px-6 py-3"><div className="flex items-center gap-3"><div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${hours > 0 ? 'bg-orange-600 text-white shadow-lg' : 'bg-slate-800 text-slate-400'}`}>{staff.fullName.charAt(0)}</div><div className={`font-bold ${hours > 0 ? 'text-orange-400' : 'text-slate-200'}`}>{staff.fullName}</div></div></td><td className="px-6 py-3 font-mono text-slate-500">{staff.employeeId}</td><td className="px-6 py-3 text-center">{staff.shift === 'DAY' ? <span className="text-[10px] bg-orange-900/30 text-orange-400 px-1.5 py-0.5 rounded font-bold">Ngày</span> : <span className="text-[10px] bg-purple-900/30 text-purple-400 px-1.5 py-0.5 rounded font-bold">Đêm</span>}</td><td className="px-6 py-3 text-center"><input type="number" min="0" max="12" step="1" value={hours} onChange={(e) => handleInputChange(staff.id, 'hours', e.target.value)} className={`w-16 text-center font-bold text-lg bg-slate-800 border rounded py-1 focus:outline-none ${hours > 0 ? 'border-orange-500 text-orange-400' : 'border-slate-600 text-slate-500'}`}/></td><td className="px-6 py-3"><input type="text" value={reason} onChange={(e) => handleInputChange(staff.id, 'reason', e.target.value)} placeholder={hours > 0 ? "Nhập lý do..." : ""} disabled={hours === 0} className={`w-full bg-transparent border-b border-transparent focus:border-blue-500 focus:outline-none py-1 text-sm ${hours > 0 ? 'text-white' : 'text-slate-600 cursor-not-allowed'}`}/></td><td className="px-6 py-3 text-center">{isModified ? <span className="text-[10px] text-blue-400 font-bold uppercase animate-pulse">Chưa lưu</span> : hours > 0 ? <CheckCircle2 size={18} className="text-green-500 mx-auto"/> : <span className="text-slate-700">-</span>}</td></tr>); })}</tbody></table></div></div>
        </div>
    );
};
