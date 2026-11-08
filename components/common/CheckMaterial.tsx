
import React, { useState, useMemo } from 'react';
import { PackageCheck, Calendar, FilterX, ListFilter, CheckCircle2, AlertTriangle, ArrowRight, CheckSquare, Activity, History, Clock, Search, Info, Printer, FileText, ChevronDown, ChevronRight, Hash, Package } from 'lucide-react';
import { NetDataRecord, ImportRecord, AccessoryRecord } from '../../types';

interface CheckMaterialProps {
  moduleName?: string;
  netData: NetDataRecord[];
  importData: ImportRecord[];
  accessoryData: AccessoryRecord[];
  onConfirmImport: (tpIds: number[], plIds: number[]) => void;
}

interface ComparisonRow {
  id: string; 
  department: string; 
  model: string;
  code: string;
  tpTotalQty: number;
  tpIds: number[];
  allGroupPlIds: number[]; 
  stage: string;
  quota: number; 
  requiredQty: number; 
  plActualQty: number;
  plIds: number[]; 
  diff: number; 
  status: 'MATCH' | 'EXCESS' | 'MISSING' | 'NO_CONFIG' | 'SUPPLEMENTARY';
  rowSpan: number;
  isFirstInGroup: boolean;
  verifiedAt?: string; 
}

