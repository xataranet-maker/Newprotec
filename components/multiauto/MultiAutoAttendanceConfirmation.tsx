
import React, { useState, useMemo, useRef } from 'react';
import { 
    FileBadge, Search, Upload, Download, CheckCircle2, 
    X, Save, FileSpreadsheet, Calendar, User, Building2, 
    Clock, AlertCircle, RefreshCcw, Filter, ChevronLeft, ChevronRight, MessageSquare,
    Flag, Edit3, Trash2, Check
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { AttendanceConfirmationRecord, AttendanceConfirmDay, Language, UserAccount } from '../../types';

interface MultiAutoAttendanceConfirmationProps {
    data: AttendanceConfirmationRecord[];
    onUpdate: (newData: AttendanceConfirmationRecord[]) => void;
    currentUser: UserAccount | null;
    language?: Language;
}

export const MultiAutoAttendanceConfirmation: React.FC<MultiAutoAttendanceConfirmationProps> = ({
    data, onUpdate, currentUser, language = 'vi'
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMonth, setViewMonth] = useState(new Date().getMonth() + 1);
    const [viewYear, setViewYear] = useState(new Date().getFullYear());
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // State cho Modal sửa phản hồi
    const [editingFeedback, setEditingFeedback] = useState<{
        recordId: number;
        day: number;
        type: 'n' | 'ot1' | 'd' | 'ot2';
        currentVal: string | number;
        feedback: string;
    } | null>(null);

    const monthStr = `${viewYear}-${String(viewMonth).padStart(2, '0')}`;
    const daysInMonth = new Date(viewYear, viewMonth, 0).getDate();
    const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    const filteredData = useMemo(() => {
        return data.filter(r => 
            r.month === monthStr && 
            (r.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
             r.employeeId.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [data, monthStr, searchTerm]);

    const handlePrevMonth = () => {
        if (viewMonth === 1) {
            setViewMonth(12);
            setViewYear(p => p - 1);
        } else {
            setViewMonth(p => p - 1);
        }
    };

    const handleNextMonth = () => {
        if (viewMonth === 12) {
            setViewMonth(1);
            setViewYear(p => p + 1);
        } else {
            setViewMonth(p => p + 1);
        }
    };

    const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const jsonData: any[] = XLSX.utils.sheet_to_json(ws, { header: 1 });

                const newRecords: AttendanceConfirmationRecord[] = [];
                
                for (let i = 3; i < jsonData.length; i += 4) {
                    const row1 = jsonData[i];
                    const row2 = jsonData[i+1];
                    const row3 = jsonData[i+2];
                    const row4 = jsonData[i+3];

                    if (!row1 || !row1[1]) continue;

                    const shiftGroupRaw = String(row1[3] || '').trim().toUpperCase();
                    const isNight = shiftGroupRaw.includes('ĐÊM');
                    const isDay = shiftGroupRaw.includes('NGÀY') || (!isNight && shiftGroupRaw !== '');

                    const days: AttendanceConfirmDay[] = [];
                    for (let d = 1; d <= 31; d++) {
                        const colIdx = 5 + d; 
                        days.push({
                            day: d,
                            n: isNight ? (row1[colIdx] || '') : '',
                            ot1: isNight ? (row2 ? row2[colIdx] || '' : '') : '',
                            d: isDay ? (row3 ? row3[colIdx] || '' : '') : '',
                            ot2: isDay ? (row4 ? row4[colIdx] || '' : '') : '',
                            feedback: ''
                        });
                    }

                    const lastColIdx = row1.length - 1;
                    
                    newRecords.push({
                        id: Date.now() + Math.random(),
                        month: monthStr,
                        employeeId: String(row1[1]).trim(),
                        fullName: String(row1[2] || '').trim(),
                        shiftGroup: String(row1[3] || '').trim(),
                        department: String(row1[4] || '').trim(),
                        days: days,
                        unexcusedAbsence: Number(row1[lastColIdx - 1]) || 0,
                        remainingLeave: Number(row1[lastColIdx]) || 0,
                        isConfirmed: false
                    });
                }

                if (newRecords.length > 0) {
                    const otherMonths = data.filter(r => r.month !== monthStr);
                    onUpdate([...otherMonths, ...newRecords]);
                    alert(`Đã nhập thành công ${newRecords.length} hồ sơ xác nhận công tháng ${viewMonth}!`);
                } else {
                    alert("Không tìm thấy dữ liệu hợp lệ trong file Excel.");
                }
            } catch (err) {
                console.error(err);
                alert("Lỗi khi đọc file Excel. Vui lòng kiểm tra định dạng.");
            } finally {
                setIsUploading(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        };
        reader.readAsBinaryString(file);
    };

    const handleConfirm = (id: number) => {
        const updated = data.map(r => 
            r.id === id ? { 
                ...r, 
                isConfirmed: true, 
                confirmedAt: new Date().toLocaleString('vi-VN'),
                confirmedBy: currentUser?.fullName || 'System'
            } : r
        );
        onUpdate(updated);
    };

    const handleUpdateDayValue = (recordId: number, dayNum: number, field: string, value: any, clearFeedback: boolean = false) => {
        const updatedData = data.map(r => {
            if (r.id === recordId) {
                const updatedDays = r.days.map(d => {
                    if (d.day === dayNum) {
                        return { 
                            ...d, 
                            [field]: value, 
                            feedback: clearFeedback ? '' : d.feedback 
                        };
                    }
                    return d;
                });
                return { ...r, days: updatedDays };
            }
            return r;
        });
        onUpdate(updatedData);
        setEditingFeedback(null);
    };

    const isSunday = (day: number) => {
        const date = new Date(viewYear, viewMonth - 1, day);
        return date.getDay() === 0;
    };

    const hasAnyFeedback = (record: AttendanceConfirmationRecord) => {
        return record.days.some(d => d.feedback && d.feedback.trim() !== '');
    };

    return (
        <div className="p-6 h-full overflow-y-auto bg-slate-900 flex flex-col gap-6 text-slate-300 font-sans custom-scrollbar">
            <div className="bg-slate-800 px-6 py-4 rounded-2xl shadow-xl border border-slate-700 flex flex-col xl:flex-row justify-between items-center gap-4 sticky top-0 z-40">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-emerald-600 rounded-xl shadow-lg shadow-emerald-900/40 text-white">
                        <FileBadge size={28} />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-white uppercase tracking-widest font-mono">XÁC NHẬN CÔNG THÁNG {viewMonth}/{viewYear}</h1>
                        <p className="text-[10px] text-slate-500 font-bold uppercase mt-1 tracking-tighter flex items-center gap-2">
                             <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                             HỆ THỐNG XÁC NHẬN CÔNG TRỰC TUYẾN NEWPROTEC
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-700 shadow-inner">
                        <button onClick={handlePrevMonth} className="p-1 hover:bg-slate-800 rounded text-slate-500"><ChevronLeft size={16}/></button>
                        <span className="text-xs font-black text-white font-mono w-24 text-center uppercase tracking-tighter">THÁNG {viewMonth}/{viewYear}</span>
                        <button onClick={handleNextMonth} className="p-1 hover:bg-slate-800 rounded text-slate-500"><ChevronRight size={16}/></button>
                    </div>
                    
                    <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx,.xls" onChange={handleImportExcel} />
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="bg-blue-600 hover:bg-blue-500 text-white font-black px-5 py-2.5 rounded-xl uppercase text-xs shadow-xl transition-all border-b-4 border-blue-800 flex items-center gap-2"
                    >
                        {isUploading ? <RefreshCcw size={16} className="animate-spin"/> : <Upload size={16}/>}
                        Nạp File Excel
                    </button>
                </div>
            </div>

            <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700 flex flex-wrap gap-4 items-center justify-between shadow-lg">
                <div className="relative w-full max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input 
                        type="text" 
                        placeholder="Tìm theo Mã NV hoặc Họ Tên..." 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white focus:border-emerald-500 outline-none shadow-inner"
                    />
                </div>
                <div className="flex gap-4 text-xs font-black uppercase">
                     <div className="flex items-center gap-2"><div className="w-3 h-3 bg-yellow-500 rounded-sm"></div> <span>Chủ Nhật</span></div>
                     <div className="flex items-center gap-2"><div className="w-3 h-3 bg-red-600 rounded-sm"></div> <span>Có phản hồi</span></div>
                     <div className="flex items-center gap-2"><div className="w-3 h-3 bg-green-600 rounded-sm"></div> <span>Đã xác nhận đủ công</span></div>
                </div>
            </div>

            <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden shadow-2xl flex-1 flex flex-col">
                <div className="overflow-auto custom-scrollbar flex-1">
                    <table className="w-full text-left border-collapse min-w-[2500px]">
                        <thead className="bg-slate-950 text-slate-500 uppercase font-black font-mono text-[10px] sticky top-0 z-30 shadow-md">
                            <tr>
                                <th className="px-3 py-4 border border-slate-800 text-center w-12 sticky left-0 bg-slate-950 z-40 shadow-[2px_0_10px_rgba(0,0,0,0.5)]">STT</th>
                                <th className="px-4 py-4 border border-slate-800 min-w-[100px] sticky left-12 bg-slate-950 z-40 shadow-[2px_0_10px_rgba(0,0,0,0.5)]">Mã NV</th>
                                <th className="px-4 py-4 border border-slate-800 min-w-[180px] sticky left-[148px] bg-slate-950 z-40 shadow-[2px_0_10px_rgba(0,0,0,0.5)]">Họ và Tên</th>
                                <th className="px-4 py-4 border border-slate-800 w-20 text-center">CA</th>
                                <th className="px-4 py-4 border border-slate-800 min-w-[150px]">Bộ phận</th>
                                <th className="px-2 py-4 border border-slate-800 w-10 text-center bg-slate-900">Loại</th>
                                {daysArray.map(d => (
                                    <th key={d} className={`px-1 py-4 border border-slate-800 text-center w-14 ${isSunday(d) ? 'bg-yellow-900/30 text-yellow-500' : ''}`}>
                                        {String(d).padStart(2, '0')}
                                    </th>
                                ))}
                                <th className="px-3 py-4 border border-slate-800 text-center w-48 sticky right-0 bg-slate-950 z-40 shadow-[-2px_0_10px_rgba(0,0,0,0.5)]">Trạng thái xác nhận</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700">
                            {filteredData.length === 0 ? (
                                <tr>
                                    <td colSpan={31+7} className="py-32 text-center text-slate-600 italic uppercase font-black tracking-[0.3em] opacity-30">
                                        <FileSpreadsheet size={64} className="mx-auto mb-4"/>
                                        Chưa có dữ liệu tháng này. Vui lòng nạp file Excel.
                                    </td>
                                </tr>
                            ) : filteredData.map((record, idx) => {
                                const recordHasFeedback = hasAnyFeedback(record);
                                return (
                                <React.Fragment key={record.id}>
                                    <tr className={`group transition-colors ${record.isConfirmed ? 'bg-green-900/5' : 'hover:bg-white/5'}`}>
                                        <td rowSpan={4} className="px-3 py-2 border border-slate-800 text-center font-mono text-slate-500 sticky left-0 bg-slate-900 z-20 group-hover:bg-slate-800 shadow-[2px_0_10px_rgba(0,0,0,0.5)]">{idx + 1}</td>
                                        <td rowSpan={4} className="px-4 py-2 border border-slate-800 font-mono font-black text-blue-400 sticky left-12 bg-slate-900 z-20 group-hover:bg-slate-800 shadow-[2px_0_10px_rgba(0,0,0,0.5)]">{record.employeeId}</td>
                                        <td rowSpan={4} className="px-4 py-2 border border-slate-800 font-bold text-white uppercase text-xs sticky left-[148px] bg-slate-900 z-20 group-hover:bg-slate-800 shadow-[2px_0_10px_rgba(0,0,0,0.5)]">{record.fullName}</td>
                                        <td rowSpan={4} className="px-4 py-2 border border-slate-800 text-center font-bold text-slate-400 text-[10px]">{record.shiftGroup}</td>
                                        <td rowSpan={4} className="px-4 py-2 border border-slate-800 text-slate-500 font-bold text-[10px] uppercase">{record.department}</td>
                                        
                                        <td className="px-2 py-1 border border-slate-800 text-center font-black text-[9px] text-slate-400 bg-slate-900/50">N</td>
                                        {record.days.map(d => (
                                            <td 
                                                key={`n-${d.day}`} 
                                                onClick={() => d.feedback ? setEditingFeedback({ recordId: record.id, day: d.day, type: 'n', currentVal: d.n || '', feedback: d.feedback }) : null}
                                                className={`px-1 py-1 border border-slate-800 text-center font-mono text-xs ${isSunday(d.day) ? 'bg-yellow-500/10' : ''} ${d.n === 'K8' || d.n === 'A8-CT' ? 'text-yellow-400 font-black' : 'text-white'} ${d.feedback ? 'bg-red-600/80 cursor-pointer hover:bg-red-500' : ''} relative transition-colors`}
                                            >
                                                {d.n || '-'}
                                                {d.feedback && (
                                                    <div className="absolute top-0 right-0 p-0.5">
                                                        <Flag size={8} className="text-white fill-white" />
                                                    </div>
                                                )}
                                            </td>
                                        ))}
                                        
                                        <td rowSpan={4} className="px-4 py-2 border border-slate-800 text-center sticky right-0 bg-slate-950 z-40 shadow-[-2px_0_10px_rgba(0,0,0,0.5)] group-hover:bg-slate-800">
                                            {record.isConfirmed ? (
                                                <div className="flex flex-col items-center gap-1 animate-in zoom-in">
                                                    <div className="flex items-center gap-1.5 text-green-400 font-black text-[10px] uppercase">
                                                        <CheckCircle2 size={16} /> Xác nhận đủ công
                                                    </div>
                                                    <span className="text-[8px] text-slate-500 font-mono italic">{record.confirmedAt}</span>
                                                </div>
                                            ) : recordHasFeedback ? (
                                                <div className="flex flex-col items-center gap-1 animate-pulse">
                                                    <div className="flex items-center gap-1.5 text-red-500 font-black text-[10px] uppercase">
                                                        <AlertCircle size={16} /> Có sai sót chưa xác nhận
                                                    </div>
                                                    <span className="text-[8px] text-slate-500 font-mono uppercase italic">Vui lòng kiểm tra cờ đỏ</span>
                                                </div>
                                            ) : (
                                                <button 
                                                    onClick={() => handleConfirm(record.id)}
                                                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-4 py-2 rounded-lg text-[10px] uppercase shadow-lg transition-all active:scale-95 border-b-4 border-emerald-800 whitespace-nowrap"
                                                >
                                                    Xác nhận công
                                                </button>
                                            )}
                                        </td>
                                    </tr>

                                    <tr className={`group transition-colors ${record.isConfirmed ? 'bg-green-900/5' : 'hover:bg-white/5'}`}>
                                        <td className="px-2 py-1 border border-slate-800 text-center font-black text-[9px] text-orange-500 bg-orange-950/20">OT</td>
                                        {record.days.map(d => (
                                            <td 
                                                key={`ot1-${d.day}`} 
                                                onClick={() => d.feedback ? setEditingFeedback({ recordId: record.id, day: d.day, type: 'ot1', currentVal: d.ot1 || '', feedback: d.feedback }) : null}
                                                className={`px-1 py-1 border border-slate-800 text-center font-mono text-xs ${isSunday(d.day) ? 'bg-yellow-500/10' : ''} text-orange-400 ${d.feedback ? 'bg-red-600/80 cursor-pointer hover:bg-red-500' : ''} relative transition-colors`}
                                            >
                                                {d.ot1 || '-'}
                                                {d.feedback && (
                                                    <div className="absolute top-0 right-0 p-0.5">
                                                        <Flag size={8} className="text-white fill-white" />
                                                    </div>
                                                )}
                                            </td>
                                        ))}
                                    </tr>

                                    <tr className={`group transition-colors ${record.isConfirmed ? 'bg-green-900/5' : 'hover:bg-white/5'}`}>
                                        <td className="px-2 py-1 border border-slate-800 text-center font-black text-[9px] text-blue-500 bg-blue-950/20">D</td>
                                        {record.days.map(d => (
                                            <td 
                                                key={`d-${d.day}`} 
                                                onClick={() => d.feedback ? setEditingFeedback({ recordId: record.id, day: d.day, type: 'd', currentVal: d.d || '', feedback: d.feedback }) : null}
                                                className={`px-1 py-1 border border-slate-800 text-center font-mono text-xs ${isSunday(d.day) ? 'bg-yellow-500/10' : ''} text-blue-300 ${d.feedback ? 'bg-red-600/80 cursor-pointer hover:bg-red-500' : ''} relative transition-colors`}
                                            >
                                                {d.d || '-'}
                                                {d.feedback && (
                                                    <div className="absolute top-0 right-0 p-0.5">
                                                        <Flag size={8} className="text-white fill-white" />
                                                    </div>
                                                )}
                                            </td>
                                        ))}
                                    </tr>

                                    <tr className={`group transition-colors border-b-4 border-slate-900 ${record.isConfirmed ? 'bg-green-900/5' : 'hover:bg-white/5'}`}>
                                        <td className="px-2 py-1 border border-slate-800 text-center font-black text-[9px] text-orange-500 bg-orange-900/20">OT</td>
                                        {record.days.map(d => (
                                            <td 
                                                key={`ot2-${d.day}`} 
                                                onClick={() => d.feedback ? setEditingFeedback({ recordId: record.id, day: d.day, type: 'ot2', currentVal: d.ot2 || '', feedback: d.feedback }) : null}
                                                className={`px-1 py-1 border border-slate-800 text-center font-mono text-xs ${isSunday(d.day) ? 'bg-yellow-500/10' : ''} text-orange-400 ${d.feedback ? 'bg-red-600/80 cursor-pointer hover:bg-red-500' : ''} relative transition-colors`}
                                            >
                                                {d.ot2 || '-'}
                                                {d.feedback && (
                                                    <div className="absolute top-0 right-0 p-0.5">
                                                        <Flag size={8} className="text-white fill-white" />
                                                    </div>
                                                )}
                                            </td>
                                        ))}
                                    </tr>
                                </React.Fragment>
                            )})}
                        </tbody>
                    </table>
                </div>
                
                <div className="px-6 py-2.5 bg-slate-950 border-t border-slate-700 flex justify-between items-center shrink-0">
                    <div className="flex gap-6">
                        <div className="flex items-center gap-2">
                             <span className="text-[10px] font-black text-slate-500 uppercase">Hoàn thành:</span>
                             <span className="text-xs font-black text-emerald-500 font-mono">
                                 {filteredData.filter(r => r.isConfirmed).length} / {filteredData.length}
                             </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                         <span className="text-[9px] text-slate-600 font-mono italic">DATA_CONFIRM_ENGINE_V2_READY</span>
                    </div>
                </div>
            </div>

            {/* MODAL SỬA PHẢN HỒI / ĐIỀU CHỈNH CÔNG */}
            {editingFeedback && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95 duration-200">
                    <div className="bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md border border-slate-700 overflow-hidden flex flex-col">
                        <div className="px-6 py-4 bg-red-600 text-white flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <Flag size={20} className="fill-white"/>
                                <h2 className="text-sm font-black uppercase tracking-widest font-mono">ĐIỀU CHỈNH SAI SÓT NGÀY {editingFeedback.day}</h2>
                            </div>
                            <button onClick={() => setEditingFeedback(null)} className="hover:bg-black/20 p-1 rounded-full"><X size={20}/></button>
                        </div>
                        <div className="p-8 space-y-6 bg-slate-900">
                            <div className="bg-red-950/40 p-4 rounded-2xl border border-red-500/30">
                                <p className="text-[10px] text-red-400 uppercase font-black mb-1.5 flex items-center gap-1.5"><MessageSquare size={12}/> Ý kiến nhân viên:</p>
                                <p className="text-sm text-white italic font-medium leading-relaxed">"{editingFeedback.feedback}"</p>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 ml-1">Cập nhật giá trị mới</label>
                                    <div className="relative group">
                                        <Edit3 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors" size={18} />
                                        <input 
                                            type="text" 
                                            value={editingFeedback.currentVal}
                                            onChange={(e) => setEditingFeedback({ ...editingFeedback, currentVal: e.target.value })}
                                            className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-white font-black text-lg outline-none focus:border-blue-500 shadow-inner"
                                            placeholder="VD: K8, 2.5..."
                                            autoFocus
                                        />
                                    </div>
                                    <p className="text-[9px] text-slate-600 mt-2 italic">* Lưu ý: Giá trị mới sẽ thay thế hoàn toàn dữ liệu cũ và xóa cờ báo sai.</p>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button 
                                    onClick={() => handleUpdateDayValue(editingFeedback.recordId, editingFeedback.day, editingFeedback.type, editingFeedback.currentVal, true)}
                                    className="flex-1 bg-green-600 hover:bg-green-500 text-white font-black py-4 rounded-2xl shadow-xl border-b-4 border-green-800 transition-all active:scale-95 uppercase text-xs flex items-center justify-center gap-2"
                                >
                                    <Check size={18}/> Cập nhật & Xóa Cờ
                                </button>
                                <button 
                                    onClick={() => handleUpdateDayValue(editingFeedback.recordId, editingFeedback.day, editingFeedback.type, editingFeedback.currentVal, false)}
                                    className="px-6 bg-slate-700 hover:bg-slate-600 text-slate-300 font-bold py-4 rounded-2xl transition-all uppercase text-xs border border-slate-600"
                                >
                                    Hủy
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
