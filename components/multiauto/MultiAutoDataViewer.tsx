
import React, { useState, useMemo } from 'react';
import { Search, Filter, Download, Calendar, ArrowUpDown, Database, FileSpreadsheet, Sun, Moon } from 'lucide-react';
import { ImportRecord } from '../../types';
import { exportToExcel } from '../../services/excelService';

interface MultiAutoDataViewerProps {
  moduleName?: string;
  data: ImportRecord[];
}

export const MultiAutoDataViewer: React.FC<MultiAutoDataViewerProps> = ({ moduleName = 'Multi Auto', data }) => {
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
      end.setHours(23, 59, 59, 999); // Include the end date fully

      // Filter data strictly for export based on date range
      const exportData = data.filter(item => {
          // Parse item date (assuming DD/MM/YYYY format from types)
          const parts = item.date.split('/');
          // Handle potential date format issues
          if (parts.length !== 3) return false;
          
          const itemDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
          return itemDate >= start && itemDate <= end;
      });

      if (exportData.length === 0) {
          alert("Không có dữ liệu nào trong khoảng thời gian đã chọn.");
          return;
      }

      // 1. Define Headers
      const headers = ["Ngày", "Thời Gian", "Ca Làm Việc", "Model", "Code", "Lot No", "Công Đoạn", "Số Lượng (PNL)"];

      // 2. Format Data Rows
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

      // 3. Combine Headers and Data
      const excelData = [headers, ...rows];

      // 4. Generate filename
      const filename = `BaoCao_Nhap_${moduleName.replace(/\s+/g, '')}_${fromDate}_den_${toDate}`;

      // 5. Trigger Export
      exportToExcel(excelData, filename);
  };

  return (
    <div className="p-6 h-full overflow-y-auto bg-slate-900 flex flex-col gap-6 text-slate-300">
      {/* Responsive Header */}
      <div className="bg-slate-800 px-3 py-2 md:px-4 md:py-3 rounded-lg shadow-lg border border-slate-700 flex flex-col md:flex-row justify-between items-center gap-3 sticky top-0 z-20">
        <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="p-1.5 bg-amber-900/30 rounded border border-amber-600/50 text-amber-500 shrink-0">
               <Database size={18} />
            </div>
            <h1 className="text-sm md:text-base font-bold text-white uppercase tracking-tight truncate font-mono">
              SO NHẬP ({moduleName})
            </h1>
        </div>
        <div className="flex gap-2 text-xs w-full md:w-auto justify-center md:justify-end">
           <div className="bg-blue-900/30 px-3 py-1 rounded border border-blue-700 flex items-center gap-2">
              <span className="text-slate-400 font-medium">Records:</span>
              <span className="font-bold text-blue-400">{filteredData.length}</span>
           </div>
           <div className="bg-green-900/30 px-3 py-1 rounded border border-green-700 flex items-center gap-2">
              <span className="text-slate-400 font-medium">Tổng SL:</span>
              <span className="font-bold text-green-400">{totalQuantity.toLocaleString()} PNL</span>
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
                  <th className="px-6 py-3 border-b border-slate-700">Lot No</th>
                  <th className="px-6 py-3 border-b border-slate-700">Công đoạn</th>
                  <th className="px-6 py-3 border-b border-slate-700 text-right">Số lượng (PNL)</th>
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
                    <tr key={record.id} className="bg-slate-800 hover:bg-slate-700/50 transition-colors group">
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
