
import React, { useState, useMemo } from 'react';
import { 
    Calendar, ChevronLeft, ChevronRight, Search, Download, 
    Sun, Moon, CheckCircle2, XCircle, Palmtree, User, Filter, X,
    LayoutGrid, List, Users, Clock, Thermometer, Plane, Heart, UserMinus,
    Activity, Save, Hash, Building2, Lock, Info, History
} from 'lucide-react';
import { StaffRecord, AttendanceRecord, AttendanceStatus } from '../../types';
import { exportToExcel } from '../../services/excelService';

interface HRAttendanceDiaryProps {
    allStaff: StaffRecord[];
    attendanceHistory: AttendanceRecord[];
    onUpdateHistory: (records: AttendanceRecord[]) => void;
    onClose?: () => void;
}

const DEPARTMENTS = [
    { id: 'ALL', label: 'Tất cả' },
    { id: 'MULTI', label: 'Multi Auto' },
    { id: 'STIFF', label: 'Stiff' },
    { id: 'MOLD', label: 'Khuôn & Jig' },
    { id: 'STAMPING', label: 'Dập Tự Động' },
    { id: 'QUALITY', label: 'Chất Lượng' },
    { id: 'EQUIPMENT', label: 'Thiết Bị' },
    { id: 'WAREHOUSE', label: 'Kho' },
    { id: 'OFFICE', label: 'Văn Phòng' },
    { id: 'HR', label: 'HC & NS' }
];

