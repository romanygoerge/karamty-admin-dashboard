import React, { useState } from 'react';
import { 
  Wallet, 
  PlusCircle, 
  ArrowUpRight, 
  ArrowDownRight, 
  Trash2, 
  Calendar, 
  CheckCircle,
  TrendingUp,
  Tag
} from 'lucide-react';
import { BudgetItem } from '../types';
import { Modal } from '../components/Modal';
import { supabase } from '../lib/supabase';

interface FinanceViewProps {
  budget: BudgetItem[];
  onRefresh: () => void;
}

export const FinanceView: React.FC<FinanceViewProps> = ({ budget, onRefresh }) => {
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState<number>(100);
  const [type, setType] = useState<'income' | 'expense'>('income');
  const [category, setCategory] = useState('اشتراكات');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [isSaving, setIsSaving] = useState(false);

  const totalIncome = budget
    .filter((b) => b.type === 'income')
    .reduce((acc, b) => acc + Number(b.amount || 0), 0);
  const totalExpense = budget
    .filter((b) => b.type === 'expense')
    .reduce((acc, b) => acc + Number(b.amount || 0), 0);
  const netBalance = totalIncome - totalExpense;

  const filteredItems = budget.filter((item) => {
    if (filterType === 'all') return true;
    return item.type === filterType;
  });

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !amount) return;
    setIsSaving(true);

    try {
      const newId = crypto.randomUUID();
      const { error } = await supabase.from('service_budget_items').insert({
        id: newId,
        title: title.trim(),
        amount,
        type,
        category,
        date,
        notes: notes.trim(),
        recorded_by: 'أدمن الخدمة'
      });

      if (error) throw error;

      setIsAddModalOpen(false);
      setTitle('');
      setAmount(100);
      setNotes('');
      onRefresh();
      setStatusMessage('تم تسجيل المعاملة المالية بنجاح');
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      alert('خطأ أثناء الحفظ: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteItem = async (id: string, itemTitle: string) => {
    if (!confirm(`هل أنت متأكد من حذف بند (${itemTitle})؟`)) return;

    try {
      const { error } = await supabase.from('service_budget_items').delete().eq('id', id);
      if (error) throw error;
      onRefresh();
      setStatusMessage('تم حذف البند المالي');
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      alert('خطأ أثناء الحذف: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-panel p-5 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-emerald-500/20 text-emerald-400">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">المالية وميزانية الخدمة</h3>
            <p className="text-xs text-slate-400">متابعة الإيرادات والمصروفات وصندوق الخدمة والاشتراكات الشهرية</p>
          </div>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-lg shadow-brand-600/30 transition-all"
        >
          <PlusCircle className="w-4 h-4" />
          <span>تسجيل حركة مالية جديدة</span>
        </button>
      </div>

      {statusMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          {statusMessage}
        </div>
      )}

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="glass-panel p-5 rounded-2xl border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-semibold">إجمالي الإيرادات والاشتراكات</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-emerald-400">+{totalIncome.toLocaleString()} ج.م</h3>
          <p className="text-[11px] text-slate-500 mt-1">تبرعات واشتراكات مخدومين وخدام</p>
        </div>

        <div className="glass-panel p-5 rounded-2xl border-l-4 border-l-rose-500">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-semibold">إجمالي المصروفات والصرف</span>
            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-rose-400">-{totalExpense.toLocaleString()} ج.م</h3>
          <p className="text-[11px] text-slate-500 mt-1">أنشطة وهدايا ومستلزمات الخدمة</p>
        </div>

        <div className="glass-panel p-5 rounded-2xl border-l-4 border-l-brand-500">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-semibold">صافي رصيد الصندوق الحالي</span>
            <div className="p-2 rounded-lg bg-brand-500/10 text-brand-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <h3 className={`text-2xl font-bold ${netBalance >= 0 ? 'text-white' : 'text-rose-400'}`}>
            {netBalance.toLocaleString()} ج.م
          </h3>
          <p className="text-[11px] text-slate-500 mt-1">الرصيد المتاح للخدمة الآن</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        {[
          { id: 'all', label: `جميع الحركات (${budget.length})` },
          { id: 'income', label: 'الإيرادات فقط' },
          { id: 'expense', label: 'المصروفات فقط' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilterType(tab.id as any)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              filterType === tab.id
                ? 'bg-brand-600 text-white shadow-sm'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Transactions Table */}
      <div className="glass-panel rounded-2xl overflow-hidden border border-slate-800">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4 font-semibold">البيان / عنوان الحركة</th>
                <th className="py-3.5 px-4 font-semibold">النوع</th>
                <th className="py-3.5 px-4 font-semibold">التصنيف</th>
                <th className="py-3.5 px-4 font-semibold">المبلغ</th>
                <th className="py-3.5 px-4 font-semibold">التاريخ</th>
                <th className="py-3.5 px-4 font-semibold">ملاحظات</th>
                <th className="py-3.5 px-4 font-semibold text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredItems.map((item) => {
                const isIncome = item.type === 'income';
                return (
                  <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 font-bold text-white">
                      {item.title}
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                          isIncome
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {isIncome ? '+ إيراد' : '- مصروف'}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-slate-300">
                      <div className="flex items-center gap-1 text-[11px]">
                        <Tag className="w-3 h-3 text-slate-500" />
                        <span>{item.category || 'عام'}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4 font-bold">
                      <span className={isIncome ? 'text-emerald-400' : 'text-rose-400'}>
                        {isIncome ? '+' : '-'}{Number(item.amount).toLocaleString()} ج.م
                      </span>
                    </td>

                    <td className="py-3 px-4 text-slate-400">
                      <div className="flex items-center gap-1 text-[11px]">
                        <Calendar className="w-3 h-3 text-slate-500" />
                        <span>{item.date || '-'}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-slate-400 max-w-[200px] truncate">
                      {item.notes || '-'}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleDeleteItem(item.id, item.title)}
                        title="حذف الحركة المالية"
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}

              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 text-xs">
                    لا توجد حركات مالية مسجلة في هذا القسم. اضغط على "تسجيل حركة مالية جديدة" للبدء.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Transaction Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="تسجيل حركة مالية جديدة لميزانية الخدمة"
      >
        <form onSubmit={handleSaveItem} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-400 font-semibold mb-1">البيان / العنوان *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: اشتراكات شهر أكتوبر / شراء أدوات مدارس الأحد"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">نوع الحركة</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-brand-500"
              >
                <option value="income">إيراد / اشتراك (+)</option>
                <option value="expense">مصروف / صرف (-)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">المبلغ (بالجنيه المصري) *</label>
              <input
                type="number"
                min="1"
                required
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">التصنيف</label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="اشتراكات / هدايا / ضيافة / أدوات"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">التاريخ</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">ملاحظات إضافية</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="تفاصيل الفاتورة أو المستلم..."
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
              <PlusCircle className="w-4 h-4" />
              <span>{isSaving ? 'جارٍ التسجيل...' : 'تسجيل الحركة'}</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
