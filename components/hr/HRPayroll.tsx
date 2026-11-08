

import React, { useState, useRef, useMemo } from 'react';
import { Banknote, Upload, FileText, Download, Share2, Eye, Trash2, Plus, X, Search, CheckSquare, Square, Layers, Cpu, HardDrive, Wrench, Edit, Save, Calendar, CheckCircle2, AlertCircle, FileUp, Send, MessageSquare, Info, User, Check, List, ChevronLeft, ChevronRight } from 'lucide-react';
import { PayrollRecord, FeedbackItem, StaffRecord } from '../../types';

interface HRPayrollProps {
    payrollRecords: PayrollRecord[];
    setPayrollRecords: (records: PayrollRecord[]) => void;
    allStaff: StaffRecord[]; // New Prop
}

interface ExtendedFeedbackItem extends FeedbackItem {
    targetName: string;
    targetDept: string;
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

const DEPT_SHARE_TARGETS = [
    { id: 'DIRECTOR', label: 'Ban Giám Đốc' },
    { id: 'ACCOUNTING', label: 'Kế Toán' },
];

export const HRPayroll: React.FC<HRPayrollProps> = ({ payrollRecords, setPayrollRecords, allStaff }) => {
    // Date State separated into Year and Month for Tab UI
    const [viewYear, setViewYear] = useState(new Date().getFullYear());
    const [viewMonth, setViewMonth] = useState(new Date().getMonth() + 1);

    const [activeDeptId, setActiveDeptId] = useState<string>('MULTI');
    const [searchTerm, setSearchTerm] = useState('');
    
    // Modal States
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false); 
    const [isEditing, setIsEditing] = useState(false);
    
    // Global Feedback Modal State
    const [isGlobalFeedbackModalOpen, setIsGlobalFeedbackModalOpen] = useState(false);
    const [globalFeedbackType, setGlobalFeedbackType] = useState<'CONFIRM' | 'REPORT'>('CONFIRM');

    // Computed string for filtering "YYYY-MM"
    const selectedMonthStr = `${viewYear}-${String(viewMonth).padStart(2, '0')}`;

    // Form State
    const [formData, setFormData] = useState<{
        id?: number;
        department: string;
        month: string;
        files: File[]; // Changed to array
        note: string;
        fileName?: string;
    }>({
        department: 'MULTI',
        month: selectedMonthStr,
        files: [],
        note: '',
        fileName: ''
    });

    // Share State
    const [shareTargetId, setShareTargetId] = useState<number | null>(null);
    const [shareSelection, setShareSelection] = useState<string[]>([]);
    const [shareMode, setShareMode] = useState<'DEPARTMENT' | 'INDIVIDUAL'>('DEPARTMENT');
    const [shareSearch, setShareSearch] = useState('');

    // Feedback State (Individual File)
    const [currentFeedbackList, setCurrentFeedbackList] = useState<FeedbackItem[]>([]);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // --- DERIVED DATA ---

    const filteredRecords = useMemo(() => {
        return payrollRecords.filter(r => {
            const matchesDept = r.department === activeDeptId;
            const matchesMonth = r.month === selectedMonthStr;
            const matchesSearch = r.fileName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                  (r.note && r.note.toLowerCase().includes(searchTerm.toLowerCase()));
            return matchesDept && matchesMonth && matchesSearch;
        }).sort((a, b) => b.id - a.id);
    }, [payrollRecords, activeDeptId, selectedMonthStr, searchTerm]);

    // Stats for Dept Cards
    const deptStats = useMemo(() => {
        const stats: Record<string, number> = {};
        DEPARTMENTS.forEach(d => stats[d.id] = 0);
        
        payrollRecords.forEach(r => {
            if (r.month === selectedMonthStr && stats[r.department] !== undefined) {
                stats[r.department]++;
            }
        });
        return stats;
    }, [payrollRecords, selectedMonthStr]);

    // Global Feedback Stats
    const globalFeedbackStats = useMemo(() => {
        let confirmed = 0;
        let reported = 0;
        
        // Flatten all feedback from all records
        const allFeedbackItems: ExtendedFeedbackItem[] = payrollRecords.flatMap(r => 
            (r.feedback || []).map(f => ({ ...f, targetName: r.fileName, targetDept: r.department }))
        );

        confirmed = allFeedbackItems.filter(f => f.type === 'CONFIRM').length;
        reported = allFeedbackItems.filter(f => f.type === 'REPORT').length;

        return { confirmed, reported, allItems: allFeedbackItems };
    }, [payrollRecords]);

