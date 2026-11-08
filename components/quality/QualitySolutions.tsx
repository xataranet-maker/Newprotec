
import React, { useState, useRef } from 'react';
import { ShieldCheck, Search, Plus, AlertCircle, CheckCircle2, Clock, Upload, X, Save, FileText, Layers, Download } from 'lucide-react';
import { QualitySolution } from '../../types';

interface QualitySolutionsProps {
    solutions: QualitySolution[];
    setSolutions: (data: QualitySolution[]) => void;
}

const DEPARTMENTS = [
    { id: 'MULTI', label: 'Multi Auto' },
    { id: 'STIFF', label: 'Stiff' },
    { id: 'MOLD', label: 'Khuôn & Jig' },
    { id: 'STAMPING', label: 'Dập Tự Động' },
];

export const QualitySolutions: React.FC<QualitySolutionsProps> = ({ solutions, setSolutions }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [formData, setFormData] = useState<{
        date: string;
        problem: string;
        rootCause: string;
        countermeasure: string;
        inCharge: string;
        model: string;
        lotNo: string;
        status: 'OPEN' | 'CLOSED' | 'MONITORING';
        department: string;
        fileName: string;
        fileUrl: string;
    }>({
        date: new Date().toISOString().split('T')[0],
        problem: '',
        rootCause: '',
        countermeasure: '',
        inCharge: '',
        model: '',
        lotNo: '',
        status: 'OPEN',
        department: 'MULTI',
        fileName: '',
        fileUrl: ''
    });

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
        if (!formData.problem || !formData.model) {
            alert("Vui lòng nhập đầy đủ thông tin.");
            return;
        }

        const newSolution: QualitySolution = {
            id: Date.now(),
            date: formData.date,
            problem: formData.problem,
            rootCause: formData.rootCause,
            countermeasure: formData.countermeasure,
            inCharge: formData.inCharge,
            status: formData.status,
            model: formData.model,
            lotNo: formData.lotNo,
            department: formData.department,
            fileName: formData.fileName,
            fileUrl: formData.fileUrl
        };

        setSolutions([newSolution, ...solutions]);
        setIsModalOpen(false);
        setFormData({
            date: new Date().toISOString().split('T')[0],
            problem: '',
            rootCause: '',
            countermeasure: '',
            inCharge: '',
            model: '',
            lotNo: '',
            status: 'OPEN',
            department: 'MULTI',
            fileName: '',
            fileUrl: ''
        });
    };

    const getStatusBadge = (status: string) => {
        switch(status) {
            case 'CLOSED': return <span className="bg-green-900/30 text-green-400 px-2 py-1 rounded text-xs font-bold border border-green-700 flex items-center gap-1 w-fit"><CheckCircle2 size={12}/> CLOSED</span>;
            case 'MONITORING': return <span className="bg-orange-900/30 text-orange-400 px-2 py-1 rounded text-xs font-bold border border-orange-700 flex items-center gap-1 w-fit"><Clock size={12}/> MONITORING</span>;
            default: return <span className="bg-red-900/30 text-red-400 px-2 py-1 rounded text-xs font-bold border border-red-700 flex items-center gap-1 w-fit"><AlertCircle size={12}/> OPEN</span>;
        }
    };

    const getDeptColor = (deptId?: string) => {
        switch(deptId) {
            case 'MULTI': return 'text-blue-400 border-blue-800 bg-blue-900/20';
            case 'STIFF': return 'text-green-400 border-green-800 bg-green-900/20';
            case 'MOLD': return 'text-orange-400 border-orange-800 bg-orange-900/20';
            case 'STAMPING': return 'text-purple-400 border-purple-800 bg-purple-900/20';
            default: return 'text-slate-400 border-slate-700 bg-slate-800';
        }
    };

    const filteredSolutions = solutions.filter(sol => 
        sol.problem.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sol.model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sol.lotNo?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-6 h-full overflow-y-auto bg-slate-900 flex flex-col gap-6 text-slate-300 font-sans">
            {/* Header */}
            <div className="bg-slate-800 px-6 py-4 rounded-xl shadow-lg border border-slate-700 flex items-center gap-3 sticky top-0 z-20">
                <div className="p-2 bg-red-600 rounded-lg shadow-lg shadow-red-900/50 text-white">
                    <ShieldCheck size={24} />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-white uppercase tracking-wider font-mono">ĐỐI SÁCH CHẤT LƯỢNG (CAR/PAR)</h1>
                    <p className="text-xs text-slate-400">Theo dõi vấn đề, nguyên nhân và biện pháp khắc phục</p>
                </div>
            </div>

            {/* Toolbar */}
             <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 flex justify-between items-center">
                 <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                    <input 
                        type="text" 
                        placeholder="Tìm kiếm vấn đề, model, lot..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-600 rounded pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-red-500 text-white"
                    />
                 </div>
                 <button 
                    onClick={() => setIsModalOpen(true)}
                    className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded flex items-center gap-2 text-sm font-bold transition-colors"
                 >
                     <Plus size={16}/> Thêm Đối Sách
                 </button>
            </div>

            {/* List */}
            <div className="space-y-4">
                {filteredSolutions.map(sol => (
                    <div key={sol.id} className="bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-md hover:border-slate-500 transition-all">
                        <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-3 flex-1">
                                <span className="text-xs font-mono text-slate-500 bg-slate-900 px-2 py-1 rounded border border-slate-700 whitespace-nowrap">{sol.date}</span>
                                <h3 className="font-bold text-white text-lg">{sol.problem}</h3>
                                {sol.department && (
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getDeptColor(sol.department)}`}>
                                        {DEPARTMENTS.find(d => d.id === sol.department)?.label}
                                    </span>
                                )}
                            </div>
                            {getStatusBadge(sol.status)}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-4">
                            <div className="bg-slate-900/50 p-3 rounded border border-slate-700">
                                <span className="text-xs font-bold text-red-400 uppercase block mb-1">Nguyên nhân gốc rễ</span>
                                <p className="text-slate-300">{sol.rootCause}</p>
                            </div>
                            <div className="bg-slate-900/50 p-3 rounded border border-slate-700">
                                <span className="text-xs font-bold text-green-400 uppercase block mb-1">Biện pháp đối sách</span>
                                <p className="text-slate-300">{sol.countermeasure}</p>
                            </div>
                        </div>

                        <div className="flex justify-between items-center text-xs text-slate-500 border-t border-slate-700 pt-3">
                            <div className="flex gap-4 items-center">
                                <span>Model: <b className="text-white">{sol.model || '--'}</b></span>
                                <div className="flex items-center gap-2">
                                    <span>Lot: <b className="text-yellow-500">{sol.lotNo || '--'}</b></span>
                                    {sol.fileName && (
                                        <button 
                                            className="text-blue-400 hover:text-blue-300 p-1 hover:bg-blue-900/20 rounded transition-colors"
                                            title={`Tải xuống: ${sol.fileName}`}
                                            onClick={() => {
                                                const link = document.createElement('a');
                                                link.href = sol.fileUrl || '#';
                                                link.download = sol.fileName || 'file';
                                                link.click();
                                            }}
                                        >
                                            <Download size={14}/>
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div>PIC: <b className="text-white">{sol.inCharge}</b></div>
                        </div>
                    </div>
                ))}
                {filteredSolutions.length === 0 && (
                    <div className="p-8 text-center text-slate-500 italic border border-dashed border-slate-700 rounded-xl">
                        Không có đối sách nào.
                    </div>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl border border-slate-600 flex flex-col max-h-[90vh]">
                        <div className="px-6 py-4 bg-red-700 text-white flex justify-between items-center rounded-t-xl shrink-0">
                            <h2 className="text-lg font-bold flex items-center gap-2 uppercase">
                                <Plus size={20}/> Thêm Đối Sách Mới
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="hover:bg-white/20 p-1 rounded transition-colors">
                                <X size={20}/>
                            </button>
                        </div>
                        
                        <form onSubmit={handleSave} className="p-6 space-y-4 overflow-y-auto">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Ngày Phát Sinh</label>
                                    <input 
                                        type="date" 
                                        value={formData.date}
                                        onChange={(e) => setFormData({...formData, date: e.target.value})}
                                        className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500 [color-scheme:dark]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Phòng Ban</label>
                                    <select
                                        value={formData.department}
                                        onChange={(e) => setFormData({...formData, department: e.target.value})}
                                        className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500"
                                    >
                                        {DEPARTMENTS.map(d => (
                                            <option key={d.id} value={d.id}>{d.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Model <span className="text-red-500">*</span></label>
                                    <input 
                                        type="text" 
                                        value={formData.model}
                                        onChange={(e) => setFormData({...formData, model: e.target.value})}
                                        className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500 font-bold"
                                        placeholder="M-..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Lot No</label>
                                    <input 
                                        type="text" 
                                        value={formData.lotNo}
                                        onChange={(e) => setFormData({...formData, lotNo: e.target.value})}
                                        className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500 font-mono"
                                        placeholder="LOT-..."
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Vấn Đề / Lỗi <span className="text-red-500">*</span></label>
                                <input 
                                    type="text" 
                                    value={formData.problem}
                                    onChange={(e) => setFormData({...formData, problem: e.target.value})}
                                    className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500"
                                    placeholder="Mô tả ngắn gọn vấn đề..."
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Nguyên Nhân Gốc</label>
                                    <textarea 
                                        value={formData.rootCause}
                                        onChange={(e) => setFormData({...formData, rootCause: e.target.value})}
                                        className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500 resize-none h-24"
                                        placeholder="Phân tích nguyên nhân..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Biện Pháp Đối Sách</label>
                                    <textarea 
                                        value={formData.countermeasure}
                                        onChange={(e) => setFormData({...formData, countermeasure: e.target.value})}
                                        className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500 resize-none h-24"
                                        placeholder="Hành động khắc phục..."
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Người Phụ Trách (PIC)</label>
                                    <input 
                                        type="text" 
                                        value={formData.inCharge}
                                        onChange={(e) => setFormData({...formData, inCharge: e.target.value})}
                                        className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500"
                                        placeholder="Tên PIC..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Trạng Thái</label>
                                    <select
                                        value={formData.status}
                                        onChange={(e) => setFormData({...formData, status: e.target.value as any})}
                                        className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500"
                                    >
                                        <option value="OPEN">OPEN (Đang xử lý)</option>
                                        <option value="MONITORING">MONITORING (Theo dõi)</option>
                                        <option value="CLOSED">CLOSED (Đã đóng)</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">File Đính Kèm</label>
                                <div className="relative">
                                    <input 
                                        type="file" 
                                        ref={fileInputRef}
                                        onChange={handleFileChange}
                                        className="hidden"
                                        id="solution-file-upload"
                                    />
                                    <label 
                                        htmlFor="solution-file-upload"
                                        className="w-full flex items-center justify-center gap-2 bg-slate-900 border border-dashed border-slate-500 rounded-lg p-3 text-slate-400 hover:bg-slate-700 cursor-pointer transition-colors text-sm"
                                    >
                                        <Upload size={16} />
                                        {formData.fileName ? <span className="text-blue-400 font-bold">{formData.fileName}</span> : "Chọn file báo cáo..."}
                                    </label>
                                </div>
                            </div>

                            <div className="pt-4 flex gap-3 border-t border-slate-700 mt-2">
                                <button type="submit" className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-2.5 rounded-lg shadow-lg flex items-center justify-center gap-2 transition-all">
                                    <Save size={18}/> Lưu Đối Sách
                                </button>
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 bg-slate-700 hover:bg-slate-600 text-slate-300 font-bold py-2.5 rounded-lg transition-colors border border-slate-600">
                                    Hủy
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
