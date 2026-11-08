
import React, { useState } from 'react';
import { Archive, Search, Plus, Edit, Trash2, X, Save, Box, Layers, Calendar, User, Activity, AlertTriangle, CheckCircle2, RotateCcw } from 'lucide-react';
import { AssetRecord } from '../../types';

interface HRAssetsProps {
    data: AssetRecord[];
    onUpdate: (newData: AssetRecord[]) => void;
}

const DEPARTMENTS = [
    { id: 'MULTI', label: 'Multi Auto' },
    { id: 'STIFF', label: 'Stiff' },
    { id: 'MOLD', label: 'Khuôn & Jig' },
    { id: 'STAMPING', label: 'Dập Tự Động' },
    { id: 'OFFICE', label: 'Khối Văn Phòng' },
    { id: 'DIRECTOR', label: 'Ban Giám Đốc' },
    { id: 'COMMON', label: 'Dùng Chung' },
];

const STATUS_OPTIONS = [
    { value: 'GOOD', label: 'Tốt / Đang dùng', color: 'text-green-400 bg-green-900/30 border-green-700' },
    { value: 'BROKEN', label: 'Hỏng / Cần sửa', color: 'text-red-400 bg-red-900/30 border-red-700' },
    { value: 'MAINTENANCE', label: 'Đang bảo trì', color: 'text-orange-400 bg-orange-900/30 border-orange-700' },
    { value: 'LIQUIDATED', label: 'Đã thanh lý', color: 'text-slate-400 bg-slate-800 border-slate-600' },
    { value: 'LOST', label: 'Mất / Thất lạc', color: 'text-gray-400 bg-gray-800 border-gray-600' },
];

