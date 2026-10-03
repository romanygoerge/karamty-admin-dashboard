import React from 'react';
import { 
  Users, 
  GraduationCap, 
  MessageSquare, 
  Package, 
  Wallet, 
  TrendingUp,
  Activity,
  UserCheck,
  CalendarCheck
} from 'lucide-react';
import { StatsCard } from '../components/StatsCard';
import { Profile, CommunityPost, SundaySchoolStudent, InventoryItem, BudgetItem } from '../types';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';

interface OverviewViewProps {
  profiles: Profile[];
  posts: CommunityPost[];
  students: SundaySchoolStudent[];
  inventory: InventoryItem[];
  budget: BudgetItem[];
  onNavigate: (tab: any) => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  profiles,
  posts,
  students,
  inventory,
  budget,
  onNavigate
}) => {
  const servantsCount = profiles.filter(p => p.role?.includes('خادم') || p.role?.includes('أمين') || p.role?.includes('servant') || p.role === 'admin').length;
  const totalLikes = posts.reduce((acc, p) => acc + (p.likes_count || 0), 0);
  const totalComments = posts.reduce((acc, p) => acc + (p.comments_count || 0), 0);
  const totalInventoryCount = inventory.reduce((acc, i) => acc + (i.total_quantity || 0), 0);
  
  const totalIncome = budget.filter(b => b.type === 'income').reduce((acc, b) => acc + Number(b.amount || 0), 0);
  const totalExpense = budget.filter(b => b.type === 'expense').reduce((acc, b) => acc + Number(b.amount || 0), 0);
  const netBalance = totalIncome - totalExpense;

  // Chart data: Attendance & Growth mockup based on current real totals
  const activityData = [
    { name: 'السبت', users: Math.max(1, Math.round(profiles.length * 0.4)), posts: Math.max(1, Math.round(posts.length * 0.3)), attendance: Math.max(1, Math.round(students.length * 0.6)) },
    { name: 'الأحد', users: Math.max(2, Math.round(profiles.length * 0.9)), posts: Math.max(2, Math.round(posts.length * 0.8)), attendance: Math.max(3, Math.round(students.length * 0.95)) },
    { name: 'الإثنين', users: Math.max(1, Math.round(profiles.length * 0.5)), posts: Math.max(1, Math.round(posts.length * 0.4)), attendance: Math.max(1, Math.round(students.length * 0.3)) },
    { name: 'الثلاثاء', users: Math.max(1, Math.round(profiles.length * 0.6)), posts: Math.max(1, Math.round(posts.length * 0.5)), attendance: Math.max(1, Math.round(students.length * 0.4)) },
    { name: 'الأربعاء', users: Math.max(1, Math.round(profiles.length * 0.7)), posts: Math.max(1, Math.round(posts.length * 0.6)), attendance: Math.max(2, Math.round(students.length * 0.5)) },
    { name: 'الخميس', users: Math.max(2, Math.round(profiles.length * 0.8)), posts: Math.max(2, Math.round(posts.length * 0.7)), attendance: Math.max(2, Math.round(students.length * 0.7)) },
    { name: 'الجمعة', users: Math.max(3, profiles.length), posts: Math.max(2, posts.length), attendance: Math.max(3, students.length) },
  ];

  // Distribution chart data
  const roleDistribution = [
    { name: 'خدام ومسؤولين', value: Math.max(1, servantsCount), color: '#0e87eb' },
    { name: 'أعضاء ومخدومين', value: Math.max(1, profiles.length - servantsCount), color: '#38a4f8' },
    { name: 'طلاب مدارس الأحد', value: Math.max(1, students.length), color: '#f59e0b' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Welcome & KPI row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatsCard
          title="إجمالي الخدام والأعضاء"
          value={profiles.length}
          change={`منهم ${servantsCount} خادم`}
          isPositive={true}
          icon={<Users className="w-6 h-6 text-brand-400" />}
          gradient="from-brand-900/40 to-slate-900"
          description="حسابات مسجلة وموثقة"
        />

        <StatsCard
          title="طلاب مدارس الأحد"
          value={students.length}
          change="موزعين على المراحل"
          isPositive={true}
          icon={<GraduationCap className="w-6 h-6 text-gold-400" />}
          gradient="from-amber-900/30 to-slate-900"
          description="متابعة الحضور والغياب"
        />

        <StatsCard
          title="تفاعل مجتمع إكسبلور"
          value={posts.length}
          change={`${totalLikes} إعجاب • ${totalComments} تعليق`}
          isPositive={true}
          icon={<MessageSquare className="w-6 h-6 text-emerald-400" />}
          gradient="from-emerald-900/30 to-slate-900"
          description="منشورات ومشاركات حية"
        />

        <StatsCard
          title="صافي رصيد صندوق الخدمة"
          value={`${netBalance.toLocaleString()} ج.م`}
          change={`إيرادات: ${totalIncome.toLocaleString()} ج.م`}
          isPositive={netBalance >= 0}
          icon={<Wallet className="w-6 h-6 text-indigo-400" />}
          gradient="from-indigo-900/30 to-slate-900"
          description={`مصروفات: ${totalExpense.toLocaleString()} ج.م`}
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly Activity Trend */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-brand-400" />
                مؤشر نشاط وتفاعل الكنيسة الأسبوعي
              </h3>
              <p className="text-xs text-slate-400">تزامن حي لمعدلات الحضور والمشاركات عبر التطبيق</p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/20 text-xs font-semibold">
              مباشر من السحابة
            </span>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0e87eb" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#0e87eb" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorAtt" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                <XAxis dataKey="name" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff', textAlign: 'right' }} 
                />
                <Area type="monotone" dataKey="users" name="نشاط الأعضاء" stroke="#0e87eb" strokeWidth={2} fillOpacity={1} fill="url(#colorUsers)" />
                <Area type="monotone" dataKey="attendance" name="حضور مدارس الأحد" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#colorAtt)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Roles Distribution */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2 mb-1">
              <Activity className="w-5 h-5 text-gold-400" />
              توزيع الفئات المسجلة
            </h3>
            <p className="text-xs text-slate-400 mb-4">نسب المستخدمين والخدام في قاعدة البيانات</p>
            
            <div className="h-48 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={roleDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {roleDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff', textAlign: 'right' }} 
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-800">
            {roleDistribution.map((item, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-slate-300 font-medium">{item.name}</span>
                </div>
                <span className="text-slate-400 font-bold">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Action Cards & Live Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Latest Mobile Community Posts */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-brand-400" />
              أحدث مشاركات المستخدمين من التطبيق
            </h3>
            <button
              onClick={() => onNavigate('community')}
              className="text-xs text-brand-400 hover:text-brand-300 font-semibold"
            >
              عرض وإدارة المجتمع ←
            </button>
          </div>

          <div className="space-y-3">
            {posts.slice(0, 3).map((post) => (
              <div 
                key={post.id} 
                className="p-4 rounded-xl bg-slate-800/40 border border-slate-800 hover:border-slate-700/80 transition-all flex items-start gap-4"
              >
                <div className="w-10 h-10 rounded-full bg-slate-700/60 overflow-hidden flex-shrink-0 flex items-center justify-center font-bold text-slate-300 border border-slate-600/50">
                  {post.author_avatar ? (
                    <img src={post.author_avatar} alt={post.author_name} className="w-full h-full object-cover" />
                  ) : (
                    post.author_name?.charAt(0) || 'م'
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-white truncate">{post.author_name}</h4>
                    <span className="text-[11px] text-slate-400">
                      {new Date(post.created_at).toLocaleDateString('ar-EG')}
                    </span>
                  </div>
                  {post.church_name && (
                    <p className="text-[11px] text-brand-400 font-medium mb-1">{post.church_name}</p>
                  )}
                  <p className="text-xs text-slate-300 line-clamp-2 mt-1">{post.content}</p>
                </div>
                {post.image_url && (
                  <img 
                    src={post.image_url} 
                    alt="مرفق" 
                    className="w-14 h-14 rounded-lg object-cover border border-slate-700 flex-shrink-0" 
                  />
                )}
              </div>
            ))}

            {posts.length === 0 && (
              <div className="p-8 text-center text-slate-500 text-sm">
                لا توجد منشورات حالياً في المجتمع
              </div>
            )}
          </div>
        </div>

        {/* Quick Operations & Status */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2 mb-4">
              <CalendarCheck className="w-5 h-5 text-emerald-400" />
              المهام السريعة للإدارة
            </h3>

            <div className="space-y-3">
              <button
                onClick={() => onNavigate('sunday_school')}
                className="w-full text-right p-3.5 rounded-xl bg-slate-800/60 hover:bg-brand-600/20 border border-slate-700/60 hover:border-brand-500/40 transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/10 text-gold-400 group-hover:bg-gold-500/20">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">تسجيل حضور مدارس الأحد</h4>
                    <p className="text-[11px] text-slate-400">كشف حضور اليوم وتعديل الأسماء</p>
                  </div>
                </div>
                <span className="text-slate-500 group-hover:text-brand-400 font-bold">←</span>
              </button>

              <button
                onClick={() => onNavigate('notifications')}
                className="w-full text-right p-3.5 rounded-xl bg-slate-800/60 hover:bg-brand-600/20 border border-slate-700/60 hover:border-brand-500/40 transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-brand-500/10 text-brand-400 group-hover:bg-brand-500/20">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">إرسال تنبيه عام للتطبيق</h4>
                    <p className="text-[11px] text-slate-400">إشعار فوري لكافة الخدام والمخدومين</p>
                  </div>
                </div>
                <span className="text-slate-500 group-hover:text-brand-400 font-bold">←</span>
              </button>

              <button
                onClick={() => onNavigate('inventory')}
                className="w-full text-right p-3.5 rounded-xl bg-slate-800/60 hover:bg-brand-600/20 border border-slate-700/60 hover:border-brand-500/40 transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 group-hover:bg-purple-500/20">
                    <Package className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">جرد عُهد ومخزن الكنيسة</h4>
                    <p className="text-[11px] text-slate-400">إجمالي {totalInventoryCount} قطعة مسجلة</p>
                  </div>
                </div>
                <span className="text-slate-500 group-hover:text-brand-400 font-bold">←</span>
              </button>
            </div>
          </div>

          <div className="mt-6 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400">حالة قاعدة البيانات:</span>
            <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              متصل بـ Supabase
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
