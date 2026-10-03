export interface Profile {
  id: string;
  email?: string;
  full_name?: string;
  username?: string;
  phone?: string;
  service?: string;
  church?: string;
  role?: string;
  avatar_url?: string;
  bio?: string;
  points?: number;
  is_profile_complete?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CommunityPost {
  id: string;
  author_id: string;
  author_name: string;
  author_avatar?: string;
  church_name?: string;
  content: string;
  image_url?: string;
  likes_count: number;
  comments_count: number;
  is_announcement?: boolean;
  created_at: string;
}

export interface PostComment {
  id: string;
  post_id: string;
  author_id: string;
  author_name: string;
  author_avatar?: string;
  content: string;
  created_at: string;
}

export interface SundaySchoolStage {
  id: string;
  name: string;
  code: string;
  description?: string;
  order_index?: number;
}

export interface SundaySchoolStudent {
  id: string;
  stage_id: string;
  full_name: string;
  phone?: string;
  parent_phone?: string;
  birth_date?: string;
  notes?: string;
  spiritual_father?: string;
  church?: string;
  address?: string;
  created_at?: string;
}

export interface AttendanceRecord {
  id: string;
  student_id: string;
  session_date: string;
  is_present: boolean;
  notes?: string;
  servant_id?: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  total_quantity: number;
  available_quantity: number;
  location?: string;
  condition?: string;
  notes?: string;
  updated_at?: string;
}

export interface BorrowingRecord {
  id: string;
  item_id: string;
  borrower_name: string;
  borrower_phone?: string;
  quantity: number;
  borrow_date: string;
  expected_return_date?: string;
  actual_return_date?: string;
  status: 'active' | 'returned' | 'overdue';
  notes?: string;
}

export interface BudgetItem {
  id: string;
  title: string;
  category: string;
  amount: number;
  type: 'income' | 'expense';
  date: string;
  service_type?: string;
  notes?: string;
  recorded_by?: string;
}

export interface RewardItem {
  id: string;
  title: string;
  description?: string;
  points_cost: number;
  stock: number;
  image_url?: string;
  is_active: boolean;
}

export interface RewardRedemption {
  id: string;
  reward_id: string;
  user_id: string;
  points_spent: number;
  status: 'pending' | 'approved' | 'delivered' | 'cancelled';
  created_at: string;
  profiles?: Profile;
  rewards_store?: RewardItem;
}

export interface NotificationBroadcast {
  id?: string;
  title: string;
  body: string;
  target_role?: string;
  target_church?: string;
  created_at?: string;
}
