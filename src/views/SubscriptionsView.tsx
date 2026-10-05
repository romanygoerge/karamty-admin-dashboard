import React, { useState, useEffect, useMemo } from 'react';
import { 
  Crown, 
  Heart, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Eye, 
  Search, 
  Filter, 
  ShieldCheck, 
  ExternalLink,
  Sparkles,
  Calendar,
  AlertCircle,
  Copy,
  Check,
  Edit3,
  Trash2
} from 'lucide-react';
import { supabase, SUPABASE_URL } from '../lib/supabase';
import { PaymentRequest } from '../types';

interface SubscriptionsViewProps {
  onUpdatePendingCount?: (count: number) => void;
}

export const SubscriptionsView: React.FC<SubscriptionsViewProps> = ({ onUpdatePendingCount }) => {
  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'subscriptions' | 'donations' | 'all'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReceiptUrl, setSelectedReceiptUrl] = useState<string | null>(null);
  
  // Activation Modal State
  const [activationTarget, setActivationTarget] = useState<PaymentRequest | null>(null);
  const [selectedMonths, setSelectedMonths] = useState<number>(1);
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('monthly');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [adminNotes, setAdminNotes] = useState('');
  const [isSubmittingActivation, setIsSubmittingActivation] = useState(false);
  const [copiedNumber, setCopiedNumber] = useState(false);

  // Fetch Requests from Edge Function / Database
  const fetchRequests = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`${SUPABASE_URL}/functions/v1/handle-payment-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_requests' }),
      });

      const data = await res.json();
      if (data.success && Array.isArray(data.requests)) {
        setRequests(data.requests);
        const pendingCount = data.requests.filter((r: PaymentRequest) => r.status === 'pending').length;
        onUpdatePendingCount?.(pendingCount);
      }
    } catch (err) {
      console.error('Error fetching payment requests:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();

    // Setup Supabase Realtime Listener for instant payment receipts & notifications
    const channel = supabase
      .channel('dashboard-payment-requests')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'service_budget_items' }, () => {
        fetchRequests();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload: any) => {
        if (payload?.new?.type === 'payment_request') {
          fetchRequests();
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Filtered requests
  const filteredRequests = useMemo(() => {
    return requests.filter(req => {
      // Tab filter
      if (activeTab === 'pending' && req.status !== 'pending') return false;
      if (activeTab === 'subscriptions' && (req.type !== 'subscription' || req.status === 'pending')) return false;
      if (activeTab === 'donations' && req.type !== 'donation') return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = req.user_name?.toLowerCase().includes(q);
        const phoneMatch = req.user_phone?.toLowerCase().includes(q);
        const notesMatch = req.notes?.toLowerCase().includes(q);
        if (!nameMatch && !phoneMatch && !notesMatch) return false;
      }

      return true;
    });
  }, [requests, activeTab, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const pending = requests.filter(r => r.status === 'pending');
    const approvedSubs = requests.filter(r => r.type === 'subscription' && r.status === 'approved');
    const donations = requests.filter(r => r.type === 'donation');

    const totalDonationAmount = donations.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    const totalSubAmount = approvedSubs.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

    return {
      pendingCount: pending.length,
      approvedSubsCount: approvedSubs.length,
      donationsCount: donations.length,
      totalDonationAmount,
      totalSubAmount,
      grandTotal: totalDonationAmount + totalSubAmount,
    };
  }, [requests]);

  // Handle Activation
  const handleConfirmActivation = async () => {
    if (!activationTarget) return;

    try {
      setIsSubmittingActivation(true);

      const res = await fetch(`${SUPABASE_URL}/functions/v1/handle-payment-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'activate_subscription',
          request_id: activationTarget.id,
          user_id: activationTarget.user_id,
          plan: selectedPlan,
          months: selectedMonths,
          status: 'approved',
          admin_notes: adminNotes,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setActivationTarget(null);
        setAdminNotes('');
        await fetchRequests();
      } else {
        alert(data.error || 'حدث خطأ أثناء تفعيل الاشتراك');
      }
    } catch (err: any) {
      alert(`خطأ: ${err.message}`);
    } finally {
      setIsSubmittingActivation(false);
    }
  };

  // Handle Reject
  const handleRejectRequest = async (req: PaymentRequest) => {
    const reason = prompt('يرجى كتابة سبب رفض الطلب (اختياري):', 'عدم وضوح الإيصال أو لم يتم التحقق من العملية');
    if (reason === null) return;

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/handle-payment-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'activate_subscription',
          request_id: req.id,
          user_id: req.user_id,
          status: 'rejected',
          admin_notes: reason,
        }),
      });

      const data = await res.json();
      if (data.success) {
        await fetchRequests();
      }
    } catch (err: any) {
      alert(`خطأ: ${err.message}`);
    }
  };

  // Handle Cancel / Delete Subscription
  const handleCancelSubscription = async (req: PaymentRequest) => {
    if (!window.confirm(`هل أنت متأكد من رغبتك في إلغاء وحذف اشتراك المستخدم (${req.user_name}) وإعادة إظهار الإعلانات له في التطبيق فوراً؟`)) {
      return;
    }

    try {
      setIsSubmittingActivation(true);
      const res = await fetch(`${SUPABASE_URL}/functions/v1/handle-payment-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'cancel_subscription',
          request_id: req.id,
          user_id: req.user_id,
          status: 'cancelled',
          admin_notes: 'تم إلغاء وحذف الاشتراك من لوحة التحكم',
        }),
      });

      const data = await res.json();
      if (data.success) {
        setActivationTarget(null);
        await fetchRequests();
      } else {
        alert(data.error || 'حدث خطأ أثناء إلغاء الاشتراك');
      }
    } catch (err: any) {
      alert(`خطأ: ${err.message}`);
    } finally {
      setIsSubmittingActivation(false);
    }
  };

  const copyNumber = () => {
    navigator.clipboard.writeText('01204062941');
    setCopiedNumber(true);
    setTimeout(() => setCopiedNumber(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* ═══════════════════════════════════════════════════════════ */}
      {/* 1. Header Banner & InstaPay info bar */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div className="bg-gradient-to-r from-purple-950/80 via-slate-900 to-indigo-950/80 border border-purple-800/40 rounded-2xl p-6 shadow-xl backdrop-blur-md">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center shadow-lg shadow-amber-500/20 text-slate-950 font-bold">
              <Crown className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white">إدارة الاشتراكات والتبرعات (كرمتي بلس)</h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  تحكم كامل وآمن
                </span>
              </div>
              <p className="text-sm text-slate-300 mt-1">
                مراجعة تحويلات إنستاباي وتفعيل باقات المشتركين لإزالة إعلانات AdMob نهائياً من التطبيق.
              </p>
            </div>
          </div>

          {/* Official InstaPay Number Pill */}
          <div className="bg-slate-900/90 border border-purple-500/30 rounded-xl px-4 py-3 flex items-center gap-3">
            <div>
              <div className="text-[11px] text-slate-400">رقم إنستاباي المعتمد للتحويلات:</div>
              <div className="text-lg font-black text-amber-400 tracking-wider">01204062941</div>
            </div>
            <button
              onClick={copyNumber}
              className="p-2 rounded-lg bg-purple-900/40 hover:bg-purple-800/60 text-purple-200 transition-colors"
              title="نسخ رقم إنستاباي"
            >
              {copiedNumber ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* 2. Top Summary KPI Cards */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pending Requests */}
        <div className="bg-slate-900/70 border border-amber-500/30 rounded-2xl p-5 relative overflow-hidden backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-400">طلبات قيد المراجعة</span>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-amber-400">{stats.pendingCount}</span>
            <span className="text-xs text-slate-400">طلب بانتظار التأكيد</span>
          </div>
          {stats.pendingCount > 0 && (
            <div className="mt-2 text-xs text-amber-300/80 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
              يرجى فحص إيصالات التحويل أدناه
            </div>
          )}
        </div>

        {/* Active Subscriptions */}
        <div className="bg-slate-900/70 border border-purple-500/30 rounded-2xl p-5 relative overflow-hidden backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-400">الاشتراكات المفعلة</span>
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <Crown className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-purple-300">{stats.approvedSubsCount}</span>
            <span className="text-xs text-slate-400">عضو كرمتي بلس (معفى من الإعلانات)</span>
          </div>
          <div className="mt-2 text-xs text-slate-400">
            إجمالي الاشتراكات: <span className="text-purple-300 font-bold">{stats.totalSubAmount.toLocaleString()} ج.م</span>
          </div>
        </div>

        {/* Donations */}
        <div className="bg-slate-900/70 border border-emerald-500/30 rounded-2xl p-5 relative overflow-hidden backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-400">إجمالي التبرعات والدعم</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Heart className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-emerald-400">{stats.totalDonationAmount.toLocaleString()}</span>
            <span className="text-xs text-slate-400">جنية مصري ({stats.donationsCount} مساهمة)</span>
          </div>
          <div className="mt-2 text-xs text-slate-400">
            مساهمة طوعية لدعم السيرفرات واستمرار الخدمة
          </div>
        </div>

        {/* Grand Total Revenue */}
        <div className="bg-slate-900/70 border border-blue-500/30 rounded-2xl p-5 relative overflow-hidden backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-400">إجمالي الإيرادات المسجلة</span>
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-blue-400">{stats.grandTotal.toLocaleString()}</span>
            <span className="text-xs text-slate-400">ج.م عبر InstaPay</span>
          </div>
          <div className="mt-2 text-xs text-slate-400">
            متزامنة لحظياً مع ميزانية الكنيسة
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* 3. Filters, Tabs & Search */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Navigation Tabs */}
        <div className="flex bg-slate-900/80 p-1.5 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              activeTab === 'pending'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Clock className="w-4 h-4" />
            قيد المراجعة
            {stats.pendingCount > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-xs font-black ${
                activeTab === 'pending' ? 'bg-slate-950 text-amber-400' : 'bg-amber-500/20 text-amber-300'
              }`}>
                {stats.pendingCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('subscriptions')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              activeTab === 'subscriptions'
                ? 'bg-purple-600 text-white font-bold shadow-md shadow-purple-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Crown className="w-4 h-4" />
            الاشتراكات المعتمدة
          </button>

          <button
            onClick={() => setActiveTab('donations')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              activeTab === 'donations'
                ? 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Heart className="w-4 h-4" />
            سجل التبرعات
          </button>

          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'all'
                ? 'bg-slate-700 text-white font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            الكل ({requests.length})
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث بالاسم، الهاتف أو الملاحظات..."
            className="w-full bg-slate-900/90 border border-slate-800 rounded-xl pr-10 pl-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500"
          />
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* 4. Requests Table / Cards */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400">
            <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            جاري تحميل سجل الاشتراكات والتحويلات...
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <AlertCircle className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="text-base font-medium">لا توجد طلبات مطابقة في هذا القسم حالياً</p>
            <p className="text-xs text-slate-500 mt-1">أي تحويل جديد من تطبيق الهاتف سيظهر هنا فوراً في الوقت الحقيقي</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead>
                <tr className="bg-slate-800/50 border-b border-slate-800 text-xs font-semibold text-slate-400">
                  <th className="p-4">المستخدم</th>
                  <th className="p-4">النوع والباقة</th>
                  <th className="p-4">المبلغ</th>
                  <th className="p-4">إيصال التحويل</th>
                  <th className="p-4">التاريخ والملاحظات</th>
                  <th className="p-4">الحالة</th>
                  <th className="p-4 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-sm">
                {filteredRequests.map((req) => {
                  const isSub = req.type === 'subscription';
                  const isPending = req.status === 'pending';
                  const isApproved = req.status === 'approved';

                  return (
                    <tr key={req.id} className="hover:bg-slate-800/30 transition-colors">
                      {/* User Info */}
                      <td className="p-4">
                        <div className="font-bold text-white">{req.user_name}</div>
                        <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                          {req.user_phone && <span>{req.user_phone}</span>}
                          {req.sender_wallet_or_phone && (
                            <span className="text-purple-400">من: {req.sender_wallet_or_phone}</span>
                          )}
                        </div>
                      </td>

                      {/* Type & Plan */}
                      <td className="p-4">
                        <div className="flex items-center gap-1.5">
                          {isSub ? (
                            <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                              <Crown className="w-3.5 h-3.5 text-amber-400" />
                              اشتراك {req.plan === 'yearly' ? 'سنوي' : 'شهري'}
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                              <Heart className="w-3.5 h-3.5 text-emerald-400" />
                              تبرع ودعم
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Amount */}
                      <td className="p-4">
                        <div className="font-extrabold text-base text-amber-400">
                          {Number(req.amount).toLocaleString()} <span className="text-xs font-normal text-slate-400">ج.م</span>
                        </div>
                      </td>

                      {/* Receipt */}
                      <td className="p-4">
                        {req.receipt_url ? (
                          <button
                            onClick={() => setSelectedReceiptUrl(req.receipt_url!)}
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-purple-300 text-xs font-medium border border-purple-500/30 transition-all hover:scale-105"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            معاينة الإيصال
                          </button>
                        ) : (
                          <span className="text-xs text-slate-500">لا يوجد إيصال مرفق</span>
                        )}
                      </td>

                      {/* Date & Notes */}
                      <td className="p-4 max-w-xs">
                        <div className="text-xs text-slate-400">
                          {new Date(req.created_at).toLocaleDateString('ar-EG', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                        {req.notes && (
                          <div className="text-xs text-slate-300 mt-1 truncate" title={req.notes}>
                            {req.notes}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="p-4">
                        {isPending && (
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1 w-fit">
                            <Clock className="w-3 h-3 animate-spin" />
                            قيد المراجعة
                          </span>
                        )}
                        {isApproved && (
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1 w-fit">
                            <CheckCircle2 className="w-3 h-3" />
                            معتمد ومفعل
                          </span>
                        )}
                        {req.status === 'rejected' && (
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1 w-fit">
                            <XCircle className="w-3 h-3" />
                            مرفوض
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="p-4 text-center">
                        {isPending ? (
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => {
                                setActivationTarget(req);
                                setSelectedPlan(req.plan === 'yearly' ? 'yearly' : 'monthly');
                                setSelectedMonths(req.plan === 'yearly' ? 12 : 1);
                              }}
                              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md shadow-emerald-500/20 flex items-center gap-1 transition-all"
                            >
                              <ShieldCheck className="w-3.5 h-3.5" />
                              تفعيل وتأكيد
                            </button>
                            <button
                              onClick={() => handleRejectRequest(req)}
                              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-950/40 text-rose-400 hover:text-rose-300 font-medium text-xs border border-rose-500/20 transition-colors"
                              title="رفض الطلب"
                            >
                              رفض
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500">
                            {isSub && (
                              <>
                                <button
                                  onClick={() => {
                                    setActivationTarget(req);
                                    setSelectedPlan(req.plan === 'yearly' ? 'yearly' : 'monthly');
                                    setSelectedMonths(req.plan === 'yearly' ? 12 : 1);
                                  }}
                                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-purple-900/40 text-purple-300 hover:text-purple-200 border border-purple-500/30 flex items-center gap-1 transition-all"
                                  title="تعديل باقة أو مدة الاشتراك"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                  <span>تعديل</span>
                                </button>
                                <button
                                  onClick={() => handleCancelSubscription(req)}
                                  className="px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/30 flex items-center gap-1 transition-all"
                                  title="إلغاء وحذف الاشتراك وإعادة تفعيل الإعلانات"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>إلغاء / حذف</span>
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* 5. Activation Modal (Duration Picker) */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {activationTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-purple-500/40 rounded-3xl p-6 w-full max-w-lg shadow-2xl relative">
            <button
              onClick={() => setActivationTarget(null)}
              className="absolute left-5 top-5 text-slate-400 hover:text-white"
            >
              ✕
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-amber-500 flex items-center justify-center text-white font-bold">
                <Crown className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">تفعيل اشتراك كرمتي بلس (إزالة الإعلانات)</h3>
                <p className="text-xs text-slate-400">للمستخدم: <span className="text-amber-300 font-bold">{activationTarget.user_name}</span></p>
              </div>
            </div>

            <div className="space-y-4 my-5">
              {/* Plan Choice */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">نوع الباقة:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPlan('monthly');
                      setSelectedMonths(1);
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                      selectedPlan === 'monthly'
                        ? 'bg-purple-600 border-purple-400 text-white'
                        : 'bg-slate-800/80 border-slate-700 text-slate-300'
                    }`}
                  >
                    باقة شهرية (99 ج.م)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPlan('yearly');
                      setSelectedMonths(12);
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                      selectedPlan === 'yearly'
                        ? 'bg-purple-600 border-purple-400 text-white'
                        : 'bg-slate-800/80 border-slate-700 text-slate-300'
                    }`}
                  >
                    باقة سنوية (599 ج.م) ⭐
                  </button>
                </div>
              </div>

              {/* Duration Options */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">مدة التفعيل الممنوحة:</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'شهر واحد', months: 1 },
                    { label: 'شهرين', months: 2 },
                    { label: '3 أشهر', months: 3 },
                    { label: '6 أشهر', months: 6 },
                    { label: 'سنة كاملة', months: 12 },
                    { label: 'مدى الحياة 👑', months: 0 },
                  ].map((opt) => (
                    <button
                      key={opt.months}
                      type="button"
                      onClick={() => setSelectedMonths(opt.months)}
                      className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-all ${
                        selectedMonths === opt.months
                          ? 'bg-amber-500 border-amber-400 text-slate-950 shadow-md'
                          : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:border-slate-600'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Admin Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">ملاحظات الإدارة (اختياري):</label>
                <input
                  type="text"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="مثال: تم التأكد من إيصال InstaPay بنجاح..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Notice */}
              <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-800/40 text-xs text-purple-200">
                ✨ بمجرد الضغط على تأكيد، يتم تحديث قاعدة البيانات وسيرفر Supabase وتختفي إعلانات AdMob فوراً من تطبيق المستخدم.
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 mt-6">
              {activationTarget.status === 'approved' ? (
                <button
                  type="button"
                  disabled={isSubmittingActivation}
                  onClick={() => handleCancelSubscription(activationTarget)}
                  className="px-4 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>إلغاء وحذف الاشتراك</span>
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActivationTarget(null)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-medium"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  disabled={isSubmittingActivation}
                  onClick={handleConfirmActivation}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-500/20 disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmittingActivation
                    ? 'جارٍ الحفظ...'
                    : activationTarget.status === 'approved'
                    ? 'حفظ تعديل الاشتراك'
                    : 'تأكيد وتفعيل الاشتراك الآن'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* 6. Receipt Lightbox Modal */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {selectedReceiptUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 max-w-xl w-full max-h-[90vh] flex flex-col relative shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
              <div className="font-bold text-white flex items-center gap-2">
                <Eye className="w-4 h-4 text-purple-400" />
                معاينة إيصال تحويل InstaPay
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={selectedReceiptUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                  title="فتح في نافذة جديدة"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
                <button
                  onClick={() => setSelectedReceiptUrl(null)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900 text-slate-300 hover:text-rose-200"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto rounded-xl bg-slate-950 flex items-center justify-center p-2">
              <img
                src={selectedReceiptUrl}
                alt="Receipt"
                className="max-h-[70vh] object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