    // Get currently sharing record for filtering staff list
    const sharingRecord = useMemo(() => {
        return payrollRecords.find(r => r.id === shareTargetId);
    }, [shareTargetId, payrollRecords]);

    // --- FORM ACTIONS ---

    const handleAddNew = () => {
        setIsEditing(false);
        setFormData({
            department: activeDeptId,
            month: selectedMonthStr, // Pre-fill with currently selected month from tabs
            files: [],
            note: '',
            fileName: ''
        });
        setIsModalOpen(true);
    };

    const handleEdit = (record: PayrollRecord) => {
        setIsEditing(true);
        setFormData({
            id: record.id,
            department: record.department,
            month: record.month,
            files: [], // Reset files on edit, user must re-upload if changing
            note: record.note || '',
            fileName: record.fileName
        });
        setIsModalOpen(true);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setFormData({ ...formData, files: Array.from(e.target.files) });
        }
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!formData.department || !formData.month) {
            alert("Vui lòng chọn phòng ban và tháng.");
            return;
        }

        if (!isEditing && formData.files.length === 0) {
            alert("Vui lòng tải file lên.");
            return;
        }

        if (isEditing && formData.id) {
            // Edit Mode (Only updates metadata or replaces single file logic if expanded, keeping simple for now)
            const updatedRecords = payrollRecords.map(rec => {
                if (rec.id === formData.id) {
                    // Logic here only updates note/dept/month for simplicity, file update usually implies new record or complex handling
                    return {
                        ...rec,
                        department: formData.department,
                        month: formData.month,
                        note: formData.note,
                        // If files uploaded in edit mode, take the first one (simple override)
                        fileName: formData.files.length > 0 ? formData.files[0].name : rec.fileName,
                        fileUrl: formData.files.length > 0 ? URL.createObjectURL(formData.files[0]) : rec.fileUrl
                    };
                }
                return rec;
            });
            setPayrollRecords(updatedRecords);
            alert("Đã cập nhật bảng công thành công!");
        } else {
            // Add Mode - Handle Multiple Files
            const newRecords: PayrollRecord[] = formData.files.map(file => ({
                id: Date.now() + Math.random(),
                department: formData.department,
                month: formData.month,
                fileName: file.name,
                fileUrl: URL.createObjectURL(file),
                uploadDate: new Date().toLocaleDateString('vi-VN'),
                note: formData.note,
                sharedWith: [],
                feedback: []
            }));
            
            setPayrollRecords([...newRecords, ...payrollRecords]);
            alert(`Đã thêm ${newRecords.length} file bảng công thành công!`);
        }
        
        setIsModalOpen(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleDelete = (id: number) => {
        if (window.confirm("Bạn có chắc chắn muốn xóa file này?")) {
            setPayrollRecords(payrollRecords.filter(r => r.id !== id));
        }
    };

    // --- ROW ACTIONS ---

    const handleDownload = (record: PayrollRecord) => {
        if (record.fileUrl) {
            const link = document.createElement('a');
            link.href = record.fileUrl;
            link.download = record.fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } else {
            alert("File không tồn tại (Dữ liệu mẫu).");
        }
    };

    const handleView = (record: PayrollRecord) => {
        if (record.fileUrl) {
            window.open(record.fileUrl, '_blank');
        }
    };

    // --- SHARE ACTIONS ---

    const openShareModal = (record: PayrollRecord) => {
        setShareTargetId(record.id);
        setShareSelection(record.sharedWith || []);
        setShareMode('DEPARTMENT');
        setShareSearch('');
        setIsShareModalOpen(true);
    };

    const toggleShareTarget = (targetId: string) => {
        setShareSelection(prev => 
            prev.includes(targetId) 
            ? prev.filter(id => id !== targetId) 
            : [...prev, targetId]
        );
    };

    const saveShare = () => {
        if (shareTargetId === null) return;
        const updatedRecords = payrollRecords.map(r => 
            r.id === shareTargetId ? { ...r, sharedWith: shareSelection } : r
        );
        setPayrollRecords(updatedRecords);
        setIsShareModalOpen(false);
        setShareTargetId(null);
        alert("Đã cập nhật quyền chia sẻ.");
    };

    // --- FEEDBACK ACTIONS ---

    const openFeedbackModal = (record: PayrollRecord) => {
        if (!record.feedback || record.feedback.length === 0) return;
        setCurrentFeedbackList(record.feedback);
        setIsFeedbackModalOpen(true);
    };

    const openGlobalFeedback = (type: 'CONFIRM' | 'REPORT') => {
        setGlobalFeedbackType(type);
        setIsGlobalFeedbackModalOpen(true);
    };

    // Helper for Share Modal Rendering
    const getShareLabel = (id: string) => {
        const dept = DEPT_SHARE_TARGETS.find(d => d.id === id);
        if (dept) return dept.label;
        const staff = allStaff.find(s => s.employeeId === id);
        if (staff) return staff.fullName;
        return id;
    };

    return (
        <div className="flex flex-col h-full bg-slate-900 text-slate-300 p-6 font-sans overflow-hidden relative">
            
            {/* Header Area with Month Tabs */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-6 shrink-0">
                <div className="flex items-center gap-4">
                    <div className="p-2 bg-emerald-900/30 rounded-lg border border-emerald-500/50">
                       <Banknote className="text-emerald-500" size={28}/>
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white uppercase tracking-wide">QUẢN LÝ BẢNG CÔNG</h2>
                        <p className="text-slate-400 text-xs mt-0.5">Dữ liệu công tổng hợp theo tháng & bộ phận</p>
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
                     const count = deptStats[dept.id] || 0;
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
                                <span className={`text-sm font-black ${isActive ? 'text-white' : 'text-slate-600'} font-mono`}>
                                    {count}
                                </span>
                            </div>
                            
                            {/* Visual Indicator */}
                            <div className="w-full bg-slate-950 h-1 rounded-full overflow-hidden">
                                <div 
                                    className={`h-full transition-all duration-500 ${dept.bg} ${isActive ? 'opacity-100' : 'opacity-40'}`} 
                                    style={{ width: `${count > 0 ? '100%' : '5%'}` }}
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
                            placeholder="Tìm kiếm file..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-1.5 bg-slate-900 border border-slate-600 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
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
                        <Upload size={14}/> Tải File Mới
                    </button>
                </div>
            </div>

            {/* Main List */}
            <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden shadow-lg flex-1 flex flex-col min-h-0">
                <div className="px-4 py-3 bg-slate-800 border-b border-slate-700 font-bold text-sm text-slate-300 uppercase flex items-center gap-2 shrink-0">
                    <Layers size={16} className="text-emerald-500"/> Bảng Công Chung ({DEPARTMENTS.find(d => d.id === activeDeptId)?.label}) - Tháng {viewMonth}/{viewYear}
                </div>
                <div className="overflow-auto flex-1 custom-scrollbar">
                    <table className="w-full text-xs text-left">
                        <thead className="text-[10px] text-slate-500 uppercase bg-slate-900 sticky top-0 z-10 font-bold">
                            <tr>
                                <th className="px-4 py-3 w-[40px] text-center whitespace-nowrap">#</th>
                                <th className="px-4 py-3 whitespace-nowrap">Tên File</th>
                                <th className="px-4 py-3 whitespace-nowrap">Ghi Chú</th>
                                <th className="px-4 py-3 whitespace-nowrap">Ngày Tải</th>
                                <th className="px-4 py-3 whitespace-nowrap">Chia Sẻ Với</th>
                                <th className="px-4 py-3 text-center whitespace-nowrap">Phản Hồi</th>
                                <th className="px-4 py-3 text-center whitespace-nowrap">Thao Tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/50">
                            {filteredRecords.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-slate-500 italic">
                                        <div className="flex flex-col items-center gap-2">
                                            <FileText size={32} className="opacity-20"/>
                                            <span>Chưa có file nào trong tháng {viewMonth}/{viewYear}.</span>
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
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <FileText size={16} className="text-blue-400"/>
                                                <span className="text-white font-medium">{record.fileName}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-xs text-slate-400 italic whitespace-nowrap">
                                            {record.note || '-'}
                                        </td>
                                        <td className="px-4 py-3 text-xs text-slate-500 font-mono whitespace-nowrap">
                                            {record.uploadDate}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            {record.sharedWith && record.sharedWith.length > 0 ? (
                                                <div className="flex gap-1 flex-wrap">
                                                    {record.sharedWith.map(roleId => (
                                                        <span key={roleId} className="text-[9px] bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded border border-slate-600">
                                                            {getShareLabel(roleId)}
                                                        </span>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span className="text-slate-600 text-xs">--</span>
                                            )}
                                        </td>
                                        
                                        {/* FEEDBACK COLUMN - IMPROVED BUTTONS */}
                                        <td className="px-4 py-3 text-center whitespace-nowrap">
                                            <div className="flex justify-center gap-1">
                                                {confirmCount > 0 ? (
                                                    <button 
                                                        onClick={() => openFeedbackModal(record)}
                                                        className="flex items-center gap-1 text-[10px] text-green-400 bg-green-900/30 px-2 py-0.5 rounded border border-green-800 font-bold hover:bg-green-900/50 transition-colors"
                                                        title="Xem danh sách xác nhận"
                                                    >
                                                        <CheckCircle2 size={10}/> {confirmCount}
                                                    </button>
                                                ) : null}
                                                
                                                {reportCount > 0 ? (
                                                    <button 
                                                        onClick={() => openFeedbackModal(record)}
                                                        className="flex items-center gap-1 text-[10px] text-red-400 bg-red-900/30 px-2 py-0.5 rounded border border-red-800 font-bold hover:bg-red-900/50 transition-colors"
                                                        title="Xem danh sách báo lỗi"
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
                                                <button onClick={() => handleDownload(record)} className="p-1.5 hover:bg-green-900/50 text-green-400 rounded transition-colors" title="Tải về"><Download size={14}/></button>
                                                <button onClick={() => handleEdit(record)} className="p-1.5 hover:bg-slate-700 text-slate-300 rounded transition-colors" title="Sửa"><Edit size={14}/></button>
                                                <button onClick={() => openShareModal(record)} className="p-1.5 hover:bg-indigo-900/50 text-indigo-400 rounded transition-colors" title="Phân Quyền"><Share2 size={14}/></button>
                                                <button onClick={() => handleDelete(record.id)} className="p-1.5 hover:bg-red-900/50 text-red-400 rounded transition-colors" title="Xóa"><Trash2 size={14}/></button>
                                            </div>
                                        </td>
                                    </tr>
                                )})
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ADD/EDIT MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-600">
                        <div className="px-6 py-4 bg-blue-700 text-white flex justify-between items-center rounded-t-xl">
                            <h2 className="text-lg font-bold flex items-center gap-2 uppercase">
                                {isEditing ? <Edit size={20}/> : <Plus size={20}/>}
                                {isEditing ? 'Cập Nhật Bảng Công' : 'Thêm Bảng Công Mới'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="hover:bg-white/20 p-1 rounded transition-colors">
                                <X size={20}/>
                            </button>
                        </div>
                        
                        <form onSubmit={handleSave} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Phòng Ban <span className="text-red-500">*</span></label>
                                <select 
                                    value={formData.department}
                                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                    className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 focus:outline-none text-white"
                                >
                                    {DEPARTMENTS.map(d => (
                                        <option key={d.id} value={d.id}>{d.label}</option>
                                    ))}
                                </select>
                            </div>

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
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">
                                    File Bảng Công {isEditing ? '(Bỏ qua nếu không đổi)' : <span className="text-red-500">*</span>}
                                </label>
                                <div className="relative">
                                    <input 
                                        type="file" 
                                        ref={fileInputRef}
                                        onChange={handleFileChange}
                                        className="hidden"
                                        id="payroll-upload"
                                        multiple // Enable multiple files
                                        accept=".pdf,.xlsx,.xls,.doc,.docx,.jpg,.jpeg,.png" // Added image formats
                                    />
                                    <label 
                                        htmlFor="payroll-upload"
                                        className="w-full flex items-center justify-center gap-2 bg-slate-900 border border-dashed border-slate-500 rounded-lg p-3 text-slate-400 hover:bg-slate-700 cursor-pointer transition-colors text-sm"
                                    >
                                        <Upload size={16} />
                                        {formData.files.length > 0 
                                            ? <span className="text-white font-bold">Đã chọn {formData.files.length} file</span>
                                            : (formData.fileName ? formData.fileName : "Chọn file (PDF, Excel, Ảnh)...")
                                        }
                                    </label>
                                    {formData.files.length > 0 && (
                                        <div className="mt-2 text-xs text-slate-400 max-h-20 overflow-y-auto">
                                            {formData.files.map((f, idx) => (
                                                <div key={idx} className="truncate">• {f.name}</div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Ghi Chú</label>
                                <textarea 
                                    value={formData.note}
                                    onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                                    className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 focus:outline-none resize-none h-20 text-white"
                                    placeholder="Ghi chú thêm..."
                                />
                            </div>

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

            {/* SHARE MODAL */}
            {isShareModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-slate-800 rounded-xl shadow-2xl w-full max-w-sm border border-slate-600 flex flex-col max-h-[80vh]">
                        <div className="px-5 py-3 bg-indigo-700 text-white flex justify-between items-center rounded-t-xl shrink-0">
                            <h3 className="font-bold flex items-center gap-2 text-sm"><Share2 size={18}/> PHÂN QUYỀN XEM</h3>
                            <button onClick={() => setIsShareModalOpen(false)}><X size={18}/></button>
                        </div>
                        
                        <div className="p-5 flex-1 overflow-hidden flex flex-col">
                            {/* Mode Toggle */}
                            <div className="flex bg-slate-900 rounded p-1 mb-3 shrink-0">
                                <button 
                                    onClick={() => setShareMode('DEPARTMENT')} 
                                    className={`flex-1 py-1.5 text-xs font-bold rounded transition-all ${shareMode === 'DEPARTMENT' ? 'bg-slate-700 text-white' : 'text-slate-500'}`}
                                >
                                    Phòng Ban
                                </button>
                                <button 
                                    onClick={() => setShareMode('INDIVIDUAL')} 
                                    className={`flex-1 py-1.5 text-xs font-bold rounded transition-all ${shareMode === 'INDIVIDUAL' ? 'bg-slate-700 text-white' : 'text-slate-500'}`}
                                >
                                    Cá Nhân
                                </button>
                            </div>

                            <p className="text-xs text-slate-400 mb-3">Chọn đối tượng được phép xem:</p>
                            
                            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 mb-4 bg-slate-900/30 p-2 rounded">
                                {shareMode === 'DEPARTMENT' ? (
                                    DEPT_SHARE_TARGETS.map(target => (
                                        <div 
                                            key={target.id} 
                                            onClick={() => toggleShareTarget(target.id)}
                                            className={`flex items-center justify-between p-2 rounded cursor-pointer border transition-all ${
                                                shareSelection.includes(target.id) 
                                                ? 'bg-indigo-900/30 border-indigo-500 text-indigo-100' 
                                                : 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-700'
                                            }`}
                                        >
                                            <span className="text-sm font-bold">{target.label}</span>
                                            {shareSelection.includes(target.id) ? <CheckSquare size={16} className="text-indigo-400"/> : <Square size={16}/>}
                                        </div>
                                    ))
                                ) : (
                                    <>
                                        <div className="relative mb-2 sticky top-0">
                                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                                            <input 
                                                type="text" 
                                                placeholder="Tìm nhân viên..."
                                                value={shareSearch}
                                                onChange={(e) => setShareSearch(e.target.value)}
                                                className="w-full pl-8 pr-2 py-1.5 bg-slate-900 border border-slate-600 rounded text-xs text-white focus:outline-none"
                                            />
                                        </div>
                                        {allStaff
                                            // FILTER: Only show staff from the same department as the shared record
                                            .filter(s => s.department === sharingRecord?.department)
                                            .filter(s => s.fullName.toLowerCase().includes(shareSearch.toLowerCase()) || s.employeeId.toLowerCase().includes(shareSearch.toLowerCase()))
                                            .map(staff => (
                                                <div 
                                                    key={staff.employeeId} 
                                                    onClick={() => toggleShareTarget(staff.employeeId)}
                                                    className={`flex items-center justify-between p-2 rounded cursor-pointer border transition-all ${
                                                        shareSelection.includes(staff.employeeId) 
                                                        ? 'bg-blue-900/30 border-blue-500 text-blue-100' 
                                                        : 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-700'
                                                    }`}
                                                >
                                                    <div>
                                                        <div className="text-xs font-bold">{staff.fullName}</div>
                                                        <div className="text-[10px] text-slate-500">{staff.employeeId} - {staff.department}</div>
                                                    </div>
                                                    {shareSelection.includes(staff.employeeId) ? <CheckSquare size={16} className="text-blue-400"/> : <Square size={16}/>}
                                                </div>
                                            ))
                                        }
                                    </>
                                )}
                            </div>

                            <button onClick={saveShare} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 rounded transition-colors text-sm shrink-0">
                                CẬP NHẬT
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* FEEDBACK LIST MODAL (INDIVIDUAL FILE) */}
            {isFeedbackModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-slate-900 rounded-xl shadow-2xl w-full max-w-2xl h-[80vh] flex flex-col border border-slate-700">
                         <div className="px-6 py-4 bg-slate-800 border-b border-slate-700 flex justify-between items-center shrink-0 rounded-t-xl">
                            <h3 className="font-bold text-white flex items-center gap-2 text-lg">
                                <MessageSquare size={20} className="text-blue-400"/> DANH SÁCH PHẢN HỒI (THEO FILE)
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

            {/* GLOBAL AGGREGATED FEEDBACK MODAL (NEW) */}
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
                                {globalFeedbackType === 'CONFIRM' ? 'DANH SÁCH ĐÃ XÁC NHẬN (TỔNG HỢP)' : 'DANH SÁCH BÁO SAI (TỔNG HỢP)'}
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
                                        .sort((a,b) => b.timestamp.localeCompare(a.timestamp)) // Sort by newest
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
