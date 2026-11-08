
import React, { useState, useMemo, useEffect } from 'react';
import { 
    ArchiveRestore, Search, Download, Calendar, Layers, 
    Undo2, Activity, HardDrive, BarChart3, TrendingUp, 
    History, Box, CheckCircle2, AlertTriangle, Clock, X, Save,
    Monitor, Check, Zap, Hash, Database, Info, Trash2
} from 'lucide-react';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
    ResponsiveContainer, Cell, Legend 
} from 'recharts';
import { AccessoryRecord, AccessoryUsageRecord, AccessoryReturnRecord, Language, ProductionHistoryRecord, NetDataRecord, UserRole, ImportRecord, StageProgress } from '../../types';
import { exportToExcel } from '../../services/excelService';
import { translations } from '../../data/locales';

interface MultiAutoAccessoriesInventoryProps {
  moduleName?: string;
  imports: AccessoryRecord[];
  usage?: AccessoryUsageRecord[];
  returns?: AccessoryReturnRecord[]; 
  onReturn?: (record: Omit<AccessoryReturnRecord, 'id' | 'timestamp' | 'date'>) => void; 
  language?: Language;
  netData?: NetDataRecord[]; 
  historyData?: ProductionHistoryRecord[];
  productionData?: ImportRecord[];
  userRole?: UserRole;
  onDelete?: (lotNo: string) => void;
}

interface InventoryItem {
  key: string; 
  model: string;
  code: string;
  lotNo: string;
  stage: string;
  expirationDate: string;
  totalImport: number;
  totalUsed: number;
  totalReturn: number; 
  stock: number;
  importTimestamp: number; 
}

