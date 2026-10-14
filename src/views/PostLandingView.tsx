import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Download, ExternalLink, Heart, Share2, Sparkles, BookOpen } from 'lucide-react';

interface PostLandingViewProps {
  postId: string;
}

export const PostLandingView: React.FC<PostLandingViewProps> = ({ postId }) => {
  const [post, setPost] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // Google Play URL for Karamty App
  const googlePlayUrl = 'https://play.google.com/store/apps/details?id=com.karamty.app';
  const appDeepLink = `karmaty://post/${postId}`;

  useEffect(() => {
    const fetchPost = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('community_posts')
          .select('*')
          .eq('id', postId)
          .maybeSingle();

        if (error) throw error;
        setPost(data);
      } catch (err) {
        console.error('Error fetching post for preview:', err);
      } finally {
        setLoading(false);
      }
    };

    if (postId) {
      fetchPost();
    } else {
      setLoading(false);
    }

    // Attempt automatic app launch if on mobile device
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile && postId) {
      setTimeout(() => {
        window.location.href = appDeepLink;
      }, 300);
    }
  }, [postId]);

  const handleOpenInApp = () => {
    window.location.href = appDeepLink;
    // Fallback after timeout to Google Play
    setTimeout(() => {
      window.location.href = googlePlayUrl;
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between" dir="rtl">
      {/* Top Header */}
      <header className="border-b border-slate-850 bg-slate-900/80 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-600/30">
            <span className="text-xl">🍇</span>
          </div>
          <div>
            <h1 className="text-base font-bold text-white flex items-center gap-1.5">
              <span>تطبيق كرمتي</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-semibold border border-purple-500/30">
                المجتمع المسيحي
              </span>
            </h1>
            <p className="text-[11px] text-slate-400">الكتاب المقدس • الأجبية • السنكسار • الألعاب</p>
          </div>
        </div>

        <a
          href={googlePlayUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-lg shadow-purple-600/30"
        >
          <Download className="w-4 h-4" />
          <span>تحميل التطبيق مجاناً</span>
        </a>
      </header>

      {/* Main Content Area */}
      <main className="max-w-xl mx-auto w-full px-4 py-8 flex-1 flex flex-col justify-center">
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-xs">جارٍ تحميل المنشور...</p>
          </div>
        ) : post ? (
          <div className="space-y-6">
            {/* Post Card */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 shadow-2xl backdrop-blur-sm">
              {/* Author Row */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-purple-700 to-purple-500 flex items-center justify-center font-bold text-white text-base shadow">
                    {post.author_name ? post.author_name.charAt(0) : '✝'}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white flex items-center gap-2">
                      <span>{post.author_name || 'مستخدم كرمتي'}</span>
                      {post.church && (
                        <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-slate-800 text-purple-300 border border-slate-700">
                          {post.church}
                        </span>
                      )}
                    </h3>
                    <span className="text-[11px] text-slate-400 mt-0.5 block">
                      {new Date(post.created_at).toLocaleDateString('ar-EG', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                </div>

                <span className="text-xs text-purple-400 font-semibold bg-purple-950/60 px-2.5 py-1 rounded-lg border border-purple-800/40">
                  منشور من إكسبلور
                </span>
              </div>

              {/* Verse Quote if available */}
              {post.verse_quote && (
                <div className="my-4 p-4 rounded-xl bg-purple-950/30 border border-purple-800/30 flex items-start gap-3">
                  <BookOpen className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-xs leading-relaxed text-amber-200/90 font-medium font-serif">
                    «{post.verse_quote}»
                  </p>
                </div>
              )}

              {/* Post Content Text */}
              <p className="text-sm leading-relaxed text-slate-200 whitespace-pre-line my-4 font-normal">
                {post.content}
              </p>

              {/* Post Image if available */}
              {post.image_url && (
                <div className="rounded-xl overflow-hidden my-4 border border-slate-800">
                  <img
                    src={post.image_url}
                    alt="Post attachment"
                    className="w-full max-h-96 object-cover"
                  />
                </div>
              )}

              {/* Engagement Stats */}
              <div className="pt-4 border-t border-slate-850 flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1.5 text-rose-400">
                    <Heart className="w-4 h-4 fill-rose-500/20" />
                    <span>{post.likes_count || 0} إعجاب</span>
                  </span>
                  <span className="flex items-center gap-1.5 text-purple-400">
                    <Share2 className="w-4 h-4" />
                    <span>{post.shares_count || 0} مشاركة</span>
                  </span>
                </div>
                <span className="text-[11px] text-slate-500">عبر تطبيق كرمتي 🍇</span>
              </div>
            </div>

            {/* Call To Actions */}
            <div className="rounded-2xl p-6 bg-gradient-to-br from-purple-950/50 to-slate-900 border border-purple-800/40 text-center space-y-4">
              <div>
                <h4 className="text-base font-bold text-white flex items-center justify-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>تفاعل مع المنشور واكتشف المزيد</span>
                </h4>
                <p className="text-xs text-slate-300 mt-1">
                  إذا كان تطبيق كرمتي مثبتاً على هاتفك، افتح المنشور الآن للتفاعل والتعليق:
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                <button
                  onClick={handleOpenInApp}
                  className="flex-1 flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-all shadow-lg shadow-purple-600/30"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>فتح في تطبيق كرمتي</span>
                </button>

                <a
                  href={googlePlayUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-all border border-slate-700"
                >
                  <Download className="w-4 h-4 text-purple-400" />
                  <span>تحميل التطبيق من Google Play</span>
                </a>
              </div>
            </div>
          </div>
        ) : (
          /* Fallback when post is not found */
          <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-8 text-center space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-purple-900/30 text-purple-400 flex items-center justify-center mx-auto text-3xl">
              🍇
            </div>
            <div>
              <h3 className="text-base font-bold text-white">منشور من مجتمع تطبيق كرمتي</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
                لمشاهدة هذا المنشور والتفاعل مع الخدام والمستخدمين، قم بتحميل تطبيق كرمتي مجاناً
              </p>
            </div>

            <a
              href={googlePlayUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 py-3 px-8 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-all shadow-lg shadow-purple-600/30"
            >
              <Download className="w-4 h-4" />
              <span>تحميل تطبيق كرمتي من متجر Google Play</span>
            </a>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-850 py-4 text-center text-[11px] text-slate-500">
        جميع الحقوق محفوظة © {new Date().getFullYear()} تطبيق كرمتي ✝️
      </footer>
    </div>
  );
};
