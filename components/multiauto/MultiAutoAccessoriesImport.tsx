
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Save, Plus, FileSpreadsheet, History, Trash2, ChevronDown, Download, Edit2, ClipboardPaste, CalendarClock, Database, X } from 'lucide-react';
import { AccessoryRecord, NetDataRecord } from '../../types';
import { exportToExcel } from '../../services/excelService';

interface GridRow {
  model: string;
  code: string;
  lotNo: string;
  stage: string;
  quantity: string;
  expDate: string;
}

const STIFF_STAGES = ['1L-1', '1L-2', '2L-1', '2L-2', '3L-1', '3L-2', '4L-1', '4L-2', 'TOP', 'BOT', 'Solder', 'Jig', 'Pressing', 'Process'];

export const MultiAutoAccessoriesImport: React.FC<{
  onAddBatch: (records: Omit<AccessoryRecord, 'id' | 'timestamp' | 'date' | 'shift'>[]) => void;
  recentRecords: AccessoryRecord[];
  netData: NetDataRecord[];
  onDelete?: (id: number) => void;
}> = ({ onAddBatch, recentRecords, netData, onDelete }) => {
  const [gridData, setGridData] = useState<GridRow[]>(Array(20).fill(null).map(() => ({
    model: '', code: '', lotNo: '', stage: '', quantity: '', expDate: ''
  })));
  
  const [activeCell, setActiveCell] = useState<{ row: number, col: keyof GridRow } | null>(null);
  const lotRefs = useRef<(HTMLInputElement | null)[]>([]);
  
  // Paste Modal State
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pasteText, setPasteText] = useState('');

  const uniqueModels = useMemo(() => Array.from(new Set(netData.map(d => d.model))).sort(), [netData]);

  const handleModelChange = (rowIndex: number, model: string) => {
    const match = netData.find(d => d.model === model);
    const newGrid = [...gridData];
    newGrid[rowIndex] = {
      ...newGrid[rowIndex],
      model: model,
      code: match?.code || '',
      stage: match?.stage || newGrid[rowIndex].stage || 'Process'
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
            const parts = line.trim().split(/[\t\s]+/);
            // Expected: Model | Stage | Lot | Qty | ExpDate
            
            const model = parts[0]?.toUpperCase() || '';
            let stage = '';
            let lotNo = '';
            let quantity = '';
            let expDate = '';

            // Logic phân tích linh hoạt
            if (parts.length >= 5) {
                stage = parts[1];
                lotNo = parts[2]?.toUpperCase();
                quantity = parts[3];
                expDate = parts[4];
            } else if (parts.length === 4) {
                 // Model | Stage | Lot | Qty (No Exp)
                 stage = parts[1];
                 lotNo = parts[2]?.toUpperCase();
                 quantity = parts[3];
            } else if (parts.length === 3) {
                 // Model | Lot | Qty
                 lotNo = parts[1]?.toUpperCase();
                 quantity = parts[2];
            }

            // Tìm code tự động
            const match = netData.find(d => d.model === model);
            if (!stage && match) stage = 'Process';

            newGrid[idx] = {
                model,
                code: match?.code || '',
                stage,
                lotNo,
                quantity: quantity.replace(/[^0-9]/g, ''),
                expDate: expDate
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
        stage: r.stage || 'Process',
        quantity: parseInt(r.quantity),
        lotNo: r.lotNo.toUpperCase(),
        expirationDate: r.expDate
      }));

    if (validRecords.length === 0) {
      alert("Vui lòng nhập thông tin trước khi lưu.");
      return;
    }

    onAddBatch(validRecords);
    setGridData(Array(20).fill(null).map(() => ({
      model: '', code: '', lotNo: '', stage: '', quantity: '', expDate: ''
    })));
    alert(`Đã lưu thành công ${validRecords.length} lô phụ liệu!`);
  };

  return (
    <div className="p-4 h-full bg-[#020617] flex flex-col gap-4 text-slate-300 font-sans overflow-hidden">
      {/* Top Header Bar */}
      <div className="flex justify-between items-center bg-[#0f172a] p-3 rounded-lg border border-slate-800 shadow-lg shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-blue-600/20 rounded text-blue-500 border border-blue-500/30">
            <Database size={20}/>
          </div>
          <h1 className="text-xs font-black uppercase font-mono tracking-widest text-white">NHẬP PHỤ LIỆU (MULTI AUTO)</h1>
        </div>
        <button onClick={() => exportToExcel([], "Template_PL")} className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 text-[10px] font-black rounded border border-slate-700 flex items-center gap-2 uppercase tracking-widest transition-all">
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
                            <FileSpreadsheet size={14}/> NHẬP LIỆU PHỤ LIỆU GRID
                        </h2>
                        <span className="text-[9px] text-slate-500 font-bold italic">Ctrl+D: Copy ô trên</span>
                    </div>
                    
                    <div className="flex-1 overflow-auto custom-scrollbar bg-[#020617]/50">
                        <table className="w-full border-collapse text-[11px] table-fixed">
                            <thead className="bg-slate-900/80 text-slate-500 uppercase font-black font-mono sticky top-0 z-20 shadow-md">
                                <tr>
                                    <th className="w-10 py-3 text-center border-r border-b border-slate-800">#</th>
                                    <th className="w-[28%] px-4 border-r border-b border-slate-800 text-left">MODEL</th>
                                    <th className="w-[15%] px-4 border-r border-b border-slate-800 text-left">CODE</th>
                                    <th className="w-[20%] px-4 border-r border-b border-slate-800 text-left">LOT PL</th>
                                    <th className="w-[10%] px-2 border-r border-b border-slate-800 text-center">CĐ</th>
                                    <th className="w-[12%] px-4 border-r border-b border-slate-800 text-center">SL</th>
                                    <th className="w-[15%] px-4 border-b border-slate-800 text-center">HẠN SD</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {gridData.map((row, rIdx) => (
                                    <tr key={rIdx} className="hover:bg-white/5 transition-colors group">
                                        <td className="text-center text-slate-600 font-mono bg-slate-900/30 border-r border-slate-800">{rIdx + 1}</td>
                                        
                                        <td className="p-0 border-r border-slate-800 relative">
                                            <select 
                                                value={row.model} 
                                                onChange={(e) => handleModelChange(rIdx, e.target.value)}
                                                onFocus={() => setActiveCell({ row: rIdx, col: 'model' })}
                                                className="w-full h-9 bg-transparent text-blue-400 font-bold px-3 outline-none appearance-none cursor-pointer"
                                            >
                                                <option value="" className="bg-slate-900">-</option>
                                                {uniqueModels.map(m => <option key={m} value={m} className="bg-slate-900">{m}</option>)}
                                            </select>
                                            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-700 pointer-events-none" size={12}/>
                                        </td>

                                        <td className="p-0 border-r border-slate-800 bg-slate-900/20">
                                            <input readOnly value={row.code} className="w-full h-9 bg-transparent px-3 text-slate-500 font-mono text-[10px] outline-none text-center" />
                                        </td>

                                        <td className="p-0 border-r border-slate-800">
                                            <input 
                                                ref={el => lotRefs.current[rIdx] = el}
                                                value={row.lotNo} 
                                                onChange={(e) => updateCell(rIdx, 'lotNo', e.target.value.toUpperCase())}
                                                onKeyDown={(e) => handleLotKeyDown(e, rIdx)}
                                                onFocus={() => setActiveCell({ row: rIdx, col: 'lotNo' })}
                                                className="w-full h-9 bg-transparent px-3 text-slate-300 font-mono font-bold outline-none focus:bg-slate-900" 
                                                placeholder=""
                                            />
                                        </td>

                                        <td className="p-0 border-r border-slate-800 relative">
                                            <select 
                                                value={row.stage} 
                                                onChange={(e) => updateCell(rIdx, 'stage', e.target.value)}
                                                onFocus={() => setActiveCell({ row: rIdx, col: 'stage' })}
                                                className="w-full h-9 bg-transparent text-blue-400 font-black px-1 outline-none appearance-none text-center"
                                            >
                                                <option value="" className="bg-slate-900">-</option>
                                                {STIFF_STAGES.map(s => <option key={s} value={s} className="bg-slate-900">{s}</option>)}
                                            </select>
                                        </td>

                                        <td className="p-0 border-r border-slate-800">
                                            <input 
                                                type="number"
                                                value={row.quantity} 
                                                onChange={(e) => updateCell(rIdx, 'quantity', e.target.value)}
                                                onFocus={() => setActiveCell({ row: rIdx, col: 'quantity' })}
                                                className="w-full h-9 bg-transparent px-3 text-white font-black outline-none text-center focus:bg-slate-900"
                                                placeholder="0"
                                            />
                                        </td>

                                        <td className="p-0">
                                            <input 
                                                value={row.expDate} 
                                                onChange={(e) => updateCell(rIdx, 'expDate', e.target.value)}
                                                onFocus={() => setActiveCell({ row: rIdx, col: 'expDate' })}
                                                className="w-full h-9 bg-transparent px-2 text-slate-400 font-mono outline-none text-center focus:bg-slate-900"
                                                placeholder="DD/MM"
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="flex gap-4 shrink-0">
                    <button onClick={() => setShowPasteModal(true)} className="flex-1 py-3 bg-[#1e293b] hover:bg-slate-700 text-slate-400 font-black rounded-xl border border-slate-700 flex items-center justify-center gap-2 uppercase tracking-widest text-[11px]">
                        <ClipboardPaste size={16}/> DÁN NHANH
                    </button>
                    <button onClick={handleSaveGrid} className="flex-[2] bg-blue-600 hover:bg-blue-500 text-white font-black py-3 rounded-xl shadow-xl border-b-4 border-blue-800 transition-all active:scale-95 uppercase text-xs tracking-widest flex items-center justify-center gap-3">
                        <Save size={18}/> LƯU PHỤ LIỆU
                    </button>
                </div>
            </div>

            {/* RIGHT COLUMN: HISTORY */}
            <div className="w-[42%] flex flex-col bg-[#0f172a] rounded-xl border border-slate-800 shadow-2xl overflow-hidden h-full">
                <div className="p-3 bg-slate-900/50 border-b border-slate-800 flex justify-between items-center shrink-0">
                    <h2 className="text-[10px] font-black text-blue-400 uppercase tracking-widest flex items-center gap-2">
                        <History size={14}/> NHẬP PL GẦN ĐÂY
                    </h2>
                    <CalendarClock size={14} className="text-slate-600"/>
                </div>
                <div className="flex-1 overflow-auto custom-scrollbar bg-[#020617]/30">
                    <table className="w-full text-left border-collapse text-[10px]">
                        <thead className="bg-slate-950 text-slate-600 uppercase font-black font-mono sticky top-0 z-10 border-b border-slate-800">
                            <tr>
                                <th className="px-4 py-3">MÔ TẢ</th>
                                <th className="px-4 py-3">LOT PL</th>
                                <th className="px-4 py-3 text-right">SL (EA)</th>
                                <th className="px-4 py-3 text-center">THAO TÁC</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                            {recentRecords.length === 0 ? (
                                <tr><td colSpan={4} className="py-20 text-center text-slate-700 italic font-black uppercase text-[10px] tracking-widest opacity-20">Trống</td></tr>
                            ) : (
                                recentRecords.slice(0, 30).map((r) => (
                                    <tr key={r.id} className="hover:bg-white/5 transition-colors group">
                                        <td className="px-4 py-3">
                                            <div className="font-black text-white uppercase text-[10px] truncate max-w-[120px]">{r.model}</div>
                                            <div className="text-[8px] text-slate-600 font-mono">{r.code} • {r.stage}</div>
                                        </td>
                                        <td className="px-4 py-3 font-mono font-bold text-cyan-400 uppercase">{r.lotNo}</td>
                                        <td className="px-4 py-3 text-right font-black text-blue-400 text-sm font-mono">{r.quantity.toLocaleString()}</td>
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
                        <ClipboardPaste size={18} className="text-blue-500"/> Dán dữ liệu hàng loạt (PL)
                    </h3>
                    <button onClick={() => setShowPasteModal(false)} className="hover:bg-slate-800 p-1 rounded-full"><X size={20}/></button>
                </div>
                <div className="p-6 flex flex-col gap-4 flex-1 overflow-hidden">
                    <div className="bg-blue-900/20 border border-blue-500/30 p-3 rounded-lg text-xs text-blue-200">
                        <p className="font-bold mb-1">Cấu trúc dữ liệu hỗ trợ (phân cách bằng khoảng trắng hoặc tab):</p>
                        <p>1. <code>Model</code> <code>Công đoạn</code> <code>Lot No</code> <code>Số lượng</code> <code>Hạn SD</code></p>
                        <p>2. <code>Model</code> <code>Công đoạn</code> <code>Lot No</code> <code>Số lượng</code></p>
                        <p>3. <code>Model</code> <code>Lot No</code> <code>Số lượng</code> (Công đoạn mặc định: Process)</p>
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
