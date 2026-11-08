
import React, { useState, useRef, useMemo } from 'react';
import { Search, Network, Upload, Clock, Plus, Edit, Trash2, X, Save, Layers, Box, User, Activity, HardDrive, FileSpreadsheet, CheckCircle2, XCircle, ChevronRight, ChevronDown, Thermometer, Info, Wind, Download } from 'lucide-react';
import { NetDataRecord } from '../../types';
import * as XLSX from 'xlsx';
import { exportToExcel } from '../../services/excelService';

const SUGGESTED_STAGES = ['1L-1', '1L-2', '2L-1', '2L-2', '3L-1', '3L-2', '4L-1', '4L-2', 'TOP', 'BOT', 'Solder'];
const STAGE_OPTIONS = ['1L-1', '1L-2', '2L-1', '2L-2', '3L-1', '3L-2', '4L-1', '4L-2'];

interface MultiAutoNetDataProps {
  moduleName?: string;
  data: NetDataRecord[];
  onDataUpdate: (newData: NetDataRecord[]) => void;
}

export const MultiAutoNetData: React.FC<MultiAutoNetDataProps> = ({ moduleName = 'Multi Auto', data, onDataUpdate }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedModels, setExpandedModels] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Partial<NetDataRecord>>({
      model: '', code: '', customer: '', layer: 'OUTER',
      stage: '', stage1Points: undefined,
      stage2: '', stage2Points: undefined,
      stage3: '', stage3Points: undefined,
      stage4: '', stage4Points: undefined,
      timePerPoint: undefined,
      status: 'OK',
      tableTemp: undefined, padTemp: undefined, airPressure: undefined, workingCondition: ''
  });

  const toggleExpand = (modelName: string) => {
    const newSet = new Set(expandedModels);
    if (newSet.has(modelName)) newSet.delete(modelName);
    else newSet.add(modelName);
    setExpandedModels(newSet);
  };

  const handleEdit = (record: NetDataRecord) => {
      setEditingId(record.id);
      setFormData({ ...record });
      setIsModalOpen(true);
  };

  const handleDelete = (id: number) => {
      if (window.confirm("Bạn có chắc chắn muốn xóa dữ liệu này?")) {
          const updatedData = data.filter(item => item.id !== id);
          onDataUpdate(updatedData);
      }
  };

  const handleSave = (e: React.FormEvent) => {
      e.preventDefault();
      if (!formData.model || !formData.code) return;

      const saveData: NetDataRecord = {
          id: editingId || Date.now(),
          model: formData.model!,
          code: formData.code!,
          customer: formData.customer || '',
          layer: formData.layer || 'OUTER',
          stage: formData.stage || '',
          stage1Points: Number(formData.stage1Points) || 0,
          stage2: formData.stage2 || '',
          stage2Points: Number(formData.stage2Points) || 0,
          stage3: formData.stage3 || '',
          stage3Points: Number(formData.stage3Points) || 0,
          stage4: formData.stage4 || '',
          stage4Points: Number(formData.stage4Points) || 0,
          timePerPoint: Number(formData.timePerPoint) || 0,
          status: (formData.status as any) || 'OK',
          tableTemp: Number(formData.tableTemp) || 0,
          padTemp: Number(formData.padTemp) || 0,
          airPressure: Number(formData.airPressure) || 0,
          workingCondition: formData.workingCondition || ''
      };

      if (editingId) {
          onDataUpdate(data.map(item => item.id === editingId ? saveData : item));
      } else {
          onDataUpdate([saveData, ...data]);
      }
      setIsModalOpen(false);
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (evt) => {
          try {
              const bstr = evt.target?.result;
              const wb = XLSX.read(bstr, { type: 'binary' });
              const wsname = wb.SheetNames[0];
              const ws = wb.Sheets[wsname];
              const jsonData: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

              if (jsonData.length === 0) {
                  alert("File không có dữ liệu.");
                  return;
              }

              const imported: NetDataRecord[] = jsonData.map((row, idx) => ({
                  id: Date.now() + idx,
                  model: String(row['Model'] || row['MODEL'] || '').toUpperCase(),
                  code: String(row['Code'] || row['CODE'] || ''),
                  customer: String(row['Customer'] || row['KHÁCH HÀNG'] || ''),
                  layer: String(row['Layer'] || row['Lớp'] || 'OUTER').toUpperCase(),
                  stage: String(row['Stage1'] || row['CĐ 1'] || ''),
                  stage1Points: Number(row['Pts1'] || row['Điểm 1'] || 0),
                  stage2: String(row['Stage2'] || row['CĐ 2'] || ''),
                  stage2Points: Number(row['Pts2'] || row['Điểm 2'] || 0),
                  stage3: String(row['Stage3'] || row['CĐ 3'] || ''),
                  stage3Points: Number(row['Pts3'] || row['Điểm 3'] || 0),
                  stage4: String(row['Stage4'] || row['CĐ 4'] || ''),
                  stage4Points: Number(row['Pts4'] || row['Điểm 4'] || 0),
                  timePerPoint: Number(row['TPP'] || row['TG/Điểm'] || 1.5),
                  tableTemp: Number(row['TableTemp'] || row['Nhiệt Table'] || 0),
                  padTemp: Number(row['PadTemp'] || row['Nhiệt Pad'] || 0),
                  airPressure: Number(row['Air'] || row['Khí'] || 0),
                  status: 'OK' as 'OK' | 'NG',
                  workingCondition: String(row['Note'] || '')
              })).filter(item => item.model && item.code);

              if (window.confirm(`Tìm thấy ${imported.length} dòng dữ liệu. Bạn có muốn nhập vào hệ thống?`)) {
                  onDataUpdate([...imported, ...data]);
                  alert("Nhập dữ liệu thành công!");
              }
          } catch (err) {
              alert("Lỗi khi đọc file Excel. Vui lòng kiểm tra lại định dạng.");
          }
      };
      reader.readAsBinaryString(file);
      if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleExportExcel = () => {
      if (data.length === 0) {
          alert("Không có dữ liệu để xuất.");
          return;
      }
      const headers = ["Model", "Code", "Customer", "Layer", "Stage1", "Pts1", "Stage2", "Pts2", "Stage3", "Pts3", "Stage4", "Pts4", "TPP", "TableTemp", "PadTemp", "Air", "Note"];
      const rows = data.map(record => [
          record.model,
          record.code,
          record.customer || '',
          record.layer || '',
          record.stage || '',
          record.stage1Points || 0,
          record.stage2 || '',
          record.stage2Points || 0,
          record.stage3 || '',
          record.stage3Points || 0,
          record.stage4 || '',
          record.stage4Points || 0,
          record.timePerPoint || 0,
          record.tableTemp || 0,
          record.padTemp || 0,
          record.airPressure || 0,
          record.workingCondition || ''
      ]);
      exportToExcel([headers, ...rows], `DataNet_${moduleName.replace(/\s+/g, '')}_${new Date().getTime()}`);
  };

  const groupedData = useMemo(() => {
    const filtered = data.filter(item => 
        item.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.code.toLowerCase().includes(searchTerm.toLowerCase())
    );
    const groups: Record<string, NetDataRecord[]> = {};
    filtered.forEach(record => {
        if (!groups[record.model]) groups[record.model] = [];
        groups[record.model].push(record);
    });
    return groups;
  }, [data, searchTerm]);

  // Biến đếm STT toàn cục cho quá trình render bảng
  let globalIndex = 0;

  return (
    <div className="p-6 h-full overflow-hidden bg-slate-900 flex flex-col gap-6 text-slate-300">
      <div className="bg-slate-800 px-4 py-3 rounded-lg shadow-lg border border-slate-700 flex justify-between items-center sticky top-0 z-20 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-900/30 rounded border border-cyan-600/50 text-cyan-400 shrink-0"><Network size={20} /></div>
          <h1 className="text-sm font-bold text-white uppercase tracking-tight font-mono">DATA NET ({moduleName})</h1>
        </div>
        <div className="flex gap-2">
            <input type="file" ref={fileInputRef} onChange={handleImportExcel} accept=".xlsx, .xls" className="hidden" />
            <button onClick={() => fileInputRef.current?.click()} className="px-4 py-2 bg-green-700 hover:bg-green-600 text-white text-[10px] font-black rounded shadow-lg transition-all border-b-4 border-green-900 flex items-center gap-2 uppercase tracking-widest"><FileSpreadsheet size={14}/> Nhập Excel</button>
            <button onClick={handleExportExcel} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-[10px] font-black rounded shadow-lg transition-all border-b-4 border-slate-900 flex items-center gap-2 uppercase tracking-widest"><Download size={14}/> Xuất Excel</button>
            <button onClick={() => { setEditingId(null); setFormData({ model: '', code: '', customer: '', layer: 'OUTER', stage: '', stage1Points: undefined, status: 'OK' }); setIsModalOpen(true); }} className="px-4 py-2 bg-blue-700 hover:bg-blue-600 text-white text-[10px] font-black rounded shadow-lg transition-all active:scale-95 border-b-4 border-blue-900 uppercase tracking-widest">Thêm Mới</button>
        </div>
      </div>

      <div className="bg-slate-800 p-3 rounded-lg border border-slate-700 flex items-center gap-3 shrink-0">
          <Search size={18} className="text-slate-500" />
          <input type="text" placeholder="Tìm kiếm Model hoặc Code..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="bg-transparent border-none outline-none text-sm w-full text-white" />
      </div>

      <div className="bg-slate-800 rounded-xl shadow-lg border border-slate-700 flex-1 flex flex-col overflow-hidden">
        <div className="overflow-auto flex-1 custom-scrollbar">
          <table className="w-full text-left text-xs border-collapse min-w-[1200px]">
            <thead className="bg-slate-900 text-slate-500 uppercase font-black font-mono sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-6 py-3 border-b border-slate-700 min-w-[50px]">STT</th>
                <th className="px-6 py-3 border-b border-slate-700 min-w-[150px]">Tên Model</th>
                <th className="px-6 py-3 border-b border-slate-700 min-w-[120px]">Code</th>
                <th className="px-6 py-3 border-b border-slate-700 min-w-[120px]">Khách hàng</th>
                <th className="px-6 py-3 border-b border-slate-700 min-w-[120px]">Lớp Làm Việc</th>
                
                {/* Stage 1 */}
                <th className="px-6 py-3 border-b border-slate-700 bg-blue-900/20 min-w-[100px]">CĐ 1</th>
                <th className="px-6 py-3 border-b border-slate-700 bg-blue-900/20 min-w-[80px]">Điểm 1</th>
                
                {/* Stage 2 */}
                <th className="px-6 py-3 border-b border-slate-700 bg-purple-900/20 min-w-[100px]">CĐ 2</th>
                <th className="px-6 py-3 border-b border-slate-700 bg-purple-900/20 min-w-[80px]">Điểm 2</th>

                {/* Stage 3 */}
                <th className="px-6 py-3 border-b border-slate-700 bg-orange-900/20 min-w-[100px]">CĐ 3</th>
                <th className="px-6 py-3 border-b border-slate-700 bg-orange-900/20 min-w-[80px]">Điểm 3</th>

                {/* Stage 4 */}
                <th className="px-6 py-3 border-b border-slate-700 bg-pink-900/20 min-w-[100px]">CĐ 4</th>
                <th className="px-6 py-3 border-b border-slate-700 bg-pink-900/20 min-w-[80px]">Điểm 4</th>

                <th className="px-6 py-3 border-b border-slate-700 text-center min-w-[80px]">TG/Điểm (s)</th>
                <th className="px-6 py-3 border-b border-slate-700 text-center min-w-[80px]">Trạng Thái</th>
                <th className="px-6 py-3 border-b border-slate-700 text-center min-w-[100px]">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {(Object.entries(groupedData) as [string, NetDataRecord[]][]).map(([modelName, records]) => {
                  const isExpanded = expandedModels.has(modelName);
                  return (
                      <React.Fragment key={modelName}>
                          {records.slice(0, isExpanded ? records.length : 1).map((record, rIdx) => {
                              // Tăng số thứ tự tuyệt đối
                              globalIndex++;
                              return (
                                  <tr key={record.id} className="hover:bg-slate-700/30 transition-colors group">
                                      <td className="px-6 py-2 font-medium text-slate-500 font-mono">{globalIndex}</td>
                                      <td className="px-6 py-2 font-bold text-blue-400">{rIdx === 0 ? record.model : ''}</td>
                                      <td className="px-6 py-2 font-mono flex items-center justify-between">
                                          <span className="text-white font-bold">{record.code}</span>
                                          {rIdx === 0 && records.length > 1 && (
                                              <button onClick={() => toggleExpand(modelName)} className="p-1 hover:bg-white/10 rounded text-slate-500">
                                                  {isExpanded ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}
                                              </button>
                                          )}
                                      </td>
                                      <td className="px-6 py-2 font-medium text-slate-400">{record.customer || '-'}</td>
                                      
                                      {/* Layer Info */}
                                      <td className="px-6 py-2">
                                         {record.layer === 'INNER' ? (
                                            <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-900/40 text-purple-300 border border-purple-700 w-fit">
                                                <Layers size={10}/> Lớp Trong
                                            </span>
                                         ) : (
                                            <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-900/40 text-blue-300 border border-blue-700 w-fit">
                                                <Box size={10}/> Lớp Ngoài
                                            </span>
                                         )}
                                      </td>
                                      
                                      {/* Stage 1 */}
                                      <td className="px-6 py-2 bg-blue-900/10">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${record.stage ? 'bg-blue-900/40 text-blue-300 border-blue-700' : 'text-slate-600 border-transparent'}`}>
                                            {record.stage || '-'}
                                        </span>
                                      </td>
                                      <td className="px-6 py-2 font-mono text-slate-300 font-bold bg-blue-900/10">{record.stage1Points}</td>

                                      {/* Stage 2 */}
                                      <td className="px-6 py-2 bg-purple-900/10">
                                        {record.stage2 ? (
                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold border bg-purple-900/40 text-purple-300 border-purple-700">
                                                {record.stage2}
                                            </span>
                                        ) : <span className="text-slate-600">-</span>}
                                      </td>
                                      <td className="px-6 py-2 font-mono text-slate-300 font-bold bg-purple-900/10">{record.stage2Points || '-'}</td>

                                      {/* Stage 3 */}
                                      <td className="px-6 py-2 bg-orange-900/10">
                                        {record.stage3 ? (
                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold border bg-orange-900/40 text-orange-300 border-orange-700">
                                                {record.stage3}
                                            </span>
                                        ) : <span className="text-slate-600">-</span>}
                                      </td>
                                      <td className="px-6 py-2 font-mono text-slate-300 font-bold bg-orange-900/10">{record.stage3Points || '-'}</td>

                                       {/* Stage 4 */}
                                      <td className="px-6 py-2 bg-pink-900/10">
                                        {record.stage4 ? (
                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold border bg-pink-900/40 text-pink-300 border-pink-700">
                                                {record.stage4}
                                            </span>
                                        ) : <span className="text-slate-600">-</span>}
                                      </td>
                                      <td className="px-6 py-2 font-mono text-slate-300 font-bold bg-pink-900/10">{record.stage4Points || '-'}</td>

                                      <td className="px-6 py-2 text-center font-bold text-slate-200 bg-slate-900/30">{record.timePerPoint}</td>
                                      <td className="px-6 py-2 text-center">
                                        {record.status === 'OK' ? (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-900/30 text-green-400 border border-green-700">
                                                <CheckCircle2 size={10}/> OK
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-900/30 text-red-400 border-red-700">
                                                <XCircle size={10}/> NG
                                            </span>
                                        )}
                                      </td>
                                      <td className="px-6 py-2 text-center">
                                          <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                              <button 
                                                onClick={() => handleEdit(record)}
                                                className="p-1 text-blue-400 hover:bg-blue-900/50 rounded transition-colors"
                                                title="Sửa"
                                              >
                                                  <Edit size={14}/>
                                              </button>
                                              <button 
                                                onClick={() => handleDelete(record.id)}
                                                className="p-1 text-red-400 hover:bg-red-900/50 rounded transition-colors"
                                                title="Xóa"
                                              >
                                                  <Trash2 size={14}/>
                                              </button>
                                          </div>
                                      </td>
                                  </tr>
                              );
                          })}
                      </React.Fragment>
                  );
              })}
              {Object.keys(groupedData).length === 0 && (
                 <tr>
                    <td colSpan={17} className="px-6 py-12 text-center text-slate-500">
                        <div className="flex flex-col items-center gap-2">
                            <FileSpreadsheet size={40} className="text-slate-600"/>
                            <span>Chưa có dữ liệu.</span>
                        </div>
                    </td>
                 </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CRUD Modal */}
      {isModalOpen && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
              <div className="bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh] border border-slate-600">
                  <div className="px-6 py-3 bg-cyan-700 flex justify-between items-center text-white shrink-0">
                      <h2 className="text-base font-bold flex items-center gap-2">
                          {editingId ? <Edit size={18}/> : <Plus size={18}/>}
                          {editingId ? 'Cập Nhật Data Net' : 'Thêm Mới Data Net'}
                      </h2>
                      <button onClick={() => setIsModalOpen(false)} className="hover:bg-white/20 p-1 rounded transition-colors">
                          <X size={18}/>
                      </button>
                  </div>
                  
                  <form onSubmit={handleSave} className="p-6 space-y-4 overflow-y-auto">
                      <div className="grid grid-cols-3 gap-4">
                          <div className="col-span-1">
                              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Tên Model <span className="text-red-500">*</span></label>
                              <input 
                                type="text" 
                                value={formData.model} 
                                onChange={(e) => setFormData({...formData, model: e.target.value.toUpperCase()})}
                                className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 focus:ring-1 focus:ring-cyan-500 focus:outline-none font-bold text-white text-sm"
                                placeholder="VD: M-2034-X"
                                required
                              />
                          </div>
                          <div className="col-span-1">
                              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Code <span className="text-red-500">*</span></label>
                              <input 
                                type="text" 
                                value={formData.code} 
                                onChange={(e) => setFormData({...formData, code: e.target.value})}
                                className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 focus:ring-1 focus:ring-cyan-500 focus:outline-none font-mono text-sm text-white"
                                placeholder="VD: C-9921"
                                required
                              />
                          </div>
                          <div className="col-span-1">
                              <label className="block text-xs font-bold text-slate-400 uppercase mb-1 flex items-center gap-1"><User size={12}/> Khách Hàng</label>
                              <input 
                                type="text" 
                                value={formData.customer} 
                                onChange={(e) => setFormData({...formData, customer: e.target.value})}
                                className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 focus:ring-1 focus:ring-cyan-500 focus:outline-none text-sm text-blue-400 font-medium"
                                placeholder="VD: Samsung"
                              />
                          </div>
                      </div>

                      {/* Layer Selection */}
                      <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700">
                           <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Lớp Làm Việc</label>
                           <div className="flex gap-4">
                               <label className="flex items-center gap-2 cursor-pointer p-2 border rounded bg-slate-800 hover:bg-blue-900/30 hover:border-blue-500 w-1/2 border-slate-600 transition-colors">
                                   <input 
                                       type="radio" 
                                       name="layer" 
                                       checked={formData.layer === 'OUTER'}
                                       onChange={() => setFormData({...formData, layer: 'OUTER'})}
                                       className="w-4 h-4 text-blue-500 focus:ring-blue-500 bg-slate-700 border-slate-500"
                                   />
                                   <div className="flex items-center gap-1.5">
                                       <Box size={16} className="text-blue-500"/>
                                       <span className="text-sm font-bold text-slate-300">LỚP NGOÀI</span>
                                   </div>
                               </label>
                               <label className="flex items-center gap-2 cursor-pointer p-2 border rounded bg-slate-800 hover:bg-purple-900/30 hover:border-purple-500 w-1/2 border-slate-600 transition-colors">
                                   <input 
                                       type="radio" 
                                       name="layer" 
                                       checked={formData.layer === 'INNER'}
                                       onChange={() => setFormData({...formData, layer: 'INNER'})}
                                       className="w-4 h-4 text-purple-500 focus:ring-purple-500 bg-slate-700 border-slate-500"
                                   />
                                   <div className="flex items-center gap-1.5">
                                       <Layers size={16} className="text-purple-500"/>
                                       <span className="text-sm font-bold text-slate-300">LỚP TRONG</span>
                                   </div>
                               </label>
                           </div>
                      </div>

                      {/* Stage Grid */}
                      <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700">
                           <h3 className="text-xs font-bold text-slate-400 mb-2 uppercase border-b border-slate-700 pb-1">Cấu hình Điểm gắn theo công đoạn</h3>
                           <div className="grid grid-cols-4 gap-3">
                                {/* Row Header */}
                                <div className="col-span-2 text-xs font-medium text-slate-500">Công đoạn</div>
                                <div className="col-span-2 text-xs font-medium text-slate-500 text-right">Số điểm gắn</div>
                                
                                {/* Stage 1 */}
                                <div className="col-span-2">
                                    <select 
                                        value={formData.stage || ''}
                                        onChange={(e) => setFormData({...formData, stage: e.target.value})}
                                        className="w-full border border-blue-800 bg-blue-900/20 rounded px-2 py-1 text-sm focus:outline-none text-white"
                                    >
                                        <option value="">-- (Trống) --</option>
                                        {STAGE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                    </select>
                                </div>
                                <div className="col-span-2">
                                    <input 
                                        type="number" min="0" 
                                        value={formData.stage1Points} 
                                        onChange={(e) => setFormData({...formData, stage1Points: parseInt(e.target.value) || 0})}
                                        className="w-full bg-slate-900 border border-blue-800 rounded px-2 py-1 text-right font-mono text-sm text-white"
                                        placeholder="Điểm 1"
                                    />
                                </div>

                                {/* Stage 2 */}
                                <div className="col-span-2">
                                    <select 
                                        value={formData.stage2 || ''}
                                        onChange={(e) => setFormData({...formData, stage2: e.target.value})}
                                        className="w-full border border-purple-800 bg-purple-900/20 rounded px-2 py-1 text-sm focus:outline-none text-white"
                                    >
                                        <option value="">-- (Trống) --</option>
                                        {STAGE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                    </select>
                                </div>
                                <div className="col-span-2">
                                    <input 
                                        type="number" min="0" 
                                        value={formData.stage2Points} 
                                        onChange={(e) => setFormData({...formData, stage2Points: parseInt(e.target.value) || 0})}
                                        className="w-full bg-slate-900 border border-purple-800 rounded px-2 py-1 text-right font-mono text-sm text-white"
                                        placeholder="Điểm 2"
                                    />
                                </div>

                                {/* Stage 3 */}
                                <div className="col-span-2">
                                    <select 
                                        value={formData.stage3 || ''}
                                        onChange={(e) => setFormData({...formData, stage3: e.target.value})}
                                        className="w-full border border-orange-800 bg-orange-900/20 rounded px-2 py-1 text-sm focus:outline-none text-white"
                                    >
                                        <option value="">-- (Trống) --</option>
                                        {STAGE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                    </select>
                                </div>
                                <div className="col-span-2">
                                    <input 
                                        type="number" min="0" 
                                        value={formData.stage3Points} 
                                        onChange={(e) => setFormData({...formData, stage3Points: parseInt(e.target.value) || 0})}
                                        className="w-full bg-slate-900 border border-orange-800 rounded px-2 py-1 text-right font-mono text-sm text-white"
                                        placeholder="Điểm 3"
                                    />
                                </div>

                                {/* Stage 4 */}
                                <div className="col-span-2">
                                    <select 
                                        value={formData.stage4 || ''}
                                        onChange={(e) => setFormData({...formData, stage4: e.target.value})}
                                        className="w-full border border-pink-800 bg-pink-900/20 rounded px-2 py-1 text-sm focus:outline-none text-white"
                                    >
                                        <option value="">-- (Trống) --</option>
                                        {STAGE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                    </select>
                                </div>
                                <div className="col-span-2">
                                    <input 
                                        type="number" min="0" 
                                        value={formData.stage4Points} 
                                        onChange={(e) => setFormData({...formData, stage4Points: parseInt(e.target.value) || 0})}
                                        className="w-full bg-slate-900 border border-pink-800 rounded px-2 py-1 text-right font-mono text-sm text-white"
                                        placeholder="Điểm 4"
                                    />
                                </div>
                           </div>
                      </div>

                      {/* Technical Parameters */}
                      <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700">
                           <h3 className="text-xs font-bold text-slate-400 mb-2 uppercase border-b border-slate-700 pb-1">Thông số kỹ thuật</h3>
                           <div className="grid grid-cols-2 gap-3">
                                <div><label className="block text-[10px] text-slate-500 uppercase mb-1">Nhiệt Table (°C)</label><input type="number" value={formData.tableTemp ?? ''} onChange={e => setFormData({...formData, tableTemp: parseInt(e.target.value) || undefined})} className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-white text-center"/></div>
                                <div><label className="block text-[10px] text-slate-500 uppercase mb-1">Nhiệt Pad (°C)</label><input type="number" value={formData.padTemp ?? ''} onChange={e => setFormData({...formData, padTemp: parseInt(e.target.value) || undefined})} className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-white text-center"/></div>
                                <div><label className="block text-[10px] text-slate-500 uppercase mb-1">Áp suất Khí (bar)</label><input type="number" step="0.1" value={formData.airPressure ?? ''} onChange={e => setFormData({...formData, airPressure: parseFloat(e.target.value) || undefined})} className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-white text-center"/></div>
                           </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 items-center">
                           <div className="col-span-1">
                               <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Thời gian / 1 Điểm (giây)</label>
                               <input 
                                    type="number" 
                                    min="0"
                                    step="0.1"
                                    value={formData.timePerPoint} 
                                    onChange={(e) => setFormData({...formData, timePerPoint: parseFloat(e.target.value) || 0})}
                                    className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 focus:ring-1 focus:ring-cyan-500 focus:outline-none text-right font-mono text-sm text-white"
                                    placeholder="0.0"
                               />
                           </div>
                           <div className="col-span-1">
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Trạng Thái</label>
                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input 
                                            type="radio" 
                                            name="status" 
                                            checked={formData.status === 'OK'}
                                            onChange={() => setFormData({...formData, status: 'OK'})}
                                            className="w-4 h-4 text-green-500 focus:ring-green-500 bg-slate-700 border-slate-500"
                                        />
                                        <span className="text-sm font-medium text-slate-300">OK</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input 
                                            type="radio" 
                                            name="status" 
                                            checked={formData.status === 'NG'}
                                            onChange={() => setFormData({...formData, status: 'NG'})}
                                            className="w-4 h-4 text-red-500 focus:ring-red-500 bg-slate-700 border-slate-500"
                                        />
                                        <span className="text-sm font-medium text-slate-300">NG</span>
                                    </label>
                                </div>
                           </div>
                      </div>

                      <div className="pt-4 flex gap-3 border-t border-slate-700 mt-2 shrink-0">
                          <button 
                            type="submit"
                            className="flex-1 bg-cyan-700 hover:bg-cyan-600 text-white font-bold py-2 rounded shadow-sm flex items-center justify-center gap-2 transition-all text-sm border border-cyan-600"
                          >
                              <Save size={16}/> {editingId ? 'Cập Nhật' : 'Lưu Mới'}
                          </button>
                          <button 
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="px-6 bg-slate-700 hover:bg-slate-600 text-slate-300 font-bold py-2 rounded transition-colors text-sm border border-slate-600"
                          >
                              Hủy
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};
