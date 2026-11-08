
import React, { useMemo, useState, useRef, useEffect } from 'react';
import { UserAccount, StaffRecord, ContractRecord, PayrollRecord, SalarySlipRecord, OvertimeRecord, HRAnnouncement, FeedbackItem, TimekeepingRecord, AttendanceCorrectionRequest, AttendanceConfirmationRecord, AttendanceConfirmDay } from '../../types';
import { User, Phone, MapPin, Briefcase, Hash, Calendar, FileText, Banknote, Clock, Download, Eye, Sun, Moon, X, Camera, Bell, Megaphone, AlertCircle, CheckCircle2, MessageSquareWarning, Send, AlertTriangle, CalendarCheck, Check, MessageSquare, ShieldCheck, List, FileClock, Edit2, Loader2, Hourglass, ChevronLeft, ChevronRight, FileBadge, Save, Edit3 } from 'lucide-react';

interface EmployeeProfileProps {
    currentUser: UserAccount; 
    staffInfo?: StaffRecord;  
    contracts: ContractRecord[];
    salarySlips: SalarySlipRecord[];
    payrollRecords: PayrollRecord[];
    overtimeRecords: OvertimeRecord[];
    announcements?: HRAnnouncement[]; 
    onClose?: () => void; 
    onUpdateAvatar?: (newUrl: string) => void;
    onUpdateStaffInfo?: (updatedStaff: StaffRecord) => void;
    onFeedback?: (targetType: 'SLIP' | 'PAYROLL', targetId: number, feedback: FeedbackItem) => void;
    timekeepingRecords?: TimekeepingRecord[]; 
    attendanceRequests?: AttendanceCorrectionRequest[];
    onRequestCorrection?: (req: AttendanceCorrectionRequest) => void;
    attendanceConfirmations?: AttendanceConfirmationRecord[];
    onUpdateAttendanceConfirmation?: (data: AttendanceConfirmationRecord[]) => void;
}

const calculateWorkHours = (timeStr: string) => {
    if (!timeStr || !timeStr.includes('-')) return 0;
    const parts = timeStr.split('-').map(s => s.trim());
    if (parts.length !== 2) return 0;
    if (parts[0].includes('Thiếu') || parts[1].includes('Thiếu')) return 0;
    const [inH, inM] = parts[0].split(':').map(Number);
    const [outH, outM] = parts[1].split(':').map(Number);
    if (isNaN(inH) || isNaN(outH)) return 0;
    const inMin = inH * 60 + inM;
    let outMin = outH * 60 + outM;
    if (outMin < inMin) outMin += 1440;
    return parseFloat(((outMin - inMin) / 60).toFixed(1));
};

const calculateStats = (records: TimekeepingRecord[], defaultProfileShift: 'DAY' | 'NIGHT' = 'DAY') => {
    let totalDays = 0;
    let totalOT = 0;
    let dayOT = 0;
    let nightOT = 0;
    let sundayOT = 0;
    const sortedRecords = [...records].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    records.forEach(r => {
        const timeStr = r.time;
        if (!timeStr || !timeStr.includes('-') || timeStr.includes('Thiếu')) return;
        totalDays++;
        const hoursWorked = calculateWorkHours(timeStr);
        const date = new Date(r.date);
        const isSunday = date.getDay() === 0;
        const effectiveShift = r.calculatedShift || defaultProfileShift;
        const parts = timeStr.split('-').map(s => s.trim());
        const [inH, inM] = parts[0].split(':').map(Number);
        const [outH, outM] = parts[1].split(':').map(Number);
        const inMin = inH * 60 + inM;
        let outMin = outH * 60 + outM;
        if (outMin < inMin) outMin += 1440;
        if (isSunday) {
            let dailyOT = Math.floor(hoursWorked);
            if (effectiveShift === 'DAY') {
                if (outMin >= 1170) dailyOT = 11;
                else if (outMin >= 990) dailyOT = 8;
            } else {
                if (outMin >= 1890) dailyOT = 11;
                else if (outMin >= 1710) dailyOT = 8;
            }
            sundayOT += dailyOT;
            totalOT += dailyOT;
        } else {
            const standardDuration = 9; 
            if (hoursWorked > standardDuration) {
                const ot = hoursWorked - standardDuration;
                const dailyOT = Math.floor(ot);
                totalOT += dailyOT;
                if (effectiveShift === 'NIGHT') nightOT += dailyOT;
                else dayOT += dailyOT;
            }
        }
    });
    return { totalDays, totalOT: Math.floor(totalOT), dayOT: Math.floor(dayOT), nightOT: Math.floor(nightOT), sundayOT: Math.floor(sundayOT), sortedRecords };
};

