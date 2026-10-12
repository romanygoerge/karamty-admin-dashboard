import React, { useState, useEffect, useRef } from 'react';
import { 
  Headphones, 
  MessageSquare, 
  Send, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Search, 
  RefreshCw, 
  User, 
  Mail, 
  Phone, 
  Sparkles, 
  ShieldCheck, 
  Check, 
  Filter,
  CheckCheck,
  ChevronLeft,
  ArrowRight
} from 'lucide-react';
import { supabase } from '../lib/supabase';

export interface SupportTicket {
  id: string;
  user_id: string;
  user_name: string;
  user_email?: string;
  user_phone?: string;
  user_avatar_url?: string;
  subject: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  last_message: string;
  last_message_at: string;
  last_sender_type: 'user' | 'admin';
  unread_for_admin: number;
  unread_for_user: number;
  created_at: string;
  updated_at: string;
}

export interface SupportMessage {
  id: string;
  ticket_id: string;
  sender_type: 'user' | 'admin';
  sender_id?: string;
  sender_name: string;
  sender_avatar_url?: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export const SupportView: React.FC = () => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [replyText, setReplyText] = useState('');
  const [isLoadingTickets, setIsLoadingTickets] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [statusNotification, setStatusNotification] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Quick Canned Responses
  const quickReplies = [
    'أهلاً بك يا فندم! جارِ مراجعة طلبك فوراً ⏳',
    'تم حل المشكلة بنجاح، برجاء إعادة تشغيل التطبيق للتأكد ✅',
    'هل يمكنك تزويدنا بتفاصيل إضافية أو صورة من المشكلة؟ 📸',
    'سعداء بخدمتك دائماً، صلواتكم معنا من أجل الخدمة 🙏',
  ];

