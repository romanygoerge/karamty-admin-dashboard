import React, { useState, useEffect } from 'react';
import { 
  GraduationCap, 
  UserPlus, 
  Check, 
  X, 
  Edit3, 
  Trash2, 
  Calendar, 
  Phone, 
  Save, 
  Search,
  FileText,
  UploadCloud,
  ExternalLink,
  Eye,
  BookOpen,
  Users
} from 'lucide-react';
import { SundaySchoolStudent, Profile } from '../types';
import { Modal } from '../components/Modal';
import { supabase } from '../lib/supabase';

interface SundaySchoolViewProps {
  students: SundaySchoolStudent[];
  profiles?: Profile[];
  initialSelectedUserId?: string | null;
  onRefresh: () => void;
}

const STAGES = [
  { id: 'kg', name: 'مرحلة حضانة', legacyIds: ['nursery'] },
  { id: 'prim_1_2', name: 'أولى وثانية ابتدائي', legacyIds: ['primary'] },
  { id: 'prim_3_4', name: 'ثالثة ورابعة ابتدائي', legacyIds: [] },
  { id: 'prim_5_6', name: 'خامسة وسادسة ابتدائي', legacyIds: [] },
  { id: 'prep_sec', name: 'إعدادي وثانوي', legacyIds: ['preparatory', 'secondary'] },
  { id: 'uni', name: 'جامعة وخريجين', legacyIds: ['university'] },
];

