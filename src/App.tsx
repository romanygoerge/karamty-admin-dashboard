import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar, NavItem } from './components/Sidebar';
import { Header } from './components/Header';
import { OverviewView } from './views/OverviewView';
import { AppInstallsView } from './views/AppInstallsView';
import { UsersView } from './views/UsersView';
import { SundaySchoolView } from './views/SundaySchoolView';
import { CurriculumView } from './views/CurriculumView';
import { CommunityView } from './views/CommunityView';
import { InventoryView } from './views/InventoryView';
import { FinanceView } from './views/FinanceView';
import { RewardsView } from './views/RewardsView';
import { NotificationsView } from './views/NotificationsView';
import { SubscriptionsView } from './views/SubscriptionsView';
import { TutorialsView } from './views/TutorialsView';
import { SuggestionsView } from './views/SuggestionsView';
import { SupportView } from './views/SupportView';
import { supabase } from './lib/supabase';
import { Profile, CommunityPost, SundaySchoolStudent, InventoryItem, BudgetItem } from './types';

export function App() {
  const [currentTab, setCurrentTab] = useState<NavItem>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [unreadSupportCount, setUnreadSupportCount] = useState(0);
  const [selectedServantId, setSelectedServantId] = useState<string | null>(null);

  // Central Database State
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [students, setStudents] = useState<SundaySchoolStudent[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [budget, setBudget] = useState<BudgetItem[]>([]);
  const [storeInstalls, setStoreInstalls] = useState<number>(0);

  // Count pending subscription/donation payment requests
  const pendingSubCount = budget.filter(b => 
    (b.category === 'subscription' || b.category === 'donation') && 
    (b.notes?.includes('"status":"pending"') || !b.notes?.includes('"status":'))
  ).length;

  // Fetch all initial data
  const fetchAllData = useCallback(async () => {
    setIsSyncing(true);
    try {
      const [pRes, postRes, sRes, invRes, budRes, campRes] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('community_posts').select('*').order('created_at', { ascending: false }),
        supabase.from('sunday_school_students').select('*').order('full_name', { ascending: true }),
        supabase.from('inventory_items').select('*').order('name', { ascending: true }),
        supabase.from('service_budget_items').select('*').order('date', { ascending: false }),
        supabase.from('app_campaigns').select('*').eq('title', 'google_play_installs').maybeSingle(),
      ]);

      if (pRes.data) setProfiles(pRes.data);
      if (postRes.data) setPosts(postRes.data);
      if (sRes.data) setStudents(sRes.data);
      if (invRes.data) setInventory(invRes.data);
      if (budRes.data) setBudget(budRes.data);
      if (campRes.data && typeof campRes.data.views_count === 'number') {
        setStoreInstalls(campRes.data.views_count);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();

    // Setup Supabase Realtime Channels for instant synchronization with mobile app
    const channel = supabase
      .channel('karamty-realtime-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        supabase.from('profiles').select('*').order('created_at', { ascending: false }).then(({ data }) => {
          if (data) setProfiles(data);
        });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'community_posts' }, () => {
        supabase.from('community_posts').select('*').order('created_at', { ascending: false }).then(({ data }) => {
          if (data) setPosts(data);
        });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sunday_school_students' }, () => {
        supabase.from('sunday_school_students').select('*').order('full_name', { ascending: true }).then(({ data }) => {
          if (data) setStudents(data);
        });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_items' }, () => {
        supabase.from('inventory_items').select('*').order('name', { ascending: true }).then(({ data }) => {
          if (data) setInventory(data);
        });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'service_budget_items' }, () => {
        supabase.from('service_budget_items').select('*').order('date', { ascending: false }).then(({ data }) => {
          if (data) setBudget(data);
        });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets' }, () => {
        supabase.from('support_tickets').select('id', { count: 'exact' }).gt('unread_for_admin', 0).then(({ count }) => {
          setUnreadSupportCount(count || 0);
        });
      })
      .subscribe();

    // Initial check for unread support tickets
    supabase.from('support_tickets').select('id', { count: 'exact' }).gt('unread_for_admin', 0).then(({ count }) => {
      setUnreadSupportCount(count || 0);
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchAllData]);

  const titles: Record<NavItem, { title: string; subtitle: string }> = {
    overview: {
      title: 'لوحة التحكم والقيادة',
      subtitle: 'نظرة شاملة ومؤشرات حية لمتابعة كافة أنشطة وخدمات الكنيسة'
    },
    app_installs: {
      title: 'متابعة تثبيتات وتحميلات التطبيق',
      subtitle: 'إحصائيات حية للأجهزة وتحميلات متجر Google Play مع تتبع الحملات الإعلانية ونسب الزوار'
    },
    subscriptions: {
      title: 'إدارة الاشتراكات والتبرعات والدعم',
      subtitle: 'متابعة تحويلات InstaPay (01204062941)، تفعيل الاشتراكات الشهرية والسنوية، وإلغاء الإعلانات للمستخدمين'
    },
    users: {
      title: 'إدارة الخدام والأعضاء',
      subtitle: 'قاعدة بيانات المستخدمين والخدام وتعديل الصلاحيات والنقاط'
    },
    sunday_school: {
      title: 'مدارس الأحد وكشف الحضور',
      subtitle: 'سجلات المخدومين والمراحل العمرية وتسجيل الحضور والغياب الأسبوعي'
    },
    curriculum: {
      title: 'إدارة مناهج مدارس الأحد (PDF)',
      subtitle: 'رفع وتخصيص كتب وملفات المناهج لكل مرحلة عمرية ومزامنتها لحظياً مع تطبيق الموبايل'
    },
    community: {
      title: 'مجتمع وتفاعل إكسبلور',
      subtitle: 'متابعة منشورات وتفاعل المستخدمين مع إمكانية نشر الإعلانات الرسمية'
    },
    inventory: {
      title: 'المخزن وعُهد الكنيسة',
      subtitle: 'جرد أجهزة الكنيسة والأدوات والملابس وإدارة سجلات الاستعارة'
    },
    finance: {
      title: 'المالية وميزانية الخدمة',
      subtitle: 'دفتر الإيرادات والمصروفات والاشتراكات الشهرية وصندوق الخدمة'
    },
    rewards: {
      title: 'متجر النقاط والمكافآت',
      subtitle: 'هدايا التحفيز لمخدومي الكنيسة ومتابعة تسليم المكافآت المستبدلة'
    },
    notifications: {
      title: 'البث والإشعارات الفورية',
      subtitle: 'إرسال تنبيهات عاجلة تصل مباشرة إلى تطبيق الموبايل لجميع المستخدمين'
    },
    tutorials: {
      title: 'إدارة شروحات وفيديوهات التطبيق',
      subtitle: 'إضافة ومزامنة فيديوهات يوتيوب الإرشادية التي تعرض للمستخدمين في قسم شرح التطبيق'
    },
    suggestions: {
      title: 'اقتراحات وتطوير التطبيق',
      subtitle: 'متابعة أفكار ومقترحات المستخدمين، تصويتات المجتمع، والردود الرسمية'
    },
    support: {
      title: 'محادثات وتذاكر الدعم الفني',
      subtitle: 'تواصل مباشر مع مستخدمي التطبيق لحل المشاكل والاستفسارات بشكل لحظي'
    }
  };

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 antialiased font-sans relative overflow-x-hidden">
      {/* Sidebar (Responsive drawer on mobile, sticky on desktop) */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setCurrentTab(tab);
          setIsMobileMenuOpen(false);
        }}
        isSyncing={isSyncing}
        onRefresh={fetchAllData}
        unreadSupportCount={unreadSupportCount}
        pendingSubCount={pendingSubCount}
        isOpenMobile={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 w-full overflow-x-hidden">
        <Header
          title={titles[currentTab].title}
          subtitle={titles[currentTab].subtitle}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          showSearch={currentTab === 'users' || currentTab === 'inventory' || currentTab === 'sunday_school'}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
        />

        <main className="flex-1 p-3.5 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto overflow-x-hidden">
          {currentTab === 'overview' && (
            <OverviewView
              profiles={profiles}
              posts={posts}
              students={students}
              inventory={inventory}
              budget={budget}
              storeInstalls={storeInstalls}
              onNavigate={setCurrentTab}
            />
          )}

          {currentTab === 'app_installs' && (
            <AppInstallsView
              profiles={profiles}
              initialStoreInstalls={storeInstalls}
              onStoreInstallsUpdated={setStoreInstalls}
            />
          )}

          {currentTab === 'support' && (
            <SupportView />
          )}

          {currentTab === 'tutorials' && (
            <TutorialsView />
          )}

          {currentTab === 'suggestions' && (
            <SuggestionsView />
          )}

          {currentTab === 'subscriptions' && (
            <SubscriptionsView />
          )}

          {currentTab === 'users' && (
            <UsersView
              profiles={profiles}
              students={students}
              onSelectServantForSundaySchool={(userId) => {
                setSelectedServantId(userId);
                setCurrentTab('sunday_school');
              }}
              onRefresh={fetchAllData}
            />
          )}

          {currentTab === 'sunday_school' && (
            <SundaySchoolView
              students={students}
              profiles={profiles}
              initialSelectedUserId={selectedServantId}
              onRefresh={fetchAllData}
            />
          )}

          {currentTab === 'curriculum' && (
            <CurriculumView />
          )}

          {currentTab === 'community' && (
            <CommunityView
              posts={posts}
              profiles={profiles}
              onRefresh={fetchAllData}
            />
          )}

          {currentTab === 'inventory' && (
            <InventoryView
              inventory={inventory}
              onRefresh={fetchAllData}
            />
          )}

          {currentTab === 'finance' && (
            <FinanceView
              budget={budget}
              onRefresh={fetchAllData}
            />
          )}

          {currentTab === 'rewards' && (
            <RewardsView
              onRefresh={fetchAllData}
            />
          )}

          {currentTab === 'notifications' && (
            <NotificationsView
              onRefresh={fetchAllData}
            />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
