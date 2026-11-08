
import React, { useState, useMemo } from 'react';
import { Package, Search, Filter, Download, ArrowRight, TrendingDown, Undo2, X, Save, Trash2, ClipboardCheck, RefreshCw, AlertTriangle } from 'lucide-react';
import { ImportRecord, ExportRecord, Language, ProductReturnRecord, UserRole } from '../../types';
import { exportToExcel } from '../../services/excelService';
import { translations } from '../../data/locales';

interface MultiAutoInventoryProps {
  moduleName?: string;
  imports: ImportRecord[];
  exports: ExportRecord[];
  returns?: ProductReturnRecord[]; 
  onReturn?: (record: Omit<ProductReturnRecord, 'id' | 'timestamp' | 'date'>) => void; 
  language?: Language;
  userRole?: UserRole;
  onDelete?: (lotNo: string) => void;
  netData?: any[]; 
  hideDeptFilter?: boolean;
  onFixStock?: (lotNo: string, newQty: number) => void; 
}

interface InventoryItem {
  key: string;
  model: string;
  code: string;
  lotNo: string;
  totalImport: number;
  totalExport: number;
  totalReturned: number;
  stock: number;
  department?: string;
}

interface ComparisonItem {
    lotNo: string;
    systemQty: number;
    pasteQty: number;
    diff: number;
    status: 'MATCH' | 'MISMATCH' | 'MISSING_IN_SYSTEM' | 'MISSING_IN_PASTE';
}

