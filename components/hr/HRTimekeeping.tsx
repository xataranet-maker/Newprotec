
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, Calendar, Filter, Clock, Save, FileSpreadsheet, CheckCircle2, AlertCircle, Thermometer, Upload, Download, CalendarDays, List, Grid3X3, ArrowRight, User, Hash, Layers, Sun, Moon, Briefcase, CalendarCheck, UserX, RefreshCcw, Link, Settings, Trash2, Plus, X, MessageSquare, Check, RotateCcw, Palmtree } from 'lucide-react';
import { TimekeepingRecord, StaffRecord, AttendanceLogRecord, AttendanceCorrectionRequest, AttendanceRecord, AttendanceStatus } from '../../types';
import * as XLSX from 'xlsx';
import { exportToExcel } from '../../services/excelService';

interface HRTimekeepingProps {
    data: TimekeepingRecord[];
    allStaff: StaffRecord[]; 
    onUpdate: (newData: TimekeepingRecord[]) => void;
    attendanceRequests?: AttendanceCorrectionRequest[];
    onUpdateRequest?: (updatedRequests: AttendanceCorrectionRequest[]) => void;
    attendanceHistory?: AttendanceRecord[]; // New Prop: Source of Truth
}

// Helper interface for processing
interface RawScanData {
    empId: string;
    dateStr: string; // YYYY-MM-DD
    timeStr: string; // HH:mm
    fullDate: Date;
    meta: any;
}

// Interface for Mapping
interface EmployeeMapping {
    id: number;
    excelId: string;    // Mã chấm công trên file Excel
    systemId: string;   // Mã nhân viên trên hệ thống
    fullName: string;   // Họ tên nhân viên
}

const DEPARTMENTS = [
    { id: 'MULTI', label: 'Multi Auto' },
    { id: 'STIFF', label: 'Stiff' },
    { id: 'MOLD', label: 'Khuôn & Jig' },
    { id: 'STAMPING', label: 'Dập Tự Động' },
];

const INITIAL_MAPPINGS: EmployeeMapping[] = [
    { id: 1, excelId: '2', systemId: 'V2407038', fullName: 'LÊ NGỌC THỦY' },
    { id: 2, excelId: '00000004', systemId: 'V2311006', fullName: 'NGUYỄN ĐĂNG NINH' },
    { id: 3, excelId: '00000010', systemId: 'V2502030', fullName: 'NGUYỄN VĂN QUÂN' },
    { id: 4, excelId: '00000006', systemId: 'V2502026', fullName: 'NGUYỄN THỊ THU HÀ' },
    { id: 5, excelId: '00000005', systemId: 'V2502014', fullName: 'GIÁP THỊ MAI' },
    { id: 6, excelId: '00000008', systemId: 'V2303011', fullName: 'VŨ ĐÌNH HÂN' },
    { id: 7, excelId: '00000009', systemId: 'V2502029', fullName: 'PHẠM ĐĂNG HƯỚNG' },
    { id: 8, excelId: '00000007', systemId: 'V2408025', fullName: 'MAI THỊ THỦY' },
];

// --- HELPER FUNCTIONS ---

const findKey = (row: any, candidates: string[]): string | undefined => {
    const keys = Object.keys(row);
    return keys.find(k => candidates.some(c => k.trim().toLowerCase() === c.toLowerCase()));
};

const excelDateToJSDate = (serial: number): Date => {
   return new Date(Math.round((serial - 25569) * 86400 * 1000));
};

