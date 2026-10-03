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
  Search
} from 'lucide-react';
import { SundaySchoolStudent, AttendanceRecord } from '../types';
import { Modal } from '../components/Modal';
import { supabase } from '../lib/supabase';

interface SundaySchoolViewProps {
  students: SundaySchoolStudent[];
  onRefresh: () => void;
}

const STAGES = [
  { id: 'nursery', name: 'مرحلة حضانة' },
  { id: 'primary', name: 'مرحلة ابتدائي' },
  { id: 'preparatory', name: 'مرحلة إعدادي' },
  { id: 'secondary', name: 'مرحلة ثانوي' },
  { id: 'university', name: 'جامعيين وخريجين' },
];

export const SundaySchoolView: React.FC<SundaySchoolViewProps> = ({ students, onRefresh }) => {
  const [selectedStage, setSelectedStage] = useState('primary');
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().slice(0, 10);
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [attendanceMap, setAttendanceMap] = useState<Record<string, boolean>>({});
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [isSavingAttendance, setIsSavingAttendance] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

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

  const stageStudents = students.filter(
    (s) => s.stage_id === selectedStage || (!s.stage_id && selectedStage === 'primary')
  );

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

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName.trim()) return;

    try {
      const newId = crypto.randomUUID();
      const { error } = await supabase.from('sunday_school_students').insert({
        id: newId,
        stage_id: selectedStage,
        full_name: studentName.trim(),
        phone: studentPhone.trim(),
        parent_phone: studentParentPhone.trim(),
        spiritual_father: studentFather.trim(),
        notes: studentNotes.trim(),
        created_at: new Date().toISOString(),
      });

      if (error) throw error;

      setIsAddStudentOpen(false);
      setStudentName('');
      setStudentPhone('');
      setStudentParentPhone('');
      setStudentFather('');
      setStudentNotes('');
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
            <h3 className="text-base font-bold text-white">مدارس الأحد وكشف الحضور الأسبوعي</h3>
            <p className="text-xs text-slate-400">تسجيل ومتابعة حضور المخدومين وإدارة بياناتهم وإمكانية التعديل والحذف</p>
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

      {/* Stage Selector Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {STAGES.map((stg) => {
          const count = students.filter((s) => s.stage_id === stg.id).length;
          const isActive = selectedStage === stg.id;
          return (
            <button
              key={stg.id}
              onClick={() => setSelectedStage(stg.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 ${
                isActive
                  ? 'bg-gold-500 text-slate-950 shadow-md shadow-gold-500/20'
                  : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white border border-slate-800'
              }`}
            >
              <span>{stg.name}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                isActive ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-800 text-slate-400'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Control Bar: Date picker & Save Attendance */}
      <div className="glass-panel p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl text-xs text-slate-300">
            <Calendar className="w-4 h-4 text-brand-400" />
            <span>تاريخ الحصة:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-white font-bold focus:outline-none cursor-pointer"
            />
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs flex items-center gap-2">
            <span className="text-slate-400">نسبة الحضور:</span>
            <span className="font-bold text-gold-400">{attendanceRate}%</span>
            <span className="text-slate-500">({presentCount} من {stageStudents.length})</span>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <div className="relative w-full md:w-64">
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
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 whitespace-nowrap transition-all"
          >
            <Save className="w-4 h-4" />
            <span>{isSavingAttendance ? 'جارٍ الحفظ...' : 'حفظ كشف الحضور'}</span>
          </button>
        </div>
      </div>

      {/* Students & Attendance Table */}
      <div className="glass-panel rounded-2xl overflow-hidden border border-slate-800">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4 font-semibold text-center w-16">حاضر؟</th>
                <th className="py-3.5 px-4 font-semibold">اسم الطالب / المخدوم</th>
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

      {/* Add Student Modal */}
      <Modal
        isOpen={isAddStudentOpen}
        onClose={() => setIsAddStudentOpen(false)}
        title={`إضافة مخدوم إلى (${STAGES.find((s) => s.id === selectedStage)?.name})`}
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">رقم هاتف الطالب</label>
              <input
                type="text"
                value={studentPhone}
                onChange={(e) => setStudentPhone(e.target.value)}
                placeholder="012XXXXXXXX"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">هاتف ولي الأمر</label>
              <input
                type="text"
                value={studentParentPhone}
                onChange={(e) => setStudentParentPhone(e.target.value)}
                placeholder="010XXXXXXXX"
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
              placeholder="أبونا بولا"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">ملاحظات خاصة</label>
            <textarea
              rows={2}
              value={studentNotes}
              onChange={(e) => setStudentNotes(e.target.value)}
              placeholder="ملاحظات المتابعة والافتقاد..."
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