export const CheckMaterial: React.FC<CheckMaterialProps> = ({ 
    moduleName = 'Multi Auto', 
    netData, 
    importData, 
    accessoryData,
    onConfirmImport
}) => {
  const [selectedDate, setSelectedDate] = useState(() => new Date().toLocaleDateString('en-GB').split('/').reverse().join('-'));
  const [showAllPending, setShowAllPending] = useState(true); // Default to showing all
  const [historySearchTerm, setHistorySearchTerm] = useState('');
  const [expandedBatches, setExpandedBatches] = useState<Set<string>>(new Set());

  const parseDate = (dateStr: string) => {
      if (!dateStr) return '';
      const [d, m, y] = dateStr.split('/');
      return `${y}-${m}-${d}`;
  };

  const toggleBatch = (batchId: string) => {
      const newSet = new Set(expandedBatches);
      if (newSet.has(batchId)) newSet.delete(batchId);
      else newSet.add(batchId);
      setExpandedBatches(newSet);
  };

  // --- LOGIC 1: CHỜ DUYỆT (PENDING) ---
  const pendingRows = useMemo(() => {
      const rows: ComparisonRow[] = [];
      const pendingTP = importData.filter(r => !r.isVerified && (showAllPending || parseDate(r.date) === selectedDate));
      const pendingPL = accessoryData.filter(r => !r.isVerified && (showAllPending || parseDate(r.date) === selectedDate));

      const tpGroups = new Map<string, { model: string, code: string, qty: number, ids: number[] }>();
      pendingTP.forEach(r => {
          const key = `${r.model}|${r.code}`;
          if (!tpGroups.has(key)) tpGroups.set(key, { model: r.model, code: r.code, qty: 0, ids: [] });
          const g = tpGroups.get(key)!;
          g.qty += r.quantity;
          g.ids.push(r.id);
      });

      const plLookup = new Map<string, { qty: number, ids: number[] }>();
      pendingPL.forEach(r => {
          const key = `${r.model}|${r.code}|${r.stage}`;
          if (!plLookup.has(key)) plLookup.set(key, { qty: 0, ids: [] });
          const g = plLookup.get(key)!;
          g.qty += r.quantity;
          g.ids.push(r.id);
      });

      const allKeys = new Set([
          ...tpGroups.keys(),
          ...Array.from(plLookup.keys()).map(k => k.split('|').slice(0, 2).join('|'))
      ]);

      Array.from(allKeys).sort().forEach(key => {
          const [model, code] = key.split('|');
          const tp = tpGroups.get(key) || { model, code, qty: 0, ids: [] };
          const net = netData.find(n => n.model === model && n.code === code);
          
          const stages: { name: string, pts: number }[] = [];
          if (net) {
              if (net.stage) stages.push({ name: net.stage, pts: net.stage1Points });
              if (net.stage2) stages.push({ name: net.stage2, pts: net.stage2Points || 0 });
              if (net.stage3) stages.push({ name: net.stage3, pts: net.stage3Points || 0 });
              if (net.stage4) stages.push({ name: net.stage4, pts: net.stage4Points || 0 });
          }

          Array.from(plLookup.keys()).forEach(plK => {
              const [m, c, s] = plK.split('|');
              if (m === model && c === code && !stages.some(stg => stg.name === s)) {
                  stages.push({ name: s, pts: 0 }); 
              }
          });

          if (stages.length === 0 && tp.qty > 0) {
              stages.push({ name: 'Chưa ĐN', pts: 0 });
          }

          const uniqueStages = Array.from(new Map(stages.map(s => [s.name, s])).values());
          const allPlIdsForGroup: number[] = [];
          uniqueStages.forEach(stg => {
              const plData = plLookup.get(`${model}|${code}|${stg.name}`);
              if (plData) allPlIdsForGroup.push(...plData.ids);
          });

          uniqueStages.forEach((stg, idx) => {
              const pl = plLookup.get(`${model}|${code}|${stg.name}`) || { qty: 0, ids: [] };
              const required = tp.qty * stg.pts;
              const diff = pl.qty - required;
              
              let status: ComparisonRow['status'] = 'MATCH';
              if (!net) status = 'NO_CONFIG';
              else if (tp.qty === 0 || pl.qty === 0) status = 'SUPPLEMENTARY'; 
              else if (diff === 0) status = 'MATCH';
              else if (diff > 0) status = 'EXCESS';
              else status = 'MISSING';

              rows.push({
                  id: `p-${key}-${stg.name}-${idx}`, 
                  department: net?.layer || 'CHUNG', 
                  model, code, tpTotalQty: tp.qty, tpIds: tp.ids, allGroupPlIds: allPlIdsForGroup,
                  stage: stg.name, quota: stg.pts, requiredQty: required, plActualQty: pl.qty, plIds: pl.ids, diff, status,
                  rowSpan: uniqueStages.length, isFirstInGroup: idx === 0
              });
          });
      });
      return rows;
  }, [importData, accessoryData, netData, selectedDate, showAllPending]);

  // --- LOGIC 2: LỊCH SỬ SNAPSHOT ---
  const batchHistory = useMemo(() => {
      const verifiedTP = importData.filter(r => r.isVerified && r.verifiedAt);
      const verifiedPL = accessoryData.filter(r => r.isVerified && r.verifiedAt);
      const batchTimes = Array.from(new Set([...verifiedTP.map(r => r.verifiedAt!), ...verifiedPL.map(r => r.verifiedAt!)])).sort((a,b) => b.localeCompare(a));

      return batchTimes.map(time => {
          const bTP = verifiedTP.filter(r => r.verifiedAt === time);
          const bPL = verifiedPL.filter(r => r.verifiedAt === time);
          const rows: ComparisonRow[] = [];
          
          const tpGroups = new Map<string, { model: string, code: string, qty: number }>();
          bTP.forEach(r => {
              const k = `${r.model}|${r.code}`;
              if (!tpGroups.has(k)) tpGroups.set(k, { model: r.model, code: r.code, qty: 0 });
              tpGroups.get(k)!.qty += r.quantity;
          });

          const plLookup = new Map<string, number>();
          bPL.forEach(r => { const k = `${r.model}|${r.code}|${r.stage}`; plLookup.set(k, (plLookup.get(k) || 0) + r.quantity); });

          const historyKeys = new Set([
              ...tpGroups.keys(),
              ...Array.from(plLookup.keys()).map(k => k.split('|').slice(0, 2).join('|'))
          ]);

          Array.from(historyKeys).forEach(k => {
              const [model, code] = k.split('|');
              const tp = tpGroups.get(k) || { model, code, qty: 0 };
              const net = netData.find(n => n.model === model && n.code === code);
              
              const stages: {name: string, pts: number}[] = [];
              if (net) {
                  if (net.stage) stages.push({ name: net.stage, pts: net.stage1Points });
                  if (net.stage2) stages.push({ name: net.stage2, pts: net.stage2Points || 0 });
                  if (net.stage3) stages.push({ name: net.stage3, pts: net.stage3Points || 0 });
                  if (net.stage4) stages.push({ name: net.stage4, pts: net.stage4Points || 0 });
              }
              Array.from(plLookup.keys()).forEach(plK => {
                  const [m, c, s] = plK.split('|');
                  if (m === model && c === code && !stages.some(stg => stg.name === s)) {
                      stages.push({ name: s, pts: 0 });
                  }
              });

              const uniqueStages = Array.from(new Map(stages.map(s => [s.name, s])).values());
              uniqueStages.forEach((stg, idx) => {
                  const actualPl = plLookup.get(`${model}|${code}|${stg.name}`) || 0;
                  const req = tp.qty * stg.pts;
                  const diff = actualPl - req;

                  // FIX LOGIC: Thêm kiểm tra Excess (Số lượng dư)
                  let status: ComparisonRow['status'] = 'MATCH';
                  if (tp.qty === 0 || actualPl === 0) status = 'SUPPLEMENTARY';
                  else if (diff === 0) status = 'MATCH';
                  else if (diff > 0) status = 'EXCESS';
                  else status = 'MISSING';

                  rows.push({
                      id: `h-${time}-${k}-${stg.name}`, department: net?.layer || 'CHUNG', model, code, tpTotalQty: tp.qty, tpIds: [], allGroupPlIds: [],
                      stage: stg.name, quota: stg.pts, requiredQty: req, plActualQty: actualPl, plIds: [], diff: diff,
                      status: status,
                      rowSpan: uniqueStages.length, isFirstInGroup: idx === 0, verifiedAt: time
                  });
              });
          });

          return { 
              batchId: time.replace(/[^0-9]/g, '').slice(-8), 
              verifiedAt: time, 
              totalModels: historyKeys.size, 
              totalTP: bTP.reduce((s,i)=>s+i.quantity, 0), 
              rows, 
              status: rows.some(r => r.status !== 'MATCH' && r.status !== 'SUPPLEMENTARY' && r.status !== 'EXCESS') ? 'DISCREPANCY' : 'CLEAN' 
          } as any;
      }).filter(b => !historySearchTerm || b.rows.some((r:any) => r.model.toLowerCase().includes(historySearchTerm.toLowerCase())));
  }, [importData, accessoryData, netData, historySearchTerm]);

  const renderRow = (row: ComparisonRow, isHistory: boolean) => {
    const hasTP = row.tpIds.length > 0;
    const hasPL = row.allGroupPlIds.length > 0;

    return (
        <tr key={row.id} className={`${isHistory ? 'bg-slate-900/30' : 'bg-slate-800'} border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors`}>
            {row.isFirstInGroup && (
                <>
                    <td rowSpan={row.rowSpan} className="px-4 py-2 align-middle border-r border-slate-700 font-bold text-slate-400 text-[11px] uppercase whitespace-nowrap">{row.department}</td>
                    <td rowSpan={row.rowSpan} className="px-4 py-2 align-middle border-r border-slate-700">
                        <div className="font-bold text-white text-xs uppercase whitespace-nowrap">{row.model}</div>
                        <div className="text-[9px] font-mono text-slate-500">{row.code}</div>
                    </td>
                    <td rowSpan={row.rowSpan} className={`px-4 py-2 align-middle border-r border-slate-700 text-center font-black text-sm bg-blue-900/5 ${row.tpTotalQty > 0 ? 'text-blue-400' : 'text-slate-600 italic'}`}>
                        {row.tpTotalQty > 0 ? row.tpTotalQty.toLocaleString() : '0'}
                    </td>
                </>
            )}
            <td className="px-4 py-2 border-r border-slate-700 text-center whitespace-nowrap"><span className="bg-slate-950 px-2 py-0.5 rounded text-[10px] border border-slate-700 font-bold text-white">{row.stage}</span></td>
            <td className="px-4 py-2 border-r border-slate-700 text-center font-mono text-slate-500 text-[10px]">{row.quota}</td>
            <td className="px-4 py-2 border-r border-slate-700 text-center font-medium text-slate-400 text-[10px] bg-slate-900/50">{row.requiredQty.toLocaleString()}</td>
            <td className={`px-4 py-2 border-r border-slate-700 text-center font-black font-mono text-sm ${row.plActualQty > 0 ? 'text-yellow-500 bg-yellow-900/10' : 'text-slate-600'}`}>{row.plActualQty.toLocaleString()}</td>
            <td className={`px-4 py-2 border-r border-slate-700 text-center font-bold font-mono text-xs ${row.diff < 0 ? 'text-red-500' : row.diff > 0 ? 'text-blue-500' : 'text-green-500'}`}>{row.diff > 0 ? `+${row.diff}` : row.diff}</td>
            <td className="px-4 py-2 text-center border-r border-slate-700">
                <div className={`px-2 py-0.5 rounded text-[9px] font-black border mx-auto w-fit whitespace-nowrap ${
                    row.status === 'MATCH' ? 'text-green-400 bg-green-900/30 border-green-800' : 
                    row.status === 'SUPPLEMENTARY' ? 'text-cyan-400 bg-cyan-900/30 border-cyan-800' :
                    row.status === 'MISSING' ? 'text-red-400 bg-red-900/30 border-red-800' : 'text-blue-400 bg-blue-900/30 border-blue-800'
                }`}>
                    {row.status === 'MATCH' ? 'KHỚP' : row.status === 'SUPPLEMENTARY' ? 'BỔ SUNG' : row.status === 'MISSING' ? 'THIẾU' : 'DƯ'}
                </div>
            </td>
            {!isHistory && (
                <td className="px-4 py-2 text-center">
                    {row.isFirstInGroup && (
                        <button 
                            onClick={() => onConfirmImport(row.tpIds, row.allGroupPlIds)} 
                            className={`text-white text-[10px] font-bold px-3 py-1.5 rounded shadow-sm border uppercase active:scale-95 transition-all flex flex-col items-center leading-none mx-auto whitespace-nowrap ${hasTP && hasPL ? 'bg-indigo-600 border-indigo-500 hover:bg-indigo-500' : hasTP ? 'bg-blue-600 border-blue-500 hover:bg-blue-500' : 'bg-cyan-600 border-cyan-500 hover:bg-cyan-500'}`}
                        >
                            <span>DUYỆT LÔ</span>
                        </button>
                    )}
                </td>
            )}
        </tr>
    );
  };

  return (
    <div className="p-6 h-full overflow-y-auto bg-slate-900 flex flex-col gap-6 text-slate-300 font-sans custom-scrollbar">
       {/* Header */}
       <div className="bg-slate-800 px-4 py-3 rounded-xl border border-slate-700 flex justify-between items-center shadow-2xl shrink-0">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-600 rounded-lg text-white shadow-[0_0_15px_rgba(79,70,229,0.4)]"><PackageCheck size={24} /></div>
                <div>
                    <h1 className="text-lg font-black text-white uppercase tracking-tighter font-mono">TRACEABILITY SYSTEM ({moduleName})</h1>
                    <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold uppercase"><span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span> Data Snapshot Integrity: Active</div>
                </div>
            </div>
            <button 
                onClick={() => onConfirmImport(Array.from(new Set(pendingRows.flatMap(r => r.tpIds))), Array.from(new Set(pendingRows.flatMap(r => r.allGroupPlIds))))} 
                className="bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded-lg font-black text-xs uppercase shadow-lg border border-green-500 flex items-center gap-2 active:scale-95 transition-all"
            >
                <CheckSquare size={16}/> Xác nhận toàn bộ
            </button>
       </div>

       {/* Pending List */}
       <div className="flex flex-col gap-2 shrink-0">
            <div className="flex items-center justify-between px-2">
                <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><Activity size={14} className="text-indigo-500"/> Danh sách chờ duyệt (Gồm cả TOP/BOT)</h3>
                <div className="flex items-center gap-2">
                    {!showAllPending && <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-[10px] text-white focus:outline-none font-bold [color-scheme:dark]"/>}
                    <button onClick={() => setShowAllPending(!showAllPending)} className={`p-1.5 rounded border transition-colors ${showAllPending ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'}`}>{showAllPending ? <ListFilter size={14}/> : <FilterX size={14}/>}</button>
                </div>
            </div>
            <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-x-auto shadow-xl custom-scrollbar">
                <table className="min-w-max w-full text-left border-collapse">
                    <thead className="bg-slate-900 text-[10px] font-black text-slate-500 uppercase border-b border-slate-700 font-mono sticky top-0 z-10">
                        <tr><th className="px-4 py-3">BP</th><th className="px-4 py-3">Model/Code</th><th className="px-4 py-3 text-center">Tổng TP</th><th className="px-4 py-3 text-center">Công Đoạn</th><th className="px-4 py-3 text-center">Định Mức</th><th className="px-4 py-3 text-center">Cần PL</th><th className="px-4 py-3 text-center">Thực PL</th><th className="px-4 py-3 text-center">Lệch</th><th className="px-4 py-3 text-center">Trạng Thái</th><th className="px-4 py-3 text-center">Thao tác</th></tr>
                    </thead>
                    <tbody className="bg-slate-800/50 text-[11px]">
                        {pendingRows.length === 0 ? <tr><td colSpan={10} className="py-12 text-center text-slate-600 italic text-sm">Không có dữ liệu chờ duyệt.</td></tr> : pendingRows.map(r => renderRow(r, false))}
                    </tbody>
                </table>
            </div>
       </div>

       {/* History */}
       <div className="flex flex-col gap-3 mt-4">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 px-2">
                <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><History size={16} className="text-cyan-500"/> Nhật ký Snapshot (Đã duyệt)</h3>
                <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                    <input type="text" placeholder="Tìm Model..." value={historySearchTerm} onChange={(e) => setHistorySearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white outline-none"/>
                </div>
            </div>
            <div className="space-y-4 pb-20">
                {batchHistory.length === 0 ? (
                    <div className="py-20 text-center text-slate-700 border-2 border-dashed border-slate-800 rounded-2xl flex flex-col items-center gap-2"><History size={48} className="opacity-10"/><p>Chưa có lịch sử duyệt.</p></div>
                ) : batchHistory.map((batch:any) => (
                    <div key={batch.batchId} className={`bg-slate-800 rounded-2xl border transition-all duration-300 overflow-hidden shadow-2xl ${batch.status === 'DISCREPANCY' ? 'border-red-900/50' : 'border-slate-700'}`}>
                        <div className={`px-5 py-3 flex justify-between items-center cursor-pointer select-none ${batch.status === 'DISCREPANCY' ? 'bg-red-900/10' : 'bg-slate-900/50'}`} onClick={() => toggleBatch(batch.batchId)}>
                            <div className="flex items-center gap-4">
                                <div className={`p-2 rounded-lg ${batch.status === 'DISCREPANCY' ? 'bg-red-600 text-white' : 'bg-cyan-600 text-white'}`}><CheckCircle2 size={18}/></div>
                                <div>
                                    <div className="flex items-center gap-2"><span className="text-sm font-black text-white font-mono uppercase">LÔ DUYỆT #{batch.batchId}</span><span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${batch.status === 'DISCREPANCY' ? 'bg-red-900/30 text-red-400 border-red-800' : 'bg-green-900/30 text-green-400 border-green-800'}`}>{batch.status === 'DISCREPANCY' ? 'CÓ SAI LỆCH' : 'HOÀN HẢO'}</span></div>
                                    <div className="flex items-center gap-3 text-[10px] text-slate-500 mt-1 font-bold"><span className="flex items-center gap-1"><Clock size={10}/> {batch.verifiedAt}</span><span className="flex items-center gap-1"><FileText size={10}/> {batch.totalModels} Models</span></div>
                                </div>
                            </div>
                            <ChevronDown size={20} className={`transition-transform ${expandedBatches.has(batch.batchId) ? 'rotate-180' : ''}`}/>
                        </div>
                        {expandedBatches.has(batch.batchId) && (
                            <div className="p-4 bg-slate-900/50 overflow-x-auto"><table className="min-w-max w-full text-left text-[11px] border-collapse"><thead className="bg-slate-950 text-[9px] font-black text-slate-600 uppercase border-b border-slate-800"><tr><th className="px-4 py-2">BP</th><th className="px-4 py-2">Model/Code</th><th className="px-4 py-2 text-center">Tổng TP</th><th className="px-4 py-2 text-center">CĐ</th><th className="px-4 py-2 text-center">ĐM</th><th className="px-4 py-2 text-center">Cần Nhận</th><th className="px-4 py-2 text-center text-yellow-500 bg-yellow-950/20">THỰC NHẬN</th><th className="px-4 py-2 text-center">Lệch</th><th className="px-4 py-2 text-center">Kết Quả</th></tr></thead><tbody>{batch.rows.map((r:any) => renderRow(r, true))}</tbody></table></div>
                        )}
                    </div>
                ))}
            </div>
       </div>
    </div>
  );
};
