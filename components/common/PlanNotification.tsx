
import React from 'react';
import { CalendarRange, Check, AlertCircle, Clock, Send } from 'lucide-react';
import { ProductionPlan } from '../../types';

interface PlanNotificationProps {
    plans: ProductionPlan[];
    onConfirm: (planId: number) => void;
    departmentId: string;
}

export const PlanNotification: React.FC<PlanNotificationProps> = ({ plans, onConfirm, departmentId }) => {
    const pendingPlans = plans.filter(p => p.targetDept === departmentId && p.status === 'PENDING');

    if (pendingPlans.length === 0) return null;

    return (
        <div className="flex flex-col gap-3 mb-6 animate-in slide-in-from-top-4 duration-500">
            {pendingPlans.map(plan => (
                <div key={plan.id} className="bg-slate-800 border-2 border-cyan-500/50 rounded-2xl p-4 shadow-[0_0_30px_rgba(6,182,212,0.15)] flex flex-col md:flex-row items-center justify-between gap-4 relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-1 h-full bg-cyan-500"></div>
                    <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity"><CalendarRange size={60}/></div>
                    
                    <div className="flex items-center gap-4 flex-1">
                        <div className="p-3 bg-cyan-600 rounded-xl text-white shadow-lg animate-pulse">
                            <CalendarRange size={24}/>
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-xs font-black text-cyan-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                <AlertCircle size={14}/> KẾ HOẠCH MỚI TỪ ĐIỀU ĐỘ
                            </h3>
                            <div className="flex items-center gap-3">
                                <span className="text-sm font-black text-white uppercase">{plan.model}</span>
                                <span className="w-1 h-1 bg-slate-700 rounded-full"></span>
                                <span className="text-xs text-slate-300 font-medium leading-relaxed">{plan.content}</span>
                            </div>
                            <div className="flex items-center gap-3 text-[10px] text-slate-500 font-bold uppercase mt-1 font-mono">
                                <span className="flex items-center gap-1"><Clock size={12}/> {plan.timestamp}</span>
                                <span>Gửi bởi: {plan.sender}</span>
                            </div>
                        </div>
                    </div>

                    <button 
                        onClick={() => onConfirm(plan.id)}
                        className="px-6 py-2.5 bg-green-600 hover:bg-green-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 shadow-xl border border-green-500 flex items-center gap-2 shrink-0 z-10"
                    >
                        <Check size={16}/> XÁC NHẬN NHẬN LỆNH
                    </button>
                </div>
            ))}
        </div>
    );
};
