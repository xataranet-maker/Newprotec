
import React, { useState, useRef, useMemo } from 'react';
import { Banknote, Upload, FileText, Download, Share2, Eye, Trash2, Plus, X, Search, CheckSquare, Square, Layers, Cpu, HardDrive, Wrench, Edit, Save, Calendar, CheckCircle2, AlertCircle, FileUp, Send, MessageSquare, Info, User, Check, List, ChevronLeft, ChevronRight } from 'lucide-react';
import { SalarySlipRecord, FeedbackItem, StaffRecord } from '../../types';

interface HRSalarySlipProps {
    salarySlips: SalarySlipRecord[];
    setSalarySlips: (records: SalarySlipRecord[]) => void;
    allStaff: StaffRecord[];
}

interface ExtendedFeedbackItem extends FeedbackItem {
    targetName: string;
    employeeName: string;
    employeeIdRef: string;
}

const DEPARTMENTS = [
    { 
        id: 'MULTI', 
        label: 'Multi Auto', 
        icon: Cpu, 
        text: 'text-blue-500', 
        bg: 'bg-blue-500', 
        fullBorder: 'border-blue-500', 
        dimBorder: 'border-blue-500/20', 
        hoverBorder: 'hover:border-blue-500' 
    },
    { 
        id: 'STIFF', 
        label: 'Stiff', 
        icon: HardDrive, 
        text: 'text-green-500', 
        bg: 'bg-green-500', 
        fullBorder: 'border-green-500', 
        dimBorder: 'border-green-500/20', 
        hoverBorder: 'hover:border-green-500' 
    },
    { 
        id: 'MOLD', 
        label: 'Khuôn & Jig', 
        icon: Wrench, 
        text: 'text-orange-500', 
        bg: 'bg-orange-500', 
        fullBorder: 'border-orange-500', 
        dimBorder: 'border-orange-500/20', 
        hoverBorder: 'hover:border-orange-500' 
    },
    { 
        id: 'STAMPING', 
        label: 'Dập Tự Động', 
        icon: Layers, 
        text: 'text-purple-500', 
        bg: 'bg-purple-500', 
        fullBorder: 'border-purple-500', 
        dimBorder: 'border-purple-500/20', 
        hoverBorder: 'hover:border-purple-500' 
    },
    { 
        id: 'OFFICE', 
        label: 'Khối Văn Phòng', 
        icon: Banknote, 
        text: 'text-slate-500', 
        bg: 'bg-slate-500', 
        fullBorder: 'border-slate-500', 
        dimBorder: 'border-slate-500/20', 
        hoverBorder: 'hover:border-slate-500' 
    },
];

