
import React, { useState, useMemo, useRef } from 'react';
import { FileBadge, Search, Plus, FileText, Download, Trash2, Cpu, HardDrive, Wrench, Layers, ChevronRight, ArrowLeft, CheckSquare, Upload, ShieldCheck, ClipboardList, BookOpen, Settings, Droplets, Save, Edit, X } from 'lucide-react';
import { QualityStandard } from '../../types';

// --- CONFIGURATION ---

const DEPARTMENTS = [
    { id: 'MULTI', label: 'Multi Auto', subtitle: 'Quản lý tiêu chuẩn', icon: Cpu, color: 'blue' },
    { id: 'STIFF', label: 'Stiff', subtitle: 'Quản lý tiêu chuẩn', icon: HardDrive, color: 'green' },
    { id: 'MOLD', label: 'Khuôn & Jig', subtitle: 'Quản lý tiêu chuẩn', icon: Wrench, color: 'orange' },
    { id: 'STAMPING', label: 'Dập Tự Động', subtitle: 'Quản lý tiêu chuẩn', icon: Layers, color: 'purple' },
];

const CATEGORIES = [
    { id: 'INPUT', label: 'Tiêu chuẩn Nhập', icon: CheckSquare, desc: 'NVL / Linh kiện đầu vào' },
    { id: 'OUTPUT', label: 'Tiêu chuẩn Xuất', icon: ShieldCheck, desc: 'Thành phẩm / Bán TP' },
    { id: 'EQUIPMENT', label: 'Kiểm tra Thiết bị', icon: Settings, desc: 'Bảo dưỡng / Vận hành' },
    { id: 'HYGIENE', label: 'Vệ sinh 5S', icon: Droplets, desc: 'Khu vực / Sản phẩm' },
    { id: 'GUIDELINE', label: 'Hướng dẫn / SOP', icon: BookOpen, desc: 'Quy trình thao tác' },
];

