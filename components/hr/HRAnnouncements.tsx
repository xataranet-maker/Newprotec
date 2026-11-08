
import React, { useState, useRef, useMemo } from 'react';
import { Megaphone, Search, Plus, Send, Upload, FileText, X, Bell, CheckCircle2, RotateCcw, AlertTriangle, Lock, Eye, Calendar, User, Trash2 } from 'lucide-react';
import { HRAnnouncement, StaffRecord, Language, UserRole } from '../../types';

interface HRAnnouncementsProps {
    announcements: HRAnnouncement[];
    setAnnouncements: (data: HRAnnouncement[]) => void;
    allStaff: StaffRecord[];
    language?: Language;
    userRole?: UserRole;
}

export const HRAnnouncements: React.FC<HRAnnouncementsProps> = ({ 
    announcements, 
    setAnnouncements, 
    allStaff, 
    language = 'en',
    userRole 
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    
    // Modal States
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [viewingAnnouncement, setViewingAnnouncement] = useState<HRAnnouncement | null>(null);
    
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Permission Check: Staff, Users, and Report Viewers cannot create announcements
    const canCreate = userRole && !['staff', 'user', 'report_viewer'].includes(userRole);

    // Form State
    const [formData, setFormData] = useState<{
        title: string;
        content: string;
        priority: 'NORMAL' | 'URGENT';
        file: File | null;
        allowResend: boolean;
    }>({
        title: '',
        content: '',
        priority: 'NORMAL',
        file: null,
        allowResend: false
    });

    // --- FORM ACTIONS ---

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFormData({ ...formData, file: e.target.files[0] });
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!formData.title || !formData.content) {
            alert("Vui lòng nhập tiêu đề và nội dung thông báo.");
            return;
        }

        const newAnnouncement: HRAnnouncement = {
            id: Date.now(),
            title: formData.title,
            content: formData.content,
            // title_ko & content_ko are optional, omitted here
            date: new Date().toLocaleDateString('vi-VN'),
            priority: formData.priority,
            recipientType: 'DEPARTMENT', // Mặc định gửi theo phòng ban
            recipients: ['ALL'], // Mặc định gửi toàn công ty
            allowResend: formData.allowResend,
            fileName: formData.file?.name,
            fileUrl: formData.file ? URL.createObjectURL(formData.file) : undefined,
            sender: userRole === 'admin' ? 'Ban Giám Đốc' : 'HC & NS'
        };

        setAnnouncements([newAnnouncement, ...announcements]);
        alert("Đã gửi thông báo thành công!");
        
        // Reset and Close
        setIsCreateModalOpen(false);
        setFormData({
            title: '',
            content: '',
            priority: 'NORMAL',
            file: null,
            allowResend: false
        });
    };

    const handleDelete = (e: React.MouseEvent, id: number) => {
        e.stopPropagation(); // Ngăn chặn việc mở modal xem chi tiết
        if (window.confirm("Admin: Bạn có chắc chắn muốn xóa thông báo này không? Hành động này không thể hoàn tác.")) {
            setAnnouncements(announcements.filter(a => a.id !== id));
        }
    };

    // --- RENDER HELPERS ---

    const filteredAnnouncements = announcements.filter(a => 
        a.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
        a.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (a.title_ko && a.title_ko.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="p-6 h-full overflow-y-auto bg-slate-900 flex flex-col gap-6 text-slate-300 font-sans">
            
            {/* Header */}
            <div className="bg-slate-800 px-6 py-4 rounded-xl shadow-lg border border-slate-700 flex flex-col md:flex-row justify-between items-center gap-4 sticky top-0 z-20">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-600 rounded-lg shadow-lg shadow-red-900/50 text-white">
                        <Megaphone size={24} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-white uppercase tracking-wider font-mono">BẢNG THÔNG BÁO CHUNG</h1>
                        <p className="text-xs text-slate-400">Tin tức chính thức từ Ban Lãnh Đạo & HCNS</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                        <input 
                            type="text" 
                            placeholder="Tìm kiếm thông báo..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-600 rounded-lg focus:ring-1 focus:ring-red-500 focus:outline-none text-sm text-white"
                        />
                    </div>
                    {canCreate ? (
                        <button 
                            onClick={() => setIsCreateModalOpen(true)}
                            className="bg-red-600 hover:bg-red-500 text-white font-bold px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 transition-all hover:scale-105 active:scale-95 whitespace-nowrap border border-red-500"
                        >
                            <Plus size={18}/> Tạo Thông Báo Mới
                        </button>
                    ) : (
                         <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-900 px-3 py-2 rounded border border-slate-700 select-none cursor-not-allowed">
                             <Lock size={12}/> Chỉ Quản lý được đăng
                         </div>
                    )}
                </div>
            </div>

            {/* List of Announcements */}
            <div className="grid grid-cols-1 gap-4">
                {filteredAnnouncements.length === 0 ? (
                    <div className="p-12 text-center text-slate-500 bg-slate-800/50 rounded-xl border border-slate-700 border-dashed">
                        <Bell size={48} className="mx-auto mb-3 opacity-20"/>
                        <p>Chưa có thông báo nào được tạo.</p>
                    </div>
                ) : (
                    filteredAnnouncements.map(ann => {
                        const displayTitle = language === 'ko' ? (ann.title_ko || ann.title) : ann.title;
                        const displayContent = language === 'ko' ? (ann.content_ko || ann.content) : ann.content;
                        const isTranslated = language === 'ko' && ann.title_ko;

                        return (
                            <div 
                                key={ann.id} 
                                onClick={() => setViewingAnnouncement(ann)}
                                className="bg-slate-800 p-5 rounded-xl border border-slate-700 hover:border-red-500/50 hover:bg-slate-800/80 transition-all shadow-md group relative cursor-pointer"
                            >
                                {/* Priority Indicator */}
                                {ann.priority === 'URGENT' && (
                                    <div className="absolute top-0 right-0 bg-red-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl rounded-tr-xl shadow-lg z-10 flex items-center gap-1 animate-pulse">
                                        <AlertTriangle size={12}/> KHẨN CẤP
                                    </div>
                                )}

                                <div className="flex flex-col gap-2">
                                    <div className="flex justify-between items-start pr-16">
                                        <div>
                                            <h3 className={`text-lg font-bold ${ann.priority === 'URGENT' ? 'text-red-400' : 'text-blue-400'} group-hover:underline flex items-center gap-2`}>
                                                {displayTitle}
                                                {isTranslated && <span className="text-[9px] bg-slate-700 px-1 rounded text-slate-300 font-normal">KR</span>}
                                            </h3>
                                            <div className="text-xs text-slate-500 flex items-center gap-3 mt-1.5">
                                                <span className="flex items-center gap-1"><Calendar size={12}/> {ann.date}</span>
                                                <span className="w-1 h-1 bg-slate-600 rounded-full"></span>
                                                <span className="flex items-center gap-1 font-bold text-slate-400"><User size={12}/> {ann.sender || 'Admin'}</span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700/50 text-sm text-slate-300 line-clamp-2">
                                        {displayContent}
                                    </div>

                                    <div className="flex justify-between items-center pt-2 border-t border-slate-700/50 mt-1">
                                        <div className="flex items-center gap-2 text-xs">
                                            {ann.fileName && (
                                                <span className="flex items-center gap-1 text-blue-400 bg-blue-900/20 px-2 py-1 rounded border border-blue-900/50">
                                                    <FileText size={12}/> {ann.fileName}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {userRole === 'admin' && (
                                                <button
                                                    onClick={(e) => handleDelete(e, ann.id)}
                                                    className="text-slate-500 hover:text-red-500 p-1.5 hover:bg-red-900/20 rounded-full transition-all"
                                                    title="Xóa thông báo"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            )}
                                            <div className="text-xs text-slate-500 font-bold group-hover:text-blue-400 transition-colors flex items-center gap-1">
                                                Xem chi tiết <Eye size={12}/>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* CREATE MODAL */}
            {isCreateModalOpen && canCreate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-slate-900 rounded-xl shadow-2xl w-full max-w-2xl flex flex-col border border-slate-700 overflow-hidden">
                        {/* Modal Header */}
                        <div className="px-6 py-4 bg-red-700 text-white flex justify-between items-center shrink-0">
                            <h2 className="text-lg font-bold flex items-center gap-2">
                                <Send size={20}/> SOẠN THÔNG BÁO CHUNG
                            </h2>
                            <button onClick={() => setIsCreateModalOpen(false)} className="hover:bg-white/20 p-1 rounded transition-colors">
                                <X size={20}/>
                            </button>
                        </div>
                        
                        {/* Modal Body */}
                        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
                            
                            {/* Input Section */}
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Tiêu Đề <span className="text-red-500">*</span></label>
                                    <input 
                                        type="text" 
                                        value={formData.title} 
                                        onChange={(e) => setFormData({...formData, title: e.target.value})}
                                        className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 focus:ring-1 focus:ring-red-500 focus:outline-none text-white font-bold"
                                        placeholder="Nhập tiêu đề..."
                                        autoFocus
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Nội Dung <span className="text-red-500">*</span></label>
                                    <textarea 
                                        value={formData.content} 
                                        onChange={(e) => setFormData({...formData, content: e.target.value})}
                                        className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 focus:ring-1 focus:ring-red-500 focus:outline-none text-white min-h-[200px] resize-none"
                                        placeholder="Nhập nội dung chi tiết..."
                                    />
                                </div>
                            </div>

                            {/* Common Settings */}
                            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-700">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Độ Ưu Tiên</label>
                                    <div className="flex gap-2">
                                        <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded cursor-pointer border transition-all ${formData.priority === 'NORMAL' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-800 border-slate-600 text-slate-400'}`}>
                                            <input type="radio" name="priority" className="hidden" checked={formData.priority === 'NORMAL'} onChange={() => setFormData({...formData, priority: 'NORMAL'})}/>
                                            <Bell size={16}/> Bình thường
                                        </label>
                                        <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded cursor-pointer border transition-all ${formData.priority === 'URGENT' ? 'bg-red-600 border-red-500 text-white' : 'bg-slate-800 border-slate-600 text-slate-400'}`}>
                                            <input type="radio" name="priority" className="hidden" checked={formData.priority === 'URGENT'} onChange={() => setFormData({...formData, priority: 'URGENT'})}/>
                                            <AlertTriangle size={16}/> Khẩn cấp
                                        </label>
                                    </div>
                                </div>
                                
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Đính Kèm File</label>
                                    <div className="relative">
                                        <input 
                                            type="file" 
                                            ref={fileInputRef}
                                            onChange={handleFileChange}
                                            className="hidden"
                                            id="training-file-upload"
                                        />
                                        <label 
                                            htmlFor="training-file-upload"
                                            className="w-full flex items-center justify-center gap-2 bg-slate-800 border border-dashed border-slate-500 rounded-lg p-2.5 text-slate-400 hover:bg-slate-700 cursor-pointer transition-colors text-sm h-[46px]"
                                        >
                                            <Upload size={16} />
                                            {formData.file ? <span className="text-white font-bold truncate max-w-[150px]">{formData.file.name}</span> : "Chọn file..."}
                                        </label>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="p-3 bg-blue-900/10 border border-blue-800/50 rounded-lg flex items-center gap-3">
                                <CheckCircle2 size={18} className="text-blue-500"/>
                                <span className="text-xs text-blue-200">Thông báo này sẽ được gửi tới <strong>TOÀN BỘ CÔNG TY</strong> và hiển thị trên trang chủ của tất cả nhân viên.</span>
                            </div>

                        </form>

                        {/* Modal Footer */}
                        <div className="p-4 border-t border-slate-700 bg-slate-800 flex gap-3 shrink-0">
                            <button 
                                onClick={handleSubmit}
                                className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-lg shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 uppercase tracking-wide"
                            >
                                <Send size={18} /> Gửi Ngay
                            </button>
                            <button 
                                onClick={() => setIsCreateModalOpen(false)}
                                className="px-6 bg-slate-700 hover:bg-slate-600 text-slate-300 font-bold py-3 rounded-lg transition-colors border border-slate-600"
                            >
                                Hủy
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* VIEW DETAIL MODAL */}
            {viewingAnnouncement && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in zoom-in-95 duration-200">
                    <div className="bg-slate-900 rounded-2xl shadow-2xl w-full max-w-3xl h-[80vh] flex flex-col border border-slate-600 overflow-hidden relative">
                         {/* Modal Header */}
                         <div className="px-8 py-5 bg-slate-800 border-b border-slate-700 flex justify-between items-start shrink-0">
                            <div className="flex-1 pr-4">
                                <div className="flex items-center gap-3 mb-2">
                                    {viewingAnnouncement.priority === 'URGENT' && (
                                        <span className="bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded shadow-sm">KHẨN CẤP</span>
                                    )}
                                    <span className="text-slate-500 text-xs font-mono">{viewingAnnouncement.date}</span>
                                </div>
                                <h2 className="text-2xl font-bold text-white leading-tight">
                                    {language === 'ko' ? (viewingAnnouncement.title_ko || viewingAnnouncement.title) : viewingAnnouncement.title}
                                </h2>
                                <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
                                    <span>Từ: <span className="font-bold text-white">{viewingAnnouncement.sender}</span></span>
                                </div>
                            </div>
                            <button 
                                onClick={() => setViewingAnnouncement(null)}
                                className="p-2 bg-slate-700 hover:bg-slate-600 rounded-full text-white transition-colors"
                            >
                                <X size={20}/>
                            </button>
                         </div>

                         {/* Modal Body */}
                         <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                             <div className="prose prose-invert max-w-none text-sm text-slate-300 whitespace-pre-line leading-relaxed">
                                 {language === 'ko' ? (viewingAnnouncement.content_ko || viewingAnnouncement.content) : viewingAnnouncement.content}
                             </div>
                             
                             {viewingAnnouncement.fileName && (
                                 <div className="mt-8 pt-4 border-t border-slate-800">
                                     <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Tài liệu đính kèm</h4>
                                     <a 
                                        href={viewingAnnouncement.fileUrl || '#'} 
                                        target="_blank" 
                                        rel="noreferrer"
                                        className="flex items-center gap-3 bg-slate-800 p-3 rounded-lg border border-slate-700 hover:border-blue-500 transition-all group w-fit"
                                     >
                                         <div className="p-2 bg-blue-600/20 rounded text-blue-400 group-hover:text-blue-300">
                                             <FileText size={20}/>
                                         </div>
                                         <div>
                                             <div className="font-bold text-white text-sm">{viewingAnnouncement.fileName}</div>
                                             <div className="text-[10px] text-slate-500">Nhấn để xem / tải về</div>
                                         </div>
                                     </a>
                                 </div>
                             )}
                         </div>

                         {/* Modal Footer */}
                         <div className="px-6 py-4 bg-slate-800 border-t border-slate-700 flex justify-end shrink-0">
                             <button 
                                onClick={() => setViewingAnnouncement(null)}
                                className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-lg transition-colors text-sm"
                             >
                                 Đóng
                             </button>
                         </div>
                    </div>
                </div>
            )}

        </div>
    );
};
