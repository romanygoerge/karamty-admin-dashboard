import React, { useState, useEffect } from 'react';
import { 
  BellRing, 
  Send, 
  CheckCircle, 
  Clock, 
  Radio, 
  Trash2,
  Image as ImageIcon,
  ExternalLink,
  Eye,
  ToggleLeft,
  ToggleRight,
  Layers,
  Upload,
  Sparkles
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface NotificationsViewProps {
  onRefresh: () => void;
}

interface NotificationItem {
  id: string;
  title: string;
  body: string;
  type?: string;
  user_id?: string;
  created_at: string;
  read?: boolean;
}

interface BannerItem {
  id: string;
  title: string;
  message: string;
  image_url: string;
  button_text: string;
  action_url: string;
  is_active: boolean;
}

export const NotificationsView: React.FC<NotificationsViewProps> = ({ onRefresh }) => {
  const [activeTab, setActiveTab] = useState<'push' | 'in_app_banner'>('push');

  // Push notifications state
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Push Form states
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [targetGroup, setTargetGroup] = useState('all');

  // In-App Banner state
  const [bannerId, setBannerId] = useState<string>('a0000000-0000-0000-0000-000000000001');
  const [bannerTitle, setBannerTitle] = useState('مهرجان الكرازة السنوي 🏆');
  const [bannerMessage, setBannerMessage] = useState('سجل الآن مع كنيستك في فعاليات وألعاب وورش عمل مهرجان الكرازة المرقسية!');
  const [bannerImageUrl, setBannerImageUrl] = useState('https://images.unsplash.com/photo-1544427920-c49ccfb85579?w=800');
  const [bannerButtonText, setBannerButtonText] = useState('سجل الآن');
  const [bannerActionUrl, setBannerActionUrl] = useState('/mahragan');
  const [bannerIsActive, setBannerIsActive] = useState(false);
  const [isSavingBanner, setIsSavingBanner] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [sendPushWithBanner, setSendPushWithBanner] = useState(false);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30);

      if (error) throw error;
      setNotifications(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchInAppBanner = async () => {
    try {
      const { data, error } = await supabase
        .from('app_announcement_banners')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        setBannerId(data.id);
        setBannerTitle(data.title || '');
        setBannerMessage(data.message || '');
        setBannerImageUrl(data.image_url || '');
        setBannerButtonText(data.button_text || 'عرض التفاصيل');
        setBannerActionUrl(data.action_url || '');
        setBannerIsActive(data.is_active ?? false);
      }
    } catch (err) {
      console.error('Error loading banner:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    fetchInAppBanner();
  }, []);

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    setIsSending(true);

    try {
      let query = supabase.from('profiles').select('id');
      if (targetGroup === 'servants') {
        query = query.or('role.ilike.%خادم%,role.ilike.%أمين%');
      }

      const { data: users, error: userErr } = await query;
      if (userErr) throw userErr;

      const records = (users && users.length > 0)
        ? users.map((u) => ({
            id: crypto.randomUUID(),
            user_id: u.id,
            title: title.trim(),
            body: body.trim(),
            type: 'broadcast',
            read: false,
            created_at: new Date().toISOString()
          }))
        : [{
            id: crypto.randomUUID(),
            title: title.trim(),
            body: body.trim(),
            type: 'broadcast',
            read: false,
            created_at: new Date().toISOString()
          }];

      const { error } = await supabase.from('notifications').insert(records);
      if (error) throw error;

      try {
        await fetch('/api/send-notification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: title.trim(),
            message: body.trim(),
            target: targetGroup,
            targetUserIds: users && users.length > 0 ? users.map((u) => u.id) : undefined,
            data: { type: 'admin_broadcast' }
          })
        });
      } catch (pushErr) {
        console.warn('Push dispatch notice:', pushErr);
      }

      setTitle('');
      setBody('');
      fetchNotifications();
      onRefresh();
      setStatusMessage('تم إرسال التنبيه الفوري بنجاح إلى جميع الأجهزة والمستخدمين');
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      alert('خطأ أثناء إرسال التنبيه: ' + err.message);
    } finally {
      setIsSending(false);
    }
  };

  const handleImageFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingImage(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `banner-${Date.now()}.${fileExt}`;
      const filePath = `announcements/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('app_banners')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('app_banners')
        .getPublicUrl(filePath);

      setBannerImageUrl(publicUrl);
      setStatusMessage('تم رفع صورة البانر بنجاح!');
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      alert('خطأ أثناء رفع الصورة: ' + err.message);
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleSaveBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingBanner(true);
    try {
      const bannerData = {
        title: bannerTitle.trim(),
        message: bannerMessage.trim(),
        image_url: bannerImageUrl.trim() || null,
        button_text: bannerButtonText.trim() || 'عرض التفاصيل',
        action_url: bannerActionUrl.trim() || null,
        is_active: bannerIsActive,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('app_announcement_banners')
        .upsert({ id: bannerId, ...bannerData });

      if (error) throw error;

      // Optional: dispatch mobile push alert simultaneously
      if (sendPushWithBanner && bannerIsActive) {
        try {
          await fetch('/api/send-notification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: bannerTitle.trim(),
              message: bannerMessage.trim(),
              target: 'all',
              data: { type: 'in_app_banner', action_url: bannerActionUrl.trim() }
            })
          });
        } catch (pushErr) {
          console.warn('Banner push notice:', pushErr);
        }
      }

      setStatusMessage(`تم حفظ وتحديث بانر الإعلانات بنجاح! التغييرات تسمع فورياً في التطبيق.`);
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      alert('خطأ أثناء حفظ البانر: ' + err.message);
    } finally {
      setIsSavingBanner(false);
    }
  };

  const handleDeleteNotification = async (id: string) => {
    try {
      await supabase.from('notifications').delete().eq('id', id);
      fetchNotifications();
    } catch (err: any) {
      alert('خطأ: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="glass-panel p-5 rounded-2xl flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-brand-500/20 text-brand-400">
            <BellRing className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">إدارة الإشعارات وبانرات التطبيق</h3>
            <p className="text-xs text-slate-400">إرسال تنبيهات عاجلة والتحكم في البانر التفاعلي الذي يظهر في شاشة التطبيق الرئيسية</p>
          </div>
        </div>

        {/* Tab switch */}
        <div className="flex bg-slate-800/80 p-1 rounded-xl border border-slate-700">
          <button
            onClick={() => setActiveTab('push')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'push'
                ? 'bg-brand-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>إشعارات الموبايل (Push)</span>
          </button>
          <button
            onClick={() => setActiveTab('in_app_banner')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'in_app_banner'
                ? 'bg-brand-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>بانر الإعلانات بالتطبيق (In-App)</span>
            {bannerIsActive && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            )}
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          {statusMessage}
        </div>
      )}

      {activeTab === 'push' ? (
        /* PUSH NOTIFICATIONS TAB */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Send Broadcast Form */}
          <div className="glass-panel p-4 sm:p-6 rounded-2xl border border-slate-800">
            <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
              إنشاء إشعار فوري جديد
            </h4>

            <form onSubmit={handleSendNotification} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">الجهة المستهدفة بالإشعار</label>
                <select
                  value={targetGroup}
                  onChange={(e) => setTargetGroup(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-brand-500"
                >
                  <option value="all">جميع المستخدمين والخدام بالتطبيق</option>
                  <option value="servants">الخدام وأمناء الخدمة فقط</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">عنوان التنبيه *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="مثال: موعد قداس العيد / اجتماع الخدام الأسبوعي"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">نص الرسالة والتفاصيل *</label>
                <textarea
                  rows={4}
                  required
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="اكتب نص الإشعار هنا بالتفصيل..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <button
                type="submit"
                disabled={isSending}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold shadow-lg shadow-brand-600/30 transition-all"
              >
                <Send className="w-4 h-4" />
                <span>{isSending ? 'جارٍ الإرسال الفوري...' : 'إرسال الإشعار لجميع الأجهزة الآن'}</span>
              </button>
            </form>
          </div>

          {/* Recent Broadcasts Feed */}
          <div className="lg:col-span-2 glass-panel p-4 sm:p-6 rounded-2xl border border-slate-800 flex flex-col justify-between">
            <div>
              <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4 text-brand-400" />
                سجل التنبيهات المرسلة مؤخراً ({notifications.length})
              </h4>

              <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 flex items-start justify-between gap-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-brand-500/10 text-brand-400 mt-0.5">
                        <BellRing className="w-4 h-4" />
                      </div>
                      <div>
                        <h5 className="font-bold text-white text-xs mb-1">{n.title}</h5>
                        <p className="text-slate-300 text-xs leading-relaxed">{n.body}</p>
                        <span className="text-[10px] text-slate-500 mt-2 block">
                          {new Date(n.created_at).toLocaleString('ar-EG')}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteNotification(n.id)}
                      className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                      title="حذف من السجل"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}

                {notifications.length === 0 && !loading && (
                  <div className="py-12 text-center text-slate-500 text-xs">
                    لا توجد تنبيهات مرسلة حالياً. استخدم النموذج لإرسال أول تنبيه.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* IN-APP BANNER TAB */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Banner Settings Form */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-brand-400" />
                  إعدادات بانر الإعلانات داخل التطبيق
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">يظهر أعلى الصفحة الرئيسية بالتطبيق بصورة وزر تفاعلي</p>
              </div>

              {/* Status Toggle Switch */}
              <button
                type="button"
                onClick={() => setBannerIsActive(!bannerIsActive)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  bannerIsActive 
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}
              >
                {bannerIsActive ? (
                  <>
                    <ToggleRight className="w-4 h-4 text-emerald-400" />
                    <span>مفعل ويظهر بالتطبيق</span>
                  </>
                ) : (
                  <>
                    <ToggleLeft className="w-4 h-4 text-slate-500" />
                    <span>معطل ومخفي</span>
                  </>
                )}
              </button>
            </div>

            <form onSubmit={handleSaveBanner} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">عنوان البانر *</label>
                <input
                  type="text"
                  required
                  value={bannerTitle}
                  onChange={(e) => setBannerTitle(e.target.value)}
                  placeholder="مثال: مهرجان الكرازة السنوي 🏆"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">نص الرسالة والتفاصيل *</label>
                <textarea
                  rows={3}
                  required
                  value={bannerMessage}
                  onChange={(e) => setBannerMessage(e.target.value)}
                  placeholder="اكتب تفاصيل الإعلان أو التنبيه هنا..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              {/* Quick Presets */}
              <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-700/60">
                <label className="block text-slate-400 font-semibold mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  قوالب جاهزة سريعة للتعبئة:
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setBannerTitle('مهرجان الكرازة المرقسية 🏆');
                      setBannerMessage('سجل الآن مع كنيستك في فعاليات ومسابقات وورش عمل مهرجان الكرازة!');
                      setBannerImageUrl('https://images.unsplash.com/photo-1544427920-c49ccfb85579?w=800');
                      setBannerButtonText('سجل واشترك الآن');
                      setBannerActionUrl('/mahragan');
                      setBannerIsActive(true);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 text-[11px] font-semibold transition-all border border-amber-500/30"
                  >
                    🏆 مهرجان الكرازة
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setBannerTitle('متنساش خلوتك اليومية مع ربنا 🕊️');
                      setBannerMessage('ابدأ يومك بآية وصلاة تملأ قلبك سلام وبركة.. ادخل واقرأ قراءات اليوم.');
                      setBannerImageUrl('https://images.unsplash.com/photo-1504052434569-70ad5836ab65?w=800');
                      setBannerButtonText('ابدأ خلوتك الآن');
                      setBannerActionUrl('/retreat');
                      setBannerIsActive(true);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-300 text-[11px] font-semibold transition-all border border-sky-500/30"
                  >
                    🕊️ تذكير الخلوة
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setBannerTitle('ألعاب وتحديات مسابقات كرمتي 🎮');
                      setBannerMessage('العب واختبر معلوماتك الكتابية والطقسية واجمع نقاط واصعد في لوحة الصدارة!');
                      setBannerImageUrl('https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800');
                      setBannerButtonText('ابدأ اللعب والتحدي');
                      setBannerActionUrl('/games');
                      setBannerIsActive(true);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-purple-300 text-[11px] font-semibold transition-all border border-purple-500/30"
                  >
                    🎮 ألعاب وتحديات
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5" />
                    صورة البانر (رابط مباشر أو رفع ملف)
                  </span>
                  {isUploadingImage && (
                    <span className="text-amber-400 text-[10px] animate-pulse">جارٍ رفع الصورة...</span>
                  )}
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={bannerImageUrl}
                    onChange={(e) => setBannerImageUrl(e.target.value)}
                    placeholder="https://..."
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-brand-500"
                  />
                  <label className="cursor-pointer px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold flex items-center gap-1.5 transition-colors border border-slate-600">
                    <Upload className="w-3.5 h-3.5" />
                    <span>رفع صورة</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block">يفضل صورة أفقية بنسبة 16:9 لعرض جذاب وأنيق بالتطبيق</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">نص الزر التفاعلي</label>
                  <input
                    type="text"
                    value={bannerButtonText}
                    onChange={(e) => setBannerButtonText(e.target.value)}
                    placeholder="مثال: اشترك الآن / عرض التفاصيل"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">مسار أو رابط الزر</label>
                  <input
                    type="text"
                    value={bannerActionUrl}
                    onChange={(e) => setBannerActionUrl(e.target.value)}
                    placeholder="مثال: /mahragan أو /retreat أو https://..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              {/* Push notification sync option */}
              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-800/60 border border-slate-700/80 cursor-pointer mt-2 text-slate-300">
                <input
                  type="checkbox"
                  checked={sendPushWithBanner}
                  onChange={(e) => setSendPushWithBanner(e.target.checked)}
                  className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 bg-slate-700 border-slate-600"
                />
                <span className="text-xs font-semibold">إرسال إشعار فوري (Push Notification) على هواتف المستخدمين لإعلامهم بهذا البانر الجديد</span>
              </label>

              <button
                type="submit"
                disabled={isSavingBanner || isUploadingImage}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold shadow-lg shadow-brand-600/30 transition-all mt-4"
              >
                <CheckCircle className="w-4 h-4" />
                <span>{isSavingBanner ? 'جارٍ الحفظ والمزامنة الفورية...' : 'حفظ ونشر التعديلات فورياً بالتطبيق'}</span>
              </button>
            </form>
          </div>

          {/* Live Mobile Preview */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 flex flex-col items-center justify-center">
            <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2 self-start">
              <Eye className="w-4 h-4 text-brand-400" />
              معاينة حية لشكل البانر في الموبايل
            </h4>

            {/* Mock Phone Container */}
            <div className="w-full max-w-sm rounded-2xl bg-slate-900 border-2 border-slate-700 p-4 shadow-2xl relative">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3 text-[11px] text-slate-400 font-semibold">
                <span>تطبيق كرمتي 🍇</span>
                <span className={`px-2 py-0.5 rounded-full text-[9px] ${bannerIsActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                  {bannerIsActive ? 'مباشر الآن' : 'غير معروض'}
                </span>
              </div>

              {/* In-App Banner Preview Card */}
              <div className="rounded-xl overflow-hidden border border-brand-500/40 bg-gradient-to-br from-slate-800 to-slate-850 shadow-lg">
                {bannerImageUrl ? (
                  <div className="h-32 w-full overflow-hidden relative bg-slate-800">
                    <img 
                      src={bannerImageUrl} 
                      alt="Banner Preview" 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1544427920-c49ccfb85579?w=800';
                      }}
                    />
                  </div>
                ) : (
                  <div className="h-20 w-full bg-brand-900/40 flex items-center justify-center text-brand-400">
                    <ImageIcon className="w-8 h-8 opacity-40" />
                  </div>
                )}

                <div className="p-3 text-right">
                  <h5 className="font-bold text-white text-xs mb-1">{bannerTitle || 'عنوان البانر'}</h5>
                  <p className="text-slate-300 text-[11px] leading-relaxed line-clamp-2">
                    {bannerMessage || 'نص الرسالة والإعلان هنا...'}
                  </p>

                  <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-700/50">
                    <button
                      type="button"
                      className="px-3 py-1.5 rounded-lg bg-brand-600 text-white font-bold text-[11px] flex items-center gap-1 shadow"
                    >
                      <span>{bannerButtonText || 'عرض التفاصيل'}</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                    <span className="text-[10px] text-slate-400">إعلان رسمي</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
