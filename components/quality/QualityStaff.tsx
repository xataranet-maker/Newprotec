
import React from 'react';
import { Users, Search, Phone, MapPin, Briefcase } from 'lucide-react';
import { StaffRecord } from '../../types';

interface QualityStaffProps {
    staffList: StaffRecord[];
}

export const QualityStaff: React.FC<QualityStaffProps> = ({ staffList }) => {
    // Filter specifically for QUALITY department
    const qualityMembers = staffList.filter(s => s.department === 'QUALITY');

    return (
        <div className="p-6 h-full overflow-y-auto bg-slate-900 flex flex-col gap-6 text-slate-300 font-sans">
             <div className="bg-slate-800 px-6 py-4 rounded-xl shadow-lg border border-slate-700 flex items-center gap-3">
                <div className="p-2 bg-green-600 rounded-lg shadow-lg shadow-green-900/50 text-white">
                    <Users size={24} />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-white uppercase tracking-wider font-mono">NHÂN SỰ PHÒNG CHẤT LƯỢNG</h1>
                    <p className="text-xs text-slate-400">Danh sách nhân viên thuộc bộ phận QA/QC (Đồng bộ từ HC&NS)</p>
                </div>
            </div>

            <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 mb-4">
                 <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                    <input type="text" placeholder="Tìm kiếm nhân viên..." className="w-full bg-slate-900 border border-slate-600 rounded pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-green-500"/>
                 </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {qualityMembers.length === 0 ? (
                    <div className="col-span-full p-12 text-center text-slate-500 italic border border-dashed border-slate-700 rounded-xl">
                        Chưa có nhân viên nào được gán vào phòng Chất Lượng. Vui lòng liên hệ HC&NS để cập nhật.
                    </div>
                ) : (
                    qualityMembers.map(staff => (
                        <div key={staff.id} className="bg-slate-800 rounded-xl p-4 border border-slate-700 flex items-start gap-4 hover:border-green-500/50 transition-colors shadow-md">
                            <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center font-bold text-xl text-slate-300 border border-slate-600 overflow-hidden">
                                {staff.avatarUrl ? <img src={staff.avatarUrl} alt="Avatar" className="w-full h-full object-cover"/> : staff.fullName.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-white text-lg truncate">{staff.fullName}</h3>
                                <div className="text-xs font-mono text-green-400 font-bold mb-1">{staff.employeeId}</div>
                                <div className="text-xs text-slate-400 flex items-center gap-1 mb-0.5"><Briefcase size={12}/> {staff.position}</div>
                                <div className="text-xs text-slate-500 flex items-center gap-1"><Phone size={12}/> {staff.phone || '--'}</div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
