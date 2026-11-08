
import React, { useState, useMemo, useEffect, useRef } from 'react';
// Add Monitor to lucide-react imports to fix "Cannot find name 'Monitor'" error on line 124
import { Save, Plus, FileSpreadsheet, ClipboardPaste, History, Trash2, ChevronDown, Download, CheckSquare, Edit2, Clock, Monitor, X } from 'lucide-react';
import { ImportRecord, NetDataRecord, UserRole } from '../../types';
import { exportToExcel } from '../../services/excelService';

interface GridRow {
  model: string;
  code: string;
  lotNo: string;
  stage: string;
  quantity: string;
}

export const MultiAutoImport: React.FC<{
  onAddBatch: (records: Omit<ImportRecord, 'id' | 'timestamp' | 'date' | 'shift'>[]) => void;
  recentRecords: ImportRecord[];
  netData: NetDataRecord[];
  onDelete?: (id: number) => void;
  userRole?: UserRole;
}> = ({ onAddBatch, recentRecords, netData, onDelete }) => {
  const [gridData, setGridData] = useState<GridRow[]>(Array(20).fill(null).map(() => ({
    model: '', code: '', lotNo: '', stage: '', quantity: ''
  })));
  
  const [activeCell, setActiveCell] = useState<{ row: number, col: keyof GridRow } | null>(null);
  
  // Paste Modal State
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pasteText, setPasteText] = useState('');

  const lotRefs = useRef<(HTMLInputElement | null)[]>([]);

  const uniqueModels = useMemo(() => Array.from(new Set(netData.map(d => d.model))).sort(), [netData]);

  const handleModelChange = (rowIndex: number, model: string) => {
    const match = netData.find(d => d.model === model);
    const newGrid = [...gridData];
    newGrid[rowIndex] = {
      ...newGrid[rowIndex],
      model: model,
      code: match?.code || '',
      stage: match?.stage || newGrid[rowIndex].stage || '1L-1'
    };
    setGridData(newGrid);
  };

  const updateCell = (rowIndex: number, col: keyof GridRow, value: string) => {
    const newGrid = [...gridData];
    newGrid[rowIndex] = { ...newGrid[rowIndex], [col]: value };
    setGridData(newGrid);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key.toLowerCase() === 'd' && activeCell) {
        e.preventDefault();
        if (activeCell.row > 0) {
          const valueToCopy = gridData[activeCell.row - 1][activeCell.col];
          updateCell(activeCell.row, activeCell.col, valueToCopy);
          if (activeCell.col === 'model') {
            const prevRow = gridData[activeCell.row - 1];
            const newGrid = [...gridData];
            newGrid[activeCell.row].model = prevRow.model;
            newGrid[activeCell.row].code = prevRow.code;
            newGrid[activeCell.row].stage = prevRow.stage;
            setGridData(newGrid);
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeCell, gridData]);

  const handleLotKeyDown = (e: React.KeyboardEvent, rIdx: number) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        if (rIdx < gridData.length - 1) {
            lotRefs.current[rIdx + 1]?.focus();
        }
    }
  };

  const handleProcessPaste = () => {
    if (!pasteText.trim()) return;

    const lines = pasteText.trim().split(/\r?\n/);
    const newGrid = [...gridData];

    lines.forEach((line, idx) => {
        if (idx < newGrid.length) {
            // Tách bằng tab hoặc nhiều khoảng trắng
            const parts = line.trim().split(/[\t\s]+/);
            
            // Cấu trúc mong đợi: Model | Stage | Lot | Qty
            // Hoặc: Model | Lot | Qty (Stage tự tìm)
            
            const model = parts[0]?.toUpperCase() || '';
            let stage = '';
            let lotNo = '';
            let quantity = '';

            // Logic đơn giản: Nếu có 4 phần tử -> Model, Stage, Lot, Qty
            if (parts.length >= 4) {
                stage = parts[1];
                lotNo = parts[2]?.toUpperCase();
                quantity = parts[3];
            } else if (parts.length === 3) {
                // Nếu chỉ có 3 phần tử -> Model, Lot, Qty (Stage lấy từ Data Net hoặc mặc định)
                lotNo = parts[1]?.toUpperCase();
                quantity = parts[2];
            }

            // Tìm code tự động
            const match = netData.find(d => d.model === model);
            
            if (!stage && match) stage = match.stage || '1L-1';

            newGrid[idx] = {
                model,
                code: match?.code || '',
                stage,
                lotNo,
                quantity: quantity.replace(/[^0-9]/g, '') // Chỉ lấy số
            };
        }
    });

    setGridData(newGrid);
    setShowPasteModal(false);
    setPasteText('');
  };

  const handleSaveGrid = () => {
    const validRecords = gridData
      .filter(r => r.model && r.lotNo && parseInt(r.quantity) > 0)
      .map(r => ({
        model: r.model,
        code: r.code,
        stage: r.stage || '1L-1',
        quantity: parseInt(r.quantity),
        lotNo: r.lotNo.toUpperCase()
      }));

    if (validRecords.length === 0) {
      alert("Vui lòng nhập ít nhất một dòng đầy đủ thông tin.");
      return;
    }

    onAddBatch(validRecords);
    setGridData(Array(20).fill(null).map(() => ({
      model: '', code: '', lotNo: '', stage: '', quantity: ''
    })));
    alert(`Đã lưu thành công ${validRecords.length} lô hàng!`);
  };

  return (
    <div className="p-4 h-full bg-[#020617] flex flex-col gap-4 text-slate-300 font-sans overflow-hidden">
      {/* Top Header Bar */}
      <div className="flex justify-between items-center bg-[#0f172a] p-3 rounded-lg border border-slate-800 shadow-lg shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-green-600/20 rounded text-green-500 border border-green-500/30">
            <FileSpreadsheet size={20}/>
          </div>
          <h1 className="text-xs font-black uppercase font-mono tracking-widest text-white">NHẬP THÀNH PHẨM (MULTI AUTO)</h1>
        </div>
        <button onClick={() => exportToExcel([], "Template_MultiAuto")} className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 text-[10px] font-black rounded border border-slate-700 flex items-center gap-2 uppercase tracking-widest transition-all">
          <Download size={14}/> TẢI MẪU
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-auto custom-scrollbar">
        {/* Force min-width to prevent layout break on mobile, enable horizontal scroll */}
        <div className="flex gap-6 h-full min-w-[1300px] p-1">
            {/* LEFT COLUMN: GRID INPUT */}
            <div className="w-[58%] flex flex-col gap-3 h-full overflow-hidden">
                <div className="flex-1 flex flex-col bg-[#0f172a] rounded-xl border border-slate-800 shadow-2xl overflow-hidden relative">
                    <div className="p-3 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center shrink-0">
                        <h2 className="text-[10px] font-black text-blue-400 uppercase tracking-widest flex items-center gap-2">
                            <Monitor size={14}/> NHẬP LIỆU GRID
                        </h2>
                        <span className="text-[9px] text-slate-500 font-bold italic">Ctrl+D: Copy ô trên</span>
                    </div>
                    
                    <div className="flex-1 overflow-auto custom-scrollbar bg-[#020617]/50">
                        <table className="w-full border-collapse text-[11px] table-fixed">
                            <thead className="bg-slate-900/80 text-slate-500 uppercase font-black font-mono sticky top-0 z-20 shadow-md">
                                <tr>
                                    <th className="w-10 py-3 text-center border-r border-b border-slate-800">#</th>
                                    <th className="w-[35%] px-4 border-r border-b border-slate-800 text-left">MODEL (+20%)</th>
                                    <th className="w-[18%] px-4 border-r border-b border-slate-800 text-left">CODE (-10%)</th>
                                    <th className="w-[22%] px-4 border-r border-b border-slate-800 text-left">MÃ LÔ (-10%)</th>
                                    <th className="w-[10%] px-2 border-r border-b border-slate-800 text-center">CĐ</th>
                                    <th className="w-[15%] px-4 border-b border-slate-800 text-center">SL</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {gridData.map((row, rIdx) => (
                                    <tr key={rIdx} className="hover:bg-white/5 transition-colors group">
                                        <td className="text-center text-slate-600 font-mono bg-slate-900/30 border-r border-slate-800">{rIdx + 1}</td>
                                        
                                        {/* MODEL */}
                                        <td className="p-0 border-r border-slate-800 relative">
                                            <select 
                                                value={row.model} 
                                                onChange={(e) => handleModelChange(rIdx, e.target.value)}
                                                onFocus={() => setActiveCell({ row: rIdx, col: 'model' })}
                                                className="w-full h-9 bg-transparent text-blue-400 font-bold px-3 outline-none appearance-none cursor-pointer"
                                            >
                                                <option value="" className="bg-slate-900 text-slate-500">-</option>
                                                {uniqueModels.map(m => <option key={m} value={m} className="bg-slate-900">{m}</option>)}
                                            </select>
                                            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-700 pointer-events-none" size={12}/>
                                        </td>

                                        {/* CODE */}
                                        <td className="p-0 border-r border-slate-800 bg-slate-900/20">
                                            <input readOnly value={row.code} className="w-full h-9 bg-transparent px-3 text-slate-500 font-mono text-[10px] outline-none text-center cursor-not-allowed" placeholder="..." />
                                        </td>

                                        {/* LOT NO */}
                                        <td className="p-0 border-r border-slate-800">
                                            <input 
                                                ref={el => lotRefs.current[rIdx] = el}
                                                value={row.lotNo} 
                                                onChange={(e) => updateCell(rIdx, 'lotNo', e.target.value.toUpperCase())}
                                                onKeyDown={(e) => handleLotKeyDown(e, rIdx)}
                                                onFocus={() => setActiveCell({ row: rIdx, col: 'lotNo' })}
                                                className="w-full h-9 bg-transparent px-3 text-slate-300 font-mono font-bold outline-none focus:bg-slate-900 placeholder-slate-800" 
                                                placeholder="BẮN MÃ..."
                                            />
                                        </td>

                                        {/* STAGE */}
                                        <td className="p-0 border-r border-slate-800">
                                            <input 
                                                value={row.stage} 
                                                onChange={(e) => updateCell(rIdx, 'stage', e.target.value)}
                                                onFocus={() => setActiveCell({ row: rIdx, col: 'stage' })}
                                                className="w-full h-9 bg-transparent px-2 text-blue-400 font-black outline-none text-center focus:bg-slate-900"
                                                placeholder="-"
                                            />
                                        </td>

                                        {/* QUANTITY */}
                                        <td className="p-0">
                                            <input 
                                                type="number"
                                                value={row.quantity} 
                                                onChange={(e) => updateCell(rIdx, 'quantity', e.target.value)}
                                                onFocus={() => setActiveCell({ row: rIdx, col: 'quantity' })}
                                                className="w-full h-9 bg-transparent px-3 text-white font-black outline-none text-center focus:bg-slate-900"
                                                placeholder="0"
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Bottom Actions for Grid */}
                <div className="flex gap-4 shrink-0">
                    <button onClick={() => setShowPasteModal(true)} className="flex-1 py-3 bg-[#1e293b] hover:bg-slate-700 text-slate-400 font-black rounded-xl border border-slate-700 flex items-center justify-center gap-2 uppercase tracking-widest text-[11px] transition-all">
                        <ClipboardPaste size={16}/> DÁN NHANH
                    </button>
                    <button onClick={handleSaveGrid} className="flex-[2] bg-green-600 hover:bg-green-500 text-white font-black py-3 rounded-xl shadow-xl border-b-4 border-green-800 transition-all active:scale-95 uppercase text-xs tracking-widest flex items-center justify-center gap-3">
                        <Save size={18}/> LƯU HỆ THỐNG
                    </button>
                </div>
            </div>

            {/* RIGHT COLUMN: RECENT HISTORY */}
            <div className="w-[42%] flex flex-col bg-[#0f172a] rounded-xl border border-slate-800 shadow-2xl overflow-hidden h-full">
                <div className="p-3 bg-slate-900/50 border-b border-slate-800 flex justify-between items-center shrink-0">
                    <h2 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                        <History size={14}/> SỔ NHẬP KHO MỚI NHẤT
                    </h2>
                    <div className="bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800 flex items-center gap-1.5 animate-pulse">
                        <div className="w-1 h-1 bg-green-500 rounded-full"></div>
                        <span className="text-[8px] text-green-500 font-black font-mono">LIVE_UPDATE</span>
                    </div>
                </div>
                <div className="flex-1 overflow-auto custom-scrollbar bg-[#020617]/30">
                    <table className="w-full text-left border-collapse text-[10px]">
                        <thead className="bg-slate-950 text-slate-600 uppercase font-black font-mono sticky top-0 z-10 border-b border-slate-800">
                            <tr>
                                <th className="px-4 py-3">THỜI GIAN</th>
                                <th className="px-4 py-3">MODEL (-30%)</th>
                                <th className="px-4 py-3 text-center">MÃ CODE</th>
                                <th className="px-4 py-3 text-center">C.ĐOẠN</th>
                                <th className="px-4 py-3">SỐ LÔ</th>
                                <th className="px-4 py-3 text-right">SỐ LƯỢNG</th>
                                <th className="px-4 py-3 text-center">THAO TÁC</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                            {recentRecords.length === 0 ? (
                                <tr><td colSpan={7} className="py-20 text-center text-slate-700 italic font-black uppercase text-[10px] tracking-widest opacity-20">No Data Logs</td></tr>
                            ) : (
                                recentRecords.slice(0, 30).map((r) => (
                                    <tr key={r.id} className="hover:bg-white/5 transition-colors group">
                                        <td className="px-4 py-3">
                                            <div className="font-bold text-slate-300 font-mono">{r.timestamp}</div>
                                            <div className="text-[8px] text-slate-600">{r.date}</div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="font-black text-white uppercase text-[10px] truncate max-w-[140px]">{r.model}</div>
                                        </td>
                                        <td className="px-4 py-3 text-center font-mono text-slate-500">{r.code}</td>
                                        <td className="px-4 py-3 text-center">
                                            <span className="px-2 py-0.5 rounded bg-purple-900/30 text-purple-400 border border-purple-800 font-black text-[9px] uppercase">{r.stage}</span>
                                        </td>
                                        <td className="px-4 py-3 font-mono font-bold text-yellow-500 uppercase">{r.lotNo}</td>
                                        <td className="px-4 py-3 text-right font-black text-green-400 text-sm font-mono">{r.quantity.toLocaleString()}</td>
                                        <td className="px-4 py-3 text-center">
                                            <div className="flex justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button className="p-1.5 hover:bg-blue-900/50 text-blue-400 rounded-lg border border-slate-700"><Edit2 size={12}/></button>
                                                {onDelete && <button onClick={() => onDelete(r.id)} className="p-1.5 hover:bg-red-900/50 text-red-400 rounded-lg border border-slate-700"><Trash2 size={12}/></button>}
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
      </div>

      {/* Paste Modal */}
      {showPasteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-slate-800 rounded-2xl shadow-2xl w-full max-w-3xl border border-slate-600 overflow-hidden flex flex-col max-h-[90vh]">
                <div className="px-6 py-4 bg-slate-900 border-b border-slate-700 flex justify-between items-center">
                    <h3 className="font-black text-white flex items-center gap-2 uppercase tracking-wider">
                        <ClipboardPaste size={18} className="text-blue-500"/> Dán dữ liệu hàng loạt (TP)
                    </h3>
                    <button onClick={() => setShowPasteModal(false)} className="hover:bg-slate-800 p-1 rounded-full"><X size={20}/></button>
                </div>
                <div className="p-6 flex flex-col gap-4 flex-1 overflow-hidden">
                    <div className="bg-blue-900/20 border border-blue-500/30 p-3 rounded-lg text-xs text-blue-200">
                        <p className="font-bold mb-1">Cấu trúc dữ liệu hỗ trợ (phân cách bằng khoảng trắng hoặc tab):</p>
                        <p>1. <code>Model</code> <code>Công đoạn</code> <code>Lot No</code> <code>Số lượng</code></p>
                        <p>2. <code>Model</code> <code>Lot No</code> <code>Số lượng</code> (Công đoạn sẽ tự động lấy theo cấu hình)</p>
                    </div>
                    <textarea 
                        className="w-full flex-1 bg-slate-950 border border-slate-700 rounded-xl p-4 text-xs font-mono text-white focus:border-blue-500 outline-none resize-none"
                        placeholder="Dán dữ liệu từ Excel vào đây..."
                        value={pasteText}
                        onChange={(e) => setPasteText(e.target.value)}
                    ></textarea>
                    <div className="flex justify-end gap-2">
                        <button onClick={() => setShowPasteModal(false)} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold rounded-lg uppercase">Hủy</button>
                        <button onClick={handleProcessPaste} className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg uppercase shadow-lg border-b-4 border-blue-800 active:scale-95 transition-all">Xử lý dữ liệu</button>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
