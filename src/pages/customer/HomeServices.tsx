import { useEffect, useState } from 'react';
import { Plus, Home, MapPin, Phone } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { HomeService, Service } from '@/lib/supabase';
import { PageHeader, Modal, EmptyState, ErrorState, Badge } from '@/components/ui';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useLanguage } from '@/context/LanguageContext';

const empty = { service_type: '', address: '', phone_number: '', appointment_date: new Date().toISOString().split('T')[0], appointment_time: '10:00', notes: '' };

export default function CustomerHomeServices() {
  const { t } = useLanguage();
  const [items, setItems] = useState<HomeService[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Record<string, string>>(empty);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [hs, svc] = await Promise.all([
      supabase.from('home_services').select('*').order('created_at', { ascending: false }),
      supabase.from('services').select('*').eq('is_active', true),
    ]);
    if (hs.error) setError(hs.error.message); else setItems(hs.data ?? []);
    setServices(svc.data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const svc = services.find(s => s.name === form.service_type);
    await supabase.from('home_services').insert({ service_type: form.service_type, address: form.address, phone_number: form.phone_number, appointment_date: form.appointment_date, appointment_time: form.appointment_time, notes: form.notes || null, total_amount: Number(svc?.price ?? 0), home_service_fee: 5 });
    setSaving(false); setOpen(false); setForm(empty); load();
  };

  const statusColor = (s: string) => {
    const map: Record<string, 'gold' | 'blue' | 'green' | 'red' | 'gray'> = { pending: 'gold', confirmed: 'blue', in_progress: 'blue', completed: 'green', cancelled: 'red' };
    return map[s] ?? 'gray';
  };

  if (loading) return <div className="text-sm text-gray-500 dark:text-gray-400">{t('loading')}</div>;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div>
      <PageHeader title={t('homeServices')} subtitle={t('requestHomeVisit')} action={<button onClick={() => setOpen(true)} className="btn-primary"><Plus className="h-4 w-4" /> {t('newRequest')}</button>} />

      {items.length === 0 ? <EmptyState icon={Home} title={t('noHomeServiceRequests')} message={t('requestHomeVisit')} action={<button onClick={() => setOpen(true)} className="btn-primary"><Plus className="h-4 w-4" /> {t('newRequest')}</button>} /> : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 stagger">
          {items.map((h) => (
            <div key={h.id} className="card-glow">
              <div className="flex items-start justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-pink-100 dark:bg-pink-900/40">
                  <Home className="h-5 w-5 text-pink-600 dark:text-pink-400" />
                </div>
                <Badge color={statusColor(h.status)}>{h.status}</Badge>
              </div>
              <h3 className="mt-3 text-base font-bold text-gray-900 dark:text-gray-100">{h.service_type}</h3>
              <div className="mt-2 space-y-1 text-sm text-gray-600 dark:text-gray-300">
                <p className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-gray-400" /> {h.phone_number}</p>
                <p className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-gray-400" /> {h.address}</p>
                <p>{formatDate(h.appointment_date)} at {h.appointment_time}</p>
              </div>
              <p className="mt-3 text-lg font-bold text-gray-900 dark:text-gray-100">{formatCurrency(h.total_amount)}</p>
            </div>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={t('newRequest')}>
        <form onSubmit={save} className="space-y-4">
          <div><label className="label">{t('services')}</label><select required value={form.service_type} onChange={(e) => setForm({ ...form, service_type: e.target.value })} className="input"><option value="">...</option>{services.map(s => <option key={s.id} value={s.name}>{s.name} - {formatCurrency(s.price)}</option>)}</select></div>
          <div><label className="label">{t('address')}</label><input required value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="input" /></div>
          <div><label className="label">{t('phone')}</label><input required value={form.phone_number} onChange={(e) => setForm({ ...form, phone_number: e.target.value })} className="input" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">{t('appointmentDate')}</label><input type="date" required value={form.appointment_date} onChange={(e) => setForm({ ...form, appointment_date: e.target.value })} className="input" /></div>
            <div><label className="label">{t('appointmentTime')}</label><input type="time" required value={form.appointment_time} onChange={(e) => setForm({ ...form, appointment_time: e.target.value })} className="input" /></div>
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
