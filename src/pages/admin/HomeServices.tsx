import { useEffect, useState } from 'react';
import { Plus, Trash2, Home, MapPin, Phone } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { HomeService } from '@/lib/supabase';
import { PageHeader, Modal, EmptyState, ErrorState, Badge } from '@/components/ui';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useLanguage } from '@/context/LanguageContext';
import { useShopFilter } from '@/lib/useShopFilter';

const statuses = ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'];
const empty = { customer_name: '', phone_number: '', address: '', service_type: '', appointment_date: new Date().toISOString().split('T')[0], appointment_time: '10:00', status: 'pending', total_amount: '0', notes: '' };

export default function HomeServices() {
  const { t } = useLanguage();
  const shopFilter = useShopFilter();
  const [items, setItems] = useState<HomeService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Record<string, string>>(empty);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    let q = supabase.from('home_services').select('*').order('created_at', { ascending: false });
    if (shopFilter) q = q.eq('shop_id', shopFilter);
    const { data, error } = await q;
    if (error) setError(error.message); else setItems(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [shopFilter]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await supabase.from('home_services').insert({ customer_name: form.customer_name, phone_number: form.phone_number, address: form.address, service_type: form.service_type, appointment_date: form.appointment_date, appointment_time: form.appointment_time, status: form.status, total_amount: Number(form.total_amount), notes: form.notes || null });
    setSaving(false); setOpen(false); setForm(empty); load();
  };

  const updateStatus = async (id: string, status: string) => {
    await supabase.from('home_services').update({ status }).eq('id', id); load();
  };

  const del = async (id: string) => {
    if (!confirm(t('deleteThisRequest'))) return;
    await supabase.from('home_services').delete().eq('id', id); load();
  };

  const statusColor = (s: string) => {
    const map: Record<string, 'gold' | 'blue' | 'green' | 'red' | 'gray'> = { pending: 'gold', confirmed: 'blue', in_progress: 'blue', completed: 'green', cancelled: 'red' };
    return map[s] ?? 'gray';
  };

  return (
    <div>
      <PageHeader title={t('homeServices')} subtitle={t('createFirstRequest')} action={<button onClick={() => setOpen(true)} className="btn-primary"><Plus className="h-4 w-4" /> {t('newRequest')}</button>} />

      {loading ? <div className="text-sm text-gray-500 dark:text-gray-400">{t('loading')}</div> :
       error ? <ErrorState message={error} onRetry={load} /> :
       items.length === 0 ? <EmptyState icon={Home} title={t('noHomeServiceRequests')} message={t('createFirstRequest')} /> : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 stagger">
          {items.map((h) => (
            <div key={h.id} className="card-glow">
              <div className="flex items-start justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-pink-100 dark:bg-pink-900/40">
                  <Home className="h-5 w-5 text-pink-600 dark:text-pink-400" />
                </div>
                <Badge color={statusColor(h.status)}>{h.status}</Badge>
              </div>
              <h3 className="mt-3 text-base font-bold text-gray-900 dark:text-gray-100">{h.customer_name}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{h.service_type}</p>
              <div className="mt-3 space-y-1 text-sm text-gray-600 dark:text-gray-300">
                <p className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-gray-400" /> {h.phone_number}</p>
                <p className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-gray-400" /> {h.address}</p>
                <p>{formatDate(h.appointment_date)} at {h.appointment_time}</p>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{formatCurrency(h.total_amount)}</p>
                <select value={h.status} onChange={(e) => updateStatus(h.id, e.target.value)} className="rounded-lg border border-gray-200 px-2 py-1 text-xs dark:border-ink-600 dark:bg-ink-800 dark:text-gray-200">
                  {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <button onClick={() => del(h.id)} className="btn-danger mt-3 w-full"><Trash2 className="h-4 w-4" /> {t('delete')}</button>
            </div>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={t('newRequest')}>
        <form onSubmit={save} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">{t('customerName')}</label><input required value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} className="input" /></div>
            <div><label className="label">{t('phone')}</label><input required value={form.phone_number} onChange={(e) => setForm({ ...form, phone_number: e.target.value })} className="input" /></div>
          </div>
          <div><label className="label">{t('address')}</label><input required value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="input" /></div>
          <div><label className="label">{t('serviceType')}</label><input required value={form.service_type} onChange={(e) => setForm({ ...form, service_type: e.target.value })} className="input" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">{t('appointmentDate')}</label><input type="date" required value={form.appointment_date} onChange={(e) => setForm({ ...form, appointment_date: e.target.value })} className="input" /></div>
            <div><label className="label">{t('appointmentTime')}</label><input type="time" required value={form.appointment_time} onChange={(e) => setForm({ ...form, appointment_time: e.target.value })} className="input" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">{t('amount')} ($)</label><input type="number" value={form.total_amount} onChange={(e) => setForm({ ...form, total_amount: e.target.value })} className="input" /></div>
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
