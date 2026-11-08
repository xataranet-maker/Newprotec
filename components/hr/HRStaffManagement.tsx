
import React, { useState, useMemo, useRef } from 'react';
import { 
    Users, Search, Filter, LayoutGrid, List as ListIcon, 
    Building2, ArrowRightLeft, Download, Upload, 
    MoreHorizontal, UserCog, Phone, MapPin, Calendar, 
    Briefcase, Save, X, HardDriveDownload, BookOpen, Clock, StickyNote,
    Sun, Moon, CheckCircle2, Plane, UserX, AlertCircle, Activity, Edit2, Trash2, Hash, Layers, Eye, User, Palmtree, Thermometer, Heart, UserMinus
} from 'lucide-react';
import { 
    StaffRecord, OvertimeRecord, AttendanceRecord, ContractRecord, 
    SalarySlipRecord, PayrollRecord, HRAnnouncement, TimekeepingRecord, 
    AttendanceCorrectionRequest, AttendanceConfirmationRecord, AttendanceStatus
} from '../../types';
import { EmployeeProfile } from './EmployeeProfile';
import { MultiAutoBackupRestore } from '../multiauto/MultiAutoBackupRestore';
import { HRAttendanceDiary } from './HRAttendanceDiary'; 
import { HROvertime } from './HROvertime';       

interface HRStaffManagementProps {
    multiStaff: StaffRecord[];
    setMultiStaff: (data: StaffRecord[]) => void;
    qualityStaff?: StaffRecord[];
    setQualityStaff?: (data: StaffRecord[]) => void;
    hrStaff?: StaffRecord[];
    setHrStaff?: (data: StaffRecord[]) => void;
    warehouseStaff?: StaffRecord[];
    setWarehouseStaff?: (data: StaffRecord[]) => void;
    officeStaff?: StaffRecord[];
    setOfficeStaff?: (data: StaffRecord[]) => void;
    
    attendanceHistory: AttendanceRecord[];
    onUpdateAttendanceHistory: (records: AttendanceRecord[]) => void;
    overtimeRecords: OvertimeRecord[];
    onUpdateOvertime: (records: OvertimeRecord[]) => void;
    
    contracts: ContractRecord[];
    salarySlips: SalarySlipRecord[];
    payrollRecords: PayrollRecord[];
    announcements: HRAnnouncement[];
    timekeepingRecords: TimekeepingRecord[];
    attendanceRequests: AttendanceCorrectionRequest[];
    onRequestCorrection: (req: AttendanceCorrectionRequest) => void;

    // Bổ sung dữ liệu xác nhận công
    attendanceConfirmations?: AttendanceConfirmationRecord[];
    onUpdateAttendanceConfirmation?: (data: AttendanceConfirmationRecord[]) => void;
}

const DEPARTMENTS = [
    { id: 'MULTI', label: 'Multi Auto', color: 'bg-blue-600', text: 'text-blue-400', border: 'border-blue-500' },
    { id: 'HR', label: 'HC & NS', color: 'bg-pink-600', text: 'text-pink-400', border: 'border-pink-500' },
    { id: 'QUALITY', label: 'Chất Lượng (QC)', color: 'bg-teal-600', text: 'text-teal-400', border: 'border-teal-500' },
    { id: 'WAREHOUSE', label: 'Kho (Logistics)', color: 'bg-yellow-600', text: 'text-yellow-400', border: 'border-yellow-500' },
    { id: 'OFFICE', label: 'Văn Phòng', color: 'bg-slate-600', text: 'text-slate-400', border: 'border-slate-500' },
];

