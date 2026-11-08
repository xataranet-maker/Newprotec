
import React, { useState, useRef } from 'react';
import { ScrollText, Search, Plus, Edit, Trash2, X, Save, Upload, FileText, Building2, Hash, BookOpen, Layers } from 'lucide-react';
import { DocumentRecord } from '../../types';

interface HRDocumentsProps {
    data: DocumentRecord[];
    onUpdate: (newData: DocumentRecord[]) => void;
}

const DEPARTMENTS = [
    { id: 'MULTI', label: 'Multi Auto' },
    { id: 'STIFF', label: 'Stiff' },
    { id: 'MOLD', label: 'Khuôn & Jig' },
    { id: 'STAMPING', label: 'Dập Tự Động' },
    { id: 'OFFICE', label: 'Khối Văn Phòng' },
    { id: 'HR', label: 'HC & NS' },
    { id: 'DIRECTOR', label: 'Ban Giám Đốc' },
];

export const HRDocuments: React.FC<HRDocumentsProps> = ({ data, onUpdate }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [formData, setFormData] = useState<Partial<DocumentRecord>>({
        documentNumber: '',
        title: '',
        issuingAuthority: '',
        pageCount: 1,
        department: 'HR',
        date: new Date().toISOString().split('T')[0],
        fileName: '',
        fileUrl: ''
    });

    // --- ACTIONS ---

    const handleAddNew = () => {
        setEditingId(null);
        setFormData({
            documentNumber: '',
            title: '',
            issuingAuthority: '',
            pageCount: 1,
            department: 'HR',
            date: new Date().toISOString().split('T')[0],
            fileName: '',
            fileUrl: ''
        });
        setIsModalOpen(true);
    };

    const handleEdit = (record: DocumentRecord) => {
        setEditingId(record.id);
        setFormData({ ...record });
        setIsModalOpen(true);
    };

    const handleDelete = (id: number) => {
        if (window.confirm("Bạn có chắc chắn muốn xóa công văn này?")) {
            onUpdate(data.filter(item => item.id !== id));
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setFormData({
                ...formData,
                fileName: file.name,
                fileUrl: URL.createObjectURL(file) // Simulate upload
            });
        }
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.documentNumber || !formData.title) {
            alert("Vui lòng nhập Số công văn và Tên công văn.");
            return;
        }

        if (editingId) {
            // Update
            const updatedList = data.map(item => 
                item.id === editingId ? { ...item, ...formData } as DocumentRecord : item
            );
            onUpdate(updatedList);
        } else {
            // Create
            const newRecord: DocumentRecord = {
                id: Date.now(),
                documentNumber: formData.documentNumber!,
                title: formData.title!,
                issuingAuthority: formData.issuingAuthority || '',
                pageCount: Number(formData.pageCount) || 1,
                department: formData.department || 'HR',
                date: formData.date || new Date().toISOString().split('T')[0],
                fileName: formData.fileName,
                fileUrl: formData.fileUrl
            };
            onUpdate([newRecord, ...data]);
        }
        setIsModalOpen(false);
    };

    const filteredData = data.filter(item => 
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.documentNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.issuingAuthority.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-6 h-full overflow-y-auto bg-slate-900 flex flex-col gap-6 text-slate-300 font-sans">
            
            {/* Header */}
            <div className="bg-slate-800 px-6 py-4 rounded-xl shadow-lg border border-slate-700 flex flex-col md:flex-row justify-between items-center gap-4 sticky top-0 z-20">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-teal-600 rounded-lg shadow-lg shadow-teal-900/50 text-white">
                        <ScrollText size={24} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-white uppercase tracking-wider font-mono">QUẢN LÝ CÔNG VĂN</h1>
                        <p className="text-xs text-slate-400">Lưu trữ công văn, quyết định từ các Sở/Bộ ban ngành</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                        <input 
                            type="text" 
                            placeholder="Tìm kiếm số CV, tên, nơi ban hành..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-600 rounded-lg focus:ring-1 focus:ring-teal-500 focus:outline-none text-sm text-white"
                        />
                    </div>
                    <button 
                        onClick={handleAddNew}
                        className="bg-teal-600 hover:bg-teal-500 text-white font-bold px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 transition-all hover:scale-105 active:scale-95 whitespace-nowrap border border-teal-500"
                    >
                        <Plus size={18}/> Nhập Công Văn
                    </button>
                </div>
            </div>

            {/* Document List */}
            <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden shadow-lg flex-1 flex flex-col">
                <div className="overflow-y-auto flex-1 custom-scrollbar">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-400 uppercase bg-slate-900/90 backdrop-blur sticky top-0 z-10 font-bold border-b border-slate-700">
                            <tr>
                                <th className="px-4 py-3 w-[50px] text-center">STT</th>
                                <th className="px-4 py-3">Số Công Văn</th>
                                <th className="px-4 py-3">Tên Công Văn / Trích Yếu</th>
                                <th className="px-4 py-3">Nơi Ban Hành (Sở/Bộ)</th>
                                <th className="px-4 py-3 text-center">Số Trang</th>
                                <th className="px-4 py-3">Lưu (Phòng Ban)</th>
                                <th className="px-4 py-3">File Đính Kèm</th>
                                <th className="px-4 py-3 text-center">Ngày Lưu</th>
                                <th className="px-4 py-3 text-center">Thao Tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/50">
                            {filteredData.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="px-6 py-12 text-center text-slate-500 italic">
                                        <div className="flex flex-col items-center gap-2">
                                            <ScrollText size={32} className="opacity-20"/>
                                            <span>Chưa có dữ liệu công văn.</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredData.map((item, index) => (
                                    <tr key={item.id} className="hover:bg-white/5 transition-colors group">
                                        <td className="px-4 py-3 text-center text-slate-600">{index + 1}</td>
                                        <td className="px-4 py-3 font-mono font-bold text-teal-400">{item.documentNumber}</td>
                                        <td className="px-4 py-3 font-medium text-white max-w-[250px] truncate" title={item.title}>
                                            {item.title}
                                        </td>
                                        <td className="px-4 py-3 text-slate-300">
                                            {item.issuingAuthority}
                                        </td>
                                        <td className="px-4 py-3 text-center font-mono">
                                            {item.pageCount}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="text-xs bg-slate-700 px-2 py-0.5 rounded border border-slate-600 w-fit whitespace-nowrap">
                                                {DEPARTMENTS.find(d => d.id === item.department)?.label || item.department}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            {item.fileName ? (
                                                <a href={item.fileUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-blue-400 hover:underline text-xs">
                                                    <FileText size={12}/> {item.fileName}
                                                </a>
                                            ) : (
                                                <span className="text-slate-600 italic text-xs">Không có file</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-center text-xs font-mono text-slate-400">
                                            {item.date ? item.date.split('-').reverse().join('/') : '-'}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button 
                                                    onClick={() => handleEdit(item)}
                                                    className="p-1.5 text-blue-400 hover:bg-blue-900/30 rounded transition-colors"
                                                    title="Sửa"
                                                >
                                                    <Edit size={16}/>
                                                </button>
                                                <button 
                                                    onClick={() => handleDelete(item.id)}
                                                    className="p-1.5 text-red-400 hover:bg-red-900/30 rounded transition-colors"
                                                    title="Xóa"
                                                >
                                                    <Trash2 size={16}/>
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

            {/* ADD/EDIT MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg border border-slate-600 flex flex-col max-h-[90vh]">
                        <div className="px-6 py-4 bg-teal-700 text-white flex justify-between items-center rounded-t-xl shrink-0">
                            <h2 className="text-lg font-bold flex items-center gap-2 uppercase">
                                {editingId ? <Edit size={20}/> : <Plus size={20}/>}
                                {editingId ? 'Cập Nhật Công Văn' : 'Nhập Công Văn Mới'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="hover:bg-white/20 p-1 rounded transition-colors">
                                <X size={20}/>
                            </button>
                        </div>
                        
                        <form onSubmit={handleSave} className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Số Công Văn <span className="text-red-500">*</span></label>
                                    <div className="relative">
                                        <input 
                                            type="text" 
                                            value={formData.documentNumber} 
                                            onChange={(e) => setFormData({...formData, documentNumber: e.target.value})}
                                            className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 pl-8 text-sm focus:ring-1 focus:ring-teal-500 focus:outline-none text-white font-mono uppercase"
                                            placeholder="123/QD-UBND"
                                            required
                                        />
                                        <Hash size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500"/>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Ngày Lưu</label>
                                    <input 
                                        type="date" 
                                        value={formData.date} 
                                        onChange={(e) => setFormData({...formData, date: e.target.value})}
                                        className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-teal-500 focus:outline-none text-white [color-scheme:dark]"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Tên Công Văn / Trích Yếu <span className="text-red-500">*</span></label>
                                <input 
                                    type="text" 
                                    value={formData.title} 
                                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                                    className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-teal-500 focus:outline-none text-white font-bold"
                                    placeholder="Về việc thực hiện..."
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Sở / Bộ Ban Ngành</label>
                                    <div className="relative">
                                        <input 
                                            type="text"
                                            value={formData.issuingAuthority}
                                            onChange={(e) => setFormData({...formData, issuingAuthority: e.target.value})}
                                            className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 pl-8 text-sm focus:ring-1 focus:ring-teal-500 focus:outline-none text-white"
                                            placeholder="Sở Lao Động..."
                                        />
                                        <Building2 size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500"/>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Số Lượng Trang</label>
                                    <div className="relative">
                                        <input 
                                            type="number"
                                            min="1"
                                            value={formData.pageCount}
                                            onChange={(e) => setFormData({...formData, pageCount: parseInt(e.target.value) || 1})}
                                            className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 pl-8 text-sm focus:ring-1 focus:ring-teal-500 focus:outline-none text-white font-mono"
                                        />
                                        <BookOpen size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500"/>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Lưu Phòng Ban</label>
                                <div className="relative">
                                    <select 
                                        value={formData.department}
                                        onChange={(e) => setFormData({...formData, department: e.target.value})}
                                        className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 pl-8 text-sm focus:ring-1 focus:ring-teal-500 focus:outline-none text-white"
                                    >
                                        {DEPARTMENTS.map(d => (
                                            <option key={d.id} value={d.id}>{d.label}</option>
                                        ))}
                                    </select>
                                    <Layers size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500"/>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">File Đính Kèm (PDF, Ảnh...)</label>
                                <div className="relative">
                                    <input 
                                        type="file" 
                                        ref={fileInputRef}
                                        onChange={handleFileChange}
                                        className="hidden"
                                        id="doc-file-upload"
                                    />
                                    <label 
                                        htmlFor="doc-file-upload"
                                        className="w-full flex items-center justify-center gap-2 bg-slate-900 border border-dashed border-slate-500 rounded-lg p-3 text-slate-400 hover:bg-slate-700 cursor-pointer transition-colors text-sm"
                                    >
                                        <Upload size={16} />
                                        {formData.fileName ? <span className="text-teal-400 font-bold truncate max-w-[250px]">{formData.fileName}</span> : "Chọn file văn bản..."}
                                    </label>
                                </div>
                            </div>

                            <div className="pt-4 flex gap-3 border-t border-slate-700 mt-2">
                                <button 
                                    type="submit" 
                                    className="flex-1 bg-teal-600 hover:bg-teal-500 text-white font-bold py-2.5 rounded-lg shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 uppercase"
                                >
                                    <Save size={18} /> {editingId ? 'Cập Nhật' : 'Lưu Văn Bản'}
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
};
