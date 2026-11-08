
import React, { useState, useMemo } from 'react';
import { Search, Filter, Download, Calendar, BookOpen, FileSpreadsheet, Sun, Moon, Activity, HardDrive } from 'lucide-react';
import { AccessoryRecord } from '../../types';
import { exportToExcel } from '../../services/excelService';

interface MultiAutoAccessoriesDataViewerProps {
  moduleName?: string;
  data: AccessoryRecord[];
}

export const MultiAutoAccessoriesDataViewer: React.FC<MultiAutoAccessoriesDataViewerProps> = ({ moduleName = 'Multi Auto', data }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStage, setFilterStage] = useState('ALL');
  
  // Date Range State for Export
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Filter logic for display
  const filteredData = useMemo(() => {
    return data.filter(record => {
      const matchesSearch = 
        record.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.lotNo.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStage = filterStage === 'ALL' || record.stage === filterStage;

      return matchesSearch && matchesStage;
    });
  }, [data, searchTerm, filterStage]);

  const totalQuantity = filteredData.reduce((sum, item) => sum + item.quantity, 0);

  const handleExportExcel = () => {
      if (!fromDate || !toDate) {
          alert("Vui lòng chọn 'Từ ngày' và 'Đến ngày' để xuất báo cáo.");
          return;
      }

      const start = new Date(fromDate);
      const end = new Date(toDate);
      end.setHours(23, 59, 59, 999); 

      // Filter data strictly for export based on date range
      const exportData = data.filter(item => {
          const parts = item.date.split('/');
          if (parts.length !== 3) return false;
          const itemDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
          return itemDate >= start && itemDate <= end;
      });

      if (exportData.length === 0) {
          alert("Không có dữ liệu nào trong khoảng thời gian đã chọn.");
          return;
      }

      // Headers
      const headers = ["Ngày", "Thời Gian", "Ca Làm Việc", "Model", "Code", "Mã Phụ Liệu/Lot", "Công Đoạn", "Số Lượng (EA)"];

      // Rows
      const rows = exportData.map(item => [
          item.date,
          item.timestamp,
          item.shift,
          item.model,
          item.code,
          item.lotNo,
          item.stage,
          item.quantity
      ]);

      // Combine
      const excelData = [headers, ...rows];

      // Filename
      const filename = `So_Nhap_Phu_Lieu_${moduleName.replace(/\s+/g, '')}_${fromDate}_den_${toDate}`;

      // Trigger Export
      exportToExcel(excelData, filename);
  };

  return (
    <div className="p-6 h-full overflow-y-auto bg-slate-900 flex flex-col gap-6 text-slate-300">
      {/* Header */}
      <div className="bg-slate-800 px-3 py-2 md:px-4 md:py-3 rounded-lg shadow-lg border border-slate-700 flex flex-col md:flex-row justify-between items-center gap-3 sticky top-0 z-20">
        <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-900/30 rounded border border-blue-600/50 text-blue-400 shrink-0">
               <BookOpen size={20} />
            </div>
            <div>
                <h1 className="text-sm font-bold text-white uppercase tracking-tight font-mono">
                    SỔ NHẬP PL ({moduleName})
                </h1>
                <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5 flex items-center gap-1">
                    <span className="w-1 h-1 bg-green-500 rounded-full animate-pulse"></span>
                    SYSTEM STATUS: ONLINE
                </div>
            </div>
        </div>
        
        {/* Right Side: System Info & Summary */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
           <div className="flex gap-2 text-xs">
                <div className="bg-blue-900/30 px-3 py-1 rounded border border-blue-700 flex items-center gap-2 shadow-sm">
                    <span className="text-slate-400 font-medium">Records:</span>
                    <span className="font-bold text-blue-400">{filteredData.length}</span>
                </div>
                <div className="bg-green-900/30 px-3 py-1 rounded border border-green-700 flex items-center gap-2 shadow-sm">
                    <span className="text-slate-400 font-medium">Tổng SL:</span>
                    <span className="font-bold text-green-400">{totalQuantity.toLocaleString()} EA</span>
                </div>
           </div>
           
           <div className="hidden md:flex items-center gap-3 text-[10px] font-mono text-slate-400 bg-slate-900 px-2 py-1 rounded border border-slate-700 shadow-sm">
                <div className="flex items-center gap-1.5">
                    <Activity size={10} className="text-blue-500"/> <span className="font-bold text-slate-300">CPU: 15%</span>
                </div>
                <div className="w-px h-3 bg-slate-600"></div>
                <div className="flex items-center gap-1.5">
                    <HardDrive size={10} className="text-orange-500"/> <span className="font-bold text-slate-300">RAM: 35%</span>
                </div>
           </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-slate-800 p-3 rounded-lg shadow-sm border border-slate-700 flex flex-wrap gap-4 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
          <input 
            type="text" 
            placeholder="Tìm kiếm Model, Code, Lot No..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-sm bg-slate-900 border border-slate-600 rounded-md focus:ring-1 focus:ring-blue-500 focus:outline-none text-white placeholder-slate-600"
          />
        </div>
        
        {/* Stage Filter */}
        <div className="flex items-center gap-2">
            <Filter size={16} className="text-slate-500" />
            <select 
                className="bg-slate-900 border border-slate-600 rounded-md px-2 py-1.5 text-sm focus:ring-1 focus:ring-blue-500 focus:outline-none text-white"
                value={filterStage}
                onChange={(e) => setFilterStage(e.target.value)}
            >
                <option value="ALL">Tất cả công đoạn</option>
                <option value="1L-1">1L-1</option>
                <option value="1L-2">1L-2</option>
                <option value="2L-1">2L-1</option>
                <option value="2L-2">2L-2</option>
                <option value="3L-1">3L-1</option>
                <option value="3L-2">3L-2</option>
                <option value="4L-1">4L-1</option>
                <option value="4L-2">4L-2</option>
            </select>
        </div>

        {/* Date Range Export Section */}
        <div className="flex items-center gap-2 pl-4 border-l border-slate-700">
            <div className="flex items-center gap-1 bg-slate-900 border border-slate-600 rounded px-2 py-1">
                <span className="text-xs text-slate-500 font-medium">Từ:</span>
                <input 
                    type="date" 
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="bg-transparent text-xs focus:outline-none text-slate-300 w-24 [color-scheme:dark]"
                />
            </div>
            <div className="flex items-center gap-1 bg-slate-900 border border-slate-600 rounded px-2 py-1">
                <span className="text-xs text-slate-500 font-medium">Đến:</span>
                <input 
                    type="date" 
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="bg-transparent text-xs focus:outline-none text-slate-300 w-24 [color-scheme:dark]"
                />
            </div>
            <button 
                onClick={handleExportExcel}
                className="flex items-center gap-1 px-3 py-1.5 bg-green-700 hover:bg-green-600 text-white text-xs font-bold rounded shadow-sm transition-colors border border-green-600"
            >
               <Download size={14} /> Xuất Excel
            </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-800 rounded-xl shadow-lg border border-slate-700 flex-1 flex flex-col overflow-hidden">
        <div className="overflow-x-auto flex-1">
            <table className="w-full text-sm text-left text-slate-300">
              <thead className="text-xs text-slate-500 uppercase bg-slate-900 sticky top-0 z-10 font-bold font-mono">
                <tr>
                  <th className="px-6 py-3 border-b border-slate-700">Ngày</th>
                  <th className="px-6 py-3 border-b border-slate-700">Thời gian</th>
                  <th className="px-6 py-3 border-b border-slate-700">Ca làm việc</th>
                  <th className="px-6 py-3 border-b border-slate-700">Tên Model</th>
                  <th className="px-6 py-3 border-b border-slate-700">Code</th>
                  <th className="px-6 py-3 border-b border-slate-700">Mã Phụ Liệu/Lot</th>
                  <th className="px-6 py-3 border-b border-slate-700">Công đoạn</th>
                  <th className="px-6 py-3 border-b border-slate-700 text-right">Số lượng (EA)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-slate-500 italic">
                      <div className="flex flex-col items-center gap-3">
                         <FileSpreadsheet size={48} className="opacity-20"/>
                         <span>Không tìm thấy dữ liệu phù hợp.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredData.map((record) => (
                    <tr key={record.id} className="bg-slate-800 hover:bg-blue-900/20 transition-colors group">
                      <td className="px-6 py-2 whitespace-nowrap text-slate-500">
                          <div className="flex items-center gap-2">
                              <Calendar size={14} className="opacity-50"/>
                              {record.date}
                          </div>
                      </td>
                      <td className="px-6 py-2 font-mono text-slate-400">{record.timestamp}</td>
                      <td className="px-6 py-2">
                          {record.shift === 'Ca Ngày' ? (
                             <span className="inline-flex items-center gap-1 text-yellow-400 bg-yellow-900/30 px-2 py-0.5 rounded border border-yellow-700 font-medium text-xs">
                                <Sun size={12}/> {record.shift}
                             </span>
                          ) : (
                             <span className="inline-flex items-center gap-1 text-purple-400 bg-purple-900/30 px-2 py-0.5 rounded border border-purple-700 font-medium text-xs">
                                <Moon size={12}/> {record.shift}
                             </span>
                          )}
                      </td>
                      <td className="px-6 py-2 font-bold text-blue-400">{record.model}</td>
                      <td className="px-6 py-2">
                          <span className="bg-slate-900 text-slate-300 px-2 py-0.5 rounded text-xs font-mono border border-slate-600">
                              {record.code}
                          </span>
                      </td>
                      <td className="px-6 py-2 font-mono text-green-400 font-bold">{record.lotNo}</td>
                      <td className="px-6 py-2">
                        <span className={`
                            px-2 py-0.5 rounded text-[10px] border font-mono font-bold
                            ${record.stage.startsWith('1L') ? 'bg-indigo-900/40 text-indigo-400 border-indigo-700' : ''}
                            ${record.stage.startsWith('2L') ? 'bg-purple-900/40 text-purple-400 border-purple-700' : ''}
                            ${record.stage.startsWith('3L') ? 'bg-pink-900/40 text-pink-400 border-pink-700' : ''}
                            ${record.stage.startsWith('4L') ? 'bg-orange-900/40 text-orange-400 border-orange-700' : ''}
                        `}>
                          {record.stage}
                        </span>
                      </td>
                      <td className="px-6 py-2 text-right font-mono font-bold text-blue-400">
                          {record.quantity.toLocaleString()}
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
