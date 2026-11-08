
import React, { useMemo, useState } from 'react';
import { Package, Search, Box, Layers, Archive, Calendar, Hash, ArrowRightLeft, LogOut, X, CheckSquare, Building2, Ticket } from 'lucide-react';
import { WarehouseItem } from '../../types';

interface WarehouseInventoryProps {
    items: WarehouseItem[];
    onExport: (data: any) => void;
    defaultDepartment?: string; // New prop to restrict view by department
}

// Map warehouses to Department Colors matches the App Theme
// UPDATED: Using keys with underscores to match Data Net format
const WH_COLOR_MAP: Record<string, string> = {
    'Kho Multi': 'blue',
    'Kho Chung': 'slate',
    'SUS_AUTO': 'green',
    'SUS_SEMI': 'green',
    'TAPE_AUTO': 'green',
    'TAPE_JIG': 'green',
    'Kho Khuôn': 'orange',
    'Kho Jig': 'orange',
    'Kho Dập': 'purple',
};

const DEPARTMENTS = [
    { id: 'MULTI', label: 'Multi Auto' },
    { id: 'STIFF', label: 'Stiff' },
    { id: 'MOLD', label: 'Khuôn & Jig' },
    { id: 'STAMPING', label: 'Dập Tự Động' },
];

// UPDATED: Using underscores to match Data Net
const DEPT_WAREHOUSES: Record<string, string[]> = {
    'MULTI': ['Kho Multi', 'Kho Chung'],
    'STIFF': ['SUS_AUTO', 'SUS_SEMI', 'TAPE_AUTO', 'TAPE_JIG'],
    'MOLD': ['Kho Khuôn', 'Kho Jig'],
    'STAMPING': ['Kho Dập'],
};

// Visual Themes corresponding to colors
const THEMES: Record<string, { bg: string, border: string, text: string, shadow: string, iconBg: string }> = {
    blue: { 
        bg: 'bg-blue-900/20', 
        border: 'border-blue-500', 
        text: 'text-blue-400', 
        shadow: 'shadow-[0_0_15px_rgba(59,130,246,0.2)]',
        iconBg: 'bg-blue-600'
    },
    green: { 
        bg: 'bg-green-900/20', 
        border: 'border-green-500', 
        text: 'text-green-400', 
        shadow: 'shadow-[0_0_15px_rgba(34,197,94,0.2)]',
        iconBg: 'bg-green-600'
    },
    orange: { 
        bg: 'bg-orange-900/20', 
        border: 'border-orange-500', 
        text: 'text-orange-400', 
        shadow: 'shadow-[0_0_15px_rgba(249,115,22,0.2)]',
        iconBg: 'bg-orange-600'
    },
    purple: { 
        bg: 'bg-purple-900/20', 
        border: 'border-purple-500', 
        text: 'text-purple-400', 
        shadow: 'shadow-[0_0_15px_rgba(168,85,247,0.2)]',
        iconBg: 'bg-purple-600'
    },
    slate: { 
        bg: 'bg-slate-800', 
        border: 'border-slate-600', 
        text: 'text-slate-400', 
        shadow: 'shadow-none',
        iconBg: 'bg-slate-600'
    }
};

