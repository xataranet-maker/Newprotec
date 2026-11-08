
import React, { useState, useMemo, useRef } from 'react';
import { 
  Ruler, Plus, Save, Trash2, Edit, X, Search, 
  Settings2, Box, Cpu, Hash, Activity, Clock, FileSpreadsheet, Download, Upload, Layers
} from 'lucide-react';
import { AccessoryParameter, NetDataRecord } from '../../types';
import * as XLSX from 'xlsx';
import { exportToExcel } from '../../services/excelService';

interface AccessoryParamsManagementProps {
  data: AccessoryParameter[];
  onUpdate: (newData: AccessoryParameter[]) => void;
  netData: NetDataRecord[];
}

export const AccessoryParamsManagement: React.FC<AccessoryParamsManagementProps> = ({ 
    data, onUpdate, netData 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<Partial<AccessoryParameter>>({
    model: '',
    code: '',
    layer: 'OUTER',
    stage: '',
    thickness: '0',
    width: 0,
    length: 0,
    capableMachines: []
  });

  const uniqueModels = useMemo(() => Array.from(new Set(netData.map(d => d.model))).sort(), [netData]);
  
  const availableCodes = useMemo(() => {
    if (!formData.model || !formData.layer) return [];
    return Array.from(new Set(
        netData
            .filter(d => d.model === formData.model && d.layer === formData.layer)
            .map(d => d.code)
    )).sort();
  }, [netData, formData.model, formData.layer]);

  const availableStages = useMemo(() => {
    if (!formData.model || !formData.code || !formData.layer) return [];
    const match = netData.find(d => 
        d.model === formData.model && 
        d.code === formData.code && 
        d.layer === formData.layer
    );
    if (!match) return [];
    return [match.stage, match.stage2, match.stage3, match.stage4].filter(Boolean) as string[];
  }, [netData, formData.model, formData.code, formData.layer]);

  const handleToggleMachine = (mId: number) => {
    setFormData(prev => {
        const current = prev.capableMachines || [];
        if (current.includes(mId)) {
            return { ...prev, capableMachines: current.filter(id => id !== mId) };
        } else {
            return { ...prev, capableMachines: [...current, mId].sort((a,b) => a - b) };
        }
    });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.model || !formData.code || !formData.stage || !formData.layer) {
      alert("Vui lòng nhập đầy đủ các trường bắt buộc.");
      return;
    }

    const saveData: AccessoryParameter = {
      id: editingId || Date.now(),
      model: formData.model!,
      code: formData.code!,
      layer: formData.layer!,
      stage: formData.stage!,
      thickness: String(formData.thickness || '0'),
      width: Number(formData.width) || 0,
      length: Number(formData.length) || 0,
      capableMachines: formData.capableMachines || [],
      updatedAt: new Date().toLocaleString('vi-VN')
    };

    if (editingId) {
      onUpdate(data.map(item => item.id === editingId ? saveData : item));
    } else {
      onUpdate([saveData, ...data]);
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
        const jsonData: any[] = XLSX.utils.sheet_to_json(ws);

        if (jsonData.length === 0) {
          alert("File không có dữ liệu.");
          return;
        }

        const imported: AccessoryParameter[] = jsonData.map((row, idx) => ({
          id: Date.now() + idx,
          model: String(row['Model'] || row['MODEL'] || '').toUpperCase(),
          code: String(row['Code'] || row['CODE'] || ''),
          layer: String(row['Layer'] || row['Lớp'] || 'OUTER').toUpperCase(),
          stage: String(row['Stage'] || row['Công đoạn'] || ''),
          thickness: String(row['Thickness'] || row['Độ dày'] || '0'),
          width: Number(row['Width'] || row['Chiều rộng'] || 0),
          length: Number(row['Length'] || row['Chiều dài'] || 0),
          capableMachines: String(row['Machines'] || row['Máy chạy'] || '').split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n)),
          updatedAt: new Date().toLocaleString('vi-VN')
        })).filter(item => item.model && item.code && item.stage);

        if (imported.length > 0) {
          if (window.confirm(`Tìm thấy ${imported.length} dòng thông số. Bạn có muốn nhập vào hệ thống?`)) {
            onUpdate([...imported, ...data]);
            alert("Nhập dữ liệu thành công!");
          }
        } else {
          alert("Không tìm thấy dữ liệu hợp lệ. Vui lòng kiểm tra tiêu đề các cột (Model, Code, Layer, Stage, Thickness, Width, Length, Machines).");
        }
      } catch (err) {
        alert("Lỗi đọc file Excel.");
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
    const headers = ["Model", "Code", "Layer", "Stage", "Thickness", "Width", "Length", "Machines"];
    const rows = data.map(item => [
      item.model,
      item.code,
      item.layer || 'OUTER',
      item.stage,
      item.thickness,
      item.width,
      item.length,
      item.capableMachines.join(',')
    ]);
    exportToExcel([headers, ...rows], `ThongSo_PhuLieu_${new Date().getTime()}`);
  };

  const filteredData = data.filter(item => 
    item.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 h-full overflow-y-auto bg-slate-900 flex flex-col gap-6 text-slate-300 custom-scrollbar">
      {/* Header Area */}
      <div className="bg-slate-800 px-5 py-4 rounded-xl shadow-lg border border-slate-700 flex justify-between items-center sticky top-0 z-20 backdrop-blur-md bg-opacity-90">
          <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-600 rounded-xl shadow-lg shadow-amber-900/40 text-white shrink-0">
                  <Ruler size={24}/>
              </div>
              <div>
                  <h1 className="text-xl font-black text-white uppercase tracking-tighter font-mono">QUẢN LÝ THÔNG SỐ PHỤ LIỆU</h1>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse shadow-[0_0_8px_amber]"></span>
                      Cấu hình thông số kỹ thuật lớp trong & lớp ngoài
                  </p>
              </div>
          </div>
          <div className="flex gap-2">
              <input type="file" ref={fileInputRef} onChange={handleImportExcel} accept=".xlsx, .xls" className="hidden" />
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="bg-green-700 hover:bg-green-600 text-white font-black px-4 py-2.5 rounded-xl uppercase text-[10px] shadow-xl transition-all active:translate-y-1 border-b-4 border-green-900 flex items-center gap-2"
              >
                  <Upload size={16}/> Nhập Excel
              </button>
              <button 
                onClick={handleExportExcel}
                className="bg-slate-700 hover:bg-slate-600 text-white font-black px-4 py-2.5 rounded-xl uppercase text-[10px] shadow-xl transition-all active:translate-y-1 border-b-4 border-slate-900 flex items-center gap-2"
              >
                  <Download size={16}/> Xuất Excel
              </button>
              <button 
                onClick={() => {
                    setEditingId(null);
                    setFormData({ model: '', code: '', layer: 'OUTER', stage: '', thickness: '0', width: 0, length: 0, capableMachines: [] });
                    setIsModalOpen(true);
                }}
                className="bg-amber-600 hover:bg-amber-500 text-white font-black px-4 py-2.5 rounded-xl uppercase text-[10px] shadow-xl transition-all active:translate-y-1 border-b-4 border-amber-800 flex items-center gap-2"
              >
                  <Plus size={18}/> Tạo Mới
              </button>
          </div>
      </div>

      {/* Toolbar */}
      <div className="bg-slate-800 p-3 rounded-lg border border-slate-700 flex items-center gap-3">
          <Search size={18} className="text-slate-500" />
          <input 
            type="text" 
            placeholder="Tìm kiếm Model, Code..." 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)} 
            className="bg-transparent border-none outline-none text-sm w-full text-white" 
          />
      </div>

      {/* List Table */}
      <div className="bg-slate-800 rounded-xl shadow-lg border border-slate-700 flex-1 overflow-hidden flex flex-col">
        <div className="overflow-x-auto custom-scrollbar flex-1">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-950 text-slate-500 uppercase font-black font-mono border-b border-slate-700 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-4">Sản phẩm (Model/Code)</th>
                <th className="px-6 py-4 text-center">Lớp</th>
                <th className="px-6 py-4 text-center">Công Đoạn</th>
                <th className="px-6 py-4 text-center text-blue-400 bg-blue-900/5">Độ dày (㎛)</th>
                <th className="px-6 py-4 text-center text-cyan-400 bg-cyan-900/5">Chiều rộng (cm)</th>
                <th className="px-6 py-4 text-center text-purple-400 bg-blue-900/5">Chiều dài (cm)</th>
                <th className="px-6 py-4 text-center">Khả năng chạy máy (1-8)</th>
                <th className="px-6 py-4 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {filteredData.length === 0 ? (
                <tr><td colSpan={8} className="py-20 text-center text-slate-700 italic font-black uppercase text-[10px]">Chưa có dữ liệu thông số</td></tr>
              ) : (
                filteredData.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-750 transition-colors group">
                    <td className="px-6 py-3">
                        <div className="font-black text-white uppercase text-[12px]">{item.model}</div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">{item.code}</div>
                    </td>
                    <td className="px-6 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black border ${item.layer === 'INNER' ? 'bg-purple-900/30 text-purple-400 border-purple-800' : 'bg-blue-900/30 text-blue-400 border-blue-800'}`}>
                            {item.layer === 'INNER' ? 'LỚP TRONG' : 'LỚP NGOÀI'}
                        </span>
                    </td>
                    <td className="px-6 py-3 text-center">
                        <span className="bg-slate-900 border border-slate-700 px-2 py-1 rounded text-[10px] font-black text-slate-400 uppercase">{item.stage}</span>
                    </td>
                    <td className="px-6 py-3 text-center font-mono font-black text-blue-400 bg-blue-900/5 text-sm">{item.thickness}</td>
                    <td className="px-6 py-3 text-center font-mono font-black text-cyan-400 bg-cyan-900/5 text-sm">{item.width}</td>
                    <td className="px-6 py-3 text-center font-mono font-black text-purple-400 bg-purple-900/5 text-sm">{item.length}</td>
                    <td className="px-6 py-3">
                        <div className="flex justify-center gap-1">
                            {[1, 2, 3, 4, 5, 6, 7, 8].map(mId => {
                                const isCapable = item.capableMachines.includes(mId);
                                return (
                                    <div 
                                        key={mId} 
                                        className={`w-5 h-5 rounded flex items-center justify-center text-[9px] font-black border transition-all ${isCapable ? 'bg-green-600 border-green-500 text-white shadow-[0_0_5px_green]' : 'bg-red-900/20 border-red-800 text-red-500 opacity-40'}`}
                                    >
                                        {mId}
                                    </div>
                                );
                            })}
                        </div>
                    </td>
                    <td className="px-6 py-3 text-center">
                        <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => { setEditingId(item.id); setFormData(item); setIsModalOpen(true); }} className="p-1.5 bg-blue-900/30 text-blue-400 hover:bg-blue-600 hover:text-white rounded border border-blue-800/50 transition-all"><Edit size={14}/></button>
                            <button onClick={() => { if(window.confirm("Xóa thông số này?")) onUpdate(data.filter(i => i.id !== item.id)); }} className="p-1.5 bg-red-900/30 text-red-400 hover:bg-red-600 hover:text-white rounded border border-red-800/50 transition-all"><Trash2 size={14}/></button>
                        </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CRUD MODAL */}
      {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in">
              <div className="bg-slate-800 rounded-3xl shadow-2xl w-full max-w-xl border border-slate-600 flex flex-col overflow-hidden max-h-[95vh]">
                  <div className="px-6 py-4 bg-amber-700 text-white flex justify-between items-center shadow-lg shrink-0">
                      <div className="flex items-center gap-3">
                          <Settings2 size={20}/>
                          <h2 className="text-sm font-black uppercase tracking-widest font-mono">{editingId ? 'CẬP NHẬT THÔNG SỐ PL' : 'THIẾT LẬP THÔNG SỐ PL MỚI'}</h2>
                      </div>
                      <button onClick={() => setIsModalOpen(false)} className="hover:bg-black/20 p-1 rounded-full"><X size={24}/></button>
                  </div>
                  
                  <form onSubmit={handleSave} className="p-8 space-y-6 overflow-y-auto custom-scrollbar bg-slate-900">
                      <div className="space-y-1.5">
                          <label className="block text-[10px] font-black text-slate-500 uppercase ml-1">Tên Model <span className="text-red-500">*</span></label>
                          <select 
                            value={formData.model} 
                            onChange={e => setFormData({...formData, model: e.target.value, code: '', stage: ''})}
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white font-bold outline-none focus:border-amber-500 transition-all shadow-inner"
                            required
                          >
                              <option value="">-- Chọn Model --</option>
                              {uniqueModels.map(m => <option key={m} value={m}>{m}</option>)}
                          </select>
                      </div>

                      <div className="bg-slate-850 p-4 rounded-xl border border-slate-700">
                          <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 ml-1">Lớp Sản Xuất <span className="text-red-500">*</span></label>
                          <div className="flex gap-4">
                              <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all ${formData.layer === 'OUTER' ? 'bg-blue-600 border-blue-400 text-white shadow-lg' : 'bg-slate-800 border-slate-700 text-slate-500'}`}>
                                  <input type="radio" name="layer" className="hidden" checked={formData.layer === 'OUTER'} onChange={() => setFormData({...formData, layer: 'OUTER', code: '', stage: ''})} />
                                  <Box size={16}/> LỚP NGOÀI
                              </label>
                              <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all ${formData.layer === 'INNER' ? 'bg-purple-600 border-purple-400 text-white shadow-lg' : 'bg-slate-800 border-slate-700 text-slate-500'}`}>
                                  <input type="radio" name="layer" className="hidden" checked={formData.layer === 'INNER'} onChange={() => setFormData({...formData, layer: 'INNER', code: '', stage: ''})} />
                                  <Layers size={16}/> LỚP TRONG
                              </label>
                          </div>
                      </div>

                      <div className="grid grid-cols-2 gap-6">
                          <div className="space-y-1.5">
                              <label className="block text-[10px] font-black text-slate-500 uppercase ml-1">Mã Code <span className="text-red-500">*</span></label>
                              <select 
                                value={formData.code} 
                                onChange={e => setFormData({...formData, code: e.target.value, stage: ''})}
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white font-mono text-sm outline-none focus:border-amber-500 transition-all shadow-inner"
                                required
                                disabled={!formData.model}
                              >
                                  <option value="">-- Code --</option>
                                  {availableCodes.map(c => <option key={c} value={c}>{c}</option>)}
                              </select>
                          </div>
                          <div className="space-y-1.5">
                              <label className="block text-[10px] font-black text-slate-500 uppercase ml-1">Công Đoạn <span className="text-red-500">*</span></label>
                              <select 
                                value={formData.stage} 
                                onChange={e => setFormData({...formData, stage: e.target.value})}
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white font-bold outline-none focus:border-amber-500 transition-all shadow-inner"
                                required
                                disabled={!formData.code}
                              >
                                  <option value="">-- Chọn CĐ --</option>
                                  {availableStages.map(s => <option key={s} value={s}>{s}</option>)}
                              </select>
                          </div>
                      </div>

                      <div className="bg-slate-850 p-6 rounded-2xl border border-slate-700 space-y-6 shadow-inner">
                          <h3 className="text-xs font-black text-cyan-400 uppercase tracking-widest border-b border-slate-800 pb-3 flex items-center gap-2"><Box size={16}/> Kích Thước Vật Lý</h3>
                          <div className="grid grid-cols-3 gap-4">
                              <div className="space-y-1.5">
                                  <label className="block text-[9px] font-black text-slate-600 uppercase text-center">Độ dày (㎛)</label>
                                  <input type="text" value={formData.thickness ?? ''} onChange={e => setFormData({...formData, thickness: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2 py-3 text-center text-blue-400 font-black text-lg outline-none focus:border-blue-500" placeholder="100~150"/>
                              </div>
                              <div className="space-y-1.5">
                                  <label className="block text-[9px] font-black text-slate-600 uppercase text-center">Chiều rộng (cm)</label>
                                  <input type="number" step="0.01" value={formData.width ?? ''} onChange={e => setFormData({...formData, width: parseFloat(e.target.value)})} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2 py-3 text-center text-cyan-400 font-black text-lg outline-none focus:border-cyan-500" placeholder="0.00"/>
                              </div>
                              <div className="space-y-1.5">
                                  <label className="block text-[9px] font-black text-slate-600 uppercase text-center">Chiều dài (cm)</label>
                                  <input type="number" step="0.01" value={formData.length ?? ''} onChange={e => setFormData({...formData, length: parseFloat(e.target.value)})} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2 py-3 text-center text-purple-400 font-black text-lg outline-none focus:border-purple-500" placeholder="0.00"/>
                              </div>
                          </div>
                      </div>

                      <div className="bg-slate-850 p-6 rounded-2xl border border-slate-700 space-y-4 shadow-inner">
                          <h3 className="text-xs font-black text-green-400 uppercase tracking-widest border-b border-slate-800 pb-3 flex items-center gap-2"><Cpu size={16}/> Khả năng vận hành (Máy 1-8)</h3>
                          <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
                              {[1, 2, 3, 4, 5, 6, 7, 8].map(mId => {
                                  const isSelected = formData.capableMachines?.includes(mId);
                                  return (
                                      <button
                                          key={mId}
                                          type="button"
                                          onClick={() => handleToggleMachine(mId)}
                                          className={`aspect-square rounded-xl border-2 font-black font-mono transition-all flex flex-col items-center justify-center gap-1 ${isSelected ? 'bg-green-600 border-green-500 text-white shadow-lg shadow-green-900/40' : 'bg-red-900/10 border-red-800 text-red-600 hover:border-red-600'}`}
                                      >
                                          <span className="text-xs">{mId}</span>
                                          <div className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-red-900'}`}></div>
                                      </button>
                                  );
                              })}
                          </div>
                      </div>

                      <button type="submit" className="w-full bg-amber-600 hover:bg-amber-500 text-white font-black py-4 rounded-2xl shadow-xl uppercase text-xs tracking-[0.2em] border-b-4 border-amber-800 transition-all active:scale-95 flex items-center justify-center gap-3">
                          <Save size={20}/> XÁC NHẬN LƯU THÔNG SỐ
                      </button>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};
