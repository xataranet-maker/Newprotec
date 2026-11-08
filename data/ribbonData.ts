
import { RibbonTab } from '../types';
import { 
  Download, Upload, Package, Database, Mail, Users, 
  BarChart3, Settings, Factory, Activity, 
  Timer, History, FileCheck, Calculator,
  FileText, CalendarDays, ArchiveRestore,
  LayoutDashboard, Layers, HardDriveDownload,
  Megaphone, GitCompare, CalendarRange,
  Clock, ScrollText, Plane, Banknote, UserPlus, 
  StickyNote, GraduationCap, ClipboardCheck,
  FileSearch, Ruler, ClipboardList, UserCheck, FileBadge
} from 'lucide-react';

export const ribbonData: RibbonTab[] = [
  {
    id: 'home',
    label: 'HOME',
    allowedRoles: ['admin', 'multiauto', 'hr', 'quality', 'report_viewer', 'user', 'staff', 'warehouse', 'view_all'],
    groups: [
      {
        id: 'home_overview',
        label: 'TỔNG QUAN',
        items: [
           { id: 'dashboard_home', label: 'BÁO CÁO TỔNG HỢP', icon: LayoutDashboard, isLarge: true, color: 'text-blue-600' },
           { id: 'personal_profile', label: 'HỒ SƠ CÁ NHÂN', icon: UserCheck, isLarge: true, color: 'text-cyan-500' },
           { id: 'home_announcements', label: 'THÔNG BÁO', icon: Megaphone, isLarge: true, color: 'text-red-500' },
           { id: 'planning_hub', label: 'ĐIỀU PHỐI KẾ HOẠCH', icon: CalendarRange, isLarge: false, color: 'text-cyan-500' },
           { id: 'production_plans', label: 'LỊCH SỬ KẾ HOẠCH', icon: History, isLarge: false, color: 'text-indigo-400' },
        ]
      }
    ]
  },
  {
    id: 'Multi',
    label: 'MULTI AUTO',
    allowedRoles: ['admin', 'multiauto', 'report_viewer', 'view_all', 'quality'],
    groups: [
      {
        id: 'report',
        label: 'PHÂN TÍCH & BÁO CÁO',
        items: [
            { id: 'model_tracking', label: 'HIỆU SUẤT MÁY (LIVE)', icon: Activity, isLarge: true, color: 'text-blue-500' },
            { id: 'prod_report', label: 'BÁO CÁO TỔNG HỢP', icon: BarChart3, isLarge: true, color: 'text-green-500' },
            { id: 'quality_report', label: 'HIỆU SUẤT THÁNG', icon: CalendarDays, isLarge: true, color: 'text-orange-500' },
            { id: 'prod_report_kr', label: 'BÁO CÁO KR', icon: FileText, isLarge: true, color: 'text-indigo-500' },
        ]
      },
      {
        id: 'Multi_menu',
        label: 'VẬN HÀNH SẢN XUẤT',
        items: [
          { id: 'production', label: 'TRẠM SẢN XUẤT', icon: Factory, isLarge: true, color: 'text-blue-600' },
          { id: 'multi_staff', label: 'NHÂN VIÊN', icon: Users, isLarge: true, color: 'text-blue-500' },
          { id: 'att_confirm', label: 'XÁC NHẬN CÔNG', icon: FileBadge, isLarge: true, color: 'text-emerald-500' },
          { id: 'import', label: 'NHẬP TP', icon: Download, isLarge: false, color: 'text-green-600' },
          { id: 'machine_book', label: 'NHẬP PL', icon: Layers, isLarge: false, color: 'text-blue-500' },
          { id: 'acc_check_sheet', label: 'PHIẾU KT PL', icon: ClipboardList, isLarge: false, color: 'text-emerald-500' },
          { id: 'export', label: 'XUẤT KHO', icon: Upload, isLarge: false, color: 'text-orange-600' },
          { id: 'completed_production', label: 'LỊCH SỬ SX', icon: FileCheck, isLarge: false, color: 'text-indigo-600' },
          { id: 'machine_history', label: 'NHẬT KÝ MÁY', icon: History, isLarge: false, color: 'text-orange-500' },
        ]
      },
      {
        id: 'management',
        label: 'QUẢN TRỊ HỆ THỐNG',
        items: [
          { id: 'dk_may', label: 'DK MÁY', icon: Settings, isLarge: true, color: 'text-slate-600' },
          { id: 'data_net', label: 'DATA NET', icon: Database, isLarge: true, color: 'text-cyan-600' },
          { id: 'accessory_params', label: 'THÔNG SỐ PL', icon: Ruler, isLarge: true, color: 'text-amber-500' },
          { id: 'send_mail', label: 'GỬI MAIL', icon: Mail, isLarge: true, color: 'text-indigo-500' },
          { id: 'multi_backup', label: 'SAO LƯU DỮ LIỆU', icon: HardDriveDownload, isLarge: true, color: 'text-teal-500' },
        ]
      },
      {
        id: 'acc_warehouse',
        label: 'QUẢN LÝ KHO',
        items: [
            { id: 'acc_inventory', label: 'TỒN P.LIỆU', icon: ArchiveRestore, isLarge: true, color: 'text-yellow-600' },
            { id: 'inventory', label: 'TỒN TP', icon: Package, isLarge: true, color: 'text-yellow-500' },
            { id: 'check_pl', label: 'CHECK PL', icon: Calculator, isLarge: true, color: 'text-indigo-600' },
            { id: 'multi_compare', label: 'ĐỐI CHIẾU NHẬP', icon: GitCompare, isLarge: true, color: 'text-blue-500' },
        ]
      },
      {
        id: 'multi_data_raw',
        label: 'TRUY XUẤT DỮ LIỆU',
        items: [
            { id: 'multi_data_view', label: 'SỔ NHẬP TP', icon: FileSearch, isLarge: true, color: 'text-slate-400' },
            { id: 'multi_acc_data_view', label: 'SỔ NHẬP PL', icon: FileSearch, isLarge: true, color: 'text-slate-400' },
            { id: 'multi_export_view', label: 'DỮ LIỆU XUẤT', icon: FileSearch, isLarge: true, color: 'text-slate-400' },
        ]
      }
    ]
  },
  {
    id: 'hr_admin',
    label: 'HC & NS',
    allowedRoles: ['admin', 'hr', 'report_viewer', 'view_all'],
    groups: [
      {
        id: 'hr_staff_mgmt',
        label: 'QUẢN LÝ NHÂN SỰ',
        items: [
          { id: 'staff_list', label: 'DS NHÂN VIÊN', icon: Users, isLarge: true, color: 'text-blue-600' },
          { id: 'hr_add_staff', label: 'THÊM MỚI', icon: UserPlus, isLarge: true, color: 'text-green-600' },
          { id: 'hr_contracts', label: 'HỢP ĐỒNG', icon: FileText, isLarge: true, color: 'text-indigo-600' },
          { id: 'hr_diary', label: 'NHẬT KÝ Đ.DANH', icon: StickyNote, isLarge: true, color: 'text-purple-600' },
        ]
      },
      {
        id: 'hr_timekeeping_grp',
        label: 'CHẤM CÔNG & LƯƠNG',
        items: [
          { id: 'timekeeping', label: 'DỮ LIỆU CÔNG', icon: Clock, isLarge: true, color: 'text-blue-500' },
          { id: 'hr_overtime', label: 'ĐK TĂNG CA', icon: Timer, isLarge: false, color: 'text-orange-500' },
          { id: 'hr_leaves', label: 'NGHỈ PHÉP', icon: Plane, isLarge: false, color: 'text-cyan-500' },
          { id: 'hr_payroll', label: 'BẢNG CÔNG', icon: ClipboardCheck, isLarge: false, color: 'text-emerald-600' },
          { id: 'hr_salary_slip', label: 'PHIẾU LƯƠNG', icon: Banknote, isLarge: true, color: 'text-green-600' },
        ]
      },
      {
        id: 'hr_admin_ops',
        label: 'HÀNH CHÍNH',
        items: [
          { id: 'hr_assets', label: 'TÀI SẢN', icon: Package, isLarge: true, color: 'text-amber-600' },
          { id: 'hr_documents', label: 'CÔNG VĂN', icon: ScrollText, isLarge: true, color: 'text-teal-600' },
          { id: 'hr_training', label: 'ĐÀO TẠO', icon: GraduationCap, isLarge: true, color: 'text-blue-700' },
          { id: 'hr_backup', label: 'SAO LƯU', icon: HardDriveDownload, isLarge: true, color: 'text-teal-500' },
        ]
      }
    ]
  },
  {
    id: 'admin',
    label: 'ADMIN',
    allowedRoles: ['admin'],
    groups: [
      {
        id: 'admin_users',
        label: 'HỆ THỐNG',
        items: [
          { id: 'users', label: 'TÀI KHOẢN', icon: Users, isLarge: true, color: 'text-blue-600' },
        ]
      }
    ]
  }
];
