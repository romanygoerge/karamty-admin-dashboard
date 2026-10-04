import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  GraduationCap, 
  MessageSquare, 
  Package, 
  Wallet, 
  Gift, 
  BellRing,
  Cross,
  Sparkles,
  RefreshCw,
  BookOpen,
  Crown
} from 'lucide-react';

export type NavItem = 
  | 'overview' 
  | 'subscriptions'
  | 'users' 
  | 'sunday_school' 
  | 'curriculum'
  | 'community' 
  | 'inventory' 
  | 'finance' 
  | 'rewards' 
  | 'notifications';

interface SidebarProps {
  currentTab: NavItem;
  onSelectTab: (tab: NavItem) => void;
  isSyncing: boolean;
  onRefresh: () => void;
  unreadCount?: number;
  pendingSubCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isSyncing,
  onRefresh,
  pendingSubCount
}) => {
  const menuItems: { id: NavItem; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'overview', label: 'لوحة القيادة والمؤشرات', icon: <LayoutDashboard className="w-5 h-5" /> },
    { 
      id: 'subscriptions', 
      label: 'الاشتراكات والتبرعات', 
      icon: <Crown className="w-5 h-5 text-amber-400" />,
      badge: pendingSubCount && pendingSubCount > 0 ? String(pendingSubCount) : undefined
    },
    { id: 'users', label: 'الخدام والمستخدمين', icon: <Users className="w-5 h-5" /> },
    { id: 'sunday_school', label: 'مدارس الأحد والغياب', icon: <GraduationCap className="w-5 h-5" /> },
    { id: 'curriculum', label: 'مناهج المراحل (PDF)', icon: <BookOpen className="w-5 h-5" />, badge: 'PDF' },
    { id: 'community', label: 'مجتمع إكسبلور والتفاعل', icon: <MessageSquare className="w-5 h-5" /> },
    { id: 'inventory', label: 'المخزن وعُهد الكنيسة', icon: <Package className="w-5 h-5" /> },
    { id: 'finance', label: 'المالية والميزانية', icon: <Wallet className="w-5 h-5" /> },
    { id: 'rewards', label: 'متجر النقاط والمكافآت', icon: <Gift className="w-5 h-5" /> },
    { id: 'notifications', label: 'البث والإشعارات الفورية', icon: <BellRing className="w-5 h-5" /> },
  ];

  return (
    <aside className="w-64 bg-slate-900/90 border-l border-slate-800 flex flex-col justify-between h-screen sticky top-0 backdrop-blur-xl z-30 select-none">
      <div>
        {/* App Logo & Brand */}
        <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-brand-400 flex items-center justify-center shadow-lg shadow-brand-500/20 text-white font-bold">
              <Cross className="w-6 h-6 rotate-45" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-wide flex items-center gap-1.5">
                تطبيق كرامتي
                <Sparkles className="w-3.5 h-3.5 text-gold-400" />
              </h1>
              <p className="text-xs text-slate-400 font-medium">لوحة الإدارة والمتابعة</p>
            </div>
          </div>
        </div>

        {/* Realtime Sync status badge */}
        <div className="mx-4 my-3 px-3 py-2 rounded-lg bg-slate-800/50 border border-slate-700/50 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-slate-300 font-medium">تزامن مباشر مع السحابة</span>
          </div>
          <button 
            onClick={onRefresh}
            title="تحديث البيانات يدويًا"
            className="text-slate-400 hover:text-brand-400 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-brand-400' : ''}`} />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="p-3 space-y-1">
          {menuItems.map((item) => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30'
                    : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={isActive ? 'text-white' : 'text-slate-400'}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-300">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/40">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center text-slate-950 font-bold text-xs">
            ادارة
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate">أدمن النظام</p>
            <p className="text-[11px] text-slate-400 truncate">admin@karamty.org</p>
          </div>
        </div>
      </div>
    </aside>
  );
};
