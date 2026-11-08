
import React, { useState } from 'react';
import { CalendarRange, Send, Target, Box, Cpu, HardDrive, Wrench, Layers, Zap, Disc, MousePointer2 } from 'lucide-react';
import { NetDataRecord, ProductionPlan, UserAccount } from '../../types';

interface ProductionPlanningHubProps {
    allNetData: NetDataRecord[];
    onAddPlan: (plan: ProductionPlan) => void;
    currentUser: UserAccount | null;
}

const PLAN_TARGET_DEPTS = [
    { id: 'MULTI', label: 'MULTI AUTO', color: 'text-blue-400', bg: 'bg-blue-600/10', border: 'border-blue-500/30' },
    { id: 'SUS_AUTO', label: 'SUS AUTO', color: 'text-orange-400', bg: 'bg-orange-600/10', border: 'border-orange-500/30' },
    { id: 'SUS_SEMI', label: 'SUS SEMI', color: 'text-purple-400', bg: 'bg-purple-600/10', border: 'border-purple-500/30' },
    { id: 'TAPE_AUTO', label: 'TAPE AUTO', color: 'text-blue-400', bg: 'bg-blue-600/10', border: 'border-blue-500/30' },
    { id: 'TAPE_JIG', label: 'TAPE JIG', color: 'text-cyan-400', bg: 'bg-cyan-600/10', border: 'border-cyan-500/30' },
    { id: 'MOLD', label: 'KHUÔN & JIG', color: 'text-orange-500', bg: 'bg-orange-600/10', border: 'border-orange-500/30' },
    { id: 'STAMPING', label: 'DẬP TỰ ĐỘNG', color: 'text-purple-500', bg: 'bg-purple-600/10', border: 'border-purple-500/30' },
];

export const ProductionPlanningHub: React.FC<ProductionPlanningHubProps> = ({ allNetData, onAddPlan, currentUser }) => {
    const [planStates, setPlanStates] = useState<Record<string, { model: string, content: string }>>({
        'MULTI': { model: '', content: '' },
        'SUS_AUTO': { model: '', content: '' },
        'SUS_SEMI': { model: '', content: '' },
        'TAPE_AUTO': { model: '', content: '' },
        'TAPE_JIG': { model: '', content: '' },
        'MOLD': { model: '', content: '' },
        'STAMPING': { model: '', content: '' },
    });

    const handleUpdate = (deptId: string, field: string, val: string) => {
        setPlanStates(prev => ({ ...prev, [deptId]: { ...prev[deptId], [field]: val } }));
    };

    const handleSendPlan = (deptId: string) => {
        const plan = planStates[deptId];
        if (!plan.content) {
            alert("Vui lòng nhập nội dung kế hoạch.");
            return;
        }
        
        const newPlan: ProductionPlan = {
            id: Date.now(),
            targetDept: deptId,
            model: plan.model || 'N/A',
            content: plan.content,
            status: 'PENDING',
            timestamp: new Date().toLocaleString('vi-VN'),
            sender: currentUser?.fullName || 'Hệ thống'
        };

        onAddPlan(newPlan);
        setPlanStates(prev => ({ ...prev, [deptId]: { model: '', content: '' } }));
        alert(`Đã gửi kế hoạch tới bộ phận ${deptId} thành công!`);
    };

    return (
        <div className="h-full flex flex-col bg-[#020617] p-6 text-slate-300 overflow-hidden">
            <div className="flex items-center gap-3 mb-6 shrink-0">
                <div className="p-3 bg-cyan-600 rounded-xl shadow-lg text-white shadow-cyan-900/30">
                    <CalendarRange size={28}/>
                </div>
                <div>
                    <h2 className="text-xl font-black uppercase tracking-widest font-mono">Trung tâm điều phối kế hoạch sản xuất</h2>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">Gửi chỉ đạo sản xuất trực tiếp tới các phòng ban</p>
                </div>
            </div>

            <div className="flex-1 bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col min-h-0">
                <div className="overflow-auto custom-scrollbar flex-1 p-4 space-y-4">
                    {PLAN_TARGET_DEPTS.map(dept => {
                        const models = Array.from(new Set(allNetData.filter(n => {
                            if (dept.id === 'MULTI') return n.layer === 'OUTER' || n.layer === 'INNER';
                            if (dept.id === 'MOLD') return n.layer === 'MOLD';
                            if (dept.id === 'STAMPING') return n.layer === 'STAMPING';
                            return n.layer === dept.id;
                        }).map(n => n.model))).sort();

                        return (
                            <div key={dept.id} className={`grid grid-cols-12 gap-4 p-5 rounded-xl border-2 transition-all hover:scale-[1.01] ${dept.bg} ${dept.border}`}>
                                <div className="col-span-12 md:col-span-2 flex flex-col justify-center">
                                    <span className={`font-black text-xs uppercase tracking-wider ${dept.color}`}>{dept.label}</span>
                                    <span className="text-[8px] text-slate-500 font-bold mt-1 uppercase">Target Department</span>
                                </div>
                                
                                <div className="col-span-12 md:col-span-3">
                                    <label className="block text-[9px] font-black text-slate-500 uppercase mb-1.5 ml-1">Chọn Model</label>
                                    <select 
                                        value={planStates[dept.id].model}
                                        onChange={e => handleUpdate(dept.id, 'model', e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-blue-500 font-bold shadow-inner"
                                    >
                                        <option value="">-- Model (Tùy chọn) --</option>
                                        {models.map(m => <option key={m} value={m}>{m}</option>)}
                                    </select>
                                </div>

                                <div className="col-span-12 md:col-span-5">
                                    <label className="block text-[9px] font-black text-slate-500 uppercase mb-1.5 ml-1">Nội dung chỉ đạo / Kế hoạch</label>
                                    <input 
                                        type="text"
                                        value={planStates[dept.id].content}
                                        onChange={e => handleUpdate(dept.id, 'content', e.target.value)}
                                        placeholder="Nhập yêu cầu sản xuất, số lượng, lưu ý kỹ thuật..."
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-xs text-white outline-none focus:border-blue-500 shadow-inner"
                                    />
                                </div>

                                <div className="col-span-12 md:col-span-2 flex items-end">
                                    <button 
                                        onClick={() => handleSendPlan(dept.id)}
                                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-2 rounded-lg text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg border border-blue-500 active:scale-95"
                                    >
                                        <Send size={14}/> Gửi Lệnh
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
                
                <div className="p-4 bg-slate-900 border-t border-slate-700 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-4 text-[9px] font-black text-slate-500 uppercase tracking-widest">
                        <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div> Dispatch Service Active</div>
                    </div>
                    <span className="text-[9px] font-mono text-slate-600 italic">NEWPROTEC PLANNING HUB V2.0</span>
                </div>
            </div>
        </div>
    );
};