export const MultiAutoAccessoriesInventory: React.FC<MultiAutoAccessoriesInventoryProps> = ({ 
    moduleName = 'Multi Auto', 
    imports, 
    usage = [],
    returns = [], 
    onReturn,
    language = 'vi',
    netData = [],
    historyData = [],
    productionData = [],
    userRole,
    onDelete
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [returnModel, setReturnModel] = useState('');
  const [returnLotKey, setReturnLotKey] = useState('');
  const [returnQty, setReturnQty] = useState<string>('');
  const [returnReason, setReturnReason] = useState('');
  const [now, setNow] = useState(Date.now());
  
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const t = translations[language] || translations['vi'];

  // Helper chuẩn hóa chuỗi
  const norm = (s: string) => (s || '').trim().toUpperCase();

  const getPointsForStage = (model: string, code: string, stageName: string) => {
    const m = norm(model);
    const c = norm(code);
    const s = norm(stageName);
    const net = netData.find(n => norm(n.model) === m && norm(n.code) === c);
    if (!net) return 1;
    if (norm(net.stage) === s) return net.stage1Points || 1;
    if (norm(net.stage2 || '') === s) return net.stage2Points || 1;
    if (norm(net.stage3 || '') === s) return net.stage3Points || 1;
    if (norm(net.stage4 || '') === s) return net.stage4Points || 1;
    return net.stage1Points || 1;
  };

  const getTPP = (model: string, code: string) => {
    const net = netData.find(n => norm(n.model) === norm(model) && norm(n.code) === norm(code));
    return net?.timePerPoint || 1.5;
  };

  // --- LOGIC TÍNH TỔNG TIÊU HAO THEO NHÓM (MODEL|CODE|STAGE) ---
  const totalConsumptionByGroup = useMemo(() => {
    const map = new Map<string, number>();

    // 1. Tiêu hao từ lịch sử hoàn thành (Sản lượng thực tế đã dập xong)
    historyData.forEach(h => {
        const stage = norm(h.stageCompleted || h.stage);
        const pts = getPointsForStage(h.model, h.code, stage);
        const consumed = h.quantity * pts;
        const groupKey = `${norm(h.model)}|${norm(h.code)}|${stage}`;
        map.set(groupKey, (map.get(groupKey) || 0) + consumed);
    });

    // 2. Tiêu hao Real-time (Đang chạy trên máy)
    productionData.forEach(r => {
        if (r.productionProgress) {
            Object.entries(r.productionProgress).forEach(([stageName, p]: [string, any]) => {
                if (p.accessoryLot && (p.status === 'RUNNING' || p.status === 'STOPPED')) {
                    const tpp = getTPP(r.model, r.code);
                    let elapsed = p.accumulatedTime || 0;
                    if (p.status === 'RUNNING' && p.lastStartTimestamp) {
                        elapsed += (now - p.lastStartTimestamp) / 1000;
                    }
                    const livePoints = tpp > 0 ? Math.floor(elapsed / tpp) : 0;
                    const groupKey = `${norm(r.model)}|${norm(r.code)}|${norm(stageName)}`;
                    map.set(groupKey, (map.get(groupKey) || 0) + livePoints);
                }
            });
        }
    });

    return map;
  }, [historyData, productionData, netData, now]);

  // --- LOGIC TÍNH TỔNG CẦN (REQUIRED) THEO NHÓM (MODEL|CODE|STAGE) ---
  const totalRequirementByGroup = useMemo(() => {
      const map = new Map<string, number>();
      
      // 1. Nhu cầu lý thuyết từ tổng nhập TP
      productionData.forEach(r => {
          // Lặp qua các công đoạn được định nghĩa trong NetData cho Model này
          // Tuy nhiên productionData chỉ có quantity chung cho TP.
          // Ta cần tìm các công đoạn liên quan trong NetData để tính tổng điểm cần.
          const net = netData.find(n => norm(n.model) === norm(r.model) && norm(n.code) === norm(r.code));
          if (net) {
              const stages = [];
              if (net.stage) stages.push({ name: net.stage, pts: net.stage1Points || 0 });
              if (net.stage2) stages.push({ name: net.stage2, pts: net.stage2Points || 0 });
              if (net.stage3) stages.push({ name: net.stage3, pts: net.stage3Points || 0 });
              if (net.stage4) stages.push({ name: net.stage4, pts: net.stage4Points || 0 });

              stages.forEach(st => {
                  const groupKey = `${norm(r.model)}|${norm(r.code)}|${norm(st.name)}`;
                  const needed = r.quantity * st.pts;
                  map.set(groupKey, (map.get(groupKey) || 0) + needed);
              });
          } else {
               // Fallback nếu không có NetData (ít xảy ra nhưng an toàn)
               const stage = norm(r.stage);
               const groupKey = `${norm(r.model)}|${norm(r.code)}|${stage}`;
               // Giả sử 1 điểm nếu không có cấu hình
               map.set(groupKey, (map.get(groupKey) || 0) + r.quantity);
          }
      });
      return map;
  }, [productionData, netData]);

  // --- LOGIC TỒN KHO CHI TIẾT THEO FIFO ---
  const inventoryData = useMemo(() => {
    const groups = new Map<string, InventoryItem[]>();
    
    // Gom nhóm toàn bộ nhập kho phụ liệu
    imports.forEach(record => {
        const groupKey = `${norm(record.model)}|${norm(record.code)}|${norm(record.stage)}`;
        if (!groups.has(groupKey)) groups.set(groupKey, []);
        
        const dateParts = record.date.split('/');
        const timeParts = record.timestamp.split(':');
        const ts = new Date(+dateParts[2], +dateParts[1] - 1, +dateParts[0], +timeParts[0], +timeParts[1]).getTime();

        groups.get(groupKey)!.push({
            key: `${record.lotNo}|${record.stage}`,
            model: record.model,
            code: record.code,
            lotNo: record.lotNo,
            stage: record.stage,
            expirationDate: record.expirationDate || '',
            totalImport: record.quantity,
            totalUsed: 0, 
            totalReturn: 0,
            stock: record.quantity,
            importTimestamp: ts
        });
    });

    const finalInventory: InventoryItem[] = [];

    groups.forEach((items, groupKey) => {
        // Sắp xếp theo FIFO (Cũ nhất lên trước để trừ trước)
        items.sort((a, b) => a.importTimestamp - b.importTimestamp);

        // Tổng tiêu hao cần phân bổ cho nhóm này
        let remainingUsage = totalConsumptionByGroup.get(groupKey) || 0;

        // Trừ hàng hoàn trả trước
        items.forEach(item => {
            const ret = returns.filter(r => norm(r.lotNo) === norm(item.lotNo) && norm(r.stage) === norm(item.stage));
            const totalRet = ret.reduce((sum, r) => sum + r.quantity, 0);
            item.totalReturn = totalRet;
            item.stock -= totalRet;
        });

        // Trừ tiêu hao theo FIFO từ Pool
        items.forEach(item => {
            if (remainingUsage <= 0) return;
            const availableInLot = Math.max(0, item.stock);
            
            if (remainingUsage >= availableInLot) {
                item.totalUsed = availableInLot;
                item.stock = 0;
                remainingUsage -= availableInLot;
            } else {
                item.totalUsed = remainingUsage;
                item.stock -= remainingUsage;
                remainingUsage = 0;
            }
        });

        // Xử lý âm kho nếu tiêu hao vượt quá nhập
        if (remainingUsage > 0 && items.length > 0) {
            const lastItem = items[items.length - 1];
            lastItem.totalUsed += remainingUsage;
            lastItem.stock -= remainingUsage;
        }

        finalInventory.push(...items);
    });

    return finalInventory.sort((a, b) => a.model.localeCompare(b.model));
  }, [imports, totalConsumptionByGroup, returns]);

  const filteredData = useMemo(() => {
    return inventoryData.filter(item => 
      norm(item.model).includes(searchTerm.toUpperCase()) ||
      norm(item.lotNo).includes(searchTerm.toUpperCase())
    );
  }, [inventoryData, searchTerm]);

  const summaryByModel = useMemo(() => {
      const map = new Map<string, { model: string, code: string, stage: string, totalStock: number, required: number }>();
      
      // Tập hợp danh sách các key từ Inventory
      inventoryData.forEach(item => {
          const key = `${norm(item.model)}|${norm(item.code)}|${norm(item.stage)}`;
          if (!map.has(key)) {
              map.set(key, { 
                  model: item.model, 
                  code: item.code, 
                  stage: item.stage, 
                  totalStock: 0,
                  required: 0 
              });
          }
          map.get(key)!.totalStock += item.stock;
      });

      // Bổ sung các key từ Production Demand nếu chưa có trong Inventory (Trường hợp thiếu liệu chưa nhập)
      // Lưu ý: totalRequirementByGroup dùng key chuẩn hóa
      totalRequirementByGroup.forEach((qty, key) => {
           if (!map.has(key)) {
               const [m, c, s] = key.split('|');
               map.set(key, { model: m, code: c, stage: s, totalStock: 0, required: 0 });
           }
      });

      // Tính toán Required = (Total Needed - Total Consumed)
      map.forEach((val, key) => {
          const totalNeeded = totalRequirementByGroup.get(key) || 0;
          const totalConsumed = totalConsumptionByGroup.get(key) || 0;
          val.required = Math.max(0, totalNeeded - totalConsumed);
      });

      return Array.from(map.values())
        .filter(item => item.totalStock > 0 || item.required > 0) // Hiện nếu có tồn hoặc có nhu cầu
        .sort((a, b) => b.totalStock - a.totalStock);
  }, [inventoryData, totalRequirementByGroup, totalConsumptionByGroup]);

  const selectedReturnItem = useMemo(() => {
      return inventoryData.find(i => i.key === returnLotKey);
  }, [inventoryData, returnLotKey]);

  const totalStock = filteredData.reduce((sum, item) => sum + Math.max(0, item.stock), 0);

  const handleExportExcel = () => {
    const headers = ["STT", "Model", "Code", "Mã Lot PL", "Công Đoạn", "Tổng Nhập", "Tổng Tiêu Hao (FIFO)", "Hoàn Trả", "Tồn Kho Hiện Tại"];
    const rows = filteredData.map((item, index) => [
        index + 1, item.model, item.code, item.lotNo, item.stage, item.totalImport, item.totalUsed, item.totalReturn, item.stock
    ]);
    exportToExcel([headers, ...rows], `TonKho_PhuLieu_FIFO_Live`);
  };

  const handleSubmitReturn = (e: React.FormEvent) => {
      e.preventDefault();
      if (!returnModel || !returnLotKey || !selectedReturnItem) {
          alert("Vui lòng nhập đầy đủ thông tin."); return;
      }
      const qty = parseInt(returnQty);
      if (isNaN(qty) || qty <= 0 || qty > selectedReturnItem.stock) {
          alert("Số lượng không hợp lệ."); return;
      }
      if (onReturn) {
          onReturn({ 
              model: selectedReturnItem.model, 
              code: selectedReturnItem.code, 
              lotNo: selectedReturnItem.lotNo, 
              stage: selectedReturnItem.stage, 
              quantity: qty, 
              reason: returnReason 
          });
          alert("Đã lưu phiếu hoàn trả!");
          setIsReturnModalOpen(false);
          setReturnModel(''); setReturnLotKey(''); setReturnQty(''); setReturnReason('');
      }
  };

  return (
    <div className="p-4 md:p-6 h-full overflow-y-auto bg-[#020617] flex flex-col gap-6 text-slate-300 custom-scrollbar relative">
      
      {/* Header Hub */}
      <div className="bg-slate-800 px-5 py-4 rounded-xl shadow-lg border border-slate-700 flex flex-col md:flex-row justify-between items-center gap-4 sticky top-0 z-20 backdrop-blur-md bg-opacity-90">
        <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="p-3 bg-blue-600 rounded-xl shadow-lg text-white shrink-0 animate-pulse">
               <Activity size={24} />
            </div>
            <div>
                <h1 className="text-xl font-black text-white uppercase tracking-tighter font-mono">FIFO MATERIAL MONITOR</h1>
                <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_#22c55e]"></span>
                    ĐÃ CẬP NHẬT LOGIC TRỪ TIÊU HAO TỰ ĐỘNG
                </div>
            </div>
        </div>
        <div className="flex items-center gap-3">
            <div className="bg-slate-950 px-6 py-2 rounded-xl border border-slate-700 shadow-inner flex flex-col items-end min-w-[150px]">
                <span className="text-[10px] text-slate-500 font-black uppercase">Tồn kho thực tế (Pool)</span>
                <span className="text-xl font-black text-yellow-400 font-mono leading-none">{totalStock.toLocaleString()} EA</span>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-slate-800 p-5 rounded-2xl border border-slate-700 shadow-2xl h-[280px] flex flex-col overflow-hidden">
              <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2 mb-4 shrink-0">
                <Box size={16} className="text-blue-400"/> TỔNG TỒN NHÓM (MODEL | CODE | STAGE)
              </h3>
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse">
                      <thead className="bg-slate-900/80 sticky top-0 z-10 text-[9px] text-slate-500 uppercase font-black">
                          <tr>
                              <th className="px-4 py-2">Tên Model</th>
                              <th className="px-4 py-2">Mã Code</th>
                              <th className="px-4 py-2 text-center">Công đoạn</th>
                              <th className="px-4 py-2 text-center text-orange-400">SL Cần (Pending)</th>
                              <th className="px-4 py-2 text-right">Tổng tồn khả dụng</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700/50">
                          {summaryByModel.length === 0 ? (
                              <tr><td colSpan={5} className="py-20 text-center text-slate-600 italic uppercase text-[10px]">Chưa có dữ liệu</td></tr>
                          ) : (
                              summaryByModel.map((item, idx) => (
                                  <tr key={idx} className="hover:bg-blue-900/10 transition-colors">
                                      <td className="px-4 py-2.5 font-black text-slate-100 text-[11px] uppercase truncate">{item.model}</td>
                                      <td className="px-4 py-2.5 font-mono text-slate-400 text-[10px]">{item.code}</td>
                                      <td className="px-4 py-2.5 text-center">
                                          <span className="bg-slate-950 border border-slate-700 px-2 py-0.5 rounded text-[10px] font-black text-slate-400 font-mono uppercase">{item.stage}</span>
                                      </td>
                                      <td className="px-4 py-2.5 text-center font-bold font-mono text-xs text-orange-400 bg-orange-900/5">
                                          {item.required > 0 ? item.required.toLocaleString() : '-'}
                                      </td>
                                      <td className={`px-4 py-2.5 text-right font-black font-mono text-xs ${item.totalStock < item.required ? 'text-red-500' : 'text-green-400'}`}>
                                          {item.totalStock.toLocaleString()}
                                      </td>
                                  </tr>
                              ))
                          )}
                      </tbody>
                  </table>
              </div>
          </div>

          <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700 shadow-xl flex flex-col justify-center gap-6 h-[280px]">
               <div className="flex justify-between items-center bg-slate-900/50 p-4 rounded-xl border border-slate-700">
                    <div>
                        <p className="text-[10px] font-black text-slate-500 uppercase">Tiêu hao tích lũy (Live)</p>
                        <p className="text-3xl font-black text-blue-400 font-mono mt-1">
                            {/* FIX: Explicitly type reduce arguments to resolve 'unknown' operator error on line 328 */}
                            {Array.from(totalConsumptionByGroup.values()).reduce((s: number, v: number) => s + v, 0).toLocaleString()}
                        </p>
                    </div>
                    <Zap size={32} className="text-blue-500/50 animate-pulse"/>
               </div>
               <div className="flex items-start gap-3 p-4 bg-indigo-900/10 border border-indigo-500/20 rounded-xl">
                    <Info size={20} className="text-indigo-400 shrink-0 mt-0.5"/>
                    <p className="text-[10px] text-slate-400 leading-relaxed font-medium uppercase italic">
                        "Cột 'SL Cần' hiển thị tổng số điểm cần gắn cho các lệnh sản xuất TP đang chờ hoặc đang chạy. Số liệu này tự động giảm khi sản lượng được hoàn thành."
                    </p>
               </div>
          </div>
      </div>

      <div className="bg-slate-800 p-3 rounded-xl border border-slate-700 flex flex-wrap gap-4 items-center shadow-md">
        <div className="relative flex-1 min-w-[300px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
          <input 
            type="text" placeholder="Tìm Model, Lot No..." value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:border-blue-500 outline-none shadow-inner"
          />
        </div>
        <div className="flex gap-2">
            <button onClick={() => setIsReturnModalOpen(true)} className="flex items-center gap-2 px-5 py-2 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white text-xs font-black rounded-xl border border-red-500/30 transition-all uppercase tracking-tighter"><Undo2 size={16} /> {t.btn_return}</button>
            <button onClick={handleExportExcel} className="flex items-center gap-1 px-3 py-1.5 bg-green-700 hover:bg-green-600 text-white text-xs font-bold rounded shadow-sm transition-colors border border-green-600"><Download size={14} /> EXPORT_XLSX</button>
        </div>
      </div>

      <div className="bg-slate-800 rounded-2xl border border-slate-700 flex flex-col overflow-hidden shadow-2xl min-h-[400px]">
        <div className="p-4 bg-slate-900/50 border-b border-slate-700 flex justify-between items-center">
             <div className="font-black text-[10px] text-slate-500 uppercase tracking-widest flex items-center gap-2">
                 <Box size={14}/> {t.inv_title} Phụ Liệu - FIFO Stock Log
             </div>
        </div>
        <div className="overflow-x-auto flex-1 custom-scrollbar">
          <table className="w-full text-[11px] text-left border-collapse">
            <thead className="bg-slate-950 text-slate-500 uppercase font-black font-mono border-b border-slate-800 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-4">Sản phẩm (Model)</th>
                <th className="px-6 py-4">Mã Lot Phụ Liệu</th>
                <th className="px-4 py-4 text-center">C.Đoạn</th>
                <th className="px-6 py-4 text-right text-blue-400 bg-blue-900/5">Số lượng nhập</th>
                <th className="px-6 py-4 text-right text-orange-400 bg-orange-900/5">Đã dùng (FIFO)</th>
                <th className="px-6 py-4 text-right text-red-400 bg-red-900/5">Hoàn Trả</th>
                <th className="px-6 py-4 text-right bg-yellow-900/10 text-yellow-400 font-black text-sm">Tồn Hiện Tại</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {filteredData.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-20 text-center text-slate-700 italic font-black uppercase tracking-widest opacity-20">{t.msg_no_data}</td></tr>
              ) : (
                filteredData.map((item) => {
                  const isLow = item.stock < 50 && item.stock > 0;
                  return (
                    <tr key={item.key} className="bg-slate-800 hover:bg-white/5 transition-colors group">
                        <td className="px-6 py-3">
                            <div className="font-black text-slate-100 uppercase">{item.model}</div>
                            <div className="text-[9px] text-slate-500 font-mono">{item.code}</div>
                        </td>
                        <td className="px-6 py-3 font-mono font-black text-blue-400 flex items-center gap-2 uppercase tracking-tighter">
                            <Layers size={12} className="text-slate-600"/> {item.lotNo}
                        </td>
                        <td className="px-4 py-3 text-center">
                            <span className="bg-slate-950 border border-slate-700 px-2 py-0.5 rounded text-[10px] font-black text-slate-400 font-mono uppercase">{item.stage}</span>
                        </td>
                        <td className="px-6 py-3 text-right font-mono text-blue-400 bg-blue-900/5">{item.totalImport.toLocaleString()}</td>
                        <td className="px-6 py-3 text-right font-mono text-orange-400 bg-orange-900/5 font-black text-xs">
                             {item.totalUsed.toLocaleString()}
                        </td>
                        <td className="px-6 py-3 text-right font-mono text-red-400 bg-red-900/5">{item.totalReturn.toLocaleString()}</td>
                        <td className={`px-6 py-3 text-right font-black font-mono text-base bg-yellow-900/20 shadow-[inset_-4px_0_0_0_#facc15] ${item.stock <= 0 ? 'text-red-500' : isLow ? 'text-orange-400' : 'text-yellow-400'}`}>
                            {Math.max(0, item.stock).toLocaleString()}
                        </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Return Modal */}
      {isReturnModalOpen && (
          <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in">
              <div className="bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-red-500/30 flex flex-col">
                  <div className="px-6 py-4 bg-red-700 text-white flex justify-between items-center shadow-lg uppercase font-black tracking-widest text-xs">
                      <h2 className="flex items-center gap-2"><Undo2 size={18}/> {t.return_title} (Phụ Liệu)</h2>
                      <button onClick={() => setIsReturnModalOpen(false)} className="hover:bg-black/20 p-1 rounded-full transition-colors"><X size={20}/></button>
                  </div>
                  <form onSubmit={handleSubmitReturn} className="p-8 space-y-5 bg-[#020617]">
                      <div>
                          <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5 ml-1">{t.inv_model}</label>
                          <select value={returnModel} onChange={e => { setReturnModel(e.target.value); setReturnLotKey(''); setReturnQty(''); }} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white font-bold outline-none focus:border-red-500 shadow-inner" required>
                              <option value="">-- Chọn Model --</option>
                              {Array.from(new Set(inventoryData.filter(i => i.stock > 0).map(i => i.model))).map(m => <option key={m} value={m}>{m}</option>)}
                          </select>
                      </div>
                      <div>
                          <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5 ml-1">Chọn Lot No & Công Đoạn</label>
                          <select value={returnLotKey} onChange={e => setReturnLotKey(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-yellow-500 font-mono font-black outline-none focus:border-red-500 shadow-inner" required disabled={!returnModel}>
                              <option value="">-- Chọn Lot - CĐ --</option>
                              {inventoryData.filter(i => i.model === returnModel && i.stock > 0).map(l => <option key={l.key} value={l.key}>{l.lotNo} (CĐ: {l.stage}) - Tồn: {l.stock}</option>)}
                          </select>
                      </div>
                      <div>
                          <div className="flex justify-between items-center mb-1.5 px-1">
                            <label className="block text-[10px] font-black text-slate-500 uppercase">Số Lượng Trả (EA)</label>
                            {returnLotKey && <span className="text-[10px] font-bold text-green-500 uppercase tracking-tighter">Kho: {selectedReturnItem?.stock}</span>}
                          </div>
                          <input type="number" min="1" max={selectedReturnItem?.stock} value={returnQty} onChange={e => setReturnQty(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-4 text-red-400 font-black text-2xl text-center outline-none focus:border-red-500 shadow-inner" placeholder="0" required disabled={!returnLotKey} />
                      </div>
                      <div>
                          <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5 ml-1">{t.return_reason}</label>
                          <textarea value={returnReason} onChange={e => setReturnReason(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-red-500 shadow-inner h-20 resize-none" placeholder="Nhập lý do hoàn trả..."/>
                      </div>
                      <div className="pt-2">
                          <button type="submit" className="w-full bg-red-600 hover:bg-red-500 text-white font-black py-4 rounded-2xl shadow-xl uppercase text-xs tracking-[0.2em] transition-all active:scale-95 border-b-4 border-red-800 flex items-center justify-center gap-2"><Save size={18}/> LƯU PHIẾU HOÀN TRẢ</button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};
