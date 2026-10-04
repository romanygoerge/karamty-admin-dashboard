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
  Search,
  Flame,
  BookOpen,
  Crown,
  ShieldCheck,
  Sparkles,
  Clock
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

  // Subscription Management Modal State
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [selectedSubUser, setSelectedSubUser] = useState<Profile | null>(null);
  const [subPlan, setSubPlan] = useState<'monthly' | 'yearly' | 'lifetime'>('monthly');
  const [subDurationMonths, setSubDurationMonths] = useState<number>(1);
  const [isSubProcessing, setIsSubProcessing] = useState(false);

  // New User Form State
  const [newFullName, setNewFullName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newChurch, setNewChurch] = useState('');
  const [newRole, setNewRole] = useState('خادم');
  const [newPoints, setNewPoints] = useState(100);

  // Edit User Form State
  const [editFullName, setEditFullName] = useState('');
  const [editRole, setEditRole] = useState('');
  const [editPoints, setEditPoints] = useState(0);
  const [editStreakDays, setEditStreakDays] = useState(0);
  const [editChaptersRead, setEditChaptersRead] = useState(0);
  const [editChurch, setEditChurch] = useState('');
  const [editPhone, setEditPhone] = useState('');

  const handleOpenSubscriptionModal = (user: Profile) => {
    setSelectedSubUser(user);
    const plan = user.subscription_plan === 'yearly' ? 'yearly' : user.subscription_plan === 'lifetime' ? 'lifetime' : 'monthly';
    setSubPlan(plan);
    setSubDurationMonths(plan === 'yearly' ? 12 : plan === 'lifetime' ? 0 : 1);
    setIsSubModalOpen(true);
  };

  const handleToggleSubscription = async (activate: boolean) => {
    if (!selectedSubUser) return;
    setIsSubProcessing(true);
    try {
      // 1. Invoke Edge Function
      const { data, error } = await supabase.functions.invoke('handle-payment-request', {
        body: {
          action: 'toggle_user_subscription',
          user_id: selectedSubUser.id,
          is_subscribed: activate,
          plan: subPlan,
          months: subPlan === 'lifetime' ? 0 : Number(subDurationMonths)
        }
      });

      if (error) {
        // Fallback directly to profiles table update
        let endDate: string | null = null;
        if (activate && subPlan !== 'lifetime') {
          const d = new Date();
          d.setMonth(d.getMonth() + Number(subDurationMonths));
          endDate = d.toISOString();
        }
        const { error: pErr } = await supabase
          .from('profiles')
          .update({
            is_subscribed: activate,
            subscription_plan: activate ? subPlan : 'none',
            subscription_end_date: endDate,
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedSubUser.id);

        if (pErr) throw pErr;
      }

      setStatusMessage(
        activate
          ? `تم بنجاح تفعيل اشتراك (${selectedSubUser.full_name || 'المستخدم'}) وإلغاء ظهور أي إعلانات له في التطبيق!`
          : `تم إلغاء الاشتراك وإعادة الإعلانات للمستخدم (${selectedSubUser.full_name || ''}).`
      );
      setTimeout(() => setStatusMessage(null), 5000);
      setIsSubModalOpen(false);
      onRefresh();
    } catch (err: any) {
      alert('خطأ أثناء تحديث حالة الاشتراك: ' + err.message);
    } finally {
      setIsSubProcessing(false);
    }
  };

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
    setEditFullName(user.full_name || '');
    setEditRole(user.role || 'مستخدم');
    setEditPoints(user.points || 0);
    setEditStreakDays(user.streak_days || 0);
    setEditChaptersRead(user.chapters_read || 0);
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
          full_name: editFullName.trim(),
          role: editRole,
          points: editPoints,
          streak_days: editStreakDays,
          chapters_read: editChaptersRead,
          church: editChurch,
          phone: editPhone,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedUser.id);

      if (error) throw error;

      // مزامنة الاسم المحدث فوراً في جدول منشورات وتعليقات إكسبلور
      if (editFullName.trim()) {
        try {
          await supabase
            .from('community_posts')
            .update({
              author_name: editFullName.trim(),
              author_church: editChurch.trim(),
              author_role: editRole,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', selectedUser.id);

          await supabase
            .from('community_post_comments')
            .update({
              author_name: editFullName.trim(),
              author_role: editRole,
            })
            .eq('user_id', selectedUser.id);
        } catch (syncErr) {
          console.error('Notice syncing posts on user edit:', syncErr);
        }
      }

      setStatusMessage('تم تحديث بيانات المستخدم ومزامنة منشوراته بنجاح');
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
    const headers = ['الاسم بالكامل', 'البريد الإلكتروني', 'الهاتف', 'الدور / الرتبة', 'الكنيسة', 'رصيد النقاط', 'أيام متتالية', 'أصحاحات مقروءة'];
    const rows = filteredProfiles.map(p => [
      `"${p.full_name || ''}"`,
      `"${p.email || ''}"`,
      `"${p.phone || ''}"`,
      `"${p.role || ''}"`,
      `"${p.church || ''}"`,
      p.points || 0,
      p.streak_days || 0,
      p.chapters_read || 0
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
                <th className="py-3.5 px-4 font-semibold">الاشتراك وإلغاء الإعلانات</th>
                <th className="py-3.5 px-4 font-semibold">رصيد النقاط</th>
                <th className="py-3.5 px-4 font-semibold">أيام متتالية</th>
                <th className="py-3.5 px-4 font-semibold">أصحاحات مقروءة</th>
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
                      {p.is_subscribed ? (
                        <div className="flex flex-col gap-1 items-start">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                            <Crown className="w-3 h-3 text-amber-400" />
                            {p.subscription_plan === 'yearly'
                              ? 'سنوي (بدون إعلانات)'
                              : p.subscription_plan === 'lifetime'
                              ? 'دائم (مدى الحياة)'
                              : 'شهري (بدون إعلانات)'}
                          </span>
                          {p.subscription_end_date && (
                            <span className="text-[10px] text-slate-400">
                              ينتهي: {new Date(p.subscription_end_date).toLocaleDateString('ar-EG')}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] text-slate-500 bg-slate-800/80 border border-slate-700/60">
                          حساب عادي
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1 text-gold-400 font-bold">
                        <Coins className="w-3.5 h-3.5" />
                        <span>{p.points || 0}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1 text-amber-500 font-bold">
                        <Flame className="w-3.5 h-3.5 text-amber-500" />
                        <span>{p.streak_days || 0} يوم</span>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1 text-purple-400 font-bold">
                        <BookOpen className="w-3.5 h-3.5 text-purple-400" />
                        <span>{p.chapters_read || 0}</span>
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
                          onClick={() => handleOpenSubscriptionModal(p)}
                          title="إدارة اشتراك كرمتي بلس وإلغاء الإعلانات"
                          className={`p-1.5 rounded-lg border transition-all ${
                            p.is_subscribed
                              ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 hover:bg-amber-500 hover:text-slate-950'
                              : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-amber-500/20 hover:text-amber-400 hover:border-amber-500/30'
                          }`}
                        >
                          <Crown className="w-3.5 h-3.5" />
                        </button>
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
                  <td colSpan={9} className="py-8 text-center text-slate-500 text-xs">
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
            <label className="block text-slate-400 font-semibold mb-1">الاسم بالكامل (يظهر كناشر في إكسبلور والتطبيق)</label>
            <input
              type="text"
              value={editFullName}
              onChange={(e) => setEditFullName(e.target.value)}
              placeholder="اسم المستخدم أو الخادم"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-brand-500"
            />
          </div>

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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">أيام متتالية (Streak)</label>
              <input
                type="number"
                value={editStreakDays}
                onChange={(e) => setEditStreakDays(Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-semibold mb-1">أصحاحات مقروءة</label>
              <input
                type="number"
                value={editChaptersRead}
                onChange={(e) => setEditChaptersRead(Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-brand-500"
              />
            </div>
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

      {/* Manage User Subscription Modal */}
      <Modal
        isOpen={isSubModalOpen}
        onClose={() => setIsSubModalOpen(false)}
        title="إدارة الاشتراك وإلغاء الإعلانات (كرمتي بلس)"
      >
        <div className="space-y-5 text-xs">
          {/* User Brief */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/60 border border-slate-700">
            <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-600 flex items-center justify-center font-bold text-slate-200">
              {selectedSubUser?.avatar_url ? (
                <img src={selectedSubUser.avatar_url} alt="" className="w-full h-full object-cover rounded-full" />
              ) : (
                selectedSubUser?.full_name?.charAt(0) || 'م'
              )}
            </div>
            <div>
              <p className="font-bold text-white text-sm">{selectedSubUser?.full_name || 'بدون اسم'}</p>
              <p className="text-slate-400 text-xs">{selectedSubUser?.phone || selectedSubUser?.email || `@${selectedSubUser?.username || 'user'}`}</p>
            </div>
          </div>

          {/* Current Status */}
          <div className={`p-4 rounded-xl border flex items-center justify-between ${
            selectedSubUser?.is_subscribed
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
              : 'bg-slate-800/80 border-slate-700 text-slate-300'
          }`}>
            <div className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-amber-400" />
              <div>
                <p className="font-bold text-sm">
                  {selectedSubUser?.is_subscribed ? 'المستخدم مشترك حالياً (كرمتي بلس)' : 'المستخدم غير مشترك (تظهر له الإعلانات)'}
                </p>
                <p className="text-xs text-slate-400">
                  {selectedSubUser?.is_subscribed
                    ? `الباقة: ${selectedSubUser.subscription_plan === 'yearly' ? 'سنوية' : selectedSubUser.subscription_plan === 'lifetime' ? 'دائمة' : 'شهرية'} ${
                        selectedSubUser.subscription_end_date
                          ? `- ينتهي في ${new Date(selectedSubUser.subscription_end_date).toLocaleDateString('ar-EG')}`
                          : '- مدى الحياة'
                      }`
                    : 'الإعلانات ممكّنة لهذا الحساب'}
                </p>
              </div>
            </div>
          </div>

          {/* Plan Selection */}
          <div className="space-y-2">
            <label className="block text-slate-300 font-bold">اختر نوع الباقة المراد تعيينها:</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'monthly', name: 'شهري', price: '99 ج.م', defMonths: 1 },
                { id: 'yearly', name: 'سنوي (وفر 50%)', price: '599 ج.م', defMonths: 12 },
                { id: 'lifetime', name: 'مدى الحياة', price: 'VIP', defMonths: 0 },
              ].map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setSubPlan(p.id as any);
                    setSubDurationMonths(p.defMonths);
                  }}
                  className={`p-3 rounded-xl border text-right transition-all ${
                    subPlan === p.id
                      ? 'bg-amber-500/15 border-amber-500 text-white shadow-lg shadow-amber-500/10'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                  }`}
                >
                  <p className="font-bold text-xs text-amber-400">{p.name}</p>
                  <p className="text-[11px] text-slate-300 mt-1">{p.price}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Duration Selector */}
          {subPlan !== 'lifetime' && (
            <div className="space-y-2">
              <label className="block text-slate-300 font-bold">مدة التفعيل بالشهور:</label>
              <div className="grid grid-cols-5 gap-2">
                {[
                  { m: 1, label: 'شهر' },
                  { m: 2, label: 'شهرين' },
                  { m: 3, label: '3 شهور' },
                  { m: 6, label: '6 شهور' },
                  { m: 12, label: 'سنة' },
                ].map(d => (
                  <button
                    key={d.m}
                    type="button"
                    onClick={() => setSubDurationMonths(d.m)}
                    className={`py-2 px-1 text-center rounded-lg border text-xs font-bold transition-all ${
                      subDurationMonths === d.m
                        ? 'bg-brand-600 border-brand-500 text-white'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
              <div className="pt-1 flex items-center gap-2">
                <span className="text-slate-400 text-[11px]">أو أدخل عدد شهور مخصص:</span>
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={subDurationMonths}
                  onChange={(e) => setSubDurationMonths(Math.max(1, Number(e.target.value)))}
                  className="w-20 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-white text-center focus:outline-none focus:border-brand-500"
                />
                <span className="text-slate-400 text-[11px]">شهر</span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            {selectedSubUser?.is_subscribed ? (
              <button
                type="button"
                onClick={() => handleToggleSubscription(false)}
                disabled={isSubProcessing}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold transition-all"
              >
                {isSubProcessing ? 'جارٍ الإلغاء...' : 'إلغاء الاشتراك وإعادة الإعلانات'}
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={() => setIsSubModalOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-semibold"
              >
                إغلاق
              </button>
              <button
                type="button"
                onClick={() => handleToggleSubscription(true)}
                disabled={isSubProcessing}
                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-bold shadow-lg shadow-amber-500/20 transition-all"
              >
                <Crown className="w-4 h-4" />
                <span>{isSubProcessing ? 'جارٍ الحفظ...' : 'تفعيل الاشتراك وإلغاء الإعلانات فورياً'}</span>
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};
