
import React, { useState, useMemo } from 'react';
import { Calendar, Search, Filter, User, Layers, Thermometer, Plane, Heart, AlertCircle, List, Phone, MapPin, Briefcase, CheckCircle2 } from 'lucide-react';
import { StaffRecord } from '../../types';

interface HRLeavesProps {
    allStaff: StaffRecord[];
}

export const HRLeaves: React.FC<HRLeavesProps> = ({ allStaff }) => {
    const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<string>('ALL');

    // --- AGGREGATE STATS ---
    const stats = useMemo(() => {
        return {
            sick: allStaff.filter(s => s.attendance === 'SICK').length,
            leave: allStaff.filter(s => s.attendance === 'LEAVE').length,
            family: allStaff.filter(s => s.attendance === 'FAMILY').length,
            unmarked: allStaff.filter(s => s.attendance === 'UNMARKED').length,
            totalAbsent: allStaff.filter(s => s.attendance !== 'PRESENT').length
        };
    }, [allStaff]);

    // --- FILTER STAFF LIST ---
    const absentStaff = useMemo(() => {
        return allStaff.filter(staff => {
            // Only show staff who are NOT present
            const isAbsent = staff.attendance !== 'PRESENT';
            if (!isAbsent) return false;

            // Apply Type Filter
            const matchesType = filterType === 'ALL' || staff.attendance === filterType;
            
            // Apply Search
            const matchesSearch = 
                staff.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                staff.employeeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (staff.department && staff.department.toLowerCase().includes(searchTerm.toLowerCase()));

            return matchesType && matchesSearch;
        }).sort((a, b) => {
            // Sort by Department then Name
            if (a.department !== b.department) return (a.department || '').localeCompare(b.department || '');
            return a.fullName.localeCompare(b.fullName);
        });
    }, [allStaff, searchTerm, filterType]);

    const getDeptColor = (dept: string | undefined) => {
        if (!dept) return "bg-slate-700 text-slate-300 border-slate-600";
        if (dept.includes('MULTI')) return "bg-blue-900/30 text-blue-400 border-blue-800";
        if (dept.includes('STIFF')) return "bg-green-900/30 text-green-400 border-green-800";
        if (dept.includes('MOLD')) return "bg-orange-900/30 text-orange-400 border-orange-800";
        if (dept.includes('STAMP')) return "bg-purple-900/30 text-purple-400 border-purple-800";
        return "bg-slate-700 text-slate-300 border-slate-600";
    };

    const getStatusInfo = (status: string) => {
        switch (status) {
            case 'SICK': return { label: 'Nghỉ Ốm', color: 'text-orange-400', bg: 'bg-orange-900/20', border: 'border-orange-900/50', icon: Thermometer };
            case 'LEAVE': return { label: 'Nghỉ Phép', color: 'text-blue-400', bg: 'bg-blue-900/20', border: 'border-blue-900/50', icon: Plane };
            case 'FAMILY': return { label: 'Hiếu/Hỉ', color: 'text-purple-400', bg: 'bg-purple-900/20', border: 'border-purple-900/50', icon: Heart };
            case 'UNMARKED': return { label: 'Chưa báo', color: 'text-slate-400', bg: 'bg-slate-800', border: 'border-slate-700', icon: AlertCircle };
            default: return { label: status, color: 'text-slate-400', bg: 'bg-slate-800', border: 'border-slate-700', icon: AlertCircle };
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-900 text-slate-300 p-6 font-sans overflow-y-auto">
            
            {/* Header Section */}
            <div className="mb-8 flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                        <Plane className="text-blue-500" size={32}/>
                        TỔNG HỢP NGHỈ PHÉP & VẮNG MẶT
                    </h2>
                    <p className="text-slate-400 mt-1 text-sm">Theo dõi nhân sự vắng mặt trong ngày</p>
                </div>
                
                <div className="flex items-center gap-2 bg-slate-800 p-2 rounded-lg border border-slate-700 shadow-lg">
                        <span className="text-xs font-bold text-slate-400 px-2 uppercase">Ngày dữ liệu:</span>
                        <div className="flex items-center gap-2 bg-slate-900 border border-slate-600 rounded px-3 py-1.5">
                        <Calendar size={16} className="text-blue-500"/>
                        <input 
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="bg-transparent border-none text-sm font-bold text-white focus:outline-none [color-scheme:dark]"
                        />
                    </div>
                </div>
            </div>

            {/* Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {/* Card 1: SICK */}
                <div 
                    onClick={() => setFilterType('SICK')}
                    className={`relative bg-slate-800 rounded-xl p-6 border-2 cursor-pointer transition-all duration-300 group shadow-lg hover:-translate-y-1 ${filterType === 'SICK' ? 'border-orange-500 shadow-orange-900/20' : 'border-transparent hover:border-orange-500/50'}`}
                >
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Thermometer size={80} className="text-orange-500"/>
                    </div>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 rounded-lg bg-orange-600 text-white shadow-lg">
                            <Thermometer size={24} />
                        </div>
                        <h3 className="text-lg font-bold text-white uppercase tracking-wide">Nghỉ Ốm</h3>
                    </div>
                    <div className="flex justify-between items-end">
                        <span className="text-sm text-slate-400 font-medium">Số lượng</span>
                        <span className="text-3xl font-bold text-orange-400">{stats.sick}</span>
                    </div>
                </div>

                {/* Card 2: LEAVE */}
                <div 
                    onClick={() => setFilterType('LEAVE')}
                    className={`relative bg-slate-800 rounded-xl p-6 border-2 cursor-pointer transition-all duration-300 group shadow-lg hover:-translate-y-1 ${filterType === 'LEAVE' ? 'border-blue-500 shadow-blue-900/20' : 'border-transparent hover:border-blue-500/50'}`}
                >
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Plane size={80} className="text-blue-500"/>
                    </div>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 rounded-lg bg-blue-600 text-white shadow-lg">
                            <Plane size={24} />
                        </div>
                        <h3 className="text-lg font-bold text-white uppercase tracking-wide">Nghỉ Phép</h3>
                    </div>
                    <div className="flex justify-between items-end">
                        <span className="text-sm text-slate-400 font-medium">Số lượng</span>
                        <span className="text-3xl font-bold text-blue-400">{stats.leave}</span>
                    </div>
                </div>

                {/* Card 3: FAMILY */}
                <div 
                    onClick={() => setFilterType('FAMILY')}
                    className={`relative bg-slate-800 rounded-xl p-6 border-2 cursor-pointer transition-all duration-300 group shadow-lg hover:-translate-y-1 ${filterType === 'FAMILY' ? 'border-purple-500 shadow-purple-900/20' : 'border-transparent hover:border-purple-500/50'}`}
                >
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Heart size={80} className="text-purple-500"/>
                    </div>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 rounded-lg bg-purple-600 text-white shadow-lg">
                            <Heart size={24} />
                        </div>
                        <h3 className="text-lg font-bold text-white uppercase tracking-wide">Hiếu / Hỉ</h3>
                    </div>
                    <div className="flex justify-between items-end">
                        <span className="text-sm text-slate-400 font-medium">Số lượng</span>
                        <span className="text-3xl font-bold text-purple-400">{stats.family}</span>
                    </div>
                </div>

                {/* Card 4: UNMARKED */}
                <div 
                    onClick={() => setFilterType('UNMARKED')}
                    className={`relative bg-slate-800 rounded-xl p-6 border-2 cursor-pointer transition-all duration-300 group shadow-lg hover:-translate-y-1 ${filterType === 'UNMARKED' ? 'border-slate-500 shadow-slate-900/20' : 'border-transparent hover:border-slate-500/50'}`}
                >
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <AlertCircle size={80} className="text-slate-400"/>
                    </div>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 rounded-lg bg-slate-600 text-white shadow-lg">
                            <AlertCircle size={24} />
                        </div>
                        <h3 className="text-lg font-bold text-white uppercase tracking-wide">Chưa Báo</h3>
                    </div>
                    <div className="flex justify-between items-end">
                        <span className="text-sm text-slate-400 font-medium">Số lượng</span>
                        <span className="text-3xl font-bold text-slate-400">{stats.unmarked}</span>
                    </div>
                </div>
            </div>

            {/* List View */}
            <div className="flex-1 flex flex-col min-h-0">
                <div className="flex justify-between items-end mb-3">
                    <h3 className="text-sm font-bold text-slate-400 uppercase flex items-center gap-2 font-mono">
                    <List size={16} /> Danh sách chi tiết ({absentStaff.length} nhân sự)
                    </h3>
                    
                    {/* Search & Filter Reset */}
                    <div className="flex items-center gap-3">
                        <div className="relative w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                            <input 
                                type="text" 
                                placeholder="Tìm kiếm tên, mã, bộ phận..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-4 py-1.5 bg-slate-800 border border-slate-600 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none text-xs text-white"
                            />
                        </div>
                        <button 
                            onClick={() => { setFilterType('ALL'); setSearchTerm(''); }}
                            className="text-xs font-bold text-slate-400 hover:text-white bg-slate-800 px-3 py-1.5 rounded border border-slate-600 hover:bg-slate-700 transition-colors flex items-center gap-1"
                        >
                            <Filter size={12}/> Tất cả ({stats.totalAbsent})
                        </button>
                    </div>
                </div>

                <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden shadow-lg flex-1 flex flex-col">
                    {/* Table Header */}
                    <div className="grid grid-cols-12 gap-4 p-3 bg-slate-900/80 border-b border-slate-700 text-[10px] font-bold text-slate-500 uppercase tracking-wider sticky top-0 z-10">
                        <div className="col-span-3 flex items-center gap-1"><User size={12}/> Nhân Viên</div>
                        <div className="col-span-2 flex items-center gap-1"><Layers size={12}/> Bộ Phận</div>
                        <div className="col-span-2 flex items-center gap-1"><Briefcase size={12}/> Vị Trí</div>
                        <div className="col-span-2 flex items-center gap-1"><AlertCircle size={12}/> Trạng Thái</div>
                        <div className="col-span-3 flex items-center gap-1"><Phone size={12}/> Liên Hệ / Ghi Chú</div>
                    </div>

                    {/* List Items */}
                    <div className="divide-y divide-slate-700/50 overflow-y-auto custom-scrollbar flex-1 bg-slate-800">
                        {absentStaff.length === 0 ? (
                            <div className="p-12 text-center text-slate-500 text-xs italic flex flex-col items-center gap-3">
                                <CheckCircle2 size={48} className="opacity-20 mb-2 text-green-500"/>
                                <span>Không có nhân sự vắng mặt theo bộ lọc hiện tại.</span>
                            </div>
                        ) : (
                            absentStaff.map((staff) => {
                                const statusInfo = getStatusInfo(staff.attendance);
                                const StatusIcon = statusInfo.icon;
                                const deptColor = getDeptColor(staff.department);

                                return (
                                    <div key={staff.id} className="grid grid-cols-12 gap-4 p-3 items-center hover:bg-white/5 transition-all duration-200 group text-xs text-slate-300">
                                        {/* Name & ID */}
                                        <div className="col-span-3 flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold bg-slate-700 text-slate-300 border border-slate-600 group-hover:border-slate-500`}>
                                                {staff.fullName.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="font-bold text-white group-hover:text-blue-300 transition-colors">{staff.fullName}</div>
                                                <div className="font-mono text-[10px] text-slate-500">{staff.employeeId}</div>
                                            </div>
                                        </div>

                                        {/* Dept */}
                                        <div className="col-span-2">
                                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${deptColor}`}>
                                                {staff.department || 'N/A'}
                                            </span>
                                        </div>

                                        {/* Position */}
                                        <div className="col-span-2 text-slate-400">
                                            {staff.position || '-'}
                                        </div>

                                        {/* Status */}
                                        <div className="col-span-2">
                                            <span className={`flex items-center gap-1.5 px-2 py-1 rounded w-fit border text-[10px] font-bold ${statusInfo.bg} ${statusInfo.color} ${statusInfo.border}`}>
                                                <StatusIcon size={12} />
                                                {statusInfo.label}
                                            </span>
                                        </div>

                                        {/* Contact / Note */}
                                        <div className="col-span-3 flex flex-col gap-0.5">
                                            {staff.phone && (
                                                <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono">
                                                    <Phone size={10}/> {staff.phone}
                                                </div>
                                            )}
                                            {staff.hometown && (
                                                <div className="flex items-center gap-1 text-[10px] text-slate-500 truncate" title={staff.hometown}>
                                                    <MapPin size={10}/> {staff.hometown}
                                                </div>
                                            )}
                                            {staff.note && (
                                                 <div className="text-[10px] text-yellow-500/80 italic mt-0.5">
                                                     "{staff.note}"
                                                 </div>
                                            )}
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>
                </div>
            </div>

        </div>
    );
};