export const HRStaffManagement: React.FC<HRStaffManagementProps> = ({
    multiStaff, setMultiStaff,
    qualityStaff = [], setQualityStaff,
    hrStaff = [], setHrStaff,
    warehouseStaff = [], setWarehouseStaff,
    officeStaff = [], setOfficeStaff,
    attendanceHistory, onUpdateAttendanceHistory,
    overtimeRecords, onUpdateOvertime,
    contracts, salarySlips, payrollRecords, announcements,
    timekeepingRecords, attendanceRequests, onRequestCorrection,
    attendanceConfirmations = [], onUpdateAttendanceConfirmation
}) => {
    // --- STATE ---
    const [viewMode, setViewMode] = useState<'DEPT' | 'CARDS' | 'LIST'>('DEPT');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDeptFilter, setSelectedDeptFilter] = useState('ALL');
    
    const [selectedProfile, setSelectedProfile] = useState<StaffRecord | null>(null);
    
    // Modal States
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
    const [isDiaryModalOpen, setIsDiaryModalOpen] = useState(false);
    const [isOvertimeModalOpen, setIsOvertimeModalOpen] = useState(false);       

    // Editing Data
    const [editingStaff, setEditingStaff] = useState<StaffRecord | null>(null);

    // Transfer Data
    const [transferData, setTransferData] = useState({
        staffId: '',
        fromDept: '',
        toDept: 'MULTI',
        date: new Date().toISOString().split('T')[0],
        reason: ''
    });

    // --- DERIVED DATA ---
    const allStaff = useMemo(() => [
        ...(multiStaff || []), 
        ...(qualityStaff || []), 
        ...(hrStaff || []),
        ...(warehouseStaff || []),
        ...(officeStaff || [])
    ], [multiStaff, qualityStaff, hrStaff, warehouseStaff, officeStaff]);

    const getTodayStatus = (staff: StaffRecord) => {
        const todayStr = new Date().toISOString().split('T')[0];
        const record = attendanceHistory.find(r => r.employeeId === staff.employeeId && r.date.startsWith(todayStr));
        
        let shift = staff.shift || 'DAY';
        let status = 'UNKNOWN';
        
        if (record) {
            shift = record.shift;
            if (['PRESENT', 'Đúng giờ', 'Đủ công', 'Đi muộn', 'Về sớm'].includes(record.status)) {
                status = 'PRESENT';
            } else if (['SICK', 'LEAVE', 'FAMILY', 'Nghỉ ốm', 'Nghỉ phép', 'Nghỉ lễ'].includes(record.status)) {
                status = 'LEAVE';
            } else {
                status = 'ABSENT';
            }
        } else {
            status = 'UNKNOWN';
        }
        
        return { shift, status, rawStatus: record?.status };
    };

    const generateStats = (staffList: StaffRecord[]) => {
        let dayCount = 0;
        let nightCount = 0;
        let presentCount = 0;
        let leaveCount = 0;
        let absentCount = 0;

        staffList.forEach(s => {
            const { shift, status } = getTodayStatus(s);
            if (shift === 'DAY') dayCount++;
            else nightCount++;
            if (status === 'PRESENT') presentCount++;
            else if (status === 'LEAVE') leaveCount++;
            else absentCount++;
        });

        return { dayCount, nightCount, presentCount, leaveCount, absentCount, total: staffList.length };
    };

    const globalStats = useMemo(() => generateStats(allStaff), [allStaff, attendanceHistory]);

    const filteredStaff = useMemo(() => {
        return allStaff.filter(staff => {
            const matchesSearch = staff.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                  staff.employeeId.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesDept = selectedDeptFilter === 'ALL' || staff.department === selectedDeptFilter;
            return matchesSearch && matchesDept;
        });
    }, [allStaff, searchTerm, selectedDeptFilter]);

    // --- ACTIONS ---

    const handleOpenEdit = (e: React.MouseEvent, staff: StaffRecord) => {
        e.stopPropagation();
        setEditingStaff({ ...staff });
        setIsEditModalOpen(true);
    };

    const handleSaveEdit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingStaff) return;

        const staffToUpdate = editingStaff;
        const oldDept = allStaff.find(s => s.id === staffToUpdate.id)?.department || 'MULTI';
        const newDept = staffToUpdate.department || 'MULTI';

        const mapping: Record<string, { list: StaffRecord[], set: (data: StaffRecord[]) => void }> = {
            'MULTI': { list: multiStaff, set: setMultiStaff },
            'HR': { list: hrStaff, set: setHrStaff || setMultiStaff },
            'QUALITY': { list: qualityStaff, set: setQualityStaff || setMultiStaff },
            'WAREHOUSE': { list: warehouseStaff, set: setWarehouseStaff || setMultiStaff },
            'OFFICE': { list: officeStaff, set: setOfficeStaff || setMultiStaff },
        };

        if (oldDept === newDept) {
            // Update in place
            const target = mapping[oldDept] || mapping['MULTI'];
            if (target) {
                target.set(target.list.map(s => s.id === staffToUpdate.id ? staffToUpdate : s));
            }
        } else {
            // Move between departments
            const oldTarget = mapping[oldDept] || mapping['MULTI'];
            const newTarget = mapping[newDept] || mapping['MULTI'];
            if (oldTarget) oldTarget.set(oldTarget.list.filter(s => s.id !== staffToUpdate.id));
            if (newTarget) newTarget.set([...newTarget.list, staffToUpdate]);
        }

        alert("Đã cập nhật hồ sơ nhân viên thành công!");
        setIsEditModalOpen(false);
        setEditingStaff(null);
    };

    const handleTransfer = () => {
        if (!transferData.staffId || !transferData.toDept) return;
        const staff = allStaff.find(s => s.employeeId === transferData.staffId);
        if (!staff) { alert("Không tìm thấy nhân viên này."); return; }
        if (staff.department === transferData.toDept) { alert("Nhân viên đang ở bộ phận này rồi."); return; }

        if (window.confirm(`Xác nhận thuyên chuyển ${staff.fullName} từ ${staff.department} sang ${transferData.toDept}?`)) {
            const mapping: Record<string, { list: StaffRecord[], set: (data: StaffRecord[]) => void }> = {
                'MULTI': { list: multiStaff, set: setMultiStaff },
                'HR': { list: hrStaff, set: setHrStaff || setMultiStaff },
                'QUALITY': { list: qualityStaff, set: setQualityStaff || setMultiStaff },
                'WAREHOUSE': { list: warehouseStaff, set: setWarehouseStaff || setMultiStaff },
                'OFFICE': { list: officeStaff, set: setOfficeStaff || setMultiStaff },
            };
            const oldSource = mapping[staff.department || 'MULTI'] || mapping['MULTI'];
            if (oldSource) oldSource.set(oldSource.list.filter((s: StaffRecord) => s.id !== staff.id));

            const newStaffRecord = { ...staff, department: transferData.toDept, workUnit: transferData.toDept };
            const newSource = mapping[transferData.toDept] || mapping['MULTI'];
            if (newSource) newSource.set([...newSource.list, newStaffRecord]);
            
            alert("Thuyên chuyển thành công!");
            setIsTransferModalOpen(false);
            setTransferData({ staffId: '', fromDept: '', toDept: 'MULTI', date: new Date().toISOString().split('T')[0], reason: '' });
        }
    };

    const handleUpdateAllStaff = (newData: StaffRecord[]) => {
        setMultiStaff(newData.filter(s => !s.department || s.department === 'MULTI'));
        if (setQualityStaff) setQualityStaff(newData.filter(s => s.department === 'QUALITY'));
        if (setHrStaff) setHrStaff(newData.filter(s => s.department === 'HR'));
        if (setWarehouseStaff) setWarehouseStaff(newData.filter(s => s.department === 'WAREHOUSE'));
        if (setOfficeStaff) setOfficeStaff(newData.filter(s => s.department === 'OFFICE'));
    };

    const handleDeleteStaff = (e: React.MouseEvent, staffId: number, dept?: string) => {
        e.stopPropagation();
        if (!window.confirm("Bạn có chắc chắn muốn xóa nhân viên này khỏi hệ thống?")) return;

        const mapping: Record<string, { list: StaffRecord[], set: (data: StaffRecord[]) => void }> = {
            'MULTI': { list: multiStaff, set: setMultiStaff },
            'HR': { list: hrStaff, set: setHrStaff || setMultiStaff },
            'QUALITY': { list: qualityStaff, set: setQualityStaff || setMultiStaff },
            'WAREHOUSE': { list: warehouseStaff, set: setWarehouseStaff || setMultiStaff },
            'OFFICE': { list: officeStaff, set: setOfficeStaff || setMultiStaff },
        };

        const targetDept = dept || 'MULTI';
        const target = mapping[targetDept] || mapping['MULTI'];
        if (target) {
            target.set(target.list.filter(s => s.id !== staffId));
            alert("Đã xóa nhân viên.");
        }
    };

    // --- RENDERERS ---

    const renderDeptCard = (dept: typeof DEPARTMENTS[0]) => {
        const deptStaff = allStaff.filter(s => s.department === dept.id);
        const stats = generateStats(deptStaff);

        return (
            <div 
                key={dept.id}
                onClick={() => { setSelectedDeptFilter(dept.id); setViewMode('CARDS'); }}
                className={`bg-slate-800 border-2 border-slate-700 hover:${dept.border} rounded-xl p-4 cursor-pointer transition-all hover:-translate-y-1 shadow-lg group relative overflow-hidden flex flex-col justify-between min-h-[160px]`}
            >
                <div className={`absolute -top-6 -right-6 p-6 opacity-5 group-hover:opacity-10 transition-opacity ${dept.text}`}>
                    <Building2 size={100}/>
                </div>
                <div className="flex items-center gap-3 mb-2 relative z-10">
                    <div className={`p-2.5 rounded-lg ${dept.color} text-white shadow-lg`}>
                        <Users size={20}/>
                    </div>
                    <div>
                        <h3 className="font-black text-white text-base uppercase leading-tight">{dept.label}</h3>
                        <span className="text-[10px] text-slate-400 font-bold uppercase">{stats.total} Nhân viên</span>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2 relative z-10 bg-slate-900/50 p-2 rounded-lg border border-slate-700/50">
                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-300 border-b border-slate-700/50 pb-1 mb-1 col-span-2">
                        <span className="flex items-center gap-1 text-orange-400"><Sun size={10}/> {stats.dayCount}</span>
                        <span className="text-slate-600">|</span>
                        <span className="flex items-center gap-1 text-purple-400"><Moon size={10}/> {stats.nightCount}</span>
                    </div>
                    <div className="col-span-2 grid grid-cols-3 gap-1 text-center">
                        <div className="bg-green-900/20 rounded border border-green-800 p-1">
                            <div className="text-[9px] text-green-500 font-black flex justify-center gap-0.5"><CheckCircle2 size={10}/> {stats.presentCount}</div>
                            <div className="text-[8px] text-slate-500 uppercase scale-90">Đi làm</div>
                        </div>
                        <div className="bg-blue-900/20 rounded border border-blue-800 p-1">
                            <div className="text-[9px] text-blue-500 font-black flex justify-center gap-0.5"><Plane size={10}/> {stats.leaveCount}</div>
                            <div className="text-[8px] text-slate-500 uppercase scale-90">Phép</div>
                        </div>
                        <div className="bg-red-900/20 rounded border border-red-800 p-1">
                            <div className="text-[9px] text-red-500 font-black flex justify-center gap-0.5"><AlertCircle size={10}/> {stats.absentCount}</div>
                            <div className="text-[8px] text-slate-500 uppercase scale-90">Vắng</div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="h-full flex flex-col bg-[#020617] text-slate-300 relative">
             
             {/* Header Toolbar */}
             <div className="bg-slate-800 px-5 py-3 border-b border-slate-700 flex flex-col xl:flex-row justify-between items-center gap-4 shrink-0 shadow-md z-10">
                <div className="flex items-center gap-4 w-full xl:w-auto">
                    <div className="p-2 bg-blue-600 rounded-lg text-white shadow-lg"><UserCog size={24}/></div>
                    <div>
                        <h1 className="text-lg font-black text-white uppercase tracking-widest font-mono">QUẢN TRỊ NHÂN SỰ</h1>
                        <div className="flex items-center gap-2 text-[10px] font-bold mt-0.5 text-slate-400">
                             <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-600">Tổng: {globalStats.total}</span>
                             <span className="flex items-center gap-1 text-orange-400"><Sun size={10}/> {globalStats.dayCount}</span>
                             <span className="flex items-center gap-1 text-purple-400"><Moon size={10}/> {globalStats.nightCount}</span>
                             <span className="w-px h-3 bg-slate-600 mx-1"></span>
                             <span className="flex items-center gap-1 text-green-500"><CheckCircle2 size={10}/> {globalStats.presentCount}</span>
                             <span className="flex items-center gap-1 text-blue-500"><Plane size={10}/> {globalStats.leaveCount}</span>
                             <span className="flex items-center gap-1 text-red-500"><UserX size={10}/> {globalStats.absentCount}</span>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto justify-end">
                    <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-700">
                        <button onClick={() => setViewMode('DEPT')} className={`px-3 py-1.5 rounded-md flex items-center gap-2 text-[10px] font-bold uppercase transition-all ${viewMode === 'DEPT' ? 'bg-slate-700 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}><Building2 size={14}/> PB</button>
                        <button onClick={() => setViewMode('CARDS')} className={`px-3 py-1.5 rounded-md flex items-center gap-2 text-[10px] font-bold uppercase transition-all ${viewMode === 'CARDS' ? 'bg-slate-700 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}><LayoutGrid size={14}/> Thẻ</button>
                        <button onClick={() => setViewMode('LIST')} className={`px-3 py-1.5 rounded-md flex items-center gap-2 text-[10px] font-bold uppercase transition-all ${viewMode === 'LIST' ? 'bg-slate-700 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}><ListIcon size={14}/> List</button>
                    </div>
                    
                    <button onClick={() => setIsBackupModalOpen(true)} className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-2 rounded-lg text-xs font-bold uppercase flex items-center gap-2 shadow-sm border border-slate-500 transition-all"><HardDriveDownload size={16}/> Lưu Đám Mây</button>
                    <button onClick={() => setIsTransferModalOpen(true)} className="bg-green-600 hover:bg-green-500 text-white px-3 py-2 rounded-lg text-xs font-bold uppercase flex items-center gap-2 shadow-sm border border-green-500 transition-all"><ArrowRightLeft size={16}/> Chuyển</button>
                    <button onClick={() => setIsDiaryModalOpen(true)} className="bg-purple-600 hover:bg-purple-500 text-white px-3 py-2 rounded-lg text-xs font-bold uppercase flex items-center gap-2 shadow-sm border border-purple-500 transition-all"><StickyNote size={16}/> Nhật Ký</button>
                    <button onClick={() => setIsOvertimeModalOpen(true)} className="bg-orange-600 hover:bg-orange-500 text-white px-3 py-2 rounded-lg text-xs font-bold uppercase flex items-center gap-2 shadow-sm border border-orange-500 transition-all"><Clock size={16}/> Tăng Ca</button>
                </div>
            </div>

            {/* Filter Bar */}
            {viewMode !== 'DEPT' && (
                <div className="bg-slate-800/50 p-3 border-b border-slate-700 flex gap-4 items-center">
                    <div className="relative max-w-md w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                        <input type="text" placeholder="Tìm kiếm nhân viên..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-4 py-2 text-xs text-white focus:border-blue-500 outline-none transition-all"/>
                    </div>
                    <select value={selectedDeptFilter} onChange={(e) => setSelectedDeptFilter(e.target.value)} className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:border-blue-500 outline-none transition-all"><option value="ALL">Tất cả phòng ban</option>{DEPARTMENTS.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}</select>
                </div>
            )}

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-[#020617]">
                {viewMode === 'DEPT' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {DEPARTMENTS.map(dept => renderDeptCard(dept))}
                    </div>
                )}

                {viewMode === 'CARDS' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-in fade-in duration-500">
                        {filteredStaff.map(staff => {
                            const { shift, status, rawStatus } = getTodayStatus(staff);
                            return (
                                <div key={staff.id} onClick={() => setSelectedProfile(staff)} className="bg-slate-800 rounded-xl border border-slate-700 p-4 hover:border-blue-500 transition-all cursor-pointer shadow-md group flex flex-col gap-3 relative">
                                    {/* Quick Edit Button */}
                                    <button 
                                        onClick={(e) => handleOpenEdit(e, staff)}
                                        className="absolute top-2 right-2 p-1.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-500 hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-all z-10"
                                    >
                                        <Edit2 size={14}/>
                                    </button>

                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center font-bold text-lg text-white border-2 border-slate-600 group-hover:border-blue-500 overflow-hidden">
                                            {staff.avatarUrl ? <img src={staff.avatarUrl} className="w-full h-full object-cover" alt="avatar"/> : staff.fullName.charAt(0)}
                                        </div>
                                        <div className="min-w-0">
                                            <h4 className="font-bold text-white truncate text-sm uppercase">{staff.fullName}</h4>
                                            <div className="text-xs text-blue-400 font-mono font-bold">{staff.employeeId}</div>
                                            <div className="text-[10px] text-slate-500 uppercase mt-0.5 truncate">{staff.position}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between pt-2 border-t border-slate-700/50">
                                        <div className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded border ${shift === 'DAY' ? 'bg-orange-900/20 text-orange-400 border-orange-800' : 'bg-purple-900/20 text-purple-400 border-purple-800'}`}>
                                            {shift === 'DAY' ? <Sun size={10}/> : <Moon size={10}/>} {shift === 'DAY' ? 'NGÀY' : 'ĐÊM'}
                                        </div>
                                        <div className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded border ${status === 'PRESENT' ? 'bg-green-900/20 text-green-400 border-green-800' : status === 'LEAVE' ? 'bg-blue-900/20 text-blue-400 border-blue-800' : 'bg-red-900/20 text-red-400 border-red-800'}`}>
                                            {status === 'PRESENT' ? <CheckCircle2 size={10}/> : status === 'LEAVE' ? <Plane size={10}/> : <AlertCircle size={10}/>}
                                            {status === 'PRESENT' ? 'ĐI LÀM' : rawStatus || 'VẮNG'}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {viewMode === 'LIST' && (
                    <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden shadow-lg animate-in fade-in duration-500">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-slate-900 text-slate-500 font-bold uppercase sticky top-0 z-10 border-b border-slate-700">
                                <tr>
                                    <th className="px-4 py-3">Mã NV</th>
                                    <th className="px-4 py-3">Họ Tên</th>
                                    <th className="px-4 py-3">Bộ Phận</th>
                                    <th className="px-4 py-3">Vị Trí</th>
                                    <th className="px-4 py-3 text-center">Ca (Hôm nay)</th>
                                    <th className="px-4 py-3 text-center">Trạng Thái</th>
                                    <th className="px-4 py-3 text-center">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700/50">
                                {filteredStaff.map(staff => {
                                    const { shift, status, rawStatus } = getTodayStatus(staff);
                                    return (
                                        <tr key={staff.id} className="hover:bg-slate-700/50 transition-colors group">
                                            <td className="px-4 py-3 font-mono font-bold text-blue-400">{staff.employeeId}</td>
                                            <td className="px-4 py-3 font-bold text-white uppercase">{staff.fullName}</td>
                                            <td className="px-4 py-3"><span className="bg-slate-900 border border-slate-600 px-2 py-0.5 rounded text-[10px] uppercase font-bold">{staff.department}</span></td>
                                            <td className="px-4 py-3 text-slate-400">{staff.position}</td>
                                            <td className="px-4 py-3 text-center">
                                                {shift === 'DAY' ? <span className="text-orange-400 font-bold text-[10px] flex items-center justify-center gap-1"><Sun size={12}/> NGÀY</span> : <span className="text-purple-400 font-bold text-[10px] flex items-center justify-center gap-1"><Moon size={12}/> ĐÊM</span>}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`px-2 py-0.5 rounded text-[9px] font-bold border uppercase ${status === 'PRESENT' ? 'text-green-400 border-green-800 bg-green-900/20' : status === 'LEAVE' ? 'text-blue-400 border-blue-800 bg-blue-900/20' : 'text-red-400 border-red-800 bg-red-900/20'}`}>
                                                    {status === 'PRESENT' ? 'ĐI LÀM' : rawStatus || 'VẮNG'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <div className="flex justify-center gap-2">
                                                    <button onClick={() => setSelectedProfile(staff)} className="p-1.5 hover:bg-slate-700 rounded text-blue-400" title="Chi tiết"><Eye size={14}/></button>
                                                    <button onClick={(e) => handleOpenEdit(e, staff)} className="p-1.5 hover:bg-slate-700 rounded text-blue-400" title="Sửa"><Edit2 size={14}/></button>
                                                    <button onClick={(e) => handleDeleteStaff(e, staff.id, staff.department)} className="p-1.5 hover:bg-red-900/30 rounded text-red-400" title="Xóa"><Trash2 size={14}/></button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* EDIT PROFILE MODAL */}
            {isEditModalOpen && editingStaff && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95 duration-200">
                    <div className="bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl border border-slate-600 overflow-hidden flex flex-col">
                        <div className="px-6 py-4 bg-blue-700 text-white flex justify-between items-center">
                            <h2 className="text-base font-bold flex items-center gap-2 uppercase tracking-widest"><Edit2 size={18}/> SỬA HỒ SƠ NHÂN VIÊN</h2>
                            <button onClick={() => setIsEditModalOpen(false)}><X size={24}/></button>
                        </div>
                        <form onSubmit={handleSaveEdit} className="p-8 space-y-6 bg-slate-900 overflow-y-auto custom-scrollbar max-h-[80vh]">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-1.5">
                                    <label className="block text-[10px] font-black text-slate-500 uppercase ml-1">Mã Nhân Viên <span className="text-red-500">*</span></label>
                                    <div className="relative">
                                        <Hash size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"/>
                                        <input 
                                            type="text" 
                                            value={editingStaff.employeeId}
                                            onChange={e => setEditingStaff({ ...editingStaff, employeeId: e.target.value })}
                                            className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-blue-400 font-mono font-bold outline-none focus:border-blue-500 shadow-inner"
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-[10px] font-black text-slate-500 uppercase ml-1">Họ và Tên <span className="text-red-500">*</span></label>
                                    <div className="relative">
                                        <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"/>
                                        <input 
                                            type="text" 
                                            value={editingStaff.fullName}
                                            onChange={e => setEditingStaff({ ...editingStaff, fullName: e.target.value })}
                                            className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-white font-bold outline-none focus:border-blue-500 shadow-inner"
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-1.5">
                                    <label className="block text-[10px] font-black text-slate-500 uppercase ml-1">Phòng Ban</label>
                                    <div className="relative">
                                        <Layers size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"/>
                                        <select 
                                            value={editingStaff.department}
                                            onChange={e => setEditingStaff({ ...editingStaff, department: e.target.value })}
                                            className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-white font-bold outline-none focus:border-blue-500 shadow-inner appearance-none transition-all"
                                        >
                                            {DEPARTMENTS.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-[10px] font-black text-slate-500 uppercase ml-1">Chức Vụ</label>
                                    <div className="relative">
                                        <Briefcase size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"/>
                                        <input 
                                            type="text" 
                                            value={editingStaff.position}
                                            onChange={e => setEditingStaff({ ...editingStaff, position: e.target.value })}
                                            className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-white outline-none focus:border-blue-500 shadow-inner"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-1.5">
                                    <label className="block text-[10px] font-black text-slate-500 uppercase ml-1">Số Điện Thoại</label>
                                    <div className="relative">
                                        <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"/>
                                        <input 
                                            type="text" 
                                            value={editingStaff.phone}
                                            onChange={e => setEditingStaff({ ...editingStaff, phone: e.target.value })}
                                            className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-white font-mono outline-none focus:border-blue-500 shadow-inner"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-[10px] font-black text-slate-500 uppercase ml-1">Quê Quán</label>
                                    <div className="relative">
                                        <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"/>
                                        <input 
                                            type="text" 
                                            value={editingStaff.hometown}
                                            onChange={e => setEditingStaff({ ...editingStaff, hometown: e.target.value })}
                                            className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-white outline-none focus:border-blue-500 shadow-inner"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-1.5">
                                    <label className="block text-[10px] font-black text-slate-500 uppercase ml-1">Ngày Vào Cty</label>
                                    <div className="relative">
                                        <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"/>
                                        <input 
                                            type="date" 
                                            value={editingStaff.dateJoined}
                                            onChange={e => setEditingStaff({ ...editingStaff, dateJoined: e.target.value })}
                                            className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-white outline-none focus:border-blue-500 shadow-inner [color-scheme:dark]"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-[10px] font-black text-slate-500 uppercase ml-1">Ngày Sinh</label>
                                    <div className="relative">
                                        <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"/>
                                        <input 
                                            type="date" 
                                            value={editingStaff.dob}
                                            onChange={e => setEditingStaff({ ...editingStaff, dob: e.target.value })}
                                            className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-white outline-none focus:border-blue-500 shadow-inner [color-scheme:dark]"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-2xl shadow-xl transition-all active:scale-95 uppercase text-xs tracking-widest flex items-center justify-center gap-2 border-b-4 border-blue-800">
                                    <Save size={18}/> LƯU THAY ĐỔI
                                </button>
                                <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-8 bg-slate-700 hover:bg-slate-600 text-slate-300 font-bold py-4 rounded-2xl transition-all uppercase text-xs border border-slate-600">
                                    HỦY
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* TRANSFER MODAL */}
            {isTransferModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95 duration-200">
                    <div className="bg-slate-800 rounded-xl shadow-2xl w-full max-w-md border border-slate-600 overflow-hidden">
                        <div className="px-6 py-4 bg-indigo-600 text-white flex justify-between items-center shadow-lg shrink-0">
                            <h2 className="text-base font-bold flex items-center gap-2 uppercase tracking-wider"><ArrowRightLeft size={18}/> Thuyên chuyển nhân sự</h2>
                            <button onClick={() => setIsTransferModalOpen(false)}><X size={20}/></button>
                        </div>
                        <div className="p-6 space-y-4 bg-slate-900">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Chọn Nhân Viên (Mã NV)</label>
                                <div className="relative">
                                    <input 
                                        type="text" 
                                        list="staff-list-transfer"
                                        value={transferData.staffId}
                                        onChange={(e) => {
                                            const s = allStaff.find(st => st.employeeId === e.target.value);
                                            setTransferData({ 
                                                ...transferData, 
                                                staffId: e.target.value,
                                                fromDept: s ? s.department || '' : ''
                                            });
                                        }}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-indigo-500 outline-none transition-all"
                                        placeholder="Nhập mã hoặc tên..."
                                    />
                                    <datalist id="staff-list-transfer">
                                        {allStaff.map(s => <option key={s.id} value={s.employeeId}>{s.fullName} - {s.department}</option>)}
                                    </datalist>
                                </div>
                            </div>
                            {transferData.fromDept && (<div className="text-[10px] text-slate-500 uppercase font-bold bg-slate-800 px-3 py-1 rounded border border-slate-700 inline-block">Bộ phận hiện tại: <span className="text-white">{transferData.fromDept}</span></div>)}
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Chuyển Đến Bộ Phận</label>
                                <select 
                                    value={transferData.toDept}
                                    onChange={(e) => setTransferData({...transferData, toDept: e.target.value})}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-indigo-500 outline-none transition-all"
                                >
                                    {DEPARTMENTS.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Ngày Hiệu Lực</label>
                                <input type="date" value={transferData.date} onChange={(e) => setTransferData({...transferData, date: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm [color-scheme:dark] outline-none focus:border-indigo-500"/>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Lý Do Thuyên Chuyển</label>
                                <textarea 
                                    value={transferData.reason}
                                    onChange={(e) => setTransferData({...transferData, reason: e.target.value})}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-indigo-500 outline-none h-20 resize-none shadow-inner"
                                    placeholder="Lý do điều chuyển công tác..."
                                />
                            </div>
                            <button onClick={handleTransfer} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-3 rounded-xl uppercase text-xs shadow-xl transition-all active:scale-95 border-b-4 border-indigo-800">Xác nhận thuyên chuyển</button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* OTHER MODALS */}
            {isDiaryModalOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-300"><div className="bg-[#0f172a] w-full max-w-[95vw] h-[95vh] rounded-2xl border border-slate-700 flex flex-col overflow-hidden relative shadow-2xl"><HRAttendanceDiary allStaff={allStaff} attendanceHistory={attendanceHistory} onUpdateHistory={onUpdateAttendanceHistory} onClose={() => setIsDiaryModalOpen(false)}/></div></div>}
            {isOvertimeModalOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-300"><div className="bg-slate-800 w-full max-w-6xl h-[90vh] rounded-2xl border border-slate-700 flex flex-col overflow-hidden relative shadow-2xl"><div className="px-6 py-4 bg-orange-600 text-white flex justify-between items-center shrink-0"><h2 className="text-lg font-bold uppercase tracking-wider flex items-center gap-2"><Clock size={20}/> ĐĂNG KÝ TĂNG CA (OT)</h2><button onClick={() => setIsOvertimeModalOpen(false)} className="hover:bg-black/20 p-1 rounded-full transition-colors"><X size={24}/></button></div><div className="flex-1 overflow-hidden"><HROvertime allStaff={allStaff} overtimeRecords={overtimeRecords} onUpdateOvertime={onUpdateOvertime || (() => {})} viewMode="DEPT_ENTRY"/></div></div></div>}
            {selectedProfile && <div className="fixed inset-0 z-[100] bg-slate-900 animate-in fade-in duration-200 overflow-hidden"><EmployeeProfile currentUser={{ username: 'hr_admin', fullName: 'HR Manager', role: 'hr' }} staffInfo={selectedProfile} contracts={contracts} salarySlips={salarySlips} payrollRecords={payrollRecords} overtimeRecords={overtimeRecords} announcements={announcements} timekeepingRecords={timekeepingRecords} attendanceRequests={attendanceRequests} onRequestCorrection={onRequestCorrection} attendanceConfirmations={attendanceConfirmations} onUpdateAttendanceConfirmation={onUpdateAttendanceConfirmation} onClose={() => setSelectedProfile(null)}/></div>}
            {isBackupModalOpen && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-300"><div className="bg-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl border border-slate-700 flex flex-col max-h-[90vh] overflow-hidden relative"><button onClick={() => setIsBackupModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white z-10 p-1 rounded-full hover:bg-slate-700 transition-all"><X size={24}/></button><div className="flex-1 overflow-y-auto custom-scrollbar"><MultiAutoBackupRestore moduleName="HC & NS" staffData={allStaff} setStaffData={handleUpdateAllStaff} customData={{'HR_HOP_DONG': { data: contracts, setter: (val: any) => console.log('Restore Contracts', val) }, 'HR_LUONG': { data: salarySlips, setter: (val: any) => console.log('Restore Slips', val) },'HR_BANG_CONG': { data: payrollRecords, setter: (val: any) => console.log('Restore Payroll', val) },'HR_TANG_CA': { data: overtimeRecords, setter: (val: any) => onUpdateOvertime(val) },'HR_THONG_BAO': { data: announcements, setter: (val: any) => console.log('Restore Announcements', val) },'HR_NHAT_KY': { data: attendanceHistory, setter: (val: any) => onUpdateAttendanceHistory(val) }}}/></div></div></div>}

        </div>
    );
};
