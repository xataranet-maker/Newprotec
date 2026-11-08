
import React, { useState } from 'react';
import { UserPlus, Save, RotateCcw, Briefcase, MapPin, Phone, Calendar, User, Hash, Layers, Factory } from 'lucide-react';
import { StaffRecord } from '../../types';

interface HRAddStaffProps {
    multiStaff: StaffRecord[];
    setMultiStaff: (data: StaffRecord[]) => void;
    hrStaff?: StaffRecord[];
    setHrStaff?: (data: StaffRecord[]) => void;
    qualityStaff?: StaffRecord[];
    setQualityStaff?: (data: StaffRecord[]) => void;
    warehouseStaff?: StaffRecord[];
    setWarehouseStaff?: (data: StaffRecord[]) => void;
    officeStaff?: StaffRecord[];
    setOfficeStaff?: (data: StaffRecord[]) => void;
}

const DEPARTMENTS = [
    { id: 'MULTI', label: 'Multi Auto' },
    { id: 'HR', label: 'HC & NS' },
    { id: 'QUALITY', label: 'Chất Lượng (QA/QC)' },
    { id: 'WAREHOUSE', label: 'Kho (Logistics)' },
    { id: 'OFFICE', label: 'Khối Văn Phòng' },
    { id: 'DIRECTOR', label: 'Ban Giám Đốc' }
];

const WORK_UNITS = [
    { id: 'MULTI_GEN', label: 'Multi Auto - Vận hành' },
    { id: 'MULTI_TECH', label: 'Multi Auto - Kỹ thuật' },
    { id: 'IQC', label: 'QA - IQC (Đầu vào)' },
    { id: 'OQC', label: 'QA - OQC (Đầu ra)' },
    { id: 'PQC', label: 'QA - PQC (Công đoạn)' },
    { id: 'LAB', label: 'Phòng Lab / Đo lường' },
    { id: 'WAREHOUSE_MAIN', label: 'Kho Tổng' },
    { id: 'OFFICE_MAIN', label: 'Văn Phòng Chính' },
    { id: 'HR_ADMIN', label: 'Hành chính - Nhân sự' },
];

