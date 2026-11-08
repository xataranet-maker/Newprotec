
import React from 'react';
import { RibbonTab, UserRole } from '../../types';
import { translations } from '../../data/locales';
import { 
  ChevronRight, X, Home, LayoutGrid, User as UserIcon, 
  Power, PanelLeftClose, Activity, Cpu, 
  Shield, Settings, Terminal, Zap, Radio,
  Monitor, Box, ClipboardList, Database, Menu, Users
} from 'lucide-react';

interface SidebarProps {
  tabs: RibbonTab[];
  activeTabId: string;
  activeItemId: string;
  onTabChange: (tabId: string) => void;
  onItemClick: (itemId: string) => void;
  language: 'en' | 'vi' | 'ko';
  userRole?: UserRole;
  isCollapsed: boolean; 
  setCollapsed: (collapsed: boolean) => void;
  isDrawerOpen: boolean; 
  setDrawerOpen: (open: boolean) => void;
}

const getTheme = (tabId: string = 'home') => {
    const id = (tabId || 'home').toLowerCase();
    switch (id) {
        case 'multi': return { color: 'bg-blue-500', text: 'text-blue-400', shadow: 'shadow-blue-500/50', border: 'border-blue-500/40', glow: 'drop-shadow-[0_0_8px_rgba(59,130,246,0.6)]', bg: 'bg-blue-500' };
        case 'hr_admin': return { color: 'bg-pink-500', text: 'text-pink-400', shadow: 'shadow-pink-500/50', border: 'border-pink-500/40', glow: 'drop-shadow-[0_0_8px_rgba(236,72,153,0.6)]', bg: 'bg-pink-500' };
        case 'admin': return { color: 'bg-red-500', text: 'text-red-400', shadow: 'shadow-red-500/50', border: 'border-red-500/40', glow: 'drop-shadow-[0_0_8px_rgba(239,68,68,0.6)]', bg: 'bg-red-500' };
        default: return { color: 'bg-slate-500', text: 'text-slate-400', shadow: 'shadow-slate-500/50', border: 'border-slate-500/40', glow: 'none', bg: 'bg-slate-500' };
    }
};

