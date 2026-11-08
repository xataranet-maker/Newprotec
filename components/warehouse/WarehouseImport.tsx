
import React, { useState, useMemo, useEffect } from 'react';
import { Container, Save, Database, Tag, Package, ClipboardList, PenTool, Box, Check, Filter, ArrowDownCircle, CheckCircle } from 'lucide-react';
import { NetDataRecord, WarehouseItem } from '../../types';

interface WarehouseImportProps {
    netData: NetDataRecord[];
    onImport: (items: WarehouseItem[]) => void;
}

const DEPARTMENTS = [
    { id: 'MULTI', label: 'Multi Auto' },
    { id: 'STIFF', label: 'Stiff' },
    { id: 'MOLD', label: 'Khuôn & Jig' },
    { id: 'STAMPING', label: 'Dập Tự Động' },
];

// Updated to match Data Net format (Underscores instead of spaces for Stiff)
const WAREHOUSE_LOCATIONS: Record<string, string[]> = {
    'MULTI': ['Kho Multi', 'Kho Chung'],
    'STIFF': ['SUS_AUTO', 'SUS_SEMI', 'TAPE_AUTO', 'TAPE_JIG'],
    'MOLD': ['Kho Khuôn', 'Kho Jig'],
    'STAMPING': ['Kho Dập'], 
};

const UNITS = ['PNL', 'M', 'CM', 'EA', 'SHEET'];

// Configuration for the 3 Tab Cards
const TAB_CONFIG = {
    RAW: {
        id: 'RAW',
        label: 'PHỤ LIỆU THÔ',
        desc: 'Nguyên vật liệu đầu vào',
        icon: Box,
        color: 'green', // Tailwind color name
        borderColor: 'border-green-500',
        bgColor: 'bg-green-900/20',
        textColor: 'text-green-500',
        btnHover: 'hover:bg-green-600',
        ringFocus: 'focus:ring-green-500'
    },
    ACC_FINISHED: {
        id: 'ACC_FINISHED',
        label: 'PHỤ LIỆU BÁN TP',
        desc: 'Vật tư đã qua công đoạn',
        icon: PenTool,
        color: 'blue',
        borderColor: 'border-blue-500',
        bgColor: 'bg-blue-900/20',
        textColor: 'text-blue-500',
        btnHover: 'hover:bg-blue-600',
        ringFocus: 'focus:ring-blue-500'
    },
    FINISHED: {
        id: 'FINISHED',
        label: 'THÀNH PHẨM (FG)',
        desc: 'Sản phẩm hoàn thiện',
        icon: Package,
        color: 'orange',
        borderColor: 'border-orange-500',
        bgColor: 'bg-orange-900/20',
        textColor: 'text-orange-500',
        btnHover: 'hover:bg-orange-600',
        ringFocus: 'focus:ring-orange-500'
    }
};

