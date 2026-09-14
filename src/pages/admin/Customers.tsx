import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Users, Search } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Customer } from '@/lib/supabase';
import { PageHeader, Modal, EmptyState, ErrorState, Badge } from '@/components/ui';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useLanguage } from '@/context/LanguageContext';
import { useShopFilter } from '@/lib/useShopFilter';

const empty = { full_name: '', email: '', phone: '', address: '', notes: '' };

export default function Customers() {
  const { t } = useLanguage();
  const shopFilter = useShopFilter();
  const [items, setItems] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState<Record<string, string>>(empty);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    let q = supabase.from('customers').select('*').order('created_at', { ascending: false });
    if (shopFilter) q = q.eq('shop_id', shopFilter);
    const { data, error } = await q;
    if (error) setError(error.message); else setItems(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [shopFilter]);

  const openNew = () => { setEditing(null); setForm(empty); setOpen(true); };
  const openEdit = (c: Customer) => {
    setEditing(c);
    setForm({ full_name: c.full_name, email: c.email, phone: c.phone ?? '', address: c.address ?? '', notes: c.notes ?? '' });
    setOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = { full_name: form.full_name, email: form.email, phone: form.phone || null, address: form.address || null, notes: form.notes || null };
    if (editing) await supabase.from('customers').update(payload).eq('id', editing.id);
    else await supabase.from('customers').insert(payload);
    setSaving(false); setOpen(false); load();
  };

  const del = async (id: string) => {
    if (!confirm(t('deleteThisCustomer'))) return;
    await supabase.from('customers').delete().eq('id', id); load();
  };

  const filtered = items.filter(c => c.full_name.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <PageHeader title={t('customers')} subtitle={t('customers')} action={<button onClick={openNew} className="btn-primary"><Plus className="h-4 w-4" /> {t('addCustomer')}</button>} />

      <div className="mb-4 relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('searchCustomers')} className="input pl-10" />
      </div>

      {loading ? <div className="text-sm text-gray-500 dark:text-gray-400">{t('loading')}</div> :
       error ? <ErrorState message={error} onRetry={load} /> :
       filtered.length === 0 ? <EmptyState icon={Users} title={t('noCustomers')} message={t('addCustomer')} action={<button onClick={openNew} className="btn-primary"><Plus className="h-4 w-4" /> {t('addCustomer')}</button>} /> : (
        <div className="card overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead className="table-header">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">{t('customerName')}</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">{t('phone')}</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">{t('totalVisits')}</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">{t('totalSpent')}</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">{t('lastVisit')}</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">{t('status')}</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600 dark:text-gray-300">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-ink-700">
              {filtered.map((c) => (
                <tr key={c.id} className="table-row">
                  <td className="px-4 py-3"><p className="font-medium text-gray-900 dark:text-gray-100">{c.full_name}</p><p className="text-xs text-gray-500 dark:text-gray-400">{c.email}</p></td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{c.phone ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{c.total_visits}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{formatCurrency(c.total_spent)}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{formatDate(c.last_visit)}</td>
                  <td className="px-4 py-3"><Badge color={c.is_active ? 'green' : 'gray'}>{c.is_active ? t('active') : t('inactive')}</Badge></td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => openEdit(c)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-ink-800 dark:hover:text-gray-200"><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => del(c.id)} className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? t('editCustomer') : t('addCustomer')}>
        <form onSubmit={save} className="space-y-4">
          <div><label className="label">{t('fullName')}</label><input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="input" /></div>
          <div><label className="label">{t('email')}</label><input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input" /></div>
          <div><label className="label">{t('phone')}</label><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input" /></div>
          <div><label className="label">{t('address')}</label><input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="input" /></div>
          <div><label className="label">{t('notes')}</label><textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="input" rows={3} /></div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setOpen(false)} className="btn-secondary">{t('cancel')}</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? t('saving') : t('save')}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
