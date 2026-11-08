import React, { useState, useMemo } from 'react';
import { Search, Filter, Download, Calendar, ArrowUpCircle, FileSpreadsheet, Activity, HardDrive } from 'lucide-react';
import { ExportRecord, NetDataRecord } from '../../types';
import { exportToExcel } from '../../services/excelService';

interface MultiAutoDataExportViewerProps {
  moduleName?: string;
  data: ExportRecord[];
  netData: NetDataRecord[]; 
}

export const MultiAutoDataExportViewer: React.FC<MultiAutoDataExportViewerProps> = ({ moduleName = 'Multi Auto', data, netData }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStage, setFilterStage] = useState('ALL');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const normalize = (str: string) => str ? str.trim().toUpperCase() : '';

  // Helper mới: Lấy điểm của 1 công đoạn cụ thể
  const getPointsForOneStage = (model: string, code: string, stageName: string) => {
      const net = netData.find(n => normalize(n.model) === normalize(model) && normalize(n.code) === normalize(code));
      if (!net) return 0;
      const s = normalize(stageName);
      if (normalize(net.stage) === s) return net.stage1Points || 0;
      if (normalize(net.stage2 || '') === s) return net.stage2Points || 0;
      if (normalize(net.stage3 || '') === s) return net.stage3Points || 0;
      if (normalize(net.stage4 || '') === s) return net.stage4Points || 0;
      return 0;
  };

  const calculateTotalPoints = (record: ExportRecord) => {
      const stages = record.stage.split(',').map(s => normalize(s)).filter(Boolean);
      let pointsSumPerUnit = 0;
      stages.forEach(s => {
          pointsSumPerUnit += getPointsForOneStage(record.model, record.code, s);
      });
      return record.quantity * pointsSumPerUnit;
  };

  const filteredData = useMemo(() => {
    return data.filter(record => {
      const matchesSearch = 
        record.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.lotNo.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStage = filterStage === 'ALL' || normalize(record.stage).includes(normalize(filterStage));
      return matchesSearch && matchesStage;
    });
  }, [data, searchTerm, filterStage]);

  const totalQuantity = filteredData.reduce((sum, item) => sum + item.quantity, 0);
  const totalPoints = useMemo(() => filteredData.reduce((sum, item) => sum + calculateTotalPoints(item), 0), [filteredData, netData]);

  const handleExportExcel = () => {
      if (!fromDate || !toDate) {
          alert("Vui lòng chọn khoảng thời gian."); return;
      }
      const start = new Date(fromDate);
      const end = new Date(toDate);
      end.setHours(23, 59, 59, 999);

      const exportRows = data.filter(item => {
          const parts = item.date.split('/');
          if (parts.length !== 3) return false;
          const itemDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
          return itemDate >= start && itemDate <= end;
      });

      if (exportRows.length === 0) {
          alert("Không có dữ liệu."); return;
      }

      const headers = ["Ngày", "Thời Gian", "Ca", "Model", "Code", "Lot No", "Công Đoạn HT (Điểm)", "Tổng Điểm", "Số Lượng (PNL)"];
      const rows = exportRows.map(item => {
          // Format công đoạn kèm điểm cho Excel
          const stageWithPoints = item.stage.split(', ').map(s => {
              const pts = getPointsForOneStage(item.model, item.code, s);
              return `${s} [${pts}pts]`;
          }).join(', ');

          return [
              item.date, item.timestamp, item.shift, item.model, item.code, item.lotNo, stageWithPoints, calculateTotalPoints(item), item.quantity
          ];
      });

      exportToExcel([headers, ...rows], `FG_Export_${moduleName}_${fromDate}_to_${toDate}`);
  };

  return (
    <div className="p-6 h-full overflow-y-auto bg-slate-900 flex flex-col gap-6 text-slate-300">
      <div className="bg-slate-800 px-5 py-4 rounded-xl shadow-lg border border-slate-700 flex flex-col md:flex-row justify-between items-center gap-4 sticky top-0 z-20">
        <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-900/30 rounded border border-orange-600/50 text-orange-500 shrink-0"><ArrowUpCircle size={22} /></div>
            <div>
                <h1 className="text-sm font-bold text-white uppercase tracking-tight font-mono">DỮ LIỆU XUẤT KHO THÀNH PHẨM</h1>
                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1">Lưu trữ lịch sử xuất hàng đã hoàn thiện các công đoạn</p>
            </div>
        </div>
        <div className="flex gap-4">
           <div className="bg-slate-950 px-4 py-1.5 rounded-lg border border-slate-700 flex flex-col items-end">
              <span className="text-[9px] text-slate-500 font-black uppercase">Lượng Xuất</span>
              <span className="text-sm font-black text-orange-400 font-mono">{totalQuantity.toLocaleString()} PNL</span>
           </div>
           <div className="bg-slate-950 px-4 py-1.5 rounded-lg border border-slate-700 flex flex-col items-end">
              <span className="text-[9px] text-slate-500 font-black uppercase">Tổng Điểm</span>
              <span className="text-sm font-black text-purple-400 font-mono">{totalPoints.toLocaleString()}</span>
           </div>
        </div>
      </div>

      <div className="bg-slate-800 p-3 rounded-lg shadow-sm border border-slate-700 flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
          <input type="text" placeholder="Tìm Model, Code, Lot No..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-1.5 text-sm bg-slate-900 border border-slate-600 rounded-md text-white outline-none focus:border-orange-500"/>
        </div>
        <div className="flex items-center gap-2 pl-4 border-l border-slate-700">
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs text-slate-300 [color-scheme:dark] w-32"/>
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs text-slate-300 [color-scheme:dark] w-32"/>
            <button onClick={handleExportExcel} className="flex items-center gap-1 px-3 py-1.5 bg-green-700 hover:bg-green-600 text-white text-xs font-bold rounded border border-green-600 transition-colors shadow-sm"><Download size={14} /> XLSX</button>
        </div>
      </div>

      <div className="bg-slate-800 rounded-xl shadow-lg border border-slate-700 flex-1 flex flex-col overflow-hidden">
        <div className="overflow-x-auto flex-1 custom-scrollbar">
            <table className="w-full text-sm text-left border-collapse">
              <thead className="bg-slate-950 text-slate-500 uppercase sticky top-0 z-10 font-bold font-mono">
                <tr>
                  <th className="px-6 py-4 border-b border-slate-700">Ngày / Giờ</th>
                  <th className="px-6 py-4 border-b border-slate-700">Model / Code</th>
                  <th className="px-6 py-4 border-b border-slate-700">Lot No</th>
                  <th className="px-6 py-4 border-b border-slate-700">Quy trình HT</th>
                  <th className="px-6 py-4 border-b border-slate-700 text-right text-purple-400 bg-purple-900/5">Tổng Điểm</th>
                  <th className="px-6 py-4 border-b border-slate-700 text-right">SL (PNL)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {filteredData.map((record) => (
                    <tr key={record.id} className="bg-slate-800 hover:bg-white/5 transition-colors">
                        <td className="px-6 py-3 whitespace-nowrap"><div className="text-slate-100 font-bold">{record.date}</div><div className="text-[10px] text-slate-500 font-mono">{record.timestamp}</div></td>
                        <td className="px-6 py-3"><div className="font-bold text-blue-400 uppercase">{record.model}</div><div className="text-[10px] text-slate-500 font-mono">{record.code}</div></td>
                        <td className="px-6 py-3 font-mono font-bold text-orange-400 uppercase tracking-tighter">{record.lotNo}</td>
                        <td className="px-6 py-3">
                            <div className="flex flex-wrap gap-1">
                                {record.stage.split(', ').map((s, i) => {
                                    const pts = getPointsForOneStage(record.model, record.code, s);
                                    return (
                                        <div key={i} className="bg-slate-900 border border-slate-700 px-2 py-1 rounded flex flex-col items-center justify-center min-w-[40px]">
                                            <span className="text-[9px] font-mono font-black text-slate-400">{s}</span>
                                            <span className="text-[7px] font-bold text-cyan-500">{pts}pts</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </td>
                        <td className="px-6 py-3 text-right font-mono font-bold text-purple-400 bg-purple-900/5">{calculateTotalPoints(record).toLocaleString()}</td>
                        <td className="px-6 py-3 text-right font-black font-mono text-white text-base">{record.quantity.toLocaleString()}</td>
                    </tr>
                ))}
              </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};
