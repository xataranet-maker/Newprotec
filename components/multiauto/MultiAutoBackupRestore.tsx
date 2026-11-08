
import React, { useRef, useState } from 'react';
import { HardDriveDownload, Download, Upload, CheckCircle2, AlertCircle, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
import { ImportRecord, ExportRecord, MachineSetup, NetDataRecord, StaffRecord, AccessoryRecord, AccessoryUsageRecord, ProductionHistoryRecord, Language, ProductReturnRecord, AccessoryReturnRecord, AccessoryParameter } from '../../types';
import { translations } from '../../data/locales';

interface MultiAutoBackupRestoreProps {
  moduleName?: string;
  language?: Language;
  
  // Data States
  importData?: ImportRecord[];
  exportData?: ExportRecord[];
  historyData?: ProductionHistoryRecord[];
  machineData?: MachineSetup[];
  netData?: NetDataRecord[];
  staffData?: StaffRecord[];
  accessoryData?: AccessoryRecord[];
  accessoryUsage?: AccessoryUsageRecord[];
  accessoryParams?: AccessoryParameter[];
  
  productReturns?: ProductReturnRecord[];
  accessoryReturns?: AccessoryReturnRecord[];

  // Custom data for other depts
  customData?: Record<string, { data: any[], setter: (val: any[]) => void }>;

  // Setters
  setImportData?: (data: ImportRecord[]) => void;
  setExportData?: (data: ExportRecord[]) => void;
  setHistoryData?: (data: ProductionHistoryRecord[]) => void;
  setMachineData?: (data: MachineSetup[]) => void;
  setNetData?: (data: NetDataRecord[]) => void;
  setStaffData?: (data: StaffRecord[]) => void;
  setAccessoryData?: (data: AccessoryRecord[]) => void;
  setAccessoryUsage?: (data: AccessoryUsageRecord[]) => void;
  setAccessoryParams?: (data: AccessoryParameter[]) => void;
  setProductReturns?: (data: ProductReturnRecord[]) => void;
  setAccessoryReturns?: (data: AccessoryReturnRecord[]) => void;
}

export const MultiAutoBackupRestore: React.FC<MultiAutoBackupRestoreProps> = ({ 
    moduleName = 'Multi Auto',
    language = 'vi',
    importData, exportData, historyData, machineData, netData, staffData, accessoryData, accessoryUsage, accessoryParams,
    productReturns, accessoryReturns,
    setImportData, setExportData, setHistoryData, setMachineData, setNetData, setStaffData, setAccessoryData, setAccessoryUsage, setAccessoryParams,
    setProductReturns, setAccessoryReturns,
    customData
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreStatus, setRestoreStatus] = useState<'IDLE' | 'SUCCESS' | 'ERROR'>('IDLE');
  
  const t = translations[language] || translations['vi'];

  const getPrefix = () => {
      const lower = moduleName.toLowerCase();
      if (lower.includes('multi')) return 'MULTI';
      if (lower.includes('stiff')) return 'STIFF';
      if (lower.includes('khuôn')) return 'KHUON';
      if (lower.includes('dập')) return 'DAP';
      if (lower.includes('thiết bị')) return 'EQUIP';
      if (lower.includes('chất lượng')) return 'QUAL';
      if (lower.includes('hc') || lower.includes('ns')) return 'HR';
      return 'DATA';
  };

  const PREFIX = getPrefix();

  // --- EXPORT LOGIC ---
  const handleBackup = () => {
      try {
          const wb = XLSX.utils.book_new();

          const serialize = (data: any[]) => {
              if (!data || data.length === 0) return [];
              return data.map(item => {
                  const newItem = { ...item };
                  if (newItem.productionProgress) newItem.productionProgress = JSON.stringify(newItem.productionProgress);
                  if (newItem.machineHistory) newItem.machineHistory = JSON.stringify(newItem.machineHistory);
                  if (newItem.sharedWith) newItem.sharedWith = JSON.stringify(newItem.sharedWith);
                  if (newItem.feedback) newItem.feedback = JSON.stringify(newItem.feedback);
                  if (newItem.capableMachines && Array.isArray(newItem.capableMachines)) {
                      newItem.capableMachines = newItem.capableMachines.join(',');
                  }
                  return newItem;
              });
          };

          const appendSheet = (data: any[] | undefined, sheetName: string) => {
              const ws = XLSX.utils.json_to_sheet(serialize(data || [])); 
              XLSX.utils.book_append_sheet(wb, ws, `${PREFIX}_${sheetName}`);
          };

          if (importData) appendSheet(importData, 'NHAP');
          if (exportData) appendSheet(exportData, 'XUAT');
          if (historyData) appendSheet(historyData, 'HOAN_THANH');
          if (machineData) appendSheet(machineData, 'MAY');
          if (netData) appendSheet(netData, 'DATA_NET');
          if (staffData) appendSheet(staffData, 'NHAN_VIEN');
          if (accessoryData) appendSheet(accessoryData, 'NHAP_PL');
          if (accessoryUsage) appendSheet(accessoryUsage, 'SD_PHU_LIEU');
          if (accessoryParams) appendSheet(accessoryParams, 'THONG_SO_PL');
          if (productReturns) appendSheet(productReturns, 'TRA_TP');
          if (accessoryReturns) appendSheet(accessoryReturns, 'TRA_PL');

          if (customData) {
              Object.entries(customData).forEach(([sheetKey, config]) => {
                  appendSheet((config as any).data, sheetKey);
              });
          }

          const dateStr = new Date().toLocaleDateString('en-GB').replace(/\//g, '-');
          const fileName = `Backup_${moduleName.replace(/\s+/g, '')}_${dateStr}.xlsx`;
          
          const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
          const blob = new Blob([wbout], { type: 'application/octet-stream' });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = fileName;
          a.click();
          window.URL.revokeObjectURL(url);
      } catch (error) {
          console.error("Backup failed:", error);
          alert("Lỗi khi tạo file backup.");
      }
  };

  // --- IMPORT LOGIC ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (!window.confirm(t.msg_restore_confirm)) {
          if (fileInputRef.current) fileInputRef.current.value = '';
          return;
      }

      setIsRestoring(true);
      const reader = new FileReader();
      reader.onload = (event) => {
          try {
              const dataBytes = new Uint8Array(event.target?.result as ArrayBuffer);
              const wb = XLSX.read(dataBytes, { type: 'array' });

              const deserialize = (data: any[]) => {
                  return data.map(item => {
                      const newItem = { ...item };
                      ['productionProgress', 'machineHistory', 'sharedWith', 'feedback'].forEach(key => {
                          if (newItem[key] && typeof newItem[key] === 'string') {
                              try { newItem[key] = JSON.parse(newItem[key]); } catch {}
                          }
                      });
                      if (newItem.capableMachines && typeof newItem.capableMachines === 'string') {
                          newItem.capableMachines = newItem.capableMachines.split(',').map(Number);
                      }
                      return newItem;
                  });
              };

              const tryRestore = (sheetKey: string, setter: ((val: any[]) => void) | undefined) => {
                  if (!setter) return;
                  const fullSheetName = `${PREFIX}_${sheetKey}`;
                  if (wb.Sheets[fullSheetName]) {
                      const jsonData = XLSX.utils.sheet_to_json(wb.Sheets[fullSheetName]);
                      setter(deserialize(jsonData));
                  }
              };

              tryRestore('NHAP', setImportData);
              tryRestore('XUAT', setExportData);
              tryRestore('HOAN_THANH', setHistoryData);
              tryRestore('MAY', setMachineData);
              tryRestore('DATA_NET', setNetData);
              tryRestore('NHAN_VIEN', setStaffData);
              tryRestore('NHAP_PL', setAccessoryData);
              tryRestore('SD_PHU_LIEU', setAccessoryUsage);
              tryRestore('THONG_SO_PL', setAccessoryParams);
              tryRestore('TRA_TP', setProductReturns);
              tryRestore('TRA_PL', setAccessoryReturns);

              if (customData) {
                  Object.entries(customData).forEach(([sheetKey, config]) => {
                      tryRestore(sheetKey, (config as any).setter);
                  });
              }

              setRestoreStatus('SUCCESS');
              alert(t.msg_restore_success);
          } catch (error) {
              setRestoreStatus('ERROR');
              alert("Lỗi khi khôi phục dữ liệu.");
          } finally {
              setIsRestoring(false);
          }
      };
      reader.readAsArrayBuffer(file);
  };

  return (
    <div className="p-6 h-full overflow-y-auto bg-slate-900 flex flex-col gap-6 text-slate-300">
      <div className="bg-slate-800 px-4 py-3 rounded-lg shadow-lg border border-slate-700 flex items-center gap-3">
          <div className="p-2 bg-teal-900/30 rounded border border-teal-600/50 text-teal-400">
              <HardDriveDownload size={20} />
          </div>
          <h1 className="text-lg font-bold text-white uppercase tracking-tight font-mono">
              {t.backup_title} ({moduleName})
          </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-700 flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 bg-blue-900/30 rounded-full flex items-center justify-center text-blue-400 mb-2 border border-blue-800">
                  <Download size={32} />
              </div>
              <h2 className="text-xl font-bold text-white font-mono">Sao Lưu Dữ Liệu</h2>
              <p className="text-sm text-slate-400">Xuất toàn bộ cơ sở dữ liệu hiện tại của bộ phận {moduleName} ra file Excel để lưu trữ an toàn.</p>
              <button onClick={handleBackup} className="mt-4 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg shadow-md flex items-center gap-2 transition-all border border-blue-500 uppercase text-xs tracking-widest"><FileSpreadsheet size={20} /> Tải bản sao lưu</button>
          </div>

          <div className="bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-700 flex flex-col items-center text-center gap-4 relative overflow-hidden">
              <div className="w-16 h-16 bg-orange-900/30 rounded-full flex items-center justify-center text-orange-400 mb-2 border border-orange-800">
                  <Upload size={32} />
              </div>
              <h2 className="text-xl font-bold text-white font-mono">Khôi Phục Dữ Liệu</h2>
              <div className="w-full max-w-xs border-2 border-dashed border-slate-600 rounded-lg p-6 bg-slate-900 hover:bg-slate-700/50 transition-colors cursor-pointer flex flex-col items-center gap-2" onClick={() => fileInputRef.current?.click()}>
                  <p className="text-sm text-slate-400 font-medium">Nhấn hoặc kéo file vào đây</p>
                  <span className="text-[10px] text-slate-500">Chỉ chấp nhận file .xlsx được xuất từ hệ thống</span>
              </div>
              <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx" onChange={handleFileChange} />
              {isRestoring && <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm flex items-center justify-center z-10"><div className="flex flex-col items-center gap-2"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div><span className="font-bold text-blue-400">Đang khôi phục...</span></div></div>}
          </div>
      </div>
    </div>
  );
};
