import React, { useState } from 'react';
import { 
  MessageSquare, 
  Heart, 
  Trash2, 
  Send, 
  PlusCircle, 
  Image as ImageIcon, 
  CheckCircle,
  Pin
} from 'lucide-react';
import { CommunityPost, PostComment, Profile } from '../types';
import { Modal } from '../components/Modal';
import { supabase } from '../lib/supabase';

interface CommunityViewProps {
  posts: CommunityPost[];
  profiles?: Profile[];
  onRefresh: () => void;
}

export const CommunityView: React.FC<CommunityViewProps> = ({ posts, profiles = [], onRefresh }) => {
  const [isNewPostOpen, setIsNewPostOpen] = useState(false);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [activePost, setActivePost] = useState<CommunityPost | null>(null);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);

  // New Post Form
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [authorName, setAuthorName] = useState('إدارة كرامتي العامة');
  const [isAnnouncement, setIsAnnouncement] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleOpenComments = async (post: CommunityPost) => {
    setActivePost(post);
    setIsCommentsOpen(true);
    setLoadingComments(true);
    try {
      const { data, error } = await supabase
        .from('community_post_comments')
        .select('*')
        .eq('post_id', post.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setComments(data || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('حذف هذا التعليق؟')) return;
    try {
      const { error } = await supabase
        .from('community_post_comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;
      setComments(prev => prev.filter(c => c.id !== commentId));
      onRefresh();
    } catch (err: any) {
      alert('خطأ أثناء حذف التعليق: ' + err.message);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا المنشور نهائياً من التطبيق والمجتمع؟')) return;

    try {
      await supabase.from('community_post_comments').delete().eq('post_id', postId);
      await supabase.from('community_post_likes').delete().eq('post_id', postId);
      const { error } = await supabase.from('community_posts').delete().eq('id', postId);

      if (error) throw error;

      setStatusMessage('تم حذف المنشور بنجاح');
      setTimeout(() => setStatusMessage(null), 3000);
      onRefresh();
    } catch (err: any) {
      alert('خطأ أثناء الحذف: ' + err.message);
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    setIsSubmitting(true);

    try {
      const newId = crypto.randomUUID();
      const { error } = await supabase.from('community_posts').insert({
        id: newId,
        author_id: '00000000-0000-0000-0000-000000000000',
        author_name: authorName.trim(),
        church_name: 'الإدارة المركزية',
        content: content.trim(),
        image_url: imageUrl.trim() || null,
        likes_count: 0,
        comments_count: 0,
        is_announcement: isAnnouncement,
        created_at: new Date().toISOString()
      });

      if (error) throw error;

      setIsNewPostOpen(false);
      setContent('');
      setImageUrl('');
      setStatusMessage('تم نشر الإعلان بنجاح في تطبيق الموبايل!');
      setTimeout(() => setStatusMessage(null), 3000);
      onRefresh();
    } catch (err: any) {
      alert('خطأ أثناء النشر: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-panel p-5 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-brand-500/20 text-brand-400">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">إدارة مجتمع وتفاعل إكسبلور</h3>
            <p className="text-xs text-slate-400">متابعة منشورات المستخدمين، نشر الإعلانات الرسمية، والرقابة على المحتوى</p>
          </div>
        </div>

        <button
          onClick={() => setIsNewPostOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-lg shadow-brand-600/30 transition-all"
        >
          <PlusCircle className="w-4 h-4" />
          <span>نشر إعلان رسمي للتطبيق</span>
        </button>
      </div>

      {statusMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          {statusMessage}
        </div>
      )}

      {/* Posts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {posts.map((post) => {
          const authorProfile = profiles.find((p) => p.id === (post.user_id || post.author_id));
          const displayAuthorName = authorProfile?.full_name?.trim() || post.author_name;
          const displayAvatar = authorProfile?.avatar_url || post.author_avatar;
          const displayChurch = authorProfile?.church?.trim() || post.author_church || post.church_name || 'عام';

          return (
            <div
              key={post.id}
              className="glass-panel rounded-2xl overflow-hidden flex flex-col justify-between border border-slate-800 hover:border-slate-700 transition-all"
            >
              <div>
                {/* Post Header */}
                <div className="p-4 flex items-center justify-between border-b border-slate-800/60">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 overflow-hidden flex items-center justify-center font-bold text-slate-300">
                      {displayAvatar ? (
                        <img src={displayAvatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        displayAuthorName?.charAt(0) || 'م'
                      )}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                        {displayAuthorName}
                        {post.is_announcement && (
                          <span className="p-0.5 rounded bg-amber-500/20 text-gold-400 text-[10px]" title="إعلان رسمي">
                            <Pin className="w-3 h-3" />
                          </span>
                        )}
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        {new Date(post.created_at).toLocaleDateString('ar-EG')} • {displayChurch}
                      </p>
                    </div>
                  </div>

                <button
                  onClick={() => handleDeletePost(post.id)}
                  title="حذف المنشور نهائياً"
                  className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Post Image */}
              {post.image_url && (
                <div className="w-full h-48 bg-slate-900 overflow-hidden border-b border-slate-800">
                  <img
                    src={post.image_url}
                    alt="صورة المنشور"
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                  />
                </div>
              )}

              {/* Content */}
              <div className="p-4 text-xs text-slate-200 leading-relaxed whitespace-pre-line">
                {post.content}
              </div>
            </div>

            {/* Post Footer & Metrics */}
            <div className="p-4 pt-3 border-t border-slate-800/80 bg-slate-950/40 flex items-center justify-between text-xs">
              <div className="flex items-center gap-4 text-slate-400">
                <span className="flex items-center gap-1 text-rose-400 font-semibold">
                  <Heart className="w-3.5 h-3.5 fill-rose-500/30" />
                  <span>{post.likes_count || 0}</span>
                </span>
                <button
                  onClick={() => handleOpenComments(post)}
                  className="flex items-center gap-1 text-brand-400 hover:text-brand-300 font-semibold transition-colors"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>{post.comments_count || 0} تعليق</span>
                </button>
              </div>

              <button
                onClick={() => handleOpenComments(post)}
                className="text-[11px] text-slate-400 hover:text-white underline"
              >
                إدارة التعليقات
              </button>
            </div>
          </div>
        );
      })}

        {posts.length === 0 && (
          <div className="col-span-full py-16 text-center text-slate-500 text-sm">
            لا توجد منشورات حتى الآن في المجتمع
          </div>
        )}
      </div>

      {/* New Announcement Modal */}
      <Modal
        isOpen={isNewPostOpen}
        onClose={() => setIsNewPostOpen(false)}
        title="نشر إعلان كنسي رسمي في تطبيق كرامتي"
      >
        <form onSubmit={handleCreatePost} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-400 font-semibold mb-1">اسم جهة النشر</label>
            <input
              type="text"
              required
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">نص الإعلان أو المنشور *</label>
            <textarea
              rows={4}
              required
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="اكتب تفاصيل الإعلان أو التنبيه هنا..."
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">رابط صورة مرفقة (اختياري)</label>
            <div className="relative">
              <ImageIcon className="w-4 h-4 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://images.unsplash.com/..."
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pr-9 pl-3 py-2 text-white focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="isAnn"
              checked={isAnnouncement}
              onChange={(e) => setIsAnnouncement(e.target.checked)}
              className="rounded bg-slate-800 border-slate-700 text-brand-500 focus:ring-brand-500"
            />
            <label htmlFor="isAnn" className="text-slate-300 font-medium cursor-pointer">
              تثبيت كإعلان رسمي هام في أعلى شاشة إكسبلور
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsNewPostOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 font-semibold"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold shadow-lg shadow-brand-600/30"
            >
              <Send className="w-4 h-4" />
              <span>{isSubmitting ? 'جارٍ النشر...' : 'نشر الآن'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Post Comments Modal */}
      <Modal
        isOpen={isCommentsOpen}
        onClose={() => setIsCommentsOpen(false)}
        title={`التعليقات على منشور: ${
          profiles.find((p) => p.id === (activePost?.user_id || activePost?.author_id))?.full_name?.trim() ||
          activePost?.author_name ||
          ''
        }`}
      >
        <div className="space-y-3 text-xs">
          {loadingComments ? (
            <p className="text-center text-slate-400 py-6">جارٍ تحميل التعليقات...</p>
          ) : comments.length === 0 ? (
            <p className="text-center text-slate-500 py-6">لا توجد تعليقات على هذا المنشور حتى الآن.</p>
          ) : (
            comments.map((comment) => {
              const commentAuthorProfile = profiles.find((p) => p.id === (comment.user_id || comment.author_id));
              const displayCommentAuthor = commentAuthorProfile?.full_name?.trim() || comment.author_name;

              return (
                <div
                  key={comment.id}
                  className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-start justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-white">{displayCommentAuthor}</span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(comment.created_at).toLocaleDateString('ar-EG')}
                      </span>
                    </div>
                    <p className="text-slate-300">{comment.content}</p>
                  </div>
                  <button
                    onClick={() => handleDeleteComment(comment.id)}
                    title="حذف هذا التعليق"
                    className="p-1 rounded text-slate-500 hover:text-rose-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </Modal>
    </div>
  );
};
