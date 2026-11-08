import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Sidebar } from './components/common/Sidebar'; 
import { TopBar } from './components/common/TopBar'; 
import { Dashboard } from './components/common/Dashboard';
import { Login } from './components/common/Login';
import { Assistant } from './components/common/Assistant';
import { PWAPrompt } from './components/common/PWAPrompt';
import { ProductionPlanTab } from './components/common/ProductionPlanTab';
import { ProductionPlanningHub } from './components/common/ProductionPlanningHub';
import { EmployeeProfile } from './components/hr/EmployeeProfile';

// --- IMPORT MULTI AUTO ---
import { MultiAutoImport } from './components/multiauto/MultiAutoImport';
import { MultiAutoProduction } from './components/multiauto/MultiAutoProduction';
import { MultiAutoNetData } from './components/multiauto/MultiAutoNetData';
import { MultiAutoInventory } from './components/multiauto/MultiAutoInventory';
import { MultiAutoMachineSetup } from './components/multiauto/MultiAutoMachineSetup';
import { MultiAutoStaff } from './components/multiauto/MultiAutoStaff';
import { MultiAutoAccessoriesImport } from './components/multiauto/MultiAutoAccessoriesImport';
import { MultiAutoAccessoriesInventory } from './components/multiauto/MultiAutoAccessoriesInventory';
import { MultiAutoCompletedProduction } from './components/multiauto/MultiAutoCompletedProduction';
import { MultiAutoBackupRestore } from './components/multiauto/MultiAutoBackupRestore';
import { MultiAutoMachineHistory } from './components/multiauto/MultiAutoMachineHistory';
import { MultiAutoSummaryReport } from './components/multiauto/MultiAutoSummaryReport';
import { MultiAutoPerformanceReport } from './components/multiauto/MultiAutoPerformanceReport';
import { MultiAutoMonthlyReport } from './components/multiauto/MultiAutoMonthlyReport';
import { MultiAutoProductionStatusKR } from './components/multiauto/MultiAutoProductionStatusKR';
import { MultiAutoDataViewer } from './components/multiauto/MultiAutoDataViewer';
import { MultiAutoDataExportViewer } from './components/multiauto/MultiAutoDataExportViewer';
import { MultiAutoAccessoriesDataViewer } from './components/multiauto/MultiAutoAccessoriesDataViewer';
import { MultiAutoExport } from './components/multiauto/MultiAutoExport';
import { MultiAutoSendMail } from './components/multiauto/MultiAutoSendMail';
import { MultiAutoMachines } from './components/multiauto/MultiAutoMachines';
import { AccessoryImportComparison } from './components/multiauto/AccessoryImportComparison';
import { AccessoryParamsManagement } from './components/multiauto/AccessoryParamsManagement';
import { AccessoryCheckSheet } from './components/multiauto/AccessoryCheckSheet';
import { MultiAutoAttendanceConfirmation } from './components/multiauto/MultiAutoAttendanceConfirmation';

// --- COMMON COMPONENTS ---
import { CheckMaterial } from './components/common/CheckMaterial';

// --- IMPORT HR ---
import { HRAnnouncements } from './components/hr/HRAnnouncements';
import { HRStaffManagement } from './components/hr/HRStaffManagement';
import { HRAddStaff } from './components/hr/HRAddStaff';
import { HRContracts } from './components/hr/HRContracts';
import { HRAttendanceDiary } from './components/hr/HRAttendanceDiary';
import { HRTimekeeping } from './components/hr/HRTimekeeping';
import { HROvertime } from './components/hr/HROvertime';
import { HRLeaves } from './components/hr/HRLeaves';
import { HRPayroll } from './components/hr/HRPayroll';
import { HRSalarySlip } from './components/hr/HRSalarySlip';
import { HRAssets } from './components/hr/HRAssets';
import { HRDocuments } from './components/hr/HRDocuments';
import { HRTraining } from './components/hr/HRTraining';

import { AdminUserManagement } from './components/admin/AdminUserManagement';

import { ribbonData } from './data/ribbonData';
import { 
  ImportRecord, ExportRecord, NetDataRecord, MachineSetup, StaffRecord, AccessoryRecord, 
  AccessoryUsageRecord, ProductionHistoryRecord, UserAccount, Language, 
  ContractRecord, OvertimeRecord, PayrollRecord, SalarySlipRecord, HRAnnouncement, 
  TimekeepingRecord, AssetRecord, TrainingRecord, DocumentRecord, MachineActivityLog, AttendanceRecord,
  AttendanceCorrectionRequest, AccessoryParameter, AttendanceConfirmationRecord
} from './types';
import { translations } from './data/locales';

const SYNC_API_URL = '/api/sync';

const generateMachines = (prefix: string) => Array.from({ length: 8 }, (_, i) => ({
  id: i + 1, name: `${prefix} 0${i + 1}`, note: 'NORMAL' as const, description: '', updatedAt: new Date().toLocaleTimeString('vi-VN'), staffDay: '', staffNight: ''
}));

const loadFromStorage = (key: string, defaultValue: any) => {
    try {
        const saved = localStorage.getItem(key);
        if (saved) return JSON.parse(saved);
    } catch (e) { console.error("Storage Load Error", e); }
    return defaultValue;
};

const DEFAULT_ADMINS: UserAccount[] = [
    { username: 'Newprotec', password: 'New123@', fullName: 'Newprotec Admin', role: 'admin' },
    { username: 'admin', password: '123', fullName: 'Root Admin', role: 'admin' }
];

