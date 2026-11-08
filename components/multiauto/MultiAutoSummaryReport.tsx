
import React, { useMemo, useState, useEffect } from 'react';
import { 
    ArchiveRestore, CheckCircle2, MonitorPlay, Activity, 
    Package, AlertTriangle, BarChart3, TrendingUp, Target, 
    Zap, Timer, Ruler, Hash, AlertOctagon, Users, Sun, Moon, MessageSquare, Calendar, History as LucideHistory
} from 'lucide-react';
import { ImportRecord, ExportRecord, MachineSetup, ProductionHistoryRecord, NetDataRecord } from '../../types';

interface MultiAutoSummaryReportProps {
  importData: ImportRecord[];
  exportData: ExportRecord[];
  historyData: ProductionHistoryRecord[];
  machineData: MachineSetup[];
  staffData: any[];
  netData: NetDataRecord[];
  productReturns?: any[];
  language?: string;
  targetPnl?: number;
  attendanceHistory: any[];
  overtimeRecords?: any[];
}

// Helper phân loại Lớp Trong/Ngoài
const getLayerType = (stage: string): string => {
    if (!stage) return 'N/A';
    const s = stage.toUpperCase().trim();
    if (['1L-1', '1L-2', '4L-1', '4L-2'].some(v => s.includes(v)) || s.includes('OUTER')) return 'LỚP NGOÀI';
    if (['2L-1', '2L-2', '3L-1', '3L-2'].some(v => s.includes(v)) || s.includes('INNER')) return 'LỚP TRONG';
    return s;
};

