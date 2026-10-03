import React, { useState, useEffect } from 'react';
import { 
  BellRing, 
  Send, 
  CheckCircle, 
  Clock, 
  Radio, 
  Trash2
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

export const NotificationsView: React.FC<NotificationsViewProps> = ({ onRefresh }) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [targetGroup, setTargetGroup] = useState('all');

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

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    setIsSending(true);

    try {
      // Fetch target users
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

      setTitle('');
      setBody('');
      fetchNotifications();
      onRefresh();
      setStatusMessage(`تم إرسال التنبيه الفوري بنجاح إلى جميع الأجهزة والمستخدمين`);
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      alert('خطأ أثناء إرسال التنبيه: ' + err.message);
    } finally {
      setIsSending(false);
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
      <div className="glass-panel p-5 rounded-2xl flex items-center gap-3">
        <div className="p-3 rounded-xl bg-brand-500/20 text-brand-400">
          <BellRing className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-base font-bold text-white">البث المباشر والإشعارات الفورية للموبايل</h3>
          <p className="text-xs text-slate-400">إرسال تنبيهات عاجلة وإعلانات فورية تظهر مباشرة في هواتف الخدام والمخدومين</p>
        </div>
      </div>

      {statusMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          {statusMessage}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Send Broadcast Form */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800">
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
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border border-slate-800 flex flex-col justify-between">
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
    </div>
  );
};
