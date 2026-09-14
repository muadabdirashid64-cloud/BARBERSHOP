import { useEffect, useState } from 'react';
import { Plus, Trash2, Calendar, Check, X, Clock } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import type { Appointment, AppointmentStatus, Employee, Service } from '@/lib/supabase';
import { PageHeader, Modal, EmptyState, ErrorState, StatCard } from '@/components/ui';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useLanguage } from '@/context/LanguageContext';

const statuses: AppointmentStatus[] = ['pending', 'confirmed', 'completed', 'cancelled'];
const empty = { customer_name: '', service_name: '', appointment_date: new Date().toISOString().split('T')[0], appointment_time: '10:00', status: 'pending', price: '', notes: '' };

export default function BarberAppointments() {
  const { profile } = useAuth();
  const { t } = useLanguage();
  const [items, setItems] = useState<Appointment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Record<string, string>>(empty);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('appointments').select('*').order('appointment_date', { ascending: false });
    if (error) setError(error.message);
    else setItems(data ?? []);
    const { data: svc } = await supabase.from('services').select('*').order('name');
    if (svc) setServices(svc);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from('appointments').insert({
      customer_name: form.customer_name || null,
      service_name: form.service_name || null,
      appointment_date: form.appointment_date,
      appointment_time: form.appointment_time || null,
      status: form.status as AppointmentStatus,
      price: form.price ? Number(form.price) : null,
      notes: form.notes || null,
    });
    setSaving(false);
    if (error) { setError(error.message); return; }
    setOpen(false); setForm(empty); load();
  };

  const updateStatus = async (id: string, status: AppointmentStatus) => {
    await supabase.from('appointments').update({ status }).eq('id', id);
    load();
  };

  const del = async (id: string) => {
    if (!confirm(t('deleteThisRecord'))) return;
    await supabase.from('appointments').delete().eq('id', id);
    load();
  };

  const statusColor = (s: AppointmentStatus) => ({
    pending: 'badge-gold',
    confirmed: 'badge-blue',
    completed: 'badge-green',
    cancelled: 'badge-red',
  }[s]);

  const todayCount = items.filter(a => a.appointment_date === new Date().toISOString().split('T')[0]).length;
  const pendingCount = items.filter(a => a.status === 'pending').length;
  const completedCount = items.filter(a => a.status === 'completed').length;

  if (loading) return <div className="text-sm text-gray-500 dark:text-gray-400">{t('loading')}</div>;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div>
      <PageHeader title={t('appointments')} subtitle={t('manageAppointments')} action={<button onClick={() => setOpen(true)} className="btn-primary"><Plus className="h-4 w-4" /> {t('addAppointment')}</button>} />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3 stagger">
        <StatCard label={t('todayAppointments')} value={String(todayCount)} icon={Calendar} iconColor="bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400" />
        <StatCard label={t('pending')} value={String(pendingCount)} icon={Clock} iconColor="bg-gold-100 text-gold-600 dark:bg-gold-900/40 dark:text-gold-400" />
        <StatCard label={t('completed')} value={String(completedCount)} icon={Check} iconColor="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400" />
      </div>

      {items.length === 0 ? <EmptyState icon={Calendar} title={t('noAppointments')} message={t('addFirstAppointment')} /> : (
        <div className="card overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead className="table-header">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">{t('customer')}</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">{t('service')}</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">{t('date')}</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">{t('time')}</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">{t('status')}</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">{t('price')}</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600 dark:text-gray-300">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-ink-700">
              {items.map((a) => (
                <tr key={a.id} className="table-row">
                  <td className="px-4 py-3 text-gray-900 dark:text-gray-100">{a.customer_name ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{a.service_name ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{formatDate(a.appointment_date)}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{a.appointment_time ?? '—'}</td>
                  <td className="px-4 py-3"><span className={statusColor(a.status)}>{a.status}</span></td>
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{a.price ? formatCurrency(a.price) : '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {a.status !== 'completed' && <button onClick={() => updateStatus(a.id, 'completed')} title={t('markCompleted')} className="rounded-lg p-1.5 text-gray-400 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-400"><Check className="h-4 w-4" /></button>}
                      {a.status !== 'cancelled' && <button onClick={() => updateStatus(a.id, 'cancelled')} title={t('cancel')} className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"><X className="h-4 w-4" /></button>}
                      <button onClick={() => del(a.id)} className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={t('addAppointment')}>
        <form onSubmit={save} className="space-y-4">
          <div><label className="label">{t('customerName')}</label><input value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} className="input" /></div>
          <div><label className="label">{t('service')}</label>
            <input list="service-list" value={form.service_name} onChange={(e) => setForm({ ...form, service_name: e.target.value })} className="input" />
            <datalist id="service-list">{services.map(s => <option key={s.id} value={s.name} />)}</datalist>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">{t('date')}</label><input type="date" required value={form.appointment_date} onChange={(e) => setForm({ ...form, appointment_date: e.target.value })} className="input" /></div>
            <div><label className="label">{t('time')}</label><input type="time" value={form.appointment_time} onChange={(e) => setForm({ ...form, appointment_time: e.target.value })} className="input" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">{t('price')} ($)</label><input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="input" /></div>
            <div><label className="label">{t('status')}</label><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="input">{statuses.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
          </div>
          <div><label className="label">{t('notes')}</label><textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="input" rows={2} /></div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setOpen(false)} className="btn-secondary">{t('cancel')}</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? t('saving') : t('save')}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
