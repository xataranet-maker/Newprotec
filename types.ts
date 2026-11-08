
export type UserRole = 'admin' | 'multiauto' | 'stiff' | 'mold' | 'stamping' | 'hr' | 'equipment' | 'quality' | 'report_viewer' | 'user' | 'staff' | 'warehouse' | 'view_all';

export type Language = 'vi' | 'ko' | 'en';

export type DeptTheme = 'DEFAULT' | 'TECH_ELECTRONIC' | 'SPACE_FUTURE';

export type AttendanceStatus = 'PRESENT' | 'SICK' | 'LEAVE' | 'FAMILY' | 'UNMARKED' | 'Đúng giờ' | 'Đi muộn' | 'Về sớm' | 'Vắng mặt' | 'Thiếu giờ vào' | 'Thiếu giờ ra' | 'Đủ công' | 'PENDING_REVIEW' | 'CHECKING' | 'Nghỉ ốm' | 'Nghỉ phép' | 'Nghỉ chủ nhật' | 'Nghỉ lễ' | 'Nghỉ KL';

export type MachineNoteType = 'NORMAL' | 'BROKEN' | 'WAITING_MATERIAL' | 'NO_STOCK' | 'MODEL_MISMATCH';

export interface AttendanceConfirmDay {
    day: number;
    n?: string | number;  // Normal/Night row
    ot1?: string | number; // OT row 1
    d?: string | number;   // Day row
    ot2?: string | number; // OT row 2
    feedback?: string; // New field for correction feedback
}

export interface AttendanceConfirmationRecord {
    id: number;
    month: string; // YYYY-MM
    employeeId: string;
    fullName: string;
    shiftGroup: string; // CA
    department: string;
    days: AttendanceConfirmDay[];
    unexcusedAbsence: number;
    remainingLeave: number;
    isConfirmed: boolean;
    confirmedAt?: string;
    confirmedBy?: string;
}

export interface AccessoryParameter {
  id: number;
  model: string;
  code: string;
  layer?: string; // Thêm trường lớp (INNER/OUTER)
  stage: string;
  thickness: string; 
  width: number;     
  length: number;    
  capableMachines: number[]; 
  updatedAt: string;
}

export interface ProductionPlan {
    id: number;
    targetDept: string; 
    model: string;
    content: string;
    status: 'PENDING' | 'CONFIRMED';
    timestamp: string;
    confirmedAt?: string;
    sender: string;
}

export interface UserAccount {
  username: string;
  password?: string;
  fullName: string;
  role: UserRole;
  employeeId?: string;
  department?: string;
}

export interface AttendanceRecord {
    id: string; 
    date: string; 
    employeeId: string;
    shift: 'DAY' | 'NIGHT';
    status: AttendanceStatus;
    overtime: number;
    lateIn?: string;
    earlyOut?: string;
    note?: string;
}

export interface MachineActivityLog {
    id: number;
    machineName: string;
    department: string;
    eventType: 'START' | 'STOP' | 'RESUME' | 'FINISH' | 'CHANGE_MACHINE';
    timestamp: string;
    date: string;
    logicalDate: string;
    model: string;
    lotNo: string;
    reason?: string;
    durationSeconds?: number;
    operator?: string;
}

export interface StageProgress {
    status: 'PENDING' | 'RUNNING' | 'STOPPED' | 'COMPLETED';
    machine?: string;
    moldNo?: string;
    startTime?: string; 
    accumulatedTime?: number; 
    stopAccumulatedTime?: number; 
    lastStartTimestamp?: number; 
    lastStopTimestamp?: number; 
    stopReason?: string;
    completedAt?: string;
    accessoryLot?: string; 
    timelineLog?: string;
}

export interface ImportRecord {
  id: number;
  timestamp: string;
  date: string;
  shift: string;
  model: string;
  code: string;
  lotNo: string;
  mpsDate?: string; 
  stayDurationMinutes?: number; 
  stayDurationHuman?: string;    
  moldNo?: string;
  quantity: number;
  stage: string;
  isVerified?: boolean;
  verifiedAt?: string;
  productionStatus?: 'PENDING' | 'RUNNING' | 'STOPPED' | 'COMPLETED';
  productionProgress?: Record<string, StageProgress>; 
  note?: string;
  location?: string | null;
  status?: 'GOOD' | 'BROKEN' | 'BURR' | 'SCRAP';
  dieThickness?: number;
  knifeHeight?: number;
  currentHits?: number;
  warrantyHits?: number;
  department?: string; 
}

export interface ExportRecord {
  id: number;
  timestamp: string;
  date: string;
  shift: string;
  model: string;
  code: string;
  lotNo: string;
  stage: string; 
  quantity: number;
  note?: string;
}