export const WarehouseImport: React.FC<WarehouseImportProps> = ({ netData, onImport }) => {
    const [activeTab, setActiveTab] = useState<'RAW' | 'ACC_FINISHED' | 'FINISHED'>('RAW');
    
    // Determine visible departments based on Active Tab
    const visibleDepartments = useMemo(() => {
        switch (activeTab) {
            case 'RAW':
                // Only Stamping for Raw Materials
                return DEPARTMENTS.filter(d => d.id === 'STAMPING');
            case 'ACC_FINISHED':
            case 'FINISHED':
                // Multi and Stiff for Semi & Finished
                return DEPARTMENTS.filter(d => ['MULTI', 'STIFF'].includes(d.id));
            default:
                return DEPARTMENTS;
        }
    }, [activeTab]);

    const [formData, setFormData] = useState({
        department: visibleDepartments[0]?.id || 'MULTI',
        model: '',
        code: '',
        lotNo: '',
        quantity: 0,
        unit: 'PNL',
        stage: '', 
        warehouse: ''
    });

    const activeTheme = TAB_CONFIG[activeTab];

    // Ensure selected department is valid when Tab changes
    useEffect(() => {
        const validIds = visibleDepartments.map(d => d.id);
        
        // If current selection is invalid for the new tab, switch to first valid option
        if (!validIds.includes(formData.department)) {
             const newDept = validIds[0] || 'MULTI';
             setFormData(prev => ({
                 ...prev,
                 department: newDept,
                 model: '',
                 code: '',
                 stage: '',
                 lotNo: '',
                 quantity: 0,
                 warehouse: WAREHOUSE_LOCATIONS[newDept]?.[0] || ''
             }));
        }
    }, [activeTab, visibleDepartments]);

    // 1. FILTER NETDATA BY DEPARTMENT
    const deptSpecificNetData = useMemo(() => {
        return netData.filter(d => d.department === formData.department);
    }, [netData, formData.department]);

    // 2. EXTRACT UNIQUE MODELS
    const uniqueModels = useMemo(() => {
        return Array.from(new Set(deptSpecificNetData.map(d => d.model))).sort();
    }, [deptSpecificNetData]);

    // 3. EXTRACT CODES
    const availableCodes = useMemo(() => {
        if (!formData.model) return [];
        return deptSpecificNetData
            .filter(d => d.model === formData.model)
            .map(d => d.code)
            .sort();
    }, [deptSpecificNetData, formData.model]);

    // 4. EXTRACT STAGES
    const availableStages = useMemo(() => {
        if (!formData.model || !formData.code) return [];
        
        const matchedRecord = deptSpecificNetData.find(d => d.model === formData.model && d.code === formData.code);
        if (!matchedRecord) return [];

        const stages = [];
        if (matchedRecord.stage) stages.push(matchedRecord.stage);
        if (matchedRecord.stage2) stages.push(matchedRecord.stage2);
        if (matchedRecord.stage3) stages.push(matchedRecord.stage3);
        if (matchedRecord.stage4) stages.push(matchedRecord.stage4);
        
        return stages.length > 0 ? stages : ['--'];
    }, [deptSpecificNetData, formData.model, formData.code]);

    const availableWarehouses = WAREHOUSE_LOCATIONS[formData.department] || [];

    useEffect(() => {
        // When Dept changes manually (if multiple options available), reset dependent fields
        setFormData(prev => ({
            ...prev,
            model: '',
            code: '',
            stage: '',
            lotNo: '',
            quantity: 0,
            warehouse: WAREHOUSE_LOCATIONS[prev.department]?.[0] || ''
        }));
    }, [formData.department]); // Only trigger on department change

    useEffect(() => {
        if (availableStages.length > 0) {
            setFormData(prev => ({ ...prev, stage: availableStages[0] }));
        } else {
            setFormData(prev => ({ ...prev, stage: '' }));
        }
    }, [availableStages]);


    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        if (name === 'department') {
             setFormData(prev => ({ ...prev, department: value }));
        } else {
             setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!formData.model || !formData.code || !formData.lotNo || formData.quantity <= 0) {
            alert("Vui lòng điền đầy đủ thông tin bắt buộc.");
            return;
        }

        let category: 'FINISHED_GOODS' | 'MATERIAL' = 'MATERIAL';
        // Logic classification based on Tab or Unit
        if (activeTab === 'FINISHED' || ['PNL', 'SHEET'].includes(formData.unit)) {
            category = 'FINISHED_GOODS';
        }

        const newItem: WarehouseItem = {
            id: Date.now(),
            department: formData.department,
            model: formData.model,
            code: formData.code,
            lotNo: formData.lotNo,
            quantity: Number(formData.quantity),
            unit: formData.unit as any,
            category: category,
            stage: formData.stage,
            warehouseName: formData.warehouse || availableWarehouses[0],
            importDate: new Date().toLocaleDateString('vi-VN'),
            status: 'IN_STOCK'
        };

        onImport([newItem]);
        alert("Đã nhập kho thành công! Dữ liệu đã được đồng bộ với định dạng Data Net.");
        
        setFormData(prev => ({
            ...prev,
            lotNo: '',
            quantity: 0
        }));
    };

    return (
        <div className="flex flex-col h-full p-6 bg-slate-900 text-slate-300 overflow-y-auto">
            {/* Header */}
            <div className="mb-6 flex items-center gap-3 shrink-0">
                <div className={`p-3 rounded-lg shadow-lg text-white bg-${activeTheme.color}-600`}>
                    <Container size={24} />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-white uppercase tracking-wider font-mono">NHẬP KHO (LOGISTICS)</h1>
                    <p className="text-xs text-slate-400">Hệ thống phân loại và nhập liệu thông minh</p>
                </div>
            </div>

            {/* TAB CARDS GRID */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 shrink-0">
                {(Object.keys(TAB_CONFIG) as Array<keyof typeof TAB_CONFIG>).map((key) => {
                    const tab = TAB_CONFIG[key];
                    const isActive = activeTab === key;

                    return (
                        <button
                            key={key}
                            onClick={() => setActiveTab(key)}
                            className={`
                                relative p-3 rounded-xl border-2 transition-all duration-300 flex items-center gap-3 text-left group h-full
                                ${isActive 
                                    ? `${tab.bgColor} ${tab.borderColor} shadow-lg shadow-${tab.color}-900/20 scale-[1.02]` 
                                    : 'bg-slate-800 border-slate-700 hover:border-slate-600 hover:bg-slate-750'
                                }
                            `}
                        >
                            <div className={`
                                p-2 rounded-lg transition-colors shrink-0
                                ${isActive ? `bg-${tab.color}-500 text-white` : `bg-slate-700 text-slate-400 group-hover:text-white`}
                            `}>
                                <tab.icon size={20} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className={`font-bold text-sm uppercase truncate ${isActive ? 'text-white' : 'text-slate-300'}`}>
                                    {tab.label}
                                </div>
                                <div className="text-[10px] text-slate-500 font-medium truncate">
                                    {tab.desc}
                                </div>
                            </div>
                            
                            {isActive && (
                                <div className={`absolute top-2 right-2 ${tab.textColor}`}>
                                    <CheckCircle size={16} />
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* DYNAMIC FORM CONTAINER */}
            <div className={`bg-slate-800 rounded-xl shadow-2xl border-t-4 p-6 md:p-8 flex-1 transition-colors duration-300 ${activeTheme.borderColor}`}>
                
                <div className="flex items-center gap-2 mb-6 pb-2 border-b border-slate-700">
                        <ClipboardList className={activeTheme.textColor} size={20}/>
                        <h3 className="font-bold text-lg text-white">PHIẾU NHẬP: <span className={activeTheme.textColor}>{activeTheme.label}</span></h3>
                </div>

                <form onSubmit={handleSubmit} className="max-w-5xl mx-auto space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                        {/* LEFT COLUMN */}
                        <div className="space-y-5">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Bộ Phận / Phòng Ban</label>
                                <select 
                                    name="department" 
                                    value={formData.department} 
                                    onChange={handleChange}
                                    className={`w-full bg-slate-900 border border-slate-600 rounded px-4 py-2.5 text-white outline-none font-bold transition-all focus:border-${activeTheme.color}-500 focus:ring-1 focus:ring-${activeTheme.color}-500`}
                                >
                                    {visibleDepartments.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
                                </select>
                                <p className="text-[10px] text-slate-500 mt-1 italic">
                                    * Chỉ hiển thị các bộ phận phù hợp với loại phiếu nhập.
                                </p>
                            </div>
                            
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Model Name <span className="text-red-500">*</span></label>
                                <div className="relative">
                                    <select 
                                        name="model" 
                                        value={formData.model} 
                                        onChange={handleChange}
                                        className={`w-full bg-slate-900 border border-slate-600 rounded px-4 py-2.5 text-white outline-none font-bold appearance-none transition-all focus:border-${activeTheme.color}-500 focus:ring-1 focus:ring-${activeTheme.color}-500`}
                                    >
                                        <option value="">-- Chọn Model --</option>
                                        {uniqueModels.map(m => <option key={m} value={m}>{m}</option>)}
                                    </select>
                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
                                        <Filter size={16} />
                                    </div>
                                </div>
                                <p className="text-[10px] text-slate-500 mt-1 italic">
                                    {uniqueModels.length > 0 ? 'Danh sách model từ Data Net.' : 'Chưa có Data Net cho bộ phận này.'}
                                </p>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Code <span className="text-red-500">*</span></label>
                                <select 
                                    name="code" 
                                    value={formData.code} 
                                    onChange={handleChange}
                                    className={`w-full bg-slate-900 border border-slate-600 rounded px-4 py-2.5 text-white outline-none font-mono text-sm transition-all focus:border-${activeTheme.color}-500 focus:ring-1 focus:ring-${activeTheme.color}-500`}
                                    disabled={!formData.model}
                                >
                                    <option value="">-- Chọn Code --</option>
                                    {availableCodes.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Lot No (Mã Lô) <span className="text-red-500">*</span></label>
                                <div className="relative">
                                    <input 
                                        type="text" 
                                        name="lotNo" 
                                        value={formData.lotNo} 
                                        onChange={handleChange}
                                        className={`w-full bg-slate-900 border border-slate-600 rounded px-4 py-2.5 pl-10 text-${activeTheme.color}-400 font-mono font-bold outline-none transition-all focus:border-${activeTheme.color}-500 focus:ring-1 focus:ring-${activeTheme.color}-500`}
                                        placeholder="LOT-2024..."
                                    />
                                    <Tag size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"/>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT COLUMN */}
                        <div className="space-y-5">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Số Lượng <span className="text-red-500">*</span></label>
                                    <input 
                                        type="number" 
                                        name="quantity" 
                                        value={formData.quantity} 
                                        onChange={handleChange}
                                        className={`w-full bg-slate-900 border border-slate-600 rounded px-4 py-2.5 text-white font-bold text-right outline-none transition-all focus:border-${activeTheme.color}-500 focus:ring-1 focus:ring-${activeTheme.color}-500`}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Đơn Vị (Unit)</label>
                                    <select 
                                        name="unit" 
                                        value={formData.unit} 
                                        onChange={handleChange}
                                        className={`w-full bg-slate-900 border border-slate-600 rounded px-4 py-2.5 text-white outline-none transition-all focus:border-${activeTheme.color}-500 focus:ring-1 focus:ring-${activeTheme.color}-500`}
                                    >
                                        {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Công Đoạn (Stage)</label>
                                <select 
                                    name="stage" 
                                    value={formData.stage} 
                                    onChange={handleChange}
                                    className={`w-full bg-slate-900 border border-slate-600 rounded px-4 py-2.5 text-white outline-none font-mono text-sm transition-all focus:border-${activeTheme.color}-500 focus:ring-1 focus:ring-${activeTheme.color}-500`}
                                    disabled={!formData.code}
                                >
                                    {availableStages.length === 0 ? <option value="">-- Chưa cấu hình --</option> : null}
                                    {availableStages.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Kho Nhập (Vị trí)</label>
                                <select 
                                    name="warehouse" 
                                    value={formData.warehouse} 
                                    onChange={handleChange}
                                    className={`w-full bg-slate-900 border border-slate-600 rounded px-4 py-2.5 text-white outline-none transition-all focus:border-${activeTheme.color}-500 focus:ring-1 focus:ring-${activeTheme.color}-500`}
                                >
                                    {availableWarehouses.map(w => (
                                        <option key={w} value={w}>{w.replace(/_/g, ' ')}</option>
                                    ))}
                                    <option value="GENERAL">Kho Chung</option>
                                </select>
                            </div>
                            
                            <div className="pt-2">
                                <button 
                                    type="submit" 
                                    className={`
                                        w-full bg-${activeTheme.color}-600 hover:bg-${activeTheme.color}-500 text-white font-bold py-3.5 rounded-lg shadow-lg 
                                        flex items-center justify-center gap-2 transition-all active:scale-[0.98] uppercase tracking-wide
                                    `}
                                >
                                    <ArrowDownCircle size={20}/> XÁC NHẬN NHẬP KHO
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Classification Preview Footer */}
                    <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700/50 text-xs text-slate-400 flex flex-col md:flex-row items-center justify-between gap-2 mt-4">
                        <div className="flex items-center gap-2">
                            <Database size={16} className={activeTheme.textColor}/>
                            <span>Hệ thống phân loại tự động:</span>
                        </div>
                        <div className="flex items-center gap-2 font-bold text-white bg-slate-800 px-3 py-1 rounded border border-slate-600">
                             {['PNL', 'SHEET'].includes(formData.unit) ? 'KHO THÀNH PHẨM (Finished Goods)' : 'KHO PHỤ LIỆU (Material/Accessory)'}
                             <Check className="text-green-500" size={14}/>
                        </div>
                    </div>

                </form>
            </div>
        </div>
    );
};
