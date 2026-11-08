
import React from 'react';
import { BarChart3, TrendingUp, AlertTriangle, ShieldCheck } from 'lucide-react';

export const QualityDashboard: React.FC = () => {
  return (
    <div className="p-6 h-full overflow-y-auto bg-slate-900 flex flex-col gap-6 text-slate-300 font-sans">
      <div className="bg-slate-800 px-6 py-4 rounded-xl shadow-lg border border-slate-700 flex items-center gap-3">
        <div className="p-2 bg-teal-600 rounded-lg shadow-lg shadow-teal-900/50 text-white">
          <BarChart3 size={24} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white uppercase tracking-wider font-mono">BÁO CÁO CHẤT LƯỢNG (QA/QC)</h1>
          <p className="text-xs text-slate-400">Tổng hợp tình hình chất lượng toàn nhà máy</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Card 1: Error Rate (Red) */}
        <div className="bg-slate-800 p-4 rounded-xl border border-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.1)] flex flex-col justify-between">
            <div className="flex justify-between items-center mb-1">
                <h3 className="text-xs font-bold text-slate-400 uppercase">Tỉ lệ lỗi (PPM)</h3>
                <span className="text-xl font-bold text-red-500 font-mono">1,250</span>
            </div>
            <span className="text-[10px] text-slate-500">Tháng hiện tại</span>
        </div>

        {/* Card 2: Pass Rate (Green) */}
         <div className="bg-slate-800 p-4 rounded-xl border border-green-500/50 shadow-[0_0_10px_rgba(34,197,94,0.1)] flex flex-col justify-between">
            <div className="flex justify-between items-center mb-1">
                <h3 className="text-xs font-bold text-slate-400 uppercase">Tỉ lệ đạt (First Pass)</h3>
                <span className="text-xl font-bold text-green-500 font-mono">98.5%</span>
            </div>
            <span className="text-[10px] text-slate-500">Target: 99%</span>
        </div>

        {/* Card 3: Incidents (Orange) */}
         <div className="bg-slate-800 p-4 rounded-xl border border-orange-500/50 shadow-[0_0_10px_rgba(249,115,22,0.1)] flex flex-col justify-between">
            <div className="flex justify-between items-center mb-1">
                <h3 className="text-xs font-bold text-slate-400 uppercase">Sự cố khách hàng</h3>
                <span className="text-xl font-bold text-orange-500 font-mono">2</span>
            </div>
            <span className="text-[10px] text-slate-500">Claim/Complaint</span>
        </div>

        {/* Card 4: Solutions (Blue) */}
         <div className="bg-slate-800 p-4 rounded-xl border border-blue-500/50 shadow-[0_0_10px_rgba(59,130,246,0.1)] flex flex-col justify-between">
            <div className="flex justify-between items-center mb-1">
                <h3 className="text-xs font-bold text-slate-400 uppercase">Đối sách hoàn thành</h3>
                <span className="text-xl font-bold text-blue-500 font-mono">85%</span>
            </div>
            <span className="text-[10px] text-slate-500">Tiến độ xử lý</span>
        </div>
      </div>

      <div className="bg-slate-800 rounded-xl border border-slate-700 p-8 text-center text-slate-500 italic">
          Biểu đồ và chi tiết báo cáo đang được phát triển...
      </div>
    </div>
  );
};
