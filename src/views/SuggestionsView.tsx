import React, { useState, useEffect } from 'react';
import { 
  Lightbulb, 
  ThumbsUp, 
  CheckCircle2, 
  Clock, 
  Sparkles, 
  Trash2, 
  MessageSquare, 
  Filter, 
  Search, 
  RefreshCw, 
  AlertCircle,
  TrendingUp,
  Tag,
  User,
  Send,
  Check,
  XCircle,
  HelpCircle,
  ArrowUpDown
} from 'lucide-react';
import { supabase } from '../lib/supabase';

export interface AppSuggestion {
  id: string;
  user_id?: string;
  user_name: string;
  user_avatar?: string;
  title: string;
  description: string;
  category: string;
  upvotes_count: number;
  status: 'under_review' | 'planned' | 'in_progress' | 'completed' | 'declined';
  admin_response?: string;
  created_at: string;
  updated_at: string;
}

export const SuggestionsView: React.FC = () => {
  const [suggestions, setSuggestions] = useState<AppSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'upvotes' | 'newest'>('upvotes');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Editing response modal state
  const [selectedSuggestion, setSelectedSuggestion] = useState<AppSuggestion | null>(null);
  const [adminResponseText, setAdminResponseText] = useState('');
  const [isSavingResponse, setIsSavingResponse] = useState(false);

  const fetchSuggestions = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('app_suggestions')
        .select('*');

      if (sortBy === 'upvotes') {
        query = query.order('upvotes_count', { ascending: false }).order('created_at', { ascending: false });
      } else {
        query = query.order('created_at', { ascending: false });
      }

      const { data, error } = await query;
      if (error) throw error;
      if (data) setSuggestions(data as AppSuggestion[]);
    } catch (err: any) {
      console.error('Error fetching suggestions:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSuggestions();

    // Supabase Realtime channel for instant suggestions updates
    const channel = supabase
      .channel('realtime-suggestions-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_suggestions' }, () => {
        fetchSuggestions();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_suggestion_votes' }, () => {
        fetchSuggestions();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sortBy]);

  const handleUpdateStatus = async (id: string, newStatus: AppSuggestion['status']) => {
    try {
      const { error } = await supabase
        .from('app_suggestions')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      setSuggestions(prev => prev.map(s => s.id === id ? { ...s, status: newStatus } : s));
      setStatusMessage('تم تحديث حالة الاقتراح بنجاح');
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      alert('خطأ أثناء تحديث الحالة: ' + err.message);
    }
  };

  const handleSaveResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSuggestion) return;
    setIsSavingResponse(true);

    try {
      const { error } = await supabase
        .from('app_suggestions')
        .update({ 
          admin_response: adminResponseText.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedSuggestion.id);

      if (error) throw error;
      setSuggestions(prev => prev.map(s => s.id === selectedSuggestion.id ? { ...s, admin_response: adminResponseText.trim() } : s));
      setSelectedSuggestion(null);
      setStatusMessage('تم إرسال رد الإدارة ونشره للمستخدمين بنجاح');
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      alert('خطأ أثناء حفظ الرد: ' + err.message);
    } finally {
      setIsSavingResponse(false);
    }
  };

  const handleDeleteSuggestion = async (id: string, title: string) => {
    if (!confirm(`هل أنت متأكد من حذف هذا الاقتراح (${title})؟`)) return;

    try {
      const { error } = await supabase.from('app_suggestions').delete().eq('id', id);
      if (error) throw error;
      setSuggestions(prev => prev.filter(s => s.id !== id));
      setStatusMessage('تم حذف الاقتراح بنجاح');
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      alert('خطأ أثناء الحذف: ' + err.message);
    }
  };

  const filteredSuggestions = suggestions.filter(s => {
    if (statusFilter !== 'all' && s.status !== statusFilter) return false;
    if (categoryFilter !== 'all' && s.category !== categoryFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = s.title.toLowerCase().includes(q);
      const matchDesc = s.description.toLowerCase().includes(q);
      const matchUser = s.user_name.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchUser) return false;
    }
    return true;
  });

  const stats = {
    total: suggestions.length,
    underReview: suggestions.filter(s => s.status === 'under_review').length,
    inProgress: suggestions.filter(s => s.status === 'in_progress' || s.status === 'planned').length,
    completed: suggestions.filter(s => s.status === 'completed').length,
    totalVotes: suggestions.reduce((acc, s) => acc + (s.upvotes_count || 0), 0)
  };

  const statusConfig: Record<AppSuggestion['status'], { label: string; color: string; bg: string; border: string }> = {
    under_review: {
      label: 'قيد المراجعة',
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/30'
    },
    planned: {
      label: 'مُجدول للتنفيذ',
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/30'
    },
    in_progress: {
      label: 'جاري العمل عليه',
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/30'
    },
    completed: {
      label: 'تم التنفيذ بنجاح',
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/30'
    },
    declined: {
      label: 'تم الاعتذار عنه',
      color: 'text-rose-400',
      bg: 'bg-rose-500/10',
      border: 'border-rose-500/30'
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-amber-950/60 via-slate-900 to-brand-950/60 border border-amber-500/30 rounded-2xl p-4 sm:p-6 shadow-xl backdrop-blur-md">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center shadow-lg shadow-amber-500/20 text-slate-950 font-bold shrink-0">
              <Lightbulb className="w-7 h-7 sm:w-8 sm:h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-2xl font-bold text-white">اقتراحات وتطوير التطبيق</h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  تصويت وتقييم المستخدمين
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
                متابعة أفكار ومقترحات الخدام والمخدومين لتطوير كرمتي، مرتبة من الأكثر تقييماً وتصويتاً، مع إمكانية الرد الرسمي وتحديث حالة كل فكرة.
              </p>
            </div>
          </div>

          <button
            onClick={fetchSuggestions}
            disabled={isLoading}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium flex items-center justify-center gap-2 transition-all shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>تحديث الاقتراحات</span>
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* 2. Top Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">إجمالي الاقتراحات</span>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Lightbulb className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white tracking-tight">{stats.total}</span>
            <span className="text-xs text-slate-400 font-medium">فكرة مطروحة</span>
          </div>
          <p className="mt-2 text-xs text-slate-400">إجمالي {stats.totalVotes} صوت وتأييد</p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">قيد المراجعة</span>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-amber-400 tracking-tight">{stats.underReview}</span>
            <span className="text-xs text-slate-400 font-medium">بانتظار دراسة الإدارة</span>
          </div>
          <p className="mt-2 text-xs text-slate-400">أفكار مقترحة حديثاً</p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">قيد التنفيذ والجدولة</span>
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-purple-400 tracking-tight">{stats.inProgress}</span>
            <span className="text-xs text-slate-400 font-medium">ضمن خطة التطوير</span>
          </div>
          <p className="mt-2 text-xs text-slate-400">يجري العمل على إضافتها</p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">تم تنفيذها بنجاح</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-emerald-400 tracking-tight">{stats.completed}</span>
            <span className="text-xs text-slate-400 font-medium">ميزة أصبحت حية</span>
          </div>
          <p className="mt-2 text-xs text-slate-400">تم إضافتها لتطبيق كرمتي</p>
        </div>
      </div>

      {/* 3. Controls & Filter Bar */}
      <div className="glass-panel p-4 rounded-2xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Tabs */}
          <div className="flex bg-slate-900/90 p-1 rounded-xl border border-slate-800 overflow-x-auto max-w-full">
            {[
              { id: 'all', label: 'الكل' },
              { id: 'under_review', label: 'قيد المراجعة' },
              { id: 'in_progress', label: 'قيد التنفيذ' },
              { id: 'completed', label: 'تم التنفيذ' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  statusFilter === tab.id
                    ? 'bg-brand-600 text-white shadow-sm font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Sort Toggle */}
          <button
            onClick={() => setSortBy(prev => prev === 'upvotes' ? 'newest' : 'upvotes')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 text-xs font-semibold transition-all whitespace-nowrap"
            title="تغيير طريقة الترتيب"
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-amber-400" />
            <span>{sortBy === 'upvotes' ? 'الترتيب: الأعلى تقييماً' : 'الترتيب: الأحدث تاريخاً'}</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث في عنوان الاقتراح أو المحتوى..."
            className="w-full bg-slate-900 text-xs text-slate-200 placeholder-slate-500 rounded-xl pr-10 pl-4 py-2.5 border border-slate-800 focus:outline-none focus:border-brand-500 transition-all"
          />
        </div>
      </div>

      {/* 4. Suggestions Cards List */}
      {isLoading ? (
        <div className="py-16 text-center text-slate-400">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-brand-400" />
          <p className="text-xs">جاري تحميل الاقتراحات والتصويتات...</p>
        </div>
      ) : filteredSuggestions.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
          <Lightbulb className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-300">لا توجد اقتراحات مطابقة في هذا الفلتر</p>
          <p className="text-xs text-slate-500 mt-1">أي اقتراح يطرحه المستخدمون من التطبيق سيظهر هنا فوراً في الوقت الحقيقي.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredSuggestions.map((s, index) => {
            const stCfg = statusConfig[s.status] || statusConfig.under_review;

            return (
              <div 
                key={s.id}
                className="bg-slate-900/80 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-lg transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  {/* Left: Upvotes Counter Pill */}
                  <div className="flex items-start gap-4">
                    <div className="flex flex-col items-center justify-center p-3 sm:p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/80 text-amber-400 min-w-[64px] shrink-0">
                      <ThumbsUp className="w-5 h-5 mb-1 fill-amber-400/20" />
                      <span className="text-base sm:text-lg font-black tracking-tight">{s.upvotes_count || 0}</span>
                      <span className="text-[10px] text-slate-400 font-medium">صوت</span>
                    </div>

                    {/* Content */}
                    <div className="space-y-2 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700/60">
                          #{index + 1}
                        </span>
                        <h3 className="text-sm sm:text-base font-bold text-white">
                          {s.title}
                        </h3>
                        <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                          {s.category || 'عام'}
                        </span>
                      </div>

                      <p className="text-xs sm:text-sm text-slate-300 leading-relaxed whitespace-pre-line">
                        {s.description}
                      </p>

                      {/* Author Info */}
                      <div className="flex items-center gap-3 text-xs text-slate-400 pt-1">
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-300">
                            {s.user_avatar ? (
                              <img src={s.user_avatar} alt="" className="w-full h-full rounded-full object-cover" />
                            ) : (
                              s.user_name.charAt(0) || 'م'
                            )}
                          </div>
                          <span className="text-slate-300 font-medium">{s.user_name}</span>
                        </div>
                        <span>•</span>
                        <span>{new Date(s.created_at).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                      </div>

                      {/* Official Admin Response */}
                      {s.admin_response && (
                        <div className="mt-3 p-3.5 rounded-xl bg-brand-950/40 border border-brand-500/30 text-xs space-y-1">
                          <div className="flex items-center gap-1.5 font-bold text-brand-400">
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>رد إدارة تطبيق كرمتي:</span>
                          </div>
                          <p className="text-slate-200 leading-relaxed">
                            {s.admin_response}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Controls: Status & Actions */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                    {/* Status Dropdown */}
                    <div className="flex items-center gap-1.5">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${stCfg.bg} ${stCfg.color} ${stCfg.border}`}>
                        {stCfg.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Change Status Select */}
                      <select
                        value={s.status}
                        onChange={(e) => handleUpdateStatus(s.id, e.target.value as AppSuggestion['status'])}
                        className="bg-slate-800 text-slate-200 text-xs rounded-xl px-2.5 py-1.5 border border-slate-700 focus:outline-none focus:border-brand-500"
                        title="تغيير حالة الاقتراح"
                      >
                        <option value="under_review">قيد المراجعة</option>
                        <option value="planned">مجدول للتنفيذ</option>
                        <option value="in_progress">جاري التنفيذ</option>
                        <option value="completed">تم التنفيذ</option>
                        <option value="declined">اعتذار</option>
                      </select>

                      {/* Admin Response Button */}
                      <button
                        onClick={() => {
                          setSelectedSuggestion(s);
                          setAdminResponseText(s.admin_response || '');
                        }}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-brand-400 border border-slate-700 transition-colors"
                        title="كتابة رد إدارة رسمي"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </button>

                      {/* Delete Button */}
                      <button
                        onClick={() => handleDeleteSuggestion(s.id, s.title)}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-700 transition-colors"
                        title="حذف الاقتراح"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. Admin Response Dialog Modal */}
      {selectedSuggestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-brand-400" />
                الرد الرسمي للإدارة على الاقتراح
              </h3>
              <button
                onClick={() => setSelectedSuggestion(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/60 text-xs">
              <p className="font-bold text-white mb-1">{selectedSuggestion.title}</p>
              <p className="text-slate-300 line-clamp-2">{selectedSuggestion.description}</p>
            </div>

            <form onSubmit={handleSaveResponse} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  نص رد الإدارة (سيظهر لجميع المستخدمين في التطبيق) *
                </label>
                <textarea
                  required
                  rows={4}
                  value={adminResponseText}
                  onChange={(e) => setAdminResponseText(e.target.value)}
                  placeholder="مثال: شكراً لاقتراحك المميز، تم إدراج هذه الميزة ضمن خطة التحديث القادم..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-brand-500 placeholder-slate-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedSuggestion(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSavingResponse}
                  className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shadow-lg shadow-brand-600/30 transition-all flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSavingResponse ? 'جاري الحفظ...' : 'حفظ ونشر الرد'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