export const EmployeeProfile: React.FC<EmployeeProfileProps> = ({ 
    currentUser, staffInfo, contracts, salarySlips, payrollRecords, overtimeRecords, announcements = [], onClose, onUpdateAvatar, onUpdateStaffInfo, onFeedback, timekeepingRecords = [], attendanceRequests = [], onRequestCorrection, attendanceConfirmations = [], onUpdateAttendanceConfirmation
}) => {
    const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'ATT_CONFIRM' | 'DOCS' | 'SALARY' | 'OVERTIME'>('OVERVIEW');
    const [viewMonth, setViewMonth] = useState(new Date().getMonth() + 1);
    const [viewYear, setViewYear] = useState(new Date().getFullYear());
    const [isAvatarLoading, setIsAvatarLoading] = useState(false);

    // --- STATE CHỈNH SỬA THÔNG TIN ---
    const [isEditingInfo, setIsEditingInfo] = useState(false);
    const [tempPhone, setTempPhone] = useState('');
    const [tempHometown, setTempHometown] = useState('');

    useEffect(() => {
        if (staffInfo) {
            setTempPhone(staffInfo.phone || '');
            setTempHometown(staffInfo.hometown || '');
        }
    }, [staffInfo, isEditingInfo]);

    const handleSaveInfo = () => {
        if (staffInfo && onUpdateStaffInfo) {
            onUpdateStaffInfo({
                ...staffInfo,
                phone: tempPhone,
                hometown: tempHometown
            });
            setIsEditingInfo(false);
            alert("Thông tin cá nhân đã được cập nhật!");
        }
    };

    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [reportTarget, setReportTarget] = useState<{ type: 'SLIP' | 'PAYROLL', id: number } | null>(null);
    const [reportContent, setReportContent] = useState('');
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [confirmTarget, setConfirmTarget] = useState<{ type: 'SLIP' | 'PAYROLL', id: number } | null>(null);
    const [confirmContent, setConfirmContent] = useState('');
    const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false);
    const [correctionTarget, setCorrectionTarget] = useState<{ date: string } | null>(null);
    const [correctionForm, setCorrectionForm] = useState({ inTime: '', outTime: '', reason: '' });
    const [isConfirmEditModalOpen, setIsConfirmEditModalOpen] = useState(false);
    const [confirmEditTarget, setConfirmEditTarget] = useState<{ day: number, feedback: string } | null>(null);
    const [confirmEditFeedback, setConfirmEditFeedback] = useState('');

    const fileInputRef = useRef<HTMLInputElement>(null);
    const targetEmployeeId = staffInfo?.employeeId || currentUser.employeeId;
    const targetEmployeeName = staffInfo?.fullName || currentUser.fullName;
    const filterMonthStr = `${viewYear}-${String(viewMonth).padStart(2, '0')}`;

    const myContracts = useMemo(() => contracts.filter(c => c.employeeId === targetEmployeeId), [contracts, targetEmployeeId]);
    const mySlips = useMemo(() => salarySlips.filter(s => s.employeeId === targetEmployeeId && s.month === filterMonthStr && (s.isShared || (s.sharedWith && s.sharedWith.includes(targetEmployeeId || '')))), [salarySlips, targetEmployeeId, filterMonthStr]);
    const myPayroll = useMemo(() => { if (!staffInfo?.department) return []; return payrollRecords.filter(p => p.month === filterMonthStr && (p.sharedWith?.includes(staffInfo.department!) || p.sharedWith?.includes(targetEmployeeId || ''))); }, [payrollRecords, staffInfo, targetEmployeeId, filterMonthStr]);
    const myOvertime = useMemo(() => overtimeRecords.filter(o => o.employeeId === targetEmployeeId && o.date.startsWith(filterMonthStr)), [overtimeRecords, targetEmployeeId, filterMonthStr]);
    const myTimekeeping = useMemo(() => { if (!targetEmployeeId) return []; return timekeepingRecords.filter(r => r.employeeId === targetEmployeeId && r.date.startsWith(filterMonthStr)); }, [timekeepingRecords, targetEmployeeId, filterMonthStr]);
    const myRequests = useMemo(() => { if (!targetEmployeeId) return []; return attendanceRequests.filter(r => r.employeeId === targetEmployeeId); }, [attendanceRequests, targetEmployeeId]);

    const myConfirmationRecord = useMemo(() => {
        if (!targetEmployeeId || !attendanceConfirmations) return null;
        const normalizedId = targetEmployeeId.trim().toUpperCase();
        const normalizedName = targetEmployeeName?.trim().toUpperCase();
        return attendanceConfirmations.find(r => r.month === filterMonthStr && (r.employeeId.trim().toUpperCase() === normalizedId || r.fullName.trim().toUpperCase() === normalizedName));
    }, [attendanceConfirmations, targetEmployeeId, targetEmployeeName, filterMonthStr]);

    const workStats = useMemo(() => calculateStats(myTimekeeping, staffInfo?.shift), [myTimekeeping, staffInfo]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            
            // Validate file size (e.g., < 2MB)
            if (file.size > 2 * 1024 * 1024) {
                alert("Dung lượng ảnh quá lớn (vui lòng chọn ảnh < 2MB)");
                return;
            }

            setIsAvatarLoading(true);
            const reader = new FileReader();
            reader.onloadend = () => { 
                if (onUpdateAvatar && reader.result) {
                    onUpdateAvatar(reader.result as string);
                }
                setIsAvatarLoading(false);
            };
            reader.onerror = () => {
                alert("Lỗi khi đọc file ảnh.");
                setIsAvatarLoading(false);
            };
            reader.readAsDataURL(file);
        }
    };

    const handlePrevMonth = () => { if (viewMonth === 1) { setViewMonth(12); setViewYear(viewYear - 1); } else setViewMonth(viewMonth - 1); };
    const handleNextMonth = () => { if (viewMonth === 12) { setViewMonth(1); setViewYear(viewYear + 1); } else setViewMonth(viewMonth + 1); };

    const handleOpenCorrection = (date: string) => { setCorrectionTarget({ date }); setCorrectionForm({ inTime: '', outTime: '', reason: '' }); setIsCorrectionModalOpen(true); };
    const submitCorrection = () => {
        if (!correctionTarget || !onRequestCorrection || !targetEmployeeId) return;
        if (!correctionForm.inTime || !correctionForm.outTime || !correctionForm.reason) { alert("Vui lòng điền đầy đủ thông tin."); return; }
        const newRequest: AttendanceCorrectionRequest = { id: Date.now(), employeeId: targetEmployeeId, fullName: targetEmployeeName, date: correctionTarget.date, inTime: correctionForm.inTime, outTime: correctionForm.outTime, reason: correctionForm.reason, status: 'PENDING', requestDate: new Date().toLocaleString() };
        onRequestCorrection(newRequest); alert("Đã gửi yêu cầu xác nhận công thành công."); setIsCorrectionModalOpen(false);
    };

    const submitConfirm = () => {
        if (!confirmTarget || !onFeedback) return;
        const feedback: FeedbackItem = { id: Date.now(), senderId: targetEmployeeId || 'unknown', senderName: targetEmployeeName || 'Unknown', timestamp: new Date().toLocaleString('vi-VN'), type: 'CONFIRM', content: confirmContent || 'Xác nhận chính xác' };
        onFeedback(confirmTarget.type, confirmTarget.id, feedback); setIsConfirmModalOpen(false); setConfirmTarget(null); setConfirmContent('');
    };

    const submitReport = () => {
        if (!reportTarget || !reportContent.trim() || !onFeedback) return;
        const feedback: FeedbackItem = { id: Date.now(), senderId: targetEmployeeId || 'unknown', senderName: targetEmployeeName || 'Unknown', timestamp: new Date().toLocaleString('vi-VN'), type: 'REPORT', content: reportContent };
        onFeedback(reportTarget.type, reportTarget.id, feedback); setIsReportModalOpen(false); setReportTarget(null); setReportContent(''); alert("Đã gửi báo cáo sai sót về phòng HC&NS.");
    };

    const getMyFeedbackStatus = (feedbackList?: FeedbackItem[]) => { if (!feedbackList || feedbackList.length === 0 || !targetEmployeeId) return null; const myFeedback = feedbackList.filter(f => f.senderId === targetEmployeeId).sort((a,b) => b.id - a.id); if (myFeedback.length === 0) return null; return myFeedback[0]; };

    const handleConfirmDayEdit = (day: number, currentFeedback: string = '') => { setConfirmEditTarget({ day, feedback: currentFeedback }); setConfirmEditFeedback(currentFeedback); setIsConfirmEditModalOpen(true); };
    const submitConfirmEdit = () => {
        if (!confirmEditTarget || !myConfirmationRecord || !onUpdateAttendanceConfirmation || !attendanceConfirmations) return;
        const updatedDays = myConfirmationRecord.days.map(d => { if (d.day === confirmEditTarget.day) return { ...d, feedback: confirmEditFeedback }; return d; });
        const updatedRecord = { ...myConfirmationRecord, days: updatedDays };
        const updatedList = attendanceConfirmations.map(r => r.id === updatedRecord.id ? updatedRecord : r);
        onUpdateAttendanceConfirmation(updatedList); setIsConfirmEditModalOpen(false); setConfirmEditTarget(null); setConfirmEditFeedback(''); alert("Đã gửi phản hồi điều chỉnh ngày " + confirmEditTarget.day);
    };

    const handleFinalConfirm = () => {
        if (!myConfirmationRecord || !onUpdateAttendanceConfirmation || !attendanceConfirmations) return;
        if (window.confirm("Bạn có chắc chắn xác nhận toàn bộ bảng công này là chính xác?")) {
            const updatedRecord: AttendanceConfirmationRecord = { ...myConfirmationRecord, isConfirmed: true, confirmedAt: new Date().toLocaleString('vi-VN'), confirmedBy: targetEmployeeName };
            const updatedList = attendanceConfirmations.map(r => r.id === updatedRecord.id ? updatedRecord : r);
            onUpdateAttendanceConfirmation(updatedList);
        }
    };

    const daysInViewMonth = new Date(viewYear, viewMonth, 0).getDate();
    const daysArray = Array.from({ length: daysInViewMonth }, (_, i) => i + 1);
    const isSunday = (day: number) => { const date = new Date(viewYear, viewMonth - 1, day); return date.getDay() === 0; };

    if (!staffInfo) return <div className="p-10 text-center text-slate-400">Không tìm thấy thông tin nhân viên.</div>;

    const showAttConfirmTab = staffInfo.department?.toUpperCase().includes('MULTI') || (attendanceConfirmations && attendanceConfirmations.some(r => r.employeeId.trim().toUpperCase() === targetEmployeeId.trim().toUpperCase() || r.fullName.trim().toUpperCase() === targetEmployeeName?.trim().toUpperCase()));

    return (
        <div className="flex flex-col h-full bg-slate-900 text-slate-300 font-sans overflow-y-auto p-4 md:p-8 relative">
            {onClose && (
                <button onClick={onClose} className="absolute top-4 right-4 z-50 p-2 bg-slate-800 hover:bg-red-600 text-slate-400 hover:text-white rounded-full transition-colors shadow-lg border border-slate-700" title="Đóng thẻ nhân viên"><X size={20}/></button>
            )}

            <div className="max-w-6xl mx-auto w-full flex flex-col md:flex-row gap-6">
                <div className="w-full md:w-1/3 lg:w-1/4 flex-shrink-0">
                    <div className="bg-[#0b1121] rounded-2xl shadow-2xl border border-slate-700 overflow-hidden relative group w-full mx-auto max-sm:max-w-sm">
                         <div className="p-6 flex flex-col items-center relative z-10">
                             <div className="relative mb-3 group/avatar mt-2">
                                 <div className="w-24 h-24 rounded-full bg-slate-800 border-2 border-cyan-500/50 flex items-center justify-center text-3xl font-bold text-slate-500 shadow-[0_0_15px_rgba(6,182,212,0.3)] overflow-hidden">
                                     {isAvatarLoading ? (
                                         <Loader2 className="animate-spin text-cyan-500" size={32} />
                                     ) : staffInfo.avatarUrl ? (
                                         <img src={staffInfo.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                                     ) : (
                                         staffInfo.fullName.charAt(0)
                                     )}
                                 </div>
                                 <button 
                                    onClick={() => fileInputRef.current?.click()} 
                                    disabled={isAvatarLoading}
                                    className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity cursor-pointer text-white backdrop-blur-[2px]" 
                                    title="Cập nhật ảnh đại diện"
                                >
                                    <Camera size={20} />
                                </button>
                                 <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*" className="hidden" />
                             </div>
                             
                             <h2 className="text-lg font-black text-white text-center mb-0.5 tracking-wide text-shadow-sm">{staffInfo.fullName.toUpperCase()}</h2>
                             <div className="mb-4">
                                <span className="bg-slate-800/80 border border-slate-600 text-blue-300 text-[10px] font-bold px-3 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                                    {staffInfo.position || 'Nhân Viên'}
                                </span>
                             </div>

                             {/* COMPACT INFO - CHẾ ĐỘ CHỈNH SỬA */}
                             <div className="w-full space-y-2">
                                 <div className="flex items-center gap-3 px-3 py-1.5 bg-[#0f172a]/90 rounded border border-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.15)] relative overflow-hidden group hover:bg-[#1e293b] transition-colors">
                                     <div className="absolute left-0 top-0 bottom-0 w-1 bg-cyan-500"></div>
                                     <div className="p-1 rounded text-cyan-400"><Hash size={16}/></div>
                                     <div className="flex-1 min-w-0 flex justify-between items-center">
                                         <span className="text-[10px] text-cyan-500 font-bold uppercase tracking-wider">Mã NV</span>
                                         <span className="font-mono font-bold text-white text-sm tracking-wide">{staffInfo.employeeId}</span>
                                     </div>
                                 </div>
                                 <div className="flex items-center gap-3 px-3 py-1.5 bg-[#0f172a]/90 rounded border border-purple-500 shadow- [0_0_10px_rgba(168,85,247,0.15)] relative overflow-hidden group hover:bg-[#1e293b] transition-colors">
                                     <div className="absolute left-0 top-0 bottom-0 w-1 bg-purple-500"></div>
                                     <div className="p-1 rounded text-purple-400"><Briefcase size={16}/></div>
                                     <div className="flex-1 min-w-0 flex justify-between items-center">
                                         <span className="text-[10px] text-purple-500 font-bold uppercase tracking-wider">Bộ Phận</span>
                                         <span className="font-bold text-white text-sm truncate max-w-[120px]">{staffInfo.department}</span>
                                     </div>
                                 </div>
                                 
                                 <div className="flex items-center gap-3 px-3 py-1.5 bg-[#0f172a]/90 rounded border border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.15)] relative overflow-hidden group hover:bg-[#1e293b] transition-colors">
                                     <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500"></div>
                                     <div className="p-1 rounded text-emerald-400"><Phone size={16}/></div>
                                     <div className="flex-1 min-w-0 flex justify-between items-center">
                                         <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider">Điện Thoại</span>
                                         {isEditingInfo ? (
                                             <input 
                                                type="text" 
                                                value={tempPhone}
                                                onChange={e => setTempPhone(e.target.value)}
                                                className="bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-xs text-white outline-none focus:border-emerald-500 w-28"
                                                autoFocus
                                             />
                                         ) : (
                                             <span className="font-mono font-bold text-white text-sm">{staffInfo.phone || '--'}</span>
                                         )}
                                     </div>
                                 </div>

                                 <div className="flex items-center gap-3 px-3 py-1.5 bg-[#0f172a]/90 rounded border border-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.15)] relative overflow-hidden group hover:bg-[#1e293b] transition-colors">
                                     <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500"></div>
                                     <div className="p-1 rounded text-amber-400"><MapPin size={16}/></div>
                                     <div className="flex-1 min-w-0 flex justify-between items-center">
                                         <span className="text-[10px] text-amber-500 font-bold uppercase tracking-wider">Quê Quán</span>
                                         {isEditingInfo ? (
                                             <input 
                                                type="text" 
                                                value={tempHometown}
                                                onChange={e => setTempHometown(e.target.value)}
                                                className="bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-xs text-white outline-none focus:border-amber-500 w-28"
                                             />
                                         ) : (
                                             <span className="font-bold text-white text-sm truncate max-w-[120px]">{staffInfo.hometown || '--'}</span>
                                         )}
                                     </div>
                                 </div>
                             </div>

                             {/* NÚT ĐIỀU KHIỂN CHỈNH SỬA */}
                             <div className="w-full mt-4 flex gap-2">
                                 {isEditingInfo ? (
                                     <>
                                         <button onClick={handleSaveInfo} className="flex-1 bg-green-600 hover:bg-green-500 text-white text-[10px] font-black py-2 rounded-lg transition-all flex items-center justify-center gap-1 uppercase border-b-2 border-green-800"><Save size={14}/> Lưu</button>
                                         <button onClick={() => setIsEditingInfo(false)} className="px-3 bg-slate-700 hover:bg-slate-600 text-white text-[10px] font-black py-2 rounded-lg transition-all uppercase border-b-2 border-slate-800">Hủy</button>
                                     </>
                                 ) : (
                                     <button onClick={() => setIsEditingInfo(true)} className="w-full bg-slate-800 hover:bg-slate-700 text-blue-400 text-[10px] font-black py-2 rounded-lg transition-all flex items-center justify-center gap-2 uppercase border border-slate-700 shadow-sm"><Edit3 size={14}/> Sửa thông tin</button>
                                 )}
                             </div>

                             <div className="mt-4 flex gap-1">
                                 <div className="w-16 h-1 bg-cyan-500 rounded-full"></div>
                                 <div className="w-4 h-1 bg-purple-500 rounded-full"></div>
                                 <div className="w-2 h-1 bg-green-500 rounded-full"></div>
                             </div>
                             <div className="text-[8px] text-slate-500 mt-1 font-mono uppercase tracking-widest">Newprotec Identity Card</div>
                        </div>
                    </div>
                </div>

                <div className="flex-1 flex flex-col">
                    <div className="flex flex-col sm:flex-row justify-between items-center border-b border-slate-700 mb-6 gap-4">
                        <div className="flex overflow-x-auto w-full sm:w-auto">
                            <button onClick={() => setActiveTab('OVERVIEW')} className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'OVERVIEW' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>TỔNG QUAN</button>
                            {showAttConfirmTab && (<button onClick={() => setActiveTab('ATT_CONFIRM')} className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'ATT_CONFIRM' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>XÁC NHẬN CÔNG</button>)}
                            <button onClick={() => setActiveTab('SALARY')} className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'SALARY' ? 'border-green-500 text-green-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>LƯƠNG & PHIẾU</button>
                            <button onClick={() => setActiveTab('OVERTIME')} className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'OVERTIME' ? 'border-orange-500 text-orange-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>TĂNG CA</button>
                            <button onClick={() => setActiveTab('DOCS')} className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'DOCS' ? 'border-purple-500 text-purple-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>HỢP ĐỒNG</button>
                        </div>
                        <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-700 shadow-inner">
                            <button onClick={handlePrevMonth} className="p-1 hover:bg-slate-800 rounded text-slate-500"><ChevronLeft size={16}/></button>
                            <span className="text-xs font-black text-white font-mono w-24 text-center uppercase tracking-tighter">THÁNG {viewMonth}/{viewYear}</span>
                            <button onClick={handleNextMonth} className="p-1 hover:bg-slate-800 rounded text-slate-500"><ChevronRight size={16}/></button>
                        </div>
                    </div>

                    <div className="flex-1 min-h-0 overflow-hidden">
                        {activeTab === 'OVERVIEW' && (
                            <div className="flex flex-col gap-4 h-full">
                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 shrink-0">
                                     <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 shadow-md">
                                         <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><Clock size={16} className="text-orange-500"/> CÔNG THÁNG {viewMonth}/{viewYear}</h3>
                                         <div className="grid grid-cols-2 gap-4">
                                             <div className="bg-slate-900/50 p-3 rounded border border-slate-700 text-center"><div className="text-xs text-slate-500 uppercase mb-1">Ngày Công</div><div className="text-2xl font-bold text-white font-mono">{workStats.totalDays}</div></div>
                                             <div className="bg-slate-900/50 p-3 rounded border border-slate-700 text-center"><div className="text-xs text-slate-500 uppercase mb-1">Tổng Tăng Ca (Thực tế)</div><div className="text-2xl font-bold text-orange-400 font-mono">{Math.floor(workStats.totalOT)}h</div></div>
                                         </div>
                                     </div>
                                     <div className="bg-slate-800 p-5 rounded-xl border border-slate-700">
                                         <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><Banknote size={16} className="text-green-500"/> LƯƠNG GẦN NHẤT</h3>
                                         {mySlips.length > 0 ? (
                                             <div className="flex items-center justify-between bg-green-900/20 p-3 rounded border border-green-900/50">
                                                 <div><div className="text-xs text-green-400 font-bold">Tháng {mySlips[mySlips.length-1].month}</div><div className="text-[10px] text-slate-500">{mySlips[mySlips.length-1].fileName}</div></div>
                                                 <button onClick={() => window.open(mySlips[mySlips.length-1].fileUrl, '_blank')} className="text-xs bg-green-600 text-white px-3 py-1 rounded font-bold hover:bg-green-500">Xem</button>
                                             </div>
                                         ) : (<div className="text-sm text-slate-500 italic">Chưa có phiếu lương.</div>)}
                                     </div>
                                 </div>
                                 
                                 <div className="bg-slate-800 rounded-xl shadow-lg border border-slate-700 overflow-hidden flex flex-col flex-1 min-h-[300px]">
                                    <div className="px-4 py-3 border-b border-slate-700 flex items-center gap-2 bg-gradient-to-r from-slate-800 to-slate-900">
                                         <div className="p-1.5 bg-blue-500/20 rounded text-blue-400"><FileClock size={16}/></div>
                                         <h3 className="text-xs font-bold text-white uppercase tracking-wider">Chi Tiết Chấm Công Tháng {viewMonth}/{viewYear}</h3>
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-0 custom-scrollbar bg-slate-900/30">
                                        <table className="w-full text-xs text-left">
                                            <thead className="text-slate-500 bg-slate-900/80 sticky top-0 z-10"><tr><th className="px-4 py-2 font-bold">Ngày</th><th className="px-4 py-2 font-bold text-center">Giờ Quẹt Thẻ</th><th className="px-4 py-2 font-bold text-center">Tình Trạng</th><th className="px-4 py-2 font-bold text-center w-[80px]">Thao tác</th></tr></thead>
                                            <tbody className="divide-y divide-slate-700/50 text-slate-300">
                                                {workStats.sortedRecords.length === 0 ? (<tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500 italic">Chưa có dữ liệu..</td></tr>) : (workStats.sortedRecords.map((rec, idx) => {
                                                        const isMissing = rec.attendanceStatus.includes('Thiếu') || rec.attendanceStatus.includes('Vắng') || rec.time === '' || rec.time === '00:00';
                                                        const existingReq = myRequests.find(r => r.date === rec.date);
                                                        return (<tr key={idx} className="hover:bg-white/5 transition-colors text-slate-300"><td className="px-4 py-2 font-mono text-slate-400">{rec.date}</td><td className="px-4 py-2 font-mono text-center text-white">{rec.time || '--:--'}</td><td className="px-4 py-2 text-center"><span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${rec.attendanceStatus.includes('Đủ') || rec.attendanceStatus.includes('Đúng') ? 'bg-green-900/30 text-green-400 border-green-800' : 'bg-red-900/30 text-red-400 border-red-800'}`}>{rec.attendanceStatus}</span></td><td className="px-4 py-2 text-center">{isMissing && !existingReq && (<button onClick={() => handleOpenCorrection(rec.date)} className="text-xs bg-blue-900/30 hover:bg-blue-600 hover:text-white text-blue-400 px-2 py-1 rounded border border-blue-800 transition-colors flex items-center justify-center gap-1 mx-auto" title="Xác nhận / Bổ sung công"><Edit2 size={12}/></button>)}{existingReq && (<span className={`text-[9px] font-bold px-1 py-0.5 rounded border ${existingReq.status === 'PENDING' ? 'text-yellow-400 border-yellow-700 bg-yellow-900/20' : existingReq.status === 'CHECKING' ? 'text-orange-400 border-orange-700 bg-orange-900/20' : existingReq.status === 'APPROVED' ? 'text-green-400 border-green-700 bg-green-900/20' : 'text-red-400 border-red-700 bg-red-900/20'}`}>{existingReq.status === 'PENDING' ? 'Chờ duyệt' : existingReq.status === 'CHECKING' ? 'Đang KT' : existingReq.status === 'APPROVED' ? 'Đã duyệt' : 'Từ chối'}</span>)}</td></tr>);
                                                    }))}
                                            </tbody>
                                        </table>
                                    </div>
                                 </div>
                            </div>
                        )}

                        {activeTab === 'ATT_CONFIRM' && (
                            <div className="flex flex-col h-full bg-slate-800 rounded-xl border border-slate-700 overflow-hidden shadow-2xl animate-in fade-in slide-in-from-right-4 duration-300">
                                <div className="px-6 py-4 bg-emerald-900/30 border-b border-slate-700 flex justify-between items-center shrink-0">
                                    <div className="flex items-center gap-3"><div className="p-2 bg-emerald-600 rounded-lg text-white shadow-lg"><FileBadge size={20}/></div><div><h3 className="text-sm font-black text-white uppercase tracking-widest font-mono">BẢNG XÁC NHẬN CÔNG CHI TIẾT</h3><p className="text-[10px] text-emerald-400 font-bold uppercase mt-0.5">Tháng {viewMonth}/{viewYear} • {targetEmployeeName}</p></div></div>
                                    {myConfirmationRecord?.isConfirmed ? (<div className="flex items-center gap-2 bg-green-900/40 border border-green-500 text-green-400 px-3 py-1.5 rounded-lg shadow-inner"><CheckCircle2 size={16}/><span className="text-xs font-black uppercase">ĐÃ XÁC NHẬN ({myConfirmationRecord.confirmedAt})</span></div>) : (<div className="text-[10px] text-orange-400 font-bold uppercase flex items-center gap-2 animate-pulse"><AlertCircle size={14}/> Vui lòng kiểm tra và xác nhận công tác phí & giờ làm</div>)}
                                </div>
                                <div className="flex-1 overflow-auto custom-scrollbar bg-slate-950">
                                    {!myConfirmationRecord ? (<div className="h-full flex flex-col items-center justify-center text-slate-500 italic opacity-50 py-20"><FileBadge size={64} className="mb-4"/><p className="uppercase font-black tracking-widest text-center">Chưa có dữ liệu cho tháng {viewMonth}/{viewYear}</p></div>) : (
                                        <div className="flex flex-col h-full">
                                            <div className="flex-1 overflow-auto custom-scrollbar relative">
                                                <table className="w-full text-left border-collapse"><thead className="bg-slate-900 text-slate-500 uppercase font-black font-mono text-[10px] sticky top-0 z-20 shadow-xl"><tr><th className="px-4 py-3 border-b border-slate-800 text-center w-16">Ngày</th><th className="px-4 py-3 border-b border-slate-800 text-center bg-blue-900/10">Ca (Ngày)</th><th className="px-4 py-3 border-b border-slate-800 text-center text-orange-400">TC 1</th><th className="px-4 py-3 border-b border-slate-800 text-center bg-purple-900/10">Ca (Đêm)</th><th className="px-4 py-3 border-b border-slate-800 text-center text-orange-400">TC 2</th><th className="px-4 py-3 border-b border-slate-800 text-center w-16">Sửa</th></tr></thead>
                                                    <tbody className="divide-y divide-slate-800">{daysArray.map(d => { const dayData = myConfirmationRecord.days.find(x => x.day === d); const isSun = isSunday(d); return (<tr key={d} className={`hover:bg-white/5 transition-colors ${isSun ? 'bg-red-900/5' : ''}`}><td className={`px-4 py-3 text-center font-mono font-black border-r border-slate-800/50 ${isSun ? 'text-red-500' : 'text-slate-400'}`}>{String(d).padStart(2, '0')}</td><td className="px-4 py-3 text-center font-mono font-bold border-r border-slate-800/50"><span className={dayData?.n === 'K8' || dayData?.n === 'A8-CT' ? 'text-yellow-400' : 'text-slate-200'}>{dayData?.n || '-'}</span></td><td className="px-4 py-3 text-center font-mono font-black text-orange-400 border-r border-slate-800/50">{dayData?.ot1 || '-'}</td><td className="px-4 py-3 text-center font-mono font-bold border-r border-slate-800/50"><span className={dayData?.d === 'K8' || dayData?.d === 'A8-CT' ? 'text-yellow-400' : 'text-slate-200'}>{dayData?.d || '-'}</span></td><td className="px-4 py-3 text-center font-mono font-black text-orange-400 border-r border-slate-800/50">{dayData?.ot2 || '-'}</td><td className="px-4 py-3 text-center relative"><div className="flex justify-center">{!myConfirmationRecord.isConfirmed && (<button onClick={() => handleConfirmDayEdit(d, dayData?.feedback || '')} className="p-1.5 rounded-lg bg-slate-800 hover:bg-orange-600 text-slate-400 hover:text-white transition-all shadow-sm border border-slate-700" title="Gửi phản hồi sai sót"><Edit2 size={14}/></button>)}{dayData?.feedback && (<div className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-bl-lg animate-pulse" title={dayData.feedback}></div>)}</div></td></tr>); })}</tbody>
                                                </table>
                                            </div>
                                            <div className="flex flex-col md:flex-row justify-between items-center gap-6 p-6 border-t border-slate-700 bg-slate-900 shadow-[0_-10px_30px_rgba(0,0,0,0.5)] z-30">
                                                <div className="flex gap-12 text-xs">
                                                    <div className="flex flex-col"><span className="text-[10px] font-black text-slate-500 uppercase">Phép tồn (31/12)</span><span className="text-2xl font-black text-emerald-400 font-mono">{myConfirmationRecord.unexcusedAbsence}</span></div>
                                                    <div className="flex flex-col"><span className="text-[10px] font-black text-slate-500 uppercase">Vắng không phép</span><span className="text-2xl font-black text-red-400 font-mono">{myConfirmationRecord.remainingLeave}</span></div>
                                                </div>
                                                {!myConfirmationRecord.isConfirmed ? (<button onClick={handleFinalConfirm} className="w-full md:w-auto px-10 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-widest rounded-xl shadow-[0_10px_20px_rgba(16,185,129,0.3)] transition-all active:scale-95 border-b-4 border-emerald-800 flex items-center justify-center gap-3"><CheckCircle2 size={24}/> XÁC NHẬN CÔNG CHÍNH XÁC</button>) : (<div className="bg-slate-800/50 border border-slate-700 px-6 py-3 rounded-xl text-slate-500 italic text-xs flex items-center gap-3"><ShieldCheck size={20} className="text-green-500"/><span>Xác nhận hoàn tất vào lúc {myConfirmationRecord.confirmedAt}</span></div>)}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'SALARY' && (
                            <div className="space-y-6">
                                <div><h3 className="text-sm font-bold text-slate-400 uppercase mb-3 border-b border-slate-700 pb-1">Phiếu Lương Tháng {viewMonth}/{viewYear}</h3>
                                    {mySlips.length === 0 ? (<div className="text-sm text-slate-500 italic">Chưa có phiếu lương.</div>) : (
                                        <div className="grid gap-3">{mySlips.map(slip => { const myFeedback = getMyFeedbackStatus(slip.feedback); return (<div key={slip.id} className="bg-slate-800 rounded-lg border border-slate-700 hover:border-green-500/50 transition-colors overflow-hidden group"><div className="p-4 flex items-center justify-between"><div className="flex items-center gap-3"><div className="p-2 bg-green-900/30 rounded text-green-500"><Banknote size={20}/></div><div><div className="font-bold text-white">Phiếu Lương Tháng {slip.month}</div><div className="text-xs text-slate-500">{slip.uploadDate}</div></div></div><div className="flex items-center gap-2">{!myFeedback && (<div className="flex gap-1 mr-2 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={() => { setConfirmTarget({ type:'SLIP', id:slip.id }); setConfirmContent('Đã kiểm tra, thông tin chính xác.'); setIsConfirmModalOpen(true); }} className="px-2 py-1 text-[10px] bg-green-700 hover:bg-green-600 text-white rounded font-bold transition-colors border border-green-600 flex items-center gap-1"><Check size={10}/> Xác nhận</button><button onClick={() => { setReportTarget({ type:'SLIP', id:slip.id }); setReportContent(''); setIsReportModalOpen(true); }} className="px-2 py-1 text-[10px] bg-red-700 hover:bg-red-600 text-white rounded font-bold transition-colors border border-red-600 flex items-center gap-1"><AlertCircle size={10}/> Báo sai</button></div>)}<button onClick={() => window.open(slip.fileUrl, '_blank')} className="p-2 hover:bg-slate-700 rounded text-blue-400" title="Xem"><Eye size={18}/></button><button className="p-2 hover:bg-slate-700 rounded text-green-400" title=" Tải về"><Download size={18}/></button></div></div>{myFeedback && (<div className={`mx-4 mb-3 p-3 rounded-lg border flex items-start gap-3 animate-in slide-in-from-top-2 ${myFeedback.type === 'CONFIRM' ? 'bg-emerald-900/20 border-emerald-500/30 text-emerald-400' : 'bg-rose-900/20 border-rose-500/30 text-rose-400'}`}><div className={`mt-0.5 p-1 rounded-full ${myFeedback.type === 'CONFIRM' ? 'bg-emerald-500/20' : 'bg-rose-500/20'}`}>{myFeedback.type === 'CONFIRM' ? <ShieldCheck size={16}/> : <MessageSquareWarning size={16}/>}</div><div className="flex-1"><div className="flex justify-between items-start"><span className="font-bold text-sm uppercase">{myFeedback.type === 'CONFIRM' ? 'Đã xác nhận chính xác' : 'Đã báo cáo sai sót'}</span><span className="text-[10px] opacity-70 font-mono bg-black/20 px-1.5 py-0.5 rounded">{myFeedback.timestamp}</span></div><p className="text-xs mt-1 opacity-90 italic">"{myFeedback.content || (myFeedback.type === 'CONFIRM' ? 'Không có ghi chú' : 'Nội dung báo lỗi')}"</p></div></div>)}</div>); })}</div>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'OVERTIME' && (
                             <div className="flex flex-col h-full"><div className="flex flex-col gap-3 mb-6"><div className="bg-gradient-to-r from-orange-900/40 to-red-900/40 border border-orange-500/50 p-3 rounded-lg flex items-center justify-between px-6 shadow-lg shadow-orange-900/20"><div className="flex items-center gap-2"><Clock size={18} className="text-orange-300"/><span className="text-xs font-bold text-orange-200 uppercase tracking-widest">Tổng Tăng Ca Tháng {viewMonth}/{viewYear}</span></div><span className="text-2xl font-black text-white font-mono">{Math.floor(workStats.totalOT)}h</span></div><div className="grid grid-cols-3 gap-3"><div className="bg-slate-800 p-3 rounded-lg border border-orange-500/30 flex flex-col items-center"><span className="text-[10px] text-orange-400 uppercase font-bold flex items-center gap-1 mb-1"><Sun size={12}/> TC Ngày</span><span className="text-lg font-bold text-white font-mono">{Math.floor(workStats.dayOT)}h</span></div><div className="bg-slate-800 p-3 rounded-lg border border-purple-500/30 flex flex-col items-center"><span className="text-[10px] text-purple-400 uppercase font-bold flex items-center gap-1 mb-1"><Moon size={12}/> TC Đêm</span><span className="text-lg font-bold text-white font-mono">{Math.floor(workStats.nightOT)}h</span></div><div className="bg-slate-800 p-3 rounded-lg border border-red-500/30 flex flex-col items-center"><span className="text-[10px] text-red-400 uppercase font-bold flex items-center gap-1 mb-1"><CalendarCheck size={12}/> TC CN</span><span className="text-lg font-bold text-white font-mono">{Math.floor(workStats.sundayOT)}h</span></div></div></div><div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden flex-1 flex flex-col"><div className="px-4 py-2 bg-slate-800 border-b border-slate-700 text-xs font-bold text-slate-400 uppercase flex items-center gap-2"><List size={14}/> Chi tiết ngày công (Có tăng ca)</div><div className="overflow-y-auto h-full custom-scrollbar flex-1"><table className="w-full text-sm text-left"><thead className="bg-slate-900 text-slate-500 text-xs font-bold uppercase sticky top-0 z-10"><tr><th className="px-4 py-3">Ngày</th><th className="px-4 py-3 text-center">Giờ Quẹt</th><th className="px-4 py-3 text-center">Tổng Giờ</th><th className="px-4 py-3 text-right">Tăng Ca</th></tr></thead><tbody className="divide-y divide-slate-700 text-slate-300">{workStats.sortedRecords.filter(r => calculateWorkHours(r.time) > 9 || new Date(r.date).getDay() === 0).length === 0 ? (<tr><td colSpan={4} className="p-8 text-center text-slate-500 italic text-xs">Không có dữ liệu tăng ca thực tế tháng này..</td></tr>) : (workStats.sortedRecords.filter(r => calculateWorkHours(r.time) > 9 || new Date(r.date).getDay() === 0).map(rec => { const hours = calculateWorkHours(rec.time); const isSunDay = new Date(rec.date).getDay() === 0; let ot = 0; if (isSunDay) { const p = rec.time.split('-').map(s=>s.trim()); if(p.length===2){ const [oH, oM] = p[1].split(':').map(Number); const oMin = (oH * 60 + oM) + (oH < 12 ? 1440 : 0); const s = rec.calculatedShift || staffInfo?.shift || 'DAY'; if(s==='DAY'){ if(oMin>=1170) ot=11; else if(oMin>=990) ot=8; else ot=Math.floor(hours); } else { if(oMin>=1890) ot=11; else if(oMin>=1710) ot=8; else ot=Math.floor(hours); } } else ot=Math.floor(hours); } else if(hours>9) ot=Math.floor(hours-9); return (<tr key={rec.id} className="hover:bg-slate-700/30"><td className="px-4 py-2 font-mono text-xs">{rec.date}{isSunDay && <span className="ml-2 text-[9px] bg-red-900/50 text-red-300 px-1 rounded border border-red-800 font-bold">CN</span>}</td><td className="px-4 py-2 text-center font-mono text-xs text-white">{rec.time}</td><td className="px-4 py-2 text-center font-bold">{hours}h</td><td className="px-4 py-2 text-right font-bold text-orange-400">+{ot}h</td></tr>); }))}</tbody></table></div></div></div>
                        )}

                        {activeTab === 'DOCS' && (
                             <div><h3 className="text-sm font-bold text-slate-400 uppercase mb-3 border-b border-slate-700 pb-1">Hợp Đồng Lao Động</h3>
                                 {myContracts.length === 0 ? (<div className="text-sm text-slate-500 italic">Bạn chưa có hợp đồng nào.</div>) : (
                                     <div className="grid gap-3">{myContracts.map(doc => (<div key={doc.id} className="flex items-center justify-between bg-slate-800 p-4 rounded-lg border border-slate-700 hover:border-indigo-500/50 transition-colors"><div className="flex items-center gap-3"><div className="p-2 bg-indigo-900/30 rounded text-indigo-500"><FileText size={20}/></div><div><div className="font-bold text-white">{doc.fileName}</div><div className="text-xs text-slate-500">Ngày tải: {doc.uploadDate}</div></div></div><div className="flex gap-2"><button onClick={() => window.open(doc.fileUrl, '_blank')} className="p-2 hover:bg-slate-700 rounded text-blue-400" title="Xem"><Eye size={18}/></button><button className="p-2 hover:bg-slate-700 rounded text-green-400" title="Tải về"><Download size={18}/></button></div></div>))}</div>
                                 )}
                             </div>
                        )}
                    </div>
                </div>
            </div>

            {/* MODALS */}
            {isConfirmModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-slate-900 rounded-xl shadow-2xl w-full max-w-md border border-slate-700"><div className="px-6 py-4 bg-green-700 text-white flex justify-between items-center rounded-t-xl"><h3 className="font-bold flex items-center gap-2"><MessageSquare size={20}/> XÁC NHẬN THÔNG TIN</h3><button onClick={() => setIsConfirmModalOpen(false)}><X size={20}/></button></div><div className="p-6"><label className="block text-sm font-bold text-slate-300 mb-2">Nội dung xác nhận (Tùy chọn):</label><textarea value={confirmContent} onChange={(e) => setConfirmContent(e.target.value)} className="w-full bg-slate-800 border border-slate-600 rounded-lg p-3 text-white text-sm focus:outline-none focus:border-green-500 resize-none h-24" placeholder="VD: Đã kiểm tra đầy đủ..."/><div className="mt-4 flex gap-3"><button onClick={submitConfirm} className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-2"><Send size={16}/> Gửi Xác Nhận</button><button onClick={() => setIsConfirmModalOpen(false)} className="px-4 bg-slate-700 hover:bg-slate-600 text-slate-300 font-bold py-2 rounded-lg transition-colors">Hủy</button></div></div></div>
                </div>
            )}

            {isReportModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-slate-900 rounded-xl shadow-2xl w-full max-w-md border border-slate-700"><div className="px-6 py-4 bg-red-700 text-white flex justify-between items-center rounded-t-xl"><h3 className="font-bold flex items-center gap-2"><AlertTriangle size={20}/> BÁO CÁO SAI SÓT</h3><button onClick={() => setIsReportModalOpen(false)}><X size={20}/></button></div><div className="p-6"><label className="block text-sm font-bold text-slate-300 mb-2">Nội dung sai sót:</label><textarea value={reportContent} onChange={(e) => setReportContent(e.target.value)} className="w-full bg-slate-800 border border-slate-600 rounded-lg p-3 text-white text-sm focus:outline-none focus:border-red-500 resize-none h-32" placeholder="Mô tả chi tiết sai sót..."/><div className="mt-4 flex gap-3"><button onClick={submitReport} disabled={!reportContent.trim()} className="flex-1 bg-red-600 hover:bg-red-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-2"><Send size={16}/> Gửi Báo Cáo</button><button onClick={() => setIsReportModalOpen(false)} className="px-4 bg-slate-700 hover:bg-slate-600 text-slate-300 font-bold py-2 rounded-lg transition-colors">Hủy</button></div></div></div>
                </div>
            )}

            {isCorrectionModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-slate-900 rounded-xl shadow-2xl w-full max-w-sm border border-slate-700"><div className="px-6 py-4 bg-blue-700 text-white flex justify-between items-center rounded-t-xl"><h3 className="font-bold flex items-center gap-2"><Edit2 size={20}/> XÁC NHẬN CÔNG</h3><button onClick={() => setIsCorrectionModalOpen(false)}><X size={20}/></button></div><div className="p-6 space-y-4"><div className="text-sm font-mono text-slate-400 text-center border-b border-slate-700 pb-2">Ngày: <span className="font-bold text-white">{correctionTarget?.date}</span></div><div><label className="block text-xs font-bold text-slate-400 uppercase mb-1">Giờ Vào (In Time)</label><input type="time" value={correctionForm.inTime} onChange={(e) => setCorrectionForm({...correctionForm, inTime: e.target.value})} className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white font-mono [color-scheme:dark] outline-none focus:border-blue-500"/></div><div><label className="block text-xs font-bold text-slate-400 uppercase mb-1">Giờ Ra (Out Time)</label><input type="time" value={correctionForm.outTime} onChange={(e) => setCorrectionForm({...correctionForm, outTime: e.target.value})} className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white font-mono [color-scheme:dark] outline-none focus:border-blue-500"/></div><div><label className="block text-xs font-bold text-slate-400 uppercase mb-1">Lý Do / Giải Trình</label><textarea value={correctionForm.reason} onChange={(e) => setCorrectionForm({...correctionForm, reason: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-white text-sm focus:outline-none focus:border-blue-500 resize-none h-20" placeholder="Lý do..." /></div><div className="pt-2 flex gap-3"><button onClick={submitCorrection} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded transition-colors flex items-center justify-center gap-2"><Send size={16}/> Gửi Yêu Cầu</button><button onClick={() => setIsCorrectionModalOpen(false)} className="px-4 bg-slate-700 hover:bg-slate-600 text-slate-300 font-bold py-2 rounded transition-colors">Hủy</button></div></div></div>
                </div>
            )}

            {isConfirmEditModalOpen && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-slate-900 rounded-xl shadow-2xl w-full max-w-sm border border-slate-700"><div className="px-6 py-4 bg-orange-700 text-white flex justify-between items-center rounded-t-xl"><h3 className="font-bold flex items-center gap-2 text-sm uppercase"><Edit2 size={18}/> Phản hồi sai sót bảng công</h3><button onClick={() => setIsConfirmEditModalOpen(false)}><X size={20}/></button></div><div className="p-6 space-y-4"><div className="text-sm font-mono text-slate-400 text-center border-b border-slate-700 pb-2">Ngày: <span className="font-black text-white">{confirmEditTarget?.day}</span></div><div><label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">Nội dung mô tả sai sót</label><textarea value={confirmEditFeedback} onChange={(e) => setConfirmEditFeedback(e.target.value)} className="w-full bg-slate-800 border border-slate-600 rounded-xl p-3 text-white text-sm focus:outline-none focus:border-orange-500 resize-none h-32 shadow-inner" placeholder="Mô tả lỗi sai..." /></div><div className="pt-2 flex gap-3"><button onClick={submitConfirmEdit} className="flex-1 bg-orange-600 hover:bg-orange-500 text-white font-black py-3 rounded-xl shadow-lg border-b-4 border-orange-800 flex items-center justify-center gap-2 transition-all active:scale-95"><Send size={16}/> Gửi Phản Hồi</button><button onClick={() => setIsConfirmEditModalOpen(false)} className="px-6 bg-slate-700 hover:bg-slate-600 text-slate-300 font-bold py-3 rounded-xl uppercase text-xs">Hủy</button></div></div></div>
                </div>
            )}
        </div>
    );
};
