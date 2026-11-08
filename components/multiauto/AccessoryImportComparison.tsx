
import React, { useState, useMemo } from 'react';
import { Search, GitCompare, Clipboard, AlertCircle, CheckCircle2, History, Database, ArrowRight, Trash2 } from 'lucide-react';
import { AccessoryRecord } from '../../types';

interface AccessoryImportComparisonProps {
    accessoryData: AccessoryRecord[];
    onClearSystemData?: () => void;
}

interface ERPRecord {
    lotNo: string;
    quantity: number;
}

export const AccessoryImportComparison: React.FC<AccessoryImportComparisonProps> = ({ accessoryData, onClearSystemData }) => {
    const [pastedText, setPastedText] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    // Remove default date filter to show all history by default for comprehensive comparison
    const [showDateFilter, setShowDateFilter] = useState(false);
    const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);

    // Parse pasted text: Expected format "LOT001 500 LOT002 1000"
    const erpRecords = useMemo(() => {
        const tokens = pastedText.trim().split(/\s+/);
        const records: ERPRecord[] = [];
        for (let i = 0; i < tokens.length; i += 2) {
            if (tokens[i]) {
                const lot = tokens[i].toUpperCase();
                const qty = parseInt(tokens[i + 1]) || 0;
                records.push({ lotNo: lot, quantity: qty });
            }
        }
        return records;
    }, [pastedText]);

    // Filter system data based on selected date (optional) and search
    const systemRecords = useMemo(() => {
        return accessoryData.filter(item => {
            let matchesDate = true;
            if (showDateFilter) {
                const parts = item.date.split('/');
                const isoDate = `${parts[2]}-${parts[1]}-${parts[0]}`; 
                matchesDate = isoDate === selectedDate;
            }
            const matchesSearch = item.lotNo.toUpperCase().includes(searchTerm.toUpperCase()) || item.model.toUpperCase().includes(searchTerm.toUpperCase());
            return matchesDate && matchesSearch;
        });
    }, [accessoryData, searchTerm, showDateFilter, selectedDate]);

    // Combine for aligned view
    const comparisonView = useMemo(() => {
        // Create a union of all unique lot numbers
        const allLots = new Set<string>();
        systemRecords.forEach(r => allLots.add(r.lotNo.toUpperCase()));
        erpRecords.forEach(r => allLots.add(r.lotNo.toUpperCase()));

        const rows = Array.from(allLots).map(lot => {
            // Find system records (could be multiple if same lot imported multiple times, usually one)
            // Aggregate quantities if duplicate lots
            const sysItems = systemRecords.filter(r => r.lotNo.toUpperCase() === lot);
            const sysQty = sysItems.reduce((s, r) => s + r.quantity, 0);
            
            const erp = erpRecords.find(r => r.lotNo.toUpperCase() === lot);

            const isMatched = sysQty === (erp?.quantity || 0) && sysItems.length > 0 && !!erp;
            const hasSys = sysItems.length > 0;
            const hasErp = !!erp;

            // Take first system item for metadata
            const sysMeta = sysItems[0];

            let status: 'MATCH' | 'ERP_ONLY' | 'SYS_ONLY' | 'QTY_MISMATCH' = 'MATCH';
            if (!hasSys) status = 'ERP_ONLY';
            else if (!hasErp) status = 'SYS_ONLY';
            else if (sysQty !== erp.quantity) status = 'QTY_MISMATCH';

            return {
                lot,
                sysMeta,
                sysQty,
                erpQty: erp?.quantity || 0,
                status
            };
        });

        // Sort by mismatch first
        return rows.sort((a, b) => {
            const priority = { 'QTY_MISMATCH': 1, 'ERP_ONLY': 2, 'SYS_ONLY': 3, 'MATCH': 4 };
            if (priority[a.status] !== priority[b.status]) return priority[a.status] - priority[b.status];
            return a.lot.localeCompare(b.lot);
        });
    }, [systemRecords, erpRecords]);

    return (
        <div className="p-6 h-full overflow-y-auto bg-slate-950 flex flex-col gap-6 font-sans text-slate-300">
            {/* Header */}
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-4 shadow-2xl">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-cyan-600 rounded-xl text-white shadow-lg shadow-cyan-900/40">
                        <GitCompare size={24} />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-white uppercase tracking-tighter font-mono">ĐỐI CHIẾU NHẬP PHỤ LIỆU</h1>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">So sánh dữ liệu Hệ thống thực tế vs ERP (Toàn bộ lịch sử)</p>
                    </div>
                </div>

                <div className="flex gap-4 items-center">
                    <div className="flex items-center gap-2">
                        <input type="checkbox" checked={showDateFilter} onChange={(e) => setShowDateFilter(e.target.checked)} className="rounded border-slate-600 bg-slate-800 text-cyan-600 focus:ring-0"/>
                        <span className="text-xs font-bold text-slate-500">Lọc theo ngày</span>
                        {showDateFilter && (
                             <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="bg-slate-950 border border-slate-700 rounded-md px-2 py-1 text-xs text-white outline-none [color-scheme:dark]"/>
                        )}
                    </div>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                        <input 
                            type="text" 
                            placeholder="Tìm nhanh Lot No..." 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="bg-slate-950 border border-slate-700 rounded-full pl-9 pr-4 py-1.5 text-xs text-white focus:border-cyan-500 outline-none w-48 shadow-inner"
                        />
                    </div>
                </div>
            </div>

            {/* Input Paste Area */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
                <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 ml-1 flex items-center gap-2">
                    <Clipboard size={14} className="text-cyan-500"/> DÁN DỮ LIỆU ERP (ĐỊNH DẠNG: LOT1 QTY1 LOT2 QTY2 ...)
                </label>
                <textarea 
                    value={pastedText}
                    onChange={e => setPastedText(e.target.value)}
                    placeholder="Dán dữ liệu từ ERP tại đây... (Ví dụ: LOT240501 5000 LOT240502 2500)"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs font-mono text-cyan-400 focus:border-cyan-500 outline-none h-24 shadow-inner resize-none placeholder:text-slate-800"
                />
            </div>

            {/* Main Comparison Matrix */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4">
                
                {/* SYSTEM SIDE */}
                <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col">
                    <div className="p-3 bg-slate-800/50 border-b border-slate-700 flex justify-between items-center">
                        <h3 className="text-[10px] font-black uppercase text-blue-400 tracking-widest flex items-center gap-2">
                            <Database size={14}/> DỮ LIỆU HỆ THỐNG (THỰC NHẬP)
                        </h3>
                        {onClearSystemData && (
                            <button 
                                onClick={() => {
                                    if(window.confirm("CẢNH BÁO NGUY HIỂM: Hành động này sẽ xóa toàn bộ dữ liệu nhập phụ liệu trong hệ thống để giải phóng bộ nhớ. Bạn có chắc chắn muốn tiếp tục không?")) {
                                        onClearSystemData();
                                    }
                                }}
                                className="text-[10px] bg-red-900/30 text-red-400 hover:bg-red-600 hover:text-white px-2 py-1 rounded border border-red-800/50 transition-all flex items-center gap-1 font-bold"
                                title="Xóa toàn bộ dữ liệu nhập phụ liệu hệ thống"
                            >
                                <Trash2 size={12} /> XÓA TOÀN BỘ (RESET)
                            </button>
                        )}
                    </div>
                    <div className="flex-1 overflow-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse text-[10px]">
                            <thead className="bg-slate-950 text-slate-500 sticky top-0 font-black uppercase">
                                <tr className="border-b border-slate-800">
                                    <th className="p-3">Ngày Nhập</th>
                                    <th className="p-3">Model + Code</th>
                                    <th className="p-3">CĐ</th>
                                    <th className="p-3 text-right">SL (EA)</th>
                                    <th className="p-3">Lot No</th>
                                </tr>
                            </thead>
                            <tbody>
                                {comparisonView.map((row, idx) => (
                                    <tr key={idx} className={`border-b border-slate-800/40 h-10 ${row.status === 'MATCH' ? 'bg-green-900/10' : row.status === 'ERP_ONLY' ? 'bg-red-900/5' : row.status === 'QTY_MISMATCH' ? 'bg-yellow-900/10' : ''}`}>
                                        <td className="p-3 font-mono text-slate-500">{row.sysMeta?.date || '-'}</td>
                                        <td className="p-3">
                                            {row.sysMeta ? (
                                                <div>
                                                    <div className="font-black text-white">{row.sysMeta.model}</div>
                                                    <div className="text-slate-600 font-mono text-[9px]">{row.sysMeta.code}</div>
                                                </div>
                                            ) : '-'}
                                        </td>
                                        <td className="p-3">
                                            {row.sysMeta ? <span className="bg-slate-800 border border-slate-700 px-1.5 py-0.5 rounded font-bold">{row.sysMeta.stage}</span> : '-'}
                                        </td>
                                        <td className={`p-3 text-right font-black ${row.status === 'QTY_MISMATCH' ? 'text-yellow-500' : 'text-blue-400'}`}>
                                            {row.sysQty > 0 ? row.sysQty.toLocaleString() : '-'}
                                        </td>
                                        <td className={`p-3 font-mono font-bold ${row.status === 'MATCH' ? 'text-green-400' : 'text-slate-500'}`}>
                                            {row.lot}
                                        </td>
                                    </tr>
                                ))}
                                {comparisonView.length === 0 && (
                                    <tr><td colSpan={5} className="p-10 text-center text-slate-700 italic">Chưa có dữ liệu so sánh.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* ERP SIDE */}
                <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col">
                    <div className="p-3 bg-slate-800/50 border-b border-slate-700 flex justify-between items-center">
                        <h3 className="text-[10px] font-black uppercase text-emerald-400 tracking-widest flex items-center gap-2">
                            <History size={14}/> DỮ LIỆU ERP (ĐỐI CHIẾU)
                        </h3>
                    </div>
                    <div className="flex-1 overflow-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse text-[10px]">
                            <thead className="bg-slate-950 text-slate-500 sticky top-0 font-black uppercase">
                                <tr className="border-b border-slate-800">
                                    <th className="p-3">Lot No</th>
                                    <th className="p-3 text-right">Số Lượng (EA)</th>
                                    <th className="p-3 text-center">Trạng Thái</th>
                                </tr>
                            </thead>
                            <tbody>
                                {comparisonView.map((row, idx) => (
                                    <tr key={idx} className={`border-b border-slate-800/40 h-10 ${row.status === 'MATCH' ? 'bg-green-900/10' : row.status === 'ERP_ONLY' ? 'bg-red-900/20' : row.status === 'QTY_MISMATCH' ? 'bg-yellow-900/10' : ''}`}>
                                        <td className={`p-3 font-mono font-black ${row.status === 'MATCH' ? 'text-green-400' : row.status === 'ERP_ONLY' ? 'text-red-400' : 'text-slate-600'}`}>
                                            {row.lot}
                                        </td>
                                        <td className={`p-3 text-right font-black ${row.status === 'QTY_MISMATCH' ? 'text-yellow-500' : 'text-cyan-400'}`}>
                                            {row.erpQty > 0 ? row.erpQty.toLocaleString() : '-'}
                                        </td>
                                        <td className="p-3 text-center">
                                            {row.status === 'MATCH' && (
                                                <div className="flex items-center justify-center gap-1 text-green-400 font-black bg-green-900/30 border border-green-700 px-2 py-0.5 rounded-full animate-in fade-in">
                                                    <CheckCircle2 size={10}/> KHỚP
                                                </div>
                                            )}
                                            {row.status === 'ERP_ONLY' && (
                                                <div className="flex items-center justify-center gap-1 text-red-400 font-black bg-red-900/30 border border-red-700 px-2 py-0.5 rounded-full">
                                                    <AlertCircle size={10}/> THIẾU SYS
                                                </div>
                                            )}
                                            {row.status === 'SYS_ONLY' && (
                                                <div className="text-slate-500 italic">Thiếu ERP</div>
                                            )}
                                            {row.status === 'QTY_MISMATCH' && (
                                                 <div className="flex items-center justify-center gap-1 text-yellow-400 font-black bg-yellow-900/30 border border-yellow-700 px-2 py-0.5 rounded-full">
                                                    <AlertCircle size={10}/> SAI SL
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {comparisonView.length === 0 && (
                                    <tr><td colSpan={3} className="p-10 text-center text-slate-700 italic">Vui lòng dán dữ liệu ERP vào ô trên.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>

            {/* Float Stat Bar */}
            <div className="fixed bottom-6 right-6 flex gap-3 z-[100]">
                 <div className="bg-slate-800 border border-slate-700 px-4 py-2 rounded-xl shadow-2xl flex items-center gap-4">
                      <div className="flex flex-col">
                          <span className="text-[8px] text-slate-500 font-black uppercase">Khớp</span>
                          <span className="text-sm font-black text-green-400">{comparisonView.filter(r => r.status === 'MATCH').length}</span>
                      </div>
                      <div className="w-px h-6 bg-slate-700"></div>
                      <div className="flex flex-col">
                          <span className="text-[8px] text-slate-500 font-black uppercase">Lỗi (ERP/SL)</span>
                          <span className="text-sm font-black text-red-500">{comparisonView.filter(r => r.status === 'ERP_ONLY' || r.status === 'QTY_MISMATCH').length}</span>
                      </div>
                      <button 
                        onClick={() => setPastedText('')}
                        className="p-2 bg-slate-900 hover:bg-red-600 rounded-lg text-slate-500 hover:text-white transition-all ml-2"
                        title="Xóa dữ liệu ERP"
                      >
                          <Trash2 size={16}/>
                      </button>
                 </div>
            </div>
        </div>
    );
};
