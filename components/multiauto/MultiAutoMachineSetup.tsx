
import React, { useState, useEffect } from 'react';
import { Settings, Save, AlertOctagon, PackageX, Layers, Ban, CheckCircle2, RotateCcw, User, Sun, Moon, Clock } from 'lucide-react';
import { MachineSetup, StaffRecord, FaultRecord } from '../../types';

interface MultiAutoMachineSetupProps {
    moduleName?: string;
    machines: MachineSetup[];
    onUpdate: (machines: MachineSetup[]) => void;
    isEmbedded?: boolean; 
    staffData?: StaffRecord[]; 
    faultRecords?: FaultRecord[]; 
}

const PRESET_NOTES = [
  { value: 'NORMAL', label: 'Hoạt động bình thường', color: 'bg-green-900/30 text-green-400 border-green-700', icon: CheckCircle2 },
  { value: 'BROKEN', label: 'Máy hỏng / Lỗi', color: 'bg-red-900/30 text-red-400 border-red-700', icon: AlertOctagon },
  { value: 'WAITING_MATERIAL', label: 'Chờ liệu', color: 'bg-orange-900/30 text-orange-400 border-orange-700', icon: Layers },
  { value: 'NO_STOCK', label: 'Không có hàng', color: 'bg-slate-700 text-slate-300 border-slate-600', icon: PackageX },
  { value: 'MODEL_MISMATCH', label: 'Không phù hợp model', color: 'bg-yellow-900/30 text-yellow-400 border-yellow-700', icon: Ban },
];

