import { useEffect, useState } from 'react';
import { Plus, Search, Users } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Customer } from '@/lib/supabase';
import { PageHeader, Modal, EmptyState, ErrorState, Badge } from '@/components/ui';
import { formatCurrency } from '@/lib/utils';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';

const empty = { full_name: '', email: '', phone: '' };

export default function CashierCustomers() {
  const { t } = useLanguage();
  const { profile } = useAuth();
  const canAdd = profile?.permissions?.can_add_customer !== false;
  const [items, setItems] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Record<string, string>>(empty);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('customers').select('*').order('created_at', { ascending: false });
    if (error) setError(error.message); else setItems(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await supabase.from('customers').insert({ full_name: form.full_name, email: form.email, phone: form.phone || null });
    setSaving(false); setOpen(false); setForm(empty); load();
  };

  const filtered = items.filter(c => c.full_name.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <PageHeader title={t('customers')} subtitle={t('addCustomer')} action={canAdd ? <button onClick={() => setOpen(true)} className="btn-primary"><Plus className="h-4 w-4" /> {t('addCustomer')}</button> : undefined} />

      <div className="mb-4 relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('search')} className="input pl-10" />
      </div>

      {loading ? <div className="text-sm text-gray-500 dark:text-gray-400">{t('loading')}</div> :
       error ? <ErrorState message={error} onRetry={load} /> :
       filtered.length === 0 ? <EmptyState icon={Users} title={t('noCustomers')} /> : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 stagger">
          {filtered.map((c) => (
            <div key={c.id} className="card-glow">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-green-100 text-sm font-bold text-green-700 dark:bg-green-900/40 dark:text-green-400">
                  {c.full_name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-gray-900 dark:text-gray-100">{c.full_name}</p>
                  <p className="truncate text-xs text-gray-500 dark:text-gray-400">{c.email}</p>
                </div>
                <Badge color={c.is_active ? 'green' : 'gray'}>{c.is_active ? t('active') : t('inactive')}</Badge>
              </div>
              <div className="mt-4 flex justify-between text-sm">
                <div><p className="text-gray-500 dark:text-gray-400">{t('totalVisits')}</p><p className="font-bold text-gray-900 dark:text-gray-100">{c.total_visits}</p></div>
                <div><p className="text-gray-500 dark:text-gray-400">{t('totalSpent')}</p><p className="font-bold text-gray-900 dark:text-gray-100">{formatCurrency(c.total_spent)}</p></div>
                <div><p className="text-gray-500 dark:text-gray-400">{t('phone')}</p><p className="font-medium text-gray-900 dark:text-gray-100">{c.phone ?? '—'}</p></div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={t('addCustomer')}>
        <form onSubmit={save} className="space-y-4">
          <div><label className="label">{t('fullName')}</label><input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="input" /></div>
          <div><label className="label">{t('email')}</label><input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input" /></div>
          <div><label className="label">{t('phone')}</label><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input" /></div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setOpen(false)} className="btn-secondary">{t('cancel')}</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? t('saving') : t('save')}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