export interface NetDataRecord {
  id: number;
  model: string;
  code: string;
  customer?: string;
  layer?: 'INNER' | 'OUTER' | string; 
  stage: string;
  stage1Points: number;
  stage2?: string;
  stage2Points?: number;
  stage3?: string;
  stage3Points?: number;
  stage4?: string;
  stage4Points?: number;
  pitchDistance?: number;
  pcsPerStroke?: number;
  pieceLength?: number;
  tableTemp?: number;
  padTemp?: number;
  airPressure?: number;
  timePerPoint: number;
  pressingTime?: number;
  status: 'OK' | 'NG';
  department?: string; 
  workingCondition?: string;
}

export interface MachineSetup {
  id: number;
  name: string;
  description: string; 
  note: MachineNoteType;
  updatedAt: string;
  staffDay?: string;
  staffNight?: string;
}

export interface StaffRecord {
  id: number;
  fullName: string;
  employeeId: string;
  position: string;
  dateJoined: string;
  dob: string;
  hometown: string;
  phone: string;
  attendance: AttendanceStatus;
  shift: 'DAY' | 'NIGHT';
  department?: string; 
  workUnit?: string;   
  note?: string;
  avatarUrl?: string;
  lateIn?: string;
  earlyOut?: string;
}

export interface AccessoryRecord {
  id: number;
  timestamp: string;
  date: string;
  shift: string;
  model: string;
  code: string;
  lotNo: string;
  stage: string;
  quantity: number;
  expirationDate?: string;
  isVerified?: boolean;
  verifiedAt?: string;
}

export interface AccessoryUsageRecord {
    id: number;
    accessoryLotNo: string;
    productionId: number; 
    productionStage: string;
    quantity: number;
    timestamp: string;
    model: string;
    code: string;
}

export interface ProductionHistoryRecord extends ImportRecord {
    historyId: number;
    completedAt: string;
    stageCompleted?: string;
    machineLog?: string; 
    machine?: string; 
    moldNo?: string;
    moldStatus?: 'GOOD' | 'BROKEN' | 'BURR' | 'SCRAP';
    totalHits?: number;
    totalPcs?: number;
    totalMeters?: number;
    totalDuration?: number; 
    totalStopTime?: number; 
    stopReason?: string; 
    operator?: string;
    usedAccessoryLot?: string;
    accessoryLotDetails?: string; 
    accessoryExpirationDate?: string;
    productionStartTime?: string;
    tableTemp?: number;
    padTemp?: number;
    airPressure?: number;
}

export interface ProductReturnRecord {
    id: number;
    timestamp: string;
    date: string;
    model: string;
    code: string;
    lotNo: string;
    quantity: number;
    reason: string;
}

export interface AccessoryReturnRecord {
    id: number;
    timestamp: string;
    date: string;
    model: string;
    code: string;
    lotNo: string;
    stage: string;
    quantity: number;
    reason: string;
}

export interface ToolRecord {
    id: number;
    code: string;
    name: string;
    type: string;
    quantity: number;
    status: 'GOOD' | 'BROKEN' | 'LOST' | 'MAINTENANCE';
    importDate: string;
    note?: string;
}

export interface SparePartRecord {
    id: number;
    code: string;
    name: string;
    quantity: number;
    unit: string;
    manufacturer: string;
    importDate: string;
    compatibleMachines: string[];
    minStock?: number;
}

export interface RepairRecord {
    id: number;
    department: string;
    machineName: string;
    content: string;
    replacementPart?: string;
    replacedQuantity?: number;
    date: string;
    technician?: string;
}

export interface FaultRecord {
    id: number;
    errorName: string;
    cause: string;
    solution: string;
}

export interface ScrapRecord {
    id: number;
    date: string;
    timestamp: string;
    type: 'MOLD' | 'JIG';
    moldNo: string;
    model: string;
    code: string;
    status: 'SCRAP' | 'BROKEN';
    reason: string;
    operator?: string;
    dieThicknessAtScrap?: number;
    knifeHeightAtScrap?: number;
    hitsAtScrap?: number;
}

export interface RibbonItem {
  id: string;
  label: string;
  icon: any; 
  isLarge?: boolean;
  color?: string;
}

export interface RibbonGroup {
  id: string;
  label: string;
  items: RibbonItem[];
  allowedRoles?: UserRole[];
}

export interface RibbonTab {
  id: string;
  label: string;
  groups: RibbonGroup[];
  allowedRoles?: UserRole[];
}

export interface FeedbackItem {
    id: number;
    senderId: string;
    senderName: string;
    timestamp: string;
    type: 'CONFIRM' | 'REPORT';
    content?: string;
}

