import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  UploadCloud, 
  FileText, 
  Check, 
  Trash2, 
  ExternalLink, 
  Eye, 
  Save, 
  Sparkles, 
  AlertCircle,
  RefreshCw,
  Search,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { supabase } from '../lib/supabase';

export interface StageCurriculum {
  id: string;
  stage_code: string;
  name: string;
  pdf_url: string | null;
  pdf_title: string | null;
  sort_order?: number;
}

const STAGES_CONFIG = [
  { id: 'kg', code: 'kg', name: 'مرحلة حضانة', icon: '👶', subtitle: 'قصص كتابية وأنشطة وتلوين للأطفال' },
  { id: 'prim_1_2', code: 'prim_1_2', name: 'مرحلة أولى وثانية ابتدائي', icon: '🎒', subtitle: 'دروس تمهيدية وعقيدة مبسطة' },
  { id: 'prim_3_4', code: 'prim_3_4', name: 'مرحلة ثالثة ورابعة ابتدائي', icon: '📖', subtitle: 'شخصيات العهد القديم والجديد والطقس' },
  { id: 'prim_5_6', code: 'prim_5_6', name: 'مرحلة خامسة وسادسة ابتدائي', icon: '📚', subtitle: 'دراسات كتابية وسير القديسين والطقوس' },
  { id: 'prep_sec', code: 'prep_sec', name: 'مرحلة إعدادي وثانوي', icon: '🎓', subtitle: 'عقيدة أورثوذكسية وتاريخ كنيسة وحياة روحية' },
  { id: 'uni', code: 'uni', name: 'مرحلة جامعة وخريجين', icon: '🏛️', subtitle: 'أبحاث ودراسات لاهوتية وخدمة متقدمة' },
];

