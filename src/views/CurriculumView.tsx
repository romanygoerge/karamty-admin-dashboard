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
  Clock,
  Plus,
  X,
  Edit2,
  Layers,
  FolderOpen,
  ArrowUp,
  ArrowDown,
  Files
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

export interface CurriculumPdfLesson {
  id: string;
  stage_id?: string;
  stage_code: string;
  title: string;
  pdf_url: string;
  file_name?: string | null;
  file_size?: string | null;
  week_number?: string | null;
  sort_order?: number;
  created_at?: string;
}

const STAGES_CONFIG = [
  { id: '11111111-0000-0000-0000-000000000001', code: 'kg', name: 'مرحلة حضانة', icon: '👶', subtitle: 'قصص كتابية وأنشطة وتلوين للأطفال' },
  { id: '11111111-0000-0000-0000-000000000002', code: 'prim_1_2', name: 'مرحلة أولى وثانية ابتدائي', icon: '🎒', subtitle: 'دروس تمهيدية وعقيدة مبسطة' },
  { id: '11111111-0000-0000-0000-000000000003', code: 'prim_3_4', name: 'مرحلة ثالثة ورابعة ابتدائي', icon: '📖', subtitle: 'شخصيات العهد القديم والجديد والطقس' },
  { id: '11111111-0000-0000-0000-000000000004', code: 'prim_5_6', name: 'مرحلة خامسة وسادسة ابتدائي', icon: '📚', subtitle: 'دراسات كتابية وسير القديسين والطقوس' },
  { id: '11111111-0000-0000-0000-000000000005', code: 'prep_sec', name: 'مرحلة إعدادي وثانوي', icon: '🎓', subtitle: 'عقيدة أورثوذكسية وتاريخ كنيسة وحياة روحية' },
  { id: '11111111-0000-0000-0000-000000000006', code: 'uni', name: 'مرحلة جامعة وخريجين', icon: '🏛️', subtitle: 'أبحاث ودراسات لاهوتية وخدمة متقدمة' },
];

