
import React, { useState, useMemo, useEffect } from 'react';
import { Search, FileCheck, Download, User, Layers, History as LucideHistory, CheckCircle2, Clock, AlertTriangle, Info, Monitor, Thermometer, Calendar, Wind, Target, TrendingUp } from 'lucide-react';
import { ProductionHistoryRecord, Language, NetDataRecord, ExportRecord } from '../../types';
import { exportToExcel } from '../../services/excelService';
import { translations } from '../../data/locales';

interface MultiAutoCompletedProductionProps {
  moduleName?: string;
  data: ProductionHistoryRecord[];
  language?: Language;
  netData?: NetDataRecord[]; 
  exportData?: ExportRecord[]; // New Prop
  hideDeptFilter?: boolean;
}

export const MultiAutoCompletedProduction: React.FC<MultiAutoCompletedProductionProps> = ({ 
    moduleName = 'Multi Auto', 
    data, 
    language = 'en',
    netData = [],
    exportData = []
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [showTimelineId, setShowTimelineId] = useState<number | null>(null);
  
  // State for Plan/Target per Model (Persisted)
  const [planMap, setPlanMap] = useState<Record<string, number>>(() => {
      try {
          const saved = localStorage.getItem(`plan_${moduleName?.replace(/\s+/g, '')}`);
          return saved ? JSON.parse(saved) : {};
      } catch (e) { return {}; }
  });

  const updatePlan = (model: string, value: string) => {
      const numVal = parseInt(value) || 0;
      setPlanMap(prev => {
          const next = { ...prev, [model]: numVal };
          localStorage.setItem(`plan_${moduleName?.replace(/\s+/g, '')}`, JSON.stringify(next));
          return next;
      });
  };
  
  const t = translations[language];

  // Pre-calculate exported quantities by LotNo
  const exportMap = useMemo(() => {
      const map = new Map<string, number>();
      exportData.forEach(e => {
          map.set(e.lotNo, (map.get(e.lotNo) || 0) + e.quantity);
      });
      return map;
  }, [exportData]);

  const filteredData = useMemo(() => {
    return data.filter(record => {
      // 1. Filter out fully exported items (Goal 3)
      const exportedQty = exportMap.get(record.lotNo) || 0;
      if (exportedQty >= record.quantity && record.quantity > 0) return false;

      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        record.model.toLowerCase().includes(searchLower) ||
        record.code.toLowerCase().includes(searchLower) ||
        record.lotNo.toLowerCase().includes(searchLower) ||
        (record.operator && record.operator.toLowerCase().includes(searchLower)) ||
        (record.machine && record.machine.toLowerCase().includes(searchLower));

      let matchesDate = true;
      if (fromDate || toDate) {
          const parts = record.date.split('/');
          if (parts.length === 3) {
              const recDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
              if (fromDate) {
                  const start = new Date(fromDate);
                  start.setHours(0,0,0,0);
                  if (recDate < start) matchesDate = false;
              }
              if (toDate && matchesDate) {
                  const end = new Date(toDate);
                  end.setHours(23,59,59,999);
                  if (recDate > end) matchesDate = false;
              }
          }
      }
      return matchesSearch && matchesDate;
    });
  }, [data, searchTerm, fromDate, toDate, exportMap]);

  const totalQuantity = filteredData.reduce((sum, item) => sum + (item.quantity || 0), 0);
  
  // Aggregate for Efficiency Summary
  const efficiencySummary = useMemo(() => {
      const map = new Map<string, number>();
      filteredData.forEach(r => {
          map.set(r.model, (map.get(r.model) || 0) + r.quantity);
      });
      return Array.from(map.entries()).map(([model, actual]) => {
          const plan = planMap[model] || 0;
          const percent = plan > 0 ? Math.round((actual / plan) * 100) : 0;
          return { model, actual, plan, percent };
      }).sort((a,b) => b.actual - a.actual);
  }, [filteredData, planMap]);

  const handleExportExcel = () => {
      if (filteredData.length === 0) {
          alert(t.msg_no_data);
          return;
      }
      const headers = ["STT", "Ngày", "Giờ Bắt Đầu", "Giờ Hoàn Thành", "Model", "Code", "Lot TP", "Công Đoạn", "Máy", "Nhân Viên", "Nhiệt Table", "Nhiệt Pad", "Áp Lực (bar)", "SL (PNL)", "Lý do dừng máy", "Kế hoạch", "% Đạt"];
      const rows = filteredData.map((item, index) => {
          const plan = planMap[item.model] || 0;
          return [
              index + 1, item.date, item.productionStartTime || '--:--', item.completedAt.split(' ')[1] || '--:--', 
              item.model, item.code, item.lotNo, item.stageCompleted || item.stage, item.machine,
              item.operator || '--', item.tableTemp || 0, item.padTemp || 0, item.airPressure || 0,
              item.quantity, item.stopReason || '--', plan, plan > 0 ? ((item.quantity/plan)*100).toFixed(1)+'%' : '-'
          ];
      });
      exportToExcel([headers, ...rows], `HoanThanhSX_${moduleName}_${new Date().getTime()}`);
  };

  return (
    <div className="p-6 h-full overflow-y-auto bg-slate-900 flex flex-col gap-6 text-slate-300 custom-scrollbar">
      {/* Header */}
      <div className="bg-slate-800 px-4 py-3 rounded-lg shadow-lg border border-slate-700 flex flex-col md:flex-row justify-between items-center gap-3 sticky top-0 z-20">
        <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="p-1.5 bg-indigo-900/30 rounded border border-indigo-600/50 text-indigo-400 shrink-0"><FileCheck size={18} /></div>
            <h1 className="text-sm font-bold text-white uppercase tracking-tight truncate font-mono">HOÀN THÀNH SX ({moduleName})</h1>
        </div>
        <div className="flex gap-4">
             <div className="text-center"><p className="text-[10px] text-slate-500 font-black uppercase">Tổng sản lượng</p><p className="text-lg font-black text-indigo-400 font-mono">{totalQuantity.toLocaleString()} PNL</p></div>
             <button onClick={handleExportExcel} className="bg-green-700 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all border-b-4 border-green-900 active:translate-y-1"><Download size={14} className="inline mr-1"/> EXPORT</button>
        </div>
      </div>

      {/* Toolbar & Date Filter */}
      <div className="bg-slate-800 p-3 rounded-lg shadow-sm border border-slate-700 flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
          <input type="text" placeholder="Tìm theo model, lô, máy, nhân viên..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-1.5 text-sm bg-slate-900 border border-slate-600 rounded-md text-white outline-none focus:border-blue-500"/>
        </div>
        <div className="flex items-center gap-2">
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs text-slate-300 [color-scheme:dark] w-32"/>
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs text-slate-300 [color-scheme:dark] w-32"/>
        </div>
      </div>

      {/* Efficiency Summary Section */}
      <div className="bg-slate-800 rounded-xl shadow-lg border border-slate-700 overflow-hidden flex flex-col shrink-0 max-h-[300px]">
          <div className="px-4 py-2 border-b border-slate-700 bg-slate-900/50 flex justify-between items-center">
              <h3 className="text-xs font-bold text-slate-300 flex items-center gap-2 uppercase font-mono"><Target size={14} className="text-orange-500"/> Bảng Kế Hoạch & Hiệu Suất (Theo Lọc)</h3>
          </div>
          <div className="overflow-auto custom-scrollbar">
              <table className="w-full text-xs text-left">
                  <thead className="bg-slate-950 text-slate-500 sticky top-0 font-bold font-mono">
                      <tr>
                          <th className="px-4 py-2">Model</th>
                          <th className="px-4 py-2 text-center">Thực Tế (Actual)</th>
                          <th className="px-4 py-2 text-center text-orange-400">Kế Hoạch (Plan)</th>
                          <th className="px-4 py-2 text-right text-blue-400">Hiệu Suất (%)</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                      {efficiencySummary.map(item => (
                          <tr key={item.model} className="hover:bg-white/5">
                              <td className="px-4 py-2 font-bold text-white">{item.model}</td>
                              <td className="px-4 py-2 text-center font-mono">{item.actual.toLocaleString()}</td>
                              <td className="px-4 py-2 text-center">
                                  <input 
                                    type="number" 
                                    className="bg-slate-900 border border-slate-600 rounded px-2 py-1 text-center w-24 text-orange-400 font-bold focus:outline-none focus:border-orange-500"
                                    value={item.plan || ''}
                                    onChange={(e) => updatePlan(item.model, e.target.value)}
                                    placeholder="0"
                                  />
                              </td>
                              <td className="px-4 py-2 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                      <div className="w-24 h-1.5 bg-slate-900 rounded-full overflow-hidden">
                                          <div className={`h-full ${item.percent >= 100 ? 'bg-green-500' : item.percent >= 80 ? 'bg-blue-500' : 'bg-red-500'}`} style={{width: `${Math.min(100, item.percent)}%`}}></div>
                                      </div>
                                      <span className={`font-mono font-black ${item.percent >= 100 ? 'text-green-400' : 'text-slate-300'}`}>{item.percent}%</span>
                                  </div>
                              </td>
                          </tr>
                      ))}
                      {efficiencySummary.length === 0 && <tr><td colSpan={4} className="p-4 text-center text-slate-500 italic">Chưa có dữ liệu.</td></tr>}
                  </tbody>
              </table>
          </div>
      </div>

      {/* Main List Table */}
      <div className="bg-slate-800 rounded-xl shadow-lg border border-slate-700 flex-1 flex flex-col overflow-hidden">
        <div className="overflow-x-auto flex-1 custom-scrollbar">
          <table className="w-full text-[11px] text-left text-slate-300 border-collapse min-w-[1300px]">
            <thead className="bg-slate-950 text-slate-500 uppercase sticky top-0 z-10 font-black font-mono border-b border-slate-700">
              <tr>
                <th className="px-4 py-3">Thời gian</th>
                <th className="px-4 py-3">Sản phẩm / Lô TP</th>
                <th className="px-4 py-3 text-center">Công đoạn</th>
                <th className="px-4 py-3">Máy & Nhân viên</th>
                <th className="px-4 py-3 text-center text-orange-400">Nhiệt Table</th>
                <th className="px-4 py-3 text-center text-yellow-500">Nhiệt Pad</th>
                <th className="px-4 py-3 text-center text-cyan-400">Áp Lực</th>
                <th className="px-4 py-3 text-right">SL (PNL)</th>
                <th className="px-4 py-3 text-center w-[120px] bg-blue-900/10 text-blue-400">% vs Plan</th>
                <th className="px-4 py-3 text-center">Info</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {filteredData.map((record) => {
                 const plan = planMap[record.model] || 0;
                 const aggregatePercent = efficiencySummary.find(e => e.model === record.model)?.percent || 0;
                 
                 return (
                    <tr key={record.historyId} className="hover:bg-slate-700/50 transition-colors group">
                        <td className="px-4 py-2 font-mono">
                            <div className="text-slate-300 font-bold">{record.completedAt.split(' ')[1]}</div>
                            <div className="text-slate-500 text-[9px]">{record.date}</div>
                        </td>
                        <td className="px-4 py-2">
                            <div className="font-bold text-blue-400 uppercase">{record.model}</div>
                            <div className="text-yellow-500 font-mono font-bold text-[10px]">{record.lotNo}</div>
                        </td>
                        <td className="px-4 py-2 text-center">
                            <span className="px-2 py-0.5 rounded text-[9px] font-black border uppercase text-green-500 border-green-800 bg-green-950/20">
                                {record.stageCompleted || record.stage}
                            </span>
                        </td>
                        <td className="px-4 py-2">
                            <div className="font-black text-slate-200 font-mono uppercase tracking-tighter flex items-center gap-1.5 mb-0.5">
                                <Monitor size={12} className="text-slate-500"/> {record.machine}
                            </div>
                            <div className="flex items-center gap-1 text-[9px] text-slate-500 font-bold uppercase">
                                <User size={10}/> {record.operator}
                            </div>
                        </td>
                        <td className="px-4 py-2 text-center font-mono font-black text-orange-400 bg-orange-900/5">{record.tableTemp || 0}°C</td>
                        <td className="px-4 py-2 text-center font-mono font-black text-yellow-500 bg-yellow-900/5">{record.padTemp || 0}°C</td>
                        <td className="px-4 py-2 text-center font-mono font-black text-cyan-400 bg-cyan-900/5">{record.airPressure || 0} b</td>
                        <td className="px-4 py-2 text-right font-black text-green-400 font-mono text-sm">{record.quantity}</td>
                        <td className="px-4 py-2 text-center font-mono font-bold text-blue-300 bg-blue-900/5">
                            {plan > 0 ? `${aggregatePercent}% (Total)` : '-'}
                        </td>
                        <td className="px-4 py-2 text-center">
                            <button onClick={() => setShowTimelineId(showTimelineId === record.historyId ? null : record.historyId)} className="p-1 hover:bg-blue-600 rounded text-slate-500 hover:text-white transition-all"><Info size={14}/></button>
                        </td>
                    </tr>
                 );
              })}
            </tbody>
          </table>
        </div>
      </div>
      
      {showTimelineId && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setShowTimelineId(null)}>
              <div className="bg-slate-800 p-6 rounded-3xl border border-slate-700 max-w-lg w-full shadow-2xl" onClick={e => e.stopPropagation()}>
                  <h3 className="text-xs font-black text-blue-400 uppercase tracking-widest mb-4 flex items-center gap-2 border-b border-slate-700 pb-2"><LucideHistory size={16}/> Nhật ký vận hành & Sự cố</h3>
                  <div className="bg-black/40 rounded-xl p-4 font-mono text-[11px] text-slate-400 whitespace-pre-line leading-relaxed h-60 overflow-y-auto custom-scrollbar">
                      {data.find(r => r.historyId === showTimelineId)?.machineLog || "Dữ liệu vận hành tiêu chuẩn. Không ghi nhận bất thường."}
                      {data.find(r => r.historyId === showTimelineId)?.stopReason && `\n\n[GHI CHÚ DỪNG MÁY]: ${data.find(r => r.historyId === showTimelineId)?.stopReason}`}
                  </div>
                  <button onClick={() => setShowTimelineId(null)} className="w-full mt-4 bg-slate-700 py-2 rounded-xl text-xs font-bold uppercase hover:bg-slate-600">Đóng cửa sổ</button>
              </div>
          </div>
      )}
    </div>
  );
};