export interface ContractRecord {
    id: number;
    employeeId: string;
    employeeName: string;
    department: string;
    fileName: string;
    fileUrl?: string;
    uploadDate: string;
    note?: string;
    sharedWith: string[];
}

export interface OvertimeRecord {
    id: number;
    staffId: number;
    staffName: string;
    employeeId: string;
    department: string;
    date: string;
    hours: number;
    shift?: 'DAY' | 'NIGHT';
    reason?: string;
    timestamp: string;
}

export interface PayrollRecord {
    id: number;
    department: string;
    month: string;
    fileName: string;
    fileUrl?: string;
    uploadDate: string;
    note?: string;
    sharedWith: string[];
    feedback?: FeedbackItem[];
}

export interface SalarySlipRecord {
    id: number;
    employeeId: string;
    month: string;
    fileName: string;
    fileUrl?: string;
    uploadDate: string;
    isShared: boolean;
    sharedWith: string[];
    feedback?: FeedbackItem[];
}

export interface HRAnnouncement {
    id: number;
    title: string;
    title_ko?: string;
    content: string;
    content_ko?: string;
    date: string;
    priority: 'NORMAL' | 'URGENT';
    recipientType: 'DEPARTMENT' | 'INDIVIDUAL';
    recipients: string[];
    allowResend: boolean;
    fileName?: string;
    fileUrl?: string;
    sender?: string;
}

export interface TimekeepingRecord {
    id: number;
    employeeId: string;
    fullName: string;
    department: string;
    date: string;
    time: string;
    attendanceStatus: string;
    checkPoints: number;
    customName?: string;
    source?: string;
    processType?: string;
    temperature?: number;
    abnormal?: string;
    calculatedShift?: 'DAY' | 'NIGHT';
}

export interface AssetRecord {
    id: number;
    code: string;
    name: string;
    department: string;
    quantity: number;
    unit: string;
    issueDate: string;
    status: 'GOOD' | 'BROKEN' | 'MAINTENANCE' | 'LIQUIDATED' | 'LOST';
    note?: string;
    user?: string;
}

export interface TrainingRecord {
    id: number;
    trainingNumber: string;
    title: string;
    content: string;
    department: string;
    date: string;
    fileName?: string;
    fileUrl?: string;
}

export interface DocumentRecord {
    id: number;
    documentNumber: string;
    title: string;
    issuingAuthority: string;
    pageCount: number;
    department: string;
    date: string;
    fileName?: string;
    fileUrl?: string;
}

export interface QualitySolution {
    id: number;
    date: string;
    problem: string;
    rootCause: string;
    countermeasure: string;
    inCharge: string;
    status: 'OPEN' | 'CLOSED' | 'MONITORING';
    model?: string;
    lotNo?: string;
    department?: string;
    fileName?: string;
    fileUrl?: string;
}

export interface QualityMetrics {
    ppm: number;
    passRate: number;
    openSolutions: number;
    totalIncidents: number;
}

export interface WarehouseItem {
    id: number;
    department: string;
    model: string;
    code: string;
    lotNo: string;
    quantity: number;
    unit: 'PNL' | 'M' | 'CM' | 'EA' | 'SHEET';
    category: 'FINISHED_GOODS' | 'MATERIAL';
    stage: string;
    warehouseName: string;
    importDate: string;
    status: 'IN_STOCK' | 'OUT_OF_STOCK' | 'TRANSFERRING';
}

export interface AttendanceCorrectionRequest {
    id: number;
    employeeId: string;
    fullName: string;
    date: string;
    inTime: string;
    outTime: string;
    reason: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CHECKING';
    requestDate: string;
    adminResponse?: string;
}

export interface DeviceHistoryLog {
    id: number;
    machineName: string;
    machineCode: string;
    fromDept: string;
    toDept: string;
    action: 'TRANSFER' | 'REPAIR_SEND' | 'DESTROY' | 'RETURN';
    date: string;
    timestamp: string;
    status: 'COMPLETED' | 'RETURNED';
}

export interface AttendanceLogRecord {
    id: number;
    date: string;
    timestamp: string;
    department: string;
    totalStaff: number;
    presentCount: number;
    absentCount: number;
    shiftDayCount: number;
    shiftNightCount: number;
    details: {
        employeeId: string;
        fullName: string;
        status: AttendanceStatus;
        shift: 'DAY' | 'NIGHT';
        reason?: string;
        lateIn?: string;
        earlyOut?: string;
    }[];
}

export interface QualityStandard {
    id: number;
    code: string;
    title: string;
    type: string;
    department: string;
    category: 'INPUT' | 'OUTPUT' | 'EQUIPMENT' | 'HYGIENE' | 'GUIDELINE';
    manager: string;
    uploadDate: string;
    fileName: string;
    fileUrl?: string;
}