export const CurriculumView: React.FC = () => {
  const [stages, setStages] = useState<Record<string, StageCurriculum>>({});
  const [lessons, setLessons] = useState<CurriculumPdfLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStageFilter, setSelectedStageFilter] = useState<'all' | string>('all');

  // Add Lesson Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [targetStageCode, setTargetStageCode] = useState('kg');
  const [newLessonTitle, setNewLessonTitle] = useState('');
  const [newLessonWeek, setNewLessonWeek] = useState('');
  const [newLessonUrl, setNewLessonUrl] = useState('');
  const [selectedPdfFiles, setSelectedPdfFiles] = useState<File[]>([]);
  const [isSubmittingLesson, setIsSubmittingLesson] = useState(false);
  const [quickUploadingStage, setQuickUploadingStage] = useState<string | null>(null);
  const [uploadProgressText, setUploadProgressText] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);

  // Edit Lesson State
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [editingLessonTitle, setEditingLessonTitle] = useState('');
  const [editingLessonWeek, setEditingLessonWeek] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Stages
      const { data: stagesData, error: stagesError } = await supabase
        .from('sunday_school_stages')
        .select('id, stage_code, name, pdf_url, pdf_title, sort_order')
        .order('sort_order', { ascending: true });

      if (stagesError) throw stagesError;

      const stageMap: Record<string, StageCurriculum> = {};
      if (stagesData) {
        stagesData.forEach((row: any) => {
          const code = row.stage_code || row.id;
          stageMap[code] = row;
        });
      }

      STAGES_CONFIG.forEach((cfg) => {
        if (!stageMap[cfg.code]) {
          stageMap[cfg.code] = {
            id: cfg.id,
            stage_code: cfg.code,
            name: cfg.name,
            pdf_url: null,
            pdf_title: null,
          };
        }
      });
      setStages(stageMap);

      // 2. Fetch Multiple Curriculum Lessons
      const { data: lessonsData, error: lessonsError } = await supabase
        .from('sunday_school_curriculum_lessons')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });

      if (lessonsError) throw lessonsError;

      if (lessonsData) {
        setLessons(lessonsData);
      }
    } catch (err: any) {
      console.error('Error fetching curriculum data:', err);
      setErrorMessage('فشل في جلب بيانات المناهج: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Subscribe to realtime updates on both tables
    const channel = supabase
      .channel('multi-curriculum-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sunday_school_curriculum_lessons' }, () => {
        fetchData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sunday_school_stages' }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const openAddModal = (stageCode?: string) => {
    if (stageCode) {
      setTargetStageCode(stageCode);
    }
    const currentStageLessons = lessons.filter(l => l.stage_code === (stageCode || targetStageCode));
    const nextLessonNum = currentStageLessons.length + 1;
    setNewLessonTitle(`الدرس ${nextLessonNum}`);
    setNewLessonWeek(`الدرس ${nextLessonNum}`);
    setNewLessonUrl('');
    setSelectedPdfFiles([]);
    setIsAddModalOpen(true);
  };

  const handleCreateLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLessonTitle.trim()) {
      alert('يرجى إدخال عنوان للدرس');
      return;
    }

    if (selectedPdfFiles.length === 0 && !newLessonUrl.trim()) {
      alert('يرجى اختيار ملف PDF للرفع أو إدخال رابط مباشر');
      return;
    }

    setIsSubmittingLesson(true);
    setErrorMessage(null);
    setUploadProgressText(null);

    try {
      const stageObj = STAGES_CONFIG.find(s => s.code === targetStageCode);
      const stageId = stages[targetStageCode]?.id || stageObj?.id;
      let currentLessonsCount = lessons.filter(l => l.stage_code === targetStageCode).length;

      // Case A: Multiple PDF Files Selected in Modal
      if (selectedPdfFiles.length > 1) {
        let successCount = 0;
        for (let i = 0; i < selectedPdfFiles.length; i++) {
          const file = selectedPdfFiles[i];
          setUploadProgressText(`جارٍ رفع ${i + 1} من ${selectedPdfFiles.length}: (${file.name})...`);

          const cleanFileName = `${targetStageCode}_lesson_${Date.now()}_${i + 1}.pdf`;
          const filePath = `curricula/${cleanFileName}`;

          const { error: uploadErr } = await supabase.storage
            .from('curriculum_pdfs')
            .upload(filePath, file, {
              cacheControl: '3600',
              upsert: true,
            });

          if (uploadErr) {
            console.error(`Upload error for ${file.name}:`, uploadErr);
            continue;
          }

          const { data: urlData } = supabase.storage
            .from('curriculum_pdfs')
            .getPublicUrl(filePath);

          currentLessonsCount++;
          const autoTitle = file.name.replace(/\.[^/.]+$/, '').trim() || `${newLessonTitle.trim()} - الجزء ${i + 1}`;
          const fileSize = `${(file.size / (1024 * 1024)).toFixed(2)} MB`;

          const { error: insertErr } = await supabase
            .from('sunday_school_curriculum_lessons')
            .insert({
              stage_id: stageId,
              stage_code: targetStageCode,
              title: autoTitle,
              pdf_url: urlData.publicUrl,
              file_name: file.name,
              file_size: fileSize,
              week_number: `الدرس ${currentLessonsCount}`,
              sort_order: currentLessonsCount,
            });

          if (!insertErr) {
            successCount++;
            if (!stages[targetStageCode]?.pdf_url) {
              await supabase
                .from('sunday_school_stages')
                .update({ pdf_url: urlData.publicUrl, pdf_title: autoTitle })
                .eq('stage_code', targetStageCode);
            }
          }
        }

        setSuccessMessage(`تم بنجاح رفع وإضافة ${successCount} دروس لمرحلة (${stageObj?.name || targetStageCode})!`);
        setTimeout(() => setSuccessMessage(null), 5000);
        setIsAddModalOpen(false);
        fetchData();
        return;
      }

      // Case B: Single File or Direct URL
      let finalPdfUrl = newLessonUrl.trim();
      let fileName: string | null = null;
      let fileSize: string | null = null;

      if (selectedPdfFiles.length === 1) {
        const file = selectedPdfFiles[0];
        fileName = file.name;
        fileSize = `${(file.size / (1024 * 1024)).toFixed(2)} MB`;

        const cleanFileName = `${targetStageCode}_lesson_${Date.now()}.pdf`;
        const filePath = `curricula/${cleanFileName}`;

        const { error: uploadErr } = await supabase.storage
          .from('curriculum_pdfs')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: true,
          });

        if (uploadErr) throw uploadErr;

        const { data: urlData } = supabase.storage
          .from('curriculum_pdfs')
          .getPublicUrl(filePath);

        finalPdfUrl = urlData.publicUrl;
      }

      currentLessonsCount++;

      const { error: insertErr } = await supabase
        .from('sunday_school_curriculum_lessons')
        .insert({
          stage_id: stageId,
          stage_code: targetStageCode,
          title: newLessonTitle.trim(),
          pdf_url: finalPdfUrl,
          file_name: fileName,
          file_size: fileSize,
          week_number: newLessonWeek.trim() || `الدرس ${currentLessonsCount}`,
          sort_order: currentLessonsCount,
        });

      if (insertErr) throw insertErr;

      // Keep sunday_school_stages fallback in sync
      if (!stages[targetStageCode]?.pdf_url) {
        await supabase
          .from('sunday_school_stages')
          .update({
            pdf_url: finalPdfUrl,
            pdf_title: newLessonTitle.trim(),
          })
          .eq('stage_code', targetStageCode);
      }

      setSuccessMessage(`تمت إضافة الدرس "${newLessonTitle.trim()}" بنجاح! سيظهر للمستخدمين في التطبيق فوراً.`);
      setTimeout(() => setSuccessMessage(null), 5000);

      setIsAddModalOpen(false);
      fetchData();
    } catch (err: any) {
      console.error('Error creating lesson:', err);
      setErrorMessage('فشل في إضافة الدرس: ' + (err.message || err));
    } finally {
      setIsSubmittingLesson(false);
      setUploadProgressText(null);
    }
  };

  const handleUploadFilesForStage = async (stageCode: string, files: FileList | File[]) => {
    const pdfFiles = Array.from(files).filter(
      (f) => f.name.toLowerCase().endsWith('.pdf') || f.type === 'application/pdf'
    );

    if (pdfFiles.length === 0) {
      alert('يرجى اختيار ملفات بصيغة PDF فقط');
      return;
    }

    setQuickUploadingStage(stageCode);
    setErrorMessage(null);

    const stageObj = STAGES_CONFIG.find((s) => s.code === stageCode);
    const stageId = stages[stageCode]?.id || stageObj?.id;
    let currentCount = lessons.filter((l) => l.stage_code === stageCode).length;

    let successCount = 0;
    try {
      for (let i = 0; i < pdfFiles.length; i++) {
        const file = pdfFiles[i];
        setUploadProgressText(`جارٍ رفع ${i + 1} من ${pdfFiles.length}: (${file.name})...`);

        const cleanFileName = `${stageCode}_lesson_${Date.now()}_${i + 1}.pdf`;
        const filePath = `curricula/${cleanFileName}`;

        const { error: uploadErr } = await supabase.storage
          .from('curriculum_pdfs')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: true,
          });

        if (uploadErr) {
          console.error(`Error uploading ${file.name}:`, uploadErr);
          continue;
        }

        const { data: urlData } = supabase.storage
          .from('curriculum_pdfs')
          .getPublicUrl(filePath);

        const finalPdfUrl = urlData.publicUrl;
        currentCount++;
        const autoTitle = file.name.replace(/\.[^/.]+$/, '').trim() || `الدرس ${currentCount}`;
        const fileSize = `${(file.size / (1024 * 1024)).toFixed(2)} MB`;

        const { error: insertErr } = await supabase
          .from('sunday_school_curriculum_lessons')
          .insert({
            stage_id: stageId,
            stage_code: stageCode,
            title: autoTitle,
            pdf_url: finalPdfUrl,
            file_name: file.name,
            file_size: fileSize,
            week_number: `الدرس ${currentCount}`,
            sort_order: currentCount,
          });

        if (insertErr) {
          console.error(`Error inserting lesson ${autoTitle}:`, insertErr);
        } else {
          successCount++;
          if (currentCount === 1 || !stages[stageCode]?.pdf_url) {
            await supabase
              .from('sunday_school_stages')
              .update({
                pdf_url: finalPdfUrl,
                pdf_title: autoTitle,
              })
              .eq('stage_code', stageCode);
          }
        }
      }

      if (successCount > 0) {
        setSuccessMessage(`تم بنجاح رفع وإضافة ${successCount} درس PDF لمرحلة (${stageObj?.name || stageCode})! ستظهر في التطبيق فوراً.`);
        setTimeout(() => setSuccessMessage(null), 5000);
        fetchData();
      } else {
        setErrorMessage('تعذر رفع الملفات المحددة، يرجى المحاولة مرة أخرى.');
      }
    } catch (err: any) {
      console.error('Multi upload error:', err);
      setErrorMessage('خطأ أثناء الرفع: ' + (err.message || err));
    } finally {
      setQuickUploadingStage(null);
      setUploadProgressText(null);
    }
  };

  const handleMoveLesson = async (lesson: CurriculumPdfLesson, direction: 'up' | 'down') => {
    const stageLessons = lessons
      .filter((l) => l.stage_code === lesson.stage_code)
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

    const currentIndex = stageLessons.findIndex((l) => l.id === lesson.id);
    if (currentIndex === -1) return;

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= stageLessons.length) return;

    const targetLesson = stageLessons[targetIndex];
    const currentOrder = lesson.sort_order || currentIndex + 1;
    const targetOrder = targetLesson.sort_order || targetIndex + 1;

    try {
      await Promise.all([
        supabase.from('sunday_school_curriculum_lessons').update({ sort_order: targetOrder }).eq('id', lesson.id),
        supabase.from('sunday_school_curriculum_lessons').update({ sort_order: currentOrder }).eq('id', targetLesson.id),
      ]);
      fetchData();
    } catch (err: any) {
      console.error('Error reordering lessons:', err);
    }
  };

  const handleDeleteLesson = async (lesson: CurriculumPdfLesson) => {
    if (!confirm(`هل أنت متأكد من حذف الدرس "${lesson.title}"؟ سيتم حذفه من التطبيق وقاعدة البيانات نهائياً.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('sunday_school_curriculum_lessons')
        .delete()
        .eq('id', lesson.id);

      if (error) throw error;

      // Check if this was the last lesson, if so clear or update stages table
      const remainingForStage = lessons.filter(l => l.stage_code === lesson.stage_code && l.id !== lesson.id);
      if (remainingForStage.length === 0) {
        await supabase
          .from('sunday_school_stages')
          .update({ pdf_url: null, pdf_title: null })
          .eq('stage_code', lesson.stage_code);
      } else {
        await supabase
          .from('sunday_school_stages')
          .update({
            pdf_url: remainingForStage[0].pdf_url,
            pdf_title: remainingForStage[0].title,
          })
          .eq('stage_code', lesson.stage_code);
      }

      setSuccessMessage(`تم حذف الدرس "${lesson.title}" بنجاح.`);
      setTimeout(() => setSuccessMessage(null), 3000);
      fetchData();
    } catch (err: any) {
      setErrorMessage('فشل في حذف الدرس: ' + err.message);
    }
  };

  const handleStartEditLesson = (lesson: CurriculumPdfLesson) => {
    setEditingLessonId(lesson.id);
    setEditingLessonTitle(lesson.title);
    setEditingLessonWeek(lesson.week_number || '');
  };

  const handleSaveLessonEdit = async (lessonId: string) => {
    if (!editingLessonTitle.trim()) return;
    setIsSavingEdit(true);
    try {
      const { error } = await supabase
        .from('sunday_school_curriculum_lessons')
        .update({
          title: editingLessonTitle.trim(),
          week_number: editingLessonWeek.trim() || null,
        })
        .eq('id', lessonId);

      if (error) throw error;

      setEditingLessonId(null);
      setSuccessMessage('تم تحديث بيانات الدرس بنجاح');
      setTimeout(() => setSuccessMessage(null), 3000);
      fetchData();
    } catch (err: any) {
      setErrorMessage('فشل في حفظ التعديل: ' + err.message);
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Stats
  const totalStages = STAGES_CONFIG.length;
  const totalLessonsCount = lessons.length;
  const stagesWithLessonsCount = STAGES_CONFIG.filter(
    (s) => lessons.some((l) => l.stage_code === s.code)
  ).length;

  // Filtered Stages
  const filteredStages = STAGES_CONFIG.filter((s) => {
    if (selectedStageFilter !== 'all' && s.code !== selectedStageFilter) {
      return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = s.name.toLowerCase().includes(q);
      const matchSub = s.subtitle.toLowerCase().includes(q);
      const hasMatchingLesson = lessons.some(
        (l) => l.stage_code === s.code && l.title.toLowerCase().includes(q)
      );
      return matchName || matchSub || hasMatchingLesson;
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
              <span>إدارة مناهج ودروس مدارس الأحد (PDF)</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold">
                دعم رفع أكثر من درس لكل مرحلة
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              يمكنك هنا إضافة وإدارة دروس متعددة بصيغة PDF لكل مرحلة عمرية. الدروس تُحفظ في قاعدة البيانات وتظهر فوراً في تطبيق الموبايل مع إمكانية التنزيل والقراءة أوفلاين.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => openAddModal()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shadow-lg shadow-brand-600/25 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة درس PDF جديد</span>
          </button>

          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition-all"
            title="تحديث البيانات"
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
            <p className="text-xs font-medium text-slate-400">إجمالي دروس الـ PDF المرفوعة</p>
            <p className="text-2xl font-bold text-white mt-1">{totalLessonsCount} درس</p>
          </div>
          <div className="p-3 rounded-xl bg-brand-600/20 text-brand-400">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400">المراحل التي تحتوي على دروس</p>
            <p className="text-2xl font-bold text-emerald-400 mt-1">{stagesWithLessonsCount} من {totalStages}</p>
          </div>
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400">
            <Check className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400">متوسط الدروس لكل مرحلة</p>
            <p className="text-2xl font-bold text-gold-400 mt-1">
              {stagesWithLessonsCount > 0 ? (totalLessonsCount / stagesWithLessonsCount).toFixed(1) : '0'} درس
            </p>
          </div>
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400">
            <BookOpen className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setSelectedStageFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              selectedStageFilter === 'all'
                ? 'bg-brand-600 text-white shadow-md shadow-brand-600/25'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            كل المراحل ({totalLessonsCount})
          </button>
          {STAGES_CONFIG.map((s) => {
            const count = lessons.filter((l) => l.stage_code === s.code).length;
            return (
              <button
                key={s.code}
                onClick={() => setSelectedStageFilter(s.code)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1 ${
                  selectedStageFilter === s.code
                    ? 'bg-brand-600 text-white shadow-md shadow-brand-600/25'
                    : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <span>{s.name.replace('مرحلة ', '')}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800/80 text-slate-300">
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث بالاسم أو عنوان الدرس..."
            className="w-full bg-slate-900 text-xs text-white placeholder-slate-500 rounded-xl pr-9 pl-3 py-2 border border-slate-800 focus:outline-none focus:border-brand-500"
          />
        </div>
      </div>

      {/* Stages & Lessons Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredStages.map((cfg) => {
          const stageLessons = lessons.filter((l) => l.stage_code === cfg.code);
          const isQuickUploading = quickUploadingStage === cfg.code;

          return (
            <div 
              key={cfg.code}
              className="glass-panel p-5 rounded-2xl border border-slate-800 bg-slate-900/60 flex flex-col justify-between"
            >
              <div>
                {/* Stage Header */}
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

                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                      stageLessons.length > 0
                        ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                        : 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
                    }`}>
                      {stageLessons.length > 0 ? (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                          <span>{stageLessons.length} دروس PDF</span>
                        </>
                      ) : (
                        <span>لا توجد دروس بعد</span>
                      )}
                    </span>
                  </div>
                </div>

                {/* Lessons List Section */}
                <div className="space-y-2.5 mb-4">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                    <span className="flex items-center gap-1.5">
                      <FolderOpen className="w-3.5 h-3.5 text-brand-400" />
                      <span>قائمة الدروس المتاحة ({stageLessons.length}):</span>
                    </span>

                    <button
                      onClick={() => openAddModal(cfg.code)}
                      className="text-[11px] text-brand-400 hover:text-brand-300 font-bold flex items-center gap-1 transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      <span>إضافة درس</span>
                    </button>
                  </div>

                  {stageLessons.length === 0 ? (
                    <div className="p-4 rounded-xl border border-dashed border-slate-800 bg-slate-950/40 text-center space-y-2">
                      <p className="text-xs text-slate-500 font-medium">لم يتم رفع أي درس PDF لهذه المرحلة بعد</p>
                      <button
                        onClick={() => openAddModal(cfg.code)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600/20 hover:bg-brand-600/30 text-brand-300 text-xs font-semibold transition-all"
                      >
                        <Plus className="w-3 h-3" />
                        <span>إضافة أول درس الآن</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                      {stageLessons.map((lesson, idx) => {
                        const isEditingThis = editingLessonId === lesson.id;

                        return (
                          <div 
                            key={lesson.id}
                            className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 flex items-center justify-between gap-2.5 hover:border-slate-700 transition-all"
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              {/* Reorder Buttons */}
                              <div className="flex flex-col gap-0.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleMoveLesson(lesson, 'up')}
                                  disabled={idx === 0}
                                  className="p-0.5 rounded text-slate-500 hover:text-white disabled:opacity-20 hover:bg-slate-800 transition-colors"
                                  title="نقل لأعلى"
                                >
                                  <ArrowUp className="w-2.5 h-2.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleMoveLesson(lesson, 'down')}
                                  disabled={idx === stageLessons.length - 1}
                                  className="p-0.5 rounded text-slate-500 hover:text-white disabled:opacity-20 hover:bg-slate-800 transition-colors"
                                  title="نقل لأسفل"
                                >
                                  <ArrowDown className="w-2.5 h-2.5" />
                                </button>
                              </div>

                              <div className="w-7 h-7 rounded-lg bg-slate-800 text-brand-400 flex items-center justify-center text-xs font-bold shrink-0">
                                {idx + 1}
                              </div>

                              <div className="min-w-0 flex-1">
                                {isEditingThis ? (
                                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5 w-full">
                                    <input
                                      type="text"
                                      value={editingLessonTitle}
                                      onChange={(e) => setEditingLessonTitle(e.target.value)}
                                      placeholder="عنوان الدرس..."
                                      className="flex-1 bg-slate-900 border border-brand-500 rounded-lg px-2 py-1 text-xs text-white focus:outline-none"
                                      autoFocus
                                    />
                                    <input
                                      type="text"
                                      value={editingLessonWeek}
                                      onChange={(e) => setEditingLessonWeek(e.target.value)}
                                      placeholder="رقم الأسبوع..."
                                      className="w-24 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none"
                                    />
                                    <div className="flex items-center gap-1">
                                      <button
                                        type="button"
                                        onClick={() => handleSaveLessonEdit(lesson.id)}
                                        disabled={isSavingEdit}
                                        className="p-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[10px]"
                                        title="حفظ"
                                      >
                                        <Check className="w-3 h-3" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setEditingLessonId(null)}
                                        className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 text-[10px]"
                                        title="إلغاء"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    <p className="text-xs font-bold text-white truncate" title={lesson.title}>
                                      {lesson.title}
                                    </p>
                                    <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                                      {lesson.week_number && (
                                        <span className="px-1.5 py-0.2 rounded bg-slate-800 text-brand-300 font-semibold">
                                          {lesson.week_number}
                                        </span>
                                      )}
                                      {lesson.file_size && (
                                        <span>{lesson.file_size}</span>
                                      )}
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-1.5 shrink-0">
                              <a
                                href={lesson.pdf_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-brand-400 transition-all"
                                title="معاينة ملف الـ PDF"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </a>

                              <button
                                type="button"
                                onClick={() => handleStartEditLesson(lesson)}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all"
                                title="تعديل العنوان"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteLesson(lesson)}
                                className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-all"
                                title="حذف هذا الدرس"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Quick File Drop / Upload for this Stage */}
                <div className="pt-2">
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOverStage(cfg.code);
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      setDragOverStage(null);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragOverStage(null);
                      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                        handleUploadFilesForStage(cfg.code, e.dataTransfer.files);
                      }
                    }}
                    className={`relative rounded-xl border border-dashed transition-all p-3.5 text-center ${
                      dragOverStage === cfg.code
                        ? 'border-brand-400 bg-brand-500/10'
                        : 'border-slate-800 hover:border-brand-500/50 bg-slate-950/30 hover:bg-brand-500/[0.02]'
                    }`}
                  >
                    <label className="cursor-pointer block group">
                      <div className="flex items-center justify-center gap-2">
                        <UploadCloud className={`w-4 h-4 text-slate-400 group-hover:text-brand-400 ${isQuickUploading ? 'animate-bounce text-brand-400' : ''}`} />
                        <span className="text-xs font-semibold text-slate-300 group-hover:text-white">
                          {isQuickUploading 
                            ? (uploadProgressText || 'جارٍ رفع الملفات...') 
                            : 'رفع ملف أو عدة ملفات PDF معاً (أو اسحبها وأفلتها هنا)'}
                        </span>
                      </div>
                      <input
                        type="file"
                        multiple
                        accept="application/pdf,.pdf"
                        disabled={isQuickUploading}
                        onChange={(e) => {
                          if (e.target.files && e.target.files.length > 0) {
                            handleUploadFilesForStage(cfg.code, e.target.files);
                          }
                          e.target.value = '';
                        }}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Bottom Card Footer */}
              <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500">
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-gold-400" />
                  <span>تطبيق كرمتي للموبايل</span>
                </span>
                <span>
                  {stageLessons.length > 0 ? `${stageLessons.length} دروس مفعلة بالقائمة` : 'بانتظار إضافة دروس'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Lesson Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="glass-panel w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl p-6 space-y-5 animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-brand-600/20 text-brand-400 flex items-center justify-center">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">إضافة درس PDF جديد</h3>
                  <p className="text-[11px] text-slate-400">سيظهر في قائمة دروس المرحلة بتطبيق الموبايل</p>
                </div>
              </div>

              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateLesson} className="space-y-4">
              {/* Select Stage */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  المرحلة الدراسية
                </label>
                <select
                  value={targetStageCode}
                  onChange={(e) => setTargetStageCode(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-brand-500"
                >
                  {STAGES_CONFIG.map((s) => (
                    <option key={s.code} value={s.code}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Lesson Title */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  عنوان الدرس أو المنهج *
                </label>
                <input
                  type="text"
                  required
                  value={newLessonTitle}
                  onChange={(e) => setNewLessonTitle(e.target.value)}
                  placeholder="مثال: الدرس الأول: داود النبي ورعاية الخراف"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                />
              </div>

              {/* Week / Lesson Number */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  رقم الدرس أو الأسبوع (اختياري)
                </label>
                <input
                  type="text"
                  value={newLessonWeek}
                  onChange={(e) => setNewLessonWeek(e.target.value)}
                  placeholder="مثال: الدرس 1، الأسبوع الأول، ملزمة كيهك"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                />
              </div>

              {/* Upload PDF Box */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>ملف أو ملفات الـ PDF *</span>
                  <span className="text-[11px] text-brand-400 font-normal">يمكنك تحديد أكثر من ملف دفعة واحدة</span>
                </label>
                <div className="p-4 rounded-xl border border-dashed border-slate-700 bg-slate-950/60 text-center space-y-2">
                  <div className="flex items-center justify-center">
                    <FileText className="w-8 h-8 text-brand-400" />
                  </div>
                  <div>
                    {selectedPdfFiles.length > 1 ? (
                      <div className="space-y-1">
                        <div className="flex items-center justify-center gap-2 text-xs font-bold text-emerald-400">
                          <Check className="w-4 h-4" />
                          <span>
                            تم اختيار {selectedPdfFiles.length} ملفات PDF (إجمالي{' '}
                            {(selectedPdfFiles.reduce((acc, f) => acc + f.size, 0) / (1024 * 1024)).toFixed(2)} MB)
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400">سيتم حفظ كل ملف كدرس مستقل داخل هذه المرحلة</p>
                      </div>
                    ) : selectedPdfFiles.length === 1 ? (
                      <div className="flex items-center justify-center gap-2 text-xs font-bold text-emerald-400">
                        <Check className="w-4 h-4" />
                        <span>تم اختيار: {selectedPdfFiles[0].name} ({(selectedPdfFiles[0].size / (1024 * 1024)).toFixed(2)} MB)</span>
                      </div>
                    ) : (
                      <>
                        <p className="text-xs font-bold text-white">اختر ملف أو عدة ملفات PDF من جهازك</p>
                        <p className="text-[11px] text-slate-500">سيتم رفعها وتوليد روابط سحابية آمنة وتلقائية وتظهر بالتطبيق فوراً</p>
                      </>
                    )}
                  </div>

                  <label className="cursor-pointer inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-md shadow-brand-600/20 transition-all">
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span>{selectedPdfFiles.length > 0 ? 'تغيير الملفات المحددة' : 'تصفح جهازك (ملف واحد أو متعدد)'}</span>
                    <input
                      type="file"
                      multiple
                      accept="application/pdf,.pdf"
                      onChange={(e) => setSelectedPdfFiles(e.target.files ? Array.from(e.target.files) : [])}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Or Direct URL Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  أو رابط PDF خارجي مباشر
                </label>
                <input
                  type="url"
                  value={newLessonUrl}
                  onChange={(e) => setNewLessonUrl(e.target.value)}
                  placeholder="https://.../lesson.pdf"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                />
              </div>

              {/* Submit / Cancel Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all"
                >
                  إلغاء
                </button>

                <button
                  type="submit"
                  disabled={isSubmittingLesson}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-emerald-600/25 transition-all"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSubmittingLesson ? (uploadProgressText || 'جارٍ الحفظ والرفع...') : (selectedPdfFiles.length > 1 ? `حفظ ورفع ${selectedPdfFiles.length} دروس` : 'حفظ وإضافة الدرس')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Info Notice Card */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-800 bg-slate-900/40 text-xs text-slate-400 space-y-2">
        <h4 className="font-bold text-white flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-brand-400" />
          <span>كيف تعمل ميزة تعدد الدروس في تطبيق الموبايل؟</span>
        </h4>
        <ul className="space-y-1 text-slate-400 list-disc list-inside leading-relaxed text-[11.5px]">
          <li><strong>عرض متعدد:</strong> تظهر جميع الدروس المرفوعة هنا داخل شاشة المرحلة في التطبيق كقائمة منظمة تحتوي على أسماء الدروس وأرقامها.</li>
          <li><strong>قراءة وتحميل مستقل:</strong> يستطيع الخادم والمخدوم النقر على أي درس لتنزيله وقراءته مباشرة بالصفحة بدون مغادرة التطبيق.</li>
          <li><strong>مزامنة فورية (Realtime):</strong> بمجرد إضافة درس جديد أو حذفه من هذه اللوحة، يسمع التغيير فوراً في تطبيق الموبايل دون الحاجة لتحديث التطبيق من المتجر.</li>
        </ul>
      </div>
    </div>
  );
};
