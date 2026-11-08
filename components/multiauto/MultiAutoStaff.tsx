
import React, { useState, useMemo } from 'react';
import { 
    Users, Search, Plus, Edit, Trash2, X, Save, Clock, Sun, Moon, 
    CheckCircle2, Thermometer, Plane, Hash, Building2, User, 
    Briefcase, Calendar, ChevronLeft, ChevronRight, LayoutGrid, List,
    Activity, Timer, ShieldCheck, AlertTriangle, Heart, Palmtree, UserMinus
} from 'lucide-react';
import { StaffRecord, AttendanceStatus, AttendanceRecord, OvertimeRecord } from '../../types';

interface MultiAutoStaffProps {
  moduleName?: string;
  data: StaffRecord[];
  onUpdate: (newData: StaffRecord[]) => void;
  attendanceHistory: AttendanceRecord[];
  onUpdateAttendanceHistory: (records: AttendanceRecord[]) => void;
  overtimeRecords?: OvertimeRecord[]; 
  onUpdateOvertime?: (records: OvertimeRecord[]) => void;
}

export const MultiAutoStaff: React.FC<MultiAutoStaffProps> = ({ 
    moduleName = 'Multi Auto', data, onUpdate, attendanceHistory = [], onUpdateAttendanceHistory,
    overtimeRecords = [], onUpdateOvertime
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMonth, setViewMonth] = useState(new Date().getMonth() + 1);
  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const [viewMode, setViewMode] = useState<'GRID' | 'LIST'>('GRID');

  const [editTarget, setEditTarget] = useState<{ emp: StaffRecord, date: string } | null>(null);
  const [editForm, setEditForm] = useState<Partial<AttendanceRecord>>({});
  const [editOT, setEditOT] = useState(0); 

  const daysInMonth = useMemo(() => new Date(viewYear, viewMonth, 0).getDate(), [viewYear, viewMonth]);
  const daysArray = useMemo(() => Array.from({ length: daysInMonth }, (_, i) => i + 1), [daysInMonth]);

  const isFuture = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return (day: number) => {
        const checkDate = new Date(viewYear, viewMonth - 1, day);
        return checkDate > today;
    };
  }, [viewYear, viewMonth]);

  const filteredStaff = useMemo(() => (data || []).filter(s => 
      s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      s.employeeId.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a,b) => a.fullName.localeCompare(b.fullName)), [data, searchTerm]);

  const getRecord = (empId: string, day: number) => {
      const dateStr = `${viewYear}-${String(viewMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      return (attendanceHistory || []).find(r => r.employeeId === empId && r.date === dateStr);
  };
  
  const getOTRecord = (empId: string, day: number) => {
      const dateStr = `${viewYear}-${String(viewMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      return (overtimeRecords || []).find(r => r.employeeId === empId && r.date === dateStr);
  };

  const getStatusStyle = (status: AttendanceStatus) => {
      switch(status) {
          case 'PRESENT': case 'Đúng giờ': case 'Đủ công': return { label: 'ĐI LÀM', color: 'text-green-400', icon: CheckCircle2 };
          case 'SICK': case 'Nghỉ ốm': return { label: 'NGHỈ ỐM', color: 'text-orange-400', icon: Thermometer };
          case 'LEAVE': case 'Nghỉ phép': return { label: 'NGHỈ PHÉP', color: 'text-blue-400', icon: Plane };
          case 'Nghỉ KL': return { label: 'NGHỈ KL', color: 'text-slate-400', icon: UserMinus };
          case 'Đi muộn': return { label: 'ĐI MUỘN', color: 'text-yellow-500', icon: Clock };
          case 'Về sớm': return { label: 'VỀ SỚM', color: 'text-red-400', icon: Clock };
          case 'Vắng mặt': return { label: 'VẮNG', color: 'text-red-500', icon: User };
          case 'Nghỉ chủ nhật': return { label: 'NGHỈ CN', color: 'text-slate-500', icon: Calendar };
          case 'FAMILY': return { label: 'HIẾU HỈ', color: 'text-purple-400', icon: Heart };
          case 'Nghỉ lễ': return { label: 'NGHỈ LỄ', color: 'text-pink-400', icon: Palmtree };
          default: return { label: '---', color: 'text-slate-600', icon: Activity };
      }
  };

  const handleToggleShiftQuick = (staff: StaffRecord, day: number) => {
      if (isFuture(day)) return;
      const dateStr = `${viewYear}-${String(viewMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const existing = (attendanceHistory || []).find(r => r.employeeId === staff.employeeId && r.date === dateStr);
      
      const currentShift = existing ? existing.shift : staff.shift;
      const newShift = currentShift === 'DAY' ? 'NIGHT' : 'DAY';
      
      const recordId = `${dateStr}_${staff.employeeId}`;
      const newRecord: AttendanceRecord = existing 
        ? { ...existing, shift: newShift }
        : { id: recordId, date: dateStr, employeeId: staff.employeeId, shift: newShift, status: 'PRESENT', overtime: 0 };

      onUpdateAttendanceHistory([...(attendanceHistory || []).filter(r => r.id !== recordId), newRecord]);
  };

  const handleOpenEdit = (emp: StaffRecord, day: number) => {
      if (isFuture(day)) return;
      const dateStr = `${viewYear}-${String(viewMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      
      const existingAtt = getRecord(emp.employeeId, day);
      const existingOT = getOTRecord(emp.employeeId, day);
      
      setEditTarget({ emp, date: dateStr });
      setEditForm(existingAtt || {
          date: dateStr,
          employeeId: emp.employeeId,
          shift: emp.shift,
          status: 'PRESENT',
          overtime: existingOT ? existingOT.hours : 0
      });
      setEditOT(existingOT ? existingOT.hours : (existingAtt?.overtime || 0));
  };

  const handleSaveDay = () => {
      if (!editTarget) return;
      const recordId = `${editTarget.date}_${editTarget.emp.employeeId}`;
      const finalAttRecord = { ...editForm, id: recordId, overtime: editOT } as AttendanceRecord;
      
      onUpdateAttendanceHistory([...(attendanceHistory || []).filter(r => r.id !== recordId), finalAttRecord]);
      
      if (onUpdateOvertime) {
          const otId = Date.now();
          const newOTRecord: OvertimeRecord = {
              id: otId,
              staffId: editTarget.emp.id,
              staffName: editTarget.emp.fullName,
              employeeId: editTarget.emp.employeeId,
              department: editTarget.emp.department || 'MULTI',
              date: editTarget.date,
              hours: editOT,
              shift: finalAttRecord.shift,
              timestamp: new Date().toLocaleString()
          };
          onUpdateOvertime([...(overtimeRecords || []).filter(r => r.employeeId !== editTarget.emp.employeeId || r.date !== editTarget.date), newOTRecord]);
      }

      setEditTarget(null);
  };

  return (
    <div className="p-4 md:p-6 h-full overflow-y-auto bg-slate-900 flex flex-col gap-6 custom-scrollbar text-slate-300">
      <div className="bg-slate-800 px-5 py-4 rounded-2xl shadow-xl border border-slate-700 flex flex-col xl:flex-row justify-between items-center gap-4 sticky top-0 z-40">
          <div className="flex items-center gap-4">
              <div className="p-2 bg-blue-600 rounded-lg shadow-lg text-white"><Users size={22}/></div>
              <h1 className="text-sm font-black uppercase tracking-widest font-mono">NHÂN SỰ {moduleName}</h1>
          </div>
          <div className="flex items-center gap-3">
              <div className="bg-slate-900 p-1 rounded-xl border border-slate-700 flex gap-1">
                  <button onClick={() => setViewMode('GRID')} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all flex items-center gap-2 ${viewMode === 'GRID' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}><LayoutGrid size={14}/> Grid 31 Ngày</button>
                  <button onClick={() => setViewMode('LIST')} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all flex items-center gap-2 ${viewMode === 'LIST' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}><List size={14}/> List</button>
              </div>
              <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-700 shadow-inner">
                  <button onClick={() => setViewMonth(p => p === 1 ? 12 : p - 1)} className="p-1 hover:bg-slate-800 rounded text-slate-500"><ChevronLeft size={16}/></button>
                  <span className="text-xs font-black text-white font-mono w-20 text-center">{viewMonth}/{viewYear}</span>
                  <button onClick={() => setViewMonth(p => p === 12 ? 1 : p + 1)} className="p-1 hover:bg-slate-800 rounded text-slate-500"><ChevronRight size={16}/></button>
              </div>
          </div>
      </div>

      {viewMode === 'GRID' ? (
          <div className="flex-1 bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl overflow-auto custom-scrollbar min-h-[500px]">
               <table className="w-full border-collapse table-fixed min-w-[2000px]">
                      <thead>
                          <tr className="bg-slate-900 text-slate-500 uppercase font-black font-mono text-[9px]">
                              <th className="w-[180px] px-4 py-3 text-left border-r border-slate-800 sticky left-0 z-40 bg-slate-900 shadow-[2px_0_10px_rgba(0,0,0,0.5)]">Họ và Tên</th>
                              {daysArray.map(day => (<th key={day} className={`px-1 py-3 text-center border-r border-slate-800 ${new Date(viewYear, viewMonth-1, day).getDay() === 0 ? 'bg-red-950/20 text-red-500' : ''}`}>{day}</th>))}
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700/50">
                          {filteredStaff.map(staff => (
                              <tr key={staff.id} className="hover:bg-slate-750/30 transition-colors">
                                  <td className="px-4 py-2 border-r border-slate-800 sticky left-0 z-20 bg-slate-800 shadow-[2px_0_10px_rgba(0,0,0,0.5)]"><div className="text-[10px] font-bold text-slate-200 truncate uppercase">{staff.fullName}</div><div className="text-[8px] font-mono text-slate-500">{staff.employeeId}</div></td>
                                  {daysArray.map(day => {
                                      const rec = getRecord(staff.employeeId, day);
                                      const style = getStatusStyle(rec?.status || 'UNMARKED');
                                      const Icon = style.icon;
                                      const shift = rec ? rec.shift : staff.shift;
                                      const isSun = new Date(viewYear, viewMonth-1, day).getDay() === 0;
                                      const dayIsFuture = isFuture(day);

                                      return (
                                          <td key={day} className={`px-0.5 py-1 border-r border-slate-800/30 transition-colors ${isSun ? 'bg-red-900/5' : ''} ${!dayIsFuture ? 'cursor-pointer hover:bg-blue-600/10' : ''}`}>
                                              {dayIsFuture ? (
                                                  <div className="flex items-center justify-center h-full opacity-10">
                                                      <div className="w-1 h-1 rounded-full bg-slate-500"></div>
                                                  </div>
                                              ) : (
                                                  <div className="flex flex-col gap-0.5 items-center justify-center">
                                                      <div onClick={() => handleToggleShiftQuick(staff, day)} className="hover:scale-110 transition-transform bg-slate-900/40 px-1 rounded border border-slate-700 flex items-center gap-0.5">
                                                          {shift === 'NIGHT' ? <Moon size={8} className="text-purple-400"/> : <Sun size={8} className="text-orange-400"/>}
                                                          <span className={`text-[7px] font-black uppercase ${shift === 'NIGHT' ? 'text-purple-500' : 'text-orange-500'}`}>{shift === 'NIGHT' ? 'Đêm' : 'Ngày'}</span>
                                                      </div>
                                                      <div onClick={() => handleOpenEdit(staff, day)} className={`flex items-center gap-0.5 ${style.color}`}>
                                                          <Icon size={8} />
                                                          <span className="text-[7px] font-bold truncate max-w-[40px] uppercase">{style.label}</span>
                                                      </div>
                                                      <div onClick={() => handleOpenEdit(staff, day)} className="flex items-center gap-0.5 text-blue-400 font-mono font-bold text-[8px]"><Clock size={8}/>{rec?.overtime || 0}h</div>
                                                  </div>
                                              )}
                                          </td>
                                      );
                                  })}
                              </tr>
                          ))}
                      </tbody>
                  </table>
          </div>
      ) : (
          <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden shadow-lg">
               <div className="p-4 bg-slate-900/50 border-b border-slate-700 flex justify-between items-center">
                    <div className="text-xs font-black uppercase text-slate-500 tracking-widest">Trạng thái hôm nay: {new Date().toLocaleDateString('vi-VN')}</div>
                    <div className="relative w-72">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14}/>
                      <input type="text" placeholder="Tìm nhân viên..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-full pl-9 pr-4 py-1.5 text-[10px] text-white focus:border-blue-500 outline-none shadow-inner"/>
                    </div>
               </div>
               <table className="w-full text-[11px] text-left border-collapse">
                   <thead className="bg-slate-950 text-slate-500 uppercase font-black font-mono border-b border-slate-700">
                       <tr><th className="px-6 py-4">Nhân Viên</th><th className="px-6 py-4 w-32 text-center">Mã Số</th><th className="px-6 py-4 text-center w-32">Ca (Bấm đổi)</th><th className="px-6 py-4">Vị Trí</th><th className="px-6 py-4 text-center">Trạng thái (Hôm nay)</th></tr>
                   </thead>
                   <tbody className="divide-y divide-slate-700/50">
                       {filteredStaff.map(s => {
                           const todayDay = new Date().getDate();
                           const rec = getRecord(s.employeeId, todayDay);
                           const shift = rec ? rec.shift : s.shift;
                           const style = getStatusStyle(rec?.status || 'UNMARKED');
                           
                           return (
                               <tr key={s.id} className="hover:bg-slate-700/30 group">
                                   <td className="px-6 py-3 font-bold text-white uppercase">{s.fullName}</td>
                                   <td className="px-6 py-3 text-center font-mono text-blue-400 font-bold">{s.employeeId}</td>
                                   <td className="px-6 py-3 text-center">
                                       <button onClick={() => handleToggleShiftQuick(s, todayDay)} className={`inline-flex items-center gap-1.5 px-3 py-1 rounded border transition-all active:scale-90 shadow-md hover:brightness-110 ${shift === 'DAY' ? 'bg-orange-900/30 text-orange-400 border-orange-800' : 'bg-purple-900/30 text-purple-400 border-purple-800'}`}>
                                           {shift === 'DAY' ? <Sun size={12}/> : <Moon size={12}/>}
                                           <span className="font-black text-[10px] uppercase">{shift === 'DAY' ? 'Ngày' : 'Đêm'}</span>
                                       </button>
                                   </td>
                                   <td className="px-6 py-3 text-slate-500 uppercase font-bold">{s.position}</td>
                                   <td className="px-6 py-3 text-center">
                                        <button 
                                            onClick={() => handleOpenEdit(s, todayDay)}
                                            className={`px-2 py-0.5 rounded text-[10px] font-black border uppercase transition-all hover:bg-slate-700 bg-slate-900 ${style.color} border-current`}
                                        >
                                            {style.label}
                                        </button>
                                   </td>
                               </tr>
                           );
                       })}
                   </tbody>
               </table>
          </div>
      )}

      {editTarget && (
          <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in">
              <div className="bg-slate-800 rounded-3xl shadow-2xl w-full max-w-sm border border-blue-500/50 overflow-hidden">
                  <div className="px-6 py-4 bg-blue-700 text-white flex justify-between items-center shadow-lg uppercase font-black text-xs">
                      <h2>Cập nhật ngày {editTarget.date.split('-').reverse().join('/')}</h2>
                      <button onClick={() => setEditTarget(null)}><X size={20}/></button>
                  </div>
                  <div className="p-6 space-y-6 bg-slate-900">
                      <div className="flex items-center gap-4 bg-slate-800 p-3 rounded-2xl border border-slate-700">
                          <div className="w-10 h-10 rounded-full bg-blue-900/30 border border-blue-500 flex items-center justify-center text-blue-400 font-black">{editTarget.emp.fullName.charAt(0)}</div>
                          <div><div className="text-[11px] font-black text-white uppercase">{editTarget.emp.fullName}</div><div className="text-[9px] font-mono text-slate-500">{editTarget.emp.employeeId}</div></div>
                      </div>

                      <div className="space-y-4">
                          <div>
                              <label className="text-[10px] font-black text-slate-500 uppercase block mb-2 ml-1">Ca làm việc</label>
                              <div className="grid grid-cols-2 gap-2">
                                  <button onClick={() => setEditForm({...editForm, shift: 'DAY'})} className={`py-2 rounded-xl border-2 font-black text-[10px] transition-all flex items-center justify-center gap-2 ${editForm.shift === 'DAY' ? 'bg-orange-900/40 border-orange-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-50'}`}><Sun size={14}/> CA NGÀY</button>
                                  <button onClick={() => setEditForm({...editForm, shift: 'NIGHT'})} className={`py-2 rounded-xl border-2 font-black text-[10px] transition-all flex items-center justify-center gap-2 ${editForm.shift === 'NIGHT' ? 'bg-purple-900/40 border-purple-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-50'}`}><Moon size={14}/> CA ĐÊM</button>
                              </div>
                          </div>

                          <div>
                              <label className="text-[10px] font-black text-slate-500 uppercase block mb-2 ml-1">Trạng thái điểm danh</label>
                              <select value={editForm.status} onChange={e => setEditForm({...editForm, status: e.target.value as any})} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-xs text-white font-bold outline-none focus:border-blue-500 shadow-inner">
                                  <option value="PRESENT">ĐANG LÀM VIỆC (OK)</option>
                                  <option value="Đi muộn">ĐI MUỘN</option>
                                  <option value="Về sớm">VỀ SỚM</option>
                                  <option value="SICK">NGHỈ ỐM (SICK)</option>
                                  <option value="LEAVE">NGHỈ PHÉP (LEAVE)</option>
                                  <option value="Nghỉ KL">NGHỈ KL (Unpaid)</option>
                                  <option value="Nghỉ chủ nhật">NGHỈ CHỦ NHẬT</option>
                                  <option value="Nghỉ lễ">NGHỈ LỄ (HOLIDAY)</option>
                                  <option value="FAMILY">HIẾU / HỈ</option>
                                  <option value="Vắng mặt">VẮNG MẶT</option>
                              </select>
                          </div>

                          <div>
                              <label className="text-[10px] font-black text-slate-500 uppercase block mb-2 ml-1">Số giờ tăng ca (OT)</label>
                              <div className="flex items-center gap-4 bg-slate-800 rounded-xl p-2 border border-slate-700">
                                  <Clock size={16} className="text-orange-500 ml-2"/>
                                  <input type="number" step="0.5" value={editOT} onChange={e => setEditOT(parseFloat(e.target.value) || 0)} className="bg-transparent border-none outline-none flex-1 text-lg font-black font-mono text-white text-center"/><span className="text-[10px] font-black text-slate-600 mr-4">GIỜ</span>
                              </div>
                          </div>
                      </div>

                      <button onClick={handleSaveDay} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-2xl shadow-xl border-b-4 border-blue-800 transition-all active:scale-95 uppercase text-xs tracking-widest flex items-center justify-center gap-2"><Save size={18}/> Lưu thiết lập</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