export const MultiAutoInventory: React.FC<MultiAutoInventoryProps> = ({ 
    moduleName = 'Multi Auto', 
    imports, 
    exports, 
    returns = [],
    onReturn,
    language = 'vi', // Changed default to 'vi'
    userRole,
    onDelete,
    netData = [],
    hideDeptFilter,
    onFixStock
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);

  // Comparison State
  const [isCompareMode, setIsCompareMode] = useState(false);
  const [pasteContent, setPasteContent] = useState('');

  const [returnModel, setReturnModel] = useState('');
  const [returnLot, setReturnLot] = useState('');
  const [returnQty, setReturnQty] = useState<string>('');
  const [returnReason, setReturnReason] = useState('');

  // Fallback translation to prevent crash if language key is missing
  const t = translations[language] || translations['vi'];

  const inventoryData = useMemo(() => {
    const inventoryMap = new Map<string, InventoryItem>();

    const getOrCreateItem = (model: string, code: string, lotNo: string) => {
        const key = lotNo; 
        if (!inventoryMap.has(key)) {
            inventoryMap.set(key, {
                key,
                model: model || '',
                code: code || '',
                lotNo: lotNo || '',
                totalImport: 0,
                totalExport: 0,
                totalReturned: 0,
                stock: 0
            });
        }
        return inventoryMap.get(key)!;
    };

    imports.forEach(record => {
      const item = getOrCreateItem(record.model, record.code, record.lotNo);
      item.totalImport += record.quantity;
      item.stock += record.quantity; 
    });

    exports.forEach(record => {
      if (inventoryMap.has(record.lotNo)) {
          const item = inventoryMap.get(record.lotNo)!;
          item.totalExport += record.quantity;
          item.stock -= record.quantity;
      }
    });

    returns.forEach(ret => {
        if (inventoryMap.has(ret.lotNo)) {
            const item = inventoryMap.get(ret.lotNo)!;
            item.totalReturned += ret.quantity;
            item.stock -= ret.quantity;
        }
    });

    return Array.from(inventoryMap.values()).filter(i => i.stock > 0);
  }, [imports, exports, returns]);

  const filteredData = useMemo(() => {
    return inventoryData.filter(item => 
      (item.model || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.code || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.lotNo || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [inventoryData, searchTerm]);

  // --- COMPARISON LOGIC ---
  const comparisonData = useMemo(() => {
      if (!pasteContent.trim()) return [];

      const lines = pasteContent.trim().split(/\s+/); // Split by whitespace (space, tab, newline)
      const pasteMap = new Map<string, number>();
      
      // Parse format: LOT QTY LOT QTY ...
      for (let i = 0; i < lines.length; i++) {
          const possibleLot = lines[i].trim().toUpperCase();
          // Try to get next token as number
          if (i + 1 < lines.length) {
              const qty = parseFloat(lines[i+1]);
              if (!isNaN(qty)) {
                  pasteMap.set(possibleLot, (pasteMap.get(possibleLot) || 0) + qty);
                  i++; // Skip the qty token
              }
          }
      }

      const results: ComparisonItem[] = [];
      const systemLots = new Set<string>(inventoryData.map(i => i.lotNo));
      
      const allLots = new Set<string>();
      systemLots.forEach(lot => allLots.add(lot));
      
      // Use forEach on map to safely get keys (lots)
      pasteMap.forEach((_, lot) => {
          allLots.add(lot);
      });

      // Explicitly convert Set to Array to avoid iteration issues with 'unknown' type
      const lotsArray: string[] = Array.from(allLots);
      
      for (const lot of lotsArray) {
          const sysItem = inventoryData.find(i => i.lotNo === lot);
          const sysQty = sysItem ? sysItem.stock : 0;
          const pasteQty = pasteMap.get(lot) ?? 0;
          
          let status: ComparisonItem['status'] = 'MATCH';
          if (!sysItem && pasteQty > 0) status = 'MISSING_IN_SYSTEM';
          else if (sysItem && !pasteMap.has(lot)) status = 'MISSING_IN_PASTE';
          else if (sysQty !== pasteQty) status = 'MISMATCH';

          // Filter by search term if exists
          if (searchTerm && !lot.includes(searchTerm.toUpperCase())) continue;

          if (status !== 'MATCH' || searchTerm) { // Show all if searching, otherwise show diffs/matches
             results.push({ lotNo: lot, systemQty: sysQty, pasteQty, diff: sysQty - pasteQty, status });
          }
      }

      // Sort: Mismatches first
      return results.sort((a, b) => {
          const score = (s: string) => s === 'MISMATCH' ? 0 : s === 'MISSING_IN_SYSTEM' ? 1 : 2;
          return score(a.status) - score(b.status);
      });
  }, [pasteContent, inventoryData, searchTerm]);

  const handleFixStock = (lot: string, targetQty: number) => {
      if (onFixStock) {
          if (window.confirm(`Xác nhận cập nhật tồn kho lô ${lot} thành ${targetQty}?`)) {
             onFixStock(lot, targetQty);
          }
      }
  };

  const handleFixAll = () => {
      if (!onFixStock) return;
      const mismatches = comparisonData.filter(i => i.status === 'MISMATCH' || i.status === 'MISSING_IN_SYSTEM');
      if (mismatches.length === 0) return;

      if (window.confirm(`Xác nhận cập nhật đồng loạt ${mismatches.length} lô hàng lệch kho?`)) {
          mismatches.forEach(item => {
              // Only update if we have a valid positive target from paste
              if (item.pasteQty >= 0) {
                  onFixStock(item.lotNo, item.pasteQty);
              }
          });
      }
  };

  const totalStock = filteredData.reduce((sum, item) => sum + item.stock, 0);

  // Return form helper lists
  const availableReturnLots = useMemo(() => {
      if (!returnModel) return [];
      return inventoryData.filter(i => i.model === returnModel && i.stock > 0);
  }, [inventoryData, returnModel]);

  const selectedLotStock = useMemo(() => {
      return availableReturnLots.find(l => l.lotNo === returnLot)?.stock || 0;
  }, [availableReturnLots, returnLot]);


  const handleExportExcel = () => {
    const headers = [t.inv_stt, t.inv_model, t.inv_code, "Lot No", t.inv_import, t.inv_export, t.total_returned, t.inv_stock];
    const rows = filteredData.map((item, index) => [
        index + 1,
        item.model,
        item.code,
        item.lotNo,
        item.totalImport,
        item.totalExport,
        item.totalReturned,
        item.stock
    ]);
    const excelData = [headers, ...rows];
    const dateStr = new Date().toLocaleDateString('en-GB').replace(/\//g, '-');
    const filename = `BaoCao_TonKho_${moduleName.replace(/\s+/g, '')}_${dateStr}`;
    exportToExcel(excelData, filename);
  };

  const handleSubmitReturn = (e: React.FormEvent) => {
      e.preventDefault();
      const lotInfo = availableReturnLots.find(l => l.lotNo === returnLot);
      if (!returnModel || !returnLot || !lotInfo) {
          alert("Vui lòng chọn Model và Lot hợp lệ.");
          return;
      }
      
      const qty = parseInt(returnQty);
      if (isNaN(qty) || qty <= 0) {
          alert("Số lượng hoàn trả không hợp lệ.");
          return;
      }

      if (qty > lotInfo.stock) {
          alert(`Số lượng trả (${qty}) không thể lớn hơn tồn kho hiện tại của Lot này (${lotInfo.stock}).`);
          return;
      }

      if (onReturn) {
          onReturn({
              model: returnModel,
              code: lotInfo.code,
              lotNo: returnLot,
              quantity: qty,
              reason: returnReason
          });
          alert("Đã lưu phiếu hoàn trả thành công!");
          setIsReturnModalOpen(false);
          setReturnModel('');
          setReturnLot('');
          setReturnQty('');
          setReturnReason('');
      }
  };

  const handleDelete = (lotNo: string) => {
      if (onDelete) onDelete(lotNo);
  };

  return (
    <div className="p-6 h-full overflow-y-auto bg-slate-900 flex flex-col gap-6 relative text-slate-300">
      
      {/* Header */}
      <div className="bg-slate-800 px-3 py-2 md:px-4 md:py-3 rounded-lg shadow-lg border border-slate-700 flex flex-col md:flex-row justify-between items-center gap-3 sticky top-0 z-20">
        <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="p-1.5 bg-yellow-900/30 rounded border border-yellow-700 text-yellow-500 shrink-0">
               <Package size={18} />
            </div>
            <h1 className="text-sm md:text-base font-bold text-white uppercase tracking-tight truncate font-mono">
              {t.inv_title} ({moduleName})
            </h1>
        </div>
        
        {/* Compact Summary */}
        <div className="px-3 py-1 bg-yellow-900/30 rounded border border-yellow-700 flex flex-col items-center">
            <span className="text-[9px] md:text-[10px] text-yellow-500 font-bold uppercase">{t.total_stock}</span>
            <span className="text-sm md:text-base font-bold text-yellow-400">{totalStock.toLocaleString()} PNL</span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-slate-800 p-3 rounded-lg shadow-sm border border-slate-700 flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
          <input 
            type="text" 
            placeholder={t.search_placeholder} 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-sm bg-slate-900 border border-slate-600 rounded-md focus:ring-1 focus:ring-yellow-500 focus:outline-none text-white placeholder-slate-600"
          />
        </div>
        
        {onFixStock && (
            <button 
                onClick={() => setIsCompareMode(!isCompareMode)}
                className={`flex items-center gap-1 px-3 py-1.5 text-sm font-bold rounded shadow-sm transition-colors border ${isCompareMode ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-700 text-slate-300 border-slate-600'}`}
            >
                <ClipboardCheck size={16} /> Đối chiếu
            </button>
        )}

        <button 
            onClick={() => setIsReturnModalOpen(true)}
            className="flex items-center gap-1 px-3 py-1.5 bg-red-700 hover:bg-red-600 text-white text-sm font-bold rounded shadow-sm transition-colors border border-red-600"
        >
           <Undo2 size={16} /> {t.btn_return}
        </button>

        <button 
            onClick={handleExportExcel}
            className="flex items-center gap-1 px-3 py-1.5 bg-green-700 hover:bg-green-600 text-white text-sm font-bold rounded shadow-sm transition-colors border border-green-600"
        >
           <Download size={16} /> Excel
        </button>
      </div>

      {/* COMPARISON PANEL */}
      {isCompareMode && (
          <div className="bg-slate-800 rounded-xl border border-indigo-500/50 p-4 shadow-2xl animate-in slide-in-from-top-4 flex flex-col gap-4">
              <div className="flex justify-between items-center border-b border-slate-700 pb-2">
                  <h3 className="font-bold text-indigo-400 flex items-center gap-2"><ClipboardCheck size={18}/> ĐỐI CHIẾU TỒN KHO (Paste Data)</h3>
                  <button onClick={handleFixAll} className="bg-red-600 hover:bg-red-500 text-white px-3 py-1 rounded text-xs font-bold flex items-center gap-1 transition-colors border border-red-500">
                      <RefreshCw size={12}/> CẬP NHẬT TẤT CẢ ({comparisonData.filter(i=>i.status==='MISMATCH').length})
                  </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                      <label className="text-xs font-bold text-slate-400 uppercase">Dán dữ liệu (Lot Qty Lot Qty...)</label>
                      <textarea 
                          value={pasteContent}
                          onChange={e => setPasteContent(e.target.value)}
                          className="flex-1 bg-slate-900 border border-slate-600 rounded-lg p-2 text-xs font-mono text-white resize-none focus:border-indigo-500 outline-none h-40"
                          placeholder="Ví dụ: LOT001 500 LOT002 100..."
                      />
                  </div>
                  <div className="flex flex-col gap-2 overflow-hidden">
                       <label className="text-xs font-bold text-slate-400 uppercase flex justify-between">
                           <span>Kết quả đối chiếu</span>
                           <span>Tổng: {comparisonData.length}</span>
                       </label>
                       <div className="flex-1 bg-slate-900 border border-slate-600 rounded-lg overflow-y-auto custom-scrollbar h-40">
                           <table className="w-full text-xs text-left">
                               <thead className="bg-slate-950 text-slate-500 sticky top-0">
                                   <tr>
                                       <th className="p-2">Lot No</th>
                                       <th className="p-2 text-right">System</th>
                                       <th className="p-2 text-right">Paste</th>
                                       <th className="p-2 text-center">TT</th>
                                       <th className="p-2 text-center">Fix</th>
                                   </tr>
                               </thead>
                               <tbody className="divide-y divide-slate-800">
                                   {comparisonData.map((item, idx) => (
                                       <tr key={idx} className="hover:bg-slate-800/50">
                                           <td className="p-2 font-mono font-bold text-indigo-300">{item.lotNo}</td>
                                           <td className="p-2 text-right text-slate-300">{item.systemQty}</td>
                                           <td className="p-2 text-right text-yellow-400">{item.pasteQty}</td>
                                           <td className="p-2 text-center">
                                               {item.status === 'MATCH' && <span className="text-green-500 font-bold">OK</span>}
                                               {item.status === 'MISMATCH' && <span className="text-red-500 font-bold">LỆCH</span>}
                                               {item.status === 'MISSING_IN_SYSTEM' && <span className="text-orange-500 font-bold text-[9px]">THIẾU SYS</span>}
                                               {item.status === 'MISSING_IN_PASTE' && <span className="text-slate-500 font-bold text-[9px]">THIẾU PASTE</span>}
                                           </td>
                                           <td className="p-2 text-center">
                                               {(item.status === 'MISMATCH' || item.status === 'MISSING_IN_SYSTEM') && (
                                                   <button 
                                                        onClick={() => handleFixStock(item.lotNo, item.pasteQty)}
                                                        className="text-[9px] bg-indigo-600 hover:bg-indigo-500 text-white px-2 py-0.5 rounded transition-colors"
                                                    >
                                                       SỬA
                                                    </button>
                                               )}
                                           </td>
                                       </tr>
                                   ))}
                               </tbody>
                           </table>
                       </div>
                  </div>
              </div>
          </div>
      )}

      {/* Inventory Table */}
      <div className="bg-slate-800 rounded-xl shadow-lg border border-slate-700 flex-1 flex flex-col overflow-hidden min-h-[300px]">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-sm text-left text-slate-300">
            <thead className="text-xs text-slate-500 uppercase bg-slate-900 sticky top-0 z-10 font-mono font-bold">
              <tr>
                <th className="px-6 py-3 border-b border-slate-700">{t.inv_stt}</th>
                <th className="px-6 py-3 border-b border-slate-700">{t.inv_model}</th>
                <th className="px-6 py-3 border-b border-slate-700">{t.inv_code}</th>
                <th className="px-6 py-3 border-b border-slate-700">Lot No</th>
                <th className="px-6 py-3 border-b border-slate-700 text-right text-green-500 bg-green-900/10">{t.inv_import}</th>
                <th className="px-6 py-3 border-b border-slate-700 text-right text-blue-500 bg-blue-900/10">{t.inv_export}</th>
                <th className="px-6 py-3 border-b border-slate-700 text-right text-red-500 bg-red-900/10">{t.total_returned}</th>
                <th className="px-6 py-3 border-b border-slate-700 text-right text-yellow-500 bg-yellow-900/10">{t.inv_stock}</th>
                {userRole === 'admin' && <th className="px-6 py-3 border-b border-slate-700 text-center text-red-500">Admin</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {filteredData.length === 0 ? (
                <tr>
                   <td colSpan={userRole === 'admin' ? 9 : 8} className="px-6 py-12 text-center text-slate-500 italic">
                      {t.msg_no_data}
                   </td>
                </tr>
              ) : (
                filteredData.map((item, index) => (
                  <tr key={item.key} className="bg-slate-800 hover:bg-slate-700/50 transition-colors">
                    <td className="px-6 py-2 font-mono text-slate-500">{index + 1}</td>
                    <td className="px-6 py-2 font-bold text-white text-base">{item.model}</td>
                    <td className="px-6 py-2 font-mono">
                        <span className="bg-slate-900 text-slate-300 px-2 py-1 rounded border border-slate-600">{item.code}</span>
                    </td>
                    <td className="px-6 py-2 font-mono text-yellow-500 font-bold">{item.lotNo}</td>
                    
                    <td className="px-6 py-2 text-right font-mono text-green-400 bg-green-900/20 font-bold text-sm">
                        {item.totalImport.toLocaleString()}
                    </td>
                    
                    <td className="px-6 py-2 text-right font-mono text-blue-400 bg-blue-900/20 font-bold text-sm">
                        {item.totalExport > 0 ? item.totalExport.toLocaleString() : '-'}
                    </td>

                    <td className="px-6 py-2 text-right font-mono text-red-400 bg-red-900/20 font-bold text-sm">
                        {item.totalReturned > 0 ? item.totalReturned.toLocaleString() : '-'}
                    </td>
                    
                    <td className="px-6 py-2 text-right font-mono font-bold text-base text-yellow-400 bg-yellow-900/20">
                        {item.stock.toLocaleString()}
                    </td>
                    
                    {userRole === 'admin' && (
                        <td className="px-6 py-2 text-center">
                            <button 
                                onClick={() => handleDelete(item.lotNo)}
                                className="p-1.5 hover:bg-red-900/30 text-slate-600 hover:text-red-500 rounded transition-colors"
                                title="Xóa toàn bộ lô hàng này"
                            >
                                <Trash2 size={16}/>
                            </button>
                        </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Return Modal */}
      {isReturnModalOpen && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
              <div className="bg-slate-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-600">
                  <div className="px-6 py-3 bg-red-700 flex justify-between items-center text-white">
                      <h2 className="text-base font-bold flex items-center gap-2">
                          <Undo2 size={18}/> {t.return_title} (Thành Phẩm)
                      </h2>
                      <button onClick={() => setIsReturnModalOpen(false)} className="hover:bg-white/20 p-1 rounded transition-colors">
                          <X size={18}/>
                      </button>
                  </div>
                  
                  <form onSubmit={handleSubmitReturn} className="p-6 space-y-4">
                      
                      <div>
                          <label className="block text-xs font-bold text-slate-400 uppercase mb-1">{t.inv_model} <span className="text-red-500">*</span></label>
                          <select 
                               value={returnModel} 
                               onChange={(e) => {
                                   setReturnModel(e.target.value);
                                   setReturnLot('');
                                   setReturnQty('');
                               }}
                               className="w-full bg-slate-900 border border-slate-600 rounded-md px-3 py-2 focus:ring-1 focus:ring-red-500 focus:outline-none text-sm text-white"
                               required
                          >
                              <option value="">-- Chọn Model --</option>
                              {Array.from(new Set(inventoryData.filter(i => i.stock > 0).map(m => m.model))).map(m => (
                                  <option key={m} value={m}>{m}</option>
                              ))}
                          </select>
                      </div>

                      <div>
                          <label className="block text-xs font-bold text-slate-400 uppercase mb-1">{t.lot_tp} <span className="text-red-500">*</span></label>
                          <select 
                               value={returnLot} 
                               onChange={(e) => setReturnLot(e.target.value)}
                               className="w-full bg-slate-900 border border-slate-600 rounded-md px-3 py-2 focus:ring-1 focus:ring-red-500 focus:outline-none text-sm text-white font-mono"
                               required
                               disabled={!returnModel}
                          >
                              <option value="">-- Chọn Lot --</option>
                              {availableReturnLots.map(l => (
                                  <option key={l.lotNo} value={l.lotNo}>{l.lotNo} (Tồn: {l.stock})</option>
                              ))}
                          </select>
                      </div>

                      <div>
                          <label className="block text-xs font-bold text-slate-400 uppercase mb-1">{t.return_qty} (PNL) <span className="text-red-500">*</span></label>
                          <div className="relative">
                            <input 
                                    type="number"
                                    min="1" 
                                    max={selectedLotStock}
                                    value={returnQty} 
                                    onChange={(e) => setReturnQty(e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-600 rounded-md px-3 py-2 focus:ring-1 focus:ring-red-500 focus:outline-none text-sm font-bold text-center text-white"
                                    placeholder="SL (PNL)"
                                    required
                                    disabled={!returnLot}
                            />
                            {returnLot && (
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 font-medium">
                                    Max: {selectedLotStock}
                                </span>
                            )}
                          </div>
                      </div>

                      <div>
                          <label className="block text-xs font-bold text-slate-400 uppercase mb-1">{t.return_reason}</label>
                          <textarea 
                            value={returnReason} 
                            onChange={(e) => setReturnReason(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-600 rounded-md px-3 py-2 focus:ring-1 focus:ring-red-500 focus:outline-none text-sm resize-none h-20 text-white"
                            placeholder="Nhập lý do hoàn trả..."
                          />
                      </div>

                      <div className="pt-4 flex gap-3 border-t border-slate-700 mt-2">
                          <button 
                            type="submit"
                            className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-2 rounded shadow-sm flex items-center justify-center gap-2 transition-colors text-sm"
                          >
                              <Save size={16}/> {t.btn_save}
                          </button>
                          <button 
                            type="button"
                            onClick={() => setIsReturnModalOpen(false)}
                            className="px-6 bg-slate-700 hover:bg-slate-600 text-slate-300 font-bold py-2 rounded transition-colors text-sm"
                          >
                              {t.btn_cancel}
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};
