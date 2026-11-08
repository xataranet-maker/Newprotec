
import React, { useState, useEffect, useRef } from 'react';
import { X, Keyboard, ArrowRight } from 'lucide-react';

interface ScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (decodedText: string) => void;
  defaultMode?: 'MANUAL'; 
}

export const ScannerModal: React.FC<ScannerModalProps> = ({ 
    isOpen, 
    onClose, 
    onScanSuccess
}) => {
  const [code, setCode] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus vào ô nhập khi mở modal
  useEffect(() => {
    if (isOpen) {
      setCode('');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSuccess = (text: string) => {
      onScanSuccess(text.trim().toUpperCase());
      onClose();
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (code.trim()) {
      handleSuccess(code);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-slate-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-600 flex flex-col">
        {/* Header */}
        <div className="bg-slate-900 text-white p-4 flex justify-between items-center border-b border-slate-700 shrink-0">
             <div className="flex items-center gap-2">
                 <Keyboard className="text-blue-400" />
                 <span className="font-bold uppercase tracking-wider text-sm">
                     Nhập Mã Thủ Công
                 </span>
             </div>
             <button onClick={onClose} className="hover:bg-white/10 p-1 rounded transition-colors text-slate-400 hover:text-white">
                 <X size={20} />
             </button>
        </div>

        {/* Content Area */}
        <div className="p-8 flex flex-col gap-4 bg-slate-800">
             <form onSubmit={handleSubmit} className="flex flex-col gap-6 h-full justify-center">
                 <div className="relative">
                    <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 ml-1 text-center">
                        Sử dụng máy quét cầm tay hoặc bàn phím
                    </label>
                    <input 
                        ref={inputRef}
                        type="text" 
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-500 rounded-lg px-4 py-5 text-center font-mono text-2xl font-bold text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none placeholder-slate-800 uppercase tracking-widest shadow-inner"
                        placeholder="MÃ SỐ..."
                        autoComplete="off"
                    />
                 </div>
                 
                 <button 
                    type="submit"
                    disabled={!code.trim()}
                    className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-black py-4 rounded-xl flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-lg border-b-4 border-blue-800 uppercase tracking-widest text-xs"
                 >
                     Xác nhận dữ liệu <ArrowRight size={20}/>
                 </button>

                 <p className="text-center text-slate-600 text-[9px] uppercase font-bold tracking-tighter">
                    Hệ thống sẽ tự động chuyển đổi sang chữ in hoa
                 </p>
             </form>
        </div>
      </div>
    </div>
  );
};
