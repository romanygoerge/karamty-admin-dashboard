import React, { useState, useEffect } from 'react';
import { 
  Smartphone, 
  DownloadCloud, 
  Users, 
  TrendingUp, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink, 
  RefreshCw, 
  Key, 
  BarChart3, 
  Sparkles,
  Layers,
  Radio
} from 'lucide-react';
import { Profile } from '../types';
import { supabase } from '../lib/supabase';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';

interface AppInstallsViewProps {
  profiles: Profile[];
  initialStoreInstalls?: number;
  onStoreInstallsUpdated?: (val: number) => void;
}

export const AppInstallsView: React.FC<AppInstallsViewProps> = ({ 
  profiles,
  initialStoreInstalls = 0,
  onStoreInstallsUpdated
}) => {
  // Saved settings in localStorage for persistent admin preference
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('karamty_onesignal_key') || '');
  const [storeBaseline, setStoreBaseline] = useState<number>(initialStoreInstalls);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Live OneSignal metrics
  const [liveDevices, setLiveDevices] = useState<number | null>(null);
  const [messageableDevices, setMessageableDevices] = useState<number | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(() => localStorage.getItem('karamty_installs_last_sync'));

  // Custom baseline edit modal/form
  const [isEditingBaseline, setIsEditingBaseline] = useState(false);
  const [tempBaseline, setTempBaseline] = useState(storeBaseline.toString());

  // Live Guest Activity Logs from Supabase
  const [guestLogs, setGuestLogs] = useState<any[]>([]);

  const fetchGuestLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('guest_activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(25);
      if (!error && data) {
        setGuestLogs(data);
      }
    } catch (_) {}
  };

  const fetchLiveInstalls = async (keyToUse?: string) => {
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const activeKey = keyToUse !== undefined ? keyToUse : apiKey;

    try {
      const res = await fetch('/api/app-installs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: activeKey.trim() || undefined })
      });

      const data = await res.json();

      if (data.success && typeof data.totalDevices === 'number') {
        setLiveDevices(data.totalDevices);
        setMessageableDevices(data.messageableDevices);
        const nowStr = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
        setLastSyncTime(nowStr);
        localStorage.setItem('karamty_installs_last_sync', nowStr);
        setSuccessMsg(`تم جلب الإحصائيات الحية بنجاح: ${data.totalDevices} جهاز نشط مسجل.`);
      } else if (data.warning === 'ONESIGNAL_REST_API_KEY_MISSING') {
        // Fallback gracefully without breaking UI
        setErrorMsg('لجلب أحدث رقم لحظي من OneSignal مباشرة، أدخل الـ REST API Key الخاص بحسابك في الحقل أدناه.');
      } else {
        setErrorMsg(data.message || data.details || 'تعذر الاتصال بـ OneSignal API. تأكد من صحة المفتاح.');
      }
    } catch (err: any) {
      console.error('Failed to fetch app installs:', err);
      setErrorMsg('تعذر الوصول لنقطة الـ API السحابية حالياً.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (initialStoreInstalls > 0) {
      setStoreBaseline(initialStoreInstalls);
      setTempBaseline(initialStoreInstalls.toString());
    } else {
      supabase.from('app_campaigns')
        .select('*')
        .eq('title', 'google_play_installs')
        .maybeSingle()
        .then(({ data }) => {
          if (data && typeof data.views_count === 'number' && data.views_count > 0) {
            setStoreBaseline(data.views_count);
            setTempBaseline(data.views_count.toString());
            if (onStoreInstallsUpdated) onStoreInstallsUpdated(data.views_count);
          }
        });
    }

    if (apiKey) {
      fetchLiveInstalls(apiKey);
    }

    fetchGuestLogs();

    const channel = supabase
      .channel('karamty-guest-logs-live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'guest_activity_logs' }, (payload) => {
        if (payload.new) {
          setGuestLogs(prev => [payload.new, ...prev.slice(0, 24)]);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [initialStoreInstalls]);

  const handleSaveApiKey = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('karamty_onesignal_key', apiKey.trim());
    fetchLiveInstalls(apiKey.trim());
  };

  const handleSaveBaseline = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(tempBaseline, 10);
    if (!isNaN(val) && val >= 0) {
      setStoreBaseline(val);
      localStorage.setItem('karamty_store_baseline_installs', val.toString());
      if (onStoreInstallsUpdated) onStoreInstallsUpdated(val);
      try {
        await supabase.from('app_campaigns').upsert({
          id: '00000000-0000-0000-0000-000000000001',
          title: 'google_play_installs',
          views_count: val,
          is_active: true,
          updated_at: new Date().toISOString()
        });
      } catch (err) {
        console.error('Failed to sync to supabase:', err);
      }
      setIsEditingBaseline(false);
      setSuccessMsg(`تم تثبيت ومزامنة إجمالي التنزيلات سحابياً: ${val} هاتف.`);
    }
  };

  // Calculations
  const registeredCount = profiles.length;
  // Effective total installs: live count from OneSignal if available, else storeBaseline, else registeredCount
  const effectiveTotalInstalls = liveDevices !== null 
    ? liveDevices 
    : (storeBaseline > 0 ? storeBaseline : registeredCount);
  const unregisteredGuests = Math.max(0, effectiveTotalInstalls - registeredCount);
  const conversionRate = effectiveTotalInstalls > 0 ? ((registeredCount / effectiveTotalInstalls) * 100).toFixed(1) : '0';

  // Chart data
  const funnelData = [
    { stage: 'تنزيل وتثبيت التطبيق', count: effectiveTotalInstalls, fill: '#0e87eb' },
    { stage: 'فتح التطبيق والتصفح (أجهزة نشطة)', count: Math.round(effectiveTotalInstalls * 0.95), fill: '#38a4f8' },
    { stage: 'زوار يتصفحون بدون حساب', count: unregisteredGuests, fill: '#f59e0b' },
    { stage: 'حسابات مكتملة ومسجلة', count: registeredCount, fill: '#10b981' },
  ];

  const distributionData = [
    { name: 'مستخدمون مسجلون بحسابات', value: registeredCount, color: '#10b981' },
    { name: 'تثبيتات وزوار بدون تسجيل دخول', value: unregisteredGuests, color: '#f59e0b' },
  ];

  return (
    <div className="space-y-6 animate-fadeIn pb-10">
      {/* Top Banner & Quick Controls */}
      <div className="bg-gradient-to-r from-slate-900 via-brand-950 to-slate-900 border border-brand-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="px-3 py-1 rounded-full bg-brand-500/20 text-brand-300 text-xs font-semibold flex items-center gap-1.5 border border-brand-500/30">
                <Radio className="w-3.5 h-3.5 text-brand-400 animate-pulse" />
                تتبع التحميلات في الوقت الفعلي
              </span>
              {lastSyncTime && (
                <span className="text-xs text-slate-400">
                  آخر تحديث: {lastSyncTime}
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Smartphone className="w-7 h-7 text-brand-400" />
              متابعة تثبيتات وتحميلات التطبيق
            </h1>
            <p className="text-slate-300 text-sm mt-1 max-w-2xl leading-relaxed">
              تتبع عدد الهواتف التي حمّلت وفتحت تطبيق كرامتي من متجر Google Play، ومقارنة التثبيتات بالحسابات المسجلة لمعرفة حجم الزوار الذين يستخدمون التطبيق بدون تسجيل دخول.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => fetchLiveInstalls()}
              disabled={isLoading}
              className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-medium text-sm flex items-center gap-2 shadow-lg shadow-brand-600/30 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              {isLoading ? 'جاري الفحص...' : 'تحديث الأرقام الآن'}
            </button>

            <a
              href="https://play.google.com/console"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium text-sm flex items-center gap-2 transition-all"
            >
              <ExternalLink className="w-4 h-4 text-emerald-400" />
              Google Play Console
            </a>

            <a
              href="https://business.facebook.com/events_manager2"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium text-sm flex items-center gap-2 transition-all"
            >
              <ExternalLink className="w-4 h-4 text-blue-400" />
              Meta Events Manager
            </a>
          </div>
        </div>

        {/* Status Messages */}
        {errorMsg && (
          <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}
      </div>

      {/* Notice & Quick Input when Baseline is not set */}
      {storeBaseline === 0 && liveDevices === null && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs text-amber-300">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-amber-400" />
            <span>
              <strong>تنبيه الدقة:</strong> الرقم المعروض حالياً ({registeredCount}) يمثل فقط من أنشأ حساباً داخل التطبيق. لمعرفة إجمالي كل من نزّل التطبيق بدون تسجيل دخول، أدخل رقم Google Play Console أو اربط OneSignal أدناه.
            </span>
          </div>
          <button
            onClick={() => setIsEditingBaseline(true)}
            className="px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold whitespace-nowrap hover:bg-amber-400 transition-colors"
          >
            إدخال رقم Google Play الآن
          </button>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Total Installs */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg relative group hover:border-brand-500/50 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">إجمالي التثبيتات والأجهزة</span>
            <div className="w-10 h-10 rounded-xl bg-brand-500/10 text-brand-400 flex items-center justify-center">
              <DownloadCloud className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white tracking-tight">{effectiveTotalInstalls}</span>
            <span className="text-xs text-brand-400 font-medium">جهاز</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
            <span>
              {liveDevices !== null 
                ? 'موثق لحظياً من OneSignal'
                : storeBaseline > 0 
                  ? 'موثق من Google Play Console'
                  : 'يمثل الحسابات المسجلة'}
            </span>
            <button 
              onClick={() => setIsEditingBaseline(true)}
              className="text-brand-400 hover:underline text-[11px] font-bold"
            >
              تعديل الرقم
            </button>
          </div>
        </div>

        {/* Card 2: Registered Profiles */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg hover:border-emerald-500/50 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">المستخدمون المسجلون</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-emerald-400 tracking-tight">{registeredCount}</span>
            <span className="text-xs text-slate-400 font-medium">حساب مسجل</span>
          </div>
          <p className="mt-2 text-xs text-slate-400">
            أنشأوا حساباً كاملاً بقاعدة البيانات
          </p>
        </div>

        {/* Card 3: Unregistered Guest Users */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg hover:border-amber-500/50 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">زوار بدون تسجيل دخول</span>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Smartphone className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-amber-400 tracking-tight">{unregisteredGuests}</span>
            <span className="text-xs text-slate-400 font-medium">هاتف كزائر</span>
          </div>
          <p className="mt-2 text-xs text-slate-400">
            حمّلوا التطبيق ويتصفحون بدون إنشاء حساب
          </p>
        </div>

        {/* Card 4: Conversion Rate */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg hover:border-purple-500/50 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">معدل التحويل للتسجيل</span>
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-purple-400 tracking-tight">{conversionRate}%</span>
            <span className="text-xs text-slate-400 font-medium">نسبة التحويل</span>
          </div>
          <p className="mt-2 text-xs text-slate-400">
            نسبة من قام بإنشاء حساب بعد التحميل
          </p>
        </div>
      </div>

      {/* Baseline Edit Modal */}
      {isEditingBaseline && (
        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 shadow-2xl animate-fadeIn">
          <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
            <DownloadCloud className="w-4 h-4 text-brand-400" />
            تعديل رقم تنزيلات متجر Google Play المرجعي
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            يمكنك إدخال إجمالي التحميلات المسجلة في Google Play Console ليكون هو الحد الأدنى المعتمد في كل الحسابات.
          </p>
          <form onSubmit={handleSaveBaseline} className="flex flex-wrap items-center gap-2 sm:gap-3">
            <input
              type="number"
              value={tempBaseline}
              onChange={(e) => setTempBaseline(e.target.value)}
              className="px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-brand-500 w-full sm:w-44"
              placeholder="مثال: 50"
              min="0"
            />
            <button
              type="submit"
              className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-medium transition-colors"
            >
              حفظ وتطبيق
            </button>
            <button
              type="button"
              onClick={() => setIsEditingBaseline(false)}
              className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
            >
              إلغاء
            </button>
          </form>
        </div>
      )}

      {/* Charts & Visual Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Funnel Bar Chart */}
        <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-brand-400" />
                مسار التثبيت والتحويل (Installation Funnel)
              </h2>
              <p className="text-xs text-slate-400 mt-1">تتبع رحلة المستخدم من التنزيل إلى تصفح التطبيق وإنشاء الحساب</p>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnelData} layout="vertical" margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                <XAxis type="number" stroke="#64748b" tick={{ fontSize: 12 }} />
                <YAxis dataKey="stage" type="category" stroke="#94a3b8" tick={{ fontSize: 11 }} width={160} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff' }}
                  formatter={(val: any) => [`${val} مستخدم / هاتف`, 'العدد']}
                />
                <Bar dataKey="count" radius={[0, 8, 8, 0]}>
                  {funnelData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Distribution Donut Chart */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-brand-400" />
              توزيع نوع التثبيتات
            </h2>
            <p className="text-xs text-slate-400 mt-1">نسبة الحسابات المسجلة مقارنة بالزوار</p>
          </div>
          <div className="h-48 my-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={distributionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {distributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2 text-xs">
            {distributionData.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-slate-800/40">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-slate-300">{item.name}</span>
                </div>
                <span className="font-bold text-white">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* OneSignal Live Integration Settings Card */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-800">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Key className="w-5 h-5 text-amber-400" />
              ربط OneSignal المباشر لجلب الأجهزة تلقائياً
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              التطبيق مثبت فيه OneSignal افتراضياً، بمجرد وضع الـ REST API Key ستُجلب أرقام الأجهزة لحظة بلحظة.
            </p>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs font-mono text-slate-300 flex items-center gap-2">
            <span className="text-slate-400">App ID:</span>
            <span>dfe3a3e8-db66-47e0-bdac-bf09a49b0bb4</span>
          </div>
        </div>

        <form onSubmit={handleSaveApiKey} className="mt-5 flex flex-col md:flex-row items-center gap-3">
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="أدخل OneSignal REST API Key هنا (اختياري للحفظ التلقائي في المتصفح)"
            className="flex-1 w-full px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-sm focus:outline-none focus:border-brand-500 placeholder-slate-500 font-mono"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="w-full md:w-auto px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-medium text-xs transition-colors shadow-lg shadow-amber-600/20 whitespace-nowrap"
          >
            حفظ ومزامنة فورية
          </button>
        </form>

        {liveDevices !== null && (
          <div className="mt-4 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex flex-wrap items-center justify-between gap-3 text-xs text-emerald-300">
            <span className="flex items-center gap-1.5 font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              تم جلب البيانات الحية من خوادم OneSignal مباشرة
            </span>
            <div className="flex items-center gap-4">
              <span>إجمالي الأجهزة: <strong className="text-white">{liveDevices}</strong></span>
              <span>الأجهزة المتاحة للإشعارات: <strong className="text-white">{messageableDevices ?? 0}</strong></span>
            </div>
          </div>
        )}
      </div>

      {/* Live Guest Activity Stream (Unregistered Visitors Live Feed) */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold flex items-center gap-1.5 border border-emerald-500/30">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                بث تفاعلي حي لحظة بلحظة
              </span>
              <span className="text-xs text-slate-400">
                آخر {guestLogs.length} حركة مسجلة
              </span>
            </div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Radio className="w-5 h-5 text-emerald-400" />
              نشاط وتفاعلات الزوار غير المسجلين (Guest Activity Feed)
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              يرصد كل حركة أو تصفح يقوم به أي مستخدم على هاتفه حتى لو لم يقم بإنشاء حساب أو تسجيل الدخول.
            </p>
          </div>

          <button
            onClick={() => fetchGuestLogs()}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs flex items-center gap-1.5 transition-all self-start md:self-auto"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            تحديث السجل
          </button>
        </div>

        {guestLogs.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            <Radio className="w-8 h-8 text-slate-600 mx-auto mb-2 animate-pulse" />
            <p>في انتظار تسجيل أول حركة من التطبيق... بمجرد فتح أي زائر للتطبيق ستظهر تفاصيله هنا فوراً.</p>
          </div>
        ) : (
          <div className="mt-4 divide-y divide-slate-800/60 max-h-96 overflow-y-auto">
            {guestLogs.map((log: any) => {
              const timeStr = new Date(log.created_at).toLocaleTimeString('ar-EG', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
              });
              const dateStr = new Date(log.created_at).toLocaleDateString('ar-EG');
              
              let eventLabel = 'تصفح التطبيق';
              let badgeColor = 'bg-slate-800 text-slate-300 border-slate-700';

              if (log.event_type === 'open_app') {
                eventLabel = 'فتح وتشغيل التطبيق';
                badgeColor = 'bg-brand-500/20 text-brand-300 border-brand-500/30';
              } else if (log.event_type === 'play_hymn') {
                eventLabel = `تشغيل ترنيمة: ${log.details?.title || ''}`;
                badgeColor = 'bg-purple-500/20 text-purple-300 border-purple-500/30';
              } else if (log.event_type === 'read_bible') {
                eventLabel = `قراءة إنجيل: ${log.details?.book || ''} (إصحاح ${log.details?.chapter || ''})`;
                badgeColor = 'bg-amber-500/20 text-amber-300 border-amber-500/30';
              } else if (log.event_type === 'play_game') {
                eventLabel = `دخول مسابقة/لعبة: ${log.details?.game || ''}`;
                badgeColor = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
              } else if (log.event_type === 'screen_view') {
                eventLabel = `زيارة شاشة: ${log.screen_name || 'عامة'}`;
                badgeColor = 'bg-blue-500/20 text-blue-300 border-blue-500/30';
              }

              return (
                <div key={log.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-800/30 px-2 rounded-lg transition-colors">
                  <div className="flex items-center gap-3">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${badgeColor}`}>
                      {eventLabel}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400 bg-slate-800/60 px-2 py-0.5 rounded border border-slate-700/40">
                      جهاز: {log.device_id}
                    </span>
                    {log.user_id && (
                      <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                        مستخدم مسجل
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono flex items-center gap-2">
                    <span>{dateStr}</span>
                    <span className="text-slate-300 font-bold">{timeStr}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Meta Campaign & Attribution Advisory Card */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <h2 className="text-base font-bold text-white flex items-center gap-2 mb-2">
          <Sparkles className="w-5 h-5 text-blue-400" />
          توجيهات حملة تثبيت التطبيق على فيسبوك (Meta Ads)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-300 mt-4">
          <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/60 space-y-1.5">
            <h4 className="font-bold text-white flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              1. إذن Advertising ID
            </h4>
            <p className="text-slate-400 leading-relaxed">
              تم تحديث كود التطبيق وإضافة إذن <code className="text-brand-300 font-mono">AD_ID</code> لكي يتمكن فيسبوك من ربط ضغطات الإعلانات بالتثبيتات على هواتف أندرويد 12+.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/60 space-y-1.5">
            <h4 className="font-bold text-white flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-blue-400" />
              2. وضع التطبيق على فيسبوك
            </h4>
            <p className="text-slate-400 leading-relaxed">
              تأكد من تفعيل وضع <strong className="text-white">Live Mode</strong> لتطبيق فيسبوك برقم <code className="text-brand-300 font-mono">2304281243687685</code> ليتم احتساب كل الجمهور.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/60 space-y-1.5">
            <h4 className="font-bold text-white flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-purple-400" />
              3. التثبيتات دون تسجيل دخول
            </h4>
            <p className="text-slate-400 leading-relaxed">
              العديد من المستخدمين يحملون التطبيق للاستماع للألحان أو قراءة الإنجيل كزوار. العداد بالأعلى يرصدهم بدقة دون اشتراط تسجيل الدخول.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
