
import React from 'react';
import { ClipboardCheck } from 'lucide-react';

export const QualityChecksheet: React.FC = () => {
  return (
    <div className="p-6 h-full overflow-y-auto bg-slate-900 flex flex-col gap-6 text-slate-300 font-sans">
      <div className="bg-slate-800 px-6 py-4 rounded-xl shadow-lg border border-slate-700 flex items-center gap-3">
        <div className="p-2 bg-orange-600 rounded-lg shadow-lg shadow-orange-900/50 text-white">
          <ClipboardCheck size={24} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white uppercase tracking-wider font-mono">CHECKSHEET ĐIỆN TỬ</h1>
          <p className="text-xs text-slate-400">Biểu mẫu kiểm tra hàng ngày, tuần, tháng</p>
        </div>
      </div>

      <div className="bg-slate-800 rounded-xl border border-slate-700 p-12 text-center flex flex-col items-center justify-center h-64">
          <ClipboardCheck size={48} className="text-slate-600 mb-4 opacity-50"/>
          <h3 className="text-lg font-bold text-slate-400">Tính năng đang phát triển</h3>
          <p className="text-sm text-slate-500 mt-2">Hệ thống checksheet số hóa sẽ sớm được cập nhật.</p>
      </div>
    </div>
  );
};
