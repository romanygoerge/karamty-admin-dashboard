import React, { useState } from 'react';
import { 
  Users, 
  UserPlus, 
  Edit3, 
  Trash2, 
  Download, 
  Coins, 
  Church, 
  Phone, 
  Mail, 
  CheckCircle, 
  Save,
  Search
} from 'lucide-react';
import { Profile } from '../types';
import { Modal } from '../components/Modal';
import { supabase } from '../lib/supabase';

interface UsersViewProps {
  profiles: Profile[];
  onRefresh: () => void;
}

export const UsersView: React.FC<UsersViewProps> = ({ profiles, onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // New User Form State
  const [newFullName, setNewFullName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newChurch, setNewChurch] = useState('');
  const [newRole, setNewRole] = useState('خادم');
  const [newPoints, setNewPoints] = useState(100);

  // Edit User Form State
  const [editRole, setEditRole] = useState('');
  const [editPoints, setEditPoints] = useState(0);
  const [editChurch, setEditChurch] = useState('');
  const [editPhone, setEditPhone] = useState('');

  const filteredProfiles = profiles.filter((p) => {
    const matchesSearch = 
      (p.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.phone?.includes(searchTerm) ||
      p.church?.toLowerCase().includes(searchTerm.toLowerCase()));
    
    if (roleFilter === 'all') return matchesSearch;
    if (roleFilter === 'servants') {
      return matchesSearch && (p.role?.includes('خادم') || p.role?.includes('أمين') || p.role === 'servant');
    }
    if (roleFilter === 'members') {
      return matchesSearch && (!p.role?.includes('خادم') && !p.role?.includes('أمين') && p.role !== 'servant');
    }
    return matchesSearch && p.role === roleFilter;
  });

  const handleOpenEdit = (user: Profile) => {
    setSelectedUser(user);
    setEditRole(user.role || 'مستخدم');
    setEditPoints(user.points || 0);
    setEditChurch(user.church || '');
    setEditPhone(user.phone || '');
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedUser) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          role: editRole,
          points: editPoints,
          church: editChurch,
          phone: editPhone,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedUser.id);

      if (error) throw error;

      setStatusMessage('تم تحديث بيانات المستخدم بنجاح');
      setTimeout(() => setStatusMessage(null), 3000);
      setIsEditModalOpen(false);
      onRefresh();
    } catch (err: any) {
      alert('خطأ أثناء التعديل: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFullName.trim()) return;
    setIsSaving(true);

    try {
      const newId = crypto.randomUUID();
      const { error } = await supabase
        .from('profiles')
        .insert({
          id: newId,
          full_name: newFullName.trim(),
          email: newEmail.trim() || `${newId.slice(0, 8)}@karamty.org`,
          phone: newPhone.trim(),
          church: newChurch.trim() || 'كنيسة العذراء',
          role: newRole,
          points: newPoints,
          is_profile_complete: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      setStatusMessage('تمت إضافة المستخدم الجديد بنجاح');
      setTimeout(() => setStatusMessage(null), 3000);
      setIsAddModalOpen(false);
      // Reset form
      setNewFullName('');
      setNewEmail('');
      setNewPhone('');
      setNewChurch('');
      onRefresh();
    } catch (err: any) {
      alert('خطأ أثناء الإضافة: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteUser = async (userId: string, name: string) => {
    if (!confirm(`هل أنت متأكد من حذف حساب (${name}) نهائياً؟`)) return;
    try {
      const { error } = await supabase.from('profiles').delete().eq('id', userId);
      if (error) throw error;
      onRefresh();
    } catch (err: any) {
      alert('خطأ أثناء الحذف: ' + err.message);
    }
  };

  const exportToCSV = () => {
    const headers = ['الاسم بالكامل', 'البريد الإلكتروني', 'الهاتف', 'الدور / الرتبة', 'الكنيسة', 'رصيد النقاط'];
    const rows = filteredProfiles.map(p => [
      `"${p.full_name || ''}"`,
      `"${p.email || ''}"`,
      `"${p.phone || ''}"`,
      `"${p.role || ''}"`,
      `"${p.church || ''}"`,
      p.points || 0
    ]);
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `karamty_users_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner and Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-panel p-5 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-brand-500/20 text-brand-400">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">إدارة الخدام والأعضاء</h3>
            <p className="text-xs text-slate-400">متابعة حسابات المستخدمين، تعديل الصلاحيات، وإدارة النقاط</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all"
          >
            <Download className="w-4 h-4 text-slate-400" />
            <span>تصدير Excel/CSV</span>
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-lg shadow-brand-600/30 transition-all"
          >
            <UserPlus className="w-4 h-4" />
            <span>إضافة خادم / مستخدم جديد</span>
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          {statusMessage}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="بحث بالاسم، الكنيسة، أو الهاتف..."
            className="w-full bg-slate-900/90 text-xs text-slate-200 placeholder-slate-500 rounded-xl pr-10 pl-4 py-2.5 border border-slate-800 focus:outline-none focus:border-brand-500 transition-all"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800 w-full sm:w-auto">
          {[
            { id: 'all', label: `الكل (${profiles.length})` },
            { id: 'servants', label: 'الخدام والمسؤولين' },
            { id: 'members', label: 'الأعضاء' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setRoleFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                roleFilter === tab.id
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Users Table */}
      <div className="glass-panel rounded-2xl overflow-hidden border border-slate-800">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4 font-semibold">المستخدم</th>
                <th className="py-3.5 px-4 font-semibold">الكنيسة / الخدمة</th>
                <th className="py-3.5 px-4 font-semibold">الرتبة / الدور</th>
                <th className="py-3.5 px-4 font-semibold">رصيد النقاط</th>
                <th className="py-3.5 px-4 font-semibold">بيانات الاتصال</th>
                <th className="py-3.5 px-4 font-semibold text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredProfiles.map((p) => {
                const isServant = p.role?.includes('خادم') || p.role?.includes('أمين') || p.role === 'servant';
                return (
                  <tr key={p.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 overflow-hidden flex items-center justify-center font-bold text-slate-300">
                          {p.avatar_url ? (
                            <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            p.full_name?.charAt(0) || 'م'
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-white text-xs">{p.full_name || 'بدون اسم'}</p>
                          <p className="text-[11px] text-slate-400">@{p.username || 'user'}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 text-slate-300">
                        <Church className="w-3.5 h-3.5 text-slate-400" />
                        <span>{p.church || p.service || 'غير محدد'}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                        isServant 
                          ? 'bg-brand-500/15 text-brand-400 border border-brand-500/30'
                          : 'bg-slate-800 text-slate-300 border border-slate-700'
                      }`}>
                        {p.role || 'عضو'}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1 text-gold-400 font-bold">
                        <Coins className="w-3.5 h-3.5" />
                        <span>{p.points || 0}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4 space-y-0.5">
                      {p.phone && (
                        <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                          <Phone className="w-3 h-3" />
                          <span>{p.phone}</span>
                        </div>
                      )}
                      {p.email && (
                        <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                          <Mail className="w-3 h-3" />
                          <span className="truncate max-w-[150px]">{p.email}</span>
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleOpenEdit(p)}
                          title="تعديل المستخدم"
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-brand-600 text-slate-300 hover:text-white transition-all"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(p.id, p.full_name || 'المستخدم')}
                          title="حذف الحساب"
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredProfiles.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500 text-xs">
                    لم يتم العثور على أي مستخدمين مطابقين
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit User Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={`تعديل بيانات: ${selectedUser?.full_name || ''}`}
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-400 font-semibold mb-1">الرتبة / الدور في الخدمة</label>
            <select
              value={editRole}
              onChange={(e) => setEditRole(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-brand-500"
            >
              <option value="خادم">خادم</option>
              <option value="أمين خدمة">أمين خدمة</option>
              <option value="مساعد أمين">مساعد أمين</option>
              <option value="كاهن">كاهن</option>
              <option value="مشرف عام">مشرف عام</option>
              <option value="مستخدم">مستخدم / مخدوم</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">رصيد النقاط التفاعلية</label>
            <input
              type="number"
              value={editPoints}
              onChange={(e) => setEditPoints(Number(e.target.value))}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">الكنيسة التابع لها</label>
            <input
              type="text"
              value={editChurch}
              onChange={(e) => setEditChurch(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">رقم الهاتف</label>
            <input
              type="text"
              value={editPhone}
              onChange={(e) => setEditPhone(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-800">
            <button
              onClick={() => setIsEditModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 font-semibold"
            >
              إلغاء
            </button>
            <button
              onClick={handleSaveEdit}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold shadow-lg shadow-brand-600/30"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'جارٍ الحفظ...' : 'حفظ التغييرات'}</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* Add User Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="إضافة خادم أو مستخدم جديد"
      >
        <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-400 font-semibold mb-1">الاسم بالكامل *</label>
            <input
              type="text"
              required
              value={newFullName}
              onChange={(e) => setNewFullName(e.target.value)}
              placeholder="مثال: يوسف جورج رمسيس"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">البريد الإلكتروني</label>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="youssef@example.com"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">الدور / الرتبة</label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-brand-500"
              >
                <option value="خادم">خادم</option>
                <option value="أمين خدمة">أمين خدمة</option>
                <option value="مساعد أمين">مساعد أمين</option>
                <option value="كاهن">كاهن</option>
                <option value="مستخدم">مستخدم</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">رصيد النقاط الأولي</label>
              <input
                type="number"
                value={newPoints}
                onChange={(e) => setNewPoints(Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">الكنيسة</label>
              <input
                type="text"
                value={newChurch}
                onChange={(e) => setNewChurch(e.target.value)}
                placeholder="كنيسة السيدة العذراء"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">رقم الهاتف</label>
              <input
                type="text"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="01234567890"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 font-semibold"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold shadow-lg shadow-brand-600/30"
            >
              <UserPlus className="w-4 h-4" />
              <span>{isSaving ? 'جارٍ الإضافة...' : 'إضافة الآن'}</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
