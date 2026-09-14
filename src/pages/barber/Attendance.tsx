import { useEffect, useState } from 'react';
import { Clock, LogIn, LogOut, Calendar } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import type { BarberAttendance, Employee } from '@/lib/supabase';
import { PageHeader, EmptyState, ErrorState, Badge } from '@/components/ui';
import { formatDate } from '@/lib/utils';
import { useLanguage } from '@/context/LanguageContext';

export default function Attendance() {
  const { profile } = useAuth();
  const { t } = useLanguage();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [records, setRecords] = useState<BarberAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [today, setToday] = useState<BarberAttendance | null>(null);
  const [processing, setProcessing] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data: emp } = await supabase.from('employees').select('*').eq('email', profile?.email ?? '').maybeSingle();
    setEmployee(emp as Employee | null);
    const empId = emp?.id;
    const { data, error } = await supabase.from('barber_attendance').select('*').eq('employee_id', empId).order('date', { ascending: false });
    if (error) setError(error.message);
    else {
      setRecords(data ?? []);
      const todayStr = new Date().toISOString().split('T')[0];
      setToday((data ?? []).find((a: BarberAttendance) => a.date === todayStr) ?? null);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const checkIn = async () => {
    setProcessing(true);
    const now = new Date().toTimeString().split(' ')[0];
    const todayStr = new Date().toISOString().split('T')[0];
    await supabase.from('barber_attendance').insert({ employee_id: employee?.id, date: todayStr, check_in_time: now, status: 'present' });
    setProcessing(false); load();
  };

  const checkOut = async () => {
    if (!today) return;
    setProcessing(true);
    const now = new Date().toTimeString().split(' ')[0];
    await supabase.from('barber_attendance').update({ check_out_time: now, status: 'checked_out' }).eq('id', today.id);
    setProcessing(false); load();
  };

  if (loading) return <div className="text-sm text-gray-500 dark:text-gray-400">{t('loading')}</div>;
  if (error) return <ErrorState message={error} onRetry={load} />;

  const isCheckedIn = today && !today.check_out_time;

  return (
    <div>
      <PageHeader title={t('attendance')} subtitle={t('attendance')} />

      <div className="mb-6 card-glow">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${isCheckedIn ? 'bg-green-100 dark:bg-green-900/40' : 'bg-gray-100 dark:bg-ink-800'}`}>
              <Clock className={`h-6 w-6 ${isCheckedIn ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`} />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('todaysStatus')}</p>
              <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{isCheckedIn ? t('present') : today ? t('checkedOut') : t('notCheckedIn')}</p>
              {isCheckedIn && today?.check_in_time && <p className="text-xs text-gray-500 dark:text-gray-400">{t('since')} {today.check_in_time}</p>}
            </div>
          </div>
          {isCheckedIn ? (
            <button onClick={checkOut} disabled={processing} className="btn-danger"><LogOut className="h-4 w-4" /> {t('checkOut')}</button>
          ) : (
            <button onClick={checkIn} disabled={processing} className="btn-primary"><LogIn className="h-4 w-4" /> {t('checkIn')}</button>
          )}
        </div>
      </div>

      <h3 className="mb-4 text-base font-bold text-gray-900 dark:text-gray-100">{t('attendanceHistory')}</h3>
      {records.length === 0 ? <EmptyState icon={Calendar} title={t('noAttendanceRecords')} /> : (
        <div className="card overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead className="table-header">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">{t('transactionDate')}</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">{t('checkIn')}</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">{t('checkOut')}</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">{t('status')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-ink-700">
              {records.map((r) => (
                <tr key={r.id} className="table-row">
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{formatDate(r.date)}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{r.check_in_time ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{r.check_out_time ?? '—'}</td>
                  <td className="px-4 py-3"><Badge color={r.status === 'present' ? 'green' : r.status === 'checked_out' ? 'blue' : 'gray'}>{r.status === 'present' ? t('present') : r.status === 'checked_out' ? t('checkedOut') : r.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
