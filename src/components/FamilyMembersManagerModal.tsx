import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  Trash2, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  X, 
  Crown, 
  Calendar,
  Sparkles,
  Phone,
  Mail,
  Loader2,
  RefreshCw,
  Plus
} from 'lucide-react';
import { supabase, SUPABASE_URL } from '../lib/supabase';

export interface FamilyMemberItem {
  id: string;
  member_id: string;
  added_at: string;
  full_name: string;
  phone: string;
  email: string;
  avatar_url?: string;
  church?: string;
  service?: string;
  is_subscribed: boolean;
  subscription_plan: string;
}

interface FamilyMembersManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  ownerId: string;
  ownerName: string;
  ownerPhone?: string;
  ownerEmail?: string;
  initialPlan?: string;
  maxMembers?: number;
  onUpdate?: () => void;
}

export const FamilyMembersManagerModal: React.FC<FamilyMembersManagerModalProps> = ({
  isOpen,
  onClose,
  ownerId,
  ownerName,
  ownerPhone,
  ownerEmail,
  initialPlan = 'premium_10',
  maxMembers = 10,
  onUpdate
}) => {
  const [members, setMembers] = useState<FamilyMemberItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentMaxMembers, setCurrentMaxMembers] = useState(maxMembers);
  const [activePlan, setActivePlan] = useState(initialPlan);

  // Search & Add state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [isChangingCapacity, setIsChangingCapacity] = useState(false);

  const showToast = (msg: string, isError = false) => {
    if (isError) {
      setActionError(msg);
      setTimeout(() => setActionError(null), 5000);
    } else {
      setActionSuccess(msg);
      setTimeout(() => setActionSuccess(null), 4000);
    }
  };

  // Fetch Team Members
  const fetchMembers = async () => {
    if (!ownerId) return;
    try {
      setIsLoading(true);

      // 1. Fetch Owner's latest max_team_members from profiles
      const { data: ownerProfile } = await supabase
        .from('profiles')
        .select('max_team_members, subscription_plan, subscription_end_date')
        .eq('id', ownerId)
        .maybeSingle();

      if (ownerProfile) {
        if (ownerProfile.max_team_members) {
          setCurrentMaxMembers(ownerProfile.max_team_members);
        }
        if (ownerProfile.subscription_plan) {
          setActivePlan(ownerProfile.subscription_plan);
        }
      }

      // 2. Fetch Team Member rows
      const { data: teamRows, error: teamErr } = await supabase
        .from('subscription_team_members')
        .select('id, member_id, added_at')
        .eq('owner_id', ownerId)
        .order('added_at', { ascending: false });

      if (teamErr) throw teamErr;

      if (!teamRows || teamRows.length === 0) {
        setMembers([]);
        return;
      }

      // 3. Fetch profiles for all members
      const memberIds = teamRows.map(r => r.member_id).filter(Boolean);
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, username, phone, email, avatar_url, church, service, is_subscribed, subscription_plan')
        .in('id', memberIds);

      const profilesMap = new Map((profilesData || []).map(p => [p.id, p]));

      const formatted: FamilyMemberItem[] = teamRows.map(r => {
        const p = profilesMap.get(r.member_id);
        return {
          id: r.id,
          member_id: r.member_id,
          added_at: r.added_at,
          full_name: p?.full_name || p?.username || 'مستخدم كرمتي',
          phone: p?.phone || '',
          email: p?.email || '',
          avatar_url: p?.avatar_url || '',
          church: p?.church || '',
          service: p?.service || '',
          is_subscribed: p?.is_subscribed ?? true,
          subscription_plan: p?.subscription_plan || 'premium_member',
        };
      });

      setMembers(formatted);
    } catch (err: any) {
      console.error('Error fetching team members:', err);
      showToast('تعذر تحميل أفراد الفريق: ' + err.message, true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && ownerId) {
      fetchMembers();
      setSearchQuery('');
      setSearchResults([]);
      setActionError(null);
      setActionSuccess(null);
    }
  }, [isOpen, ownerId]);

  // Live user search
  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, username, phone, email, avatar_url, church, is_subscribed, subscription_plan, team_owner_id')
          .or(`full_name.ilike.%${q}%,username.ilike.%${q}%,phone.ilike.%${q}%,email.ilike.%${q}%`)
          .limit(8);

        if (!error && data) {
          // Filter out owner and already added members
          const currentMemberIds = new Set(members.map(m => m.member_id));
          const filtered = data.filter(u => u.id !== ownerId && !currentMemberIds.has(u.id));
          setSearchResults(filtered);
        }
      } catch (e) {
        console.error('Search error:', e);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, members, ownerId]);

  // Add Member to Team
  const handleAddMember = async (targetUser: any) => {
    if (members.length >= currentMaxMembers) {
      showToast(`تم الوصول للحد الأقصى المسموح (${currentMaxMembers} أفراد). يرجى زيادة سعة الباقة أولاً.`, true);
      return;
    }

    setIsAdding(true);
    try {
      // 1. Try atomic DB function
      const { error: rpcErr } = await supabase.rpc('add_subscription_team_member', {
        p_owner_id: ownerId,
        p_member_id: targetUser.id,
      });

      if (rpcErr) {
        console.warn('RPC add_subscription_team_member fallback:', rpcErr);
        // Fallback: Get Owner's end date
        const { data: ownerProfile } = await supabase
          .from('profiles')
          .select('subscription_end_date')
          .eq('id', ownerId)
          .single();

        // Insert into subscription_team_members
        const { error: insErr } = await supabase
          .from('subscription_team_members')
          .insert({
            owner_id: ownerId,
            member_id: targetUser.id,
          });

        if (insErr) throw insErr;

        // Grant premium privileges to target user
        const { error: upErr } = await supabase
          .from('profiles')
          .update({
            is_subscribed: true,
            subscription_plan: 'premium_member',
            team_owner_id: ownerId,
            is_team_owner: false,
            max_team_members: 0,
            subscription_end_date: ownerProfile?.subscription_end_date || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', targetUser.id);

        if (upErr) throw upErr;

        // Send notification
        await supabase.from('notifications').insert({
          user_id: targetUser.id,
          title: '👑 تمت إضافتك إلى كرمتي للعائلة والخدام!',
          body: `قام ${ownerName || 'مسؤول الباقة'} بإضافتك ضمن باقة كرمتي بريميوم. استمتع بكافة مميزات التطبيق بدون أي إعلانات نهائياً!`,
          type: 'premium_member_added',
          data: { owner_id: ownerId, owner_name: ownerName },
        });
      }

      showToast(`تمت إضافة (${targetUser.full_name || targetUser.phone || 'المستخدم'}) بنجاح وتفعيل كرمتي بدون إعلانات له! 🎉`);
      setSearchQuery('');
      setSearchResults([]);
      await fetchMembers();
      onUpdate?.();
    } catch (err: any) {
      console.error('Error adding member:', err);
      showToast('تعذر إضافة العضو: ' + (err.message || 'خطأ غير معروف'), true);
    } finally {
      setIsAdding(false);
    }
  };

  // Remove Member from Team
  const handleRemoveMember = async (item: FamilyMemberItem) => {
    const confirmDelete = window.confirm(
      `هل تريد بالتأكيد إزالة (${item.full_name}) من باقة كرمتي للعائلة؟ ستعود الإعلانات لحسابه فوراً.`
    );
    if (!confirmDelete) return;

    try {
      // 1. Try atomic DB function
      const { error: rpcErr } = await supabase.rpc('remove_subscription_team_member', {
        p_owner_id: ownerId,
        p_member_id: item.member_id,
      });

      if (rpcErr) {
        console.warn('RPC remove_subscription_team_member fallback:', rpcErr);
        // Fallback: Delete from subscription_team_members
        const { error: delErr } = await supabase
          .from('subscription_team_members')
          .delete()
          .eq('owner_id', ownerId)
          .eq('member_id', item.member_id);

        if (delErr) throw delErr;

        // 2. Revoke premium benefits
        await supabase
          .from('profiles')
          .update({
            is_subscribed: false,
            subscription_plan: 'none',
            subscription_end_date: null,
            team_owner_id: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', item.member_id);

        // 3. Notification
        await supabase.from('notifications').insert({
          user_id: item.member_id,
          title: '⚠️ تم إلغاء اشتراكك في باقة كرمتي للعائلة',
          body: 'تم إلغاء إضافتك في باقة كرمتي للعائلة وعاد حسابك للباقة المجانية.',
          type: 'subscription_cancelled',
          data: { is_subscribed: false },
        });
      }

      showToast(`تمت إزالة (${item.full_name}) من الباقة بنجاح وإعادة الإعلانات له.`);
      await fetchMembers();
      onUpdate?.();
    } catch (err: any) {
      console.error('Error removing member:', err);
      showToast('تعذر إزالة العضو: ' + err.message, true);
    }
  };

  // Update Max Capacity
  const handleUpdateCapacity = async (newCapacity: number) => {
    setIsChangingCapacity(true);
    try {
      const newPlanId = `premium_${newCapacity}`;
      const { error } = await supabase
        .from('profiles')
        .update({
          max_team_members: newCapacity,
          subscription_plan: newPlanId,
          is_team_owner: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', ownerId);

      if (error) throw error;

      setCurrentMaxMembers(newCapacity);
      setActivePlan(newPlanId);
      showToast(`تم تحديث سعة الباقة بنجاح إلى (${newCapacity} أفراد)! ✨`);
      onUpdate?.();
    } catch (err: any) {
      showToast('تعذر تعديل السعة: ' + err.message, true);
    } finally {
      setIsChangingCapacity(false);
    }
  };

  if (!isOpen) return null;

  const currentCount = members.length;
  const isFull = currentCount >= currentMaxMembers;
  const progressPercent = Math.min(100, Math.round((currentCount / currentMaxMembers) * 100));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md animate-fade-in text-right">
      <div className="bg-slate-900 border border-purple-500/40 rounded-3xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl relative overflow-hidden">
        
        {/* Top Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-purple-950/60 via-slate-900 to-slate-900 border-b border-purple-500/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-purple-600/30">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white">إدارة أفراد العائلة والخدام</h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  كرمتي بريميوم 👥
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                مالك الباقة: <span className="text-white font-bold">{ownerName}</span>
                {ownerPhone && <span className="text-purple-300 mr-2 font-mono">({ownerPhone})</span>}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          
          {/* Toast Messages */}
          {actionSuccess && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{actionSuccess}</span>
            </div>
          )}

          {actionError && (
            <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{actionError}</span>
            </div>
          )}

          {/* Quota & Capacity Card */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs text-slate-400 font-medium">سعة وحصة الباقة الحالية:</span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-black text-white">{currentCount}</span>
                  <span className="text-slate-400 text-sm">من أصل <span className="text-amber-400 font-bold">{currentMaxMembers}</span> مقاعد</span>
                  <span className="text-xs text-purple-300 font-semibold mr-2">
                    ({isFull ? 'الباقة ممتلئة بالكامل' : `متبقي ${currentMaxMembers - currentCount} مقاعد متاحة`})
                  </span>
                </div>
              </div>

              {/* Capacity Quick Adjust */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] text-slate-400 ml-1">تعديل السعة:</span>
                {[10, 15, 20, 30].map(cap => (
                  <button
                    key={cap}
                    disabled={isChangingCapacity || cap === currentMaxMembers}
                    onClick={() => handleUpdateCapacity(cap)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      cap === currentMaxMembers
                        ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {cap} فرد
                  </button>
                ))}
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-800 rounded-full h-2.5 mt-3 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isFull ? 'bg-amber-400' : 'bg-gradient-to-r from-purple-500 to-emerald-400'
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Quick Add Form */}
          <div className="bg-slate-950/40 border border-purple-500/30 rounded-2xl p-4">
            <label className="block text-xs font-bold text-purple-200 mb-2 flex items-center gap-1.5">
              <UserPlus className="w-4 h-4 text-purple-400" />
              إضافة شخص جديد إلى باقة كرمتي للعائلة / الخدام:
            </label>
            
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث بالاسم، رقم الهاتف (مثال: 010...) أو البريد الإلكتروني..."
                disabled={isFull || isAdding}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl pr-10 pl-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 disabled:opacity-50"
              />
              <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
              {isSearching && (
                <Loader2 className="w-4 h-4 text-purple-400 animate-spin absolute left-3.5 top-1/2 -translate-y-1/2" />
              )}
            </div>

            {isFull && (
              <p className="text-[11px] text-amber-400 mt-2">
                🔒 تم الوصول للحد الأقصى. لإضافة المزيد اختر سعة أعلى (15 أو 20 أو 30 فرد) أعلاه.
              </p>
            )}

            {/* Search Dropdown Results */}
            {searchResults.length > 0 && (
              <div className="mt-2 bg-slate-900 border border-purple-500/40 rounded-xl overflow-hidden shadow-2xl divide-y divide-slate-800 max-h-56 overflow-y-auto">
                {searchResults.map((user) => (
                  <div
                    key={user.id}
                    className="p-3 hover:bg-purple-950/30 flex items-center justify-between gap-3 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-purple-600/30 text-purple-300 font-bold flex items-center justify-center text-xs shrink-0">
                        {user.full_name ? user.full_name[0] : 'U'}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white truncate">
                          {user.full_name || user.username}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2">
                          {user.phone && <span className="font-mono">{user.phone}</span>}
                          {user.church && <span>• {user.church}</span>}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleAddMember(user)}
                      disabled={isAdding}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shrink-0 flex items-center gap-1 shadow-md shadow-emerald-600/20 transition-all hover:scale-105"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>إضافة للباقة</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Members Table */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <span>الأفراد المضافون حالياً ({members.length})</span>
                <span className="text-xs text-slate-400 font-normal">• معفى من الإعلانات بالكامل</span>
              </h4>
              <button
                onClick={fetchMembers}
                className="text-xs text-purple-300 hover:text-purple-200 flex items-center gap-1"
                title="تحديث القائمة"
              >
                <RefreshCw className="w-3 h-3" />
                <span>تحديث</span>
              </button>
            </div>

            {isLoading ? (
              <div className="p-8 text-center text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-purple-400" />
                <span>جاري تحميل أفراد الفريق...</span>
              </div>
            ) : members.length === 0 ? (
              <div className="p-8 text-center bg-slate-950/40 rounded-2xl border border-slate-800 text-slate-400">
                <Users className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                <p className="text-xs font-bold text-slate-300">لم يتم إضافة أي أفراد في هذه الباقة حتى الآن</p>
                <p className="text-[11px] text-slate-500 mt-1">استخدم شريط البحث أعلاه لإضافة أفراد العائلة أو الخدام فورياً</p>
              </div>
            ) : (
              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="bg-slate-800/60 border-b border-slate-800 text-slate-400 font-semibold">
                        <th className="p-3">الفرد / الخادم</th>
                        <th className="p-3">بيانات التواصل</th>
                        <th className="p-3">تاريخ الإضافة</th>
                        <th className="p-3">الحالة</th>
                        <th className="p-3 text-center">الإجراء</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {members.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-purple-500/20 text-purple-300 font-bold flex items-center justify-center text-xs shrink-0">
                                {item.full_name ? item.full_name[0] : 'خ'}
                              </div>
                              <div>
                                <div className="font-bold text-white">{item.full_name}</div>
                                {item.church && <div className="text-[10px] text-slate-400">{item.church}</div>}
                              </div>
                            </div>
                          </td>

                          <td className="p-3">
                            <div className="font-mono text-slate-300">{item.phone || '-'}</div>
                            {item.email && <div className="text-[10px] text-slate-400 truncate max-w-xs">{item.email}</div>}
                          </td>

                          <td className="p-3 text-slate-400">
                            {new Date(item.added_at).toLocaleDateString('ar-EG', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </td>

                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              بدون إعلانات
                            </span>
                          </td>

                          <td className="p-3 text-center">
                            <button
                              onClick={() => handleRemoveMember(item)}
                              className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/30 text-[11px] font-bold transition-all flex items-center gap-1 mx-auto"
                              title="إزالة من باقة العائلة"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>إزالة</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            ✨ أي عضو يُضاف هنا يتم إلغاء ظهور إعلانات AdMob له تلقائياً في تطبيق الهاتف.
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors"
          >
            إغلاق
          </button>
        </div>

      </div>
    </div>
  );
};