export const Sidebar: React.FC<SidebarProps> = ({ 
  tabs = [], activeTabId, activeItemId, onTabChange, onItemClick, language, userRole, isCollapsed, setCollapsed, isDrawerOpen, setDrawerOpen
}) => {
  const t = translations[language] || translations['en'];
  const tr = (key: string) => t[key] || key;
  const theme = getTheme(activeTabId);

  const activeTab = tabs.find(t => t.id === activeTabId);
  const visibleGroups = activeTab?.groups.filter(group => 
    !group.allowedRoles || (userRole && group.allowedRoles.includes(userRole))
  ) || [];

  return (
    <div className="flex h-full shrink-0 z-[100] relative">
      <style>{`
        .sidebar-glass { background: rgba(10, 15, 28, 0.95); backdrop-filter: blur(20px); }
        .drawer-glass { background: rgba(7, 10, 20, 0.98); backdrop-filter: blur(30px); }
        @keyframes flow { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
        .active-glow { background: linear-gradient(-45deg, #3b82f6, #06b6d4, #3b82f6); background-size: 200% 200%; animation: flow 3s ease infinite; }
      `}</style>

      {/* LEFT RAIL - ICON MENU */}
      <div className={`sidebar-glass border-r border-slate-800/60 flex flex-col items-center py-6 gap-6 transition-all duration-500 shadow-[10px_0_30px_rgba(0,0,0,0.5)] relative z-20 ${isCollapsed ? 'w-20' : 'w-0 overflow-hidden'}`}>
          <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center font-black text-white text-base shadow-[0_0_20px_rgba(37,99,235,0.4)] mb-4 cursor-pointer hover:scale-110 transition-transform" onClick={() => onTabChange('home')}>
              PT
          </div>
          
          <div className="flex-1 flex flex-col gap-3 w-full px-2 overflow-y-auto no-scrollbar">
              {tabs.map(tab => {
                   const isActive = tab.id === activeTabId;
                   const tabTheme = getTheme(tab.id);
                   let Icon = LayoutGrid;
                   if (tab.id === 'home') Icon = Home;
                   else if (tab.id === 'Multi') Icon = Cpu;
                   else if (tab.id === 'hr_admin') Icon = Users;
                   else if (tab.id === 'admin') Icon = Shield;

                   return (
                       <button
                           key={tab.id}
                           onClick={() => { onTabChange(tab.id); setDrawerOpen(true); }}
                           className={`
                             relative group w-full aspect-square rounded-2xl flex flex-col items-center justify-center gap-1 transition-all duration-300
                             ${isActive 
                               ? 'bg-slate-800 text-white shadow-xl border border-slate-700' 
                               : 'bg-transparent text-slate-500 hover:bg-slate-800/40 hover:text-slate-300'
                             }
                           `}
                       >
                           {isActive && (
                               <div className={`absolute -left-1 top-3 bottom-3 w-1 rounded-r-full ${tabTheme.color} shadow-[0_0_10px_currentColor]`}></div>
                           )}
                           <Icon size={22} className={isActive ? tabTheme.text : 'group-hover:scale-110 transition-transform'} />
                           <span className="text-[7px] font-black text-center uppercase tracking-tighter px-1 truncate w-full">{tr(tab.label)}</span>
                       </button>
                   );
              })}
          </div>

          <div className="mt-auto flex flex-col gap-4 w-full px-2 pt-6 border-t border-slate-800/40">
              <button onClick={() => setCollapsed(!isCollapsed)} className="w-full aspect-square rounded-xl bg-slate-900/50 border border-slate-800 flex items-center justify-center text-slate-500 hover:text-blue-400 transition-all"><PanelLeftClose size={18} /></button>
              <button onClick={() => window.location.reload()} className="w-full aspect-square rounded-xl bg-red-950/10 border border-red-900/20 flex items-center justify-center text-red-900/60 hover:bg-red-600 hover:text-white transition-all"><Power size={18}/></button>
          </div>
      </div>

      {/* EXPANDABLE DRAWER - SUBMENU */}
      <div className={`drawer-glass border-r border-slate-700/30 flex flex-col transition-all duration-500 ease-out overflow-hidden shadow-[30px_0_60px_rgba(0,0,0,0.8)] ${isDrawerOpen && isCollapsed ? 'w-[300px]' : 'w-0'}`}>
          <div className="h-20 shrink-0 flex items-center justify-between px-6 border-b border-slate-700/30 bg-black/20">
              <div className="flex flex-col">
                  <span className={`text-[10px] font-black tracking-widest uppercase ${theme.text}`}>{tr(activeTab?.label || '')}</span>
                  <span className="text-[8px] text-slate-500 font-bold uppercase mt-1">Hệ thống điều khiển</span>
              </div>
              <button onClick={() => setDrawerOpen(false)} className="p-2 hover:bg-slate-800 text-slate-500 hover:text-white rounded-lg transition-all"><X size={18} /></button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
              {visibleGroups.map((group) => (
                  <div key={group.id} className="animate-in fade-in slide-in-from-left-4 duration-500">
                      <div className="flex items-center gap-2 mb-4">
                          <div className={`w-1 h-3 ${theme.color} rounded-full`}></div>
                          <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{tr(group.label)}</h4>
                      </div>
                      <div className="space-y-1">
                          {group.items.map(item => {
                              const isActive = activeItemId.toLowerCase() === item.id.toLowerCase();
                              const Icon = item.icon;
                              return (
                                  <button
                                      key={item.id}
                                      onClick={() => { onItemClick(item.id); setDrawerOpen(false); }}
                                      className={`
                                        w-full flex items-center gap-4 px-4 py-3 rounded-xl text-xs font-bold transition-all duration-200 group/item
                                        ${isActive 
                                            ? 'bg-slate-800 border border-slate-700 text-white shadow-lg translate-x-2' 
                                            : 'bg-transparent border border-transparent text-slate-400 hover:bg-slate-800/40 hover:text-slate-200 hover:translate-x-1'
                                        }
                                      `}
                                  >
                                      <Icon size={18} className={isActive ? theme.text : 'text-slate-600 group-hover/item:text-slate-400'} />
                                      <span className="truncate uppercase tracking-tight">{tr(item.label)}</span>
                                      {isActive && <ChevronRight size={14} className="ml-auto text-slate-500" />}
                                  </button>
                              );
                          })}
                      </div>
                  </div>
              ))}
          </div>
      </div>
    </div>
  );
};
