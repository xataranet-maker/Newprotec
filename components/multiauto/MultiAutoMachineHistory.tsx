
import React, { useState, useMemo } from 'react';
import { Search, Calendar, Monitor, Clock, Play, Pause, CheckCircle2, History, Filter, Download, Info, Zap, AlertTriangle, User, Activity, Timer } from 'lucide-react';
import { MachineActivityLog, MachineSetup, Language } from '../../types';
import { exportToExcel } from '../../services/excelService';
import { translations } from '../../data/locales';

interface MultiAutoMachineHistoryProps {
  moduleName?: string;
  logs: MachineActivityLog[];
  machineStatuses: MachineSetup[];
  language?: Language;
}

const formatSeconds = (seconds: number = 0) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
};

export const MultiAutoMachineHistory: React.FC<MultiAutoMachineHistoryProps> = ({ 
    moduleName = 'Multi Auto', 
    logs, 
    machineStatuses,
    language = 'en' 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState(() => {
      const now = new Date();
      if (now.getHours() < 8) now.setDate(now.getDate() - 1);
      const d = String(now.getDate()).padStart(2, '0');
      const m = String(now.getMonth() + 1).padStart(2, '0');
      const y = now.getFullYear();
      return `${d}/${m}/${y}`;
  });
  const [filterMachine, setFilterMachine] = useState('ALL');
  
  const t = translations[language];

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchesDate = log.logicalDate === selectedDate;
      const matchesMachine = filterMachine === 'ALL' || log.machineName === filterMachine;
      const matchesSearch = 
        log.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.lotNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.reason && log.reason.toLowerCase().includes(searchTerm.toLowerCase()));

      return matchesDate && matchesMachine && matchesSearch;
    }).sort((a, b) => b.id - a.id);
  }, [logs, selectedDate, filterMachine, searchTerm]);

  const handleExportExcel = () => {
      if (filteredLogs.length === 0) return;
      const headers = ["Ngày SX", "Thời điểm", "Tên Máy", "Sự kiện", "Model", "Lot No", "Lý do (Nếu dừng)", "Người vận hành"];
      const rows = filteredLogs.map(log => [
          log.logicalDate, log.timestamp, log.machineName, log.eventType, 
          log.model, log.lotNo, log.reason || '-', log.operator || '-'
      ]);
      exportToExcel([headers, ...rows], `NhatKyVanhHanh_${moduleName}_${selectedDate.replace(/\//g, '-')}`);
  };

  const getEventBadge = (type: MachineActivityLog['eventType']) => {
      switch(type) {
          case 'START': return <span className="bg-green-900/30 text-green-400 border border-green-700 px-2 py-0.5 rounded text-[10px] font-black flex items-center gap-1"><Play size={10} fill="currentColor"/> BẮT ĐẦU</span>;
          case 'STOP': return <span className="bg-red-900/30 text-red-400 border border-red-700 px-2 py-0.5 rounded text-[10px] font-black flex items-center gap-1"><Pause size={10} fill="currentColor"/> DỪNG MÁY</span>;
          case 'RESUME': return <span className="bg-blue-900/30 text-blue-400 border border-blue-700 px-2 py-0.5 rounded text-[10px] font-black flex items-center gap-1"><Zap size={10} fill="currentColor"/> TIẾP TỤC</span>;
          case 'FINISH': return <span className="bg-indigo-900/30 text-indigo-400 border border-indigo-700 px-2 py-0.5 rounded text-[10px] font-black flex items-center gap-1"><CheckCircle2 size={10}/> KẾT THÚC</span>;
          default: return <span className="bg-slate-700 text-slate-300 px-2 py-0.5 rounded text-[10px] font-bold">{type}</span>;
      }
  };

  return (
    <div className="p-6 h-full overflow-y-auto bg-[#020617] flex flex-col gap-6 text-slate-300 custom-scrollbar">
      <div className="bg-slate-800 px-4 py-3 rounded-xl shadow-lg border border-slate-700 flex flex-col md:flex-row justify-between items-center gap-4 sticky top-0 z-20 backdrop-blur-md">
        <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-900/30 rounded border border-blue-600/50 text-blue-400"><History size={20} /></div>
            <h1 className="text-base font-bold text-white uppercase font-mono tracking-widest">NHẬT KÝ VẬN HÀNH MÁY ({moduleName})</h1>
        </div>
        
        <div className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-700 shadow-inner">
            <Calendar size={16} className="text-blue-500"/>
            <input 
                type="text" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
                placeholder="DD/MM/YYYY" className="bg-transparent text-sm font-bold text-white w-28 outline-none font-mono text-center"
            />
        </div>
      </div>

      <div className="bg-slate-800 p-3 rounded-xl border border-slate-700 flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
          <input type="text" placeholder="Tìm Model, Lot, Lý do..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-1.5 text-sm bg-slate-900 border border-slate-600 rounded-md text-white outline-none focus:border-blue-500"/>
        </div>
        <select className="bg-slate-900 border border-slate-600 rounded-md px-2 py-1.5 text-sm text-white font-bold" value={filterMachine} onChange={(e) => setFilterMachine(e.target.value)}>
            <option value="ALL">Tất cả máy</option>
            {machineStatuses.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
        </select>
        <button onClick={handleExportExcel} className="flex items-center gap-1 px-3 py-1.5 bg-green-700 hover:bg-green-600 text-white text-xs font-bold rounded shadow-sm border border-green-600 uppercase tracking-tighter transition-all"><Download size={14} /> Export Excel</button>
      </div>

      <div className="bg-slate-800 rounded-2xl border border-slate-700 flex-1 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto flex-1 custom-scrollbar h-full min-h-[400px]">
          <table className="w-full text-[11px] text-left text-slate-300 border-collapse">
            <thead className="bg-slate-950 text-slate-500 uppercase font-bold font-mono border-b border-slate-700 sticky top-0">
              <tr>
                <th className="px-5 py-4">Thời điểm</th>
                <th className="px-5 py-4">Tên Máy</th>
                <th className="px-5 py-4 text-center">Sự kiện thao tác</th>
                <th className="px-5 py-4">Sản phẩm / Lô hàng</th>
                <th className="px-5 py-4">Lý do (Nếu dừng)</th>
                <th className="px-5 py-4">Người thực hiện (PIC)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {filteredLogs.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-20 text-center text-slate-600 italic uppercase font-black tracking-widest opacity-20">Không có nhật ký vận hành</td></tr>
              ) : (
                filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-750 transition-colors">
                      <td className="px-5 py-3 font-mono text-[10px] text-slate-500">
                          <div className="text-slate-300 font-bold">{log.timestamp}</div>
                          <div className="text-[9px]">{log.date}</div>
                      </td>
                      <td className="px-5 py-3 font-black text-blue-400 font-mono text-xs uppercase tracking-tighter">{log.machineName}</td>
                      <td className="px-5 py-3 text-center">{getEventBadge(log.eventType)}</td>
                      <td className="px-5 py-3">
                        <div className="font-bold text-white uppercase">{log.model}</div>
                        <div className="font-mono text-yellow-500 text-[10px] font-bold">{log.lotNo}</div>
                      </td>
                      <td className="px-5 py-3">
                        {log.reason ? (
                            <div className="flex items-center gap-1.5 text-red-400 italic">
                                <AlertTriangle size={12}/> {log.reason}
                            </div>
                        ) : <span className="text-slate-700">-</span>}
                      </td>
                      <td className="px-5 py-3">
                          <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 px-2 py-1 rounded w-fit">
                              <User size={10} className="text-slate-500"/>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{log.operator}</span>
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
  );
};