export const QualityStandards: React.FC = () => {
    // --- STATE ---
    const [viewMode, setViewMode] = useState<'DEPT_SELECT' | 'CAT_SELECT' | 'LIST'>('DEPT_SELECT');
    const [selectedDept, setSelectedDept] = useState<string | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Modal & Form
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [formData, setFormData] = useState<{
        title: string;
        code: string;
        manager: string;
        fileName: string;
        fileUrl: string;
    }>({
        title: '',
        code: '',
        manager: '',
        fileName: '',
        fileUrl: ''
    });

    // Mock Data (Expanded)
    const [standards, setStandards] = useState<QualityStandard[]>([
        { id: 1, code: 'ISO-9001', title: 'Quy trình kiểm soát chất lượng đầu vào', type: 'ISO', department: 'MULTI', category: 'INPUT', manager: 'Nguyễn Văn A', uploadDate: '2024-01-10', fileName: 'ISO9001_IQC.pdf' },
        { id: 2, code: 'IPC-A-610', title: 'Tiêu chuẩn chấp nhận bo mạch điện tử', type: 'IPC', department: 'MULTI', category: 'OUTPUT', manager: 'Trần Thị B', uploadDate: '2024-02-15', fileName: 'IPC_A_610.pdf' },
        { id: 3, code: 'EQ-M01', title: 'Checklist bảo dưỡng máy Multi', type: 'INTERNAL', department: 'MULTI', category: 'EQUIPMENT', manager: 'Lê Văn C', uploadDate: '2024-03-01', fileName: 'Multi_Maint_V1.pdf' },
        { id: 4, code: 'ST-IN-01', title: 'Tiêu chuẩn nhập Stiffener', type: 'INTERNAL', department: 'STIFF', category: 'INPUT', manager: 'Phạm Thị D', uploadDate: '2024-01-20', fileName: 'Stiff_Input_Std.pdf' },
    ]);

    // --- DERIVED DATA ---
    const activeDeptInfo = DEPARTMENTS.find(d => d.id === selectedDept);
    const activeCatInfo = CATEGORIES.find(c => c.id === selectedCategory);

    const filteredStandards = useMemo(() => {
        return standards.filter(std => 
            std.department === selectedDept &&
            std.category === selectedCategory &&
            (std.title.toLowerCase().includes(searchTerm.toLowerCase()) || std.code.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [standards, selectedDept, selectedCategory, searchTerm]);

    const getCountByDept = (deptId: string) => standards.filter(s => s.department === deptId).length;
    const getCountByCat = (deptId: string, catId: string) => standards.filter(s => s.department === deptId && s.category === catId).length;

    // Max counts for progress bars
    const maxDeptCount = useMemo(() => Math.max(...DEPARTMENTS.map(d => getCountByDept(d.id)), 1), [standards]);
    const maxCatCount = useMemo(() => {
        if (!selectedDept) return 1;
        return Math.max(...CATEGORIES.map(c => getCountByCat(selectedDept, c.id)), 1);
    }, [standards, selectedDept]);

    // --- ACTIONS ---

    const handleBack = () => {
        if (viewMode === 'LIST') setViewMode('CAT_SELECT');
        else if (viewMode === 'CAT_SELECT') {
            setViewMode('DEPT_SELECT');
            setSelectedDept(null);
        }
    };

    const handleSelectDept = (deptId: string) => {
        setSelectedDept(deptId);
        setViewMode('CAT_SELECT');
    };

    const handleSelectCategory = (catId: string) => {
        setSelectedCategory(catId);
        setViewMode('LIST');
    };

    const handleAddNew = () => {
        setEditingId(null);
        setFormData({ title: '', code: '', manager: '', fileName: '', fileUrl: '' });
        setIsModalOpen(true);
    };

    const handleEdit = (std: QualityStandard) => {
        setEditingId(std.id);
        setFormData({
            title: std.title,
            code: std.code,
            manager: std.manager,
            fileName: std.fileName,
            fileUrl: std.fileUrl || ''
        });
        setIsModalOpen(true);
    };

    const handleDelete = (id: number) => {
        if (window.confirm("Bạn có chắc chắn muốn xóa tiêu chuẩn này?")) {
            setStandards(prev => prev.filter(s => s.id !== id));
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setFormData(prev => ({
                ...prev,
                fileName: file.name,
                fileUrl: URL.createObjectURL(file)
            }));
        }
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.title || !formData.code || !selectedDept || !selectedCategory) {
            alert("Vui lòng điền đầy đủ thông tin.");
            return;
        }

        if (editingId) {
            setStandards(prev => prev.map(s => s.id === editingId ? {
                ...s,
                title: formData.title,
                code: formData.code,
                manager: formData.manager,
                fileName: formData.fileName,
                fileUrl: formData.fileUrl,
                uploadDate: new Date().toLocaleDateString('vi-VN')
            } : s));
        } else {
            const newStd: QualityStandard = {
                id: Date.now(),
                title: formData.title,
                code: formData.code,
                type: 'INTERNAL',
                department: selectedDept,
                category: selectedCategory as any,
                manager: formData.manager,
                uploadDate: new Date().toLocaleDateString('vi-VN'),
                fileName: formData.fileName || 'document.pdf',
                fileUrl: formData.fileUrl
            };
            setStandards(prev => [...prev, newStd]);
        }
        setIsModalOpen(false);
    };

    return (
        <div className="p-6 h-full overflow-y-auto bg-slate-900 flex flex-col gap-6 text-slate-300 font-sans relative">
            
            {/* --- HEADER --- */}
            <div className="bg-slate-800 px-6 py-4 rounded-xl shadow-lg border border-slate-700 flex items-center justify-between sticky top-0 z-20">
                <div className="flex items-center gap-3">
                    {viewMode !== 'DEPT_SELECT' && (
                        <button onClick={handleBack} className="p-2 mr-2 bg-slate-700 hover:bg-slate-600 rounded-full transition-colors text-white">
                            <ArrowLeft size={20}/>
                        </button>
                    )}
                    <div className="p-2 bg-blue-600 rounded-lg shadow-lg shadow-blue-900/50 text-white">
                        <FileBadge size={24} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-white uppercase tracking-wider font-mono">
                            {viewMode === 'DEPT_SELECT' ? 'TIÊU CHUẨN CHẤT LƯỢNG' : 
                             viewMode === 'CAT_SELECT' ? `TIÊU CHUẨN: ${activeDeptInfo?.label}` : 
                             `${activeCatInfo?.label} (${activeDeptInfo?.label})`}
                        </h1>
                        <p className="text-xs text-slate-400">
                            {viewMode === 'DEPT_SELECT' ? 'Chọn phòng ban để xem tiêu chuẩn' : 
                             viewMode === 'CAT_SELECT' ? 'Chọn loại tiêu chuẩn cần tra cứu' : 
                             'Quản lý danh sách tiêu chuẩn chi tiết'}
                        </p>
                    </div>
                </div>
            </div>

            {/* --- VIEW 1: DEPARTMENT SELECTION (Level 1) --- */}
            {viewMode === 'DEPT_SELECT' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    {DEPARTMENTS.map(dept => {
                        const count = getCountByDept(dept.id);
                        const progress = (count / maxDeptCount) * 100;

                        // Styles based on color
                        let borderColor = 'border-slate-700';
                        let hoverBorder = 'hover:border-slate-500';
                        let textColor = 'text-slate-300';
                        let barColor = 'bg-slate-500';
                        let glowEffect = '';

                        if (dept.color === 'blue') {
                            borderColor = 'border-blue-600/50';
                            hoverBorder = 'hover:border-blue-400 hover:bg-blue-900/10';
                            textColor = 'text-blue-400';
                            barColor = 'bg-blue-500';
                            glowEffect = 'hover:shadow-[0_0_15px_rgba(59,130,246,0.3)]';
                        } else if (dept.color === 'green') {
                            borderColor = 'border-green-600/50';
                            hoverBorder = 'hover:border-green-400 hover:bg-green-900/10';
                            textColor = 'text-green-400';
                            barColor = 'bg-green-500';
                            glowEffect = 'hover:shadow-[0_0_15px_rgba(34,197,94,0.3)]';
                        } else if (dept.color === 'orange') {
                            borderColor = 'border-orange-600/50';
                            hoverBorder = 'hover:border-orange-400 hover:bg-orange-900/10';
                            textColor = 'text-orange-400';
                            barColor = 'bg-orange-500';
                            glowEffect = 'hover:shadow-[0_0_15px_rgba(249,115,22,0.3)]';
                        } else if (dept.color === 'purple') {
                            borderColor = 'border-purple-600/50';
                            hoverBorder = 'hover:border-purple-400 hover:bg-purple-900/10';
                            textColor = 'text-purple-400';
                            barColor = 'bg-purple-500';
                            glowEffect = 'hover:shadow-[0_0_15px_rgba(168,85,247,0.3)]';
                        }

                        return (
                            <div 
                                key={dept.id}
                                onClick={() => handleSelectDept(dept.id)}
                                className={`
                                    relative bg-slate-800 rounded-lg px-5 py-4 border-2 cursor-pointer transition-all duration-300 group
                                    flex flex-col justify-between h-28
                                    ${borderColor} ${hoverBorder} ${glowEffect} active:scale-95
                                `}
                            >
                                <div className="flex justify-between items-start">
                                    {/* Left: Text Info */}
                                    <div className="flex flex-col">
                                        <h3 className="text-sm font-bold text-white uppercase tracking-wide leading-tight">{dept.label}</h3>
                                        <span className="text-[10px] text-slate-500 mt-1">{dept.subtitle}</span>
                                    </div>

                                    {/* Right: Icon above Count */}
                                    <div className={`flex flex-col items-end gap-1 ${textColor} transition-transform group-hover:scale-110`}>
                                        <dept.icon size={22} />
                                        <span className="font-mono font-bold text-lg leading-none">{count}</span>
                                    </div>
                                </div>
                                
                                {/* Bottom: Progress Bar */}
                                <div className="w-full h-1.5 bg-slate-700/50 rounded-full overflow-hidden mt-2">
                                    <div 
                                        className={`h-full rounded-full transition-all duration-1000 ${barColor}`} 
                                        style={{ width: `${progress}%` }}
                                    ></div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* --- VIEW 2: CATEGORY SELECTION (Level 2) --- */}
            {viewMode === 'CAT_SELECT' && selectedDept && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in zoom-in-95 duration-300">
                    {CATEGORIES.map(cat => {
                        const count = getCountByCat(selectedDept, cat.id);
                        const progress = (count / maxCatCount) * 100;
                        
                        // Inherit color from selected Department
                        let themeColor = 'text-slate-300';
                        let borderColor = 'border-slate-700';
                        let hoverClass = 'hover:border-slate-500';
                        let barColor = 'bg-slate-500';
                        let glowEffect = '';

                        if (activeDeptInfo) {
                            if (activeDeptInfo.color === 'blue') {
                                themeColor = 'text-blue-400';
                                borderColor = 'border-blue-500/40';
                                hoverClass = 'hover:border-blue-400 hover:bg-blue-900/10';
                                barColor = 'bg-blue-500';
                                glowEffect = 'hover:shadow-[0_0_15px_rgba(59,130,246,0.2)]';
                            } else if (activeDeptInfo.color === 'green') {
                                themeColor = 'text-green-400';
                                borderColor = 'border-green-500/40';
                                hoverClass = 'hover:border-green-400 hover:bg-green-900/10';
                                barColor = 'bg-green-500';
                                glowEffect = 'hover:shadow-[0_0_15px_rgba(34,197,94,0.2)]';
                            } else if (activeDeptInfo.color === 'orange') {
                                themeColor = 'text-orange-400';
                                borderColor = 'border-orange-500/40';
                                hoverClass = 'hover:border-orange-400 hover:bg-orange-900/10';
                                barColor = 'bg-orange-500';
                                glowEffect = 'hover:shadow-[0_0_15px_rgba(249,115,22,0.2)]';
                            } else if (activeDeptInfo.color === 'purple') {
                                themeColor = 'text-purple-400';
                                borderColor = 'border-purple-500/40';
                                hoverClass = 'hover:border-purple-400 hover:bg-purple-900/10';
                                barColor = 'bg-purple-500';
                                glowEffect = 'hover:shadow-[0_0_15px_rgba(168,85,247,0.2)]';
                            }
                        }

                        return (
                            <div 
                                key={cat.id}
                                onClick={() => handleSelectCategory(cat.id)}
                                className={`
                                    relative bg-slate-800 rounded-lg px-5 py-4 border-2 cursor-pointer transition-all duration-300 group
                                    flex flex-col justify-between h-28
                                    ${borderColor} ${hoverClass} ${glowEffect} active:scale-95
                                `}
                            >
                                <div className="flex justify-between items-start">
                                    {/* Left: Label & Desc */}
                                    <div className="flex flex-col pr-2">
                                        <h3 className="text-sm font-bold text-white uppercase tracking-wide leading-tight">{cat.label}</h3>
                                        <p className="text-[10px] text-slate-500 line-clamp-1 mt-1">{cat.desc}</p>
                                    </div>

                                    {/* Right: Icon above Count */}
                                    <div className={`flex flex-col items-end gap-1 ${themeColor} transition-transform group-hover:scale-110 min-w-[40px]`}>
                                        <cat.icon size={22} />
                                        <span className="font-mono font-bold text-lg leading-none">{count}</span>
                                    </div>
                                </div>
                                
                                {/* Bottom: Progress Bar */}
                                <div className="w-full h-1.5 bg-slate-700/50 rounded-full overflow-hidden mt-2">
                                    <div 
                                        className={`h-full rounded-full transition-all duration-1000 ${barColor}`} 
                                        style={{ width: `${progress}%` }}
                                    ></div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* --- VIEW 3: LIST & CRUD (Full Content & Horizontal Scroll) --- */}
            {viewMode === 'LIST' && (
                <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-right-4 duration-300 h-full">
                    
                    {/* Toolbar */}
                    <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 flex justify-between items-center shrink-0">
                         <div className="relative w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                            <input 
                                type="text" 
                                placeholder="Tìm kiếm tiêu chuẩn..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-600 rounded pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-blue-500 text-white"
                            />
                         </div>
                         <button 
                            onClick={handleAddNew}
                            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded flex items-center gap-2 text-sm font-bold transition-colors"
                         >
                             <Plus size={18}/> Thêm Tiêu Chuẩn
                         </button>
                    </div>

                    {/* Table */}
                    <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden shadow-lg flex-1 flex flex-col">
                        <div className="overflow-auto flex-1 custom-scrollbar">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-900 text-slate-500 uppercase text-[10px] font-bold sticky top-0 z-10 tracking-wider shadow-sm">
                                    <tr>
                                        <th className="px-4 py-3 border-b border-slate-700 min-w-[50px] text-center whitespace-nowrap">#</th>
                                        <th className="px-4 py-3 border-b border-slate-700 min-w-[120px] whitespace-nowrap">MÃ TL</th>
                                        <th className="px-4 py-3 border-b border-slate-700 min-w-[300px] whitespace-nowrap">TÊN TIÊU CHUẨN</th>
                                        <th className="px-4 py-3 border-b border-slate-700 min-w-[150px] whitespace-nowrap">NGƯỜI QL</th>
                                        <th className="px-4 py-3 border-b border-slate-700 text-center min-w-[100px] whitespace-nowrap">NGÀY CN</th>
                                        <th className="px-4 py-3 border-b border-slate-700 min-w-[200px] whitespace-nowrap">FILE</th>
                                        <th className="px-4 py-3 border-b border-slate-700 text-center min-w-[100px] whitespace-nowrap">THAO TÁC</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-700 text-xs">
                                    {filteredStandards.length === 0 ? (
                                        <tr><td colSpan={7} className="p-8 text-center text-slate-500 italic">Chưa có tiêu chuẩn nào.</td></tr>
                                    ) : (
                                        filteredStandards.map((std, index) => (
                                            <tr key={std.id} className="hover:bg-slate-700/50 transition-colors">
                                                <td className="px-4 py-2.5 text-center text-slate-500 whitespace-nowrap">{index + 1}</td>
                                                <td className="px-4 py-2.5 font-mono font-bold text-blue-400 whitespace-nowrap">{std.code}</td>
                                                
                                                {/* Title: No truncation */}
                                                <td className="px-4 py-2.5 font-bold text-white whitespace-nowrap">
                                                    {std.title}
                                                </td>

                                                {/* Manager: No truncation */}
                                                <td className="px-4 py-2.5 text-slate-300 whitespace-nowrap">
                                                    {std.manager || '---'}
                                                </td>

                                                <td className="px-4 py-2.5 text-slate-400 text-center font-mono whitespace-nowrap">{std.uploadDate}</td>
                                                
                                                {/* File: No truncation */}
                                                <td className="px-4 py-2.5 whitespace-nowrap">
                                                    {std.fileName ? (
                                                        <span className="inline-flex items-center gap-1 text-[10px] text-blue-300 bg-blue-900/30 px-2 py-0.5 rounded border border-blue-800 cursor-pointer hover:bg-blue-900/50">
                                                            <FileText size={10} className="shrink-0"/> {std.fileName}
                                                        </span>
                                                    ) : <span className="text-slate-600 italic">No File</span>}
                                                </td>

                                                <td className="px-4 py-2.5 text-center whitespace-nowrap">
                                                    <div className="flex justify-center gap-2">
                                                        <button onClick={() => handleEdit(std)} className="p-1 hover:bg-slate-600 rounded text-blue-400"><Edit size={14}/></button>
                                                        <button className="p-1 hover:bg-slate-600 rounded text-green-400"><Download size={14}/></button>
                                                        <button onClick={() => handleDelete(std.id)} className="p-1 hover:bg-slate-600 rounded text-red-400"><Trash2 size={14}/></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* --- ADD/EDIT MODAL --- */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg border border-slate-600 flex flex-col max-h-[90vh]">
                        <div className="px-6 py-4 bg-blue-700 text-white flex justify-between items-center rounded-t-xl shrink-0">
                            <h2 className="text-lg font-bold flex items-center gap-2 uppercase">
                                {editingId ? <Edit size={20}/> : <Plus size={20}/>}
                                {editingId ? 'Cập Nhật Tiêu Chuẩn' : 'Thêm Tiêu Chuẩn Mới'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="hover:bg-white/20 p-1 rounded transition-colors">
                                <X size={20}/>
                            </button>
                        </div>
                        
                        <form onSubmit={handleSave} className="p-6 space-y-4 overflow-y-auto">
                            
                            {/* Auto-filled Info Display */}
                            <div className="grid grid-cols-2 gap-4 mb-2">
                                <div className="bg-slate-900 p-2 rounded border border-slate-700">
                                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Phòng Ban</span>
                                    <span className={`text-sm font-bold ${activeDeptInfo?.color === 'blue' ? 'text-blue-400' : activeDeptInfo?.color === 'green' ? 'text-green-400' : activeDeptInfo?.color === 'orange' ? 'text-orange-400' : 'text-purple-400'}`}>{activeDeptInfo?.label}</span>
                                </div>
                                <div className="bg-slate-900 p-2 rounded border border-slate-700">
                                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Danh Mục</span>
                                    <span className="text-sm font-bold text-white">{activeCatInfo?.label}</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Mã Tài Liệu <span className="text-red-500">*</span></label>
                                    <input 
                                        type="text" 
                                        value={formData.code} 
                                        onChange={(e) => setFormData({...formData, code: e.target.value})}
                                        className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 focus:outline-none text-white font-mono"
                                        placeholder="ISO-..."
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Người Quản Lý</label>
                                    <input 
                                        type="text" 
                                        value={formData.manager} 
                                        onChange={(e) => setFormData({...formData, manager: e.target.value})}
                                        className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 focus:outline-none text-white"
                                        placeholder="Tên người QL..."
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Tên Tiêu Chuẩn <span className="text-red-500">*</span></label>
                                <input 
                                    type="text" 
                                    value={formData.title} 
                                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                                    className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 focus:outline-none text-white"
                                    placeholder="Nhập tên tiêu chuẩn..."
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">File Đính Kèm</label>
                                <div className="relative">
                                    <input 
                                        type="file" 
                                        ref={fileInputRef}
                                        onChange={handleFileChange}
                                        className="hidden"
                                        id="std-file-upload"
                                    />
                                    <label 
                                        htmlFor="std-file-upload"
                                        className="w-full flex items-center justify-center gap-2 bg-slate-900 border border-dashed border-slate-500 rounded-lg p-4 text-slate-400 hover:bg-slate-700 cursor-pointer transition-colors text-sm"
                                    >
                                        <Upload size={16} />
                                        {formData.fileName ? <span className="text-blue-400 font-bold">{formData.fileName}</span> : "Chọn file tài liệu..."}
                                    </label>
                                </div>
                            </div>

                            <div className="pt-4 flex gap-3 border-t border-slate-700 mt-2">
                                <button 
                                    type="submit" 
                                    className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded-lg shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 uppercase"
                                >
                                    <Save size={18} /> {editingId ? 'Cập Nhật' : 'Lưu Tiêu Chuẩn'}
                                </button>
                                <button 
                                    type="button" 
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-6 bg-slate-700 hover:bg-slate-600 text-slate-300 font-bold py-2.5 rounded-lg transition-colors border border-slate-600 uppercase"
                                >
                                    Hủy
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
}