export const HRAddStaff: React.FC<HRAddStaffProps> = ({
    multiStaff, setMultiStaff,
    hrStaff, setHrStaff,
    qualityStaff, setQualityStaff,
    warehouseStaff, setWarehouseStaff,
    officeStaff, setOfficeStaff
}) => {
    const [formData, setFormData] = useState({
        fullName: '',
        employeeId: '',
        department: 'MULTI',
        workUnit: '', 
        position: 'Công Nhân',
        phone: '',
        hometown: '', 
        dateJoined: new Date().toISOString().split('T')[0],
        dob: '',
        shift: 'DAY' as 'DAY' | 'NIGHT'
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.fullName || !formData.employeeId) {
            alert("Vui lòng nhập Họ tên và Mã nhân viên.");
            return;
        }

        let currentList: StaffRecord[] = multiStaff;
        let setList: (data: StaffRecord[]) => void = setMultiStaff;

        if (formData.department === 'HR' && hrStaff && setHrStaff) { currentList = hrStaff; setList = setHrStaff; }
        else if (formData.department === 'QUALITY' && qualityStaff && setQualityStaff) { currentList = qualityStaff; setList = setQualityStaff; }
        else if (formData.department === 'WAREHOUSE' && warehouseStaff && setWarehouseStaff) { currentList = warehouseStaff; setList = setWarehouseStaff; }
        else if (formData.department === 'OFFICE' && officeStaff && setOfficeStaff) { currentList = officeStaff; setList = setOfficeStaff; }
        else {
             currentList = multiStaff; 
             setList = setMultiStaff;
        }

        if (currentList.some(s => s.employeeId === formData.employeeId)) {
            alert(`Mã nhân viên ${formData.employeeId} đã tồn tại.`);
            return;
        }

        const newStaff: StaffRecord = {
            id: Date.now(),
            fullName: formData.fullName,
            employeeId: formData.employeeId,
            position: formData.position,
            department: formData.department,
            workUnit: formData.workUnit || formData.department,
            phone: formData.phone,
            hometown: formData.hometown,
            dateJoined: formData.dateJoined,
            dob: formData.dob,
            shift: formData.shift,
            attendance: 'UNMARKED'
        };

        setList([...currentList, newStaff]);
        alert(`Đã thêm nhân viên ${formData.fullName} thành công!`);
        
        setFormData({
            ...formData,
            fullName: '',
            employeeId: '',
            phone: '',
            hometown: '',
            dob: '',
            workUnit: ''
        });
    };

    const handleReset = () => {
        setFormData({
            fullName: '',
            employeeId: '',
            department: 'MULTI',
            workUnit: '',
            position: 'Công Nhân',
            phone: '',
            hometown: '',
            dateJoined: new Date().toISOString().split('T')[0],
            dob: '',
            shift: 'DAY'
        });
    };

    return (
        <div className="p-6 h-full overflow-y-auto bg-slate-900 flex flex-col items-center justify-start text-slate-300 font-sans">
            <div className="w-full max-w-4xl">
                <div className="bg-slate-800 px-6 py-4 rounded-t-xl shadow-lg border-b border-slate-700 flex items-center gap-3">
                    <div className="p-2 bg-green-600 rounded-lg shadow-lg shadow-green-900/50 text-white"><UserPlus size={24} /></div>
                    <div>
                        <h1 className="text-xl font-bold text-white uppercase tracking-wider">THÊM MỚI NHÂN SỰ</h1>
                        <p className="text-xs text-slate-400">Nhập thông tin để tạo hồ sơ nhân viên mới vào hệ thống</p>
                    </div>
                </div>

                <form onSubmit={handleSave} className="bg-slate-800 rounded-b-xl shadow-2xl border border-t-0 border-slate-700 p-8 space-y-6">
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-blue-400 uppercase border-b border-slate-700 pb-2 flex items-center gap-2"><User size={16}/> Thông tin cơ bản</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="col-span-2 md:col-span-1">
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Phòng Ban (Biên chế) <span className="text-red-500">*</span></label>
                                <div className="relative">
                                    <select name="department" value={formData.department} onChange={handleChange} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:outline-none text-white appearance-none font-bold">
                                        {DEPARTMENTS.map(dept => <option key={dept.id} value={dept.id}>{dept.label}</option>)}
                                    </select>
                                    <Layers className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={16}/>
                                </div>
                            </div>
                            <div className="col-span-2 md:col-span-1">
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Bộ Phận Làm Việc (Thực tế)</label>
                                <div className="relative">
                                    <select name="workUnit" value={formData.workUnit} onChange={handleChange} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:outline-none text-white appearance-none">
                                        <option value="">-- Mặc định theo phòng ban --</option>
                                        {WORK_UNITS.map(unit => <option key={unit.id} value={unit.id}>{unit.label}</option>)}
                                    </select>
                                    <Factory className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={16}/>
                                </div>
                            </div>
                            <div className="col-span-2 md:col-span-1">
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Ca Làm Việc Ban Đầu</label>
                                <div className="flex gap-4 mt-2">
                                    <label className="flex-1 flex items-center gap-2 cursor-pointer bg-slate-900 px-4 py-2 rounded border border-slate-600 hover:border-orange-500 transition-colors">
                                        <input type="radio" name="shift" value="DAY" checked={formData.shift === 'DAY'} onChange={() => setFormData({...formData, shift: 'DAY'})} className="text-orange-500 focus:ring-orange-500 bg-slate-800 border-slate-500"/>
                                        <span className="text-sm font-bold text-orange-400">CA NGÀY</span>
                                    </label>
                                    <label className="flex-1 flex items-center gap-2 cursor-pointer bg-slate-900 px-4 py-2 rounded border border-slate-600 hover:border-purple-500 transition-colors">
                                        <input type="radio" name="shift" value="NIGHT" checked={formData.shift === 'NIGHT'} onChange={() => setFormData({...formData, shift: 'NIGHT'})} className="text-purple-500 focus:ring-purple-500 bg-slate-800 border-slate-500"/>
                                        <span className="text-sm font-bold text-purple-400">CA ĐÊM</span>
                                    </label>
                                </div>
                            </div>
                            <div className="col-span-1">
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Mã Nhân Viên <span className="text-red-500">*</span></label>
                                <div className="relative">
                                    <input type="text" name="employeeId" value={formData.employeeId} onChange={handleChange} className="w-full bg-slate-900 border border-slate-600 rounded-lg pl-10 pr-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none text-white font-mono" placeholder="VD: NV001" required />
                                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16}/>
                                </div>
                            </div>
                            <div className="col-span-2">
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Họ và Tên <span className="text-red-500">*</span></label>
                                <div className="relative">
                                    <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} className="w-full bg-slate-900 border border-slate-600 rounded-lg pl-10 pr-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none text-white font-bold" placeholder="Nguyễn Văn A" required />
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16}/>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Chức Vụ / Vị Trí</label>
                                <div className="relative">
                                    <input type="text" name="position" value={formData.position} onChange={handleChange} className="w-full bg-slate-900 border border-slate-600 rounded-lg pl-10 pr-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none text-white" placeholder="Công Nhân, Kỹ Thuật,..." />
                                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16}/>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Ngày Vào Công Ty</label>
                                <div className="relative">
                                    <input type="date" name="dateJoined" value={formData.dateJoined} onChange={handleChange} className="w-full bg-slate-900 border border-slate-600 rounded-lg pl-10 pr-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none text-white [color-scheme:dark]" />
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16}/>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="pt-6 flex gap-4 border-t border-slate-700">
                        <button type="submit" className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-lg shadow-lg flex items-center justify-center gap-2 text-sm uppercase tracking-wide">
                            <Save size={18} /> Xác Nhận Thêm Mới
                        </button>
                        <button type="button" onClick={handleReset} className="px-8 bg-slate-700 hover:bg-slate-600 text-slate-300 font-bold py-3 rounded-lg border border-slate-600 flex items-center gap-2 text-sm uppercase tracking-wide">
                            <RotateCcw size={18} /> Làm Mới
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