export const HRAssets: React.FC<HRAssetsProps> = ({ data, onUpdate }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);

    const [formData, setFormData] = useState<Partial<AssetRecord>>({
        code: '',
        name: '',
        department: 'OFFICE',
        quantity: 1,
        unit: 'Cái',
        issueDate: new Date().toISOString().split('T')[0],
        status: 'GOOD',
        note: '',
        user: ''
    });

    // --- ACTIONS ---

    const handleAddNew = () => {
        setEditingId(null);
        setFormData({
            code: '',
            name: '',
            department: 'OFFICE',
            quantity: 1,
            unit: 'Cái',
            issueDate: new Date().toISOString().split('T')[0],
            status: 'GOOD',
            note: '',
            user: ''
        });
        setIsModalOpen(true);
    };

    const handleEdit = (record: AssetRecord) => {
        setEditingId(record.id);
        setFormData({ ...record });
        setIsModalOpen(true);
    };

    const handleDelete = (id: number) => {
        if (window.confirm("Bạn có chắc chắn muốn xóa tài sản này? Hành động không thể hoàn tác.")) {
            onUpdate(data.filter(item => item.id !== id));
        }
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.code || !formData.name) {
            alert("Vui lòng nhập Mã tài sản và Tên tài sản.");
            return;
        }

        if (editingId) {
            // Update
            const updatedList = data.map(item => 
                item.id === editingId ? { ...item, ...formData } as AssetRecord : item
            );
            onUpdate(updatedList);
        } else {
            // Check Duplicate Code
            if (data.some(item => item.code === formData.code)) {
                alert("Mã tài sản này đã tồn tại!");
                return;
            }

            // Create
            const newRecord: AssetRecord = {
                id: Date.now(),
                code: formData.code!,
                name: formData.name!,
                department: formData.department || 'OFFICE',
                quantity: Number(formData.quantity) || 1,
                unit: formData.unit || 'Cái',
                issueDate: formData.issueDate || new Date().toISOString().split('T')[0],
                status: (formData.status as any) || 'GOOD',
                note: formData.note || '',
                user: formData.user || ''
            };
            onUpdate([newRecord, ...data]);
        }
        setIsModalOpen(false);
    };

    // --- FILTER ---
    const filteredData = data.filter(item => 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.user && item.user.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const getStatusBadge = (status: string) => {
        const option = STATUS_OPTIONS.find(o => o.value === status) || STATUS_OPTIONS[0];
        return (
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${option.color} whitespace-nowrap`}>
                {option.label}
            </span>
        );
    };

    return (
        <div className="p-6 h-full overflow-y-auto bg-slate-900 flex flex-col gap-6 text-slate-300 font-sans">
            
            {/* Header */}
            <div className="bg-slate-800 px-6 py-4 rounded-xl shadow-lg border border-slate-700 flex flex-col md:flex-row justify-between items-center gap-4 sticky top-0 z-20">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-600 rounded-lg shadow-lg shadow-amber-900/50 text-white">
                        <Archive size={24} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-white uppercase tracking-wider font-mono">QUẢN LÝ TÀI SẢN (HC&NS)</h1>
                        <p className="text-xs text-slate-400">Theo dõi, cấp phát và quản lý tài sản công ty</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                        <input 
                            type="text" 
                            placeholder="Tìm kiếm tài sản..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-600 rounded-lg focus:ring-1 focus:ring-amber-500 focus:outline-none text-sm text-white"
                        />
                    </div>
                    <button 
                        onClick={handleAddNew}
                        className="bg-amber-600 hover:bg-amber-500 text-white font-bold px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 transition-all hover:scale-105 active:scale-95 whitespace-nowrap border border-amber-500"
                    >
                        <Plus size={18}/> Thêm Tài Sản
                    </button>
                </div>
            </div>

            {/* Assets List */}
            <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden shadow-lg flex-1 flex flex-col">
                <div className="overflow-y-auto flex-1 custom-scrollbar">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-400 uppercase bg-slate-900/90 backdrop-blur sticky top-0 z-10 font-bold border-b border-slate-700">
                            <tr>
                                <th className="px-4 py-3 w-[50px] text-center">STT</th>
                                <th className="px-4 py-3">Mã Tài Sản</th>
                                <th className="px-4 py-3">Tên Tài Sản</th>
                                <th className="px-4 py-3">Bộ Phận / Người Dùng</th>
                                <th className="px-4 py-3 text-center">Ngày Cấp</th>
                                <th className="px-4 py-3 text-right">Số Lượng</th>
                                <th className="px-4 py-3 text-center">Tình Trạng</th>
                                <th className="px-4 py-3 text-center">Thao Tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/50">
                            {filteredData.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-12 text-center text-slate-500 italic">
                                        <div className="flex flex-col items-center gap-2">
                                            <Box size={32} className="opacity-20"/>
                                            <span>Chưa có dữ liệu tài sản.</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredData.map((item, index) => (
                                    <tr key={item.id} className="hover:bg-white/5 transition-colors group">
                                        <td className="px-4 py-3 text-center text-slate-600">{index + 1}</td>
                                        <td className="px-4 py-3 font-mono font-bold text-amber-500">{item.code}</td>
                                        <td className="px-4 py-3 font-bold text-white">
                                            {item.name}
                                            {item.note && <div className="text-[10px] text-slate-500 font-normal italic mt-0.5">{item.note}</div>}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-xs bg-slate-700 px-2 py-0.5 rounded border border-slate-600 w-fit">
                                                    {DEPARTMENTS.find(d => d.id === item.department)?.label || item.department}
                                                </span>
                                                {item.user && (
                                                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                                        <User size={10}/> {item.user}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-center text-xs font-mono text-slate-400">
                                            {item.issueDate ? item.issueDate.split('-').reverse().join('/') : '-'}
                                        </td>
                                        <td className="px-4 py-3 text-right font-bold text-white">
                                            {item.quantity} <span className="text-[10px] text-slate-500 font-normal">{item.unit}</span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {getStatusBadge(item.status)}
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
                        <div className="px-6 py-4 bg-amber-700 text-white flex justify-between items-center rounded-t-xl shrink-0">
                            <h2 className="text-lg font-bold flex items-center gap-2 uppercase">
                                {editingId ? <Edit size={20}/> : <Plus size={20}/>}
                                {editingId ? 'Cập Nhật Tài Sản' : 'Thêm Tài Sản Mới'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="hover:bg-white/20 p-1 rounded transition-colors">
                                <X size={20}/>
                            </button>
                        </div>
                        
                        <form onSubmit={handleSave} className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Mã Tài Sản <span className="text-red-500">*</span></label>
                                    <input 
                                        type="text" 
                                        value={formData.code} 
                                        onChange={(e) => setFormData({...formData, code: e.target.value})}
                                        className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-amber-500 focus:outline-none text-white font-mono uppercase"
                                        placeholder="TS-001"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Tên Tài Sản <span className="text-red-500">*</span></label>
                                    <input 
                                        type="text" 
                                        value={formData.name} 
                                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                                        className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-amber-500 focus:outline-none text-white"
                                        placeholder="Laptop Dell, Bàn làm việc..."
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Bộ Phận Sử Dụng</label>
                                    <select 
                                        value={formData.department}
                                        onChange={(e) => setFormData({...formData, department: e.target.value})}
                                        className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-amber-500 focus:outline-none text-white"
                                    >
                                        {DEPARTMENTS.map(d => (
                                            <option key={d.id} value={d.id}>{d.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Người Sử Dụng (Nếu có)</label>
                                    <input 
                                        type="text" 
                                        value={formData.user} 
                                        onChange={(e) => setFormData({...formData, user: e.target.value})}
                                        className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-amber-500 focus:outline-none text-white"
                                        placeholder="Nguyễn Văn A..."
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Số Lượng</label>
                                    <input 
                                        type="number" 
                                        min="1"
                                        value={formData.quantity} 
                                        onChange={(e) => setFormData({...formData, quantity: parseInt(e.target.value) || 0})}
                                        className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-amber-500 focus:outline-none text-white text-center font-bold"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Đơn Vị Tính</label>
                                    <input 
                                        type="text" 
                                        value={formData.unit} 
                                        onChange={(e) => setFormData({...formData, unit: e.target.value})}
                                        className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-amber-500 focus:outline-none text-white text-center"
                                        placeholder="Cái"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Ngày Cấp</label>
                                    <input 
                                        type="date" 
                                        value={formData.issueDate} 
                                        onChange={(e) => setFormData({...formData, issueDate: e.target.value})}
                                        className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-amber-500 focus:outline-none text-white [color-scheme:dark]"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Tình Trạng</label>
                                <select 
                                    value={formData.status}
                                    onChange={(e) => setFormData({...formData, status: e.target.value as any})}
                                    className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-amber-500 focus:outline-none text-white font-bold"
                                >
                                    {STATUS_OPTIONS.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Ghi Chú</label>
                                <textarea 
                                    value={formData.note}
                                    onChange={(e) => setFormData({...formData, note: e.target.value})}
                                    className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-amber-500 focus:outline-none resize-none h-20 text-white"
                                    placeholder="Thông tin thêm..."
                                />
                            </div>

                            <div className="pt-4 flex gap-3 border-t border-slate-700 mt-2">
                                <button 
                                    type="submit" 
                                    className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-bold py-2.5 rounded-lg shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 uppercase"
                                >
                                    <Save size={18} /> {editingId ? 'Cập Nhật' : 'Lưu Tài Sản'}
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