export const MultiAutoSummaryReport: React.FC<MultiAutoSummaryReportProps> = ({
  importData = [], 
  exportData = [], 
  historyData = [], 
  machineData = [], 
  staffData = [], 
  netData = [], 
  productReturns = [], 
  targetPnl = 500, 
  attendanceHistory = [], 
  overtimeRecords = []
}) => {
  
  const [viewDateISO, setViewDateISO] = useState(() => {
    const now = new Date();
    if (now.getHours() < 8) now.setDate(now.getDate() - 1);
    return now.toISOString().split('T')[0];
  });

  // State để cập nhật realtime cho thanh tiến độ
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const displayDateVN = useMemo(() => {
    const [y, m, d] = viewDateISO.split('-');
    return `${d}/${m}/${y}`;
  }, [viewDateISO]);

  const getPointForSpecificStage = (model: string, code: string, stage: string) => {
      const net = (netData || []).find(n => n.model === model && n.code === code);
      if (!net) return 0;
      const s = stage.toUpperCase();
      if (net.stage?.toUpperCase() === s) return net.stage1Points || 0;
      if (net.stage2?.toUpperCase() === s) return net.stage2Points || 0;
      if (net.stage3?.toUpperCase() === s) return net.stage3Points || 0;
      if (net.stage4?.toUpperCase() === s) return net.stage4Points || 0;
      return 0;
  };

  // --- 1. DATA: HIỆN TRẠNG TỒN MODEL (REAL-TIME - GIỮ NGUYÊN KHI ĐỔI NGÀY) ---
  const inventoryRows = useMemo(() => {
    const lotMap = new Map<string, { model: string, code: string, stage: string, qty: number }>();
    
    // Tính toán tồn dựa trên toàn bộ dữ liệu hiện có trong hệ thống
    (importData || []).filter(i => i.isVerified).forEach(i => {
        if (!lotMap.has(i.lotNo)) lotMap.set(i.lotNo, { model: i.model, code: i.code, stage: i.stage, qty: 0 });
        lotMap.get(i.lotNo)!.qty += i.quantity;
    });
    (exportData || []).forEach(e => {
        const item = lotMap.get(e.lotNo);
        if (item) item.qty -= e.quantity;
    });
    (productReturns || []).forEach(r => {
        const item = lotMap.get(r.lotNo);
        if (item) item.qty -= r.quantity;
    });

    const groupMap = new Map<string, { model: string, code: string, layer: string, lotCount: number, pnl: number, points: number }>();
    lotMap.forEach((data, lotNo) => {
        if (data.qty > 0) {
            const layer = getLayerType(data.stage);
            const key = `${data.model}|${data.code}|${layer}`;
            const net = (netData || []).find(n => n.model === data.model && n.code === data.code);
            const totalPtsPerUnit = (net?.stage1Points || 0) + (net?.stage2Points || 0) + (net?.stage3Points || 0) + (net?.stage4Points || 0);

            if (!groupMap.has(key)) {
                groupMap.set(key, { model: data.model, code: data.code, layer: layer, lotCount: 0, pnl: 0, points: 0 });
            }
            const entry = groupMap.get(key)!;
            entry.lotCount += 1;
            entry.pnl += data.qty;
            entry.points += (totalPtsPerUnit * data.qty);
        }
    });
    return Array.from(groupMap.values()).sort((a, b) => b.pnl - a.pnl);
  }, [importData, exportData, productReturns, netData]);

  // --- 2. DATA: SẢN LƯỢNG TRONG NGÀY (THAY ĐỔI THEO NGÀY ĐƯỢC CHỌN) ---
  const productionRows = useMemo(() => {
    const groupMap = new Map<string, { model: string, code: string, layer: string, lots: Map<string, number>, points: number }>();
    const dailyHistory = (historyData || []).filter(h => h.date === displayDateVN);
    
    dailyHistory.forEach(h => {
      const stage = h.stageCompleted || h.stage;
      const layer = getLayerType(stage);
      const key = `${h.model}|${h.code}|${layer}`;
      const stagePoints = getPointForSpecificStage(h.model, h.code, stage);
      
      if (!groupMap.has(key)) {
        groupMap.set(key, { model: h.model, code: h.code, layer, lots: new Map<string, number>(), points: 0 });
      }
      const entry = groupMap.get(key)!;
      if (!entry.lots.has(h.lotNo)) entry.lots.set(h.lotNo, h.quantity);
      entry.points += (stagePoints * h.quantity);
    });

    return Array.from(groupMap.values()).map(v => {
        let totalPnl = 0;
        v.lots.forEach(qty => totalPnl += qty);
        return { model: v.model, code: v.code, layer: v.layer, lotCount: v.lots.size, pnl: totalPnl, points: v.points };
    }).sort((a, b) => b.pnl - a.pnl);
  }, [historyData, displayDateVN, netData]);

  // --- CALCULATE TOTALS ---
  const totalInventory = useMemo(() => {
      return inventoryRows.reduce((acc, row) => ({
          lots: acc.lots + row.lotCount,
          pnl: acc.pnl + row.pnl,
          points: acc.points + row.points
      }), { lots: 0, pnl: 0, points: 0 });
  }, [inventoryRows]);

  const totalProduction = useMemo(() => {
      return productionRows.reduce((acc, row) => ({
          lots: acc.lots + row.lotCount,
          pnl: acc.pnl + row.pnl,
          points: acc.points + row.points
      }), { lots: 0, pnl: 0, points: 0 });
  }, [productionRows]);

  // --- 3. DATA: GIÁM SÁT MÁY LIVE (REAL-TIME) ---
  const machineLiveRows = useMemo(() => {
      return (machineData || []).map(m => {
          const isError = m.note !== 'NORMAL';
          const errorReason = m.description || (
              m.note === 'BROKEN' ? 'MÁY HỎNG / LỖI' :
              m.note === 'WAITING_MATERIAL' ? 'CHỜ LIỆU' :
              m.note === 'NO_STOCK' ? 'HẾT HÀNG' : 
              m.note === 'MODEL_MISMATCH' ? 'SAI MODEL' : m.note
          );

          let activeJob: any = null;
          
          (importData || []).forEach(r => {
              if (r.productionProgress) {
                  Object.entries(r.productionProgress).forEach(([stage, p]: [string, any]) => {
                      if (p.machine === m.name && (p.status === 'RUNNING' || p.status === 'STOPPED')) {
                          activeJob = { 
                              model: r.model, 
                              stage, 
                              status: p.status, 
                              qty: r.quantity, 
                              acc: p.accumulatedTime || 0, 
                              start: p.lastStartTimestamp, 
                              code: r.code 
                          };
                      }
                  });
              }
          });

          let progress = 0;
          if (activeJob) {
              const net = (netData || []).find(n => n.model === activeJob.model && n.code === activeJob.code);
              const tpp = net?.timePerPoint || 1.5;
              const pts = getPointForSpecificStage(activeJob.model, activeJob.code, activeJob.stage) || 1;
              
              let elapsed = activeJob.acc;
              if (activeJob.status === 'RUNNING' && activeJob.start) {
                  elapsed += (now - activeJob.start) / 1000;
              }
              
              const estimatedTotalSeconds = (activeJob.qty * pts * tpp);
              if (estimatedTotalSeconds > 0) {
                   progress = Math.min(100, Math.round((elapsed / estimatedTotalSeconds) * 100));
              }
          }

          const machineNumber = m.name.replace('Multi ', '').replace(/^0/, '');
          
          return { 
              name: `${machineNumber}호기`, 
              model: activeJob?.model || '--', 
              stage: activeJob?.stage || '-', 
              status: m.note, 
              progress: isError ? 0 : progress, 
              reason: errorReason,
              isError,
              jobStatus: activeJob?.status || 'IDLE'
          };
      });
  }, [machineData, importData, netData, now]);

  // --- 4. DATA: NHÂN SỰ ĐIỂM DANH ---
  const attendanceRows = useMemo(() => {
      return (staffData || []).map(s => {
          const record = (attendanceHistory || []).find(r => r.employeeId === s.employeeId && r.date === viewDateISO);
          const otRecord = (overtimeRecords || []).find(o => o.employeeId === s.employeeId && o.date === viewDateISO);
          
          const status = record ? record.status : s.attendance; 
          
          const isPresent = ['PRESENT', 'Đúng giờ', 'Đủ công', 'Đi muộn', 'Về sớm'].includes(status);
          const isLeave = status && (status.startsWith('Nghỉ') || ['SICK', 'LEAVE', 'FAMILY', 'Nghỉ KL'].includes(status));
          
          if (isPresent || isLeave) {
              const shift = record ? record.shift : s.shift;
              const otHours = otRecord ? otRecord.hours : 0;
              
              let inTimeDisplay = '--';
              let outTimeDisplay = '--';

              if (isPresent) {
                  if (status === 'Đi muộn') {
                      inTimeDisplay = 'Đi muộn';
                  } else {
                      inTimeDisplay = shift === 'NIGHT' ? '20:00' : '08:00';
                  }

                  if (status === 'Về sớm') {
                      outTimeDisplay = 'Về sớm';
                  } else {
                      let baseOutH = shift === 'NIGHT' ? 5 : 17;
                      let totalOutMinutes = baseOutH * 60 + Math.floor(otHours * 60);
                      let outH = Math.floor(totalOutMinutes / 60) % 24;
                      let outM = totalOutMinutes % 60;
                      outTimeDisplay = `${String(outH).padStart(2, '0')}:${String(outM).padStart(2, '0')}`;
                  }
              }
              
              return { 
                  name: s.fullName, 
                  id: s.employeeId, 
                  pos: s.position, 
                  shift: shift === 'NIGHT' ? 'ĐÊM' : 'NGÀY', 
                  shiftRaw: shift,
                  in: inTimeDisplay, 
                  out: outTimeDisplay, 
                  ot: otHours,
                  status: isPresent ? 'ĐANG LÀM' : status 
              };
          }
          return null;
      }).filter(Boolean);
  }, [staffData, viewDateISO, attendanceHistory, overtimeRecords]);

  return (
    <div className="h-full bg-[#020617] p-4 font-sans text-slate-200 overflow-y-auto custom-scrollbar pb-32">
      <style>{`
        .sum-card { background: #0f172a; border-radius: 4px; border: 1px solid #1e293b; overflow: hidden; display: flex; flex-direction: column; }
        .sum-header { padding: 10px 16px; display: flex; items-center; justify-content: space-between; font-weight: 900; text-transform: uppercase; font-size: 11px; }
        .sum-table { width: 100%; border-collapse: collapse; font-size: 10px; }
        .sum-table th { background: #020617; color: #64748b; padding: 10px 6px; border: 1px solid #1e293b; font-weight: 800; text-align: center; }
        .sum-table td { padding: 8px 6px; border: 1px solid #1e293b; text-align: center; font-family: 'Share Tech Mono', monospace; }
        
        .bg-orange-header { background: #1e293b; color: #fb923c; border-bottom: 2px solid #ea580c; }
        .bg-green-header { background: #1e293b; color: #4ade80; border-bottom: 2px solid #16a34a; }
        .bg-cyan-header { background: #1e293b; color: #22d3ee; border-bottom: 2px solid #0891b2; }
        .bg-brown-header { background: #1e293b; color: #fbbf24; border-bottom: 2px solid #ca8a04; }

        .row-error { background: rgba(124, 45, 18, 0.3); }
        .text-error { color: #f97316; font-weight: 900; }
      `}</style>

      {/* Date Control */}
      <div className="flex justify-between items-center mb-6 bg-slate-800/50 p-4 rounded-xl border border-slate-700">
           <div className="flex items-center gap-3"><Calendar className="text-blue-400" size={24}/><h2 className="text-lg font-black uppercase tracking-tighter">BÁO CÁO TỔNG HỢP - NGÀY {displayDateVN}</h2></div>
           <input type="date" value={viewDateISO} onChange={(e) => setViewDateISO(e.target.value)} className="bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-xs font-black text-white outline-none [color-scheme:dark]"/>
      </div>

      {/* TOP ROW: INVENTORY & DAILY PRODUCTION */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
          <div className="sum-card border-orange-500/30 shadow-2xl">
              <div className="sum-header bg-orange-header"><div className="flex items-center gap-2"><ArchiveRestore size={16}/> MODEL별 보유 재고 / HIỆN TRẠNG TỒN MODEL</div></div>
              <div className="flex-1 overflow-x-auto max-h-[300px]">
                  <table className="sum-table">
                      <thead><tr><th className="w-10">STT</th><th className="text-left px-4">TÊN MODEL (MODEL 명)</th><th>공정/ CĐ</th><th className="w-12">SỐ LÔ</th><th className="text-orange-400">TỒN (PNL)</th><th className="text-yellow-500">TOTAL POINT</th></tr></thead>
                      <tbody>
                        {(!inventoryRows || inventoryRows.length === 0) ? (
                            <tr>
                                <td colSpan={6} className="py-20 text-center text-slate-500 italic font-black uppercase tracking-widest opacity-40">
                                    재고없음 <br/> Hết Tồn Sản Phẩm
                                </td>
                            </tr>
                        ) : inventoryRows.map((r, idx) => (
                            <tr key={idx}>
                                <td>{idx + 1}</td>
                                <td className="text-left px-4 font-bold text-white"><div>{r.model}</div><div className="text-[8px] text-slate-500">{r.code}</div></td>
                                <td><span className={`px-1.5 py-0.5 rounded text-[8px] font-black border ${r.layer === 'LỚP TRONG' ? 'bg-purple-900/20 text-purple-400 border-purple-800' : 'bg-blue-900/20 text-blue-400 border-blue-800'}`}>{r.layer}</span></td>
                                <td className="text-blue-400 font-bold">{r.lotCount}</td>
                                <td className="text-white font-bold">{r.pnl.toLocaleString()}</td>
                                <td className="text-yellow-500 font-bold">{Math.floor(r.points).toLocaleString()}</td>
                            </tr>
                        ))}
                      </tbody>
                  </table>
              </div>
              <div className="bg-slate-900 border-t border-slate-700 p-2 flex justify-between items-center text-[10px] font-black uppercase tracking-wider">
                    <span className="text-slate-500">TỔNG CỘNG:</span>
                    <div className="flex gap-4">
                        <span className="text-blue-400">{totalInventory.lots} LÔ</span>
                        <span className="text-white">{totalInventory.pnl.toLocaleString()} PNL</span>
                        <span className="text-yellow-500">{totalInventory.points.toLocaleString()} PTS</span>
                    </div>
              </div>
          </div>

          <div className="sum-card border-green-500/30 shadow-2xl">
              <div className="sum-header bg-green-header"><div className="flex items-center gap-2"><CheckCircle2 size={16}/> 생산 현황 / SẢN LƯỢNG TRONG NGÀY</div></div>
              <div className="flex-1 overflow-x-auto max-h-[300px]">
                  <table className="sum-table">
                      <thead><tr><th className="w-10">STT</th><th className="text-left px-4">TÊN MODEL (MODEL 명)</th><th>공정/ CĐ</th><th className="w-12">SỐ LÔ</th><th className="text-green-400">PNL (INPUT)</th><th className="text-yellow-500">TOTAL POINT</th></tr></thead>
                      <tbody>
                        {(!productionRows || productionRows.length === 0) ? (
                            <tr>
                                <td colSpan={6} className="py-20 text-center text-slate-500 italic font-black uppercase tracking-widest opacity-40">
                                    실적없음 <br/> Không Có Hiệu Xuất
                                </td>
                            </tr>
                        ) : productionRows.map((r, idx) => (
                            <tr key={idx}>
                                <td>{idx + 1}</td>
                                <td className="text-left px-4 font-bold text-white"><div>{r.model}</div><div className="text-[8px] text-slate-500">{r.code}</div></td>
                                <td><span className={`px-1.5 py-0.5 rounded text-[8px] font-black border ${r.layer === 'LỚP TRONG' ? 'bg-purple-900/20 text-purple-400 border-purple-800' : 'bg-blue-900/20 text-blue-400 border-blue-800'}`}>{r.layer}</span></td>
                                <td className="text-blue-400 font-bold">{r.lotCount}</td>
                                <td className="text-white font-bold">{r.pnl.toLocaleString()}</td>
                                <td className="text-yellow-500 font-bold">{Math.floor(r.points).toLocaleString()}</td>
                            </tr>
                        ))}
                      </tbody>
                  </table>
              </div>
              <div className="bg-slate-900 border-t border-slate-700 p-2 flex justify-between items-center text-[10px] font-black uppercase tracking-wider">
                    <span className="text-slate-500">TỔNG CỘNG:</span>
                    <div className="flex gap-4">
                        <span className="text-blue-400">{totalProduction.lots} LÔ</span>
                        <span className="text-green-400">{totalProduction.pnl.toLocaleString()} PNL</span>
                        <span className="text-yellow-500">{totalProduction.points.toLocaleString()} PTS</span>
                    </div>
              </div>
          </div>
      </div>

      {/* BOTTOM ROW: MACHINE LIVE & PERSONNEL */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="sum-card border-cyan-500/30 shadow-xl">
              <div className="sum-header bg-cyan-header">
                  <div className="flex items-center gap-2"><MonitorPlay size={16}/> 설비 가동 현황 (8-MACHINE LIVE)</div>
                  <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse shadow-[0_0_5px_#4ade80]"></div><span className="text-[10px] font-black">SYSTEM_ONLINE</span></div>
              </div>
              <div className="flex-1 overflow-x-auto">
                  <table className="sum-table">
                      <thead><tr><th className="w-16">Máy</th><th className="text-left px-4">Tên Model</th><th className="w-16">C.Đ</th><th className="text-right pr-4">Hiện trạng & Tiến độ</th></tr></thead>
                      <tbody>
                        {(machineLiveRows || []).map((m, idx) => (
                            <tr key={idx} className={m.isError ? 'row-error' : ''}>
                                <td className="font-black text-blue-400">{m.name}</td>
                                <td className="text-left px-4 font-bold text-slate-400 uppercase">{m.model}</td>
                                <td className="font-mono text-slate-500">{m.stage}</td>
                                <td className="text-right px-4">
                                    {m.isError ? (
                                        <div className="flex items-center justify-end gap-2 text-error text-[10px] italic uppercase"><AlertTriangle size={14}/> {m.reason}</div>
                                    ) : m.jobStatus === 'RUNNING' || m.jobStatus === 'STOPPED' ? (
                                        <div className="flex items-center justify-end gap-3"><div className="w-32 h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800"><div className="bg-blue-500 h-full shadow-[0_0_5px_cyan]" style={{ width: `${m.progress}%` }}></div></div><span className="text-[11px] font-black text-slate-300 italic font-mono">{m.progress}%</span></div>
                                    ) : (
                                        <span className="text-[10px] text-slate-600 italic font-black uppercase tracking-widest">비가동</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                      </tbody>
                  </table>
              </div>
          </div>

          <div className="sum-card border-orange-900/30 shadow-xl">
              <div className="sum-header bg-brown-header">
                  <div className="flex items-center gap-2"><Users size={16}/> 출근 현황 / TÌNH TRẠNG ĐI LÀM</div>
                  <div className="text-[10px] font-black uppercase tracking-widest">Real-time Attendance</div>
              </div>
              <div className="flex-1 overflow-x-auto">
                  <table className="sum-table">
                      <thead>
                          <tr>
                              <th className="w-10">No.</th>
                              <th className="text-left px-4">Họ tên nhân viên</th>
                              <th className="w-24">CA</th>
                              <th className="w-24">GIỜ VÀO</th>
                              <th className="w-24">GIỜ RA</th>
                              <th>TRẠNG THÁI / LÝ DO</th>
                          </tr>
                      </thead>
                      <tbody>
                        {(!attendanceRows || attendanceRows.length === 0) ? (
                            <tr><td colSpan={6} className="py-20 text-center text-slate-700 italic font-black uppercase tracking-widest opacity-20">실적없음 Không có dữ liệu chuyên cần</td></tr>
                        ) : attendanceRows.map((s: any, idx) => (
                            <tr key={idx} className="hover:bg-white/5 transition-colors">
                                <td className="text-slate-600 font-bold">{idx + 1}</td>
                                <td className="text-left px-4">
                                    <div className="font-bold text-slate-100 uppercase text-xs">{s?.name}</div>
                                    <div className="text-[9px] text-slate-500 font-mono uppercase">{s?.id} | {s?.pos}</div>
                                </td>
                                <td>
                                    <div className={`flex items-center justify-center gap-1 text-[10px] font-black ${s?.shiftRaw === 'NIGHT' ? 'text-purple-400' : 'text-orange-400'}`}>
                                        {s?.shiftRaw === 'NIGHT' ? <Moon size={12}/> : <Sun size={12}/>} 
                                        {s?.shift}
                                    </div>
                                </td>
                                <td className={`font-mono font-black text-xs ${s?.in === '--' ? 'text-slate-700' : s?.in === 'Đi muộn' ? 'text-yellow-500' : 'text-blue-400'}`}>
                                    {s?.in}
                                </td>
                                <td>
                                    <div className="flex flex-col items-center">
                                        <span className={`font-mono font-black text-xs ${s?.out === '--' ? 'text-slate-700' : s?.out === 'Về sớm' ? 'text-red-400' : 'text-orange-400'}`}>{s?.out}</span>
                                        {s?.ot > 0 && s?.out !== 'Về sớm' && (
                                            <span className="text-[9px] font-black text-yellow-500 leading-none mt-0.5">
                                                +{s.ot}h
                                            </span>
                                        )}
                                    </div>
                                </td>
                                <td>
                                    <div className="flex justify-center">
                                        <span className={`px-4 py-1.5 rounded text-[9px] font-black uppercase border ${s?.status === 'ĐANG LÀM' ? 'bg-green-900/20 text-green-500 border-green-800' : 'bg-red-900/20 text-red-500 border-red-800'}`}>
                                            {s?.status}
                                        </span>
                                    </div>
                                </td>
                            </tr>
                        ))}
                      </tbody>
                  </table>
              </div>
          </div>
      </div>
      
      {/* Hidden legacy icon reference to prevent any remaining illegal constructor errors if not cleaned elsewhere */}
      <div className="hidden"><LucideHistory size={14}/></div>
    </div>
  );
};