export const CurriculumView: React.FC = () => {
  const [stages, setStages] = useState<Record<string, StageCurriculum>>({});
  const [loading, setLoading] = useState(true);
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const [savingFor, setSavingFor] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'uploaded' | 'missing'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Title edit buffer
  const [titles, setTitles] = useState<Record<string, string>>({});

  const fetchStages = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('sunday_school_stages')
        .select('id, stage_code, name, pdf_url, pdf_title, sort_order')
        .order('sort_order', { ascending: true });

      if (error) throw error;

      if (data) {
        const stageMap: Record<string, StageCurriculum> = {};
        const titleMap: Record<string, string> = {};

        data.forEach((row: any) => {
          const code = row.stage_code || row.id;
          stageMap[code] = row;
          titleMap[code] = row.pdf_title || `منهج ${row.name} - مدارس الأحد`;
        });

        // Ensure all 6 config stages exist in map
        STAGES_CONFIG.forEach((cfg) => {
          if (!stageMap[cfg.code]) {
            stageMap[cfg.code] = {
              id: cfg.id,
              stage_code: cfg.code,
              name: cfg.name,
              pdf_url: null,
              pdf_title: null,
            };
            titleMap[cfg.code] = `منهج ${cfg.name} - مدارس الأحد`;
          }
        });

        setStages(stageMap);
        setTitles(titleMap);
      }
    } catch (err: any) {
      console.error('Error fetching stages:', err);
      setErrorMessage('فشل في جلب بيانات المناهج: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStages();

    // Subscribe to realtime updates on sunday_school_stages
    const channel = supabase
      .channel('stages-curriculum-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sunday_school_stages' }, () => {
        fetchStages();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleUploadFile = async (stageCode: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      alert('يرجى اختيار ملف بصيغة PDF فقط');
      return;
    }

    setUploadingFor(stageCode);
    setErrorMessage(null);

    try {
      const cleanFileName = `${stageCode}_${Date.now()}.pdf`;
      const filePath = `curricula/${cleanFileName}`;

      // 1. Upload to Supabase Storage Bucket
      const { error: uploadErr } = await supabase.storage
        .from('curriculum_pdfs')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadErr) throw uploadErr;

      // 2. Get Public URL
      const { data: urlData } = supabase.storage
        .from('curriculum_pdfs')
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;
      const currentTitle = titles[stageCode]?.trim() || `منهج ${stages[stageCode]?.name || stageCode} - مدارس الأحد`;

      // 3. Update Database Record Immediately
      const { error: updateErr } = await supabase
        .from('sunday_school_stages')
        .update({
          pdf_url: publicUrl,
          pdf_title: currentTitle,
        })
        .eq('stage_code', stageCode);

      if (updateErr) throw updateErr;

      // Update local state
      setStages((prev) => ({
        ...prev,
        [stageCode]: {
          ...prev[stageCode],
          pdf_url: publicUrl,
          pdf_title: currentTitle,
        },
      }));

      const stageName = stages[stageCode]?.name || STAGES_CONFIG.find(s => s.code === stageCode)?.name || stageCode;
      setSuccessMessage(`تم رفع وتفعيل منهج (${stageName}) بنجاح! سيظهر للمستخدمين في التطبيق خيار التحميل والقراءة الفورية.`);
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      console.error('Upload error:', err);
      setErrorMessage('خطأ أثناء رفع الملف: ' + err.message);
    } finally {
      setUploadingFor(null);
      e.target.value = '';
    }
  };

  const handleSaveTitle = async (stageCode: string) => {
    setSavingFor(stageCode);
    setErrorMessage(null);
    try {
      const titleToSave = titles[stageCode]?.trim() || '';
      const { error } = await supabase
        .from('sunday_school_stages')
        .update({ pdf_title: titleToSave })
        .eq('stage_code', stageCode);

      if (error) throw error;

      setStages((prev) => ({
        ...prev,
        [stageCode]: {
          ...prev[stageCode],
          pdf_title: titleToSave,
        },
      }));

      setSuccessMessage('تم حفظ عنوان المنهج بنجاح');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setErrorMessage('فشل في حفظ العنوان: ' + err.message);
    } finally {
      setSavingFor(null);
    }
  };

  const handleDeletePdf = async (stageCode: string, stageName: string) => {
    if (!confirm(`هل أنت متأكد من إزالة ملف الـ PDF لمرحلة (${stageName}) من التطبيق؟`)) {
      return;
    }

    setSavingFor(stageCode);
    try {
      const { error } = await supabase
        .from('sunday_school_stages')
        .update({
          pdf_url: null,
          pdf_title: null,
        })
        .eq('stage_code', stageCode);

      if (error) throw error;

      setStages((prev) => ({
        ...prev,
        [stageCode]: {
          ...prev[stageCode],
          pdf_url: null,
          pdf_title: null,
        },
      }));

      setSuccessMessage(`تم حذف ملف منهج (${stageName}) من التطبيق بنجاح.`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setErrorMessage('فشل في إزالة الملف: ' + err.message);
    } finally {
      setSavingFor(null);
    }
  };

  // Stats
  const totalStages = STAGES_CONFIG.length;
  const uploadedCount = STAGES_CONFIG.filter((s) => !!stages[s.code]?.pdf_url).length;
  const missingCount = totalStages - uploadedCount;

  // Filtered stages
  const filteredStages = STAGES_CONFIG.filter((s) => {
    const stageData = stages[s.code];
    const hasPdf = !!stageData?.pdf_url;

    if (filter === 'uploaded' && !hasPdf) return false;
    if (filter === 'missing' && hasPdf) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = s.name.toLowerCase().includes(q);
      const matchTitle = (stageData?.pdf_title || '').toLowerCase().includes(q);
      const matchSub = s.subtitle.toLowerCase().includes(q);
      return matchName || matchTitle || matchSub;
    }

    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-brand-500/25">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>إدارة المناهج والدروس (ملفات PDF)</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-brand-500/20 text-brand-300 font-semibold">
                مزامنة حية مع الموبايل
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              ارفع ملف الـ PDF الخاص بكل مرحلة عمرية. يظهر في التطبيق فوراً بدون دمجه بالـ APK مع خيار التحميل والحفظ أوفلاين والقراءة في نفس الصفحة.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchStages}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition-all"
            title="تحديث البيانات من السحابة"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-brand-400' : ''}`} />
            <span>تحديث</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-2.5 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold flex items-center gap-2.5 animate-fadeIn">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400">إجمالي المراحل العمرية</p>
            <p className="text-2xl font-bold text-white mt-1">{totalStages} مراحل</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-800 text-slate-300">
            <BookOpen className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400">المناهج المرفوعة والجاهزة</p>
            <p className="text-2xl font-bold text-emerald-400 mt-1">{uploadedCount} من {totalStages}</p>
          </div>
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400">
            <Check className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400">مراحل بحاجة لرفع المنهج</p>
            <p className="text-2xl font-bold text-amber-400 mt-1">{missingCount} مراحل</p>
          </div>
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400">
            <Clock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              filter === 'all'
                ? 'bg-brand-600 text-white shadow-md shadow-brand-600/25'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            كل المراحل ({totalStages})
          </button>
          <button
            onClick={() => setFilter('uploaded')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              filter === 'uploaded'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            تم رفع الـ PDF ({uploadedCount})
          </button>
          <button
            onClick={() => setFilter('missing')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              filter === 'missing'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/25'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            بانتظار الرفع ({missingCount})
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث عن مرحلة..."
            className="w-full bg-slate-900 text-xs text-white placeholder-slate-500 rounded-xl pr-9 pl-3 py-2 border border-slate-800 focus:outline-none focus:border-brand-500"
          />
        </div>
      </div>

      {/* Stages Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredStages.map((cfg) => {
          const stageData = stages[cfg.code];
          const hasPdf = !!stageData?.pdf_url;
          const isUploading = uploadingFor === cfg.code;
          const isSaving = savingFor === cfg.code;

          return (
            <div 
              key={cfg.code}
              className={`glass-panel p-5 rounded-2xl border transition-all duration-200 flex flex-col justify-between ${
                hasPdf ? 'border-slate-800 bg-slate-900/60' : 'border-amber-500/20 bg-amber-500/[0.02]'
              }`}
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-slate-800 flex items-center justify-center text-xl shadow-inner">
                      {cfg.icon}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <span>{cfg.name}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 font-mono">
                          {cfg.code}
                        </span>
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">{cfg.subtitle}</p>
                    </div>
                  </div>

                  <div>
                    {hasPdf ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        مرفوع ويعمل ⚡
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[11px] font-bold">
                        لم يتم الرفع
                      </span>
                    )}
                  </div>
                </div>

                {/* Title Input */}
                <div className="space-y-1.5 mb-4">
                  <label className="block text-[11px] font-semibold text-slate-400">
                    عنوان أو وصف منهج هذه المرحلة:
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={titles[cfg.code] ?? `منهج ${cfg.name} - مدارس الأحد`}
                      onChange={(e) => setTitles({ ...titles, [cfg.code]: e.target.value })}
                      placeholder={`منهج ${cfg.name}`}
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-brand-500"
                    />
                    <button
                      onClick={() => handleSaveTitle(cfg.code)}
                      disabled={isSaving}
                      className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1 transition-all disabled:opacity-50"
                      title="حفظ العنوان"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{isSaving ? '...' : 'حفظ'}</span>
                    </button>
                  </div>
                </div>

                {/* PDF State Box */}
                {hasPdf ? (
                  <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="w-4 h-4 text-brand-400 shrink-0" />
                        <span className="text-slate-300 font-medium truncate max-w-[200px]" title={stageData?.pdf_url || ''}>
                          {stageData?.pdf_url?.split('/').pop() || 'curriculum.pdf'}
                        </span>
                      </div>
                      <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-md">
                        جاهز للتحميل
                      </span>
                    </div>

                    <div className="flex items-center gap-2 pt-1 border-t border-slate-800/60">
                      <a
                        href={stageData.pdf_url!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-all"
                      >
                        <Eye className="w-3.5 h-3.5 text-brand-400" />
                        <span>معاينة الـ PDF</span>
                        <ExternalLink className="w-3 h-3 text-slate-500" />
                      </a>

                      <label className="flex-1 cursor-pointer flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-brand-600/20 hover:bg-brand-600/30 text-brand-300 text-xs font-medium transition-all">
                        <UploadCloud className="w-3.5 h-3.5" />
                        <span>{isUploading ? 'جارٍ الرفع...' : 'استبدال بملف آخر'}</span>
                        <input
                          type="file"
                          accept="application/pdf,.pdf"
                          disabled={isUploading}
                          onChange={(e) => handleUploadFile(cfg.code, e)}
                          className="hidden"
                        />
                      </label>

                      <button
                        onClick={() => handleDeletePdf(cfg.code, cfg.name)}
                        disabled={isSaving}
                        className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-all"
                        title="إزالة الـ PDF من هذه المرحلة"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Upload Drop Box */
                  <label className="cursor-pointer block p-5 rounded-xl border border-dashed border-slate-700 hover:border-brand-500/50 bg-slate-950/40 hover:bg-brand-500/[0.03] transition-all text-center group">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="w-10 h-10 rounded-full bg-slate-800 group-hover:bg-brand-600/20 group-hover:text-brand-400 text-slate-400 flex items-center justify-center transition-colors">
                        <UploadCloud className={`w-5 h-5 ${isUploading ? 'animate-bounce text-brand-400' : ''}`} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white group-hover:text-brand-300 transition-colors">
                          {isUploading ? 'جارٍ رفع ملف الـ PDF وحفظه...' : 'اضغط لاختيار ملف PDF من جهازك'}
                        </p>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          يتم رفعه وحفظه فوراً في سحابة التطبيق لمرحلة ({cfg.name})
                        </p>
                      </div>
                    </div>
                    <input
                      type="file"
                      accept="application/pdf,.pdf"
                      disabled={isUploading}
                      onChange={(e) => handleUploadFile(cfg.code, e)}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* Bottom Card Footer */}
              <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500">
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-gold-400" />
                  <span>تطبيق كرامتي للموبايل</span>
                </span>
                <span>
                  {hasPdf ? 'مفعل وجاهز للتنزيل للمستخدمين' : 'غير متوفر حالياً في التطبيق'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Info Notice Card */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-800 bg-slate-900/40 text-xs text-slate-400 space-y-2">
        <h4 className="font-bold text-white flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-brand-400" />
          <span>كيف تعمل ميزة مناهج الـ PDF في تطبيق الموبايل؟</span>
        </h4>
        <ul className="space-y-1 text-slate-400 list-disc list-inside leading-relaxed text-[11.5px]">
          <li><strong>حجم التطبيق خفيف (غير مدمج):</strong> ملفات الـ PDF لا يتم تضمينها داخل حزمة تطبيق الهاتف APK لتوفير المساحة، وإنما تُجلب من سحابة Supabase التخزينية فور رفعها هنا.</li>
          <li><strong>تجربة المستخدم:</strong> عندما يفتح المخدوم أو الخادم تبويب "المناهج والدروس" في مرحلته، يظهر له كارت أنيق لتحميل المنهج مع شريط التقدم، ثم يُعرض مباشرة داخل نفس الصفحة بدون الحاجة لمغادرة التطبيق.</li>
          <li><strong>القراءة أوفلاين:</strong> يتم حفظ الملف تلقائياً في ذاكرة هاتف المستخدم ليعمل دائماً حتى عند عدم وجود اتصال بالإنترنت.</li>
        </ul>
      </div>
    </div>
  );
};
