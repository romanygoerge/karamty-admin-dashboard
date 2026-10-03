import React, { useState, useEffect } from 'react';
import { 
  Gift, 
  Plus, 
  Coins, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  Check, 
  AlertCircle
} from 'lucide-react';
import { RewardItem, RewardRedemption } from '../types';
import { Modal } from '../components/Modal';
import { supabase } from '../lib/supabase';

interface RewardsViewProps {
  onRefresh: () => void;
}

export const RewardsView: React.FC<RewardsViewProps> = ({ onRefresh }) => {
  const [rewards, setRewards] = useState<RewardItem[]>([]);
  const [redemptions, setRedemptions] = useState<RewardRedemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [pointsCost, setPointsCost] = useState(150);
  const [stock, setStock] = useState(10);
  const [imageUrl, setImageUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [rewardsRes, redemptionsRes] = await Promise.all([
        supabase.from('rewards_store').select('*').order('points_cost', { ascending: true }),
        supabase.from('reward_redemptions').select('*, profiles(full_name, church), rewards_store(title, points_cost)').order('created_at', { ascending: false })
      ]);

      if (rewardsRes.data) setRewards(rewardsRes.data);
      if (redemptionsRes.data) setRedemptions(redemptionsRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateReward = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setIsSaving(true);

    try {
      const newId = crypto.randomUUID();
      const { error } = await supabase.from('rewards_store').insert({
        id: newId,
        title: title.trim(),
        points_cost: pointsCost,
        stock,
        image_url: imageUrl.trim() || null,
        is_active: true
      });

      if (error) throw error;

      setIsAddModalOpen(false);
      setTitle('');
      setPointsCost(150);
      setStock(10);
      setImageUrl('');
      fetchData();
      onRefresh();
      setStatusMessage('تمت إضافة المكافأة للمتجر بنجاح');
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      alert('خطأ أثناء إضافة الهدية: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateRedemptionStatus = async (id: string, newStatus: 'approved' | 'delivered' | 'cancelled') => {
    try {
      const { error } = await supabase
        .from('reward_redemptions')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;

      fetchData();
      setStatusMessage(`تم تحديث حالة الطلب إلى (${newStatus === 'delivered' ? 'تم التسليم' : newStatus === 'approved' ? 'مقبول' : 'ملغي'})`);
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      alert('خطأ: ' + err.message);
    }
  };

  const handleDeleteReward = async (id: string, name: string) => {
    if (!confirm(`حذف مكافأة (${name})؟`)) return;
    try {
      const { error } = await supabase.from('rewards_store').delete().eq('id', id);
      if (error) throw error;
      fetchData();
    } catch (err: any) {
      alert('خطأ أثناء الحذف: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-panel p-5 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gold-500/20 text-gold-400">
            <Gift className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">متجر المكافآت والنقاط التفاعلية</h3>
            <p className="text-xs text-slate-400">إدارة هدايا ومكافآت التميز لمخدومي مدارس الأحد والشباب ومتابعة طلبات الاستبدال</p>
          </div>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-lg shadow-brand-600/30 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة مكافأة جديدة للمتجر</span>
        </button>
      </div>

      {statusMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-2">
          <Check className="w-4 h-4" />
          {statusMessage}
        </div>
      )}

      {/* Rewards Catalog */}
      <div>
        <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
          <Gift className="w-4 h-4 text-gold-400" />
          كتالوج الهدايا المتاحة في التطبيق ({rewards.length})
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {rewards.map((r) => (
            <div
              key={r.id}
              className="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-col justify-between hover:border-slate-700 transition-all"
            >
              <div>
                {r.image_url ? (
                  <div className="w-full h-32 rounded-xl overflow-hidden mb-3 bg-slate-900 border border-slate-800">
                    <img src={r.image_url} alt="" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-full h-32 rounded-xl bg-slate-800 flex items-center justify-center text-slate-600 mb-3 border border-slate-700/60">
                    <Gift className="w-10 h-10 text-gold-500/40" />
                  </div>
                )}
                <h5 className="font-bold text-white text-sm mb-1">{r.title}</h5>
                <div className="flex items-center justify-between text-xs text-slate-400 mt-2">
                  <span className="flex items-center gap-1 font-bold text-gold-400">
                    <Coins className="w-3.5 h-3.5" />
                    {r.points_cost} نقطة
                  </span>
                  <span>المخزون: {r.stock}</span>
                </div>
              </div>

              <div className="pt-3 mt-3 border-t border-slate-800/80 flex items-center justify-end">
                <button
                  onClick={() => handleDeleteReward(r.id, r.title)}
                  className="p-1 rounded text-slate-500 hover:text-rose-400 transition-colors"
                  title="حذف المكافأة"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}

          {rewards.length === 0 && !loading && (
            <div className="col-span-full py-10 text-center text-slate-500 text-xs">
              لا توجد مكافآت مسجلة حالياً بالمتجر. اضغط على "إضافة مكافأة جديدة" للبدء.
            </div>
          )}
        </div>
      </div>

      {/* Redemptions Table */}
      <div className="mt-8">
        <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4 text-brand-400" />
          طلبات استبدال النقاط من المخدومين ({redemptions.length})
        </h4>

        <div className="glass-panel rounded-2xl overflow-hidden border border-slate-800">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">المخدوم / الطالب</th>
                  <th className="py-3.5 px-4 font-semibold">المكافأة المطلوبة</th>
                  <th className="py-3.5 px-4 font-semibold">النقاط المخصومة</th>
                  <th className="py-3.5 px-4 font-semibold">تاريخ الطلب</th>
                  <th className="py-3.5 px-4 font-semibold">الحالة</th>
                  <th className="py-3.5 px-4 font-semibold text-center">إجراء التسليم</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {redemptions.map((red) => (
                  <tr key={red.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 font-bold text-white">
                      {red.profiles?.full_name || 'طالب مجهول'}
                      {red.profiles?.church && (
                        <span className="block text-[11px] text-slate-400 font-normal">
                          {red.profiles.church}
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-slate-200">
                      {red.rewards_store?.title || 'مكافأة'}
                    </td>

                    <td className="py-3 px-4 font-bold text-gold-400">
                      {red.points_spent} نقطة
                    </td>

                    <td className="py-3 px-4 text-slate-400">
                      {new Date(red.created_at).toLocaleDateString('ar-EG')}
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                          red.status === 'delivered'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : red.status === 'approved'
                            ? 'bg-brand-500/10 text-brand-400 border border-brand-500/20'
                            : 'bg-amber-500/10 text-gold-400 border border-amber-500/20'
                        }`}
                      >
                        {red.status === 'delivered' ? 'تم التسليم' : red.status === 'approved' ? 'مقبول' : 'قيد الانتظار'}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {red.status !== 'delivered' && (
                          <button
                            onClick={() => handleUpdateRedemptionStatus(red.id, 'delivered')}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-all flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>تأكيد التسليم</span>
                          </button>
                        )}
                        {red.status === 'delivered' && (
                          <span className="text-slate-500 text-[11px]">مكتمل ✓</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}

                {redemptions.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500 text-xs">
                      لا توجد طلبات استبدال حالياً.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add Reward Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="إضافة مكافأة جديدة لمتجر كرامتي"
      >
        <form onSubmit={handleCreateReward} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-400 font-semibold mb-1">اسم الهدية / المكافأة *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: كتاب مقدس بشواهد / صليب خشب زيتون"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">النقاط المطلوبة للاستبدال</label>
              <input
                type="number"
                min="10"
                required
                value={pointsCost}
                onChange={(e) => setPointsCost(Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">الكمية المتوفرة (المخزون)</label>
              <input
                type="number"
                min="1"
                required
                value={stock}
                onChange={(e) => setStock(Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">رابط صورة الهدية (اختياري)</label>
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://images.unsplash.com/..."
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-brand-500"
            />
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
              <Plus className="w-4 h-4" />
              <span>{isSaving ? 'جارٍ الإضافة...' : 'إضافة الآن'}</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