export const MultiAutoMachineSetup: React.FC<MultiAutoMachineSetupProps> = ({ 
    moduleName = 'Multi Auto', 
    machines, 
    onUpdate,
    isEmbedded = false,
    staffData = [],
    faultRecords = []
}) => {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Temp state for editing
  const [tempNote, setTempNote] = useState<string>('NORMAL');
  const [tempDesc, setTempDesc] = useState<string>('');
  const [tempStaffDay, setTempStaffDay] = useState<string>('');
  const [tempStaffNight, setTempStaffNight] = useState<string>('');

  useEffect(() => {
      const timer = setInterval(() => setCurrentTime(new Date()), 60000); // Update every minute
      return () => clearInterval(timer);
  }, []);

  const currentHour = currentTime.getHours();
  const isDayShift = currentHour >= 8 && currentHour < 20;

  const startEditing = (machine: MachineSetup) => {
    setEditingId(machine.id);
    setTempNote(machine.note);
    setTempDesc(machine.description);
    setTempStaffDay(machine.staffDay || '');
    setTempStaffNight(machine.staffNight || '');
  };

  const cancelEditing = () => {
    setEditingId(null);
  };

  const saveMachine = (id: number) => {
    const updatedMachines = machines.map(m => {
      if (m.id === id) {
        return {
          ...m,
          note: tempNote as any,
          description: tempDesc,
          updatedAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
          staffDay: tempStaffDay,
          staffNight: tempStaffNight
        };
      }
      return m;
    });
    
    onUpdate(updatedMachines);
    setEditingId(null);
  };

  const getNoteStyle = (noteValue: string) => {
    return PRESET_NOTES.find(n => n.value === noteValue) || PRESET_NOTES[0];
  };

  const handleFaultSelection = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const selectedFault = faultRecords.find(f => f.errorName === e.target.value);
      setTempDesc(e.target.value); 
  };
  
  const selectedFaultInfo = faultRecords.find(f => f.errorName === tempDesc);

  const containerClasses = isEmbedded 
    ? "flex flex-col gap-6" 
    : "p-6 h-full overflow-y-auto bg-slate-900 flex flex-col gap-6";

  const headerStickyClass = isEmbedded ? "" : "sticky top-0 z-20";

  // Filter staff by shift
  const dayStaff = staffData.filter(s => s.shift === 'DAY');
  const nightStaff = staffData.filter(s => s.shift === 'NIGHT');

  return (
    <div className={containerClasses}>
      {/* Responsive Header */}
      <div className={`bg-slate-800 px-3 py-2 md:px-4 md:py-3 rounded-lg shadow-lg border border-slate-700 flex flex-col md:flex-row justify-between items-center gap-3 ${headerStickyClass}`}>
        <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="p-1.5 bg-slate-700 rounded border border-slate-600 text-slate-300 shrink-0">
               <Settings size={18} />
            </div>
            <div>
                <h1 className="text-sm md:text-base font-bold text-white uppercase tracking-tight truncate font-mono">
                CẤU HÌNH MÁY ({moduleName})
                </h1>
                <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                    <Clock size={12} className={isDayShift ? 'text-orange-400' : 'text-purple-400'}/>
                    <span className="font-bold">Hiện tại: {isDayShift ? 'CA NGÀY (08:00 - 20:00)' : 'CA ĐÊM (20:00 - 08:00)'}</span>
                </div>
            </div>
        </div>
      </div>

      {/* Grid of Machines */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {machines.map((machine) => {
          const isEditing = editingId === machine.id;
          const currentStyle = getNoteStyle(isEditing ? tempNote : machine.note);
          const StatusIcon = currentStyle.icon;

          return (
            <div 
              key={machine.id} 
              className={`bg-slate-800 rounded-xl shadow-lg border transition-all overflow-hidden flex flex-col
                ${isEditing ? 'ring-2 ring-blue-500 border-blue-500 z-10 scale-[1.02]' : 'border-slate-700 hover:border-slate-500'}
              `}
            >
              {/* Card Header */}
              <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-900/50">
                <span className="font-bold text-lg text-white font-mono">{machine.name}</span>
                <span className="text-xs text-slate-500 font-mono">{machine.updatedAt}</span>
              </div>

              {/* Card Body */}
              <div className="p-4 flex-1 flex flex-col gap-4">
                
                {isEditing ? (
                  /* EDIT MODE */
                  <div className="flex flex-col gap-3 animate-in fade-in duration-200">
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Trạng thái</label>
                      <select
                        value={tempNote}
                        onChange={(e) => setTempNote(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-600 rounded-md px-2 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 text-white"
                      >
                        {PRESET_NOTES.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* Conditional Input for Description based on Status */}
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Chi tiết / Nội dung lỗi</label>
                      {tempNote === 'BROKEN' && faultRecords.length > 0 ? (
                          <select
                              value={tempDesc}
                              onChange={handleFaultSelection}
                              className="w-full bg-slate-900 border border-slate-600 rounded-md px-2 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-red-500 text-white mb-2"
                          >
                              <option value="">-- Chọn lỗi --</option>
                              {faultRecords.map(f => (
                                  <option key={f.id} value={f.errorName}>{f.errorName}</option>
                              ))}
                          </select>
                      ) : (
                          <textarea
                            value={tempDesc}
                            onChange={(e) => setTempDesc(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-600 rounded-md px-2 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none h-20 text-white"
                            placeholder={tempNote === 'BROKEN' ? "Mô tả lỗi..." : "Nhập thêm chi tiết..."}
                          />
                      )}
                      
                      {/* Suggestion Preview if Broken */}
                      {tempNote === 'BROKEN' && selectedFaultInfo && (
                          <div className="bg-red-900/20 p-2 rounded border border-red-900/50 text-xs">
                              <div className="mb-1"><span className="font-bold text-red-400">NN:</span> <span className="text-slate-300">{selectedFaultInfo.cause}</span></div>
                              <div><span className="font-bold text-green-400">KP:</span> <span className="text-slate-300">{selectedFaultInfo.solution}</span></div>
                          </div>
                      )}
                    </div>

                    {/* Staff Selection */}
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1"><Sun size={10} className="text-orange-400"/> Ca Ngày</label>
                            <select
                                value={tempStaffDay}
                                onChange={(e) => setTempStaffDay(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-600 rounded-md px-2 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-white"
                            >
                                <option value="">-- Chọn --</option>
                                {dayStaff.map(s => <option key={s.id} value={s.fullName}>{s.fullName}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1"><Moon size={10} className="text-purple-400"/> Ca Đêm</label>
                            <select
                                value={tempStaffNight}
                                onChange={(e) => setTempStaffNight(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-600 rounded-md px-2 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-white"
                            >
                                <option value="">-- Chọn --</option>
                                {nightStaff.map(s => <option key={s.id} value={s.fullName}>{s.fullName}</option>)}
                            </select>
                        </div>
                    </div>
                  </div>
                ) : (
                  /* VIEW MODE */
                  <div className="flex flex-col gap-3 flex-1">
                    <div className={`p-3 rounded-lg border flex items-start gap-3 ${currentStyle.color}`}>
                      <StatusIcon size={20} className="shrink-0 mt-0.5" />
                      <div>
                        <span className="block font-bold text-sm uppercase">{currentStyle.label}</span>
                        {machine.description && (
                          <span className="block text-xs mt-1 opacity-90 italic">"{machine.description}"</span>
                        )}
                      </div>
                    </div>

                    {/* Staff Info Display */}
                    <div className="bg-slate-900 p-2 rounded border border-slate-700 flex flex-col gap-2 text-xs">
                        <div className={`flex items-center justify-between p-1.5 rounded ${isDayShift ? 'bg-orange-900/20 border border-orange-500/30' : ''}`}>
                            <span className="text-slate-500 font-medium flex items-center gap-1"><Sun size={12}/> Ca Ngày:</span>
                            <span className="font-bold text-slate-300 flex items-center gap-1">
                                {machine.staffDay || '---'} {isDayShift && <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>}
                            </span>
                        </div>
                        <div className={`flex items-center justify-between p-1.5 rounded ${!isDayShift ? 'bg-purple-900/20 border border-purple-500/30' : ''}`}>
                            <span className="text-slate-500 font-medium flex items-center gap-1"><Moon size={12}/> Ca Đêm:</span>
                            <span className="font-bold text-slate-300 flex items-center gap-1">
                                {machine.staffNight || '---'} {!isDayShift && <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>}
                            </span>
                        </div>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="mt-auto pt-2">
                  {isEditing ? (
                    <div className="flex gap-2">
                      <button 
                        onClick={() => saveMachine(machine.id)}
                        className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-md text-sm font-bold flex items-center justify-center gap-2 border border-blue-500 shadow-lg shadow-blue-900/20"
                      >
                        <Save size={16} /> Lưu
                      </button>
                      <button 
                        onClick={cancelEditing}
                        className="px-3 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-md border border-slate-600"
                      >
                        <RotateCcw size={16} />
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => startEditing(machine)}
                      className="w-full border border-slate-600 bg-slate-700 hover:bg-slate-600 text-slate-300 py-2 rounded-md text-sm font-bold transition-colors"
                    >
                      Cập nhật trạng thái
                    </button>
                  )}
                </div>

              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
