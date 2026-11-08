import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
    Save, RotateCcw, Plus, FileSpreadsheet, CheckCircle, ArrowRight, 
    Database, X, Tag, Upload, Truck, Sun, Moon, AlertCircle, 
    CheckCircle2, ScanBarcode, Keyboard, Activity, HardDrive, 
    Camera, ClipboardPaste, AlertOctagon, Info, Box, Check, History
} from 'lucide-react';
import { ExportRecord, NetDataRecord, ImportRecord, ProductionHistoryRecord, StageProgress } from '../../types';
import { ScannerModal } from '../common/ScannerModal';

interface MultiAutoExportProps {
  moduleName?: string;
  onAddBatch: (records: Omit<ExportRecord, 'id' | 'timestamp' | 'date' | 'shift'>[]) => void;
  recentRecords: ExportRecord[];
  netData: NetDataRecord[];
  importData: ImportRecord[];
  exportData: ExportRecord[];
  historyData?: ProductionHistoryRecord[]; 
}

interface LotItem {
  lot: string;
  qty: number;
  stage: string;
  model: string;
  code: string;
}

export const MultiAutoExport: React.FC<MultiAutoExportProps> = ({ 
    moduleName = 'Multi Auto', 
    onAddBatch, 
    recentRecords, 
    netData, 
    importData, 
    exportData,
    historyData = [] 
}) => {
  const [formData, setFormData] = useState({
    model: '',
    code: '',
  });

  const [currentLot, setCurrentLot] = useState('');
  const [currentQty, setCurrentQty] = useState<string>(''); 
  const [lotItems, setLotItems] = useState<LotItem[]>([]);
  
  // Bulk Paste State
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [bulkInput, setBulkInput] = useState('');
  const [bulkWarnings, setBulkWarnings] = useState<string[]>([]);

  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannerMode, setScannerMode] = useState<'MANUAL' | 'CAMERA'>('MANUAL');

  const qtyInputRef = useRef<HTMLInputElement>(null);
  const lotInputRef = useRef<HTMLInputElement>(null);

  const normalize = (str: string) => str ? str.trim().toUpperCase() : '';

  const uniqueModels = useMemo(() => {
    const modelsFromNet = netData.map(n => normalize(n.model));
    return Array.from(new Set(modelsFromNet)).sort();
  }, [netData]);

  const availableCodes = useMemo(() => {
    if (!formData.model) return [];
    return Array.from(new Set(
        netData
            .filter(n => normalize(n.model) === normalize(formData.model))
            .map(n => normalize(n.code))
    )).sort();
  }, [netData, formData.model]);

  // --- LOGIC HELPER: CHECK IF LOT IS FULLY FINISHED AND GET SPECS ---
  const getLotSpecs = (lotNo: string) => {
      const targetLot = normalize(lotNo);
      if (!targetLot) return null;

      // Tìm bản ghi nhập kho mới nhất của Lot này
      const r = importData.find(item => normalize(item.lotNo) === targetLot);
      if (!r) return { error: 'KHÔNG TÌM THẤY TRÊN HỆ THỐNG' };

      const net = netData.find(n => normalize(n.model) === normalize(r.model) && normalize(n.code) === normalize(r.code));
      if (!net) return { error: 'CHƯA CẤU HÌNH DATA NET' };

      const requiredStages = [net.stage, net.stage2, net.stage3, net.stage4]
          .map(s => normalize(s || ''))
          .filter(Boolean);

      if (requiredStages.length === 0) return { error: 'THIẾU CẤU HÌNH CÔNG ĐOẠN' };

      const progress = r.productionProgress || {};
      const isAllFinished = requiredStages.every(stageName => {
          const stgProg = progress[stageName];
          return stgProg && stgProg.status === 'COMPLETED';
      });

      if (!isAllFinished) return { error: 'CHƯA HOÀN THÀNH SẢN XUẤT' };

      // Tính tồn thực tế
      const totalExported = exportData
          .filter(e => normalize(e.lotNo) === targetLot)
          .reduce((sum, e) => sum + e.quantity, 0);
      
      const pendingInCart = lotItems
          .filter(item => normalize(item.lot) === targetLot)
          .reduce((sum, item) => sum + item.qty, 0);

      const available = r.quantity - totalExported - pendingInCart;

      if (available <= 0) return { error: 'HẾT HÀNG TRONG KHO' };

      return {
          model: r.model,
          code: r.code,
          available: available,
          stage: requiredStages.join(', ')
      };
  };

  const availableLots = useMemo(() => {
    if (!formData.model || !formData.code) return [];

    const targetModel = normalize(formData.model);
    const targetCode = normalize(formData.code);

    const results: { lotNo: string, stage: string, available: number }[] = [];

    importData.forEach(r => {
        if (normalize(r.model) === targetModel && normalize(r.code) === targetCode) {
            const specs = getLotSpecs(r.lotNo);
            if (specs && !('error' in specs)) {
                results.push({
                    lotNo: r.lotNo,
                    stage: specs.stage,
                    available: specs.available
                });
            }
        }
    });

    return results;
  }, [importData, exportData, netData, formData.model, formData.code, lotItems]);

  const handleBulkProcess = () => {
      const lots = bulkInput.split(/\s+/).map(l => normalize(l)).filter(Boolean);
      if (lots.length === 0) return;

      const newItems: LotItem[] = [];
      const errors: string[] = [];

      lots.forEach(lotNo => {
          // Tránh trùng lặp trong chính danh sách đang dán
          if (newItems.some(i => i.lot === lotNo) || lotItems.some(i => i.lot === lotNo)) {
              return;
          }

          const specs = getLotSpecs(lotNo);
          if (specs && !('error' in specs)) {
              newItems.push({
                  lot: lotNo,
                  qty: (specs as any).available,
                  model: (specs as any).model,
                  code: (specs as any).code,
                  stage: (specs as any).stage
              });
          } else {
              errors.push(`${lotNo}: ${specs ? (specs as any).error : 'LỖI HỆ THỐNG'}`);
          }
      });

      if (newItems.length > 0) {
          setLotItems(prev => [...prev, ...newItems]);
      }
      setBulkWarnings(errors);
      setBulkInput('');
      if (newItems.length > 0 && errors.length === 0) {
          setIsBulkMode(false);
      }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'model') {
       setFormData(prev => ({ ...prev, model: value, code: '' }));
       setCurrentLot(''); setCurrentQty('');
    } else if (name === 'code') {
       setFormData(prev => ({ ...prev, [name]: value }));
       setCurrentLot(''); setCurrentQty('');
    } else {
       setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleLotInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputVal = e.target.value.toUpperCase();
      setCurrentLot(inputVal);
      const lotInfo = availableLots.find(l => normalize(l.lotNo) === normalize(inputVal));
      if (lotInfo) setCurrentQty(lotInfo.available.toString());
      else setCurrentQty('');
  };

  const handleScanSuccess = (decodedText: string) => {
    const cleanLot = decodedText.trim().toUpperCase();
    setCurrentLot(cleanLot);
    const lotInfo = availableLots.find(l => normalize(l.lotNo) === normalize(cleanLot));
    if (lotInfo) setCurrentQty(lotInfo.available.toString());
    setTimeout(() => qtyInputRef.current?.focus(), 300);
  };

  const handleLotKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); qtyInputRef.current?.focus(); }
  };

  const handleAddLotItem = () => {
    if (!currentLot) return;
    const lotInfo = availableLots.find(l => normalize(l.lotNo) === normalize(currentLot));
    if (!lotInfo) {
        alert("Lô hàng không tồn tại hoặc chưa hoàn thành đủ các công đoạn.");
        return;
    }
    const qty = parseInt(currentQty);
    if (isNaN(qty) || qty <= 0 || qty > lotInfo.available) {
        alert(`Số lượng không hợp lệ (Tồn khả dụng: ${lotInfo.available})`);
        return;
    }
    setLotItems(prev => [...prev, { 
        lot: currentLot.toUpperCase(), 
        qty: qty, 
        stage: lotInfo.stage,
        model: formData.model,
        code: formData.code
    }]);
    setCurrentLot(''); setCurrentQty('');
    lotInputRef.current?.focus();
  };

  const handleRemoveLotItem = (lotToRemove: string) => {
    setLotItems(prev => prev.filter(item => normalize(item.lot) !== normalize(lotToRemove)));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (lotItems.length === 0) return;

    const batchRecords = lotItems.map(item => ({
        model: item.model,
        code: item.code,
        stage: item.stage,
        quantity: item.qty,
        lotNo: item.lot
    }));

    onAddBatch(batchRecords);
    setLotItems([]);
    setBulkWarnings([]);
    alert("Đã xác nhận xuất kho thành công!");
  };

  return (
    <div className="p-6 h-full overflow-y-auto bg-slate-900 flex flex-col gap-6 text-slate-300">
      {/* Header */}
      <div className="bg-slate-800 px-5 py-3 rounded-xl shadow-lg border border-slate-700 flex flex-col md:flex-row justify-between items-center gap-3 sticky top-0 z-20">
        <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-900/30 rounded border border-blue-600/50 text-blue-400 shrink-0"><Upload size={20} /></div>
            <div>
                <h1 className="text-sm font-bold text-white uppercase tracking-tight font-mono">XUẤT KHO THÀNH PHẨM (FINISHED GOODS)</h1>
                <p className="text-[9px] text-slate-500 font-bold uppercase mt-0.5">Hỗ trợ dập lô thủ công hoặc dán danh sách hàng loạt</p>
            </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 h-full">
        <div className="bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-700 lg:w-1/2 flex flex-col">
          <form onSubmit={handleSubmit} className="space-y-4 flex-1 flex flex-col">
            
            {/* Nhập đơn lẻ (Single Entry Controls) */}
            <div className={`space-y-4 transition-opacity ${isBulkMode ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Tên Model</label>
                        <select name="model" value={formData.model} onChange={handleChange} className="w-full bg-slate-900 border border-slate-600 rounded-md px-3 py-2 text-white font-bold text-sm outline-none focus:border-blue-500">
                            <option value="">-- Chọn Model --</option>
                            {uniqueModels.map((m) => (<option key={m} value={m}>{m}</option>))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Mã Code</label>
                        <select name="code" value={formData.code} onChange={handleChange} className="w-full bg-slate-900 border border-slate-600 rounded-md px-3 py-2 text-white font-mono text-xs outline-none focus:border-blue-500" disabled={!formData.model}>
                            <option value="">-- Chọn Code --</option>
                            {availableCodes.map((c) => (<option key={c} value={c}>{c}</option>))}
                        </select>
                    </div>
                </div>

                <div className="p-4 bg-blue-900/10 rounded-lg border border-blue-500/20 flex flex-col gap-3">
                    <div className="flex justify-between items-center">
                        <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest flex items-center gap-2"><Tag size={14}/> QUÉT/NHẬP LÔ ĐƠN LẺ</label>
                        <button type="button" onClick={() => setIsScannerOpen(true)} className="text-[9px] bg-slate-700 px-2 py-0.5 rounded text-blue-400 hover:text-white transition-all uppercase font-bold border border-slate-600">Scan Camera</button>
                    </div>
                    <div className="flex gap-2 items-end">
                        <div className="flex-1">
                            <div className="relative">
                                <input list="availableLots" ref={lotInputRef} value={currentLot} onChange={handleLotInputChange} onKeyDown={handleLotKeyDown} className="w-full bg-black border border-slate-600 rounded-md px-3 py-2 font-mono text-sm text-blue-400 uppercase outline-none focus:border-blue-500" disabled={!formData.code} placeholder="Nhập/Quét Lot No..."/>
                                <ScanBarcode className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                                <datalist id="availableLots">{availableLots.map(l => (<option key={l.lotNo} value={l.lotNo}>Tồn: {l.available} PNL - CĐ: {l.stage}</option>))}</datalist>
                            </div>
                        </div>
                        <div className="w-20">
                            <input type="number" ref={qtyInputRef} value={currentQty} onChange={(e) => setCurrentQty(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddLotItem()} placeholder="SL" className="w-full bg-black border border-slate-600 rounded-md px-3 py-2 text-white text-center font-bold outline-none focus:border-blue-500" disabled={!currentLot}/>
                        </div>
                        <button type="button" onClick={handleAddLotItem} disabled={!currentLot} className="bg-blue-600 hover:bg-blue-500 text-white p-2.5 rounded-md border border-blue-500 transition-all active:scale-90"><Plus size={20} /></button>
                    </div>
                </div>
            </div>

            {/* Chức năng dán nhiều lô (Bulk Paste UI) */}
            <div className="border-t border-slate-700 pt-4 flex flex-col gap-3">
                 <div className="flex justify-between items-center">
                    <button 
                        type="button" 
                        onClick={() => setIsBulkMode(!isBulkMode)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all shadow-md active:scale-95 border ${isBulkMode ? 'bg-orange-600 text-white border-orange-500' : 'bg-slate-700 text-orange-400 border-slate-600 hover:bg-slate-650'}`}
                    >
                        <ClipboardPaste size={14}/> {isBulkMode ? 'ĐÓNG VÙNG DÁN' : 'DÁN DANH SÁCH LÔ HÀNG LOẠT'}
                    </button>
                    {isBulkMode && (
                        <span className="text-[9px] text-slate-500 italic">Phân cách các mã lô bằng khoảng trắng hoặc phím Enter</span>
                    )}
                 </div>

                 {isBulkMode && (
                    <div className="space-y-3 animate-in slide-in-from-top-2 duration-300">
                        <textarea 
                            value={bulkInput}
                            onChange={e => setBulkInput(e.target.value)}
                            placeholder="Dán danh sách lô tại đây... VD: LOT001 LOT002 LOT003"
                            className="w-full h-32 bg-black border border-slate-600 rounded-xl p-3 text-xs font-mono text-orange-400 focus:border-orange-500 outline-none shadow-inner"
                        />
                        <button 
                            type="button"
                            onClick={handleBulkProcess}
                            disabled={!bulkInput.trim()}
                            className="w-full bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-black py-2.5 rounded-xl uppercase text-[10px] tracking-widest shadow-lg active:scale-95 transition-all"
                        >
                            PHÂN TÍCH VÀ CẬP NHẬT TỰ ĐỘNG
                        </button>
                    </div>
                 )}

                 {/* Cảnh báo lô không hợp lệ khi dán */}
                 {bulkWarnings.length > 0 && (
                     <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-3 space-y-1.5">
                         <div className="flex items-center gap-2 text-red-400 font-black text-[10px] uppercase mb-1">
                             <AlertOctagon size={14}/> Cảnh báo lô chưa sẵn sàng hoặc lỗi:
                         </div>
                         <div className="max-h-24 overflow-y-auto custom-scrollbar space-y-1">
                             {bulkWarnings.map((warn, idx) => (
                                 <div key={idx} className="text-[10px] text-red-300/80 font-medium font-mono leading-tight bg-red-950/20 px-2 py-1 rounded border border-red-900/30">
                                     › {warn}
                                 </div>
                             ))}
                         </div>
                         <button onClick={() => setBulkWarnings([])} className="text-[8px] text-slate-500 hover:text-white uppercase font-bold ml-1 mt-1">Xóa cảnh báo</button>
                     </div>
                 )}
            </div>

            <button type="submit" disabled={lotItems.length === 0} className="w-full bg-green-600 hover:bg-green-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-black py-4 rounded-xl shadow-xl border-b-4 border-green-800 transition-all uppercase text-xs tracking-widest flex items-center justify-center gap-2">
                <CheckCircle2 size={18}/> XÁC NHẬN XUẤT KHO ({lotItems.length})
            </button>
          </form>
        </div>

        {/* List of items in current export batch */}
        <div className="bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-700 lg:w-1/2 flex flex-col overflow-hidden">
            <div className="flex justify-between items-center mb-4 border-b border-slate-700 pb-2 shrink-0">
                <h2 className="text-sm font-black text-white flex items-center gap-2 font-mono uppercase">
                    <History size={18} className="text-blue-500"/> DANH SÁCH CHỜ XUẤT ({lotItems.length})
                </h2>
                <button onClick={() => setLotItems([])} className="text-[9px] font-black text-slate-500 hover:text-red-400 transition-colors uppercase">Xóa trắng danh sách</button>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
                {lotItems.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-600 italic text-[10px] uppercase gap-2 py-20">
                        <Box size={40} className="opacity-10"/>
                        Chưa có lô nào trong danh sách xuất
                    </div>
                ) : (
                    <div className="space-y-2">
                        {lotItems.map((item, idx) => (
                            <div key={idx} className="bg-slate-900 border border-slate-700 rounded-xl p-3 flex justify-between items-center group animate-in slide-in-from-right-4">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <span className="font-mono text-[11px] font-black text-blue-400 uppercase tracking-tighter">{item.lot}</span>
                                        <span className="text-[8px] bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700 text-slate-500 font-bold uppercase">{item.code}</span>
                                    </div>
                                    <div className="text-[10px] font-black text-slate-200 uppercase truncate">{item.model}</div>
                                    <div className="text-[8px] text-slate-500 font-bold mt-1 uppercase italic truncate">HT: {item.stage}</div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="text-right">
                                        <div className="text-xs font-black text-green-400 font-mono">{item.qty.toLocaleString()}</div>
                                        <div className="text-[8px] font-black text-slate-600 uppercase">PNL</div>
                                    </div>
                                    <button onClick={() => handleRemoveLotItem(item.lot)} className="p-1.5 hover:bg-red-900/30 text-slate-500 hover:text-red-400 rounded-lg transition-colors">
                                        <X size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            
            {lotItems.length > 0 && (
                <div className="mt-4 p-3 bg-blue-900/10 border border-blue-500/20 rounded-xl flex justify-between items-center shrink-0">
                    <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Tổng lượng xuất dự kiến:</span>
                    <span className="text-lg font-black text-white font-mono">{lotItems.reduce((s,i)=>s+i.qty, 0).toLocaleString()} PNL</span>
                </div>
            )}
        </div>
      </div>
      
      {/* Recent History Table - Compact View */}
      <div className="bg-slate-800 p-5 rounded-2xl shadow-lg border border-slate-700 flex flex-col overflow-hidden shrink-0 mt-2">
          <div className="flex justify-between items-center mb-3 border-b border-slate-700 pb-2">
            <h2 className="text-[10px] font-black text-slate-500 flex items-center gap-2 font-mono uppercase tracking-widest">
              <FileSpreadsheet size={16} className="text-green-500"/> LỊCH SỬ XUẤT KHO MỚI NHẤT
            </h2>
          </div>
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-[10px] text-left text-slate-400 border-collapse">
              <thead className="bg-slate-900 text-slate-500 uppercase font-black font-mono">
                <tr>
                  <th className="px-4 py-2 border-b border-slate-800">Thời gian</th>
                  <th className="px-4 py-2 border-b border-slate-800">Model</th>
                  <th className="px-4 py-2 border-b border-slate-800">Code</th>
                  <th className="px-4 py-2 border-b border-slate-800">Lot No</th>
                  <th className="px-4 py-2 border-b border-slate-800 text-right">SL (PNL)</th>
                  <th className="px-4 py-2 border-b border-slate-800 text-center">Trạng Thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {recentRecords.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-600 italic">Chưa có dữ liệu xuất trong phiên này.</td></tr>
                ) : (
                  recentRecords.map((record) => (
                    <tr key={record.id} className="hover:bg-slate-700/30 transition-colors">
                      <td className="px-4 py-2 font-mono text-slate-500">{record.timestamp}</td>
                      <td className="px-4 py-2 font-bold text-white uppercase">{record.model}</td>
                      <td className="px-4 py-2 font-mono">{record.code}</td>
                      <td className="px-4 py-2 font-mono font-bold text-blue-400 uppercase">{record.lotNo}</td>
                      <td className="px-4 py-2 text-right font-mono font-bold text-white">{record.quantity}</td>
                      <td className="px-4 py-2 text-center text-green-500 font-bold uppercase text-[9px]">
                         <Check size={14} className="inline mr-1"/> Success
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
      </div>

      <ScannerModal isOpen={isScannerOpen} onClose={() => setIsScannerOpen(false)} onScanSuccess={handleScanSuccess} />
    </div>
  );
};