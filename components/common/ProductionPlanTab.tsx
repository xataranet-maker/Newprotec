
import React, { useMemo } from 'react';
import { CalendarRange, CheckCircle2, Clock, Box, User, Hash, History } from 'lucide-react';
import { ProductionPlan } from '../../types';

interface ProductionPlanTabProps {
    plans: ProductionPlan[];
    departmentId?: string; // 'ALL' | 'MULTI' | 'SUS_AUTO' | etc
}

export const ProductionPlanTab: React.FC<ProductionPlanTabProps> = ({ plans, departmentId = 'ALL' }) => {
    const filteredPlans = useMemo(() => {
        if (departmentId === 'ALL') return plans;
        return plans.filter(p => p.targetDept === departmentId);
    }, [plans, departmentId]);

    return (
        <div className="h-full flex flex-col bg-[#020617] p-6 text-slate-300 overflow-hidden">
            <div className="flex items-center gap-3 mb-6 shrink-0">
                <div className="p-3 bg-cyan-600 rounded-xl shadow-lg text-white shadow-cyan-900/30">
                    <CalendarRange size={24}/>
                </div>
                <div>
                    <h2 className="text-xl font-black uppercase tracking-widest font-mono">Lịch sử kế hoạch sản xuất</h2>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">Dữ liệu điều phối từ Trung tâm chỉ huy</p>
                </div>
            </div>

            <div className="flex-1 bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col min-h-0">
                <div className="overflow-auto custom-scrollbar flex-1">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-900 text-slate-500 font-black uppercase text-[10px] tracking-widest sticky top-0 z-10 border-b border-slate-700">
                            <tr>
                                <th className="px-6 py-4">Thời gian</th>
                                <th className="px-6 py-4">Sản phẩm (Model)</th>
                                <th className="px-6 py-4">Nội dung kế hoạch</th>
                                <th className="px-6 py-4 text-center">Trạng thái</th>
                                <th className="px-6 py-4 text-center">Người duyệt / Time</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/50">
                            {filteredPlans.length === 0 ? (
                                <tr><td colSpan={5} className="py-20 text-center text-slate-600 italic uppercase text-[10px] tracking-[0.2em] font-black opacity-20">Chưa có kế hoạch nào ghi nhận</td></tr>
                            ) : (
                                filteredPlans.map(plan => (
                                    <tr key={plan.id} className={`hover:bg-white/5 transition-all ${plan.status === 'PENDING' ? 'bg-cyan-900/5' : ''}`}>
                                        <td className="px-6 py-4">
                                            <div className="text-[11px] font-black text-slate-300">{plan.timestamp.split(' ')[1]}</div>
                                            <div className="text-[9px] text-slate-500 font-mono">{plan.timestamp.split(' ')[0]}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <Box size={14} className="text-blue-500"/>
                                                <span className="font-black text-white text-xs uppercase">{plan.model}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-[11px] text-slate-300 leading-relaxed font-medium">
                                                {plan.content}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-2 py-1 rounded text-[9px] font-black border uppercase ${plan.status === 'PENDING' ? 'bg-cyan-900/30 text-cyan-400 border-cyan-800' : 'bg-green-900/30 text-green-400 border-green-800'}`}>
                                                {plan.status === 'PENDING' ? 'ĐANG CHỜ' : 'ĐÃ XÁC NHẬN'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {plan.confirmedAt ? (
                                                <div className="flex flex-col items-center gap-1">
                                                    <div className="text-[10px] font-bold text-slate-300 flex items-center gap-1"><User size={10}/> PIC_SYSTEM</div>
                                                    <div className="text-[9px] font-mono text-slate-500">{plan.confirmedAt}</div>
                                                </div>
                                            ) : '--'}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
