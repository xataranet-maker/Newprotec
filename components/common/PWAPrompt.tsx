
import React, { useState, useEffect } from 'react';
import { Download, X, AppWindow, Smartphone, Monitor, CheckCircle2, Sparkles, Zap, ArrowBigDown } from 'lucide-react';

export const PWAPrompt: React.FC = () => {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [showPrompt, setShowPrompt] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);
    const [platform, setPlatform] = useState<'IOS' | 'OTHER'>('OTHER');

    useEffect(() => {
        // Kiểm tra xem ứng dụng đã chạy ở chế độ standalone chưa
        const isAppMode = window.matchMedia('(display-mode: standalone)').matches || 
                          (window.navigator as any).standalone === true;
        
        setIsStandalone(isAppMode);
        
        // Kiểm tra hệ điều hành
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
        if (isIOS) setPlatform('IOS');

        // Lắng nghe sự kiện cài đặt của Chrome/Android
        const handler = (e: any) => {
            e.preventDefault();
            setDeferredPrompt(e);
            
            // Hiển thị prompt sau 5 giây nếu chưa cài đặt và chưa từng tắt trong phiên này
            const timer = setTimeout(() => {
                const hasDismissed = sessionStorage.getItem('pwa_prompt_dismissed');
                if (!hasDismissed && !isAppMode) {
                    setShowPrompt(true);
                }
            }, 5000);
            
            return () => clearTimeout(timer);
        };

        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstall = async () => {
        if (platform === 'IOS') {
            alert("Để cài đặt trên iPhone/iPad:\n1. Nhấn nút 'Chia sẻ' (Share icon) ở trình duyệt Safari.\n2. Chọn 'Thêm vào màn hình chính' (Add to Home Screen).");
            return;
        }

        if (!deferredPrompt) return;
        
        setShowPrompt(false);
        deferredPrompt.prompt();
        
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`User response to install: ${outcome}`);
        setDeferredPrompt(null);
    };

    const handleDismiss = () => {
        setShowPrompt(false);
        sessionStorage.setItem('pwa_prompt_dismissed', 'true');
    };

    if (isStandalone || !showPrompt) return null;

    return (
        <div className="fixed bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-[420px] z-[9999] animate-in slide-in-from-bottom-20 fade-in duration-700">
            <div className="bg-[#0f172a]/95 backdrop-blur-2xl border border-blue-500/40 rounded-[32px] shadow-[0_25px_60px_rgba(0,0,0,0.7)] p-1 overflow-hidden">
                {/* Glowing Top Bar */}
                <div className="h-1 w-full bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-60"></div>
                
                <div className="p-6 bg-[#020617]/40 rounded-[30px] relative">
                    <button 
                        onClick={handleDismiss}
                        className="absolute top-4 right-4 p-2 text-slate-500 hover:text-white hover:bg-white/10 rounded-full transition-all"
                    >
                        <X size={20} />
                    </button>

                    <div className="flex gap-5 items-start mb-6">
                        <div className="relative shrink-0 mt-1">
                            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center text-white shadow-[0_0_25px_rgba(37,99,235,0.4)] border border-blue-400/30">
                                <AppWindow size={36} className="animate-pulse" />
                            </div>
                            <div className="absolute -bottom-2 -right-2 bg-green-500 rounded-full p-1.5 border-4 border-[#020617] shadow-lg">
                                <CheckCircle2 size={12} className="text-white" />
                            </div>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-black text-white uppercase tracking-tighter mb-1 flex items-center gap-2">
                                Tải Ứng Dụng Newprotec
                                <Sparkles size={16} className="text-yellow-400" />
                            </h3>
                            <p className="text-xs text-slate-400 leading-relaxed font-medium">
                                Sử dụng hệ thống như một ứng dụng thực thụ. Không thanh địa chỉ, truy cập nhanh và mượt mà hơn 30%.
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3">
                        <button 
                            onClick={handleInstall}
                            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black text-sm py-4 rounded-2xl uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-3 shadow-[0_10px_20px_rgba(37,99,235,0.3)] border-b-4 border-blue-800 group"
                        >
                            <Download size={20} className="group-hover:animate-bounce"/>
                            Cài đặt phần mềm
                        </button>
                        <button 
                            onClick={handleDismiss}
                            className="w-full py-3 text-[10px] font-black text-slate-500 hover:text-slate-300 uppercase tracking-widest transition-all"
                        >
                            Sử dụng phiên bản trình duyệt
                        </button>
                    </div>

                    {/* Features Row */}
                    <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between opacity-50 px-2">
                        <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-400 uppercase">
                            <Monitor size={12} className="text-blue-500"/> Standalone
                        </div>
                        <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-400 uppercase">
                            <Smartphone size={12} className="text-purple-500"/> Full Screen
                        </div>
                        <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-400 uppercase">
                            <Zap size={12} className="text-yellow-500"/> High Perf
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
