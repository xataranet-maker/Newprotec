
import React, { useState } from 'react';
import { Users, Search, Plus, Edit, Trash2, X, Save, Key, Shield, UserCircle, CheckCircle2 } from 'lucide-react';
import { UserAccount, UserRole } from '../../types';

interface AdminUserManagementProps {
  users: UserAccount[];
  onUpdateUsers: (newUsers: UserAccount[]) => void;
}

const ROLES: { value: UserRole; label: string; color: string }[] = [
    { value: 'admin', label: 'Quản trị viên (Admin)', color: 'bg-red-100 text-red-700 border-red-200' },
    { value: 'multiauto', label: 'Phòng Multi Auto', color: 'bg-blue-100 text-blue-700 border-blue-200' },
    { value: 'stiff', label: 'Phòng Stiff', color: 'bg-green-100 text-green-700 border-green-200' },
    { value: 'mold', label: 'Phòng Khuôn & Jig', color: 'bg-purple-100 text-purple-700 border-purple-200' },
    { value: 'stamping', label: 'Phòng Dập Tự Động', color: 'bg-orange-100 text-orange-700 border-orange-200' },
    { value: 'hr', label: 'Hành Chính Nhân Sự', color: 'bg-pink-100 text-pink-700 border-pink-200' },
    { value: 'equipment', label: 'Phòng Thiết Bị', color: 'bg-amber-100 text-amber-700 border-amber-200' },
    { value: 'quality', label: 'Phòng Chất Lượng', color: 'bg-teal-100 text-teal-700 border-teal-200' },
    { value: 'view_all', label: 'Xem Tất Cả (Chỉ Xem)', color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
    { value: 'report_viewer', label: 'Người xem báo cáo (Giới hạn)', color: 'bg-teal-100 text-teal-700 border-teal-200' },
    { value: 'user', label: 'Người dùng xem (User)', color: 'bg-gray-100 text-gray-700 border-gray-200' },
];

export const AdminUserManagement: React.FC<AdminUserManagementProps> = ({ users, onUpdateUsers }) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [originalUsername, setOriginalUsername] = useState(''); // To track which user is being edited

  const [formData, setFormData] = useState<UserAccount>({
    username: '',
    password: '',
    fullName: '',
    role: 'user'
  });

  const handleAddNew = () => {
    setIsEditing(false);
    setFormData({
        username: '',
        password: '',
        fullName: '',
        role: 'user'
    });
    setIsModalOpen(true);
  };

  const handleEdit = (user: UserAccount) => {
    setIsEditing(true);
    setOriginalUsername(user.username);
    setFormData({ ...user });
    setIsModalOpen(true);
  };

  const handleDelete = (usernameToDelete: string) => {
    if (usernameToDelete === 'Newprotec') {
        alert("Không thể xóa tài khoản Quản trị viên gốc.");
        return;
    }
    if (window.confirm(`Bạn có chắc chắn muốn xóa tài khoản "${usernameToDelete}"?`)) {
        const updatedUsers = users.filter(u => u.username !== usernameToDelete);
        onUpdateUsers(updatedUsers);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.username || !formData.password || !formData.fullName) {
        alert("Vui lòng điền đầy đủ thông tin.");
        return;
    }

    // Check duplicate username if adding new or changing username
    if (!isEditing || (isEditing && formData.username !== originalUsername)) {
        if (users.some(u => u.username.toLowerCase() === formData.username.toLowerCase())) {
            alert("Tên đăng nhập đã tồn tại. Vui lòng chọn tên khác.");
            return;
        }
    }

    let updatedUsers = [...users];

    if (isEditing) {
        updatedUsers = updatedUsers.map(u => 
            u.username === originalUsername ? formData : u
        );
    } else {
        updatedUsers.push(formData);
    }

    onUpdateUsers(updatedUsers);
    setIsModalOpen(false);
  };

  const filteredUsers = users.filter(user => 
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.fullName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 h-full overflow-y-auto bg-slate-50 flex flex-col gap-6 relative">
      {/* Responsive Header */}
      <div className="bg-white px-3 py-2 md:px-4 md:py-3 rounded-lg shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-center gap-3 sticky top-0 z-20">
        <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="p-1.5 bg-blue-600 rounded border border-blue-700 text-white shrink-0">
               <Shield size={18} />
            </div>
            <h1 className="text-sm md:text-base font-bold text-slate-800 uppercase tracking-tight truncate">
              QUẢN LÝ NGƯỜI DÙNG HỆ THỐNG
            </h1>
        </div>
        <button 
            onClick={handleAddNew}
            className="flex items-center justify-center gap-1 px-3 py-1.5 bg-green-600 text-white text-xs font-bold rounded shadow-sm hover:bg-green-700 transition-colors w-full md:w-auto"
        >
            <Plus size={14} /> Thêm Tài Khoản
        </button>
      </div>

      {/* Toolbar */}
      <div className="bg-white p-3 rounded-lg shadow-sm border border-slate-200">
        <div className="relative max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text" 
            placeholder="Tìm kiếm Tên đăng nhập, Họ tên..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {/* User Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex-1 flex flex-col overflow-hidden">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-sm text-left text-slate-600">
            <thead className="text-xs text-slate-700 uppercase bg-slate-100 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-3 font-bold border-b w-[50px]">STT</th>
                <th className="px-6 py-3 font-bold border-b">Tên Đăng Nhập</th>
                <th className="px-6 py-3 font-bold border-b">Họ Tên Hiển Thị</th>
                <th className="px-6 py-3 font-bold border-b">Mật Khẩu</th>
                <th className="px-6 py-3 font-bold border-b">Phân Quyền (Role)</th>
                <th className="px-6 py-3 font-bold border-b text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map((user, index) => {
                  const roleInfo = ROLES.find(r => r.value === user.role) || ROLES[ROLES.length - 1];
                  return (
                    <tr key={user.username} className="bg-white hover:bg-slate-50 transition-colors group">
                      <td className="px-6 py-3 font-medium text-slate-500">{index + 1}</td>
                      <td className="px-6 py-3 font-bold text-blue-700 flex items-center gap-2">
                          <UserCircle size={16} className="text-slate-400"/>
                          {user.username}
                          {user.username === 'Newprotec' && <Shield size={12} className="text-red-500" fill="currentColor"/>}
                      </td>
                      <td className="px-6 py-3 font-medium text-slate-800">{user.fullName}</td>
                      <td className="px-6 py-3 font-mono text-slate-500 text-xs">
                          <div className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded w-fit border border-slate-200">
                             <Key size={10}/> {user.password}
                          </div>
                      </td>
                      <td className="px-6 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border w-fit ${roleInfo.color}`}>
                              <CheckCircle2 size={10}/> {roleInfo.label}
                          </span>
                      </td>
                      <td className="px-6 py-3 text-center">
                          <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={() => handleEdit(user)}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors border border-transparent hover:border-blue-200"
                                title="Chỉnh sửa"
                              >
                                  <Edit size={14}/>
                              </button>
                              {user.username !== 'Newprotec' && (
                                <button 
                                    onClick={() => handleDelete(user.username)}
                                    className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors border border-transparent hover:border-red-200"
                                    title="Xóa tài khoản"
                                >
                                    <Trash2 size={14}/>
                                </button>
                              )}
                          </div>
                      </td>
                    </tr>
                  );
              })}
              {filteredUsers.length === 0 && (
                 <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                        Không tìm thấy người dùng phù hợp.
                    </td>
                 </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                  <div className="px-6 py-3 bg-slate-800 flex justify-between items-center text-white">
                      <h2 className="text-base font-bold flex items-center gap-2">
                          {isEditing ? <Edit size={18}/> : <Plus size={18}/>}
                          {isEditing ? 'Cập Nhật Tài Khoản' : 'Thêm Tài Khoản Mới'}
                      </h2>
                      <button onClick={() => setIsModalOpen(false)} className="hover:bg-white/20 p-1 rounded transition-colors">
                          <X size={18}/>
                      </button>
                  </div>
                  
                  <form onSubmit={handleSave} className="p-6 space-y-4">
                      
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tên Đăng Nhập <span className="text-red-500">*</span></label>
                          <div className="relative">
                            <input 
                                type="text" 
                                value={formData.username} 
                                onChange={(e) => setFormData({...formData, username: e.target.value})}
                                className="w-full border border-slate-300 rounded-md pl-9 pr-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none font-bold text-sm text-blue-700"
                                placeholder="VD: multiauto"
                                required
                            />
                            <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                          </div>
                      </div>

                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mật Khẩu <span className="text-red-500">*</span></label>
                          <div className="relative">
                            <input 
                                type="text" 
                                value={formData.password} 
                                onChange={(e) => setFormData({...formData, password: e.target.value})}
                                className="w-full border border-slate-300 rounded-md pl-9 pr-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono text-sm"
                                placeholder="Nhập mật khẩu..."
                                required
                            />
                            <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                          </div>
                      </div>

                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Họ Tên Hiển Thị <span className="text-red-500">*</span></label>
                          <input 
                            type="text" 
                            value={formData.fullName} 
                            onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                            className="w-full border border-slate-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                            placeholder="VD: Phòng Multi Auto"
                            required
                          />
                      </div>

                      <div>
                           <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Phân Quyền (Role) <span className="text-red-500">*</span></label>
                           <select 
                                value={formData.role} 
                                onChange={(e) => setFormData({...formData, role: e.target.value as UserRole})}
                                className="w-full border border-slate-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm bg-white"
                           >
                               {ROLES.map(role => (
                                   <option key={role.value} value={role.value}>{role.label}</option>
                               ))}
                           </select>
                           <p className="text-[10px] text-slate-500 mt-1 italic">
                               * Quyền hạn sẽ quyết định các Tab chức năng được phép truy cập.
                           </p>
                      </div>

                      <div className="pt-4 flex gap-3 border-t border-slate-100 mt-2">
                          <button 
                            type="submit"
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-md shadow-sm flex items-center justify-center gap-2 transition-colors text-sm"
                          >
                              <Save size={16}/> {isEditing ? 'Cập Nhật' : 'Lưu Tài Khoản'}
                          </button>
                          <button 
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="px-6 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-2 rounded-md transition-colors text-sm"
                          >
                              Hủy
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};
