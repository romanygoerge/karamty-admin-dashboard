import React, { useState, useEffect } from 'react';
import { 
  Video, 
  Plus, 
  Trash2, 
  ExternalLink, 
  Play, 
  Sparkles, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  Layers,
  Edit2
} from 'lucide-react';
import { supabase } from '../lib/supabase';

export interface TutorialVideo {
  id: string;
  title: string;
  youtube_url: string;
  youtube_id: string;
  description?: string;
  duration?: string;
  order_index?: number;
  created_at: string;
}

export const TutorialsView: React.FC = () => {
  const [videos, setVideos] = useState<TutorialVideo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [description, setDescription] = useState('');
  const [previewId, setPreviewId] = useState<string | null>(null);

  // Helper to extract YouTube video ID
  const extractYouTubeId = (url: string): string | null => {
    if (!url) return null;
    const cleanUrl = url.trim();
    // Handles formats: youtube.com/watch?v=ID, youtu.be/ID, youtube.com/embed/ID, youtube.com/shorts/ID
    const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
    const match = cleanUrl.match(regExp);
    return match && match[1].length === 11 ? match[1] : null;
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setYoutubeUrl(val);
    const id = extractYouTubeId(val);
    setPreviewId(id);
  };

  const fetchVideos = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const { data, error } = await supabase
        .from('app_tutorial_videos')
        .select('*')
        .order('order_index', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) {
        if (error.code === '42P01') {
          setErrorMsg('يرجى تشغيل كود SQL في Supabase أولاً لإنشاء جدول app_tutorial_videos.');
        } else {
          setErrorMsg(`خطأ في جلب الفيديوهات: ${error.message}`);
        }
      } else if (data) {
        setVideos(data);
      }
    } catch (err: any) {
      setErrorMsg('تعذر الاتصال بقاعدة البيانات');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVideos();

    // Setup Supabase Realtime Channel
    const channel = supabase
      .channel('realtime-tutorial-videos')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_tutorial_videos' }, () => {
        fetchVideos();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  const handleAddVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const videoId = extractYouTubeId(youtubeUrl);
    if (!videoId) {
      setErrorMsg('رابط يوتيوب غير صالح. يرجى إدخال رابط يوتيوب صحيح (مثل: https://www.youtube.com/watch?v=... أو https://youtu.be/...)');
      return;
    }

    if (!title.trim()) {
      setErrorMsg('يرجى إدخال عنوان الشرح');
      return;
    }

    setIsSubmitting(true);
    try {
      const nextOrder = videos.length + 1;
      const { data, error } = await supabase
        .from('app_tutorial_videos')
        .insert({
          title: title.trim(),
          youtube_url: youtubeUrl.trim(),
          youtube_id: videoId,
          description: description.trim(),
          order_index: nextOrder,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      setSuccessMsg('تمت إضافة فيديو الشرح بنجاح! سيظهر فوراً لمستخدمي التطبيق.');
      setTitle('');
      setYoutubeUrl('');
      setDescription('');
      setPreviewId(null);
      if (data) {
        setVideos(prev => [data, ...prev]);
      }
    } catch (err: any) {
      console.error('Error inserting tutorial video:', err);
      setErrorMsg(err.message || 'فشل حفظ الفيديو في قاعدة البيانات');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteVideo = async (id: string, videoTitle: string) => {
    if (!window.confirm(`هل أنت متأكد من حذف فيديو: "${videoTitle}" من التطبيق؟`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('app_tutorial_videos')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setVideos(prev => prev.filter(v => v.id !== id));
      setSuccessMsg('تم حذف الفيديو بنجاح.');
    } catch (err: any) {
      setErrorMsg(err.message || 'تعذر حذف الفيديو');
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-brand-950 to-slate-900 border border-brand-500/30 rounded-2xl p-4 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-red-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="px-3 py-1 rounded-full bg-red-500/20 text-red-300 text-xs font-semibold flex items-center gap-1.5 border border-red-500/30">
                <Video className="w-3.5 h-3.5 text-red-400" />
                فيديوهات شرح التطبيق
              </span>
              <span className="text-xs text-slate-400">
                متزامن لحظياً مع تطبيق كرمتي
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
              <Play className="w-5 h-5 sm:w-6 sm:h-6 text-red-500 fill-red-500" />
              إدارة شروحات وفيديوهات التطبيق
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
              أضف فيديوهات من يوتيوب برابط مباشر لتظهر تلقائياً في قسم «شرح التطبيق» داخل صفحة حسابي لجميع المستخدمين والزوار، مع إمكانية التشغيل السلس داخل التطبيق.
            </p>
          </div>

          <button
            onClick={fetchVideos}
            disabled={isLoading}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium flex items-center justify-center gap-2 transition-all self-stretch sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>تحديث القائمة</span>
          </button>
        </div>

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

      {/* Add New Video Form Card */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl">
        <h2 className="text-base font-bold text-white flex items-center gap-2 pb-4 border-b border-slate-800">
          <Plus className="w-5 h-5 text-brand-400" />
          إضافة فيديو شرح جديد من يوتيوب
        </h2>

        <form onSubmit={handleAddVideo} className="mt-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                عنوان الفيديو والشرح *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="مثال: شرح طريقة استخدام ميزة خلوتي وقراءة الإنجيل"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-sm focus:outline-none focus:border-brand-500 placeholder-slate-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                رابط فيديو يوتيوب (URL) *
              </label>
              <input
                type="url"
                required
                value={youtubeUrl}
                onChange={handleUrlChange}
                placeholder="https://www.youtube.com/watch?v=... أو https://youtu.be/..."
                className="w-full px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-sm focus:outline-none focus:border-brand-500 placeholder-slate-500 font-mono text-left"
                dir="ltr"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              وصف توضيحي للفيديو (اختياري)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="وصف مختصر لمحتوى الفيديو والنقاط التي يغطيها..."
              className="w-full px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-sm focus:outline-none focus:border-brand-500 placeholder-slate-500"
            />
          </div>

          {/* Live YouTube Thumbnail Preview */}
          {previewId && (
            <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/60 flex flex-col sm:flex-row items-center gap-4">
              <div className="relative w-44 h-24 rounded-lg overflow-hidden bg-black flex-shrink-0 border border-slate-600 shadow-md">
                <img
                  src={`https://img.youtube.com/vi/${previewId}/hqdefault.jpg`}
                  alt="YouTube Preview"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                  <Play className="w-8 h-8 text-white fill-white drop-shadow" />
                </div>
              </div>
              <div className="text-xs text-slate-300 space-y-1">
                <p className="font-semibold text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  تم التعرف على الفيديو بنجاح!
                </p>
                <p className="text-slate-400 font-mono text-[11px]">معرف الفيديو (Video ID): {previewId}</p>
                <p className="text-slate-400">سيتم تشغيل هذا الفيديو مباشرة داخل مشغل التطبيق المدمج.</p>
              </div>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSubmitting || !previewId}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-medium text-sm flex items-center justify-center gap-2 shadow-lg shadow-brand-600/30 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>{isSubmitting ? 'جاري الحفظ...' : 'نشر الفيديو في التطبيق'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Existing Videos List Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-amber-400" />
            الفيديوهات الحالية في التطبيق ({videos.length})
          </h2>
          <span className="text-xs text-slate-400">
            تظهر مرتبة للمستخدمين بنفس الترتيب
          </span>
        </div>

        {isLoading ? (
          <div className="py-16 text-center text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-brand-400" />
            <p className="text-xs">جاري تحميل الفيديوهات...</p>
          </div>
        ) : videos.length === 0 ? (
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
            <Video className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-300">لا توجد فيديوهات شروحات مضافة حتى الآن</p>
            <p className="text-xs text-slate-500 mt-1">استخدم النموذج أعلاه لإضافة أول فيديو شرح لتطبيق كرمتي.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {videos.map((vid, idx) => (
              <div 
                key={vid.id}
                className="bg-slate-900/80 border border-slate-800 hover:border-slate-700 rounded-2xl overflow-hidden shadow-lg transition-all flex flex-col justify-between group"
              >
                <div>
                  {/* Thumbnail */}
                  <div className="relative aspect-video bg-black overflow-hidden">
                    <img
                      src={`https://img.youtube.com/vi/${vid.youtube_id}/hqdefault.jpg`}
                      alt={vid.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-3">
                      <span className="px-2 py-0.5 rounded bg-black/60 text-white font-mono text-[10px] border border-white/20">
                        فيديو #{idx + 1}
                      </span>
                    </div>
                    <a
                      href={vid.youtube_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/40 transition-colors"
                    >
                      <div className="w-12 h-12 rounded-full bg-red-600/90 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                        <Play className="w-6 h-6 fill-white ml-0.5" />
                      </div>
                    </a>
                  </div>

                  {/* Details */}
                  <div className="p-4 space-y-2">
                    <h3 className="font-bold text-white text-sm line-clamp-2 leading-snug">
                      {vid.title}
                    </h3>
                    {vid.description && (
                      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                        {vid.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="p-4 pt-0 border-t border-slate-800/60 mt-2 flex items-center justify-between text-xs text-slate-400">
                  <a
                    href={vid.youtube_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 hover:text-slate-200 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
                    مشاهدة بيوتيوب
                  </a>

                  <button
                    onClick={() => handleDeleteVideo(vid.id, vid.title)}
                    className="flex items-center gap-1 text-red-400 hover:text-red-300 p-1.5 rounded-lg hover:bg-red-500/10 transition-colors"
                    title="حذف الفيديو"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>حذف</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
