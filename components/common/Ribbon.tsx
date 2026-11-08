
import React from 'react';
import { RibbonTab, RibbonItem, RibbonGroup, Language, UserRole } from '../../types';
import { ChevronDown, ChevronUp, Minus, Square, X, Activity, Box, LayoutGrid } from 'lucide-react';
import { translations } from '../../data/locales';

interface RibbonProps {
  tabs: RibbonTab[];
  activeTabId: string;
  onTabChange: (tabId: string) => void;
  onItemClick: (itemId: string) => void;
  isCollapsed?: boolean;
  toggleCollapse?: () => void;
  language?: Language;
  userRole?: UserRole;
}

const getTheme = (tabId: string) => {
    switch (tabId) {
        case 'Multi':
            return { accent: 'text-blue-400', border: 'border-blue-500', bgActive: 'bg-blue-900/20', icon: 'text-blue-400', dot: 'bg-blue-500' };
        case 'stiff':
            return { accent: 'text-green-400', border: 'border-green-500', bgActive: 'bg-green-900/20', icon: 'text-green-400', dot: 'bg-green-500' };
        case 'mold_jig':
            return { accent: 'text-orange-400', border: 'border-orange-500', bgActive: 'bg-orange-900/20', icon: 'text-orange-400', dot: 'bg-orange-500' };
        case 'auto_stamping':
            return { accent: 'text-purple-400', border: 'border-purple-500', bgActive: 'bg-purple-900/20', icon: 'text-purple-400', dot: 'bg-purple-500' };
        case 'equipment_dept':
        case 'hr_admin':
        case 'quality_dept':
            return { accent: 'text-cyan-400', border: 'border-cyan-500', bgActive: 'bg-cyan-900/20', icon: 'text-cyan-400', dot: 'bg-cyan-500' };
        case 'admin':
            return { accent: 'text-red-400', border: 'border-red-500', bgActive: 'bg-red-900/20', icon: 'text-red-400', dot: 'bg-red-500' };
        default:
            return { accent: 'text-slate-200', border: 'border-slate-400', bgActive: 'bg-slate-800', icon: 'text-slate-300', dot: 'bg-slate-400' };
    }
};

export const Ribbon: React.FC<RibbonProps> = ({ 
  tabs, activeTabId, onTabChange, onItemClick, isCollapsed = false, toggleCollapse, language = 'en', userRole = 'user'
}) => {
  const activeTab = tabs.find(t => t.id === activeTabId);
  const t = translations[language];
  const activeTheme = getTheme(activeTabId);
  const tr = (key: string) => t[key] || key;

  return (
    <div className="flex flex-col z-50 bg-[#020617] border-b border-slate-800 shadow-2xl relative">
      {/* Top System Bar */}
      <div className="h-9 bg-black/40 flex items-center justify-between px-4 border-b border-slate-800/50">
         <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-gradient-to-br from-blue-600 to-indigo-700 rounded shadow-lg flex items-center justify-center text-[10px] font-black text-white">PT</div>
                <span className="text-[10px] font-black text-slate-400 tracking-tighter uppercase font-mono">Newprotec Core v2.0</span>
            </div>
            <div className="h-3 w-px bg-slate-700"></div>
            <div className={`text-[10px] font-bold uppercase tracking-widest ${activeTheme.accent}`}>
                {activeTab ? tr(activeTab.label) : 'Home'}
            </div>
         </div>
         <div className="flex items-center gap-4">
             <div className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-900 rounded border border-slate-800">
                 <Activity size={10} className="text-green-500 animate-pulse"/>
                 <span className="text-[8px] font-black text-green-500 font-mono">SYSTEM_STABLE</span>
             </div>
             <div className="flex items-center gap-1">
                 <button className="p-1.5 text-slate-500 hover:text-white hover:bg-slate-800 rounded transition-all"><Minus size={14}/></button>
                 <button className="p-1.5 text-slate-500 hover:text-white hover:bg-slate-800 rounded transition-all"><Square size={10}/></button>
                 <button className="p-1.5 text-slate-500 hover:bg-red-600 hover:text-white rounded transition-all"><X size={14}/></button>
             </div>
         </div>
      </div>

      {/* Tabs Header */}
      <div className="flex items-end px-3 pt-1 bg-slate-900/50 space-x-1 overflow-x-auto no-scrollbar">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          const theme = getTheme(tab.id);
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`
                px-5 py-2 text-[10px] font-black transition-all duration-200 whitespace-nowrap rounded-t-xl mx-0.5 uppercase tracking-widest border-t-2 border-x
                ${isActive 
                  ? `bg-slate-800 text-white ${theme.border} border-b-slate-800 relative top-[1px] z-10 shadow-[0_-4px_15px_rgba(0,0,0,0.3)]` 
                  : 'bg-transparent text-slate-500 border-transparent hover:text-slate-300 hover:bg-slate-800/40'
                }
              `}
            >
              {tr(tab.label)}
            </button>
          );
        })}
        <div className="flex-1"></div>
        <button onClick={toggleCollapse} className="p-2 mb-1 text-slate-500 hover:text-white transition-colors">
           {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        </button>
      </div>

      {/* Ribbon Content (The Groups) */}
      {!isCollapsed && activeTab && (
        <div className="bg-slate-800 h-[92px] flex overflow-x-auto custom-scrollbar w-full py-2 px-2 border-t border-slate-700 shadow-inner">
          {activeTab.groups
            .filter(group => !group.allowedRoles || (userRole && group.allowedRoles.includes(userRole)))
            .map((group) => (
            <div key={group.id} className="flex flex-col h-full border-r border-slate-700/50 px-3 shrink-0 last:border-0 justify-between group">
              <div className="flex-1 flex items-center justify-center gap-1.5">
                {group.items.map((item) => (
                  <RibbonButton 
                    key={item.id} 
                    item={item} 
                    label={tr(item.label)} 
                    onClick={() => onItemClick(item.id)} 
                    theme={activeTheme}
                  />
                ))}
              </div>
              <div className="w-full text-[8px] text-center text-slate-500 font-black truncate px-1 uppercase tracking-widest font-mono group-hover:text-slate-400 transition-colors">
                {tr(group.label)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const RibbonButton: React.FC<{ item: RibbonItem; label: string; onClick: () => void; theme: any }> = ({ item, label, onClick, theme }) => {
  const Icon = item.icon;
  if (item.isLarge) {
    return (
      <button 
        onClick={onClick}
        className="flex flex-col items-center justify-center h-[62px] min-w-[54px] px-2 rounded-lg border border-transparent hover:border-slate-600 hover:bg-slate-700/50 transition-all active:scale-95 group"
      >
        <div className={`${theme.icon} mb-1 group-hover:scale-110 transition-transform duration-200 drop-shadow-[0_0_8px_rgba(255,255,255,0.1)]`}>
          <Icon size={24} strokeWidth={1.5} />
        </div>
        <span className="text-[9px] leading-tight text-center text-slate-400 font-bold uppercase tracking-tighter group-hover:text-white">
          {label}
        </span>
      </button>
    );
  }

  return (
    <button 
      onClick={onClick}
      className="flex items-center gap-2 h-7 px-2 w-full rounded border border-transparent hover:border-slate-700 hover:bg-slate-700/30 active:scale-95 transition-all group"
    >
      <div className={theme.icon}><Icon size={14} /></div>
      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter group-hover:text-white whitespace-nowrap">{label}</span>
    </button>
  );
};
