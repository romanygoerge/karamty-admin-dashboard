import React, { useState } from 'react';
import { 
  Crown, 
  Users, 
  Sparkles, 
  Save, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Check, 
  Layers,
  ArrowUpRight
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { SubscriptionPlan } from '../types';

interface SubscriptionPlansManagerProps {
  plans: SubscriptionPlan[];
  onRefreshPlans: () => void;
}

export const SubscriptionPlansManager: React.FC<SubscriptionPlansManagerProps> = ({
  plans,
  onRefreshPlans,
}) => {
  const [editingPlans, setEditingPlans] = useState<Record<string, Partial<SubscriptionPlan>>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // New Plan Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPlan, setNewPlan] = useState<Partial<SubscriptionPlan>>({
    id: '',
    name: '',
    category: 'team',
    max_members: 10,
    price: 1500,
    period: 'yearly',
    description: '',
    badge: 'باقة جديدة ⭐',
    is_active: true,
  });
  const [isSubmittingNew, setIsSubmittingNew] = useState(false);

  // Show auto-dismissing toast
  const triggerToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 4000);
  };

  const getPlanField = (plan: SubscriptionPlan, field: keyof SubscriptionPlan) => {
    if (editingPlans[plan.id] && editingPlans[plan.id]![field] !== undefined) {
      return editingPlans[plan.id]![field];
    }
    return plan[field];
  };

  const handleFieldChange = (planId: string, field: keyof SubscriptionPlan, value: any) => {
    setEditingPlans(prev => ({
      ...prev,
      [planId]: {
        ...prev[planId],
        [field]: value,
      },
    }));
  };

  const handleSavePlan = async (plan: SubscriptionPlan) => {
    const edits = editingPlans[plan.id];
    if (!edits || Object.keys(edits).length === 0) return;

    try {
      setSavingId(plan.id);
      setErrorMsg(null);

      const updatedData = {
        name: edits.name !== undefined ? edits.name : plan.name,
        price: edits.price !== undefined ? Number(edits.price) : plan.price,
        max_members: edits.max_members !== undefined ? Number(edits.max_members) : plan.max_members,
        description: edits.description !== undefined ? edits.description : plan.description,
        badge: edits.badge !== undefined ? edits.badge : plan.badge,
        is_active: edits.is_active !== undefined ? edits.is_active : plan.is_active,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('subscription_plans')
        .update(updatedData)
        .eq('id', plan.id);

      if (error) throw error;

      // Clean local edit state
      setEditingPlans(prev => {
        const next = { ...prev };
        delete next[plan.id];
        return next;
      });

      triggerToast(`تم تحديث باقة (${updatedData.name}) بنجاح والتطبيق استلم التحديث لحظياً! 📱⚡`);
      onRefreshPlans();
    } catch (err: any) {
      setErrorMsg(`خطأ في الحفظ: ${err.message}`);
    } finally {
      setSavingId(null);
    }
  };

  const handleToggleActive = async (plan: SubscriptionPlan) => {
    try {
      const newStatus = !plan.is_active;
      const { error } = await supabase
        .from('subscription_plans')
        .update({ is_active: newStatus, updated_at: new Date().toISOString() })
        .eq('id', plan.id);

      if (error) throw error;
      triggerToast(`تم ${newStatus ? 'تفعيل' : 'إيقاف'} ظهور الباقة في التطبيق فوراً.`);
      onRefreshPlans();
    } catch (err: any) {
      alert(`خطأ: ${err.message}`);
    }
  };

  const handleCreateNewPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlan.id || !newPlan.name || !newPlan.price) {
      alert('يرجى ملء جميع الحقول المطلوبة (المعرف، الاسم، السعر)');
      return;
    }

    try {
      setIsSubmittingNew(true);
      const cleanId = newPlan.id.trim().toLowerCase().replace(/\s+/g, '_');
      const sortOrder = plans.length + 1;

      const { error } = await supabase.from('subscription_plans').insert({
        id: cleanId,
        name: newPlan.name,
        category: newPlan.category || 'team',
        max_members: Number(newPlan.max_members) || 1,
        price: Number(newPlan.price),
        period: newPlan.period || 'yearly',
        description: newPlan.description || '',
        badge: newPlan.badge || '',
        features: ['إزالة كاملة للإعلانات', 'شارة كرمتي بريميوم', 'إدارة أفراد الفريق'] as any,
        sort_order: sortOrder,
        is_active: true,
      });

      if (error) throw error;

      setShowAddModal(false);
      setNewPlan({
        id: '',
        name: '',
        category: 'team',
        max_members: 10,
        price: 1500,
        period: 'yearly',
        description: '',
        badge: 'باقة جديدة ⭐',
        is_active: true,
      });

      triggerToast('تمت إضافة الباقة الجديدة بنجاح وظهرت في التطبيق فوراً! 🎉');
      onRefreshPlans();
    } catch (err: any) {
      alert(`خطأ أثناء إنشاء الباقة: ${err.message}`);
    } finally {
      setIsSubmittingNew(false);
    }
  };

  const individualPlans = plans.filter(p => p.category === 'individual');
  const teamPlans = plans.filter(p => p.category === 'team');

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Toast Alert */}
      {successToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-emerald-400 font-bold text-sm animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-emerald-200 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {errorMsg && (
        <div className="bg-rose-950/80 border border-rose-500 text-rose-200 px-4 py-3 rounded-xl flex items-center gap-2 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Header Info */}
      <div className="bg-gradient-to-r from-purple-900/60 via-indigo-900/40 to-slate-900/80 border border-purple-500/30 rounded-2xl p-5 sm:p-6 backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping"></span>
            <h3 className="text-xl font-black text-white flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-amber-400" />
              إدارة أسعار وباقات الاشتراكات الحية (Live Plans)
            </h3>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
            تحكم مباشر في أسعار الباقات، عدد الأفراد المسموح إضافتهم في اشتراك <strong className="text-amber-300">كرمتي بريميوم</strong> للخدام، وتعديل الشارات. التعديلات هنا <span className="underline decoration-amber-400 font-bold">تسمع لحظياً في التطبيق لدى المستخدمين</span> بدون الحاجة لتحديث التطبيق.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs sm:text-sm shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة باقة جديدة</span>
        </button>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* SECTION 1: كرمتي بريميوم (باقات الخدام والمجموعات) */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                باقات كرمتي بريميوم (للخدام والمجموعات والفرق)
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-500/20 text-amber-300 font-bold">
                  اشتراك جماعي
                </span>
              </h4>
              <p className="text-xs text-slate-400">
                المشترك يدفع قيمة الباقة ويستطيع إضافة حتى (X) من الخدام لتعطيهم نفس مميزات الحساب بدون إعلانات.
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold text-slate-400 hidden sm:inline">
            {teamPlans.length} باقات متاحة
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {teamPlans.map(plan => {
            const hasEdits = !!editingPlans[plan.id];
            const currentPrice = Number(getPlanField(plan, 'price'));
            const currentMembers = Number(getPlanField(plan, 'max_members'));
            const perPerson = currentMembers > 0 ? Math.round(currentPrice / currentMembers) : currentPrice;
            const isSaving = savingId === plan.id;

            return (
              <div 
                key={plan.id}
                className={`bg-slate-900/80 border rounded-2xl p-5 relative flex flex-col justify-between transition-all backdrop-blur-sm ${
                  plan.is_active 
                    ? hasEdits ? 'border-amber-400/80 shadow-lg shadow-amber-500/10' : 'border-slate-800 hover:border-purple-500/40' 
                    : 'border-slate-800 opacity-60'
                }`}
              >
                {/* Top Badge & Status */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                      {plan.badge || 'كرمتي بريميوم 👥'}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleToggleActive(plan)}
                      className={`text-xs px-2.5 py-1 rounded-lg font-bold transition-colors ${
                        plan.is_active 
                          ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30' 
                          : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                      }`}
                    >
                      {plan.is_active ? 'نشطة بالتطبيق' : 'معطلة'}
                    </button>
                  </div>

                  {/* Plan Name */}
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">اسم الباقة:</label>
                  <input
                    type="text"
                    value={String(getPlanField(plan, 'name'))}
                    onChange={(e) => handleFieldChange(plan.id, 'name', e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-3 py-1.5 text-sm font-bold text-white mb-3 focus:outline-none focus:border-amber-400"
                  />

                  {/* Price & Quota Grid */}
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-400 block mb-1">السعر (ج.م):</label>
                      <div className="relative">
                        <input
                          type="number"
                          value={currentPrice}
                          onChange={(e) => handleFieldChange(plan.id, 'price', e.target.value)}
                          className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-3 py-1.5 text-base font-black text-amber-400 focus:outline-none focus:border-amber-400"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-400 block mb-1">عدد الأفراد (الخدام):</label>
                      <input
                        type="number"
                        min="1"
                        value={currentMembers}
                        onChange={(e) => handleFieldChange(plan.id, 'max_members', e.target.value)}
                        className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-3 py-1.5 text-base font-black text-purple-300 focus:outline-none focus:border-purple-400"
                      />
                    </div>
                  </div>

                  {/* Price per Servant Breakdown Tag */}
                  <div className="p-2.5 rounded-xl bg-purple-950/40 border border-purple-800/30 text-[11px] text-purple-200 mb-3 flex items-center justify-between">
                    <span>التكلفة للفرد:</span>
                    <strong className="text-amber-300 font-extrabold">{perPerson} ج.م / سنة</strong>
                  </div>

                  {/* Badge Text */}
                  <div className="mb-3">
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">شارة الباقة (Badge):</label>
                    <input
                      type="text"
                      value={String(getPlanField(plan, 'badge') || '')}
                      onChange={(e) => handleFieldChange(plan.id, 'badge', e.target.value)}
                      placeholder="مثال: الأكثر طلباً للخدمة 👥"
                      className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                {/* Save Button */}
                <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                  <div className="text-[10px] text-slate-500 font-mono">
                    ID: {plan.id}
                  </div>

                  <button
                    type="button"
                    disabled={!hasEdits || isSaving}
                    onClick={() => handleSavePlan(plan)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                      hasEdits
                        ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    {isSaving ? (
                      <span>جارٍ الحفظ...</span>
                    ) : (
                      <>
                        <Save className="w-3.5 h-3.5" />
                        <span>حفظ التعديل</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* SECTION 2: كرمتي بلس (الباقات الفردية) */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                باقات كرمتي بلس (الاشتراك الفردي)
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-purple-500/20 text-purple-300 font-bold">
                  فردي (بدون إعلانات)
                </span>
              </h4>
              <p className="text-xs text-slate-400">
                اشتراك المستخدم المفرد لإزالة إعلانات AdMob نهائياً والحصول على الشارة الذهبية.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {individualPlans.map(plan => {
            const hasEdits = !!editingPlans[plan.id];
            const currentPrice = Number(getPlanField(plan, 'price'));
            const isSaving = savingId === plan.id;

            return (
              <div 
                key={plan.id}
                className={`bg-slate-900/80 border rounded-2xl p-5 flex flex-col justify-between transition-all backdrop-blur-sm ${
                  plan.is_active 
                    ? hasEdits ? 'border-purple-400/80 shadow-lg shadow-purple-500/10' : 'border-slate-800 hover:border-purple-500/40' 
                    : 'border-slate-800 opacity-60'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30">
                      {plan.badge || (plan.period === 'monthly' ? 'شهري' : 'سنوي ⭐')}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleToggleActive(plan)}
                      className={`text-xs px-2.5 py-1 rounded-lg font-bold transition-colors ${
                        plan.is_active 
                          ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30' 
                          : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                      }`}
                    >
                      {plan.is_active ? 'نشطة بالتطبيق' : 'معطلة'}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-400 block mb-1">اسم الباقة:</label>
                      <input
                        type="text"
                        value={String(getPlanField(plan, 'name'))}
                        onChange={(e) => handleFieldChange(plan.id, 'name', e.target.value)}
                        className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-3 py-1.5 text-sm font-bold text-white focus:outline-none focus:border-purple-400"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-400 block mb-1">السعر (ج.م):</label>
                      <input
                        type="number"
                        value={currentPrice}
                        onChange={(e) => handleFieldChange(plan.id, 'price', e.target.value)}
                        className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-3 py-1.5 text-base font-black text-amber-400 focus:outline-none focus:border-purple-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">شارة الباقة (Badge):</label>
                    <input
                      type="text"
                      value={String(getPlanField(plan, 'badge') || '')}
                      onChange={(e) => handleFieldChange(plan.id, 'badge', e.target.value)}
                      placeholder="مثال: أفضل قيمة ⭐"
                      className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-purple-400"
                    />
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                  <div className="text-[10px] text-slate-500 font-mono">
                    ID: {plan.id} ({plan.period === 'monthly' ? 'شهرية' : 'سنوية'})
                  </div>

                  <button
                    type="button"
                    disabled={!hasEdits || isSaving}
                    onClick={() => handleSavePlan(plan)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                      hasEdits
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-md shadow-purple-500/20'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    {isSaving ? <span>جارٍ الحفظ...</span> : <><Save className="w-3.5 h-3.5" /><span>حفظ التعديل</span></>}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* Add New Plan Modal */}
      {/* ───────────────────────────────────────────────────────────── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-amber-500/40 rounded-3xl p-6 w-full max-w-md shadow-2xl relative">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute left-5 top-5 text-slate-400 hover:text-white"
            >
              ✕
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                <Plus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">إضافة باقة اشتراك جديدة</h3>
                <p className="text-xs text-slate-400">ستظهر مباشرة في قائمة باقات التطبيق</p>
              </div>
            </div>

            <form onSubmit={handleCreateNewPlan} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">نوع الباقة:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewPlan({ ...newPlan, category: 'team' })}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border ${
                      newPlan.category === 'team'
                        ? 'bg-amber-500 border-amber-400 text-slate-950'
                        : 'bg-slate-800 border-slate-700 text-slate-300'
                    }`}
                  >
                    كرمتي بريميوم (جماعي)
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewPlan({ ...newPlan, category: 'individual', max_members: 1 })}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border ${
                      newPlan.category === 'individual'
                        ? 'bg-purple-600 border-purple-400 text-white'
                        : 'bg-slate-800 border-slate-700 text-slate-300'
                    }`}
                  >
                    كرمتي بلس (فردي)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">معرف الباقة (ID فريد بالإنجليزية):</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: premium_50"
                  value={newPlan.id || ''}
                  onChange={(e) => setNewPlan({ ...newPlan, id: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">اسم الباقة بالعربية:</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: كرمتي بريميوم (باقة 50 فرد)"
                  value={newPlan.name || ''}
                  onChange={(e) => setNewPlan({ ...newPlan, name: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">السعر (ج.م):</label>
                  <input
                    type="number"
                    required
                    value={newPlan.price || ''}
                    onChange={(e) => setNewPlan({ ...newPlan, price: Number(e.target.value) })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">الحد الأقصى للأفراد:</label>
                  <input
                    type="number"
                    required
                    min="1"
                    disabled={newPlan.category === 'individual'}
                    value={newPlan.max_members || 1}
                    onChange={(e) => setNewPlan({ ...newPlan, max_members: Number(e.target.value) })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white disabled:opacity-50 focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">شارة الباقة (Badge):</label>
                <input
                  type="text"
                  placeholder="مثال: باقة خاصة 🌟"
                  value={newPlan.badge || ''}
                  onChange={(e) => setNewPlan({ ...newPlan, badge: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-medium"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingNew}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 disabled:opacity-50"
                >
                  {isSubmittingNew ? 'جارٍ الإنشاء...' : 'إنشاء الباقة فوراً'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