export const HRSalarySlip: React.FC<HRSalarySlipProps> = ({ salarySlips, setSalarySlips, allStaff }) => {
    // Date State separated into Year and Month for Tab UI
    const [viewYear, setViewYear] = useState(new Date().getFullYear());
    const [viewMonth, setViewMonth] = useState(new Date().getMonth() + 1);

    const [activeDeptId, setActiveDeptId] = useState<string>('MULTI');
    const [searchTerm, setSearchTerm] = useState('');
    
    // Modal States
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
    const [isGlobalFeedbackModalOpen, setIsGlobalFeedbackModalOpen] = useState(false);
    const [globalFeedbackType, setGlobalFeedbackType] = useState<'CONFIRM' | 'REPORT'>('CONFIRM');

    // Feedback Data State
    const [currentFeedbackList, setCurrentFeedbackList] = useState<FeedbackItem[]>([]);

    // Computed string for filtering "YYYY-MM"
    const selectedMonthStr = `${viewYear}-${String(viewMonth).padStart(2, '0')}`;

    const [formData, setFormData] = useState<{
        id?: number;
        employeeId: string;
        month: string;
        file: File | null;
        isShared: boolean;
        fileName?: string;
    }>({
        employeeId: '',
        month: selectedMonthStr,
        file: null,
        isShared: true,
        fileName: ''
    });

    const fileInputRef = useRef<HTMLInputElement>(null);

    // --- DERIVED DATA ---
    const filteredRecords = useMemo(() => {
        return salarySlips.filter(r => {
            const staff = allStaff.find(s => s.employeeId === r.employeeId);
            const deptMatch = staff ? staff.department === activeDeptId : false;
            
            const matchesMonth = r.month === selectedMonthStr;
            const matchesSearch = r.fileName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                  r.employeeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                  (staff?.fullName.toLowerCase().includes(searchTerm.toLowerCase()));
            
            return deptMatch && matchesMonth && matchesSearch;
        }).sort((a, b) => b.id - a.id);
    }, [salarySlips, activeDeptId, selectedMonthStr, searchTerm, allStaff]);

    const staffInDept = useMemo(() => {
        return allStaff.filter(s => s.department === activeDeptId);
    }, [allStaff, activeDeptId]);

    // Global Feedback Stats for the current view
    const globalFeedbackStats = useMemo(() => {
        const allItems: ExtendedFeedbackItem[] = [];
        
        salarySlips.forEach(slip => {
            if (slip.feedback && slip.feedback.length > 0) {
                const staff = allStaff.find(s => s.employeeId === slip.employeeId);
                // Only consider slips that match current month view for stats? 
                // Or all time? Let's do ALL TIME for the "Inbox" feel, or filter by month if preferred.
                // Doing ALL time is usually better for notifications.
                slip.feedback.forEach(fb => {
                    allItems.push({
                        ...fb,
                        targetName: slip.fileName,
                        employeeName: staff ? staff.fullName : slip.employeeId,
                        employeeIdRef: slip.employeeId
                    });
                });
            }
        });

        const confirmed = allItems.filter(f => f.type === 'CONFIRM').length;
        const reported = allItems.filter(f => f.type === 'REPORT').length;

        return { confirmed, reported, allItems };
    }, [salarySlips, allStaff]);

    // --- ACTIONS ---

    const handleAddNew = () => {
        setIsEditing(false);
        setFormData({
            employeeId: '',
            month: selectedMonthStr,
            file: null,
            isShared: true,
            fileName: ''
        });
        setIsModalOpen(true);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFormData({ ...formData, file: e.target.files[0] });
        }
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.employeeId || !formData.month) {
            alert("Vui lòng chọn nhân viên và tháng.");
            return;
        }

        if (!isEditing && !formData.file) {
            alert("Vui lòng tải file lên.");
            return;
        }

        if (isEditing && formData.id) {
             const updatedRecords = salarySlips.map(rec => {
                if (rec.id === formData.id) {
                    return {
                        ...rec,
                        employeeId: formData.employeeId,
                        month: formData.month,
                        isShared: formData.isShared,
                        fileName: formData.file ? formData.file.name : rec.fileName,
                        fileUrl: formData.file ? URL.createObjectURL(formData.file) : rec.fileUrl
                    };
                }
                return rec;
            });
            setSalarySlips(updatedRecords);
            alert("Cập nhật thành công!");
        } else {
            if (!formData.file) return;
            const newRecord: SalarySlipRecord = {
                id: Date.now(),
                employeeId: formData.employeeId,
                month: formData.month,
                fileName: formData.file.name,
                fileUrl: URL.createObjectURL(formData.file),
                uploadDate: new Date().toLocaleDateString('vi-VN'),
                isShared: formData.isShared,
                sharedWith: [],
                feedback: []
            };
            setSalarySlips([newRecord, ...salarySlips]);
            alert("Thêm phiếu lương thành công!");
        }
        setIsModalOpen(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleDelete = (id: number) => {
        if (window.confirm("Bạn có chắc chắn muốn xóa phiếu lương này?")) {
            setSalarySlips(salarySlips.filter(r => r.id !== id));
        }
    };

    const handleEdit = (record: SalarySlipRecord) => {
        setIsEditing(true);
        setFormData({
            id: record.id,
            employeeId: record.employeeId,
            month: record.month,
            file: null,
            isShared: record.isShared,
            fileName: record.fileName
        });
        setIsModalOpen(true);
    }

    const getStaffName = (empId: string) => {
        const staff = allStaff.find(s => s.employeeId === empId);
        return staff ? staff.fullName : 'Unknown';
    };

    // --- FEEDBACK ACTIONS ---
    const openFeedbackModal = (record: SalarySlipRecord) => {
        if (!record.feedback || record.feedback.length === 0) return;
        setCurrentFeedbackList(record.feedback);
        setIsFeedbackModalOpen(true);
    };

    const openGlobalFeedback = (type: 'CONFIRM' | 'REPORT') => {
        setGlobalFeedbackType(type);
        setIsGlobalFeedbackModalOpen(true);
    };

    return (
        <div className="flex flex-col h-full bg-slate-900 text-slate-300 p-6 font-sans overflow-hidden relative">
             
             {/* Header */}
             <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-4 shrink-0">
                <div className="flex items-center gap-4">
                    <div className="p-2 bg-emerald-900/30 rounded-lg border border-emerald-500/50">
                        <Banknote className="text-green-500" size={28}/>
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white uppercase tracking-wide">QUẢN LÝ PHIẾU LƯƠNG</h2>
                        <p className="text-slate-400 text-xs mt-0.5">Upload và quản lý phiếu lương cho từng nhân viên</p>
                    </div>
                </div>

                {/* MONTH SELECTOR BAR */}
                <div className="flex items-center bg-slate-800 p-1 rounded-lg border border-slate-700 shadow-lg overflow-x-auto max-w-full">
                     {/* Year Selector */}
                     <div className="flex items-center border-r border-slate-600 pr-2 mr-2">
                         <button 
                            onClick={() => setViewYear(prev => prev - 1)}
                            className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors"
                         >
                             <ChevronLeft size={16}/>
                         </button>
                         <span className="text-sm font-bold text-white px-2 font-mono">{viewYear}</span>
                         <button 
                            onClick={() => setViewYear(prev => prev + 1)}
                            className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors"
                         >
                             <ChevronRight size={16}/>
                         </button>
                     </div>

                     {/* Month Tabs 1-12 */}
                     <div className="flex items-center gap-1">
                         {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                             <button
                                key={month}
                                onClick={() => setViewMonth(month)}
                                className={`
                                    w-8 h-8 rounded-md text-xs font-bold transition-all duration-200 flex items-center justify-center
                                    ${viewMonth === month 
                                        ? 'bg-emerald-600 text-white shadow-lg scale-105 border border-emerald-500' 
                                        : 'text-slate-400 hover:bg-slate-700 hover:text-white'
                                    }
                                `}
                             >
                                 {month}
                             </button>
                         ))}
                     </div>
                </div>
            </div>

            {/* Department Navigation Cards - COMPACT */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4 shrink-0">
                {DEPARTMENTS.map(dept => {
                     // Quick stat for this dept/month
                     const total = allStaff.filter(s => s.department === dept.id).length;
                     const uploaded = salarySlips.filter(s => s.month === selectedMonthStr && 
                        allStaff.find(st => st.id && st.employeeId === s.employeeId)?.department === dept.id
                     ).length;
                     
                     const isActive = activeDeptId === dept.id;

                     return (
                        <button
                            key={dept.id}
                            onClick={() => setActiveDeptId(dept.id)}
                            className={`
                                relative px-3 py-2 rounded-lg border-2 text-left transition-all duration-300 group
                                ${isActive 
                                    ? `bg-slate-800 ${dept.fullBorder} shadow-lg shadow-black/20 scale-[1.02]` 
                                    : `bg-slate-900/50 ${dept.dimBorder} ${dept.hoverBorder} hover:bg-slate-800 hover:scale-[1.01]`
                                }
                            `}
                        >
                            <div className="flex justify-between items-center w-full mb-1.5">
                                <div className="flex items-center gap-2">
                                    <dept.icon size={16} className={dept.text}/>
                                    <span className={`text-xs font-bold uppercase ${isActive ? dept.text : 'text-slate-400'}`}>{dept.label}</span>
                                </div>
                                <div className="flex items-baseline gap-1">
                                    <span className={`text-sm font-black ${isActive ? 'text-white' : 'text-slate-600'} font-mono`}>
                                        {uploaded}
                                    </span>
                                    <span className={`text-[10px] font-medium ${isActive ? 'text-slate-400' : 'text-slate-600'}`}>/ {total}</span>
                                </div>
                            </div>
                            
                            <div className="w-full bg-slate-950 h-1 rounded-full overflow-hidden">
                                <div 
                                    className={`h-full transition-all duration-500 ${dept.bg} ${isActive ? 'opacity-100' : 'opacity-40'}`} 
                                    style={{ width: `${total > 0 ? (uploaded / total) * 100 : 0}%` }}
                                ></div>
                            </div>
                        </button>
                     );
                })}
            </div>

            {/* Toolbar */}
            <div className="flex flex-wrap gap-3 justify-between items-center mb-3 bg-slate-800 p-2 rounded-lg border border-slate-700 shrink-0">
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                        <input 
                            type="text" 
                            placeholder="Tìm kiếm nhân viên..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-1.5 bg-slate-900 border border-slate-600 rounded-lg text-xs text-white focus:outline-none focus:border-green-500"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* FEEDBACK SUMMARY BUTTONS */}
                    <button 
                        onClick={() => openGlobalFeedback('CONFIRM')}
                        className="flex items-center gap-2 px-3 py-1.5 bg-green-900/30 hover:bg-green-900/50 text-green-400 text-xs font-bold rounded shadow transition-colors border border-green-800"
                        title="Xem danh sách đã xác nhận"
                    >
                        <CheckCircle2 size={14}/> 
                        <span>Đã xác nhận: {globalFeedbackStats.confirmed}</span>
                    </button>
                    
                    <button 
                        onClick={() => openGlobalFeedback('REPORT')}
                        className={`flex items-center gap-2 px-3 py-1.5 bg-red-900/30 hover:bg-red-900/50 text-red-400 text-xs font-bold rounded shadow transition-colors border border-red-800 ${globalFeedbackStats.reported > 0 ? 'animate-pulse' : ''}`}
                        title="Xem danh sách báo sai"
                    >
                        <AlertCircle size={14}/> 
                        <span>Báo sai: {globalFeedbackStats.reported}</span>
                    </button>

                    <div className="w-px h-6 bg-slate-600 mx-1"></div>

                    <button 
                        onClick={handleAddNew}
                        className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded shadow transition-colors"
                    >
                        <Upload size={14}/> Tải Phiếu Lương
                    </button>
                </div>
            </div>

            {/* Main List */}
            <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden shadow-lg flex-1 flex flex-col min-h-0">
                <div className="overflow-auto flex-1 custom-scrollbar">
                    <table className="w-full text-xs text-left">
                         <thead className="text-[10px] text-slate-500 uppercase bg-slate-900 sticky top-0 z-10 font-bold">
                            <tr>
                                <th className="px-4 py-3 w-[40px] text-center whitespace-nowrap">#</th>
                                <th className="px-4 py-3 whitespace-nowrap">Mã NV</th>
                                <th className="px-4 py-3 whitespace-nowrap">Họ Tên</th>
                                <th className="px-4 py-3 whitespace-nowrap">Tên File</th>
                                <th className="px-4 py-3 whitespace-nowrap text-center">Ngày Tải</th>
                                <th className="px-4 py-3 text-center whitespace-nowrap">Chia Sẻ</th>
                                <th className="px-4 py-3 text-center whitespace-nowrap">Phản Hồi</th>
                                <th className="px-4 py-3 text-center whitespace-nowrap">Thao Tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/50">
                            {filteredRecords.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-12 text-center text-slate-500 italic">
                                        <div className="flex flex-col items-center gap-2">
                                            <FileText size={32} className="opacity-20"/>
                                            <span>Chưa có phiếu lương nào cho bộ phận này trong tháng {viewMonth}/{viewYear}.</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredRecords.map((record, index) => {
                                    const confirmCount = record.feedback?.filter(f => f.type === 'CONFIRM').length || 0;
                                    const reportCount = record.feedback?.filter(f => f.type === 'REPORT').length || 0;

                                    return (
                                        <tr key={record.id} className="hover:bg-white/5 transition-colors group">
                                            <td className="px-4 py-3 text-center text-slate-600 whitespace-nowrap">{index + 1}</td>
                                            <td className="px-4 py-3 font-mono font-bold text-slate-400">{record.employeeId}</td>
                                            <td className="px-4 py-3 font-bold text-white">{getStaffName(record.employeeId)}</td>
                                            <td className="px-4 py-3 whitespace-nowrap text-blue-400 cursor-pointer hover:underline" onClick={() => window.open(record.fileUrl, '_blank')}>
                                                {record.fileName}
                                            </td>
                                            <td className="px-4 py-3 text-center text-slate-500 font-mono">{record.uploadDate}</td>
                                            <td className="px-4 py-3 text-center">
                                                {record.isShared ? (
                                                    <span className="text-green-500"><CheckCircle2 size={14} className="inline"/></span>
                                                ) : (
                                                    <span className="text-slate-600">-</span>
                                                )}
                                            </td>
                                            
                                            {/* FEEDBACK COLUMN */}
                                            <td className="px-4 py-3 text-center whitespace-nowrap">
                                                <div className="flex justify-center gap-1">
                                                    {confirmCount > 0 ? (
                                                        <button 
                                                            onClick={() => openFeedbackModal(record)}
                                                            className="flex items-center gap-1 text-[10px] text-green-400 bg-green-900/30 px-2 py-0.5 rounded border border-green-800 font-bold hover:bg-green-900/50 transition-colors"
                                                            title="Xem chi tiết xác nhận"
                                                        >
                                                            <CheckCircle2 size={10}/> {confirmCount}
                                                        </button>
                                                    ) : null}
                                                    
                                                    {reportCount > 0 ? (
                                                        <button 
                                                            onClick={() => openFeedbackModal(record)}
                                                            className="flex items-center gap-1 text-[10px] text-red-400 bg-red-900/30 px-2 py-0.5 rounded border border-red-800 font-bold hover:bg-red-900/50 transition-colors"
                                                            title="Xem chi tiết báo lỗi"
                                                        >
                                                            <AlertCircle size={10}/> {reportCount}
                                                        </button>
                                                    ) : null}

                                                    {confirmCount === 0 && reportCount === 0 && (
                                                        <span className="text-slate-600 text-xs">-</span>
                                                    )}
                                                </div>
                                            </td>

                                            <td className="px-4 py-3 text-center whitespace-nowrap">
                                                <div className="flex justify-center gap-2">
                                                    <button onClick={() => window.open(record.fileUrl, '_blank')} className="p-1.5 hover:bg-blue-900/50 text-blue-400 rounded transition-colors" title="Xem"><Eye size={14}/></button>
                                                    <button onClick={() => handleDelete(record.id)} className="p-1.5 hover:bg-red-900/50 text-red-400 rounded transition-colors" title="Xóa"><Trash2 size={14}/></button>
                                                    <button onClick={() => handleEdit(record)} className="p-1.5 hover:bg-slate-700 text-slate-300 rounded transition-colors" title="Sửa"><Edit size={14}/></button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ADD/EDIT MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg border border-slate-600">
                        <div className="px-6 py-4 bg-blue-700 text-white flex justify-between items-center rounded-t-xl">
                            <h2 className="text-lg font-bold flex items-center gap-2 uppercase">
                                {isEditing ? <Edit size={20}/> : <Plus size={20}/>}
                                {isEditing ? 'Cập Nhật Phiếu Lương' : 'Tải Phiếu Lương'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="hover:bg-white/20 p-1 rounded transition-colors">
                                <X size={20}/>
                            </button>
                        </div>
                        
                        <form onSubmit={handleSave} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Tháng <span className="text-red-500">*</span></label>
                                <input 
                                    type="month" 
                                    value={formData.month} 
                                    onChange={(e) => setFormData({ ...formData, month: e.target.value })}
                                    className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 focus:outline-none text-white [color-scheme:dark]"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Nhân Viên <span className="text-red-500">*</span></label>
                                <select 
                                    value={formData.employeeId} 
                                    onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                                    className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 focus:outline-none text-white"
                                >
                                    <option value="">-- Chọn nhân viên --</option>
                                    {staffInDept.map(s => (
                                        <option key={s.id} value={s.employeeId}>{s.fullName} ({s.employeeId})</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">File Phiếu Lương <span className="text-red-500">*</span></label>
                                <div className="relative">
                                    <input 
                                        type="file" 
                                        ref={fileInputRef}
                                        onChange={handleFileChange}
                                        className="hidden"
                                        id="slip-upload"
                                        accept=".pdf,.png,.jpg,.jpeg"
                                    />
                                    <label 
                                        htmlFor="slip-upload"
                                        className="w-full flex items-center justify-center gap-2 bg-slate-900 border border-dashed border-slate-500 rounded-lg p-3 text-slate-400 hover:bg-slate-700 cursor-pointer transition-colors text-sm"
                                    >
                                        <Upload size={16} />
                                        {formData.fileName ? <span className="text-white font-bold truncate max-w-[200px]">{formData.fileName}</span> : "Chọn file PDF/Ảnh..."}
                                    </label>
                                </div>
                            </div>

                            <label className="flex items-center gap-2 cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    checked={formData.isShared}
                                    onChange={(e) => setFormData({...formData, isShared: e.target.checked})}
                                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 bg-slate-900 border-slate-600"
                                />
                                <span className="text-sm text-slate-300">Chia sẻ ngay với nhân viên</span>
                            </label>

                            <div className="pt-4 flex gap-3 border-t border-slate-700 mt-2">
                                <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded shadow-sm flex items-center justify-center gap-2 transition-colors text-sm">
                                    <Save size={16}/> {isEditing ? 'Cập Nhật' : 'Lưu'}
                                </button>
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 bg-slate-700 hover:bg-slate-600 text-slate-300 font-bold py-2 rounded transition-colors text-sm">
                                    Hủy
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* FEEDBACK LIST MODAL (INDIVIDUAL FILE) */}
            {isFeedbackModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-slate-900 rounded-xl shadow-2xl w-full max-w-2xl h-[80vh] flex flex-col border border-slate-700">
                         <div className="px-6 py-4 bg-slate-800 border-b border-slate-700 flex justify-between items-center shrink-0 rounded-t-xl">
                            <h3 className="font-bold text-white flex items-center gap-2 text-lg">
                                <MessageSquare size={20} className="text-blue-400"/> PHẢN HỒI (PHIẾU LƯƠNG)
                            </h3>
                            <button onClick={() => setIsFeedbackModalOpen(false)} className="hover:bg-slate-700 p-1 rounded transition-colors text-slate-400 hover:text-white">
                                <X size={20}/>
                            </button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-slate-900">
                            {currentFeedbackList.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-slate-500 italic">
                                    <Info size={40} className="opacity-20 mb-2"/>
                                    Chưa có phản hồi nào.
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {currentFeedbackList.map((fb) => (
                                        <div key={fb.id} className={`p-4 rounded-lg border flex flex-col gap-2 ${
                                            fb.type === 'CONFIRM' 
                                            ? 'bg-green-900/10 border-green-900/50' 
                                            : 'bg-red-900/10 border-red-900/50'
                                        }`}>
                                            <div className="flex justify-between items-start">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                                                        fb.type === 'CONFIRM' ? 'bg-green-800 text-green-100' : 'bg-red-800 text-red-100'
                                                    }`}>
                                                        {fb.senderName.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-slate-200 text-sm flex items-center gap-2">
                                                            {fb.senderName}
                                                            <span className="text-[10px] font-mono text-slate-500 font-normal bg-slate-800 px-1.5 rounded border border-slate-700">{fb.senderId}</span>
                                                        </div>
                                                        <div className="text-xs text-slate-500 mt-0.5">{fb.timestamp}</div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    {fb.type === 'CONFIRM' ? (
                                                        <span className="text-xs font-bold text-green-400 bg-green-900/30 px-2 py-1 rounded border border-green-800">ĐÃ XÁC NHẬN</span>
                                                    ) : (
                                                        <span className="text-xs font-bold text-red-400 bg-red-900/30 px-2 py-1 rounded border border-red-800">BÁO SAI</span>
                                                    )}
                                                </div>
                                            </div>
                                            
                                            {/* Content */}
                                            <div className={`mt-2 p-3 rounded text-sm ${
                                                fb.type === 'CONFIRM' ? 'bg-green-900/10 text-green-100' : 'bg-red-900/10 text-red-100'
                                            }`}>
                                                {fb.content || (fb.type === 'CONFIRM' ? 'Đã xác nhận thông tin chính xác.' : 'Không có nội dung chi tiết.')}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* GLOBAL AGGREGATED FEEDBACK MODAL */}
            {isGlobalFeedbackModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-slate-900 rounded-xl shadow-2xl w-full max-w-3xl h-[80vh] flex flex-col border border-slate-700">
                         <div className={`px-6 py-4 border-b border-slate-700 flex justify-between items-center shrink-0 rounded-t-xl ${
                             globalFeedbackType === 'CONFIRM' ? 'bg-green-900/20' : 'bg-red-900/20'
                         }`}>
                            <h3 className={`font-bold flex items-center gap-2 text-lg ${
                                globalFeedbackType === 'CONFIRM' ? 'text-green-400' : 'text-red-400'
                            }`}>
                                {globalFeedbackType === 'CONFIRM' ? <CheckCircle2 size={24}/> : <AlertCircle size={24}/>}
                                {globalFeedbackType === 'CONFIRM' ? 'DANH SÁCH ĐÃ XÁC NHẬN (PHIẾU LƯƠNG)' : 'DANH SÁCH BÁO SAI (PHIẾU LƯƠNG)'}
                            </h3>
                            <button onClick={() => setIsGlobalFeedbackModalOpen(false)} className="hover:bg-slate-700 p-1 rounded transition-colors text-slate-400 hover:text-white">
                                <X size={20}/>
                            </button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-slate-900">
                            {globalFeedbackStats.allItems.filter(f => f.type === globalFeedbackType).length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-slate-500 italic">
                                    <List size={40} className="opacity-20 mb-2"/>
                                    Chưa có dữ liệu phản hồi loại này.
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {globalFeedbackStats.allItems
                                        .filter(f => f.type === globalFeedbackType)
                                        .sort((a,b) => b.timestamp.localeCompare(a.timestamp))
                                        .map((fb, idx) => (
                                        <div key={idx} className={`p-4 rounded-lg border flex flex-col gap-2 ${
                                            fb.type === 'CONFIRM' 
                                            ? 'bg-green-900/5 border-green-900/30' 
                                            : 'bg-red-900/5 border-red-900/30'
                                        }`}>
                                            <div className="flex justify-between items-start">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                                                        fb.type === 'CONFIRM' ? 'bg-green-800 text-green-100' : 'bg-red-800 text-red-100'
                                                    }`}>
                                                        {fb.senderName.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-slate-200 text-sm flex items-center gap-2">
                                                            {fb.senderName}
                                                            <span className="text-[10px] font-mono text-slate-500 font-normal bg-slate-800 px-1.5 rounded border border-slate-700">{fb.senderId}</span>
                                                        </div>
                                                        <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                                                            <FileText size={10}/> File: <span className="text-blue-300 font-bold">{fb.targetName}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-xs font-mono text-slate-500">{fb.timestamp}</div>
                                                </div>
                                            </div>
                                            
                                            {/* Content */}
                                            <div className={`mt-2 p-3 rounded text-sm ${
                                                fb.type === 'CONFIRM' ? 'bg-green-900/10 text-green-100' : 'bg-red-900/10 text-red-100'
                                            }`}>
                                                {fb.content || (fb.type === 'CONFIRM' ? 'Đã xác nhận thông tin chính xác.' : 'Không có nội dung chi tiết.')}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};
