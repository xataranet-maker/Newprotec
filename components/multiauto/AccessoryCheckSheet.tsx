
import React, { useState, useMemo } from 'react';
import { 
  ClipboardList, Search, Calendar, Printer, X, 
  FileSpreadsheet, FileText, CheckCircle2, Layers
} from 'lucide-react';
import { ProductionHistoryRecord, AccessoryParameter, AccessoryRecord, Language, NetDataRecord } from '../../types';
import * as XLSX from 'xlsx';

interface AccessoryCheckSheetProps {
  moduleName?: string;
  historyData: ProductionHistoryRecord[];
  accessoryParams: AccessoryParameter[];
  accessoriesData: AccessoryRecord[];
  netData: NetDataRecord[];
  language?: Language;
}

// Interface mới cho dữ liệu đã gộp
interface GroupedCheckSheetItem {
    uniqueId: string;
    model: string;
    code: string;
    lotNo: string;
    quantity: number;
    date: string;
    // Map lưu chi tiết từng công đoạn: Key = Tên công đoạn
    stageDetails: Record<string, {
        accessoryLot: string;
        expiration: string;
        machine: string;
    }>;
    completedStages: string[];
}

export const AccessoryCheckSheet: React.FC<AccessoryCheckSheetProps> = ({ 
    historyData = [], 
    accessoryParams = [],
    accessoriesData = [],
    netData = [],
    language = 'vi' 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    if (now.getHours() < 8) now.setDate(now.getDate() - 1);
    const d = String(now.getDate()).padStart(2, '0');
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const y = now.getFullYear();
    return `${d}/${m}/${y}`;
  });

  const [printModalTarget, setPrintModalTarget] = useState<GroupedCheckSheetItem | null>(null);

  // 1. Lọc dữ liệu thô theo ngày và từ khóa
  const rawFilteredData = useMemo(() => {
    return (historyData || []).filter(record => {
      const matchesDate = record.date === selectedDate;
      const searchLower = searchTerm.toLowerCase();
      return matchesDate && (
        record.model.toLowerCase().includes(searchLower) ||
        record.code.toLowerCase().includes(searchLower) ||
        record.lotNo.toLowerCase().includes(searchLower)
      );
    }).sort((a, b) => b.historyId - a.historyId);
  }, [historyData, selectedDate, searchTerm]);

  // 2. Gom nhóm dữ liệu theo Model + Code + LotNo
  const groupedData = useMemo(() => {
      const groups = new Map<string, GroupedCheckSheetItem>();

      rawFilteredData.forEach(record => {
          const key = `${record.model}|${record.code}|${record.lotNo}`;
          
          if (!groups.has(key)) {
              groups.set(key, {
                  uniqueId: key,
                  model: record.model,
                  code: record.code,
                  lotNo: record.lotNo,
                  quantity: record.quantity, // Giả định số lượng không đổi giữa các CĐ hoặc lấy mới nhất
                  date: record.date,
                  stageDetails: {},
                  completedStages: []
              });
          }

          const group = groups.get(key)!;
          const stageName = record.stageCompleted || record.stage;
          
          // Tìm thông tin hạn sử dụng từ bảng AccessoriesData
          const accInfo = accessoriesData.find(a => a.lotNo === record.usedAccessoryLot);
          const expDate = accInfo?.expirationDate ? accInfo.expirationDate.split('-').reverse().join('/') : '---';

          // Cập nhật thông tin cho công đoạn này
          group.stageDetails[stageName] = {
              accessoryLot: record.usedAccessoryLot || '---',
              expiration: expDate,
              machine: record.machine || ''
          };
          
          if (!group.completedStages.includes(stageName)) {
              group.completedStages.push(stageName);
          }
      });

      return Array.from(groups.values());
  }, [rawFilteredData, accessoriesData]);

  const getStagesForModel = (model: string, code: string) => {
    const net = netData.find(n => n.model === model && n.code === code);
    if (!net) return [];
    const stages = [];
    if (net.stage) stages.push(net.stage);
    if (net.stage2) stages.push(net.stage2);
    if (net.stage3) stages.push(net.stage3);
    if (net.stage4) stages.push(net.stage4);
    return stages;
  };

  // Helper lấy thông số kỹ thuật (Độ dày) cho một công đoạn cụ thể
  const getTechSpecForStage = (model: string, code: string, stage: string) => {
      const spec = accessoryParams.find(p => 
        p.model === model && 
        p.code === code && 
        p.stage === stage
      );
      return spec?.thickness || '---';
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = () => {
    if (!printModalTarget) return;
    
    // Xuất excel đơn giản: Lấy dòng đầu tiên hoặc logic tùy chỉnh
    // Ở đây ta xuất danh sách các công đoạn đã hoàn thành
    const stages = getStagesForModel(printModalTarget.model, printModalTarget.code);
    const rows = stages.map(st => {
        const detail = printModalTarget.stageDetails[st];
        const thickness = getTechSpecForStage(printModalTarget.model, printModalTarget.code, st);
        return [
            printModalTarget.model,
            printModalTarget.code,
            printModalTarget.lotNo,
            st,
            detail?.accessoryLot || '',
            detail?.expiration || '',
            thickness,
            printModalTarget.quantity
        ];
    });

    const headers = ["MODEL", "CODE", "LOT TP", "CÔNG ĐOẠN", "LOT PL", "HẠN SD", "ĐỘ DÀY", "SỐ LƯỢNG"];
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "CheckSheet");
    XLSX.writeFile(wb, `CheckSheet_${printModalTarget.lotNo}.xlsx`);
  };

  return (
    <div className="p-4 md:p-6 h-full overflow-y-auto bg-[#020617] flex flex-col gap-6 text-slate-300 custom-scrollbar main-layout-container">
      
      {/* --- UI LIST SECTION (Hidden on print) --- */}
      <div className="bg-slate-800 px-5 py-4 rounded-xl shadow-lg border border-slate-700 flex flex-col md:flex-row justify-between items-center gap-4 sticky top-0 z-30 print:hidden">
          <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-600 rounded-xl text-white shadow-lg shadow-emerald-900/20"><ClipboardList size={24}/></div>
              <div>
                  <h1 className="text-xl font-black text-white uppercase tracking-tighter font-mono">XUẤT PHIẾU KIỂM TRA PHỤ LIỆU</h1>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Hệ thống trích xuất biểu mẫu tự động (Gộp Lô)</p>
              </div>
          </div>
          <div className="flex items-center gap-3 bg-slate-900 px-4 py-2 rounded-xl border border-slate-700">
              <Calendar size={16} className="text-blue-400"/>
              <input type="text" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="bg-transparent border-none text-sm font-black text-white w-28 outline-none text-center font-mono" />
          </div>
      </div>

      <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden shadow-2xl flex-1 print:hidden">
          <div className="p-4 border-b border-slate-700 bg-slate-900/50 flex items-center gap-3">
              <Search size={18} className="text-slate-500" />
              <input type="text" placeholder="Tìm kiếm Model, Code, Lot No..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="bg-transparent border-none outline-none text-sm w-full text-white font-medium" />
          </div>
          <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left text-[11px] border-collapse min-w-[1000px]">
                  <thead className="bg-slate-950 text-slate-500 uppercase font-black font-mono border-b border-slate-800">
                      <tr>
                          <th className="px-6 py-4">Sản Phẩm (Model/Code)</th>
                          <th className="px-6 py-4">Lot No TP</th>
                          <th className="px-4 py-4 text-center">Tiến độ công đoạn</th>
                          <th className="px-6 py-4 text-right">Số lượng (PNL)</th>
                          <th className="px-6 py-4 text-center">Thao tác</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                      {groupedData.length === 0 ? (
                          <tr><td colSpan={5} className="py-20 text-center text-slate-600 italic">Không tìm thấy dữ liệu</td></tr>
                      ) : (
                          groupedData.map((item) => (
                            <tr key={item.uniqueId} className="hover:bg-white/5 transition-colors group">
                                <td className="px-6 py-3">
                                    <div className="font-black text-white uppercase text-[12px]">{item.model}</div>
                                    <div className="text-[9px] text-slate-500 font-mono mt-0.5">{item.code}</div>
                                </td>
                                <td className="px-6 py-3 font-mono font-bold text-yellow-500 uppercase">{item.lotNo}</td>
                                <td className="px-4 py-3">
                                    <div className="flex justify-center gap-1">
                                        {item.completedStages.map((stg, idx) => (
                                            <span key={idx} className="bg-slate-900 border border-slate-700 px-1.5 py-0.5 rounded text-[8px] font-bold text-slate-400 uppercase">
                                                {stg}
                                            </span>
                                        ))}
                                    </div>
                                </td>
                                <td className="px-6 py-3 text-right font-black font-mono text-white">{(item.quantity || 0).toLocaleString()}</td>
                                <td className="px-6 py-3 text-center">
                                    <button 
                                        onClick={() => setPrintModalTarget(item)} 
                                        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg shadow-lg font-black text-[10px] uppercase flex items-center gap-2 mx-auto transition-all active:scale-95 border-b-4 border-emerald-800"
                                    >
                                        <FileText size={14}/> Xem Phiếu
                                    </button>
                                </td>
                            </tr>
                          ))
                      )}
                  </tbody>
              </table>
          </div>
      </div>

      {/* --- MODAL XEM TRƯỚC (ON SCREEN & PRINT) --- */}
      {printModalTarget && (
          <div className="fixed inset-0 z-[9999] flex items-start justify-center bg-black/95 backdrop-blur-md overflow-y-auto p-4 md:p-10 animate-in fade-in duration-300 print:p-0 print:bg-white print:overflow-visible">
              <div className="bg-white text-black w-full max-w-[900px] shadow-2xl relative flex flex-col min-h-screen print:max-w-none print:shadow-none print:min-h-0 print:static" id="printable-area-wrapper">
                  
                  {/* Toolbar (Ẩn khi in) */}
                  <div className="px-6 py-3 bg-slate-800 text-white flex justify-between items-center sticky top-0 z-[10000] print:hidden shrink-0">
                      <div className="flex items-center gap-6">
                          <h2 className="text-xs font-black uppercase tracking-widest font-mono text-emerald-400 flex items-center gap-2">
                              <CheckCircle2 size={16}/> PHIẾU TỔNG HỢP LÔ
                          </h2>
                          <div className="flex gap-2">
                              <button onClick={handleExportExcel} className="flex items-center gap-1.5 px-4 py-1.5 bg-green-700 hover:bg-green-600 rounded text-[10px] font-black transition-all shadow-md active:scale-95 uppercase"><FileSpreadsheet size={14}/> EXCEL</button>
                              <button onClick={handlePrint} className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 rounded text-[10px] font-black transition-all shadow-md active:scale-95 uppercase"><Printer size={14}/> IN PHIẾU</button>
                          </div>
                      </div>
                      <button onClick={() => setPrintModalTarget(null)} className="bg-slate-700 hover:bg-red-600 p-2 rounded-full transition-colors text-white"><X size={20}/></button>
                  </div>
                  
                  {/* --- VÙNG NỘI DUNG BIỂU MẪU --- */}
                  <div className="p-6 md:p-10 bg-white print:p-0" id="printable-content">
                       <div className="border-[2.5px] border-black p-4 w-full text-black bg-white">
                            
                            {/* Header: Signatures & Title */}
                            <table className="w-full border-collapse border-[2px] border-black text-[10px] font-bold text-black">
                                <tbody>
                                    <tr className="text-center h-10">
                                        <td rowSpan={2} className="border border-black p-2 w-24 text-[12px] bg-slate-50">가접</td>
                                        <td className="border border-black p-1 w-16">작성 (Lập)</td>
                                        <td className="border border-black p-1 w-16">검토 (KT)</td>
                                        <td className="border border-black p-1 w-16">승인 (Duyệt)</td>
                                        <td rowSpan={2} className="border border-black p-4 text-center">
                                            <div className="text-2xl font-black uppercase leading-tight">가접 검사 성적서</div>
                                            <div className="text-[16px] font-bold leading-tight mt-1">PHIẾU KẾT QUẢ KIỂM TRA GẮN TẤM CỨNG</div>
                                            <div className="text-sm font-bold">[C/L , EMI]</div>
                                        </td>
                                        <td rowSpan={2} className="border border-black p-2 w-12 text-[10px] leading-[1.2] bg-slate-50 uppercase italic font-black">S<br/>I<br/>F<br/>L<br/>E<br/>X</td>
                                        <td className="border border-black p-1 w-16">작성 (Lập)</td>
                                        <td className="border border-black p-1 w-16">검토 (KT)</td>
                                        <td className="border border-black p-1 w-16">승인 (Duyệt)</td>
                                    </tr>
                                    <tr className="h-16">
                                        <td className="border border-black"></td><td className="border border-black"></td><td className="border border-black"></td>
                                        <td className="border border-black"></td><td className="border border-black"></td><td className="border border-black"></td>
                                    </tr>
                                </tbody>
                            </table>

                            {/* Lot Information Row */}
                            <table className="w-full border-collapse border-x-[2px] border-b-[2px] border-black text-[11px] font-bold text-black">
                                <tbody>
                                    <tr className="h-12 uppercase">
                                        <td className="border border-black bg-slate-50 p-2 w-32">협력회사명 (Tên Cty)</td>
                                        <td className="border border-black p-2 text-center">NEWPROTEC</td>
                                        <td className="border border-black bg-slate-50 p-2 w-20 text-center">MODEL</td>
                                        <td className="border border-black p-2 text-center min-w-[150px]">{printModalTarget.model}</td>
                                        <td className="border border-black bg-slate-50 p-2 w-24 text-center">작지NO (Lot No)</td>
                                        <td className="border border-black p-2 text-center font-mono font-black text-base bg-yellow-50">{printModalTarget.lotNo}</td>
                                        <td className="border border-black bg-slate-50 p-2 w-20 text-center">입고수량</td>
                                        <td className="border border-black p-2 text-center w-20">{printModalTarget.quantity}</td>
                                    </tr>
                                    <tr className="h-12 uppercase">
                                        <td className="border border-black bg-slate-50 p-2">검사일 (Ngày KT)</td>
                                        <td className="border border-black p-2 text-center">{printModalTarget.date}</td>
                                        <td className="border border-black bg-slate-50 p-2 text-center">검사원 (NV)</td>
                                        <td className="border border-black p-2 text-center"></td>
                                        <td className="border border-black bg-slate-50 p-2 text-center">판정 (Kết quả)</td>
                                        <td className="border border-black p-2 text-center font-black text-blue-700 bg-blue-50"></td>
                                        <td className="border border-black bg-slate-50 p-2 text-center">가접업체</td>
                                        <td className="border border-black p-2 text-center font-bold">SIFLEX</td>
                                    </tr>
                                </tbody>
                            </table>

                            {/* Options */}
                            <div className="flex border-x-[2px] border-b-[2px] border-black p-2.5 gap-10 text-[11px] font-bold text-black items-center">
                                <div className="flex items-center gap-2"><div className="w-4 h-4 border border-black"></div> <span>Hàng test sản phẩm đầu</span></div>
                                <div className="flex items-center gap-2"><div className="w-4 h-4 border border-black"></div> <span>Hàng thay đổi</span></div>
                                <div className="flex items-center gap-2"><div className="w-4 h-4 border border-black flex items-center justify-center">V</div> <span>Hàng đại trà</span></div>
                            </div>

                            <div className="bg-slate-50 border-x-[2px] border-b-[2px] border-black p-1 text-center font-bold text-[11px] uppercase">가접 전 확인사항 (HẠNG MỤC KIỂM TRA TRƯỚC GẮN C/L)</div>
                            
                            <table className="w-full border-collapse border-x-[2px] border-b-[2px] border-black text-[10px] font-bold text-black text-center">
                                <thead className="bg-slate-50">
                                    <tr className="h-8">
                                        <th className="border border-black p-1 w-28">Tên phụ liệu</th>
                                        <th className="border border-black p-1 w-16">C.Đoạn</th>
                                        <th className="border border-black p-1">원자재 LOT NO / LOT NO PHỤ LIỆU</th>
                                        <th className="border border-black p-1 w-28">Hạn sử dụng</th>
                                        <th className="border border-black p-1 w-28">Công ty dập</th>
                                        <th className="border border-black p-1 w-28">Bản chỉ thị Lot</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {getStagesForModel(printModalTarget.model, printModalTarget.code).map((st, idx) => {
                                        // LOGIC QUAN TRỌNG: Lấy dữ liệu từ map stageDetails của Item đã gộp
                                        const detail = printModalTarget.stageDetails[st];
                                        
                                        return (
                                            <tr key={idx} className="h-10">
                                                <td className="border border-black uppercase">C/L ({st})</td>
                                                <td className="border border-black uppercase">{st}</td>
                                                <td className="border border-black font-mono font-bold bg-yellow-50">
                                                    {detail?.accessoryLot || ''}
                                                </td>
                                                <td className="border border-black">
                                                    {detail?.expiration || ''}
                                                </td>
                                                <td className="border border-black uppercase"></td>
                                                <td className="border border-black"></td>
                                            </tr>
                                        );
                                    })}
                                    
                                    {/* Fallback nếu không tìm thấy stages */}
                                    {getStagesForModel(printModalTarget.model, printModalTarget.code).length === 0 && (
                                         <tr className="h-10"><td colSpan={6} className="border border-black text-center italic">Chưa cấu hình quy trình công đoạn cho Model này</td></tr>
                                    )}
                                </tbody>
                            </table>

                            <div className="grid grid-cols-12 border-x-[2px] border-b-[2px] border-black min-h-[140px]">
                                <div className="col-span-5 border-r border-black flex flex-col">
                                     <div className="p-1 text-center font-bold text-[10px] text-red-600 bg-slate-50 border-b border-black">원자재 두께 측정 (ĐO ĐỘ DÀY NGUYÊN VẬT LIỆU)</div>
                                     <table className="w-full h-full border-collapse text-[10px] font-bold text-black">
                                        <tbody>
                                            <tr className="h-10">
                                                <td className="border-r border-black p-1 text-center w-24 bg-slate-50">Spec</td>
                                                {/* Hiển thị thông số của công đoạn đầu tiên hoặc để trống nếu nhiều công đoạn */}
                                                <td className="p-1 text-center font-black text-base">
                                                     {getStagesForModel(printModalTarget.model, printModalTarget.code).length > 0 
                                                        ? getTechSpecForStage(printModalTarget.model, printModalTarget.code, getStagesForModel(printModalTarget.model, printModalTarget.code)[0])
                                                        : '---'}
                                                </td>
                                            </tr>
                                            <tr className="border-t border-black h-10">
                                                <td className="border-r border-black p-1 bg-slate-50 text-center uppercase">Thực tế</td>
                                                <td className="p-1 text-center font-black text-blue-700 text-base"></td>
                                            </tr>
                                            <tr className="border-t border-black h-10">
                                                <td className="border-r border-black p-1 bg-slate-50 text-center uppercase">Kết quả</td>
                                                <td className="p-1 text-center font-black text-green-700 text-base"></td>
                                            </tr>
                                        </tbody>
                                     </table>
                                </div>
                                <div className="col-span-7 flex flex-col">
                                    <div className="p-1 text-center font-bold text-[10px] text-red-600 bg-slate-50 border-b border-black uppercase">가접 작업 방법 (PHƯƠNG PHÁP GẮN TẤM CỨNG)</div>
                                    <table className="w-full h-full border-collapse text-[10px] text-center font-bold text-black">
                                        <thead>
                                            <tr className="h-8 bg-slate-50">
                                                <th className="border-r border-b border-black">Gắn thủ công</th>
                                                <th className="border-r border-b border-black">Bán/Tự động</th>
                                                <th className="border-r border-b border-black">JIG Sử dụng</th>
                                                <th className="border-b border-black">Dập Code</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr className="h-24">
                                                <td className="border-r border-black"></td>
                                                <td className="border-r border-black text-blue-700 font-black text-sm uppercase">
                                                    {/* Hiển thị máy của công đoạn đầu hoặc tổng hợp */}
                                                    {Object.values(printModalTarget.stageDetails).map((d: any) => d.machine).filter(Boolean).join(', ') || '---'}
                                                </td>
                                                <td className="border-r border-black"></td>
                                                <td className="text-center italic">음각 / 양각</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div className="bg-slate-50 p-1 text-center border-x-[2px] border-b-[2px] border-black font-bold text-[11px] uppercase">가접 후 외관검사 (KIỂM TRA NGOẠI QUAN SAU KHI GẮN)</div>
                            <div className="grid grid-cols-2 border-x-[2px] border-b border-black h-48">
                                <div className="border-r border-black">
                                    <table className="w-full border-collapse text-[10px] font-bold text-black">
                                        <thead className="bg-slate-50 border-b border-black">
                                            <tr><th className="p-1 border-r border-black uppercase text-[9px]">Hạng mục (Cty gắn)</th><th className="p-1 border-r border-black w-20">Số mẫu</th><th className="p-1 w-20">Lỗi</th></tr>
                                        </thead>
                                        <tbody className="divide-y divide-black text-center">
                                            {["Lỗi lệch", "Thiếu/Biến dạng", "vết ố / dị vật", "Burr CL", "Xước bề mặt", "Gắn 2 lần", "Lỗi nhăn"].map((l, i) => (
                                                <tr key={i} className="h-6"><td className="p-1 border-r border-black text-left pl-3">{l}</td><td className="p-1 border-r border-black">EA</td><td className="p-1">EA</td></tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div>
                                     <table className="w-full border-collapse text-[10px] font-bold text-black">
                                        <thead className="bg-slate-50 border-b border-black">
                                            <tr><th className="p-1 border-r border-black uppercase text-[9px]">SIFLEX Kiểm tra</th><th className="p-1 border-r border-black w-20">Số mẫu</th><th className="p-1 w-20">Lỗi</th></tr>
                                        </thead>
                                        <tbody className="divide-y divide-black text-center">
                                            {["Lỗi lệch", "Thiếu NL", "Dị vật", "Burr CL", "Phồng EMI", "Thừa NL", "Lỗi nhăn"].map((l, i) => (
                                                <tr key={i} className="h-6"><td className="p-1 border-r border-black text-left pl-3">{l}</td><td className="p-1 border-r border-black text-center">/</td><td className="p-1 text-center">/</td></tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            
                            <div className="p-2 text-[10px] font-bold italic border-x-[2px] border-b-[2px] border-black uppercase text-black flex justify-between">
                                <span>* 특 기 사 항 / Ghi chú: .....................................................................</span>
                                <span>* 특 기 사 항 / Ghi chú: .....................................................................</span>
                            </div>
                       </div>
                  </div>
              </div>
          </div>
      )}

      {/* --- CẤU HÌNH CSS PRINT --- */}
      <style>{`
        @media screen {
            #printable-area-wrapper {
                display: flex !important;
                visibility: visible !important;
            }
        }

        @media print {
            body * {
                visibility: hidden !important;
            }
            #printable-area-wrapper, 
            #printable-area-wrapper *,
            #printable-content, 
            #printable-content * {
                visibility: visible !important;
            }
            #printable-area-wrapper {
                position: fixed !important;
                left: 0 !important;
                top: 0 !important;
                width: 210mm !important;
                height: auto !important;
                margin: 0 !important;
                padding: 0 !important;
                background-color: white !important;
                border: none !important;
                box-shadow: none !important;
            }
            #printable-content {
                padding: 10mm !important;
                width: 100% !important;
                box-sizing: border-box !important;
            }
            .bg-yellow-50 { background-color: #fef9c3 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .bg-slate-50 { background-color: #f8fafc !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .bg-blue-50 { background-color: #eff6ff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            @page {
                size: A4 portrait;
                margin: 0;
            }
            table, tr, td {
                page-break-inside: avoid !important;
                border-color: black !important;
            }
        }
      `}</style>
    </div>
  );
};