  // Fetch all tickets
  const fetchTickets = async () => {
    setIsLoadingTickets(true);
    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .order('last_message_at', { ascending: false });

      if (error) throw error;
      setTickets(data || []);

      // If no ticket selected yet, auto select the first one on desktop
      if (data && data.length > 0 && !selectedTicketId) {
        setSelectedTicketId(data[0].id);
      }
    } catch (err) {
      console.error('Error fetching support tickets:', err);
    } finally {
      setIsLoadingTickets(false);
    }
  };

  // Fetch messages for selected ticket
  const fetchMessages = async (ticketId: string) => {
    setIsLoadingMessages(true);
    try {
      const { data, error } = await supabase
        .from('support_messages')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);

      // Mark unread for admin as 0
      await supabase
        .from('support_tickets')
        .update({ unread_for_admin: 0 })
        .eq('id', ticketId);

      // Update in local state
      setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, unread_for_admin: 0 } : t));
    } catch (err) {
      console.error('Error fetching messages:', err);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  // Auto scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initial load
  useEffect(() => {
    fetchTickets();
  }, []);

  // When selected ticket changes, fetch its messages
  useEffect(() => {
    if (selectedTicketId) {
      fetchMessages(selectedTicketId);
    } else {
      setMessages([]);
    }
  }, [selectedTicketId]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('karamty_support_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setTickets(prev => [payload.new as SupportTicket, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          setTickets(prev => prev.map(t => t.id === payload.new.id ? (payload.new as SupportTicket) : t));
        } else if (payload.eventType === 'DELETE') {
          setTickets(prev => prev.filter(t => t.id === payload.old.id));
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_messages' }, (payload) => {
        const newMsg = payload.new as SupportMessage;
        if (selectedTicketId && newMsg.ticket_id === selectedTicketId) {
          setMessages(prev => {
            if (prev.some(m => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedTicketId]);

  // Send Admin Reply
  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText || replyText;
    if (!textToSend.trim() || !selectedTicketId || isSending) return;

    setIsSending(true);
    try {
      const { data, error } = await supabase
        .from('support_messages')
        .insert({
          ticket_id: selectedTicketId,
          sender_type: 'admin',
          sender_name: 'فريق الدعم الفني',
          message: textToSend.trim(),
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setMessages(prev => [...prev, data]);
        setTickets(prev => prev.map(t => t.id === selectedTicketId ? {
          ...t,
          last_message: textToSend.trim(),
          last_message_at: new Date().toISOString(),
          last_sender_type: 'admin',
          unread_for_user: (t.unread_for_user || 0) + 1,
        } : t));
      }
      setReplyText('');
      showStatusNotice('تم إرسال الرد للمستخدم بنجاح');
    } catch (err) {
      console.error('Error sending message:', err);
      showStatusNotice('حدث خطأ أثناء إرسال الرسالة');
    } finally {
      setIsSending(false);
    }
  };

  // Change ticket status
  const handleUpdateStatus = async (ticketId: string, newStatus: 'open' | 'in_progress' | 'resolved' | 'closed') => {
    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', ticketId);

      if (error) throw error;
      setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status: newStatus } : t));
      showStatusNotice(`تم تحديث حالة المحادثة إلى ${getStatusLabel(newStatus)}`);
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  const showStatusNotice = (msg: string) => {
    setStatusNotification(msg);
    setTimeout(() => setStatusNotification(null), 3000);
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'open': return 'مفتوحة / جديد';
      case 'in_progress': return 'قيد المتابعة';
      case 'resolved': return 'تم الحل';
      case 'closed': return 'مغلقة';
      default: return status;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">مفتوحة</span>;
      case 'in_progress':
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20">قيد المتابعة</span>;
      case 'resolved':
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-teal-500/10 text-teal-300 border border-teal-500/20">تم الحل</span>;
      case 'closed':
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/20">مغلقة</span>;
      default:
        return null;
    }
  };

  // Filtered tickets
  const filteredTickets = tickets.filter(t => {
    const matchesSearch = 
      t.user_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.user_email && t.user_email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (t.user_phone && t.user_phone.includes(searchQuery)) ||
      (t.last_message && t.last_message.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (t.subject && t.subject.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = 
      statusFilter === 'all' ? true :
      statusFilter === 'unread' ? t.unread_for_admin > 0 :
      t.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const selectedTicket = tickets.find(t => t.id === selectedTicketId);

  // KPIs
  const totalTickets = tickets.length;
  const unreadCount = tickets.reduce((acc, t) => acc + (t.unread_for_admin > 0 ? 1 : 0), 0);
  const inProgressCount = tickets.filter(t => t.status === 'in_progress').length;
  const resolvedCount = tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length;

  return (
    <div className="space-y-6">
      {/* Status notice */}
      {statusNotification && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 bg-emerald-600 text-white rounded-xl shadow-2xl flex items-center gap-2 text-sm font-medium animate-bounce">
          <Check className="w-4 h-4" />
          {statusNotification}
        </div>
      )}

      {/* Top KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400 font-medium">إجمالي التذاكر</div>
            <div className="text-2xl font-bold text-slate-100 mt-1">{totalTickets}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <Headphones className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400 font-medium">بانتظار رد الإدارة</div>
            <div className="text-2xl font-bold text-amber-400 mt-1">{unreadCount}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400 font-medium">قيد المتابعة</div>
            <div className="text-2xl font-bold text-sky-400 mt-1">{inProgressCount}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400 font-medium">تم الحل والانتهاء</div>
            <div className="text-2xl font-bold text-teal-400 mt-1">{resolvedCount}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Two-Column Chat Container */}
      <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl grid grid-cols-1 lg:grid-cols-12 min-h-[620px] max-h-[820px]">
        
        {/* RIGHT COLUMN: Conversation List (4 cols on lg) */}
        <div className={`lg:col-span-4 border-l border-slate-800 flex flex-col h-[620px] lg:h-full ${selectedTicketId ? 'hidden lg:flex' : 'flex'}`}>
          {/* Header & Search */}
          <div className="p-3.5 border-b border-slate-800 bg-slate-950/40 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Headphones className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-slate-100 text-sm">محادثات المستخدمين</h3>
              </div>
              <button 
                onClick={fetchTickets}
                className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
                title="تحديث القائمة"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingTickets ? 'animate-spin text-purple-400' : ''}`} />
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="بحث بالاسم، الإيميل، أو الرسالة..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-3 pr-8 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-all"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px]">
              {[
                { id: 'all', label: 'الكل' },
                { id: 'unread', label: 'جديد / يحتاج رد' },
                { id: 'open', label: 'مفتوحة' },
                { id: 'in_progress', label: 'متابعة' },
                { id: 'resolved', label: 'تم الحل' },
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setStatusFilter(f.id)}
                  className={`px-2.5 py-1 rounded-lg whitespace-nowrap transition-all ${
                    statusFilter === f.id
                      ? 'bg-purple-600 text-white font-medium shadow-sm'
                      : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Ticket items scroll list */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60">
            {isLoadingTickets ? (
              <div className="p-8 text-center text-slate-500 text-sm flex flex-col items-center gap-2">
                <RefreshCw className="w-5 h-5 animate-spin text-purple-400" />
                <span>جارِ تحميل المحادثات...</span>
              </div>
            ) : filteredTickets.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                لا توجد محادثات مطابقة للبحث
              </div>
            ) : (
              filteredTickets.map(ticket => {
                const isSelected = ticket.id === selectedTicketId;
                const hasUnread = ticket.unread_for_admin > 0;

                return (
                  <div
                    key={ticket.id}
                    onClick={() => setSelectedTicketId(ticket.id)}
                    className={`p-3.5 cursor-pointer transition-all flex items-start gap-3 relative ${
                      isSelected
                        ? 'bg-purple-950/30 border-r-4 border-r-purple-500'
                        : hasUnread
                        ? 'bg-slate-900/90 hover:bg-slate-850'
                        : 'hover:bg-slate-850/60'
                    }`}
                  >
                    {/* User Avatar */}
                    <div className="relative flex-shrink-0">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
                        {ticket.user_name ? ticket.user_name.charAt(0) : 'م'}
                      </div>
                      {hasUnread && (
                        <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full border-2 border-slate-900 animate-pulse" />
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className={`text-xs truncate ${hasUnread ? 'font-bold text-slate-100' : 'font-medium text-slate-200'}`}>
                          {ticket.user_name || 'مستخدم مجهول'}
                        </span>
                        <span className="text-[10px] text-slate-400 flex-shrink-0">
                          {ticket.last_message_at ? new Date(ticket.last_message_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>

                      <p className={`text-xs line-clamp-1 mb-1.5 ${hasUnread ? 'text-amber-300 font-medium' : 'text-slate-400'}`}>
                        {ticket.last_sender_type === 'admin' ? 'الإدارة: ' : ''}{ticket.last_message || 'محادثة جديدة'}
                      </p>

                      <div className="flex items-center justify-between gap-2">
                        {getStatusBadge(ticket.status)}
                        {hasUnread && (
                          <span className="px-1.5 py-0.2 bg-amber-500 text-slate-950 text-[10px] font-bold rounded-full">
                            جديد
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* LEFT COLUMN: Active Chat Panel (8 cols on lg) */}
        <div className={`lg:col-span-8 flex flex-col h-[620px] lg:h-full bg-slate-950/60 ${!selectedTicketId ? 'hidden lg:flex items-center justify-center' : 'flex'}`}>
          {!selectedTicket ? (
            <div className="p-8 text-center text-slate-500 flex flex-col items-center justify-center h-full">
              <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600 mb-3">
                <MessageSquare className="w-8 h-8" />
              </div>
              <h4 className="text-slate-300 font-semibold text-sm">اختر محادثة لعرض تفاصيلها والرد عليها</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                يمكنك التحدث مع المستخدم مباشرة وحل مشكلاته وتغيير حالة التذكرة في أي وقت
              </p>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="p-3.5 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  {/* Back button for mobile */}
                  <button
                    onClick={() => setSelectedTicketId(null)}
                    className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg lg:hidden"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <div className="w-9 h-9 rounded-full bg-purple-600/30 border border-purple-500/30 flex items-center justify-center text-purple-300 font-bold text-sm">
                    {selectedTicket.user_name ? selectedTicket.user_name.charAt(0) : 'م'}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-100 text-xs sm:text-sm">{selectedTicket.user_name}</h4>
                      {getStatusBadge(selectedTicket.status)}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                      {selectedTicket.user_phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-500" />
                          {selectedTicket.user_phone}
                        </span>
                      )}
                      {selectedTicket.user_email && (
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3 text-slate-500" />
                          {selectedTicket.user_email}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions: Status Dropdown */}
                <div className="flex items-center gap-2">
                  <select
                    value={selectedTicket.status}
                    onChange={(e) => handleUpdateStatus(selectedTicket.id, e.target.value as any)}
                    className="bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
                  >
                    <option value="open">مفتوحة</option>
                    <option value="in_progress">قيد المتابعة</option>
                    <option value="resolved">تم الحل ✅</option>
                    <option value="closed">إغلاق التذكرة ❌</option>
                  </select>
                </div>
              </div>

              {/* Chat Messages Body */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-950/40">
                {isLoadingMessages ? (
                  <div className="py-12 text-center text-slate-500 text-xs flex flex-col items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-purple-400" />
                    <span>جارِ تحميل الرسائل...</span>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 text-xs">
                    لا توجد رسائل سابقة في هذه المحادثة
                  </div>
                ) : (
                  messages.map(msg => {
                    const isAdmin = msg.sender_type === 'admin';

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isAdmin ? 'items-start' : 'items-end'}`}
                      >
                        <div
                          className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-3 shadow-md ${
                            isAdmin
                              ? 'bg-purple-600 text-white rounded-tr-none'
                              : 'bg-slate-800 text-slate-100 rounded-tl-none border border-slate-700/60'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3 mb-1">
                            <span className={`text-[10px] font-semibold flex items-center gap-1 ${isAdmin ? 'text-purple-200' : 'text-slate-400'}`}>
                              {isAdmin ? <ShieldCheck className="w-3 h-3" /> : <User className="w-3 h-3" />}
                              {isAdmin ? 'فريق الدعم الفني' : selectedTicket.user_name}
                            </span>
                            <span className={`text-[9px] ${isAdmin ? 'text-purple-200' : 'text-slate-500'}`}>
                              {new Date(msg.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-xs sm:text-sm whitespace-pre-wrap leading-relaxed">
                            {msg.message}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Replies Carousel */}
              <div className="p-2 border-t border-slate-800/80 bg-slate-900/40 overflow-x-auto scrollbar-none flex items-center gap-1.5">
                <span className="text-[10px] text-slate-500 font-medium whitespace-nowrap pl-1">ردود سريعة:</span>
                {quickReplies.map((qr, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(qr)}
                    disabled={isSending}
                    className="px-2.5 py-1 bg-slate-800/80 hover:bg-purple-600/30 hover:border-purple-500/40 border border-slate-700/60 rounded-full text-[11px] text-slate-300 hover:text-purple-200 transition-all whitespace-nowrap"
                  >
                    {qr}
                  </button>
                ))}
              </div>

              {/* Chat Input Footer */}
              <div className="p-3 border-t border-slate-800 bg-slate-900/80 flex items-center gap-2">
                <textarea
                  rows={1}
                  placeholder="اكتب ردك هنا... سيصل مباشرة إلى هاتف المستخدم"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  className="flex-1 bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500 resize-none max-h-24"
                />

                <button
                  onClick={() => handleSendMessage()}
                  disabled={!replyText.trim() || isSending}
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-purple-600/20 transition-all flex-shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>إرسال</span>
                </button>
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
};