export const HRAttendanceDiary: React.FC<HRAttendanceDiaryProps> = ({ 
    allStaff, 
    attendanceHistory, 
    onUpdateHistory,
    onClose 
}) => {
    const [viewMonth, setViewMonth] = useState(new Date().getMonth() + 1);
    const [viewYear, setViewYear] = useState(new Date().getFullYear());
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDept, setSelectedDept] = useState('ALL');
    const [viewMode, setViewMode] = useState<'GRID' | 'LIST'>('GRID');

    const [viewTarget, setViewTarget] = useState<{ emp: StaffRecord, date: string } | null>(null);
    const [detailForm, setDetailForm] = useState<Partial<AttendanceRecord>>({});

    const daysInMonth = useMemo(() => new Date(viewYear, viewMonth, 0).getDate(), [viewYear, viewMonth]);
    const daysArray = useMemo(() => Array.from({ length: daysInMonth }, (_, i) => i + 1), [daysInMonth]);

    const isFuture = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return (day: number) => {
            const checkDate = new Date(viewYear, viewMonth - 1, day);
            return checkDate > today;
        };
    }, [viewYear, viewMonth]);

    const filteredStaff = useMemo(() => {
        return allStaff.filter(s => {
            const matchesSearch = s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                  s.employeeId.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesDept = selectedDept === 'ALL' || s.department === selectedDept;
            return matchesSearch && matchesDept;
        }).sort((a,b) => {
            const deptA = a.department || 'ZZZ';
            const deptB = b.department || 'ZZZ';
            if (deptA !== deptB) return deptA.localeCompare(deptB);
            return a.fullName.localeCompare(b.fullName);
        });
    }, [allStaff, searchTerm, selectedDept]);

    const getRecord = (empId: string, day: number) => {
        const dateStr = `${viewYear}-${String(viewMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return attendanceHistory.find(r => r.employeeId === empId && r.date === dateStr);
    };

    // Helper tính toán hiển thị thời gian
    const getAttendanceTimeDisplay = (record: AttendanceRecord | undefined, staff: StaffRecord) => {
        if (!record) return null;

        const { status, overtime = 0 } = record;
        const shift = record.shift || staff.shift || 'DAY';

        // 1. Các trường hợp nghỉ
        if (status === 'SICK' || status === 'Nghỉ ốm') return 'Nghỉ ốm';
        if (status === 'LEAVE' || status === 'Nghỉ phép') return 'Nghỉ phép';
        if (status === 'Nghỉ KL') return 'Nghỉ KL';
        if (status === 'FAMILY') return 'Hiếu hỉ';
        if (status === 'Nghỉ lễ') return 'Nghỉ lễ';
        if (status === 'Nghỉ chủ nhật') return 'Nghỉ CN';
        if (status === 'Vắng mặt') return 'Vắng';
        if (status === 'UNMARKED') return null;

        // 2. Các trường hợp đi làm (Có mặt, Đi muộn, Về sớm)
        // Giờ cơ bản: Ngày 08:00 - 17:00, Đêm 20:00 - 05:00
        const startH = shift === 'NIGHT' ? 20 : 8;
        const baseEndH = shift === 'NIGHT' ? 5 : 17;
        
        // Tính giờ ra dựa trên OT
        const totalEndMinutes = (baseEndH * 60) + (overtime * 60);
        const finalEndH = Math.floor(totalEndMinutes / 60) % 24; 
        const finalEndM = totalEndMinutes % 60;

        const fmt = (h: number, m: number) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

        let startStr = fmt(startH, 0);
        let endStr = fmt(finalEndH, finalEndM);

        if (status === 'Đi muộn') startStr = 'Đi muộn';
        if (status === 'Về sớm') endStr = 'Về sớm';

        return `${startStr}~${endStr}`;
    };

    const getStatusStyle = (status: AttendanceStatus) => {
        switch(status) {
            case 'PRESENT': case 'Đúng giờ': case 'Đủ công': return { label: 'ĐI LÀM', color: 'text-green-400', icon: CheckCircle2 };
            case 'SICK': case 'Nghỉ ốm': return { label: 'NGHỈ ỐM', color: 'text-orange-400', icon: Thermometer };
            case 'LEAVE': case 'Nghỉ phép': return { label: 'NGHỈ PHÉP', color: 'text-blue-400', icon: Plane };
            case 'Nghỉ KL': return { label: 'NGHỈ KL', color: 'text-slate-400', icon: UserMinus };
            case 'Đi muộn': return { label: 'ĐI MUỘN', color: 'text-yellow-500', icon: Clock };
            case 'Về sớm': return { label: 'VỀ SỚM', color: 'text-red-400', icon: Clock };
            case 'Vắng mặt': return { label: 'VẮNG', color: 'text-red-500', icon: User };
            case 'Nghỉ chủ nhật': return { label: 'NGHỈ CN', color: 'text-slate-500', icon: Calendar };
            case 'FAMILY': return { label: 'HIẾU HỈ', color: 'text-purple-400', icon: Heart };
            case 'Nghỉ lễ': return { label: 'NGHỈ LỄ', color: 'text-pink-400', icon: Palmtree };
            default: return { label: '---', color: 'text-slate-600', icon: Activity };
        }
    };

    const handleOpenDetail = (emp: StaffRecord, day: number) => {
        if (isFuture(day)) return;
        const dateStr = `${viewYear}-${String(viewMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const existing = getRecord(emp.employeeId, day);
        setViewTarget({ emp, date: dateStr });
        setDetailForm(existing || { date: dateStr, employeeId: emp.employeeId, shift: emp.shift, status: 'PRESENT', overtime: 0 });
    };

    const handleExportExcel = () => {
        const headers = ["Mã NV", "Họ Tên", "Bộ Phận", ...daysArray.map(d => `Ngày ${d}`), "Tổng Tăng Ca (h)"];
        const rows = filteredStaff.map(staff => {
            let totalOvertime = 0;
            const dayData = daysArray.map(day => {
                const rec = getRecord(staff.employeeId, day);
                if (!rec) return '-';
                if (rec.overtime) totalOvertime += rec.overtime;
                // Chỉ lấy thời gian hoặc trạng thái, không kèm ca làm việc
                const timeDisplay = getAttendanceTimeDisplay(rec, staff) || rec.status;
                return timeDisplay; 
            });
            return [staff.employeeId, staff.fullName, staff.department || '', ...dayData, totalOvertime];
        });
        exportToExcel([headers, ...rows], `NhatKyDiemDanh_Thang${viewMonth}_${viewYear}`);
    };

    return (
        <div className="flex flex-col h-full bg-[#020617] text-slate-300 font-sans overflow-hidden">
            {/* Header */}
            <div className="bg-slate-800 px-5 py-4 rounded-2xl shadow-xl border border-slate-700 flex flex-col xl:flex-row justify-between items-center gap-4 sticky top-0 z-40 m-4 mb-2">
                <div className="flex items-center gap-4">
                    <div className="p-2 bg-blue-600 rounded-lg shadow-lg text-white"><Users size={22}/></div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-sm font-black uppercase tracking-widest font-mono">NHẬT KÝ ĐIỂM DANH</h1>
                            <span className="bg-amber-500/20 text-amber-500 text-[8px] px-1.5 py-0.5 rounded border border-amber-500/30 flex items-center gap-1 font-black uppercase"><Lock size={10}/> Chế độ xem</span>
                        </div>
                        <p className="text-[10px] text-slate-500 font-bold uppercase mt-0.5">Tháng {viewMonth}/{viewYear} • Dữ liệu hệ thống đã khóa chỉnh sửa</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="bg-slate-900 p-1 rounded-xl border border-slate-700 flex gap-1">
                        <button onClick={() => setViewMode('GRID')} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all flex items-center gap-2 ${viewMode === 'GRID' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}><LayoutGrid size={14}/> Grid 31 Ngày</button>
                        <button onClick={() => setViewMode('LIST')} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all flex items-center gap-2 ${viewMode === 'LIST' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}><List size={14}/> List</button>
                    </div>
                    <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-700 shadow-inner">
                        <button onClick={() => setViewMonth(p => p === 1 ? 12 : p - 1)} className="p-1 hover:bg-slate-800 rounded text-slate-500"><ChevronLeft size={16}/></button>
                        <span className="text-xs font-black text-white font-mono w-20 text-center">{viewMonth}/{viewYear}</span>
                        <button onClick={() => setViewMonth(p => p === 12 ? 1 : p + 1)} className="p-1 hover:bg-slate-800 rounded text-slate-500"><ChevronRight size={16}/></button>
                    </div>
                    <button onClick={handleExportExcel} className="bg-green-700 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-lg transition-all border-b-4 border-green-900 flex items-center gap-2 uppercase tracking-widest"><Download size={14}/> Excel</button>
                    {onClose && <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-white transition-colors"><X size={20}/></button>}
                </div>
            </div>

            {/* Filter Bar */}
            <div className="px-6 py-2 bg-slate-900/50 border-b border-slate-800 flex flex-wrap items-center gap-4">
                <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={14} />
                    <input type="text" placeholder="Tìm tên, mã nhân viên..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-full pl-9 pr-4 py-1.5 text-xs text-white focus:border-blue-500 outline-none shadow-inner"/>
                </div>
                <div className="flex flex-wrap gap-1">
                    {DEPARTMENTS.map(dept => (
                        <button key={dept.id} onClick={() => setSelectedDept(dept.id)} className={`px-3 py-1 rounded-md text-[9px] font-black uppercase transition-all ${selectedDept === dept.id ? 'bg-slate-700 text-white border border-slate-600' : 'text-slate-500 hover:text-slate-300'}`}>{dept.label}</button>
                    ))}
                </div>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col p-4 pt-2">
                {viewMode === 'GRID' ? (
                    <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl overflow-auto custom-scrollbar flex-1">
                        <table className="w-full border-collapse table-fixed min-w-[2000px]">
                            <thead className="sticky top-0 z-30 shadow-md">
                                <tr className="bg-slate-900 text-slate-500 uppercase font-black font-mono text-[9px]">
                                    <th className="w-[200px] px-4 py-3 text-left border-r border-slate-800 sticky left-0 z-40 bg-slate-900 shadow-[2px_0_10px_rgba(0,0,0,0.5)]">Họ và Tên / Bộ Phận</th>
                                    {daysArray.map(day => {
                                        const isSun = new Date(viewYear, viewMonth-1, day).getDay() === 0;
                                        return <th key={day} className={`px-1 py-3 text-center border-r border-slate-800 ${isSun ? 'bg-red-950/20 text-red-500 font-black' : ''}`}>{day}</th>
                                    })}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700/50">
                                {filteredStaff.map(staff => (
                                    <tr key={staff.id} className="hover:bg-slate-750/30 transition-colors group">
                                        <td className="px-4 py-2 border-r border-slate-800 sticky left-0 z-20 bg-slate-800 shadow-[2px_0_10px_rgba(0,0,0,0.5)]">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-slate-400 font-bold text-[10px] shadow-inner shrink-0">{staff.fullName.charAt(0)}</div>
                                                <div className="min-w-0">
                                                    <div className="font-bold text-slate-200 text-[11px] truncate uppercase">{staff.fullName}</div>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-[9px] font-mono text-blue-400 font-bold">{staff.employeeId}</span>
                                                        <span className="text-[8px] bg-slate-900 px-1 py-0.5 rounded border border-slate-700 text-slate-500">{staff.department}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        {daysArray.map(day => {
                                            const rec = getRecord(staff.employeeId, day);
                                            const style = getStatusStyle(rec?.status || 'UNMARKED');
                                            const Icon = style.icon;
                                            const isSun = new Date(viewYear, viewMonth-1, day).getDay() === 0;
                                            const shift = rec ? rec.shift : staff.shift;
                                            const dayIsFuture = isFuture(day);

                                            const timeDisplay = getAttendanceTimeDisplay(rec, staff);

                                            return (
                                                <td key={day} className={`px-0.5 py-1 border-r border-slate-800/30 transition-all ${isSun ? 'bg-red-900/5' : ''} ${!dayIsFuture ? 'hover:bg-blue-600/5' : ''}`}>
                                                    {!dayIsFuture ? (
                                                        <div onClick={() => handleOpenDetail(staff, day)} className="flex flex-col gap-0.5 items-center justify-center h-full cursor-pointer">
                                                            <div className="bg-slate-900/40 px-1 rounded border border-slate-700 flex items-center gap-0.5">
                                                                {shift === 'NIGHT' ? <Moon size={8} className="text-purple-400"/> : <Sun size={8} className="text-orange-400"/>}
                                                                <span className={`text-[7px] font-black uppercase ${shift === 'NIGHT' ? 'text-purple-500' : 'text-orange-500'}`}>{shift === 'NIGHT' ? 'Đêm' : 'Ngày'}</span>
                                                            </div>
                                                            <div className={`flex items-center gap-0.5 ${style.color}`}>
                                                                <Icon size={8} />
                                                                <span className="text-[7px] font-bold truncate max-w-[50px] uppercase">
                                                                    {timeDisplay || style.label}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center justify-center h-full opacity-10"><div className="w-1 h-1 rounded-full bg-slate-500"></div></div>
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col flex-1">
                        <div className="overflow-auto flex-1">
                            <table className="w-full text-[11px] text-left border-collapse">
                                <thead className="bg-slate-950 text-slate-500 uppercase font-black font-mono border-b border-slate-700 sticky top-0 z-10">
                                    <tr>
                                        <th className="px-6 py-4">Nhân Viên</th>
                                        <th className="px-6 py-4 w-32 text-center">Mã Số</th>
                                        <th className="px-6 py-4 text-center w-32">Ca làm việc</th>
                                        <th className="px-6 py-4">Bộ Phận / Vị Trí</th>
                                        <th className="px-6 py-4 text-center">Trạng thái (Hôm nay)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-700/50">
                                    {filteredStaff.map(s => {
                                        const todayDay = new Date().getDate();
                                        const rec = getRecord(s.employeeId, todayDay);
                                        const shift = rec ? rec.shift : s.shift;
                                        const style = getStatusStyle(rec?.status || 'UNMARKED');
                                        const timeDisplay = getAttendanceTimeDisplay(rec, s);

                                        return (
                                            <tr key={s.id} className="hover:bg-slate-750 transition-colors group">
                                                <td className="px-6 py-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-slate-300 font-bold shadow-inner overflow-hidden">
                                                            {s.avatarUrl ? <img src={s.avatarUrl} className="w-full h-full object-cover"/> : s.fullName.charAt(0)}
                                                        </div>
                                                        <span className="font-bold text-slate-200 uppercase">{s.fullName}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-3 text-center font-mono text-blue-400 font-bold">{s.employeeId}</td>
                                                <td className="px-6 py-3 text-center">
                                                    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded border shadow-md ${shift === 'DAY' ? 'bg-orange-900/30 text-orange-400 border-orange-800' : 'bg-purple-900/30 text-purple-400 border-purple-800'}`}>
                                                        {shift === 'DAY' ? <Sun size={12}/> : <Moon size={12}/>}
                                                        <span className="font-black text-[10px] uppercase">{shift === 'DAY' ? 'Ngày' : 'Đêm'}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-3">
                                                    <div className="font-bold text-slate-400 uppercase">{s.department}</div>
                                                    <div className="text-[10px] text-slate-500 italic">{s.position}</div>
                                                </td>
                                                <td className="px-6 py-3 text-center">
                                                    <button onClick={() => handleOpenDetail(s, todayDay)} className={`px-2 py-0.5 rounded text-[10px] font-black border uppercase bg-slate-900 ${style.color} border-current`}>
                                                        {timeDisplay || style.label}
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal Xem chi tiết (Chế độ Chỉ xem) */}
            {viewTarget && (
                <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-slate-800 rounded-3xl shadow-2xl w-full max-w-sm border border-slate-700 overflow-hidden">
                        <div className="px-6 py-4 bg-slate-700 text-white flex justify-between items-center shadow-lg uppercase font-black text-xs">
                            <h2 className="flex items-center gap-2"><Info size={16}/> Thông tin ngày {viewTarget.date.split('-').reverse().join('/')}</h2>
                            <button onClick={() => setViewTarget(null)}><X size={20}/></button>
                        </div>
                        <div className="p-6 space-y-6 bg-slate-900">
                            <div className="flex items-center gap-4 bg-slate-800 p-3 rounded-2xl border border-slate-700">
                                <div className="w-10 h-10 rounded-full bg-blue-900/30 border border-blue-500 flex items-center justify-center text-blue-400 font-black">{viewTarget.emp.fullName.charAt(0)}</div>
                                <div><div className="text-[11px] font-black text-white uppercase">{viewTarget.emp.fullName}</div><div className="text-[9px] font-mono text-slate-500">{viewTarget.emp.employeeId}</div></div>
                            </div>
                            <div className="space-y-4 opacity-75">
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase block mb-2 ml-1">Ca làm việc</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className={`py-2 rounded-xl border-2 font-black text-[10px] flex items-center justify-center gap-2 ${detailForm.shift === 'DAY' ? 'bg-orange-900/40 border-orange-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-700'}`}><Sun size={14}/> CA NGÀY</div>
                                        <div className={`py-2 rounded-xl border-2 font-black text-[10px] flex items-center justify-center gap-2 ${detailForm.shift === 'NIGHT' ? 'bg-purple-900/40 border-purple-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-700'}`}><Moon size={14}/> CA ĐÊM</div>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase block mb-2 ml-1">Trạng thái điểm danh</label>
                                    <select disabled value={detailForm.status} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-xs text-white font-bold outline-none cursor-not-allowed shadow-inner">
                                        <option value="PRESENT">ĐANG LÀM VIỆC (OK)</option>
                                        <option value="SICK">NGHỈ ỐM (SICK)</option>
                                        <option value="LEAVE">NGHỈ PHÉP (LEAVE)</option>
                                        <option value="FAMILY">HIẾU / HỈ</option>
                                        <option value="Nghỉ lễ">NGHỈ LỄ</option>
                                        <option value="Nghỉ KL">NGHỈ KL</option>
                                        <option value="Vắng mặt">VẮNG MẶT</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase block mb-2 ml-1">Số giờ tăng ca (OT)</label>
                                    <div className="flex items-center gap-4 bg-slate-800 rounded-xl p-2 border border-slate-700">
                                        <Clock size={16} className="text-orange-500 ml-2"/>
                                        <input disabled type="number" value={detailForm.overtime || 0} className="bg-transparent border-none outline-none flex-1 text-lg font-black font-mono text-white text-center cursor-not-allowed"/><span className="text-[10px] font-black text-slate-600 mr-4">GIỜ</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-3">
                                <Lock size={16} className="text-amber-500 shrink-0 mt-0.5"/>
                                <p className="text-[9px] text-amber-500/80 font-medium leading-relaxed italic">
                                    Dữ liệu này được đồng bộ từ Trung tâm Chấm công và được khóa để bảo mật tính nhất quán. Vui lòng liên hệ Quản trị viên nếu cần điều chỉnh sai sót.
                                </p>
                            </div>
                            
                            <div className="mt-4 p-4 border border-slate-700 rounded-xl bg-slate-900/50">
                                <div className="flex items-center gap-2 text-slate-500 mb-2">
                                    <History size={14}/>
                                    <span className="text-[10px] font-black uppercase">Lịch sử sự kiện</span>
                                </div>
                                <div className="text-[10px] text-slate-400 font-mono italic">
                                    No activity logs found for this day.
                                </div>
                            </div>
                            
                            <button onClick={() => setViewTarget(null)} className="w-full mt-4 bg-slate-700 hover:bg-slate-600 text-white font-black py-4 rounded-2xl shadow-xl transition-all active:scale-95 uppercase text-xs tracking-widest flex items-center justify-center gap-2">Đóng</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