export const SundaySchoolView: React.FC<SundaySchoolViewProps> = ({ 
  students, 
  profiles = [], 
  initialSelectedUserId = null, 
  onRefresh 
}) => {
  const [selectedStage, setSelectedStage] = useState('prim_1_2');
  const [selectedUserId, setSelectedUserId] = useState<string | 'all'>(() => initialSelectedUserId || 'all');
  const [studentServantUserId, setStudentServantUserId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'attendance' | 'curriculum'>('attendance');
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().slice(0, 10);
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [attendanceMap, setAttendanceMap] = useState<Record<string, boolean>>({});
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [isSavingAttendance, setIsSavingAttendance] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    if (initialSelectedUserId) {
      setSelectedUserId(initialSelectedUserId);
    }
  }, [initialSelectedUserId]);

  // Curriculum PDF State
  const [stageCurricula, setStageCurricula] = useState<Record<string, { pdf_url: string; pdf_title: string; stage_id?: string }>>({});
  const [isSavingCurriculum, setIsSavingCurriculum] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);

  // Modals
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [isEditStudentOpen, setIsEditStudentOpen] = useState(false);
  const [activeStudent, setActiveStudent] = useState<SundaySchoolStudent | null>(null);

  // Student Form
  const [studentName, setStudentName] = useState('');
  const [studentPhone, setStudentPhone] = useState('');
  const [studentParentPhone, setStudentParentPhone] = useState('');
  const [studentFather, setStudentFather] = useState('');
  const [studentNotes, setStudentNotes] = useState('');

  // Fetch stage curricula metadata from Supabase
  useEffect(() => {
    async function fetchCurricula() {
      try {
        const { data, error } = await supabase
          .from('sunday_school_stages')
          .select('id, stage_code, name, pdf_url, pdf_title');

        if (error) {
          console.error('Error fetching curricula:', error);
          return;
        }

        if (data) {
          const map: Record<string, { pdf_url: string; pdf_title: string; stage_id?: string }> = {};
          data.forEach((row: any) => {
            const code = row.stage_code || row.id;
            map[code] = {
              pdf_url: row.pdf_url || '',
              pdf_title: row.pdf_title || '',
              stage_id: row.id,
            };
          });
          setStageCurricula(map);
        }
      } catch (err) {
        console.error(err);
      }
    }

    fetchCurricula();
  }, []);

  // Fetch attendance records for the selected date
  useEffect(() => {
    async function fetchAttendance() {
      setLoadingAttendance(true);
      try {
        const { data, error } = await supabase
          .from('sunday_school_attendance')
          .select('student_id, is_present')
          .eq('session_date', selectedDate);

        if (error) {
          console.error('Error fetching attendance:', error);
          return;
        }

        const map: Record<string, boolean> = {};
        data?.forEach((rec: any) => {
          map[rec.student_id] = rec.is_present;
        });
        setAttendanceMap(map);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingAttendance(false);
      }
    }

    fetchAttendance();
  }, [selectedDate]);

  // Lookup map of all user profiles
  const profilesMap = React.useMemo(() => {
    const map = new Map<string, Profile>();
    profiles.forEach((p) => map.set(p.id, p));
    return map;
  }, [profiles]);

  // Compute servant accounts who have registered students
  const servantAccounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    students.forEach((s) => {
      if (s.user_id) {
        counts[s.user_id] = (counts[s.user_id] || 0) + 1;
      }
    });

    return profiles
      .map((p) => ({
        ...p,
        studentCount: counts[p.id] || 0,
      }))
      .sort((a, b) => b.studentCount - a.studentCount);
  }, [students, profiles]);

  // Isolated students filtered by selected servant account
  const accountFilteredStudents = React.useMemo(() => {
    if (selectedUserId === 'all') return students;
    return students.filter((s) => s.user_id === selectedUserId);
  }, [students, selectedUserId]);

  const selectedUser = selectedUserId !== 'all' ? profilesMap.get(selectedUserId) : null;
  const selectedUserStudentsCount = accountFilteredStudents.length;

  const currentStageObj = STAGES.find((s) => s.id === selectedStage) || STAGES[0];

  const stageStudents = accountFilteredStudents.filter((s) => {
    if (s.stage_id === selectedStage) return true;
    if (currentStageObj.legacyIds?.includes(s.stage_id)) return true;
    if (!s.stage_id && selectedStage === 'prim_1_2') return true;
    return false;
  });

  const filteredStudents = stageStudents.filter(
    (s) => s.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
           s.phone?.includes(searchTerm) ||
           s.parent_phone?.includes(searchTerm)
  );

  const handleToggleAttendance = (studentId: string) => {
    setAttendanceMap((prev) => ({
      ...prev,
      [studentId]: !prev[studentId],
    }));
  };

  const handleSaveAttendance = async () => {
    setIsSavingAttendance(true);
    try {
      const recordsToUpsert = stageStudents.map((s) => ({
        student_id: s.id,
        session_date: selectedDate,
        is_present: !!attendanceMap[s.id],
      }));

      if (recordsToUpsert.length > 0) {
        const { error } = await supabase
          .from('sunday_school_attendance')
          .upsert(recordsToUpsert, { onConflict: 'student_id,session_date' });

        if (error) throw error;
      }

      setStatusMessage('تم حفظ كشف الحضور بنجاح ومزامنته مع التطبيق');
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      alert('خطأ أثناء حفظ الحضور: ' + err.message);
    } finally {
      setIsSavingAttendance(false);
    }
  };

  const handleUploadPdf = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      alert('يرجى اختيار ملف PDF صالح');
      return;
    }

    setUploadingPdf(true);
    try {
      const fileName = `${selectedStage}_${Date.now()}.pdf`;
      const filePath = `curricula/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('curriculum_pdfs')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('curriculum_pdfs')
        .getPublicUrl(filePath);

      const publicUrl = publicUrlData.publicUrl;
      const pdfTitle = stageCurricula[selectedStage]?.pdf_title?.trim() || `منهج ${currentStageObj.name} - مدارس الأحد`;

      // Auto-save immediately to database
      await supabase
        .from('sunday_school_stages')
        .update({
          pdf_url: publicUrl,
          pdf_title: pdfTitle,
        })
        .eq('stage_code', selectedStage);

      setStageCurricula((prev) => ({
        ...prev,
        [selectedStage]: {
          ...(prev[selectedStage] || { pdf_title: pdfTitle }),
          pdf_url: publicUrl,
        },
      }));

      setStatusMessage(`تم رفع وتفعيل منهج (${currentStageObj.name}) بنجاح! تم حفظه في التطبيق فوراً ⚡`);
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      alert('خطأ أثناء رفع الملف: ' + err.message);
    } finally {
      setUploadingPdf(false);
    }
  };

  const handleSaveCurriculum = async () => {
    setIsSavingCurriculum(true);
    try {
      const cur = stageCurricula[selectedStage];
      const pdfUrl = cur?.pdf_url?.trim() || '';
      const pdfTitle = cur?.pdf_title?.trim() || `منهج ${currentStageObj.name} - مدارس الأحد`;

      const { error } = await supabase
        .from('sunday_school_stages')
        .update({
          pdf_url: pdfUrl,
          pdf_title: pdfTitle,
        })
        .eq('stage_code', selectedStage);

      if (error) throw error;

      setStatusMessage(`تم حفظ وتحديث منهج (${currentStageObj.name}) بنجاح! سيظهر في تطبيق الموبايل فوراً.`);
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      alert('خطأ أثناء حفظ المنهج: ' + err.message);
    } finally {
      setIsSavingCurriculum(false);
    }
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName.trim()) return;

    try {
      const newId = crypto.randomUUID();
      const targetUserId = studentServantUserId || (selectedUserId !== 'all' ? selectedUserId : null);

      const { error } = await supabase.from('sunday_school_students').insert({
        id: newId,
        stage_id: selectedStage,
        full_name: studentName.trim(),
        phone: studentPhone.trim(),
        parent_phone: studentParentPhone.trim(),
        spiritual_father: studentFather.trim(),
        notes: studentNotes.trim(),
        user_id: targetUserId,
        created_at: new Date().toISOString(),
      });

      if (error) throw error;

      setIsAddStudentOpen(false);
      setStudentName('');
      setStudentPhone('');
      setStudentParentPhone('');
      setStudentFather('');
      setStudentNotes('');
      setStudentServantUserId('');
      onRefresh();
      setStatusMessage('تمت إضافة المخدوم بنجاح');
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      alert('خطأ أثناء إضافة الطالب: ' + err.message);
    }
  };

  const handleOpenEdit = (student: SundaySchoolStudent) => {
    setActiveStudent(student);
    setStudentName(student.full_name);
    setStudentPhone(student.phone || '');
    setStudentParentPhone(student.parent_phone || '');
    setStudentFather(student.spiritual_father || '');
    setStudentNotes(student.notes || '');
    setStudentServantUserId(student.user_id || '');
    setIsEditStudentOpen(true);
  };

  const handleUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStudent || !studentName.trim()) return;

    try {
      const { error } = await supabase
        .from('sunday_school_students')
        .update({
          full_name: studentName.trim(),
          phone: studentPhone.trim(),
          parent_phone: studentParentPhone.trim(),
          spiritual_father: studentFather.trim(),
          notes: studentNotes.trim(),
          user_id: studentServantUserId || null,
        })
        .eq('id', activeStudent.id);

      if (error) throw error;

      setIsEditStudentOpen(false);
      onRefresh();
      setStatusMessage('تم تعديل بيانات الطالب بنجاح');
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      alert('خطأ أثناء التعديل: ' + err.message);
    }
  };

  const handleDeleteStudent = async (studentId: string, name: string) => {
    if (!confirm(`هل أنت متأكد من حذف الطالب (${name}) من كشف مدارس الأحد؟`)) return;

    try {
      // Delete attendance records first
      await supabase.from('sunday_school_attendance').delete().eq('student_id', studentId);
      const { error } = await supabase.from('sunday_school_students').delete().eq('id', studentId);
      if (error) throw error;

      onRefresh();
      setStatusMessage('تم حذف الطالب من الكشف');
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      alert('خطأ أثناء الحذف: ' + err.message);
    }
  };

  const presentCount = stageStudents.filter((s) => attendanceMap[s.id]).length;
  const attendanceRate = stageStudents.length > 0 ? Math.round((presentCount / stageStudents.length) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-panel p-5 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-amber-500/20 text-gold-400">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">مدارس الأحد، المناهج الدراسية، وكشف الحضور</h3>
            <p className="text-xs text-slate-400">إدارة ملفات مناهج PDF لكل مرحلة عمرية، ومتابعة حضور المخدومين وإدارة بياناتهم</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsAddStudentOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-lg shadow-brand-600/30 transition-all"
          >
            <UserPlus className="w-4 h-4" />
            <span>إضافة مخدوم / طالب جديد</span>
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-2">
          <Check className="w-4 h-4" />
          {statusMessage}
        </div>
      )}

      {/* Servant / User Account Isolation Selector */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white flex items-center gap-2">
                <span>تصفية وعزل المخدومين حسب حساب الخادم المسجّل</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-brand-500/10 text-brand-400 border border-brand-500/20">
                  حسابات مستقلة
                </span>
              </h4>
              <p className="text-[11px] text-slate-400">
                اختر خادماً لعرض كشف مخدوميه الخاص به فقط، أو اختر عرض الكل لمتابعة الكشف العام
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 font-medium focus:outline-none focus:border-brand-500 max-w-[280px] sm:max-w-xs truncate"
            >
              <option value="all">كل الخدام والمستخدمين (عرض مجمع - {students.length} مخدوم)</option>
              {servantAccounts.map(servant => (
                <option key={servant.id} value={servant.id}>
                  {servant.full_name} ({servant.studentCount} مخدوم {servant.church ? `• ${servant.church}` : ''})
                </option>
              ))}
            </select>

            {selectedUserId !== 'all' && (
              <button
                onClick={() => setSelectedUserId('all')}
                className="px-2.5 py-2 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors whitespace-nowrap"
                title="إلغاء التصفية وعرض الكل"
              >
                عرض الكل
              </button>
            )}
          </div>
        </div>

        {/* Selected Servant Summary Banner */}
        {selectedUser && (
          <div className="p-3 rounded-xl bg-gradient-to-r from-purple-950/40 via-slate-900 to-slate-900 border border-purple-500/30 flex flex-wrap items-center justify-between gap-3 text-xs animate-fadeIn">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow-md">
                {selectedUser.full_name?.charAt(0) || 'خ'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-sm">{selectedUser.full_name}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20">
                    كشف مخدومي هذا الحساب فقط
                  </span>
                </div>
                <div className="flex items-center gap-3 text-slate-400 text-[11px] mt-0.5">
                  <span>{selectedUser.church || selectedUser.service || 'كنيسة قبطية'}</span>
                  {selectedUser.phone && <span>• هاتف: {selectedUser.phone}</span>}
                  {selectedUser.email && <span>• {selectedUser.email}</span>}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="px-3 py-1.5 rounded-lg bg-purple-500/20 border border-purple-500/30 text-purple-300 font-bold text-xs">
                إجمالي مخدومي هذا الحساب: {selectedUserStudentsCount} مخدوم
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Stage Selector Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {STAGES.map((stg) => {
          const count = accountFilteredStudents.filter(
            (s) => s.stage_id === stg.id || stg.legacyIds.includes(s.stage_id)
          ).length;
          const isActive = selectedStage === stg.id;
          const hasPdf = !!stageCurricula[stg.id]?.pdf_url;
          return (
            <button
              key={stg.id}
              onClick={() => setSelectedStage(stg.id)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 ${
                isActive
                  ? 'bg-gold-500 text-slate-950 shadow-md shadow-gold-500/20'
                  : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white border border-slate-800'
              }`}
            >
              <span>{stg.name}</span>
              {hasPdf && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="تم رفع ملف PDF"></span>
              )}
              <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                isActive ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-800 text-slate-400'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Sub-Tab Navigation: Attendance vs Curriculum PDF */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('attendance')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'attendance'
              ? 'bg-brand-600 text-white shadow-md shadow-brand-600/25'
              : 'text-slate-400 hover:text-white bg-slate-900/60 border border-slate-800'
          }`}
        >
          <Check className="w-4 h-4" />
          <span>كشف الحضور الأسبوعي</span>
        </button>

        <button
          onClick={() => setActiveTab('curriculum')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'curriculum'
              ? 'bg-brand-600 text-white shadow-md shadow-brand-600/25'
              : 'text-slate-400 hover:text-white bg-slate-900/60 border border-slate-800'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>منهج المرحلة (ملف PDF)</span>
          {stageCurricula[selectedStage]?.pdf_url && (
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          )}
        </button>
      </div>

      {/* Tab Content 1: Curriculum PDF Management */}
      {activeTab === 'curriculum' ? (
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-brand-500/20 text-brand-400">
                <BookOpen className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white flex items-center gap-2">
                  <span>منهج {currentStageObj.name}</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-brand-500/20 text-brand-300 font-semibold">
                    ملف PDF
                  </span>
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  ارفع ملف الـ PDF المخصص لهذه المرحلة العمرية أو ضع رابطه المباشر ليعرض في التطبيق بشكل احترافي
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              {stageCurricula[selectedStage]?.pdf_url && (
                <a
                  href={stageCurricula[selectedStage].pdf_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all border border-slate-700"
                >
                  <Eye className="w-4 h-4 text-brand-400" />
                  <span>معاينة الـ PDF</span>
                  <ExternalLink className="w-3 h-3 text-slate-500" />
                </a>
              )}

              <button
                onClick={handleSaveCurriculum}
                disabled={isSavingCurriculum || uploadingPdf}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 transition-all"
              >
                <Save className="w-4 h-4" />
                <span>{isSavingCurriculum ? 'جارٍ الحفظ...' : 'حفظ منهج المرحلة'}</span>
              </button>
            </div>
          </div>

          {/* Form Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                عنوان أو وصف المنهج
              </label>
              <input
                type="text"
                value={stageCurricula[selectedStage]?.pdf_title ?? `منهج ${currentStageObj.name} - مدارس الأحد`}
                onChange={(e) =>
                  setStageCurricula((prev) => ({
                    ...prev,
                    [selectedStage]: {
                      ...(prev[selectedStage] || { pdf_url: '', stage_id: '' }),
                      pdf_title: e.target.value,
                    },
                  }))
                }
                placeholder="مثال: منهج أولى وثانية ابتدائي - طقس وعقيدة"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
              />
              <p className="text-[11px] text-slate-500 mt-1">يظهر كعنوان رئيسي في أعلى شاشة المنهج بتطبيق الموبايل</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                رابط ملف الـ PDF المباشر (URL)
              </label>
              <input
                type="url"
                value={stageCurricula[selectedStage]?.pdf_url ?? ''}
                onChange={(e) =>
                  setStageCurricula((prev) => ({
                    ...prev,
                    [selectedStage]: {
                      ...(prev[selectedStage] || { pdf_title: `منهج ${currentStageObj.name}`, stage_id: '' }),
                      pdf_url: e.target.value,
                    },
                  }))
                }
                placeholder="https://.../curriculum.pdf"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
              />
              <p className="text-[11px] text-slate-500 mt-1">يمكنك إدخال رابط خارجي مباشر أو رفع ملف من جهازك أدناه</p>
            </div>
          </div>

          {/* File Upload Box */}
          <div className="p-6 rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 flex flex-col items-center justify-center text-center space-y-3">
            <div className="p-3.5 rounded-full bg-slate-800 text-brand-400">
              <UploadCloud className="w-7 h-7" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">رفع ملف PDF جديد من جهازك لمرحلة ({currentStageObj.name})</p>
              <p className="text-[11px] text-slate-400 mt-0.5">سيتم رفع الملف إلى سحابة التخزين وتوليد الرابط وحفظه تلقائياً</p>
            </div>

            <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-md shadow-brand-600/20 transition-all">
              <FileText className="w-4 h-4" />
              <span>{uploadingPdf ? 'جارٍ رفع ملف الـ PDF...' : 'اختر ملف PDF من جهازك'}</span>
              <input
                type="file"
                accept="application/pdf,.pdf"
                disabled={uploadingPdf}
                onChange={handleUploadPdf}
                className="hidden"
              />
            </label>
          </div>

          {/* Live Status indicator */}
          <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 text-xs text-slate-400 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${stageCurricula[selectedStage]?.pdf_url ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
              <span>
                حالة منهج المرحلة في التطبيق:{' '}
                <strong className={stageCurricula[selectedStage]?.pdf_url ? 'text-emerald-400' : 'text-amber-400'}>
                  {stageCurricula[selectedStage]?.pdf_url ? 'مرفوع ويعمل في التطبيق ⚡' : 'لم يتم تحديد ملف PDF بعد'}
                </strong>
              </span>
            </div>
            {stageCurricula[selectedStage]?.pdf_url && (
              <span className="text-[11px] text-slate-500 truncate max-w-[320px]">
                {stageCurricula[selectedStage].pdf_url}
              </span>
            )}
          </div>
        </div>
      ) : (
        /* Tab Content 2: Weekly Attendance */
        <>
          {/* Control Bar: Date picker & Save Attendance */}
          <div className="glass-panel p-3.5 sm:p-4 rounded-2xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 sm:gap-4">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full md:w-auto">
              <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl text-xs text-slate-300">
                <Calendar className="w-4 h-4 text-brand-400 shrink-0" />
                <span className="shrink-0">تاريخ الحصة:</span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-transparent text-white font-bold focus:outline-none cursor-pointer text-xs"
                />
              </div>

              <div className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs flex items-center gap-1.5 sm:gap-2">
                <span className="text-slate-400">نسبة الحضور:</span>
                <span className="font-bold text-gold-400">{attendanceRate}%</span>
                <span className="text-slate-500 text-[11px]">({presentCount} من {stageStudents.length})</span>
              </div>
            </div>

            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-3 w-full md:w-auto justify-end">
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="بحث بالاسم أو الهاتف..."
                  className="w-full bg-slate-900 text-xs text-slate-200 placeholder-slate-500 rounded-xl pr-9 pl-3 py-2 border border-slate-800 focus:outline-none focus:border-brand-500"
                />
              </div>

              <button
                onClick={handleSaveAttendance}
                disabled={isSavingAttendance || loadingAttendance || stageStudents.length === 0}
                className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 whitespace-nowrap transition-all"
              >
                <Save className="w-4 h-4 shrink-0" />
                <span>{isSavingAttendance ? 'جارٍ الحفظ...' : 'حفظ كشف الحضور'}</span>
              </button>
            </div>
          </div>

          {/* Students & Attendance Table */}
          <div className="glass-panel rounded-2xl overflow-hidden border border-slate-800">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[780px] text-right text-xs">
                <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4 font-semibold text-center w-16">حاضر؟</th>
                    <th className="py-3.5 px-4 font-semibold">اسم الطالب / المخدوم</th>
                    <th className="py-3.5 px-4 font-semibold">الخادم المسجّل / الكنيسة</th>
                    <th className="py-3.5 px-4 font-semibold">هاتف الطالب</th>
                    <th className="py-3.5 px-4 font-semibold">هاتف ولي الأمر</th>
                    <th className="py-3.5 px-4 font-semibold">أب الاعتراف</th>
                    <th className="py-3.5 px-4 font-semibold">ملاحظات</th>
                    <th className="py-3.5 px-4 font-semibold text-center">تعديل / حذف</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredStudents.map((student) => {
                    const isPresent = !!attendanceMap[student.id];
                    return (
                      <tr
                        key={student.id}
                        className={`transition-colors ${
                          isPresent ? 'bg-emerald-950/20 hover:bg-emerald-950/30' : 'hover:bg-slate-800/30'
                        }`}
                      >
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => handleToggleAttendance(student.id)}
                            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                              isPresent
                                ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30'
                                : 'bg-slate-800 text-slate-500 hover:border-slate-600 border border-slate-700'
                            }`}
                          >
                            {isPresent ? <Check className="w-4 h-4" /> : <X className="w-3.5 h-3.5" />}
                          </button>
                        </td>

                        <td className="py-3 px-4 font-bold text-white">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[11px] font-bold text-gold-400">
                              {student.full_name?.charAt(0) || 'ط'}
                            </div>
                            <span>{student.full_name}</span>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          {student.user_id && profilesMap.has(student.user_id) ? (
                            <div className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                              <div>
                                <span className="font-bold text-slate-200 text-xs block">
                                  {profilesMap.get(student.user_id)?.full_name}
                                </span>
                                <span className="text-[10px] text-slate-400 block truncate max-w-[150px]">
                                  {profilesMap.get(student.user_id)?.church || 'كنيسة مسجلة'}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-500 text-[11px]">عام / غير محدد</span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-slate-300">
                          {student.phone ? (
                            <div className="flex items-center gap-1">
                              <Phone className="w-3 h-3 text-slate-500" />
                              <span>{student.phone}</span>
                            </div>
                          ) : (
                            <span className="text-slate-600">-</span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-slate-300">
                          {student.parent_phone ? (
                            <div className="flex items-center gap-1 text-brand-400">
                              <Phone className="w-3 h-3 text-brand-500" />
                              <span>{student.parent_phone}</span>
                            </div>
                          ) : (
                            <span className="text-slate-600">-</span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-slate-400">
                          {student.spiritual_father || '-'}
                        </td>

                        <td className="py-3 px-4 text-slate-400 max-w-[200px] truncate">
                          {student.notes || '-'}
                        </td>

                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleOpenEdit(student)}
                              title="تعديل اسم أو بيانات الطالب"
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-brand-600 text-slate-300 hover:text-white transition-all"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteStudent(student.id, student.full_name)}
                              title="حذف الطالب من الكشف"
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white transition-all"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredStudents.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500 text-xs">
                        لا يوجد مخدومين مسجلين في هذه المرحلة حالياً. اضغط على "إضافة مخدوم جديد" للبدء.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Add Student Modal */}
      <Modal
        isOpen={isAddStudentOpen}
        onClose={() => setIsAddStudentOpen(false)}
        title={`إضافة مخدوم إلى (${currentStageObj.name})`}
      >
        <form onSubmit={handleAddStudent} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-400 font-semibold mb-1">اسم الطالب بالكامل *</label>
            <input
              type="text"
              required
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              placeholder="مثال: بيشوي عماد رمزي"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">الخادم / المستخدم المسؤول *</label>
            <select
              value={studentServantUserId || (selectedUserId !== 'all' ? selectedUserId : '')}
              onChange={(e) => setStudentServantUserId(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-brand-500"
            >
              <option value="">بدون تعيين خادم محدد</option>
              {servantAccounts.map(servant => (
                <option key={servant.id} value={servant.id}>
                  {servant.full_name} ({servant.church || 'الكنيسة'})
                </option>
              ))}
            </select>
            <p className="text-[10px] text-slate-500 mt-1">
              سيظهر هذا الطالب تحت حساب هذا الخادم فقط في التطبيق والداش بورد
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">رقم هاتف الطالب</label>
              <input
                type="text"
                value={studentPhone}
                onChange={(e) => setStudentPhone(e.target.value)}
                placeholder="01xxxxxxxxx"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">هاتف ولي الأمر</label>
              <input
                type="text"
                value={studentParentPhone}
                onChange={(e) => setStudentParentPhone(e.target.value)}
                placeholder="01xxxxxxxxx"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">أب الاعتراف</label>
            <input
              type="text"
              value={studentFather}
              onChange={(e) => setStudentFather(e.target.value)}
              placeholder="أبونا ..."
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">ملاحظات</label>
            <textarea
              rows={2}
              value={studentNotes}
              onChange={(e) => setStudentNotes(e.target.value)}
              placeholder="أي ملاحظات حول المخدوم أو العنوان..."
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsAddStudentOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 font-semibold"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold shadow-lg shadow-brand-600/30"
            >
              <UserPlus className="w-4 h-4" />
              <span>إضافة الطالب</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Student Modal */}
      <Modal
        isOpen={isEditStudentOpen}
        onClose={() => setIsEditStudentOpen(false)}
        title="تعديل بيانات الطالب"
      >
        <form onSubmit={handleUpdateStudent} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-400 font-semibold mb-1">اسم الطالب بالكامل *</label>
            <input
              type="text"
              required
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">الخادم / المستخدم المسؤول</label>
            <select
              value={studentServantUserId}
              onChange={(e) => setStudentServantUserId(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-brand-500"
            >
              <option value="">بدون تعيين خادم محدد</option>
              {servantAccounts.map(servant => (
                <option key={servant.id} value={servant.id}>
                  {servant.full_name} ({servant.church || 'الكنيسة'})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">رقم هاتف الطالب</label>
              <input
                type="text"
                value={studentPhone}
                onChange={(e) => setStudentPhone(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">هاتف ولي الأمر</label>
              <input
                type="text"
                value={studentParentPhone}
                onChange={(e) => setStudentParentPhone(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">أب الاعتراف</label>
            <input
              type="text"
              value={studentFather}
              onChange={(e) => setStudentFather(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">ملاحظات</label>
            <textarea
              rows={2}
              value={studentNotes}
              onChange={(e) => setStudentNotes(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsEditStudentOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 font-semibold"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold shadow-lg shadow-brand-600/30"
            >
              <Save className="w-4 h-4" />
              <span>حفظ التعديل</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