export const WarehouseInventory: React.FC<WarehouseInventoryProps> = ({ items, onExport, defaultDepartment }) => {
    const [selectedWh, setSelectedWh] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Export Modal State
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [exportForm, setExportForm] = useState({
        type: 'FINISHED_GOODS' as 'FINISHED_GOODS' | 'MATERIAL',
        targetDept: 'MULTI',
        warehouse: '',
        model: '',
        code: '',
        lotNo: '',
        quantity: 0
    });

    // --- DATA PROCESSING FOR EXPORT FORM ---
    // 1. Get List of Warehouses that actually have items
    const availableWarehouses = useMemo(() => {
        let whs: string[] = Array.from(new Set(items.map(i => i.warehouseName))).filter((w): w is string => !!w).sort();
        
        // If a default department is provided (strict mode), filter warehouses
        if (defaultDepartment && DEPT_WAREHOUSES[defaultDepartment]) {
            const allowed = DEPT_WAREHOUSES[defaultDepartment];
            whs = whs.filter(w => allowed.includes(w));
        }
        
        return whs;
    }, [items, defaultDepartment]);

    // 2. Get Models based on selected Warehouse
    const availableModels = useMemo(() => {
        if (!exportForm.warehouse) return [];
        return Array.from(new Set(
            items
                .filter(i => i.warehouseName === exportForm.warehouse && i.category === exportForm.type)
                .map(i => i.model)
        )).sort();
    }, [items, exportForm.warehouse, exportForm.type]);

    // 3. Get Codes based on Model
    const availableCodes = useMemo(() => {
        if (!exportForm.model) return [];
        return Array.from(new Set(
            items
                .filter(i => i.warehouseName === exportForm.warehouse && i.model === exportForm.model)
                .map(i => i.code)
        )).sort();
    }, [items, exportForm.warehouse, exportForm.model]);

    // 4. Get Lots based on Code
    const availableLots = useMemo(() => {
        if (!exportForm.code) return [];
        return items
            .filter(i => i.warehouseName === exportForm.warehouse && i.model === exportForm.model && i.code === exportForm.code)
            .map(i => ({ lotNo: i.lotNo, quantity: i.quantity, stage: i.stage, id: i.id })); // Keep ID to find exact item
    }, [items, exportForm.warehouse, exportForm.model, exportForm.code]);

    // Current selected item details (for max quantity check)
    const selectedItemDetail = useMemo(() => {
        if (!exportForm.lotNo) return null;
        return availableLots.find(l => l.lotNo === exportForm.lotNo);
    }, [availableLots, exportForm.lotNo]);


    // --- HANDLERS ---

    const handleExportClick = () => {
        // Default warehouse logic
        let defaultWh = selectedWh || '';
        
        if (!defaultWh && defaultDepartment && DEPT_WAREHOUSES[defaultDepartment]) {
            defaultWh = DEPT_WAREHOUSES[defaultDepartment][0] || '';
        }

        setExportForm({
            type: 'FINISHED_GOODS',
            targetDept: 'MULTI',
            warehouse: defaultWh,
            model: '',
            code: '',
            lotNo: '',
            quantity: 0
        });
        setIsExportModalOpen(true);
    };

    const handleFormChange = (field: string, value: any) => {
        setExportForm(prev => {
            const updates: any = { [field]: value };
            // Cascade resets
            if (field === 'type' || field === 'warehouse') {
                updates.model = ''; updates.code = ''; updates.lotNo = ''; updates.quantity = 0;
            }
            if (field === 'model') {
                updates.code = ''; updates.lotNo = ''; updates.quantity = 0;
            }
            if (field === 'code') {
                updates.lotNo = ''; updates.quantity = 0;
            }
            return { ...prev, ...updates };
        });
    };

    const handleSubmitExport = (e: React.FormEvent) => {
        e.preventDefault();

        // 1. Find the item in inventory
        const originalItem = items.find(i => 
            i.warehouseName === exportForm.warehouse && 
            i.model === exportForm.model && 
            i.code === exportForm.code && 
            i.lotNo === exportForm.lotNo
        );

        if (!originalItem) {
            alert("Không tìm thấy dữ liệu hàng tồn kho.");
            return;
        }

        const exportQty = Number(exportForm.quantity);

        // 2. Validate inputs
        if (!exportForm.lotNo || exportQty <= 0) {
            alert("Vui lòng chọn Lot và nhập số lượng hợp lệ (lớn hơn 0).");
            return;
        }
        
        // 3. STRICT CHECK: Export Quantity <= Current Stock
        if (exportQty > originalItem.quantity) {
            alert(`Số lượng xuất (${exportQty}) không được lớn hơn tồn kho hiện tại (${originalItem.quantity}).`);
            return;
        }

        // Prepare transfer data
        const transferData = {
            ...originalItem,
            department: exportForm.targetDept, // New owner
            quantity: exportQty,
            // We keep the rest of the metadata
        };

        onExport(transferData);
        setIsExportModalOpen(false);
    };


    // --- AGGREGATE DATA FOR CARDS (EXISTING) ---
    const warehouseStats = useMemo(() => {
        const stats = new Map<string, { count: number, totalQty: number, itemsCount: number }>();
        Object.keys(WH_COLOR_MAP).forEach((wh: string) => {
             stats.set(wh, { count: 0, totalQty: 0, itemsCount: 0 });
        });
        items.forEach(item => {
            const whName = item.warehouseName || 'Kho Chung';
            if (!stats.has(whName)) {
                stats.set(whName, { count: 0, totalQty: 0, itemsCount: 0 });
            }
            const entry = stats.get(whName)!;
            entry.itemsCount += 1; 
            entry.totalQty += item.quantity;
        });
        return Array.from(stats.entries()).map(([name, data]) => ({ name, ...data }));
    }, [items]);

    const displayItems = useMemo(() => {
        return items.filter(item => {
            const matchesWh = selectedWh ? item.warehouseName === selectedWh : true;
            const matchesSearch = 
                item.model.toLowerCase().includes(searchTerm.toLowerCase()) || 
                item.lotNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.code.toLowerCase().includes(searchTerm.toLowerCase());
            
            // Filter by defaultDepartment if provided
            let matchesDept = true;
            if (defaultDepartment && DEPT_WAREHOUSES[defaultDepartment]) {
                 matchesDept = DEPT_WAREHOUSES[defaultDepartment].includes(item.warehouseName);
            }

            return matchesWh && matchesSearch && matchesDept;
        });
    }, [items, selectedWh, searchTerm, defaultDepartment]);

    return (
        <div className="flex flex-col h-full bg-slate-900 text-slate-300 p-6 font-sans overflow-hidden">
            
            {/* Header */}
            <div className="mb-6 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-indigo-600 rounded-lg shadow-lg shadow-indigo-900/50 text-white">
                        <Box size={24} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-white uppercase tracking-wider font-mono">QUẢN LÝ TỒN KHO</h1>
                        <p className="text-xs text-slate-400">Theo dõi tồn kho chi tiết theo từng công đoạn & vị trí</p>
                    </div>
                </div>
            </div>

            {/* Warehouse Cards Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 mb-6 shrink-0">
                {/* Total Card */}
                {!defaultDepartment && (
                    <div 
                        onClick={() => setSelectedWh(null)}
                        className={`
                            relative rounded-lg p-3 border-2 cursor-pointer transition-all duration-300 group flex items-center justify-between
                            ${selectedWh === null 
                                ? 'bg-slate-800 border-white/50 shadow-lg shadow-white/10 scale-105 z-10' 
                                : 'bg-slate-900/50 border-slate-700 hover:border-slate-500 hover:-translate-y-0.5'}
                        `}
                    >
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${selectedWh === null ? 'bg-slate-700 text-white' : 'bg-slate-800 text-slate-500'}`}>
                                <Archive size={18} />
                            </div>
                            <div className="flex flex-col">
                                <h3 className={`font-bold uppercase text-[10px] ${selectedWh === null ? 'text-white' : 'text-slate-400'}`}>TỔNG KHO</h3>
                                <span className="text-[9px] text-slate-500">{items.length} mã</span>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className="text-base font-bold text-white block leading-none">{items.reduce((s,i) => s + i.quantity, 0).toLocaleString()}</span>
                        </div>
                    </div>
                )}

                {/* Specific Warehouse Cards */}
                {warehouseStats.map(wh => {
                    const colorKey = WH_COLOR_MAP[wh.name] || 'slate';
                    const theme = THEMES[colorKey];
                    const isActive = selectedWh === wh.name;

                    // Filter cards based on defaultDepartment if set
                    if (defaultDepartment && DEPT_WAREHOUSES[defaultDepartment] && !DEPT_WAREHOUSES[defaultDepartment].includes(wh.name)) {
                        return null;
                    }

                    if (wh.name === 'Kho Mạ') return null;

                    return (
                        <div 
                            key={wh.name}
                            onClick={() => setSelectedWh(isActive ? null : wh.name)}
                            className={`
                                relative rounded-lg p-3 border-2 cursor-pointer transition-all duration-300 group flex items-center justify-between
                                ${theme.bg} ${isActive ? theme.border : 'border-transparent hover:' + theme.border}
                                ${isActive ? `scale-105 z-10 ${theme.shadow}` : 'hover:-translate-y-0.5'}
                            `}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${theme.iconBg} text-white shadow-sm`}>
                                     <Layers size={18} />
                                </div>
                                <div className="flex flex-col min-w-0">
                                   {/* Pretty print warehouse name (replace underscores) */}
                                   <h3 className={`font-bold uppercase text-[10px] ${theme.text} truncate pr-1 tracking-wider`}>
                                       {wh.name.replace(/_/g, ' ')}
                                   </h3>
                                   <span className="text-[9px] text-slate-400">{wh.itemsCount} mã hàng</span>
                                </div>
                            </div>

                            <div className="text-right pl-2">
                                <span className="text-base font-bold text-white block leading-none">{wh.totalQty.toLocaleString()}</span>
                            </div>
                            
                            {/* Active Indicator Line */}
                            {isActive && (
                                <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${theme.text.replace('text', 'bg')}`}></div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Detail List */}
            <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden shadow-lg flex-1 flex flex-col min-h-0">
                 {/* Toolbar */}
                 <div className="p-4 border-b border-slate-700 flex flex-col md:flex-row justify-between items-center bg-slate-900/50 gap-4">
                    <h3 className="font-bold text-white flex items-center gap-2 text-sm uppercase">
                        <Package size={16} className={selectedWh ? THEMES[WH_COLOR_MAP[selectedWh] || 'slate'].text : 'text-white'}/> 
                        DANH SÁCH CHI TIẾT {selectedWh ? `- ${selectedWh.replace(/_/g, ' ')}` : ''}
                    </h3>

                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <button 
                            onClick={handleExportClick}
                            className="flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-lg shadow-orange-900/20 transition-all hover:scale-105 active:scale-95"
                        >
                            <LogOut size={16} /> XUẤT KHO
                        </button>

                        <div className="relative w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                            <input 
                                type="text" 
                                placeholder="Tìm kiếm Model, Lot, Code..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-4 py-1.5 bg-slate-800 border border-slate-600 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
                            />
                        </div>
                    </div>
                </div>

                <div className="overflow-auto flex-1 custom-scrollbar bg-slate-800">
                    <table className="w-full text-xs text-left">
                        <thead className="text-[10px] text-slate-500 uppercase bg-slate-900 sticky top-0 z-10 font-bold border-b border-slate-700">
                            <tr>
                                <th className="px-4 py-3 w-[50px] text-center">STT</th>
                                <th className="px-4 py-3">Kho (Vị trí)</th>
                                <th className="px-4 py-3">Model</th>
                                <th className="px-4 py-3">Code</th>
                                <th className="px-4 py-3">Lot No</th>
                                <th className="px-4 py-3 text-center">Công Đoạn</th>
                                <th className="px-4 py-3 text-center">Phân Loại</th>
                                <th className="px-4 py-3 text-center">Ngày Nhập</th>
                                <th className="px-4 py-3 text-right">Số Lượng Tồn</th>
                                <th className="px-4 py-3 text-center">ĐVT</th>
                                <th className="px-4 py-3 text-center">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/50">
                            {displayItems.length === 0 ? (
                                <tr>
                                    <td colSpan={11} className="px-6 py-12 text-center text-slate-500 italic">
                                        Không có dữ liệu tồn kho phù hợp.
                                    </td>
                                </tr>
                            ) : (
                                displayItems.map((item, index) => {
                                    const isFG = item.category === 'FINISHED_GOODS';
                                    const whTheme = THEMES[WH_COLOR_MAP[item.warehouseName || ''] || 'slate'];
                                    
                                    return (
                                        <tr key={item.id} className="hover:bg-white/5 transition-colors group text-slate-300">
                                            <td className="px-4 py-3 text-center text-slate-500">{index + 1}</td>
                                            <td className="px-4 py-3">
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${whTheme.bg} ${whTheme.text} ${whTheme.border} whitespace-nowrap`}>
                                                    {item.warehouseName.replace(/_/g, ' ')}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 font-bold text-white">{item.model}</td>
                                            <td className="px-4 py-3 font-mono text-blue-400">{item.code}</td>
                                            <td className="px-4 py-3 font-mono text-yellow-500 font-bold">{item.lotNo}</td>
                                            <td className="px-4 py-3 text-center">
                                                <span className="bg-slate-700 px-1.5 py-0.5 rounded border border-slate-600 text-[10px] font-mono">{item.stage}</span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`text-[9px] px-2 py-0.5 rounded font-bold border ${isFG ? 'bg-purple-900/30 text-purple-400 border-purple-800' : 'bg-cyan-900/30 text-cyan-400 border-cyan-800'}`}>
                                                    {isFG ? 'THÀNH PHẨM' : 'PHỤ LIỆU'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center font-mono text-slate-500">{item.importDate}</td>
                                            <td className="px-4 py-3 text-right font-bold text-white text-sm">
                                                {item.quantity.toLocaleString()}
                                            </td>
                                            <td className="px-4 py-3 text-center font-mono text-xs">{item.unit}</td>
                                            <td className="px-4 py-3 text-center">
                                                <button className="text-[10px] text-slate-400 hover:text-white bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded transition-colors flex items-center gap-1 mx-auto">
                                                    <ArrowRightLeft size={10}/> Chuyển
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
                
                {/* Footer Summary */}
                <div className="bg-slate-900 px-4 py-2 border-t border-slate-700 flex justify-between items-center text-xs text-slate-500">
                    <span>Tổng số dòng: {displayItems.length}</span>
                    <span className="flex items-center gap-2">
                        Tổng số lượng: <span className="text-white font-bold text-sm">{displayItems.reduce((sum, i) => sum + i.quantity, 0).toLocaleString()}</span>
                    </span>
                </div>
            </div>

            {/* EXPORT MODAL */}
            {isExportModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95">
                    <div className="bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg border border-slate-600 flex flex-col">
                        <div className="px-6 py-4 bg-orange-700 text-white flex justify-between items-center rounded-t-xl">
                            <h2 className="text-lg font-bold flex items-center gap-2 uppercase">
                                <LogOut size={20}/> Xuất Kho (Điều Chuyển)
                            </h2>
                            <button onClick={() => setIsExportModalOpen(false)} className="hover:bg-white/20 p-1 rounded transition-colors"><X size={20}/></button>
                        </div>
                        
                        <form onSubmit={handleSubmitExport} className="p-6 space-y-4">
                            {/* Type Selection */}
                            <div className="flex bg-slate-900 p-1 rounded-lg">
                                <button 
                                    type="button"
                                    onClick={() => handleFormChange('type', 'FINISHED_GOODS')}
                                    className={`flex-1 py-2 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-2 ${exportForm.type === 'FINISHED_GOODS' ? 'bg-purple-600 text-white shadow' : 'text-slate-500 hover:text-white'}`}
                                >
                                    <Package size={14}/> THÀNH PHẨM
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => handleFormChange('type', 'MATERIAL')}
                                    className={`flex-1 py-2 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-2 ${exportForm.type === 'MATERIAL' ? 'bg-cyan-600 text-white shadow' : 'text-slate-500 hover:text-white'}`}
                                >
                                    <Box size={14}/> PHỤ LIỆU
                                </button>
                            </div>

                            {/* Warehouse & Target Dept */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Kho Xuất (Nguồn)</label>
                                    <select 
                                        className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm text-white focus:border-orange-500 outline-none"
                                        value={exportForm.warehouse}
                                        onChange={(e) => handleFormChange('warehouse', e.target.value)}
                                        required
                                        disabled={!!selectedWh} // Disable selection if filter is active
                                    >
                                        <option value="">-- Chọn Kho --</option>
                                        {availableWarehouses.map(wh => (
                                            <option key={wh} value={wh}>{wh.replace(/_/g, ' ')}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Đến Bộ Phận (Đích)</label>
                                    <div className="relative">
                                        <select 
                                            className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm text-white focus:border-orange-500 outline-none pl-8"
                                            value={exportForm.targetDept}
                                            onChange={(e) => handleFormChange('targetDept', e.target.value)}
                                        >
                                            {DEPARTMENTS.map(d => (
                                                <option key={d.id} value={d.id}>{d.label}</option>
                                            ))}
                                        </select>
                                        <Building2 className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" size={14}/>
                                    </div>
                                </div>
                            </div>

                            {/* Model & Code */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Model</label>
                                    <select 
                                        className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm text-white focus:border-orange-500 outline-none font-bold"
                                        value={exportForm.model}
                                        onChange={(e) => handleFormChange('model', e.target.value)}
                                        disabled={!exportForm.warehouse}
                                        required
                                    >
                                        <option value="">-- Chọn Model --</option>
                                        {availableModels.map(m => <option key={m} value={m}>{m}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Code</label>
                                    <select 
                                        className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm text-white focus:border-orange-500 outline-none font-mono"
                                        value={exportForm.code}
                                        onChange={(e) => handleFormChange('code', e.target.value)}
                                        disabled={!exportForm.model}
                                        required
                                    >
                                        <option value="">-- Chọn Code --</option>
                                        {availableCodes.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* Lot & Qty */}
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Lot No (Mã Lô)</label>
                                <select 
                                    className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm text-yellow-500 font-mono font-bold focus:border-orange-500 outline-none"
                                    value={exportForm.lotNo}
                                    onChange={(e) => handleFormChange('lotNo', e.target.value)}
                                    disabled={!exportForm.code}
                                    required
                                >
                                    <option value="">-- Chọn Lot --</option>
                                    {availableLots.map(l => (
                                        <option key={l.lotNo} value={l.lotNo}>{l.lotNo} (Tồn: {l.quantity}) - {l.stage}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <div className="flex justify-between mb-1">
                                    <label className="block text-xs font-bold text-slate-400 uppercase">Số Lượng Xuất</label>
                                    {selectedItemDetail && (
                                        <span className="text-xs text-green-500 font-bold">Max: {selectedItemDetail.quantity}</span>
                                    )}
                                </div>
                                <input 
                                    type="number"
                                    min="1"
                                    max={selectedItemDetail?.quantity}
                                    value={exportForm.quantity}
                                    onChange={(e) => handleFormChange('quantity', e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-lg font-bold text-white focus:border-orange-500 outline-none text-center"
                                    disabled={!exportForm.lotNo}
                                />
                            </div>

                            {/* Info Box */}
                            <div className="bg-blue-900/20 border border-blue-500/30 p-3 rounded-lg flex items-start gap-2">
                                <Ticket size={16} className="text-blue-400 mt-0.5 shrink-0"/>
                                <p className="text-xs text-blue-200 leading-relaxed">
                                    Sau khi xác nhận, lô hàng này sẽ được chuyển sang trạng thái <strong>"Chờ duyệt (Pending)"</strong> tại tab <strong>CHECK PL</strong> của bộ phận <strong className="text-yellow-400 uppercase">{DEPARTMENTS.find(d => d.id === exportForm.targetDept)?.label}</strong>.
                                </p>
                            </div>

                            <button 
                                type="submit"
                                className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-3 rounded-lg shadow-lg transition-colors flex items-center justify-center gap-2 mt-2"
                            >
                                <CheckSquare size={18}/> XÁC NHẬN XUẤT KHO
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
