
import React, { useState, useMemo, useRef } from 'react';
import { FileText, Save, Upload, Eye, Edit, Trash2, Download, Share2, X, Search, CheckSquare, Square, FolderOpen, Layers, User, Hash } from 'lucide-react';
import { StaffRecord, ContractRecord } from '../../types';

interface HRContractsProps {
    contracts: ContractRecord[];
    setContracts: (data: ContractRecord[]) => void;
    allStaff: StaffRecord[];
}

const DEPARTMENTS_SHARE = [
    { id: 'MULTI', label: 'Multi Auto' },
    { id: 'STIFF', label: 'Stiff' },
    { id: 'MOLD', label: 'Khuôn & Jig' },
    { id: 'STAMPING', label: 'Dập Tự Động' },
    { id: 'ACCOUNTING', label: 'Kế Toán' },
    { id: 'DIRECTOR', label: 'Ban Giám Đốc' },
];

const DEPT_OPTIONS = [
    { id: 'MULTI', label: 'Multi Auto' },
    { id: 'STIFF', label: 'Stiff' },
    { id: 'MOLD', label: 'Khuôn & Jig' },
    { id: 'STAMPING', label: 'Dập Tự Động' },
];

export const HRContracts: React.FC<HRContractsProps> = ({ contracts, setContracts, allStaff }) => {
    const [searchTerm, setSearchTerm] = useState('');
    
    // Form State
    const [selectedDept, setSelectedDept] = useState('');
    const [formData, setFormData] = useState<{
        employeeId: string;
        employeeName: string;
        department: string;
        file: File | null;
        note: string;
    }>({
        employeeId: '',
        employeeName: '',
        department: '',
        file: null,
        note: ''
    });

    // Share Modal State
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [shareTargetId, setShareTargetId] = useState<number | null>(null);
    const [shareSelection, setShareSelection] = useState<string[]>([]);
    const [shareMode, setShareMode] = useState<'DEPARTMENT' | 'INDIVIDUAL'>('DEPARTMENT');
    const [shareSearch, setShareSearch] = useState('');

    const fileInputRef = useRef<HTMLInputElement>(null);

    // --- DERIVED DATA ---
    const staffInSelectedDept = useMemo(() => {
        if (!selectedDept) return [];
        return allStaff.filter(s => s.department === selectedDept);
    }, [allStaff, selectedDept]);

    // --- FORM HANDLERS ---

    const handleDeptChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const deptId = e.target.value;
        setSelectedDept(deptId);
        // Reset employee selection when department changes
        setFormData(prev => ({
            ...prev,
            department: deptId,
            employeeId: '',
            employeeName: ''
        }));
    };

    const handleEmployeeSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const empId = e.target.value; // Using ID as value in dropdown
        const staff = allStaff.find(s => s.id.toString() === empId);
        
        if (staff) {
            setFormData(prev => ({
                ...prev,
                employeeId: staff.employeeId, // Auto-fill ID
                employeeName: staff.fullName
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                employeeId: '',
                employeeName: ''
            }));
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFormData({ ...formData, file: e.target.files[0] });
        }
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.employeeId || !formData.file) {
            alert("Vui lòng chọn nhân viên và tải file lên.");
            return;
        }

        const newContract: ContractRecord = {
            id: Date.now(),
            employeeId: formData.employeeId,
            employeeName: formData.employeeName,
            department: formData.department,
            fileName: formData.file.name,
            fileUrl: URL.createObjectURL(formData.file), // Simulate URL
            uploadDate: new Date().toLocaleDateString('vi-VN'),
            note: formData.note,
            sharedWith: []
        };

        setContracts([newContract, ...contracts]);
        
        // Reset Form
        setFormData({
            employeeId: '',
            employeeName: '',
            department: '',
            file: null,
            note: ''
        });
        setSelectedDept('');
        if (fileInputRef.current) fileInputRef.current.value = '';
        alert("Đã lưu hợp đồng thành công!");
    };

    // --- TABLE ACTIONS ---

    const handleDelete = (id: number) => {
        if (window.confirm("Bạn có chắc chắn muốn xóa hợp đồng này?")) {
            setContracts(contracts.filter(c => c.id !== id));
        }
    };

    const handleDownload = (contract: ContractRecord) => {
        if (contract.fileUrl) {
            const link = document.createElement('a');
            link.href = contract.fileUrl;
            link.download = contract.fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } else {
            alert("File không tồn tại (Dữ liệu mẫu).");
        }
    };

    const handleView = (contract: ContractRecord) => {
        if (contract.fileUrl) {
            window.open(contract.fileUrl, '_blank');
        } else {
            alert("Không thể xem trước file này.");
        }
    };

    // --- SHARE LOGIC ---

    const openShareModal = (contract: ContractRecord) => {
        setShareTargetId(contract.id);
        setShareSelection(contract.sharedWith || []);
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
        
        const updatedContracts = contracts.map(c => 
            c.id === shareTargetId ? { ...c, sharedWith: shareSelection } : c
        );
        setContracts(updatedContracts);
        setIsShareModalOpen(false);
        setShareTargetId(null);
        alert("Đã cập nhật chia sẻ thành công!");
    };

    // Filter Logic
    const filteredContracts = contracts.filter(c => 
        c.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.employeeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.department.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Helpers for rendering shared targets
    const getShareLabel = (id: string) => {
        const dept = DEPARTMENTS_SHARE.find(d => d.id === id);
        if (dept) return dept.label;
        const staff = allStaff.find(s => s.employeeId === id);
        if (staff) return staff.fullName;
        return id;
    };

    const getShareInitials = (id: string) => {
        const dept = DEPARTMENTS_SHARE.find(d => d.id === id);
        if (dept) return dept.label.charAt(0);
        const staff = allStaff.find(s => s.employeeId === id);
        if (staff) return staff.fullName.charAt(0);
        return '?';
    };

    return (
        <div className="p-6 h-full overflow-y-auto bg-slate-900 flex flex-col gap-6 text-slate-300 font-sans relative pb-20">
            
            {/* Header */}
            <div className="bg-slate-800 px-6 py-4 rounded-xl shadow-lg border border-slate-700 flex justify-between items-center sticky top-0 z-20">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-600 rounded-lg shadow-lg shadow-indigo-900/50 text-white">
                        <FileText size={24} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-white uppercase tracking-wider font-mono">QUẢN LÝ HỢP ĐỒNG</h1>
                        <p className="text-xs text-slate-400">Lưu trữ và chia sẻ hồ sơ hợp đồng nhân sự</p>
                    </div>
                </div>
            </div>

            {/* Input Form */}
            <div className="bg-slate-800 rounded-xl shadow-lg border border-slate-700 p-6 shrink-0">
                <h3 className="text-sm font-bold text-blue-400 uppercase mb-4 border-b border-slate-700 pb-2">Nhập liệu hợp đồng mới</h3>
                <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* Left Column - Staff Selection */}
                    <div className="space-y-4 bg-slate-900/50 p-4 rounded border border-slate-700">
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1 flex items-center gap-1">
                                <Layers size={14}/> Chọn Phòng Ban <span className="text-red-500">*</span>
                            </label>
                            <select 
                                value={selectedDept}
                                onChange={handleDeptChange}
                                className="w-full bg-slate-800 border border-slate-600 rounded p-2.5 text-white focus:ring-1 focus:ring-blue-500 outline-none font-bold"
                            >
                                <option value="">-- Chọn phòng ban --</option>
                                {DEPT_OPTIONS.map(d => (
                                    <option key={d.id} value={d.id}>{d.label}</option>
                                ))}
                            </select>
                        </div>
                        
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1 flex items-center gap-1">
                                <User size={14}/> Chọn Nhân Viên <span className="text-red-500">*</span>
                            </label>
                            <select 
                                onChange={handleEmployeeSelect}
                                value={allStaff.find(s => s.employeeId === formData.employeeId)?.id || ''}
                                className="w-full bg-slate-800 border border-slate-600 rounded p-2.5 text-white focus:ring-1 focus:ring-blue-500 outline-none"
                                disabled={!selectedDept}
                            >
                                <option value="">-- Chọn nhân viên --</option>
                                {staffInSelectedDept.map(s => (
                                    <option key={s.id} value={s.id}>{s.fullName}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1 flex items-center gap-1">
                                <Hash size={14}/> Mã Nhân Viên (Auto)
                            </label>
                            <input 
                                value={formData.employeeId}
                                readOnly
                                className="w-full bg-black/40 border border-slate-700 rounded p-2.5 text-blue-400 cursor-not-allowed font-mono font-bold"
                                placeholder="NV..."
                            />
                        </div>
                    </div>

                    {/* Right Column - File & Note */}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Tải File Hợp Đồng <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <input 
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                    className="hidden"
                                    id="file-upload"
                                    accept=".pdf,.doc,.docx,.jpg,.png"
                                />
                                <label 
                                    htmlFor="file-upload"
                                    className="w-full flex items-center justify-center gap-2 bg-slate-900 border border-dashed border-slate-500 rounded p-4 text-slate-300 hover:bg-slate-700 cursor-pointer transition-colors"
                                >
                                    <Upload size={18} className="text-blue-500"/>
                                    {formData.file ? <span className="text-white font-bold">{formData.file.name}</span> : "Chọn file (PDF, Word, Ảnh)..."}
                                </label>
                            </div>
                        </div>
                        
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Ghi Chú</label>
                            <textarea 
                                value={formData.note}
                                onChange={(e) => setFormData({...formData, note: e.target.value})}
                                className="w-full bg-slate-900 border border-slate-600 rounded p-2.5 text-white focus:ring-1 focus:ring-blue-500 outline-none resize-none h-[88px]"
                                placeholder="Nhập ghi chú thêm..."
                            />
                        </div>

                        <button 
                            type="submit"
                            disabled={!formData.employeeId || !formData.file}
                            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold py-3 rounded shadow-lg flex items-center justify-center gap-2 transition-all mt-1"
                        >
                            <Save size={18}/> LƯU HỢP ĐỒNG
                        </button>
                    </div>
                </form>
            </div>

            {/* List Table - Expanded to show all content */}
            <div className="bg-slate-800 rounded-xl shadow-lg border border-slate-700 flex flex-col">
                <div className="p-4 border-b border-slate-700 flex justify-between items-center">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <FolderOpen size={18} className="text-yellow-500"/> DANH SÁCH HỢP ĐỒNG
                    </h3>
                    <div className="relative w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                        <input 
                            type="text"
                            placeholder="Tìm kiếm..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-600 rounded-full pl-9 pr-4 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-sm text-left text-slate-300">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-900 font-bold font-mono">
                            <tr>
                                <th className="px-6 py-3 border-b border-slate-700 w-[50px]">STT</th>
                                <th className="px-6 py-3 border-b border-slate-700">Mã NV</th>
                                <th className="px-6 py-3 border-b border-slate-700">Họ Tên</th>
                                <th className="px-6 py-3 border-b border-slate-700">Bộ Phận</th>
                                <th className="px-6 py-3 border-b border-slate-700">Tên File</th>
                                <th className="px-6 py-3 border-b border-slate-700">Ngày Tải</th>
                                <th className="px-6 py-3 border-b border-slate-700">Ghi Chú</th>
                                <th className="px-6 py-3 border-b border-slate-700">Chia sẻ</th>
                                <th className="px-6 py-3 border-b border-slate-700 text-center">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700">
                            {filteredContracts.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="px-6 py-12 text-center text-slate-500 italic">Chưa có hợp đồng nào.</td>
                                </tr>
                            ) : (
                                filteredContracts.map((contract, index) => (
                                    <tr key={contract.id} className="bg-slate-800 hover:bg-slate-700/50 transition-colors">
                                        <td className="px-6 py-3 text-slate-500 text-center">{index + 1}</td>
                                        <td className="px-6 py-3 font-mono font-bold text-blue-400">{contract.employeeId}</td>
                                        <td className="px-6 py-3 font-bold text-white">{contract.employeeName}</td>
                                        <td className="px-6 py-3">
                                            <span className="bg-slate-900 border border-slate-600 px-2 py-0.5 rounded text-xs">{contract.department}</span>
                                        </td>
                                        <td className="px-6 py-3 text-slate-300 truncate max-w-[150px]" title={contract.fileName}>
                                            {contract.fileName}
                                        </td>
                                        <td className="px-6 py-3 text-slate-500 font-mono text-xs">{contract.uploadDate}</td>
                                        <td className="px-6 py-3 text-slate-400 italic text-xs">{contract.note || '-'}</td>
                                        <td className="px-6 py-3">
                                            {contract.sharedWith.length > 0 ? (
                                                <div className="flex -space-x-2">
                                                    {contract.sharedWith.map(id => (
                                                        <div key={id} className="w-6 h-6 rounded-full bg-slate-600 border border-slate-800 flex items-center justify-center text-[8px] font-bold text-white" title={getShareLabel(id)}>
                                                            {getShareInitials(id)}
                                                        </div>
                                                    ))}
                                                    <div className="w-6 h-6 rounded-full bg-slate-700 border border-slate-800 flex items-center justify-center text-[9px] text-slate-400">
                                                        {contract.sharedWith.length}
                                                    </div>
                                                </div>
                                            ) : <span className="text-slate-600 text-xs">--</span>}
                                        </td>
                                        <td className="px-6 py-3 text-center">
                                            <div className="flex justify-center gap-2">
                                                <button onClick={() => handleView(contract)} className="p-1.5 bg-blue-900/30 text-blue-400 hover:bg-blue-600 hover:text-white rounded transition-colors" title="Xem">
                                                    <Eye size={14}/>
                                                </button>
                                                <button onClick={() => handleDownload(contract)} className="p-1.5 bg-green-900/30 text-green-400 hover:bg-green-600 hover:text-white rounded transition-colors" title="Tải về">
                                                    <Download size={14}/>
                                                </button>
                                                <button onClick={() => openShareModal(contract)} className="p-1.5 bg-orange-900/30 text-orange-400 hover:bg-orange-600 hover:text-white rounded transition-colors" title="Chia sẻ">
                                                    <Share2 size={14}/>
                                                </button>
                                                <button onClick={() => handleDelete(contract.id)} className="p-1.5 bg-red-900/30 text-red-400 hover:bg-red-600 hover:text-white rounded transition-colors" title="Xóa">
                                                    <Trash2 size={14}/>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Share Modal */}
            {isShareModalOpen && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-slate-800 rounded-xl shadow-2xl w-full max-w-sm border border-slate-600 animate-in zoom-in-95 flex flex-col max-h-[80vh]">
                        <div className="px-5 py-3 bg-orange-700 text-white flex justify-between items-center rounded-t-xl shrink-0">
                            <h3 className="font-bold flex items-center gap-2"><Share2 size={18}/> CHIA SẺ HỢP ĐỒNG</h3>
                            <button onClick={() => setIsShareModalOpen(false)}><X size={18}/></button>
                        </div>
                        
                        <div className="p-4 flex flex-col flex-1 overflow-hidden">
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

                            <p className="text-xs text-slate-400 mb-2">Chọn đối tượng được phép xem:</p>
                            
                            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 mb-4 bg-slate-900/30 p-2 rounded">
                                {shareMode === 'DEPARTMENT' ? (
                                    DEPARTMENTS_SHARE.map(dept => (
                                        <div 
                                            key={dept.id} 
                                            onClick={() => toggleShareTarget(dept.id)}
                                            className={`flex items-center justify-between p-2 rounded cursor-pointer border transition-all ${
                                                shareSelection.includes(dept.id) 
                                                ? 'bg-orange-900/30 border-orange-500 text-orange-100' 
                                                : 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-700'
                                            }`}
                                        >
                                            <span className="text-sm font-bold">{dept.label}</span>
                                            {shareSelection.includes(dept.id) ? <CheckSquare size={16} className="text-orange-400"/> : <Square size={16}/>}
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

                            <button 
                                onClick={saveShare}
                                className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-2.5 rounded transition-colors shrink-0"
                            >
                                CẬP NHẬT CHIA SẺ
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};
