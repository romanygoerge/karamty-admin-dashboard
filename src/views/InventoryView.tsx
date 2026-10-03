import React, { useState } from 'react';
import { 
  Package, 
  Plus, 
  Edit3, 
  Trash2, 
  Search, 
  AlertTriangle, 
  Save, 
  CheckCircle,
  MapPin
} from 'lucide-react';
import { InventoryItem } from '../types';
import { Modal } from '../components/Modal';
import { supabase } from '../lib/supabase';

interface InventoryViewProps {
  inventory: InventoryItem[];
  onRefresh: () => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({ inventory, onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [category, setCategory] = useState('أجهزة صوتية');
  const [totalQty, setTotalQty] = useState(1);
  const [availQty, setAvailQty] = useState(1);
  const [location, setLocation] = useState('');
  const [condition, setCondition] = useState('ممتازة');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const categories = ['all', 'أجهزة صوتية', 'كتب وتراتيل', 'أدوات مسرح وفن', 'ملابس وخدمة', 'أدوات كشفية'];

  const filteredItems = inventory.filter((item) => {
    const matchesSearch = item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.category?.toLowerCase().includes(searchTerm.toLowerCase());
    if (categoryFilter === 'all') return matchesSearch;
    return matchesSearch && item.category === categoryFilter;
  });

  const handleOpenAdd = () => {
    setName('');
    setCategory('أجهزة صوتية');
    setTotalQty(1);
    setAvailQty(1);
    setLocation('مخزن الكنيسة الرئيسي');
    setCondition('ممتازة');
    setNotes('');
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (item: InventoryItem) => {
    setSelectedItem(item);
    setName(item.name);
    setCategory(item.category || 'أجهزة صوتية');
    setTotalQty(item.total_quantity || 1);
    setAvailQty(item.available_quantity || 1);
    setLocation(item.location || '');
    setCondition(item.condition || 'جيدة');
    setNotes(item.notes || '');
    setIsEditModalOpen(true);
  };

  const handleSaveNew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSaving(true);

    try {
      const newId = crypto.randomUUID();
      const { error } = await supabase.from('inventory_items').insert({
        id: newId,
        name: name.trim(),
        category,
        total_quantity: totalQty,
        available_quantity: availQty,
        location: location.trim(),
        condition,
        notes: notes.trim(),
        updated_at: new Date().toISOString()
      });

      if (error) throw error;

      setIsAddModalOpen(false);
      onRefresh();
      setStatusMessage('تمت إضافة الصنف إلى المخزن بنجاح');
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      alert('خطأ أثناء الإضافة: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem || !name.trim()) return;
    setIsSaving(true);

    try {
      const { error } = await supabase
        .from('inventory_items')
        .update({
          name: name.trim(),
          category,
          total_quantity: totalQty,
          available_quantity: availQty,
          location: location.trim(),
          condition,
          notes: notes.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedItem.id);

      if (error) throw error;

      setIsEditModalOpen(false);
      onRefresh();
      setStatusMessage('تم تحديث بيانات الصنف بنجاح');
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      alert('خطأ أثناء التعديل: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteItem = async (itemId: string, itemName: string) => {
    if (!confirm(`هل أنت متأكد من حذف (${itemName}) من المخزن؟`)) return;

    try {
      const { error } = await supabase.from('inventory_items').delete().eq('id', itemId);
      if (error) throw error;
      onRefresh();
      setStatusMessage('تم حذف الصنف من المخزن');
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
          <div className="p-3 rounded-xl bg-purple-500/20 text-purple-400">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">مخزن وعُهد الكنيسة</h3>
            <p className="text-xs text-slate-400">متابعة الأصناف، العُهد، الأجهزة، والكميات المتاحة للإعارة</p>
          </div>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-lg shadow-brand-600/30 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة عهدة / صنف جديد</span>
        </button>
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
            placeholder="بحث باسم الصنف أو مكان التواجد..."
            className="w-full bg-slate-900/90 text-xs text-slate-200 placeholder-slate-500 rounded-xl pr-10 pl-4 py-2.5 border border-slate-800 focus:outline-none focus:border-brand-500 transition-all"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                categoryFilter === cat
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {cat === 'all' ? 'جميع الأقسام' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Inventory Table */}
      <div className="glass-panel rounded-2xl overflow-hidden border border-slate-800">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4 font-semibold">اسم الصنف / العهدة</th>
                <th className="py-3.5 px-4 font-semibold">التصنيف</th>
                <th className="py-3.5 px-4 font-semibold">مكان التواجد</th>
                <th className="py-3.5 px-4 font-semibold">الكمية الإجمالية</th>
                <th className="py-3.5 px-4 font-semibold">المتاح للإعارة</th>
                <th className="py-3.5 px-4 font-semibold">الحالة</th>
                <th className="py-3.5 px-4 font-semibold text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredItems.map((item) => {
                const isLow = (item.available_quantity || 0) === 0;
                return (
                  <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 font-bold text-white">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-purple-400" />
                        <span>{item.name}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-slate-300">
                      <span className="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-[11px]">
                        {item.category}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-slate-400">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-500" />
                        <span>{item.location || 'المخزن'}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4 font-bold text-slate-300">
                      {item.total_quantity}
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 font-bold ${
                          isLow ? 'text-rose-400' : 'text-emerald-400'
                        }`}
                      >
                        {isLow && <AlertTriangle className="w-3 h-3" />}
                        {item.available_quantity} قطعة
                      </span>
                    </td>

                    <td className="py-3 px-4 text-slate-300">
                      <span className="text-[11px] text-slate-400">{item.condition || 'جيدة'}</span>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(item)}
                          title="تعديل بيانات الصنف"
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-brand-600 text-slate-300 hover:text-white transition-all"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item.id, item.name)}
                          title="حذف الصنف"
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 text-xs">
                    لا توجد أصناف مسجلة في هذا القسم. اضغط على "إضافة عهدة / صنف جديد" للإضافة.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Item Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="إضافة صنف أو عهدة جديدة لمخزن الكنيسة"
      >
        <form onSubmit={handleSaveNew} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-400 font-semibold mb-1">اسم العهدة أو الجهاز *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: ميكروفون لاسلكي Shure"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">التصنيف</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-brand-500"
              >
                <option value="أجهزة صوتية">أجهزة صوتية</option>
                <option value="كتب وتراتيل">كتب وتراتيل</option>
                <option value="أدوات مسرح وفن">أدوات مسرح وفن</option>
                <option value="ملابس وخدمة">ملابس وخدمة</option>
                <option value="أدوات كشفية">أدوات كشفية</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">مكان التواجد</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="غرفة الكنترول / مخزن 2"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">الكمية الإجمالية</label>
              <input
                type="number"
                min="1"
                value={totalQty}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setTotalQty(val);
                  setAvailQty(val);
                }}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">المتاح حالياً</label>
              <input
                type="number"
                min="0"
                max={totalQty}
                value={availQty}
                onChange={(e) => setAvailQty(Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">حالة الجهاز / العهدة</label>
            <input
              type="text"
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              placeholder="ممتازة / بحالة جيدة / يحتاج صيانة"
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

      {/* Edit Item Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="تعديل بيانات الصنف والكميات"
      >
        <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-400 font-semibold mb-1">اسم الصنف</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">الكمية الإجمالية</label>
              <input
                type="number"
                min="0"
                value={totalQty}
                onChange={(e) => setTotalQty(Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">المتاح حالياً</label>
              <input
                type="number"
                min="0"
                value={availQty}
                onChange={(e) => setAvailQty(Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">مكان التواجد</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 font-semibold"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold shadow-lg shadow-brand-600/30"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'جارٍ الحفظ...' : 'حفظ التعديلات'}</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
