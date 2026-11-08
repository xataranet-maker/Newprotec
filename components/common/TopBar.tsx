
import React from 'react';
import { User, Search, Menu, CloudFog, RefreshCcw, CheckCircle2 } from 'lucide-react';
import { UserAccount } from '../../types';

interface TopBarProps {
  currentUser: UserAccount | null;
  activeTabLabel: string;
  activeItemLabel: string;
  toggleSidebar?: () => void;
  isSyncing?: boolean;
  onSync?: () => void;
  lastSyncTime?: string | null;
}

export const TopBar: React.FC<TopBarProps> = ({ 
  currentUser, 
  activeTabLabel, 
  activeItemLabel,
  toggleSidebar,
  isSyncing,
  onSync,
  lastSyncTime
}) => {
  return (
    <div className="h-10 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 flex items-center justify-between px-4 sticky top-0 z-30 shadow-sm">
      
      {/* Left: Breadcrumbs & Toggle */}
      <div className="flex items-center gap-3">
        <button onClick={toggleSidebar} className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors">
            <Menu size={16} />
        </button>
        
        <div className="flex flex-col justify-center">
            <div className="flex items-center gap-2 text-[9px] font-bold text-slate-500 uppercase tracking-wider leading-none mb-0.5">
                <span>NEWPROTEC SYSTEM</span>
                <span className="bg-green-500/20 text-green-400 px-1 rounded text-[8px]">ONLINE</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-200 leading-none">
                <span className="text-slate-500">{activeTabLabel}</span>
                {activeItemLabel && (
                    <>
                        <span className="text-slate-600 text-[10px]">/</span>
                        <span className="text-blue-400">{activeItemLabel}</span>
                    </>
                )}
            </div>
        </div>
      </div>

      {/* Center: Search & Sync Status */}
      <div className="hidden md:flex flex-1 max-w-sm mx-4 items-center gap-4">
        <div className="relative w-full group">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-blue-500 transition-colors" size={12} />
            <input 
                type="text" 
                placeholder="Tìm kiếm nhanh..." 
                className="w-full bg-slate-950 border border-slate-800 rounded-full py-1 pl-8 pr-3 text-[10px] text-slate-300 focus:outline-none focus:border-blue-500/50 transition-all h-7"
            />
        </div>
      </div>

      {/* Right: Cloud Sync & User Info */}
      <div className="flex items-center gap-3">
        
        {/* NÚT LƯU ĐÁM MÂY (GLOBAL SYNC) */}
        <div className="flex items-center gap-2 border-r border-slate-800 pr-3 mr-1">
             <div className="hidden lg:flex flex-col items-end leading-none">
                <span className="text-[8px] text-slate-500 font-black uppercase">Đám mây</span>
                <span className="text-[9px] text-slate-400 font-mono">{lastSyncTime ? `Lúc ${lastSyncTime}` : 'Chưa đồng bộ'}</span>
             </div>
             <button 
                onClick={onSync}
                disabled={isSyncing}
                className={`p-1.5 rounded-lg border transition-all flex items-center justify-center group
                    ${isSyncing 
                        ? 'bg-blue-900/30 border-blue-500 text-blue-400 cursor-wait' 
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-blue-500 hover:text-blue-400 active:scale-90'}
                `}
                title="Đồng bộ dữ liệu ngay lập tức"
             >
                {isSyncing ? (
                    <RefreshCcw size={16} className="animate-spin" />
                ) : (
                    <CloudFog size={16} className="group-hover:animate-pulse" />
                )}
             </button>
        </div>
        
        <div className="flex items-center gap-2">
            <div className="text-right hidden sm:block leading-tight">
                <div className="text-[10px] font-bold text-white">{currentUser?.fullName || 'Guest'}</div>
                <div className="text-[8px] text-slate-500 uppercase">{currentUser?.role || 'Visitor'}</div>
            </div>
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 p-[1px]">
                <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center">
                    <User size={12} className="text-white"/>
                </div>
            </div>
        </div>

      </div>
    </div>
  );
};
