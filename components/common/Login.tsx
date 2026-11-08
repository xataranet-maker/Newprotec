
import React, { useState, useEffect } from 'react';
import { User, Lock, ArrowRight } from 'lucide-react';
import { UserAccount, Language, StaffRecord } from '../../types';
import { translations } from '../../data/locales';

interface LoginProps {
  users: UserAccount[];
  allStaff?: StaffRecord[]; 
  onLogin: (user: UserAccount) => void;
  language: Language;
  onLanguageChange: (lang: Language) => void;
}

export const Login: React.FC<LoginProps> = ({ users, allStaff = [], onLogin, language, onLanguageChange }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const t = translations[language];

  useEffect(() => {
      const savedLang = localStorage.getItem('app_language') as Language;
      if (savedLang && (savedLang === 'vi' || savedLang === 'ko') && savedLang !== language) {
          onLanguageChange(savedLang);
      }
      const savedCreds = localStorage.getItem('app_creds');
      if (savedCreds) {
          try {
              const parsed = JSON.parse(atob(savedCreds));
              if (parsed.username) { 
                  setUsername(parsed.username); 
                  setPassword(parsed.password || ''); 
                  setRememberMe(true); 
              }
          } catch (e) { 
              localStorage.removeItem('app_creds'); 
          }
      }
  }, []);

  const handleLanguageSwitch = (lang: Language) => {
      localStorage.setItem('app_language', lang);
      onLanguageChange(lang);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    const cleanUser = username.trim();
    const cleanPass = password.trim();

    if (rememberMe) {
        localStorage.setItem('app_creds', btoa(JSON.stringify({ username: cleanUser, password: cleanPass })));
    } else {
        localStorage.removeItem('app_creds');
    }

    setTimeout(() => {
        const user = users.find(u => u.username.toLowerCase() === cleanUser.toLowerCase());
        if (user && user.password === cleanPass) {
            onLogin(user);
        } else if (allStaff.length > 0) {
            const staff = allStaff.find(s => s.employeeId === cleanUser && s.employeeId === cleanPass);
            if (staff) {
                onLogin({ username: staff.employeeId, fullName: staff.fullName, role: 'staff', employeeId: staff.employeeId, department: staff.department });
            } else { 
                setError(t.login_error); 
                setIsLoading(false); 
            }
        } else { 
            setError(t.login_error); 
            setIsLoading(false); 
        }
    }, 600);
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#020205]" style={{ fontFamily: "'Times New Roman', serif" }}>
        <style>{`
            .night-glow-text {
                color: #ffffff;
                text-shadow: 
                    0 0 5px #0073e6,
                    0 0 10px #0073e6,
                    0 0 20px #0073e6,
                    0 0 40px #0073e6,
                    0 0 80px #0073e6;
                position: relative;
                z-index: 10;
            }
            .night-logo-glow {
                filter: drop-shadow(0 0 15px rgba(0, 115, 230, 0.9)) drop-shadow(0 0 30px rgba(0, 115, 230, 0.6));
                animation: pulse-glow 3s infinite alternate;
            }
            .backlight-beam {
                background: radial-gradient(circle at center, rgba(0, 115, 230, 0.4) 0%, rgba(0,0,0,0) 70%);
                position: absolute;
                width: 150%;
                height: 150%;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                z-index: 0;
                pointer-events: none;
                animation: beam-flicker 5s infinite;
            }
            @keyframes pulse-glow {
                0% { filter: drop-shadow(0 0 15px rgba(0, 115, 230, 0.9)); }
                100% { filter: drop-shadow(0 0 25px rgba(0, 115, 230, 1)); }
            }
            @keyframes beam-flicker {
                0%, 100% { opacity: 0.8; }
                50% { opacity: 1; }
                52% { opacity: 0.85; }
                54% { opacity: 1; }
            }
            .glass-panel {
                background: rgba(10, 10, 20, 0.6);
                backdrop-filter: blur(12px);
                border: 1px solid rgba(0, 115, 230, 0.2);
                box-shadow: 0 0 30px rgba(0, 0, 0, 0.8), inset 0 0 20px rgba(0, 115, 230, 0.05);
            }
            .night-input {
                background: rgba(0, 0, 0, 0.5) !important;
                border-color: rgba(0, 115, 230, 0.3) !important;
                color: #e0e0e0 !important;
            }
            .night-input:focus {
                border-color: #0073e6 !important;
                box-shadow: 0 0 10px rgba(0, 115, 230, 0.3) !important;
            }
        `}</style>
        
        {/* Ambient Background */}
        <div className="absolute inset-0 bg-[#020205]"></div>
        <div className="backlight-beam"></div>

        {/* Language Switcher */}
        <div className="absolute top-6 right-6 z-20 flex gap-2">
             <button onClick={() => handleLanguageSwitch('vi')} className={`flex items-center gap-1 px-3 py-1.5 rounded-full border transition-all text-xs font-bold ${language === 'vi' ? 'bg-blue-900/50 border-blue-500 text-blue-200 shadow-[0_0_10px_blue]' : 'bg-transparent border-slate-700 text-slate-500 hover:text-white'}`}>VN</button>
             <button onClick={() => handleLanguageSwitch('ko')} className={`flex items-center gap-1 px-3 py-1.5 rounded-full border transition-all text-xs font-bold ${language === 'ko' ? 'bg-blue-900/50 border-blue-500 text-blue-200 shadow-[0_0_10px_blue]' : 'bg-transparent border-slate-700 text-slate-500 hover:text-white'}`}>KR</button>
             <button onClick={() => handleLanguageSwitch('en')} className={`flex items-center gap-1 px-3 py-1.5 rounded-full border transition-all text-xs font-bold ${language === 'en' ? 'bg-blue-900/50 border-blue-500 text-blue-200 shadow-[0_0_10px_blue]' : 'bg-transparent border-slate-700 text-slate-500 hover:text-white'}`}>EN</button>
        </div>

        <div className="w-full max-w-md glass-panel rounded-2xl p-8 z-10 animate-in fade-in duration-1000 relative">
            <div className="flex flex-col items-center mb-10">
                {/* Glowing 3D Logo */}
                <div className="mb-6 night-logo-glow transition-transform duration-500 hover:scale-105">
                    <svg width="140" height="84" viewBox="0 0 40 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M0 12L20 0V24L0 12Z" fill="#1e3a8a" stroke="white" strokeWidth="0.5"/>
                        <path d="M20 0L40 12L20 24V0Z" fill="#ea580c" stroke="white" strokeWidth="0.5"/>
                        <text x="10" y="17" fontFamily="serif" fontSize="14" fontWeight="bold" fill="white" textAnchor="middle" style={{textShadow: '0 0 5px #00bfff'}}>P</text>
                        <text x="30" y="17" fontFamily="serif" fontSize="14" fontWeight="bold" fill="white" textAnchor="middle" style={{textShadow: '0 0 5px #00bfff'}}>T</text>
                    </svg>
                </div>
                
                <h1 className="text-5xl font-black tracking-widest mb-2 night-glow-text">
                    {t.login_title}
                </h1>
                
                <div className="text-blue-300/60 text-[10px] font-mono tracking-[0.5em] uppercase border-t border-blue-500/30 pt-3 w-full text-center">
                    System Secure Login
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                    <label className="text-[10px] font-bold text-blue-400/80 uppercase ml-1 tracking-wider">{t.username} / ID</label>
                    <div className="relative group">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" size={18} />
                        <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full pl-10 pr-4 py-3 rounded-xl outline-none transition-all font-mono text-sm night-input" placeholder="User ID..." autoFocus />
                    </div>
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-bold text-blue-400/80 uppercase ml-1 tracking-wider">{t.password}</label>
                    <div className="relative group">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" size={18} />
                        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full pl-10 pr-4 py-3 rounded-xl outline-none transition-all font-mono text-sm night-input" placeholder="••••••••" />
                    </div>
                </div>
                
                <div className="flex items-center">
                    <input id="remember-me-night" type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="w-4 h-4 text-blue-600 bg-black border-slate-700 rounded focus:ring-blue-500 focus:ring-offset-0" />
                    <label htmlFor="remember-me-night" className="ml-2 text-xs font-bold text-slate-400 select-none cursor-pointer uppercase">{t.remember_me}</label>
                </div>

                {error && <div className="p-3 rounded-lg bg-red-900/30 border border-red-800 text-red-300 text-xs font-bold flex items-center justify-center animate-in fade-in slide-in-from-top-1 text-center shadow-[0_0_15px_rgba(220,38,38,0.2)]">{error}</div>}

                <button type="submit" disabled={isLoading} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-xl shadow-[0_0_20px_rgba(37,99,235,0.4)] flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed mt-4 border border-blue-400/50 uppercase tracking-widest text-xs">
                    {isLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <>{t.login_btn} <ArrowRight size={16} /></>}
                </button>
            </form>
            
            <div className="mt-8 text-center border-t border-slate-800/50 pt-4">
                <p className="text-[9px] text-slate-600 uppercase tracking-widest font-mono">
                    {t.copyright}
                </p>
            </div>
        </div>
    </div>
  );
};
