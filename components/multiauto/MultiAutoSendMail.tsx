
import React, { useState, useMemo } from 'react';
import { Mail, Calendar, Send, FileText, CheckCircle2, AlertCircle, Copy, AtSign, Activity, HardDrive } from 'lucide-react';
import { ExportRecord } from '../../types';

interface MultiAutoSendMailProps {
  moduleName?: string;
  exportData: ExportRecord[];
}

export const MultiAutoSendMail: React.FC<MultiAutoSendMailProps> = ({ moduleName = 'Multi Auto', exportData }) => {
  // Default to today
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    return now.toISOString().split('T')[0]; // YYYY-MM-DD
  });
  
  const [recipientEmail, setRecipientEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);

  // 1. Filter and Aggregate Data for the selected date
  const reportData = useMemo(() => {
    // Convert selected YYYY-MM-DD to DD/MM/YYYY to match record format
    const [year, month, day] = selectedDate.split('-');
    const formattedDate = `${day}/${month}/${year}`;

    const dailyRecords = exportData.filter(r => r.date === formattedDate);

    // Group by Model + Code
    const groupedMap = new Map<string, { model: string, code: string, quantity: number, stages: Set<string> }>();

    dailyRecords.forEach(record => {
        const key = `${record.model}-${record.code}`;
        if (!groupedMap.has(key)) {
            groupedMap.set(key, { 
                model: record.model, 
                code: record.code, 
                quantity: 0,
                stages: new Set()
            });
        }
        const entry = groupedMap.get(key)!;
        entry.quantity += record.quantity;
        entry.stages.add(record.stage);
    });

    return Array.from(groupedMap.values()).map(item => ({
        ...item,
        stages: Array.from(item.stages).join(', ')
    }));
  }, [exportData, selectedDate]);

  const totalQuantity = reportData.reduce((sum, item) => sum + item.quantity, 0);

  // 2. Generate Email Content
  const [year, month, day] = selectedDate.split('-');
  const formattedDate = `${day}/${month}/${year}`;
  
  const emailSubject = `BÁO CÁO XUẤT HÀNG NGÀY - ${moduleName.toUpperCase()} - ${formattedDate}`;
  
  // Create a text version of the table for the textarea
  const emailBody = `
Kính gửi: ${recipientEmail || 'Quý Khách Hàng / Ban Lãnh Đạo'},

Dưới đây là báo cáo tổng hợp xuất hàng ${moduleName} ngày ${formattedDate}:

-------------------------------------------------------------
MODEL          | CODE       | CÔNG ĐOẠN      | SỐ LƯỢNG (PNL)
-------------------------------------------------------------
${reportData.map(item => `${item.model.padEnd(15)}| ${item.code.padEnd(11)}| ${item.stages.padEnd(15)}| ${item.quantity.toLocaleString()}`).join('\n')}
-------------------------------------------------------------
TỔNG CỘNG      |            |                | ${totalQuantity.toLocaleString()} PNL
-------------------------------------------------------------

Ghi chú: Dữ liệu được trích xuất tự động từ hệ thống NEWPROTEC.

Trân trọng,
Bộ phận Kho & Quản lý Sản xuất
`;

  const handleSend = () => {
      if (!recipientEmail.trim()) {
          alert("Vui lòng nhập địa chỉ Email người nhận.");
          return;
      }

      if (reportData.length === 0) {
          alert("Không có dữ liệu xuất hàng trong ngày này để gửi.");
          return;
      }

      setIsSending(true);
      
      // Simulate API call
      setTimeout(() => {
          setIsSending(false);
          setSentSuccess(true);
          setTimeout(() => setSentSuccess(false), 3000); // Hide success msg after 3s
      }, 1500);
  };

  const handleCopy = () => {
      navigator.clipboard.writeText(emailBody);
      alert("Đã sao chép nội dung email vào bộ nhớ tạm!");
  };

  return (
    <div className="p-6 h-full overflow-y-auto bg-slate-900 flex flex-col gap-6 text-slate-300">
      {/* Header */}
      <div className="bg-slate-800 px-3 py-2 md:px-4 md:py-3 rounded-lg shadow-lg border border-slate-700 flex flex-col md:flex-row justify-between items-center gap-3 sticky top-0 z-20">
        <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-900/30 rounded border border-indigo-600/50 text-indigo-400 shrink-0">
               <Mail size={20} />
            </div>
            <div>
                <h1 className="text-sm font-bold text-white uppercase tracking-tight font-mono">
                    GỬI EMAIL ({moduleName})
                </h1>
                <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5 flex items-center gap-1">
                    <span className="w-1 h-1 bg-green-500 rounded-full animate-pulse"></span>
                    SYSTEM STATUS: ONLINE
                </div>
            </div>
        </div>
        
        {/* Right Side: System Info */}
        <div className="flex items-center gap-3 text-[10px] font-mono text-slate-400 bg-slate-900 px-2 py-1 rounded border border-slate-700 shadow-sm w-full md:w-auto justify-between md:justify-end">
             <div className="flex items-center gap-1.5">
                <Activity size={10} className="text-blue-500"/> <span className="font-bold text-slate-300">CPU: 20%</span>
             </div>
             <div className="w-px h-3 bg-slate-600"></div>
             <div className="flex items-center gap-1.5">
                <HardDrive size={10} className="text-orange-500"/> <span className="font-bold text-slate-300">RAM: 35%</span>
             </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 h-full">
          
          {/* Controls & Summary */}
          <div className="lg:w-1/3 flex flex-col gap-6">
              <div className="bg-slate-800 p-5 rounded-xl shadow-lg border border-slate-700 flex flex-col gap-4">
                  <div>
                      <h2 className="font-bold text-slate-300 mb-2 flex items-center gap-2 text-sm">
                          <Calendar size={16} className="text-slate-500"/> Chọn Ngày Báo Cáo
                      </h2>
                      <input 
                        type="date" 
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-600 rounded-md px-3 py-2 focus:ring-1 focus:ring-indigo-500 focus:outline-none text-slate-300 font-medium text-sm [color-scheme:dark]"
                      />
                  </div>

                  <div>
                      <h2 className="font-bold text-slate-300 mb-2 flex items-center gap-2 text-sm">
                          <AtSign size={16} className="text-slate-500"/> Địa Chỉ Email Người Nhận <span className="text-red-500">*</span>
                      </h2>
                      <input 
                        type="text" 
                        value={recipientEmail}
                        onChange={(e) => setRecipientEmail(e.target.value)}
                        placeholder="nhap_email@example.com"
                        className="w-full bg-slate-900 border border-slate-600 rounded-md px-3 py-2 focus:ring-1 focus:ring-indigo-500 focus:outline-none text-slate-300 text-sm"
                      />
                      <p className="text-[10px] text-slate-500 mt-1 italic">
                          * Phân cách nhiều email bằng dấu chấm phẩy (;)
                      </p>
                  </div>
                  
                  <div className="mt-2 pt-4 border-t border-slate-700">
                      <div className="flex justify-between items-center mb-2">
                          <span className="text-xs text-slate-500">Tổng mã hàng (Models):</span>
                          <span className="font-bold text-slate-300">{reportData.length}</span>
                      </div>
                      <div className="flex justify-between items-center">
                          <span className="text-xs text-slate-500">Tổng lượng xuất:</span>
                          <span className="font-bold text-indigo-400 text-base">{totalQuantity.toLocaleString()} PNL</span>
                      </div>
                  </div>
              </div>

              <div className="bg-indigo-900/20 p-5 rounded-xl border border-indigo-500/30 flex flex-col items-center text-center">
                   <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center shadow-sm mb-3 text-indigo-400 border border-indigo-900">
                       <Send size={24}/>
                   </div>
                   <h3 className="font-bold text-indigo-300 mb-1">Sẵn sàng gửi</h3>
                   <p className="text-xs text-indigo-400/80 mb-4 px-4 break-words w-full">
                       {recipientEmail ? `Đến: ${recipientEmail}` : 'Vui lòng nhập email người nhận'}
                   </p>
                   
                   <button 
                     onClick={handleSend}
                     disabled={isSending || reportData.length === 0 || !recipientEmail}
                     className={`w-full py-2.5 rounded-lg font-bold shadow-sm flex items-center justify-center gap-2 transition-all text-sm border
                        ${isSending 
                            ? 'bg-indigo-700 text-white cursor-wait border-indigo-600' 
                            : sentSuccess 
                                ? 'bg-green-600 text-white border-green-500'
                                : 'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-500 hover:scale-105 active:scale-95'
                        }
                        ${(reportData.length === 0 || !recipientEmail) ? 'opacity-50 cursor-not-allowed grayscale' : ''}
                     `}
                   >
                       {isSending ? (
                           <>Đang gửi...</>
                       ) : sentSuccess ? (
                           <><CheckCircle2 size={16}/> Đã gửi thành công!</>
                       ) : (
                           <><Send size={16}/> Gửi Ngay</>
                       )}
                   </button>
              </div>
          </div>

          {/* Email Preview */}
          <div className="flex-1 bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-700 flex flex-col">
               <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-700">
                   <h2 className="font-bold text-slate-300 flex items-center gap-2 text-sm">
                       <FileText size={16} className="text-slate-500"/> Xem Trước Nội Dung (Preview)
                   </h2>
                   <button 
                    onClick={handleCopy}
                    className="text-xs text-blue-400 hover:bg-blue-900/30 px-2 py-1 rounded flex items-center gap-1 transition-colors border border-transparent hover:border-blue-800"
                   >
                       <Copy size={12}/> Sao chép nội dung
                   </button>
               </div>

               <div className="space-y-3 flex-1 flex flex-col">
                   <div>
                       <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Tiêu đề (Subject):</span>
                       <div className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-xs font-bold text-slate-300">
                           {emailSubject}
                       </div>
                   </div>
                   
                   <div className="flex-1 flex flex-col">
                       <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Nội dung (Body):</span>
                       {reportData.length === 0 ? (
                           <div className="flex-1 bg-slate-900 border border-slate-700 border-dashed rounded flex flex-col items-center justify-center text-slate-500 p-8">
                               <AlertCircle size={32} className="mb-2 opacity-30"/>
                               <p className="text-xs">Không có dữ liệu xuất hàng trong ngày {formattedDate}.</p>
                           </div>
                       ) : (
                           <textarea 
                             readOnly
                             value={emailBody}
                             className="flex-1 w-full bg-slate-900 border border-slate-700 rounded p-4 text-xs font-mono text-slate-400 focus:outline-none resize-none min-h-[400px]"
                           />
                       )}
                   </div>
               </div>
          </div>

      </div>
    </div>
  );
};