export function App() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const isInitialized = useRef(false);

  const [userAccounts, setUserAccounts] = useState<UserAccount[]>(() => {
      const saved = loadFromStorage('app_users', []);
      const combined = [...DEFAULT_ADMINS];
      (saved || []).forEach((s: UserAccount) => { 
          if (!combined.some(c => c.username.toLowerCase() === s.username.toLowerCase())) combined.push(s); 
      });
      return combined;
  });
  
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [activeTab, setActiveTab] = useState<string>('home');
  const [activeItem, setActiveItem] = useState<string>('dashboard_home');
  const [isRailOpen, setIsRailOpen] = useState(false); 
  const [isDrawerOpen, setDrawerOpen] = useState(false); 
  const [language, setLanguage] = useState<Language>(() => loadFromStorage('app_lang', 'vi'));
  const [deptTargets, setDeptTargets] = useState<Record<string, number>>(() => loadFromStorage('app_dept_targets', { 'Multi Auto': 500 }));

  // --- INITIAL DATA HYDRATION FROM STORAGE (V2 or V1) ---
  const initialData = useMemo(() => {
    return loadFromStorage('newprotec_v2_full_state', null) || loadFromStorage('newprotec_full_state', null) || {};
  }, []);

  // --- STATES (MULTI AUTO & COMMON) ---
  const [importedRecords, setImportedRecords] = useState<ImportRecord[]>(() => initialData.importedRecords || initialData.importData || initialData.multiImportData || initialData.imports || []);
  const [exportedRecords, setExportedRecords] = useState<ExportRecord[]>(() => initialData.exportedRecords || initialData.exportData || initialData.multiExportData || initialData.exports || []);
  const [accessoriesRecords, setAccessoriesRecords] = useState<AccessoryRecord[]>(() => initialData.accessoriesRecords || initialData.accessoriesData || initialData.accessoryData || initialData.multiAccessories || []);
  const [accessoriesUsage, setAccessoriesUsage] = useState<AccessoryUsageRecord[]>(() => initialData.accessoriesUsage || initialData.accessoryUsage || []);
  const [netDataRecords, setNetDataRecords] = useState<NetDataRecord[]>(() => initialData.netDataRecords || initialData.netData || initialData.multiNetData || []);
  const [accessoryParams, setAccessoryParams] = useState<AccessoryParameter[]>(() => initialData.accessoryParams || initialData.accParams || []);
  const [machineStatuses, setMachineStatuses] = useState<MachineSetup[]>(() => initialData.machineStatuses || initialData.machineData || initialData.machines || initialData.multiMachines || generateMachines("Multi"));
  const [staffRecords, setStaffRecords] = useState<StaffRecord[]>(() => initialData.staffRecords || initialData.staffData || initialData.staff || initialData.multiStaff || []);
  const [multiHistory, setMultiHistory] = useState<ProductionHistoryRecord[]>(() => initialData.multiHistory || initialData.historyData || initialData.history || []);
  const [machineActivityLogs, setMachineActivityLogs] = useState<MachineActivityLog[]>(() => initialData.machineActivityLogs || initialData.activityLogs || initialData.logs || []);
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>(() => initialData.attendanceHistory || initialData.attendanceData || initialData.attendance || []);
  const [attendanceConfirmations, setAttendanceConfirmations] = useState<AttendanceConfirmationRecord[]>(() => initialData.attendanceConfirmations || initialData.attConfirmations || []);
  
  const [qualityStaff, setQualityStaff] = useState<StaffRecord[]>(() => initialData.qualityStaff || []);
  const [hrStaff, setHrStaff] = useState<StaffRecord[]>(() => initialData.hrStaff || []);
  const [warehouseStaff, setWarehouseStaff] = useState<StaffRecord[]>(() => initialData.warehouseStaff || []);
  const [officeStaff, setOfficeStaff] = useState<StaffRecord[]>(() => initialData.officeStaff || []);

  const [contracts, setContracts] = useState<ContractRecord[]>(() => initialData.contracts || initialData.hrContracts || []);
  const [overtimeRecords, setOvertimeRecords] = useState<OvertimeRecord[]>(() => initialData.overtimeRecords || initialData.hrOvertime || []);
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>(() => initialData.payrollRecords || initialData.hrPayroll || initialData.payrolls || []);
  const [salarySlipRecords, setSalarySlipRecords] = useState<SalarySlipRecord[]>(() => initialData.salarySlipRecords || initialData.hrSalarySlips || initialData.salarySlips || []);
  const [timekeepingRecords, setTimekeepingRecords] = useState<TimekeepingRecord[]>(() => initialData.timekeepingRecords || initialData.timekeeping || initialData.hrTimekeeping || []);
  const [announcements, setAnnouncements] = useState<HRAnnouncement[]>(() => initialData.announcements || initialData.hrAnnouncements || []);
  const [hrAssets, setHrAssets] = useState<AssetRecord[]>(() => initialData.hrAssets || initialData.assets || []);
  const [trainingRecords, setTrainingRecords] = useState<TrainingRecord[]>(() => initialData.trainingRecords || initialData.hrTraining || []);
  const [documentRecords, setDocumentRecords] = useState<DocumentRecord[]>(() => initialData.documentRecords || initialData.hrDocuments || []);
  const [attendanceRequests, setAttendanceRequests] = useState<AttendanceCorrectionRequest[]>(() => initialData.attendanceRequests || initialData.attRequests || []);
  const [productReturns, setProductReturns] = useState<any[]>(() => initialData.productReturns || initialData.returns || []);
  const [accessoryReturns, setAccessoryReturns] = useState<any[]>(() => initialData.accessoryReturns || initialData.accReturns || []);
  const [productionPlans, setProductionPlans] = useState<any[]>(() => initialData.productionPlans || initialData.plans || []);

  // --- DERIVATIONS ---
  const allStaff = useMemo(() => [
      ...staffRecords, ...qualityStaff, ...hrStaff, ...warehouseStaff, ...officeStaff
  ], [staffRecords, qualityStaff, hrStaff, warehouseStaff, officeStaff]);

  const visibleTabs = useMemo(() => {
      return ribbonData.filter(tab => {
          const roleAllowed = !tab.allowedRoles || (currentUser && tab.allowedRoles.includes(currentUser.role));
          if (tab.id === 'admin' && currentUser?.username.toLowerCase() === 'admin') {
              return false;
          }
          return roleAllowed;
      });
  }, [currentUser]);

  const currentTab = useMemo(() => visibleTabs.find(t => t.id === activeTab), [visibleTabs, activeTab]);
  const currentItem = useMemo(() => {
      if (!currentTab) return null;
      for (const group of currentTab.groups) {
          const item = group.items.find(i => i.id === activeItem);
          if (item) return item;
      }
      return null;
  }, [currentTab, activeItem]);

  // --- STATE APPLICATION HELPER WITH BACKWARD COMPATIBILITY ---
  const applyState = useCallback((raw: any) => {
    let s = raw;
    if (typeof s === 'string') {
      try {
        s = JSON.parse(s);
      } catch (e) {
        console.error("applyState JSON parse error:", e);
        return;
      }
    }
    if (!s || typeof s !== 'object') return;

    const users = s.userAccounts || s.users;
    if (users && Array.isArray(users) && users.length > 0) {
        const combined = [...DEFAULT_ADMINS];
        users.forEach((acc: UserAccount) => {
            if (!combined.some(c => c.username.toLowerCase() === acc.username.toLowerCase())) combined.push(acc);
        });
        setUserAccounts(combined);
    }

    const imported = s.importedRecords || s.importData || s.multiImportData || s.imports;
    if (imported && Array.isArray(imported)) setImportedRecords(imported);

    const exported = s.exportedRecords || s.exportData || s.multiExportData || s.exports;
    if (exported && Array.isArray(exported)) setExportedRecords(exported);

    const accessories = s.accessoriesRecords || s.accessoriesData || s.accessoryData || s.multiAccessories;
    if (accessories && Array.isArray(accessories)) setAccessoriesRecords(accessories);

    const accUsage = s.accessoriesUsage || s.accessoryUsage;
    if (accUsage && Array.isArray(accUsage)) setAccessoriesUsage(accUsage);

    const netData = s.netDataRecords || s.netData || s.multiNetData;
    if (netData && Array.isArray(netData)) setNetDataRecords(netData);

    const params = s.accessoryParams || s.accParams;
    if (params && Array.isArray(params)) setAccessoryParams(params);

    const machines = s.machineStatuses || s.machineData || s.machines || s.multiMachines;
    if (machines && Array.isArray(machines)) setMachineStatuses(machines);

    const staff = s.staffRecords || s.staffData || s.staff || s.multiStaff;
    if (staff && Array.isArray(staff)) setStaffRecords(staff);

    const history = s.multiHistory || s.historyData || s.history;
    if (history && Array.isArray(history)) setMultiHistory(history);

    const logs = s.machineActivityLogs || s.activityLogs || s.logs;
    if (logs && Array.isArray(logs)) setMachineActivityLogs(logs);

    const attHistory = s.attendanceHistory || s.attendanceData || s.attendance;
    if (attHistory && Array.isArray(attHistory)) setAttendanceHistory(attHistory);

    const attConf = s.attendanceConfirmations || s.attConfirmations;
    if (attConf && Array.isArray(attConf)) setAttendanceConfirmations(attConf);

    if (s.qualityStaff && Array.isArray(s.qualityStaff)) setQualityStaff(s.qualityStaff);
    if (s.hrStaff && Array.isArray(s.hrStaff)) setHrStaff(s.hrStaff);
    if (s.warehouseStaff && Array.isArray(s.warehouseStaff)) setWarehouseStaff(s.warehouseStaff);
    if (s.officeStaff && Array.isArray(s.officeStaff)) setOfficeStaff(s.officeStaff);

    const contractsList = s.contracts || s.hrContracts;
    if (contractsList && Array.isArray(contractsList)) setContracts(contractsList);

    const otList = s.overtimeRecords || s.hrOvertime;
    if (otList && Array.isArray(otList)) setOvertimeRecords(otList);

    const payrollList = s.payrollRecords || s.hrPayroll || s.payrolls;
    if (payrollList && Array.isArray(payrollList)) setPayrollRecords(payrollList);

    const salaryList = s.salarySlipRecords || s.hrSalarySlips || s.salarySlips;
    if (salaryList && Array.isArray(salaryList)) setSalarySlipRecords(salaryList);

    const tkList = s.timekeepingRecords || s.timekeeping || s.hrTimekeeping;
    if (tkList && Array.isArray(tkList)) setTimekeepingRecords(tkList);

    const annList = s.announcements || s.hrAnnouncements;
    if (annList && Array.isArray(annList)) setAnnouncements(annList);

    const assetsList = s.hrAssets || s.assets;
    if (assetsList && Array.isArray(assetsList)) setHrAssets(assetsList);

    const trainingList = s.trainingRecords || s.hrTraining;
    if (trainingList && Array.isArray(trainingList)) setTrainingRecords(trainingList);

    const docsList = s.documentRecords || s.hrDocuments;
    if (docsList && Array.isArray(docsList)) setDocumentRecords(docsList);

    const reqList = s.attendanceRequests || s.attRequests;
    if (reqList && Array.isArray(reqList)) setAttendanceRequests(reqList);

    const prodReturns = s.productReturns || s.returns;
    if (prodReturns && Array.isArray(prodReturns)) setProductReturns(prodReturns);

    const accReturns = s.accessoryReturns || s.accReturns;
    if (accReturns && Array.isArray(accReturns)) setAccessoryReturns(accReturns);

    const plans = s.productionPlans || s.plans;
    if (plans && Array.isArray(plans)) setProductionPlans(plans);

    if (s.deptTargets) setDeptTargets(s.deptTargets);
    if (s.language) setLanguage(s.language);
  }, []);

  // --- SYNC ENGINE ---
  const performSync = useCallback(async (isPush: boolean) => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
        const state = {
            userAccounts, importedRecords, exportedRecords, accessoriesRecords, accessoriesUsage, 
            netDataRecords, accessoryParams, machineStatuses, staffRecords, multiHistory, 
            machineActivityLogs, attendanceHistory, attendanceConfirmations, qualityStaff, 
            hrStaff, warehouseStaff, officeStaff, contracts, overtimeRecords, payrollRecords, 
            salarySlipRecords, timekeepingRecords, announcements, hrAssets, trainingRecords, 
            documentRecords, attendanceRequests, productReturns, accessoryReturns, productionPlans, 
            deptTargets, language
        };

        if (isPush) {
            try {
                localStorage.setItem('newprotec_v2_full_state', JSON.stringify(state));
                localStorage.setItem('newprotec_full_state', JSON.stringify(state));
            } catch (storageErr) {
                console.warn('LocalStorage save error:', storageErr);
            }
        }

        let result: any = null;
        try {
            const res = await fetch(SYNC_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: isPush ? 'PUSH' : 'PULL', data: isPush ? state : undefined })
            });

            if (res.ok) {
                const text = await res.text();
                if (text && text.trim()) {
                    try {
                        result = JSON.parse(text);
                    } catch (parseErr) {
                        console.warn("Sync JSON parse warning:", parseErr);
                    }
                }
            } else {
                console.warn(`Sync endpoint responded with status ${res.status}`);
            }
        } catch (fetchErr) {
            console.warn("Sync fetch warning (using local store):", fetchErr);
        }

        if (!isPush) {
            if (result && result.success && result.data && Object.keys(result.data).length > 0) {
                applyState(result.data);
                try {
                    localStorage.setItem('newprotec_v2_full_state', JSON.stringify(result.data));
                    localStorage.setItem('newprotec_full_state', JSON.stringify(result.data));
                } catch {}
            } else {
                // Fall back to local storage if remote data was null or empty
                const savedLocal = loadFromStorage('newprotec_v2_full_state', null) || loadFromStorage('newprotec_full_state', null);
                if (savedLocal) {
                    applyState(savedLocal);
                    // If remote database was empty, seed it with our local state
                    if (result && result.success && (!result.data || Object.keys(result.data).length === 0)) {
                        fetch(SYNC_API_URL, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ action: 'PUSH', data: savedLocal })
                        }).catch(() => {});
                    }
                }
            }
            setLastSyncTime(new Date().toLocaleTimeString('vi-VN'));
        } else {
            if (result && result.success) {
                setLastSyncTime(new Date().toLocaleTimeString('vi-VN'));
            }
        }
    } catch (e) {
        console.warn("Sync Error caught gracefully:", e);
    } finally {
        setIsSyncing(false);
    }
  }, [
      userAccounts, importedRecords, exportedRecords, accessoriesRecords, accessoriesUsage, netDataRecords, accessoryParams, machineStatuses, staffRecords, multiHistory, machineActivityLogs, attendanceHistory, attendanceConfirmations, qualityStaff, hrStaff, warehouseStaff, officeStaff, contracts, overtimeRecords, payrollRecords, salarySlipRecords, timekeepingRecords, announcements, hrAssets, trainingRecords, documentRecords, attendanceRequests, productReturns, accessoryReturns, productionPlans, deptTargets, language, isSyncing, applyState
  ]);

  // --- SYNC EFFECTS ---
  useEffect(() => {
    if (!isInitialized.current) {
        performSync(false);
        isInitialized.current = true;
    }
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
        if (isInitialized.current && !isSyncing) {
            performSync(true);
        }
    }, 120000);
    return () => clearInterval(timer);
  }, [performSync, isSyncing]);

  // --- PRODUCTION ENGINE (MULTI AUTO) ---
  useEffect(() => {
    const engineInterval = setInterval(() => {
        const now = Date.now();
        const norm = (s: string) => (s || '').trim().toUpperCase();

        importedRecords.forEach(record => {
            if (record.productionProgress) {
                Object.entries(record.productionProgress).forEach(([stageName, p]: [string, any]) => {
                    if (p.status === 'RUNNING') {
                        const net = netDataRecords.find(n => norm(n.model) === norm(record.model) && norm(n.code) === norm(record.code));
                        if (net) {
                            let ptsPerPnl = 1;
                            const stageKey = norm(stageName);

                            if (norm(net.stage) === stageKey) ptsPerPnl = net.stage1Points || 1;
                            else if (norm(net.stage2 || '') === stageKey) ptsPerPnl = net.stage2Points || 1;
                            else if (norm(net.stage3 || '') === stageKey) ptsPerPnl = net.stage3Points || 1;
                            else if (norm(net.stage4 || '') === stageKey) ptsPerPnl = net.stage4Points || 1;

                            const tpp = net.timePerPoint || 1.5;
                            let elapsed = p.accumulatedTime || 0;
                            if (p.lastStartTimestamp) elapsed += (now - p.lastStartTimestamp) / 1000;
                            
                            const totalRequiredSeconds = record.quantity * ptsPerPnl * tpp;
                            if (totalRequiredSeconds > 0 && elapsed >= totalRequiredSeconds) {
                                handleUpdateStatus('MULTI', record.id, 'COMPLETED', undefined, stageName);
                            }
                        }
                    }
                });
            }
        });

        machineStatuses.forEach(machine => {
            const isMachineBusy = importedRecords.some(r => 
                r.productionProgress && Object.values(r.productionProgress).some((p: any) => 
                    p.machine === machine.name && (p.status === 'RUNNING' || p.status === 'STOPPED')
                )
            );

            if (!isMachineBusy && machine.note === 'NORMAL') {
                const potentialNextJobs = importedRecords
                    .filter(r => r.isVerified && r.productionProgress && 
                        Object.entries(r.productionProgress).some(([st, p]: [string, any]) => 
                            p.status === 'PENDING' && p.machine === machine.name && p.accessoryLot 
                        )
                    )
                    .sort((a, b) => {
                         const dateA = a.mpsDate ? new Date(a.mpsDate.split('/').reverse().join('-')).getTime() : Infinity;
                         const dateB = b.mpsDate ? new Date(b.mpsDate.split('/').reverse().join('-')).getTime() : Infinity;
                         if (dateA !== dateB) return dateA - dateB;
                         return (b.stayDurationMinutes || 0) - (a.stayDurationMinutes || 0);
                    });

                const nextJob = potentialNextJobs[0];
                if (nextJob) {
                    const [stName, p] = Object.entries(nextJob.productionProgress!).find(([_, prog]: [string, any]) => prog.machine === machine.name && prog.status === 'PENDING' && prog.accessoryLot)!;
                    handleUpdateStatus('MULTI', nextJob.id, 'RUNNING', undefined, stName);
                }
            }
        });
    }, 1000); 
    return () => clearInterval(engineInterval);
  }, [importedRecords, accessoriesUsage, netDataRecords, machineStatuses]);

  const calculateCurrentShift = () => {
    const hour = new Date().getHours();
    return (hour >= 8 && hour < 20) ? 'Ca Ngày' : 'Ca Đêm';
  };

  const handleUpdateStatus = (dept: string, id: number, newStatus: any, stopReason?: string, stage?: string, extra?: any) => {
    const timestamp = new Date().toLocaleTimeString('vi-VN');
    const fullDateStr = new Date().toLocaleDateString('vi-VN');
    const nowTime = new Date();
    const logical = new Date(nowTime);
    if (nowTime.getHours() < 8) logical.setDate(logical.getDate() - 1);
    const logicalDateStr = `${String(logical.getDate()).padStart(2, '0')}/${String(logical.getMonth() + 1).padStart(2, '0')}/${logical.getFullYear()}`;

    const updateRecord = (record: ImportRecord): ImportRecord => {
        const currentStage = stage || record.stage;
        const progress = record.productionProgress || {};
        const stageProgress = progress[currentStage] || { status: 'PENDING' };
        const oldStatus = stageProgress.status;
        
        let newAccumulatedTime = stageProgress.accumulatedTime || 0;
        if (oldStatus === 'RUNNING' && stageProgress.lastStartTimestamp) {
            newAccumulatedTime += (nowTime.getTime() - stageProgress.lastStartTimestamp) / 1000;
        }

        const newProgress = { 
            ...progress, 
            [currentStage]: { 
                ...stageProgress, 
                status: newStatus, 
                accumulatedTime: newAccumulatedTime,
                stopReason: stopReason || stageProgress.stopReason, 
                lastStartTimestamp: newStatus === 'RUNNING' ? nowTime.getTime() : undefined, 
                lastStopTimestamp: newStatus === 'STOPPED' ? nowTime.getTime() : stageProgress.lastStopTimestamp, 
                completedAt: newStatus === 'COMPLETED' ? new Date().toLocaleString('vi-VN') : stageProgress.completedAt, 
                ...(extra || {}) 
            } 
        };

        if (newStatus === 'RUNNING' && !newProgress[currentStage].startTime) newProgress[currentStage].startTime = timestamp;
        
        const machineName = newProgress[currentStage].machine || record.moldNo || 'N/A';
        let eventType: MachineActivityLog['eventType'] = 'START';
        if (newStatus === 'RUNNING') eventType = (oldStatus === 'STOPPED') ? 'RESUME' : 'START';
        else if (newStatus === 'STOPPED') eventType = 'STOP';
        else if (newStatus === 'COMPLETED') eventType = 'FINISH';

        const logEntry: MachineActivityLog = { 
            id: Date.now() + Math.random(), machineName, department: 'MULTI', eventType, timestamp, date: fullDateStr, logicalDate: logicalDateStr, model: record.model, lotNo: record.lotNo, reason: stopReason, operator: currentUser?.fullName || 'Hệ thống Auto', durationSeconds: newStatus === 'COMPLETED' ? Math.floor(newAccumulatedTime) : undefined
        };
        setMachineActivityLogs(prev => [logEntry, ...prev]);

        if (newStatus === 'COMPLETED') {
            const finalProg = newProgress[currentStage];
            const net = netDataRecords.find(n => n.model === record.model && n.code === record.code);

            const historyRecord: ProductionHistoryRecord = { 
                ...record, department: 'MULTI', date: logicalDateStr, historyId: Date.now() + Math.random(), completedAt: new Date().toLocaleString('vi-VN'), stageCompleted: currentStage, machine: finalProg.machine, moldNo: finalProg.moldNo || record.moldNo, operator: currentUser?.fullName || 'Hệ thống', productionStartTime: finalProg.startTime, usedAccessoryLot: finalProg.accessoryLot, tableTemp: net?.tableTemp, padTemp: net?.padTemp, airPressure: net?.airPressure, totalDuration: Math.floor(newAccumulatedTime)
            };

            setMultiHistory(prev => [historyRecord, ...prev]);
        }
        return { ...record, productionStatus: newStatus, productionProgress: newProgress };
    };

    setImportedRecords(prev => prev.map(r => r.id === id ? updateRecord(r) : r));
  };

  const handleLinkAccessory = (dept: string, prodId: number, lot: string, qty: number, stage: string) => {
      setAccessoriesUsage(prev => [...prev, { 
          id: Date.now() + Math.random(), accessoryLotNo: lot, productionId: prodId, productionStage: stage, quantity: qty, timestamp: new Date().toLocaleString(), model: '', code: '' 
      }]);

      const updater = (prev: ImportRecord[]) => prev.map(r => {
          if (r.id === prodId) {
              const progress = r.productionProgress || {};
              const stProg = progress[stage] || { status: 'PENDING' };
              const currentLots = stProg.accessoryLot ? stProg.accessoryLot.split(', ') : [];
              if (!currentLots.includes(lot)) currentLots.push(lot);
              return { ...r, productionProgress: { ...progress, [stage]: { ...stProg, accessoryLot: currentLots.join(', ') } } };
          }
          return r;
      });

      setImportedRecords(updater);
  };

  const handleUpdateMpsBatch = (dept: string, updates: {id: number, mpsDate: string, stayDurationMinutes: number, stayDurationHuman: string}[]) => {
      const updateMap = new Map(updates.map(u => [u.id, u]));
      const adapter = (prev: ImportRecord[]) => prev.map(r => {
          const u = updateMap.get(r.id);
          if (u) return { ...r, mpsDate: u.mpsDate, stayDurationMinutes: u.stayDurationMinutes, stayDurationHuman: u.stayDurationHuman };
          return r;
      });
      setImportedRecords(adapter);
  };

  const handleUpdateStaffInfo = useCallback((updatedStaff: StaffRecord) => {
      const dept = updatedStaff.department?.toUpperCase();
      const updater = (prev: StaffRecord[]) => prev.map(s => s.employeeId === updatedStaff.employeeId ? updatedStaff : s);

      if (dept === 'QUALITY') setQualityStaff(updater);
      else if (dept === 'HR' || dept === 'HC & NS') setHrStaff(updater);
      else if (dept === 'WAREHOUSE') setWarehouseStaff(updater);
      else if (dept === 'OFFICE') setOfficeStaff(updater);
      else setStaffRecords(updater);
      
      setTimeout(() => performSync(true), 500);
  }, [performSync]);

  const handleUpdateAvatar = useCallback((newUrl: string) => {
      if (!currentUser?.employeeId) return;
      const staff = allStaff.find(s => s.employeeId === currentUser.employeeId);
      if (staff) {
          handleUpdateStaffInfo({ ...staff, avatarUrl: newUrl });
      } else {
          console.warn("Staff record not found for avatar update, employeeId:", currentUser.employeeId);
      }
  }, [currentUser, allStaff, handleUpdateStaffInfo]);

  if (!currentUser) return <Login users={userAccounts} allStaff={allStaff} onLogin={setCurrentUser} language={language} onLanguageChange={setLanguage} />;

  const renderContent = () => {
    const id = activeItem.toLowerCase();

    if (currentUser.role === 'staff' && (id === 'dashboard_home' || id === 'home')) {
        return <EmployeeProfile 
            currentUser={currentUser} 
            staffInfo={allStaff.find(s => s.employeeId === currentUser.employeeId)} 
            contracts={contracts} 
            salarySlips={salarySlipRecords} 
            payrollRecords={payrollRecords} 
            overtimeRecords={overtimeRecords} 
            announcements={announcements} 
            timekeepingRecords={timekeepingRecords} 
            attendanceRequests={attendanceRequests} 
            onRequestCorrection={req => setAttendanceRequests([req, ...attendanceRequests])} 
            attendanceConfirmations={attendanceConfirmations}
            onUpdateAttendanceConfirmation={setAttendanceConfirmations}
            onUpdateStaffInfo={handleUpdateStaffInfo}
            onUpdateAvatar={handleUpdateAvatar}
        />;
    }

    switch(id) {
      case 'dashboard_home': return <Dashboard activeModule="ALL" multiAuto={{ imports: importedRecords, exports: exportedRecords, machineStatuses }} language={language} onNavigate={setActiveItem} deptTargets={deptTargets} allNetData={netDataRecords} allHistoryData={multiHistory} allStaffData={allStaff} attendanceHistory={attendanceHistory} overtimeRecords={overtimeRecords} announcements={announcements} onAddPlan={(p) => setProductionPlans([p, ...productionPlans])} currentUser={currentUser} />;
      case 'personal_profile': return <EmployeeProfile currentUser={currentUser} staffInfo={allStaff.find(s => s.employeeId === currentUser.employeeId)} contracts={contracts} salarySlips={salarySlipRecords} payrollRecords={payrollRecords} overtimeRecords={overtimeRecords} announcements={announcements} timekeepingRecords={timekeepingRecords} attendanceRequests={attendanceRequests} onRequestCorrection={req => setAttendanceRequests([req, ...attendanceRequests])} attendanceConfirmations={attendanceConfirmations} onUpdateAttendanceConfirmation={setAttendanceConfirmations} onUpdateStaffInfo={handleUpdateStaffInfo} onUpdateAvatar={handleUpdateAvatar} />;
      case 'planning_hub': return <ProductionPlanningHub allNetData={netDataRecords} onAddPlan={(p) => setProductionPlans([p, ...productionPlans])} currentUser={currentUser} />;
      case 'home_announcements': return <HRAnnouncements announcements={announcements} setAnnouncements={setAnnouncements} allStaff={allStaff} language={language} userRole={currentUser.role} />;
      case 'production_plans': return <ProductionPlanTab plans={productionPlans} departmentId="ALL" />;
      
      // --- MULTI AUTO ---
      case 'prod_report': return <MultiAutoSummaryReport importData={importedRecords} exportData={exportedRecords} historyData={multiHistory} machineData={machineStatuses} staffData={staffRecords} netData={netDataRecords} productReturns={productReturns} targetPnl={deptTargets['Multi Auto']} attendanceHistory={attendanceHistory} overtimeRecords={overtimeRecords} />;
      case 'model_tracking': return <MultiAutoPerformanceReport importData={importedRecords} historyData={multiHistory} netData={netDataRecords} machineStatuses={machineStatuses} targetPnl={deptTargets['Multi Auto']} language={language} />;
      case 'quality_report': return <MultiAutoMonthlyReport historyData={multiHistory} netData={netDataRecords} machines={machineStatuses} targetPnl={deptTargets['Multi Auto']} language={language} onUpdateTarget={(v) => setDeptTargets({...deptTargets, 'Multi Auto': v})} />;
      case 'prod_report_kr': return <MultiAutoProductionStatusKR historyData={multiHistory} netData={netDataRecords} targetPnl={deptTargets['Multi Auto']} userRole={currentUser.role} />;
      case 'production': return <MultiAutoProduction data={importedRecords.filter(r => r.isVerified)} onUpdateStatus={(id, s, r, st, ex) => handleUpdateStatus('MULTI', id, s, r, st, ex)} onUpdateMachine={(id, m, s) => setImportedRecords(importedRecords.map(r => r.id === id ? { ...r, productionProgress: { ...(r.productionProgress || {}), [s || r.stage]: { ...(r.productionProgress?.[s || r.stage] || { status: 'PENDING' }), machine: m } } } : r))} onLinkAccessory={(id, lot, qty, s) => handleLinkAccessory('MULTI', id, lot, qty, s || '1L-1')} onUpdateMpsBatch={(b) => handleUpdateMpsBatch('MULTI', b)} machineStatuses={machineStatuses} accessoriesData={accessoriesRecords} netData={netDataRecords} language={language} />;
      case 'multi_staff': return <MultiAutoStaff data={staffRecords} onUpdate={setStaffRecords} attendanceHistory={attendanceHistory} onUpdateAttendanceHistory={setAttendanceHistory} overtimeRecords={overtimeRecords} onUpdateOvertime={setOvertimeRecords} />;
      case 'att_confirm': return <MultiAutoAttendanceConfirmation data={attendanceConfirmations} onUpdate={setAttendanceConfirmations} currentUser={currentUser} language={language} />;
      case 'import': return <MultiAutoImport onAddBatch={recs => setImportedRecords([...recs.map(r => ({ ...r, id: Date.now() + Math.random(), date: new Date().toLocaleDateString('vi-VN'), timestamp: new Date().toLocaleTimeString('vi-VN'), isVerified: false })), ...importedRecords])} recentRecords={importedRecords} netData={netDataRecords} userRole={currentUser.role} onUpdate={(r) => setImportedRecords(importedRecords.map(i => i.id === r.id ? r : i))} onDelete={(id) => setImportedRecords(importedRecords.filter(i => i.id !== id))} />;
      case 'machine_book': return <MultiAutoAccessoriesImport onAddBatch={recs => setAccessoriesRecords([...recs.map(r => ({ ...r, id: Date.now() + Math.random(), date: new Date().toLocaleDateString('vi-VN'), timestamp: new Date().toLocaleTimeString('vi-VN'), isVerified: false })), ...accessoriesRecords])} recentRecords={accessoriesRecords} netData={netDataRecords} onDelete={(id) => setAccessoriesRecords(accessoriesRecords.filter(i => i.id !== id))} onUpdate={(r) => setAccessoriesRecords(accessoriesRecords.map(i => i.id === r.id ? r : i))} />;
      case 'acc_check_sheet': return <AccessoryCheckSheet historyData={multiHistory} accessoryParams={accessoryParams} accessoriesData={accessoriesRecords} netData={netDataRecords} />;
      case 'export': return <MultiAutoExport onAddBatch={recs => setExportedRecords([...recs.map(r => ({ ...r, id: Date.now() + Math.random(), date: new Date().toLocaleDateString('vi-VN'), timestamp: new Date().toLocaleTimeString('vi-VN'), shift: calculateCurrentShift() })), ...exportedRecords])} recentRecords={exportedRecords} netData={netDataRecords} importData={importedRecords} exportData={exportedRecords} historyData={multiHistory} />;
      case 'completed_production': return <MultiAutoCompletedProduction data={multiHistory} language={language} netData={netDataRecords} exportData={exportedRecords} />;
      case 'machine_history': return <MultiAutoMachineHistory logs={machineActivityLogs} machineStatuses={machineStatuses} language={language} />;
      case 'dk_may': return <MultiAutoMachineSetup machines={machineStatuses} onUpdate={setMachineStatuses} staffData={staffRecords} />;
      case 'data_net': return <MultiAutoNetData data={netDataRecords} onDataUpdate={setNetDataRecords} />;
      case 'accessory_params': return <AccessoryParamsManagement data={accessoryParams} onUpdate={setAccessoryParams} netData={netDataRecords} />;
      case 'send_mail': return <MultiAutoSendMail exportData={exportedRecords} />;
      case 'inventory': return <MultiAutoInventory imports={importedRecords.filter(r => r.isVerified)} exports={exportedRecords} returns={productReturns} onReturn={ret => setProductReturns([{ ...ret, id: Date.now(), timestamp: new Date().toLocaleTimeString(), date: new Date().toLocaleDateString() }, ...productReturns])} language={language} userRole={currentUser.role} onDelete={lot => setImportedRecords(importedRecords.filter(r => r.lotNo !== lot))} onFixStock={(lot, qty) => setImportedRecords(importedRecords.map(r => r.lotNo === lot ? { ...r, quantity: qty } : r))} />;
      case 'acc_inventory': return <MultiAutoAccessoriesInventory imports={accessoriesRecords.filter(r => r.isVerified)} usage={accessoriesUsage} returns={accessoryReturns} onReturn={ret => setAccessoryReturns([{ ...ret, id: Date.now(), timestamp: new Date().toLocaleTimeString(), date: new Date().toLocaleDateString() }, ...accessoryReturns])} language={language} netData={netDataRecords} historyData={multiHistory} productionData={importedRecords} userRole={currentUser.role} onDelete={(lot) => setAccessoriesRecords(accessoriesRecords.filter(a => a.lotNo !== lot))} />;
      case 'check_pl': return <CheckMaterial netData={netDataRecords} importData={importedRecords} accessoryData={accessoriesRecords} onConfirmImport={(tpIds, plIds) => { setImportedRecords(importedRecords.map(r => tpIds.includes(r.id) ? { ...r, isVerified: true, verifiedAt: new Date().toLocaleString() } : r)); setAccessoriesRecords(accessoriesRecords.map(r => plIds.includes(r.id) ? { ...r, isVerified: true, verifiedAt: new Date().toLocaleString() } : r)); }} />;
      case 'multi_compare': return <AccessoryImportComparison accessoryData={accessoriesRecords} onClearSystemData={() => setAccessoriesRecords([])} />;
      case 'multi_data_view': return <MultiAutoDataViewer data={importedRecords} />;
      case 'multi_acc_data_view': return <MultiAutoAccessoriesDataViewer data={accessoriesRecords} />;
      case 'multi_export_view': return <MultiAutoDataExportViewer data={exportedRecords} netData={netDataRecords} />;
      case 'multi_backup': return <MultiAutoBackupRestore moduleName="Multi Auto" language={language} importData={importedRecords} exportData={exportedRecords} historyData={multiHistory} machineData={machineStatuses} netData={netDataRecords} staffData={staffRecords} accessoryData={accessoriesRecords} accessoryUsage={accessoriesUsage} productReturns={productReturns} accessoryReturns={accessoryReturns} setImportData={setImportedRecords} setExportData={setExportedRecords} setHistoryData={setMultiHistory} setMachineData={setMachineStatuses} setNetData={setNetDataRecords} setStaffData={setStaffRecords} setAccessoryData={setAccessoriesRecords} setAccessoryUsage={setAccessoriesUsage} setProductReturns={setProductReturns} setAccessoryReturns={setAccessoryReturns} />;

      // --- HR ---
      case 'staff_list': return <HRStaffManagement multiStaff={staffRecords} setMultiStaff={setStaffRecords} qualityStaff={qualityStaff} setQualityStaff={setQualityStaff} hrStaff={hrStaff} setHrStaff={setHrStaff} warehouseStaff={warehouseStaff} setWarehouseStaff={setWarehouseStaff} officeStaff={officeStaff} setOfficeStaff={setOfficeStaff} attendanceHistory={attendanceHistory} onUpdateAttendanceHistory={setAttendanceHistory} overtimeRecords={overtimeRecords} onUpdateOvertime={setOvertimeRecords} contracts={contracts} salarySlips={salarySlipRecords} payrollRecords={payrollRecords} announcements={announcements} timekeepingRecords={timekeepingRecords} attendanceRequests={attendanceRequests} onRequestCorrection={req => setAttendanceRequests([req, ...attendanceRequests])} attendanceConfirmations={attendanceConfirmations} onUpdateAttendanceConfirmation={setAttendanceConfirmations} />;
      case 'hr_add_staff': return <HRAddStaff multiStaff={staffRecords} setMultiStaff={setStaffRecords} hrStaff={hrStaff} setHrStaff={setHrStaff} qualityStaff={qualityStaff} setQualityStaff={setQualityStaff} warehouseStaff={warehouseStaff} setWarehouseStaff={setWarehouseStaff} officeStaff={officeStaff} setOfficeStaff={setOfficeStaff} />;
      case 'hr_contracts': return <HRContracts contracts={contracts} setContracts={setContracts} allStaff={allStaff} />;
      case 'hr_diary': return <HRAttendanceDiary allStaff={allStaff} attendanceHistory={attendanceHistory} onUpdateHistory={setAttendanceHistory} />;
      case 'timekeeping': return <HRTimekeeping data={timekeepingRecords} allStaff={allStaff} onUpdate={setTimekeepingRecords} attendanceRequests={attendanceRequests} onUpdateRequest={setAttendanceRequests} attendanceHistory={attendanceHistory} />;
      case 'hr_overtime': return <HROvertime allStaff={allStaff} overtimeRecords={overtimeRecords} onUpdateOvertime={setOvertimeRecords} />;
      case 'hr_leaves': return <HRLeaves allStaff={allStaff} />;
      case 'hr_payroll': return <HRPayroll payrollRecords={payrollRecords} setPayrollRecords={setPayrollRecords} allStaff={allStaff} />;
      case 'hr_salary_slip': return <HRSalarySlip salarySlips={salarySlipRecords} setSalarySlips={setSalarySlipRecords} allStaff={allStaff} />;
      case 'hr_assets': return <HRAssets data={hrAssets} onUpdate={setHrAssets} />;
      case 'hr_documents': return <HRDocuments data={documentRecords} onUpdate={setDocumentRecords} />;
      case 'hr_training': return <HRTraining data={trainingRecords} onUpdate={setTrainingRecords} />;
      case 'hr_backup': return <MultiAutoBackupRestore moduleName="HC & NS" language={language} customData={{'HR_CONTRACTS': {data: contracts, setter: setContracts}, 'HR_PAYROLLS': {data: payrollRecords, setter: setPayrollRecords}, 'HR_SLIPS': {data: salarySlipRecords, setter: setSalarySlipRecords}, 'HR_ANN_GRP': {data: announcements, setter: setAnnouncements}, 'HR_ASSETS': {data: hrAssets, setter: setHrAssets}, 'HR_TRAINING': {data: trainingRecords, setter: setTrainingRecords}, 'HR_DOCS': {data: documentRecords, setter: setDocumentRecords}, 'HR_ATT_REQ': {data: attendanceRequests, setter: setAttendanceRequests}}} />;

      case 'users': return <AdminUserManagement users={userAccounts} onUpdateUsers={setUserAccounts} />;

      default: return <div className="p-20 text-center text-slate-700 font-black uppercase tracking-widest">Mô đun {id} đang được thiết lập</div>;
    }
  };

  return (
    <div className="flex h-screen bg-[#020617] overflow-hidden">
      <Sidebar tabs={visibleTabs} activeTabId={activeTab} activeItemId={activeItem} onTabChange={id => { setActiveTab(id); setDrawerOpen(true); }} onItemClick={id => { setActiveItem(id); setDrawerOpen(false); }} language={language} userRole={currentUser?.role} isCollapsed={isRailOpen} setCollapsed={setIsRailOpen} isDrawerOpen={isDrawerOpen} setDrawerOpen={setDrawerOpen} />
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <TopBar currentUser={currentUser} activeTabLabel={currentTab ? (translations[language][currentTab.label] || currentTab.label) : ''} activeItemLabel={currentItem ? (translations[language][currentItem.label] || currentItem.label) : ''} toggleSidebar={() => setIsRailOpen(!isRailOpen)} isSyncing={isSyncing} onSync={() => performSync(true)} lastSyncTime={lastSyncTime} />
        <div className="flex-1 overflow-y-auto relative bg-[#020617] custom-scrollbar">{renderContent()}</div>
      </div>
      <Assistant isOpen={false} onClose={() => {}} context="" />
      <PWAPrompt />
    </div>
  );
}
