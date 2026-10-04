import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar, NavItem } from './components/Sidebar';
import { Header } from './components/Header';
import { OverviewView } from './views/OverviewView';
import { UsersView } from './views/UsersView';
import { SundaySchoolView } from './views/SundaySchoolView';
import { CurriculumView } from './views/CurriculumView';
import { CommunityView } from './views/CommunityView';
import { InventoryView } from './views/InventoryView';
import { FinanceView } from './views/FinanceView';
import { RewardsView } from './views/RewardsView';
import { NotificationsView } from './views/NotificationsView';
import { SubscriptionsView } from './views/SubscriptionsView';
import { supabase } from './lib/supabase';
import { Profile, CommunityPost, SundaySchoolStudent, InventoryItem, BudgetItem } from './types';

export function App() {
  const [currentTab, setCurrentTab] = useState<NavItem>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  // Central Database State
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [students, setStudents] = useState<SundaySchoolStudent[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [budget, setBudget] = useState<BudgetItem[]>([]);

  // Count pending subscription/donation payment requests
  const pendingSubCount = budget.filter(b => 
    (b.category === 'subscription' || b.category === 'donation') && 
    (b.notes?.includes('"status":"pending"') || !b.notes?.includes('"status":'))
  ).length;

  // Fetch all initial data
  const fetchAllData = useCallback(async () => {
    setIsSyncing(true);
    try {
      const [pRes, postRes, sRes, invRes, budRes] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('community_posts').select('*').order('created_at', { ascending: false }),
        supabase.from('sunday_school_students').select('*').order('full_name', { ascending: true }),
        supabase.from('inventory_items').select('*').order('name', { ascending: true }),
        supabase.from('service_budget_items').select('*').order('date', { ascending: false }),
      ]);

      if (pRes.data) setProfiles(pRes.data);
      if (postRes.data) setPosts(postRes.data);
      if (sRes.data) setStudents(sRes.data);
      if (invRes.data) setInventory(invRes.data);
      if (budRes.data) setBudget(budRes.data);
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
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchAllData]);

  const titles: Record<NavItem, { title: string; subtitle: string }> = {
    overview: {
      title: 'لوحة التحكم والقيادة',
      subtitle: 'نظرة شاملة ومؤشرات حية لمتابعة كافة أنشطة وخدمات الكنيسة'
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
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 antialiased font-sans">
      {/* Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        isSyncing={isSyncing}
        onRefresh={fetchAllData}
        pendingSubCount={pendingSubCount}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          title={titles[currentTab].title}
          subtitle={titles[currentTab].subtitle}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          showSearch={currentTab === 'users' || currentTab === 'inventory' || currentTab === 'sunday_school'}
        />

        <main className="flex-1 p-8 max-w-7xl w-full mx-auto">
          {currentTab === 'overview' && (
            <OverviewView
              profiles={profiles}
              posts={posts}
              students={students}
              inventory={inventory}
              budget={budget}
              onNavigate={setCurrentTab}
            />
          )}

          {currentTab === 'subscriptions' && (
            <SubscriptionsView />
          )}

          {currentTab === 'users' && (
            <UsersView
              profiles={profiles}
              onRefresh={fetchAllData}
            />
          )}

          {currentTab === 'sunday_school' && (
            <SundaySchoolView
              students={students}
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