const processExcelDate = (serial: any): string => {
    if (!serial) return new Date().toISOString().split('T')[0];
    if (typeof serial === 'number') {
        const date = excelDateToJSDate(serial);
        return date.toISOString().split('T')[0];
    }
    if (typeof serial === 'string') {
        if (serial.match(/^\d{4}-\d{2}-\d{2}/)) return serial.substring(0, 10);
        if (serial.includes('/')) {
            const parts = serial.split('/');
            if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`; 
        }
    }
    return String(serial).substring(0, 10);
};

const processExcelTime = (val: any): string => {
    if (!val) return '00:00';
    if (typeof val === 'number') {
        const totalSeconds = Math.round(val * 86400);
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }
    if (typeof val === 'string') {
         if (val.includes(':')) {
             const parts = val.split(':');
             return `${parts[0].padStart(2,'0')}:${parts[1].padStart(2,'0')}`;
         }
         return val;
    }
    return String(val);
};

const getPreviousDay = (dateStr: string): string => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    date.setDate(date.getDate() - 1);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

// Updated Logic to use Diary Status for special cases
const calculateWorkStats = (timeStr: string, dateStr: string, assignedShift: 'DAY' | 'NIGHT' = 'DAY', diaryStatus: AttendanceStatus = 'PRESENT') => {
    if (!timeStr || !timeStr.includes('-')) {
        // Special Handling for "Late In" (Ex 3)
        // If time string is single (e.g. "12:00") or incomplete but we have status from Diary
        // Actually the calling function passes formatted time string. If it's single "12:00", it usually fails here.
        // We handle single time logic before calling this mostly, or inside here if format is "12:00 - ".
        // But standard format from previous steps is "HH:mm - HH:mm" or "Thiếu..."
        
        // However, if we have single time like "12:00" passed in
        if (timeStr && !timeStr.includes('-') && !timeStr.includes('Thiếu')) {
             if (diaryStatus === 'Đi muộn') {
                 // Treat as IN time
                 return { in: timeStr, out: '', basic: 0, dayOT: 0, nightOT: 0, sundayOT: 0, isFull: false, displayBasic: '0h', shift: assignedShift, swapped: false };
             }
             if (diaryStatus === 'Về sớm') {
                 // Treat as OUT time
                 return { in: '', out: timeStr, basic: 0, dayOT: 0, nightOT: 0, sundayOT: 0, isFull: false, displayBasic: '0h', shift: assignedShift, swapped: false };
             }
        }
        return { in: '', out: '', basic: 0, dayOT: 0, nightOT: 0, sundayOT: 0, isFull: false, displayBasic: '-', shift: assignedShift, swapped: false };
    }

    const parts = timeStr.split('-').map(s => s.trim());
    let inTimeStr = parts[0];
    let outTimeStr = parts[1] || '';
    let swapped = false;

    // Handle "Missing" cases
    if (inTimeStr.includes('Thiếu') || outTimeStr.includes('Thiếu') || !inTimeStr || !outTimeStr) {
         return { in: inTimeStr, out: outTimeStr, basic: 0, dayOT: 0, nightOT: 0, sundayOT: 0, isFull: false, displayBasic: 'Lỗi', shift: assignedShift, swapped: false };
    }

    let [inH, inM] = inTimeStr.split(':').map(Number);
    let [outH, outM] = outTimeStr.split(':').map(Number);
    
    if (isNaN(inH) || isNaN(outH)) return { in: inTimeStr, out: outTimeStr, basic: 0, dayOT: 0, nightOT: 0, sundayOT: 0, isFull: false, displayBasic: 'Lỗi', shift: assignedShift, swapped: false };

    // --- NIGHT SHIFT SWAP LOGIC (Ex 2 handled by shift context) ---
    if (assignedShift === 'NIGHT') {
        if (inH < 12 && outH > 16) {
            const tempStr = inTimeStr;
            inTimeStr = outTimeStr;
            outTimeStr = tempStr;
            swapped = true;
            // Update numeric values for calc
            [inH, inM] = inTimeStr.split(':').map(Number);
            [outH, outM] = outTimeStr.split(':').map(Number);
        }
    }

    const inMin = inH * 60 + inM;
    let outMin = outH * 60 + outM;

    // Handle Overnight calculation
    if (outMin < inMin) {
        outMin += 1440; // Add 24h
    }

    // --- APPLIED ROUNDING LOGIC (Làm tròn số) ---
    let effectiveIn = inMin;
    let effectiveOut = outMin;

    if (assignedShift === 'DAY') {
        const startThreshold = 8 * 60; 
        const endCapThreshold = 20 * 60 + 29; 
        const endCapTarget = 20 * 60; 

        if (effectiveIn < startThreshold) effectiveIn = startThreshold;
        if (effectiveOut > endCapThreshold) effectiveOut = endCapTarget;
    } else { // NIGHT
        const startThreshold = 20 * 60; 
        const endCapThreshold = 8 * 60 + 29 + 1440; 
        const endCapTarget = 8 * 60 + 1440; 

        if (effectiveIn < startThreshold) effectiveIn = startThreshold;
        if (effectiveOut > endCapThreshold) effectiveOut = endCapTarget;
    }

    let stdStart = 0;
    let stdEnd = 0;

    if (assignedShift === 'DAY') {
        stdStart = 8 * 60;       
        stdEnd = 17 * 60;        
    } else {
        stdStart = 20 * 60;      
        stdEnd = 5 * 60 + 1440;  
    }

    const actualStart = Math.max(effectiveIn, stdStart);
    const actualEnd = Math.min(effectiveOut, stdEnd);
    let basicHours = 0;

    if (actualEnd > actualStart) {
        basicHours = (actualEnd - actualStart) / 60;
    }

    let isFull = false;
    let displayBasic = '0h';

    // Tolerance check
    if (effectiveIn <= stdStart && effectiveOut >= stdEnd) {
        isFull = true;
        basicHours = 8;
        displayBasic = "Đủ công";
    } else {
        if (basicHours > 8) basicHours = 8;
        basicHours = parseFloat(basicHours.toFixed(1));
        displayBasic = `${basicHours}h`;
    }

    // OT Calculation
    let otMinutes = 0;
    if (effectiveOut > stdEnd) {
        otMinutes = effectiveOut - stdEnd;
    }
    const otHours = Math.floor(otMinutes / 60);

    let dayOT = 0;
    let nightOT = 0;
    let sundayOT = 0;

    let isSunday = false;
    let isHoliday = diaryStatus === 'Nghỉ lễ';

    if (dateStr) {
        const [y, m, d] = dateStr.split('-').map(Number);
        const dateObj = new Date(y, m - 1, d);
        isSunday = dateObj.getDay() === 0;
    }

    // --- LOGIC TÍNH CÔNG CHỦ NHẬT / LỄ (CẬP NHẬT) ---
    if (isSunday || isHoliday) {
        // Logic gán cứng theo giờ ra
        if (assignedShift === 'DAY') {
             // Ca Ngày:
             // Ra >= 20:00 (1200 min) -> 11 tiếng
             // Ra >= 17:00 (1020 min) -> 8 tiếng
             // Threshold: 19:30 (1170) và 16:30 (990) để bù trừ
             if (effectiveOut >= 1170) {
                 sundayOT = 11;
             } else if (effectiveOut >= 990) {
                 sundayOT = 8;
             } else {
                 // Nếu về sớm hơn 17:00 thì tính thực tế
                 sundayOT = Math.floor((effectiveOut - effectiveIn) / 60);
             }
        } else {
             // Ca Đêm:
             // Ra >= 08:00 sáng hôm sau (8*60 + 1440 = 1920 min) -> 11 tiếng
             // Ra >= 05:00 sáng hôm sau (5*60 + 1440 = 1740 min) -> 8 tiếng
             // Threshold: 07:30 (1890) và 04:30 (1710)
             if (effectiveOut >= 1890) {
                 sundayOT = 11;
             } else if (effectiveOut >= 1710) {
                 sundayOT = 8;
             } else {
                 sundayOT = Math.floor((effectiveOut - effectiveIn) / 60);
             }
        }

        basicHours = 0;
        displayBasic = isHoliday ? "LỄ" : "CN";
        isFull = false;
    } else {
        if (assignedShift === 'DAY') dayOT = otHours;
        else nightOT = otHours;
    }

    return { in: inTimeStr, out: outTimeStr, basic: basicHours, dayOT, nightOT, sundayOT, isFull, displayBasic, shift: assignedShift, swapped };
};

const getDayOfWeek = (year: number, month: number, day: number) => {
    const date = new Date(year, month, day);
    const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    return days[date.getDay()];
};

const formatDateDDMMMYY = (isoDate: string): string => {
    if (!isoDate) return '';
    const parts = isoDate.split('-');
    if (parts.length !== 3) return isoDate;
    const [y, m, d] = parts;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthIndex = parseInt(m) - 1;
    if (monthIndex < 0 || monthIndex > 11) return isoDate;
    return `${d}-${months[monthIndex]}-${y.slice(-2)}`;
};

export const HRTimekeeping: React.FC<HRTimekeepingProps> = ({ 
    data, 
    allStaff, 
    onUpdate,
    attendanceRequests = [],
    onUpdateRequest,
    attendanceHistory = [] // DIARY DATA (Source of Truth)
}) => {
    const [viewMode, setViewMode] = useState<'DAILY' | 'MONTHLY' | 'REQUESTS'>('DAILY');
    const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [searchTerm, setSearchTerm] = useState('');
    const [filterDept, setFilterDept] = useState('ALL');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isReevaluating, setIsReevaluating] = useState(false);

    const [isMappingModalOpen, setIsMappingModalOpen] = useState(false);
    const [mappings, setMappings] = useState<EmployeeMapping[]>([]);
    const [newMapping, setNewMapping] = useState({ excelId: '', systemId: '', fullName: '' });

    // Load Mappings
    useEffect(() => {
        const savedMappings = localStorage.getItem('hr_employee_mappings');
        if (savedMappings) {
            try { setMappings(JSON.parse(savedMappings)); } catch (e) { console.error("Error loading mappings", e); }
        } else { setMappings(INITIAL_MAPPINGS); }
    }, []);

    useEffect(() => { localStorage.setItem('hr_employee_mappings', JSON.stringify(mappings)); }, [mappings]);

    // --- HELPER TO GET DIARY INFO ---
    const getDiaryInfo = (empId: string, dateStr: string) => {
        return attendanceHistory.find(r => r.employeeId === empId && r.date === dateStr);
    };

    // --- MAPPING ACTIONS ---
    const handleAddMapping = () => {
        if (!newMapping.excelId || !newMapping.systemId) { alert("Vui lòng nhập Mã Excel và chọn Mã Hệ thống."); return; }
        if (mappings.some(m => m.excelId === newMapping.excelId)) { alert("Mã chấm công này đã tồn tại trong danh sách mapping."); return; }
        const selectedStaff = allStaff.find(s => s.employeeId === newMapping.systemId);
        setMappings(prev => [...prev, { id: Date.now(), excelId: newMapping.excelId, systemId: newMapping.systemId, fullName: selectedStaff ? selectedStaff.fullName : newMapping.fullName }]);
        setNewMapping({ excelId: '', systemId: '', fullName: '' });
    };
    const handleDeleteMapping = (id: number) => { setMappings(prev => prev.filter(m => m.id !== id)); };
    const handleSystemIdChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const sysId = e.target.value;
        const staff = allStaff.find(s => s.employeeId === sysId);
        setNewMapping(prev => ({ ...prev, systemId: sysId, fullName: staff ? staff.fullName : '' }));
    };

    // --- RE-EVALUATE LOGIC ---
    const handleReevaluate = () => {
        setIsReevaluating(true);
        const updatedData = data.map(record => {
            const diaryEntry = getDiaryInfo(record.employeeId, record.date);
            const shift = diaryEntry ? diaryEntry.shift : (record.calculatedShift || 'DAY');
            const stats = calculateWorkStats(record.time, record.date, shift, diaryEntry?.status);
            const newTimeString = stats.swapped ? `${stats.in} - ${stats.out}` : record.time;

            return {
                ...record,
                calculatedShift: shift,
                time: newTimeString,
                attendanceStatus: stats.isFull ? 'Đủ công' : (record.attendanceStatus.includes('Thiếu') ? record.attendanceStatus : `${stats.basic}h`),
            };
        });
        onUpdate(updatedData);
        setTimeout(() => setIsReevaluating(false), 500);
    };

    // --- REQUEST HANDLING ---
    const pendingRequests = useMemo(() => attendanceRequests.filter(r => r.status === 'PENDING').sort((a,b) => b.id - a.id), [attendanceRequests]);

    const handleApproveRequest = (req: AttendanceCorrectionRequest) => {
        if (!onUpdateRequest) return;
        const updatedRequests = attendanceRequests.map(r => r.id === req.id ? { ...r, status: 'APPROVED' as const, adminResponse: 'Đã duyệt' } : r);
        onUpdateRequest(updatedRequests);

        const existingRecord = data.find(r => r.employeeId === req.employeeId && r.date === req.date);
        const staff = allStaff.find(s => s.employeeId === req.employeeId);
        const diaryEntry = getDiaryInfo(req.employeeId, req.date);
        
        const newTime = `${req.inTime} - ${req.outTime}`;
        const shift = diaryEntry ? diaryEntry.shift : (existingRecord ? existingRecord.calculatedShift || staff?.shift || 'DAY' : staff?.shift || 'DAY');
        
        const stats = calculateWorkStats(newTime, req.date, shift, diaryEntry?.status);
        const newStatus = stats.isFull ? 'Đủ công' : `${stats.basic}h (Đã sửa)`;

        if (existingRecord) {
            const updatedData = data.map(r => r.id === existingRecord.id ? { ...r, time: newTime, attendanceStatus: newStatus, source: 'HR Adjusted', abnormal: 'Đã sửa tay' } : r);
            onUpdate(updatedData);
        } else {
            const newRecord: TimekeepingRecord = {
                id: Date.now(), employeeId: req.employeeId, fullName: req.fullName, department: staff?.department || 'UNKNOWN',
                date: req.date, time: newTime, attendanceStatus: newStatus, checkPoints: 0, source: 'HR Adjusted', processType: 'Thủ công', abnormal: 'Bổ sung tay', calculatedShift: shift
            };
            onUpdate([...data, newRecord]);
        }
        alert(`Đã duyệt yêu cầu của ${req.fullName} ngày ${req.date}`);
    };

    const handleRejectRequest = (req: AttendanceCorrectionRequest) => {
        if (!onUpdateRequest) return;
        const updatedRequests = attendanceRequests.map(r => r.id === req.id ? { ...r, status: 'CHECKING' as const, adminResponse: 'Vui lòng kiểm tra lại thông tin.' } : r);
        onUpdateRequest(updatedRequests);
        alert(`Đã yêu cầu ${req.fullName} kiểm tra lại.`);
    };

    // --- DAILY FILTER LOGIC ---
    const filteredDataDaily = useMemo(() => {
        return data.filter(record => {
            const matchesDate = record.date === selectedDate;
            const matchesSearch = record.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || record.employeeId.toLowerCase().includes(searchTerm.toLowerCase()) || (record.customName && record.customName.toLowerCase().includes(searchTerm.toLowerCase()));
            const matchesDept = filterDept === 'ALL' || record.department === filterDept;
            return (searchTerm ? matchesSearch && matchesDept : matchesDate && matchesDept);
        });
    }, [data, selectedDate, searchTerm, filterDept]);

    // --- MONTHLY DATA LOGIC ---
    const monthlyData = useMemo(() => {
        if (viewMode !== 'MONTHLY') return { days: [], staffRows: [] };

        const [yearStr, monthStr] = selectedMonth.split('-');
        const year = parseInt(yearStr);
        const month = parseInt(monthStr) - 1; 
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

        const allStaffMap = new Map<string, StaffRecord>();
        allStaff.forEach(s => allStaffMap.set(s.employeeId, s));
        const dataStaffIds = new Set<string>();
        data.forEach(d => {
             const [rYear, rMonth] = d.date.split('-').map(Number);
             if (rYear === year && rMonth === (month + 1)) dataStaffIds.add(d.employeeId);
        });
        const combinedIds = new Set([...Array.from(allStaffMap.keys()), ...Array.from(dataStaffIds)]);

        const filteredStaff = Array.from(combinedIds).map(id => {
             const staff = allStaffMap.get(id) || {
                 id: 0, employeeId: id, fullName: data.find(d => d.employeeId === id)?.fullName || 'Unknown',
                 department: data.find(d => d.employeeId === id)?.department || 'UNKNOWN', position: '', phone: '', hometown: '', dateJoined: '', dob: '', shift: 'DAY', attendance: 'UNMARKED'
             } as StaffRecord;
             return staff;
        }).filter(s => {
             const matchesSearch = s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || s.employeeId.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesDept = filterDept === 'ALL' || s.department === filterDept;
            return matchesSearch && matchesDept;
        });

        const staffRows = filteredStaff.map(staff => {
            const dayRecords: Record<number, any> = {};
            let totalBasic = 0, totalDayOT = 0, totalNightOT = 0, totalSundayOT = 0, totalDaysWorked = 0;

            for (let d = 1; d <= daysInMonth; d++) {
                const currentDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                const record = data.find(r => r.employeeId === staff.employeeId && r.date === currentDateStr);
                const diaryEntry = getDiaryInfo(staff.employeeId, currentDateStr);
                const loggedShift = diaryEntry ? diaryEntry.shift : staff.shift;
                const diaryStatus = diaryEntry ? diaryEntry.status : 'PRESENT';
                
                if (record) {
                    const stats = calculateWorkStats(record.time, record.date, loggedShift, diaryStatus);
                    dayRecords[d] = { ...record, stats, displayTime: stats.swapped ? `${stats.in}-${stats.out}` : record.time };
                    totalBasic += stats.basic; totalDayOT += stats.dayOT; totalNightOT += stats.nightOT; totalSundayOT += stats.sundayOT;
                    if (stats.basic > 0 || stats.dayOT > 0 || stats.nightOT > 0 || stats.sundayOT > 0) totalDaysWorked++;
                } else {
                    dayRecords[d] = { stats: { shift: loggedShift, displayBasic: '-' } };
                }
            }
            return { staff, days: dayRecords, totals: { basic: totalBasic, dayOT: totalDayOT, nightOT: totalNightOT, sundayOT: totalSundayOT, daysWorked: totalDaysWorked } };
        });

        return { days, staffRows: staffRows.sort((a, b) => a.staff.fullName.localeCompare(b.staff.fullName)) };
    }, [data, allStaff, selectedMonth, viewMode, searchTerm, filterDept, attendanceHistory]);

    const handleImportClick = () => { if (fileInputRef.current) { fileInputRef.current.value = ''; fileInputRef.current.click(); } };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                
                const jsonData = XLSX.utils.sheet_to_json(ws, { defval: '' });
                
                if (jsonData.length === 0) { alert("File Excel không có dữ liệu."); return; }

                const rawScans: RawScanData[] = [];
                const staffLookup = new Map<string, StaffRecord>();
                allStaff.forEach(s => staffLookup.set(s.employeeId, s));
                
                const mappingLookup = new Map<string, EmployeeMapping>();
                mappings.forEach(m => mappingLookup.set(m.excelId, m));

                jsonData.forEach((row: any) => {
                    const timeKey = findKey(row, ['Thời gian', 'Time', 'CheckTime', 'Date/Time']);
                    const idKey = findKey(row, ['ID Người', 'ID', 'Mã NV', 'User ID', 'No.', 'Mã chấm công']);
                    const nameKey = findKey(row, ['Tên', 'Name']);
                    const deptKey = findKey(row, ['Bộ phận', 'Department']);
                    const statusKey = findKey(row, ['Status']);
                    const pointsKey = findKey(row, ['Points']);
                    const tempKey = findKey(row, ['Temperature']);
                    
                    let rawId = idKey ? String(row[idKey] || '').replace(/'/g, '').trim() : '';
                    if (!rawId) return;

                    let finalId = rawId;
                    let finalName = nameKey ? row[nameKey] : '';
                    
                    if (mappingLookup.has(rawId)) {
                        const mapped = mappingLookup.get(rawId)!;
                        finalId = mapped.systemId;
                        finalName = mapped.fullName;
                    }

                    let rawTimeVal = timeKey ? row[timeKey] : '';
                    if (!rawTimeVal) {
                        const dateKey = findKey(row, ['Ngày', 'Date']);
                        const specificTimeKey = findKey(row, ['Giờ', 'Time Only']);
                        if (dateKey && specificTimeKey) {
                             const d = processExcelDate(row[dateKey]);
                             const t = processExcelTime(row[specificTimeKey]);
                             rawTimeVal = `${d} ${t}`;
                        }
                    }
                    if (!rawTimeVal) return;

                    let dateObj: Date | null = null;
                    if (typeof rawTimeVal === 'number') dateObj = excelDateToJSDate(rawTimeVal);
                    else {
                        const dateTimeStr = String(rawTimeVal).trim();
                        if (dateTimeStr.match(/^\d{4}-\d{2}-\d{2}/)) dateObj = new Date(dateTimeStr.replace(' ', 'T'));
                        else if (dateTimeStr.includes('/')) {
                             const [dStr, tStr] = dateTimeStr.split(' ');
                             if (dStr && tStr) {
                                 const [day, month, year] = dStr.split('/').map(Number);
                                 const [hr, min] = tStr.split(':').map(Number);
                                 dateObj = new Date(year, month - 1, day, hr, min);
                             }
                        }
                    }

                    if (dateObj && !isNaN(dateObj.getTime())) {
                        const y = dateObj.getFullYear();
                        const m = String(dateObj.getMonth() + 1).padStart(2, '0');
                        const d = String(dateObj.getDate()).padStart(2, '0');
                        const hh = String(dateObj.getHours()).padStart(2, '0');
                        const mm = String(dateObj.getMinutes()).padStart(2, '0');

                        rawScans.push({
                            empId: finalId, 
                            dateStr: `${y}-${m}-${d}`,
                            timeStr: `${hh}:${mm}`,
                            fullDate: dateObj,
                            meta: { name: finalName, dept: deptKey ? row[deptKey] : '', attendanceStatus: statusKey ? row[statusKey] : '', checkPoints: pointsKey ? (parseFloat(row[pointsKey]) || 0) : 0, temperature: tempKey ? (parseFloat(row[tempKey]) || 36.5) : 36.5 }
                        });
                    }
                });

                // 2. LOGIC GỘP DỮ LIỆU & XỬ LÝ CA ĐÊM (CỐT LÕI)
                const groupedRecords = new Map<string, { empId: string, date: string, times: string[], staff: StaffRecord | undefined, meta: any, shift: 'DAY' | 'NIGHT', diaryStatus: AttendanceStatus }>();

                rawScans.forEach(scan => {
                    const staff = staffLookup.get(scan.empId);
                    
                    // --- KEY LOGIC CHANGE: Determine correct date/shift using Diary ---
                    let logicalDate = scan.dateStr;
                    let targetShift: 'DAY' | 'NIGHT' = 'DAY';
                    let targetStatus: AttendanceStatus = 'PRESENT';

                    const previousDayStr = getPreviousDay(scan.dateStr);
                    const diaryYesterday = getDiaryInfo(scan.empId, previousDayStr);
                    const diaryToday = getDiaryInfo(scan.empId, scan.dateStr);

                    const hour = scan.fullDate.getHours();

                    // CASE 1: Ex 1 - Early morning scan, check if yesterday was Night Shift
                    if (hour < 14 && diaryYesterday?.shift === 'NIGHT') {
                        logicalDate = previousDayStr;
                        targetShift = 'NIGHT';
                        targetStatus = diaryYesterday.status;
                    } 
                    // CASE 2: Normal/Other cases
                    else {
                        targetShift = diaryToday ? diaryToday.shift : (staff ? staff.shift : 'DAY');
                        targetStatus = diaryToday ? diaryToday.status : 'PRESENT';
                    }

                    const key = `${scan.empId}_${logicalDate}`;
                    
                    if (!groupedRecords.has(key)) {
                        groupedRecords.set(key, { empId: scan.empId, date: logicalDate, times: [], staff: staff, meta: scan.meta, shift: targetShift, diaryStatus: targetStatus });
                    }
                    groupedRecords.get(key)!.times.push(scan.timeStr);
                });

                const newRecords: TimekeepingRecord[] = [];

                groupedRecords.forEach((group) => {
                    group.times.sort();
                    
                    // Debounce logic (10 mins)
                    const validTimes: string[] = [];
                    if (group.times.length > 0) {
                        validTimes.push(group.times[0]);
                        const parseMinutes = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
                        let lastVal = parseMinutes(group.times[0]);
                        for (let i = 1; i < group.times.length; i++) {
                            const currentStr = group.times[i];
                            const currVal = parseMinutes(currentStr);
                            if (Math.abs(currVal - lastVal) > 10) { 
                                validTimes.push(currentStr);
                                lastVal = currVal;
                            }
                        }
                    }
                    
                    const finalTimes = validTimes;
                    
                    let inTime = '';
                    let outTime = '';
                    let displayTime = '';
                    let attendanceStatus = '';
                    
                    // Use the Shift & Status derived from Diary logic
                    const dailyShift = group.shift;
                    const diaryStatus = group.diaryStatus;

                    if (finalTimes.length === 1) {
                         const singleTime = finalTimes[0];
                         const [h] = singleTime.split(':').map(Number);
                         
                         // Ex 3 Logic: Late In / Early Out
                         if (diaryStatus === 'Đi muộn') {
                             inTime = singleTime;
                             displayTime = `${inTime} - Thiếu ra`;
                             attendanceStatus = 'Thiếu giờ ra (Đi muộn)';
                         } else if (diaryStatus === 'Về sớm') {
                             outTime = singleTime;
                             displayTime = `Thiếu vào - ${outTime}`;
                             attendanceStatus = 'Thiếu giờ vào (Về sớm)';
                         } else {
                             // Standard missing logic
                             if (dailyShift === 'NIGHT') {
                                 if (h < 14) { outTime = singleTime; displayTime = `Thiếu vào - ${outTime}`; attendanceStatus = 'Thiếu giờ vào'; } 
                                 else { inTime = singleTime; displayTime = `${inTime} - Thiếu ra`; attendanceStatus = 'Thiếu giờ ra'; }
                             } else {
                                 if (h < 12) { inTime = singleTime; displayTime = `${inTime} - Thiếu ra`; attendanceStatus = 'Thiếu giờ ra'; } 
                                 else { outTime = singleTime; displayTime = `Thiếu vào - ${outTime}`; attendanceStatus = 'Thiếu giờ vào'; }
                             }
                         }
                    } else {
                        inTime = finalTimes[0];
                        outTime = finalTimes[finalTimes.length - 1];
                        const [inH] = inTime.split(':').map(Number);
                        const [outH] = outTime.split(':').map(Number);
                        if (dailyShift === 'NIGHT' && inH < 12 && outH > 16) displayTime = `${outTime} - ${inTime}`; 
                        else displayTime = `${inTime} - ${outTime}`;
                        attendanceStatus = 'Đủ công';
                    }

                    newRecords.push({
                        id: Date.now() + Math.random(),
                        employeeId: group.empId,
                        fullName: group.staff?.fullName || group.meta.name || 'Unknown',
                        department: group.staff?.department || group.meta.dept || 'UNKNOWN',
                        date: group.date,
                        time: displayTime,
                        attendanceStatus: attendanceStatus,
                        checkPoints: group.meta.checkPoints,
                        customName: '',
                        source: 'Excel Import',
                        processType: 'Tự động',
                        temperature: group.meta.temperature,
                        abnormal: 'Không',
                        calculatedShift: dailyShift
                    });
                });

                if (newRecords.length === 0) { alert("Không có dữ liệu hợp lệ."); return; }

                const existingKeys = new Set(data.map(r => `${r.employeeId}_${r.date}`));
                const incomingKeys = new Set(newRecords.map(r => `${r.employeeId}_${r.date}`));
                
                let shouldOverwrite = false;
                for (const r of newRecords) { if (existingKeys.has(`${r.employeeId}_${r.date}`)) { shouldOverwrite = true; break; } }

                if (shouldOverwrite) {
                    if (window.confirm("Dữ liệu chấm công cho các ngày này đã tồn tại. Bạn có muốn ghi đè không?")) {
                         const cleanOld = data.filter(r => !incomingKeys.has(`${r.employeeId}_${r.date}`));
                         onUpdate([...cleanOld, ...newRecords]);
                         alert(`Đã cập nhật ${newRecords.length} bản ghi.`);
                    }
                } else {
                    onUpdate([...data, ...newRecords]);
                    alert(`Đã thêm ${newRecords.length} bản ghi mới.`);
                }
                
                if (newRecords.length > 0) setSelectedDate(newRecords[0].date);

            } catch (error) { console.error("Lỗi đọc file Excel:", error); alert("Đã xảy ra lỗi khi đọc file Excel."); }
        };
        reader.readAsBinaryString(file);
    };

    const handleExportExcel = () => {
        if (viewMode === 'DAILY') {
             if (filteredDataDaily.length === 0) { alert("Không có dữ liệu nào để xuất."); return; }
            const headers = ["STT", "ID Người", "Tên", "Bộ phận", "Ngày", "Thời gian", "Tình trạng", "Ca (HT)", "Điểm", "Nhiệt độ"];
            const rows = filteredDataDaily.map((record, index) => {
                const diary = getDiaryInfo(record.employeeId, record.date);
                const shift = diary ? diary.shift : (record.calculatedShift || 'DAY');
                return [index + 1, record.employeeId, record.fullName, record.department, formatDateDDMMMYY(record.date), record.time, record.attendanceStatus, shift === 'NIGHT' ? 'Đêm' : 'Ngày', record.checkPoints, record.temperature];
            });
            exportToExcel([headers, ...rows], `DuLieuCong_${selectedDate}`);
        } else { alert("Chức năng xuất báo cáo tháng đang phát triển."); }
    };

    const [yearStr, monthStr] = selectedMonth.split('-');
    const currentYearInt = parseInt(yearStr);
    const currentMonthInt = parseInt(monthStr) - 1;

    return (
        <div className="flex flex-col h-full bg-slate-900 text-slate-300 p-6 font-sans overflow-hidden relative">
            <div className="mb-6 flex flex-col md:flex-row justify-between items-center gap-4 shrink-0">
                <div><h2 className="text-2xl font-bold text-white flex items-center gap-3"><Clock className="text-orange-500" size={32}/>QUẢN LÝ DỮ LIỆU CÔNG</h2><p className="text-slate-400 mt-1 text-sm">Theo dõi chấm công, ra vào và tính giờ làm việc (Đồng bộ danh sách nhân viên & Nhật ký điểm danh)</p></div>
                <div className="flex items-center gap-4">
                    <div className="bg-slate-800 p-1 rounded-lg border border-slate-700 flex gap-1"><button onClick={() => setViewMode('DAILY')} className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-bold transition-colors ${viewMode === 'DAILY' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}><List size={14}/> Theo Ngày</button><button onClick={() => setViewMode('MONTHLY')} className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-bold transition-colors ${viewMode === 'MONTHLY' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}><Grid3X3 size={14}/> Bảng Công Tháng</button><button onClick={() => setViewMode('REQUESTS')} className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-bold transition-colors ${viewMode === 'REQUESTS' ? 'bg-orange-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}><MessageSquare size={14}/> Yêu Cầu ({pendingRequests.length})</button></div>
                    {viewMode !== 'REQUESTS' && (<div className="flex items-center gap-2 bg-slate-800 p-2 rounded-lg border border-slate-700 shadow-lg"><span className="text-xs font-bold text-slate-400 px-2 uppercase">{viewMode === 'DAILY' ? 'Ngày dữ liệu:' : 'Tháng dữ liệu:'}</span><div className="flex items-center gap-2 bg-slate-900 border border-slate-600 rounded px-3 py-1.5"><Calendar size={16} className="text-orange-500"/>{viewMode === 'DAILY' ? (<input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="bg-transparent border-none text-sm font-bold text-white focus:outline-none [color-scheme:dark]"/>) : (<input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="bg-transparent border-none text-sm font-bold text-white focus:outline-none [color-scheme:dark]"/>)}</div></div>)}
                </div>
            </div>

            {viewMode !== 'REQUESTS' && (
                <div className="bg-slate-800 p-3 rounded-lg shadow-sm border border-slate-700 flex flex-wrap gap-4 items-center justify-between mb-4 shrink-0">
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} /><input type="text" placeholder="Tìm ID, Tên..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-1.5 text-sm bg-slate-900 border border-slate-600 rounded-md focus:ring-1 focus:ring-orange-500 focus:outline-none text-white placeholder-slate-600"/></div>
                        <div className="flex items-center gap-2"><Filter size={16} className="text-slate-500" /><select className="bg-slate-900 border border-slate-600 rounded-md px-2 py-1.5 text-sm focus:ring-1 focus:ring-orange-500 focus:outline-none text-white" value={filterDept} onChange={(e) => setFilterDept(e.target.value)}><option value="ALL">Tất cả bộ phận</option>{DEPARTMENTS.map(d => (<option key={d.id} value={d.id}>{d.label}</option>))}</select></div>
                        <button onClick={handleReevaluate} disabled={isReevaluating} className="flex items-center gap-1 px-3 py-1.5 bg-indigo-700 hover:bg-indigo-600 text-white text-xs font-bold rounded shadow-sm transition-colors border border-indigo-600 disabled:opacity-50" title="Cập nhật lại dữ liệu dựa trên nhật ký mới nhất"><RefreshCcw size={14} className={isReevaluating ? 'animate-spin' : ''}/> Cập nhật logic</button>
                    </div>
                    <div className="flex gap-2"><input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".xlsx, .xls, .csv" className="hidden" /><button onClick={handleImportClick} className="flex items-center gap-1 px-3 py-1.5 bg-green-700 hover:bg-green-600 text-white text-xs font-bold rounded shadow-sm transition-colors border border-green-600"><Upload size={14} /> Nhập Excel</button><button onClick={handleExportExcel} className="flex items-center gap-1 px-3 py-1.5 bg-blue-700 hover:bg-blue-600 text-white text-xs font-bold rounded shadow-sm transition-colors border border-blue-600"><Download size={14} /> Xuất Excel</button><button onClick={() => setIsMappingModalOpen(true)} className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded shadow-sm transition-colors"><Link size={14} /> Dữ liệu nguồn (Mapping)</button><button className="flex items-center gap-1 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold rounded shadow-sm transition-colors border border-slate-600"><Save size={14} /> Lưu Thay Đổi</button></div>
                </div>
            )}

            <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden shadow-lg flex-1 flex flex-col relative">
                {viewMode === 'REQUESTS' && (
                    <div className="flex-1 overflow-auto p-0 bg-slate-900/50">
                        {pendingRequests.length === 0 ? (<div className="h-full flex flex-col items-center justify-center text-slate-500 italic"><CheckCircle2 size={48} className="opacity-20 mb-2"/><span>Hiện không có yêu cầu chỉnh sửa nào cần duyệt.</span></div>) : (
                            <table className="w-full text-sm text-left border-collapse"><thead className="text-xs text-slate-400 uppercase bg-slate-800 sticky top-0 z-10 font-bold border-b border-slate-700"><tr><th className="px-4 py-3">Mã NV</th><th className="px-4 py-3">Họ Tên</th><th className="px-4 py-3 text-center">Ngày</th><th className="px-4 py-3 text-center">Giờ Đăng Ký</th><th className="px-4 py-3">Lý Do</th><th className="px-4 py-3 text-center w-[200px]">Thao Tác</th></tr></thead><tbody className="divide-y divide-slate-700 text-slate-300">{pendingRequests.map(req => (<tr key={req.id} className="hover:bg-slate-700/30"><td className="px-4 py-3 font-mono font-bold text-blue-400">{req.employeeId}</td><td className="px-4 py-3 font-bold text-white">{req.fullName}</td><td className="px-4 py-3 font-mono text-center">{req.date}</td><td className="px-4 py-3 font-mono text-center text-yellow-400 font-bold">{req.inTime} - {req.outTime}</td><td className="px-4 py-3 italic text-slate-400">{req.reason}</td><td className="px-4 py-3 text-center"><div className="flex gap-2 justify-center"><button onClick={() => handleApproveRequest(req)} className="px-3 py-1.5 bg-green-700 hover:bg-green-600 text-white rounded font-bold text-xs flex items-center gap-1 transition-colors"><Check size={14}/> Duyệt</button><button onClick={() => handleRejectRequest(req)} className="px-3 py-1.5 bg-orange-700 hover:bg-orange-600 text-white rounded font-bold text-xs flex items-center gap-1 transition-colors"><RotateCcw size={14}/> KT Lại</button></div></td></tr>))}</tbody></table>
                        )}
                    </div>
                )}
                {viewMode === 'DAILY' && (
                    <div className="overflow-auto flex-1 custom-scrollbar w-full">
                        <table className="w-full text-sm text-left border-collapse">
                            <thead className="text-xs text-slate-400 uppercase bg-slate-900 sticky top-0 z-10 font-bold font-mono"><tr><th className="px-4 py-3 border-r border-b border-slate-700 w-[50px] text-center">#</th><th className="px-4 py-3 border-r border-b border-slate-700 min-w-[100px]">ID Người</th><th className="px-4 py-3 border-r border-b border-slate-700 min-w-[150px]">Tên</th><th className="px-4 py-3 border-r border-b border-slate-700 min-w-[120px]">Bộ phận</th><th className="px-4 py-3 border-r border-b border-slate-700 min-w-[100px] text-center">Ngày</th><th className="px-4 py-3 border-r border-b border-slate-700 min-w-[100px] text-center">Thời gian</th><th className="px-4 py-3 border-r border-b border-slate-700 min-w-[80px] text-center">Ca (HT)</th><th className="px-4 py-3 border-r border-b border-slate-700 min-w-[140px]">Tình trạng</th><th className="px-4 py-3 border-r border-b border-slate-700 min-w-[100px] text-center">Điểm KT</th><th className="px-4 py-3 border-r border-b border-slate-700 min-w-[120px]">Tên tùy chỉnh</th><th className="px-4 py-3 border-r border-b border-slate-700 min-w-[120px]">Nguồn dữ liệu</th><th className="px-4 py-3 border-r border-b border-slate-700 min-w-[80px] text-center">Nhiệt độ</th><th className="px-4 py-3 border-b border-slate-700 min-w-[100px]">Bất thường</th></tr></thead>
                            <tbody className="divide-y divide-slate-700/50">
                                {filteredDataDaily.length === 0 ? (<tr><td colSpan={13} className="px-6 py-12 text-center text-slate-500 italic">Chưa có dữ liệu cho ngày này. Nhấn "Nhập Excel" để tải dữ liệu máy chấm công.</td></tr>) : (
                                    filteredDataDaily.map((record, index) => {
                                        const diary = getDiaryInfo(record.employeeId, record.date);
                                        const shift = diary ? diary.shift : (record.calculatedShift || 'DAY');
                                        const { swapped, in: inTime, out: outTime } = calculateWorkStats(record.time, record.date, shift, diary?.status);
                                        const finalTimeDisplay = swapped ? `${inTime} - ${outTime}` : record.time;
                                        return (
                                            <tr key={record.id} className="hover:bg-white/5 transition-colors text-slate-300">
                                                <td className="px-4 py-2 border-r border-slate-700 text-center text-slate-500">{index + 1}</td>
                                                <td className="px-4 py-2 border-r border-slate-700 font-mono text-orange-400 font-bold">{record.employeeId}</td>
                                                <td className="px-4 py-2 border-r border-slate-700 font-bold text-white">{record.fullName}</td>
                                                <td className="px-4 py-2 border-r border-slate-700">{record.department}</td>
                                                <td className="px-4 py-2 border-r border-slate-700 text-center"><div className="text-xs text-slate-300 flex items-center justify-center gap-1 font-mono"><CalendarDays size={12} className="text-slate-500" />{formatDateDDMMMYY(record.date)}</div></td>
                                                <td className="px-4 py-2 border-r border-slate-700 text-center"><div className={`font-mono font-bold text-sm px-2 py-1 rounded border inline-block shadow-sm ${finalTimeDisplay.includes('Thiếu') ? 'text-red-400 border-red-800 bg-red-900/20' : 'text-cyan-300 border-slate-700 bg-slate-900/50'}`}>{finalTimeDisplay}{swapped && <span className="ml-1 text-[8px] bg-purple-500 text-white px-1 rounded">SWAP</span>}</div></td>
                                                <td className="px-4 py-2 border-r border-slate-700 text-center">{shift === 'NIGHT' ? <span className="inline-flex items-center gap-1 text-purple-400 bg-purple-900/30 px-2 py-0.5 rounded border border-purple-700 text-[10px] font-bold"><Moon size={10}/> Đêm</span> : <span className="inline-flex items-center gap-1 text-orange-400 bg-orange-900/30 px-2 py-0.5 rounded border border-orange-700 text-[10px] font-bold"><Sun size={10}/> Ngày</span>}</td>
                                                <td className="px-4 py-2 border-r border-slate-700"><span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${record.attendanceStatus === 'Đúng giờ' || record.attendanceStatus === 'Đủ công' ? 'bg-green-900/30 text-green-400 border-green-700' : record.attendanceStatus === 'Nghỉ lễ' ? 'bg-pink-900/30 text-pink-400 border-pink-700' : record.attendanceStatus.includes('Thiếu') ? 'bg-red-900/30 text-red-400 border-red-700' : record.attendanceStatus === 'Đi muộn' ? 'bg-yellow-900/30 text-yellow-400 border-yellow-700' : 'bg-slate-900/30 text-slate-400 border-slate-700'}`}>{record.attendanceStatus === 'Đúng giờ' || record.attendanceStatus === 'Đủ công' ? <CheckCircle2 size={10}/> : record.attendanceStatus === 'Nghỉ lễ' ? <Palmtree size={10}/> : <AlertCircle size={10}/>}{record.attendanceStatus || 'Chưa xác định'}</span></td>
                                                <td className="px-4 py-2 border-r border-slate-700 text-center font-bold">{record.checkPoints}</td>
                                                <td className="px-4 py-2 border-r border-slate-700 text-slate-400 italic">{record.customName || '-'}</td>
                                                <td className="px-4 py-2 border-r border-slate-700 text-xs">{record.source}</td>
                                                <td className="px-4 py-2 border-r border-slate-700 text-center"><div className="flex items-center justify-center gap-1"><Thermometer size={12} className={record.temperature && record.temperature > 37.5 ? "text-red-500" : "text-green-500"}/><span className={record.temperature && record.temperature > 37.5 ? "text-red-400 font-bold" : ""}>{record.temperature}</span></div></td>
                                                <td className="px-4 py-2 border-slate-700">{record.abnormal !== 'Không' ? <span className="text-red-400 font-bold text-xs">{record.abnormal}</span> : <span className="text-slate-600 text-xs">Không</span>}</td>
                                            </tr>
                                        )
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* MONTHLY VIEW */}
                {viewMode === 'MONTHLY' && (
                    <div className="overflow-auto flex-1 custom-scrollbar relative bg-slate-900">
                        <table className="text-[10px] border-collapse w-max">
                            <thead className="bg-slate-800 text-slate-300 font-bold sticky top-0 z-40 font-mono shadow-md text-[10px]">
                                <tr>
                                    <th rowSpan={1} colSpan={1} className="px-2 py-3 border border-slate-700 sticky left-0 z-50 bg-slate-900 w-[100px] text-center shadow-[2px_0_5px_rgba(0,0,0,0.5)]">NHÂN VIÊN</th>
                                    <th className="px-2 py-3 border border-slate-700 sticky left-[100px] z-50 bg-slate-900 w-[90px] text-center shadow-[2px_0_5px_rgba(0,0,0,0.5)]">TỔNG HỢP</th>
                                    {monthlyData.days.map(day => {
                                        const dayOfWeek = getDayOfWeek(currentYearInt, currentMonthInt, day);
                                        const isSunday = dayOfWeek === 'CN';
                                        return (<th key={day} className={`px-1 py-1 border border-slate-700 min-w-[40px] text-center ${isSunday ? 'bg-red-900/40 text-red-200' : 'bg-slate-800'}`}><div className="flex flex-col items-center"><span className={`text-[9px] ${isSunday ? 'font-bold' : 'text-slate-400'}`}>{dayOfWeek}</span><span className="text-xs font-bold">{day}</span></div></th>);
                                    })}
                                </tr>
                            </thead>
                            <tbody>
                                {monthlyData.staffRows.map((row, idx) => (
                                    <React.Fragment key={idx}>
                                        <tr className="hover:bg-slate-800/50 transition-colors border-b border-slate-700/50">
                                            <td rowSpan={4} className="px-2 py-2 border-r border-slate-700 sticky left-0 z-30 bg-slate-800 shadow-[2px_0_5px_rgba(0,0,0,0.5)] align-middle">
                                                <div className="flex flex-col gap-1 items-start w-full">
                                                    <div className="flex items-center gap-1 text-blue-400 truncate w-full" title={row.staff.fullName}><User size={10} className="shrink-0"/><span className="font-bold text-[9px] text-white truncate">{row.staff.fullName}</span></div>
                                                    <div className="flex items-center gap-1 text-slate-500 font-mono text-[9px]"><Hash size={8} className="shrink-0"/><span>{row.staff.employeeId}</span></div>
                                                    <div className="flex items-center gap-1 text-slate-500 text-[8px] uppercase"><Briefcase size={8} className="shrink-0"/><span>{row.staff.department}</span></div>
                                                    <div className="mt-2 pt-2 border-t border-slate-700 w-full grid grid-cols-2 gap-x-2 gap-y-1 text-[8px]"><div className="flex justify-between text-slate-400"><span>Ngày công:</span><span className="text-white font-bold">{row.totals.daysWorked}</span></div><div className="flex justify-between text-slate-400"><span>Tổng giờ:</span><span className="text-cyan-400 font-bold">{Math.floor(row.totals.basic + row.totals.dayOT + row.totals.nightOT + row.totals.sundayOT)}</span></div><div className="col-span-2 flex justify-between gap-1 mt-1 bg-slate-900 p-1 rounded"><div className="text-center w-1/3 border-r border-slate-700"><div className="text-[7px] text-orange-500 uppercase">TC Ngày</div><div className="text-orange-300 font-bold">{Math.floor(row.totals.dayOT)}</div></div><div className="text-center w-1/3 border-r border-slate-700"><div className="text-[7px] text-purple-500 uppercase">TC Đêm</div><div className="text-purple-300 font-bold">{Math.floor(row.totals.nightOT)}</div></div><div className="text-center w-1/3"><div className="text-[7px] text-red-500 uppercase">TC CN</div><div className="text-red-300 font-bold">{Math.floor(row.totals.sundayOT)}</div></div></div></div>
                                                </div>
                                            </td>
                                            <td className="px-1 py-1 border-r border-slate-700 sticky left-[100px] z-30 bg-slate-800/80 backdrop-blur-sm font-bold text-cyan-400 shadow-[2px_0_5px_rgba(0,0,0,0.5)] text-[8px]"><div className="flex justify-between items-center w-full px-1"><div className="flex items-center gap-1"><Clock size={10}/> GC</div><div className="text-white ml-1">{row.totals.basic.toFixed(1)}h</div></div></td>
                                            {monthlyData.days.map(day => {
                                                const dayOfWeek = getDayOfWeek(currentYearInt, currentMonthInt, day);
                                                const isSunday = dayOfWeek === 'CN';
                                                const dayData = row.days[day];
                                                const { displayBasic, isFull, in: inTime, out: outTime, shift, swapped } = dayData?.stats || { displayBasic: '-', isFull: false, in: '', out: '', shift: 'DAY', swapped: false };
                                                const hasTime = inTime || outTime;
                                                const basicColor = isFull ? 'text-green-400 font-bold' : (displayBasic !== '-' && displayBasic !== '0h' ? 'text-slate-300' : 'text-slate-600');
                                                const bgColor = isSunday ? 'bg-red-900/10' : 'bg-cyan-900/10';
                                                const finalIn = swapped ? outTime : inTime;
                                                const finalOut = swapped ? inTime : outTime;
                                                return (<td key={`basic-${day}`} className={`border-r border-slate-700 text-center py-1 ${basicColor} ${bgColor}`}><div className="flex flex-col items-center gap-0.5">{hasTime ? (<><div className="text-[8px] font-mono text-cyan-200 leading-tight whitespace-nowrap">{swapped ? `${finalIn}-${finalOut}` : `${inTime}-${outTime}`}{swapped && <span className="text-[6px] text-purple-400 block">*</span>}</div><div className="flex items-center gap-1 mt-0.5">{shift === 'DAY' ? <Sun size={8} className="text-orange-400"/> : <Moon size={8} className="text-purple-400"/>}<span className="text-[8px]">{displayBasic}</span></div></>) : (!isSunday ? <span className="text-red-500 font-bold text-[8px]">V</span> : <span className="text-slate-700">-</span>)}</div></td>);
                                            })}
                                        </tr>
                                        <tr className="hover:bg-slate-800/50 transition-colors border-b border-slate-700/50"><td className="px-1 py-1 border-r border-slate-700 sticky left-[100px] z-30 bg-orange-900/20 font-bold text-orange-400 shadow-[2px_0_5px_rgba(0,0,0,0.5)] text-[8px]"><div className="flex justify-between items-center w-full px-1"><div className="flex items-center gap-1"><Sun size={10}/> TC N</div><div className="text-white ml-1">{Math.floor(row.totals.dayOT)}h</div></div></td>{monthlyData.days.map(day => { const dayOfWeek = getDayOfWeek(currentYearInt, currentMonthInt, day); const isSunday = dayOfWeek === 'CN'; const dayData = row.days[day]; const { dayOT } = dayData?.stats || { dayOT: 0 }; const hasOT = dayOT > 0; const bgColor = isSunday ? 'bg-red-900/10' : 'bg-orange-900/10'; return (<td key={`dayOT-${day}`} className={`border-r border-slate-700 text-center py-1 ${bgColor}`}><div className={`flex flex-col items-center ${hasOT ? 'text-orange-400 font-bold' : 'text-slate-700'}`}><span className="text-[9px]">{hasOT ? dayOT : '-'}</span></div></td>); })}</tr>
                                        <tr className="hover:bg-slate-800/50 transition-colors border-b border-slate-700/50"><td className="px-1 py-1 border-r border-slate-700 sticky left-[100px] z-30 bg-purple-900/20 font-bold text-purple-400 shadow-[2px_0_5px_rgba(0,0,0,0.5)] text-[8px]"><div className="flex justify-between items-center w-full px-1"><div className="flex items-center gap-1"><Moon size={10}/> TC Đ</div><div className="text-white ml-1">{Math.floor(row.totals.nightOT)}h</div></div></td>{monthlyData.days.map(day => { const dayOfWeek = getDayOfWeek(currentYearInt, currentMonthInt, day); const isSunday = dayOfWeek === 'CN'; const dayData = row.days[day]; const { nightOT } = dayData?.stats || { nightOT: 0 }; const hasOT = nightOT > 0; const bgColor = isSunday ? 'bg-red-900/10' : 'bg-purple-900/10'; return (<td key={`nightOT-${day}`} className={`border-r border-slate-700 text-center py-1 ${bgColor}`}><div className={`flex flex-col items-center ${hasOT ? 'text-purple-400 font-bold' : 'text-slate-700'}`}><span className="text-[9px]">{hasOT ? nightOT : '-'}</span></div></td>); })}</tr>
                                        <tr className="hover:bg-slate-800/50 transition-colors border-b border-slate-600"><td className="px-1 py-1 border-r border-slate-700 sticky left-[100px] z-30 bg-red-900/20 font-bold text-red-400 shadow-[2px_0_5px_rgba(0,0,0,0.5)] text-[8px]"><div className="flex justify-between items-center w-full px-1"><div className="flex items-center gap-1"><CalendarCheck size={10}/> TC CN</div><div className="text-white ml-1">{Math.floor(row.totals.sundayOT)}h</div></div></td>{monthlyData.days.map(day => { const dayOfWeek = getDayOfWeek(currentYearInt, currentMonthInt, day); const isSunday = dayOfWeek === 'CN'; const dayData = row.days[day]; const { sundayOT } = dayData?.stats || { sundayOT: 0 }; const hasOT = sundayOT > 0; const bgColor = isSunday ? 'bg-red-900/20' : 'bg-slate-900'; return (<td key={`sundayOT-${day}`} className={`border-r border-slate-700 text-center py-1 ${bgColor}`}><div className={`flex flex-col items-center ${hasOT ? 'text-red-400 font-bold' : 'text-slate-700'}`}><span className="text-[9px]">{hasOT ? sundayOT : '-'}</span></div></td>); })}</tr>
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {isMappingModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl h-[80vh] flex flex-col border border-slate-700 overflow-hidden">
                        <div className="px-6 py-4 bg-purple-700 text-white flex justify-between items-center shrink-0">
                            <h2 className="text-lg font-bold flex items-center gap-2"><Link size={20}/> CẤU HÌNH MAPPING (DỮ LIỆU NGUỒN)</h2>
                            <button onClick={() => setIsMappingModalOpen(false)} className="hover:bg-white/20 p-1 rounded transition-colors"><X size={20}/></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-slate-900">
                             <table className="w-full text-sm text-left border-collapse"><thead className="text-xs text-slate-400 uppercase bg-slate-800 sticky top-0 z-10 font-bold border-b border-slate-700"><tr><th className="px-4 py-3">Mã Chấm Công (Excel)</th><th className="px-4 py-3">Mã Nhân Viên (HT)</th><th className="px-4 py-3">Họ Tên</th><th className="px-4 py-3 text-center w-[60px]">Xóa</th></tr></thead><tbody className="divide-y divide-slate-800">{mappings.length === 0 ? (<tr><td colSpan={4} className="p-8 text-center text-slate-500 italic">Chưa có dữ liệu mapping.</td></tr>) : (mappings.map(map => (<tr key={map.id} className="hover:bg-slate-800/50"><td className="px-4 py-2 font-mono font-bold text-orange-400">{map.excelId}</td><td className="px-4 py-2 font-mono text-blue-400 font-bold">{map.systemId}</td><td className="px-4 py-2 text-white">{map.fullName}</td><td className="px-4 py-2 text-center"><button onClick={() => handleDeleteMapping(map.id)} className="text-slate-500 hover:text-red-500 transition-colors"><Trash2 size={16}/></button></td></tr>)))}</tbody></table>
                        </div>
                        <div className="p-4 bg-slate-800 border-t border-slate-700 flex flex-col gap-3">
                            <h4 className="text-xs font-bold text-slate-400 uppercase">Thêm Mapping Mới</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div><label className="block text-[10px] text-slate-500 uppercase mb-1">Mã trên Excel</label><input className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-purple-500 text-white font-mono" placeholder="VD: 1001" value={newMapping.excelId} onChange={(e) => setNewMapping({...newMapping, excelId: e.target.value})}/></div>
                                <div><label className="block text-[10px] text-slate-500 uppercase mb-1">Chọn Nhân Viên (Hệ thống)</label><select className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-purple-500 text-white" value={newMapping.systemId} onChange={handleSystemIdChange}><option value="">-- Chọn nhân viên --</option>{allStaff.map(s => (<option key={s.id} value={s.employeeId}>{s.fullName} ({s.employeeId})</option>))}</select></div>
                                <div className="flex items-end"><button onClick={handleAddMapping} className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 rounded shadow transition-colors flex items-center justify-center gap-2"><Plus size={16}/> Thêm</button></div>
                            </div>
                            <div className="text-[10px] text-slate-500 italic mt-1">* Khi nhập file Excel, hệ thống sẽ tự động thay thế mã chấm công bằng thông tin nhân viên tương ứng trong bảng này.</div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
