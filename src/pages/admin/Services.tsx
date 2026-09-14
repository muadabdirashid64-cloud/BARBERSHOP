import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Scissors } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Service } from '@/lib/supabase';
import { PageHeader, Modal, EmptyState, ErrorState, Badge } from '@/components/ui';
import { formatCurrency } from '@/lib/utils';
import { useLanguage } from '@/context/LanguageContext';
import { useShopFilter } from '@/lib/useShopFilter';

const empty = { name: '', description: '', price: '0', duration_minutes: '30', category: '', is_active: 'true' };

export default function Services() {
  const { t } = useLanguage();
  const shopFilter = useShopFilter();
  const [items, setItems] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [form, setForm] = useState<Record<string, string>>(empty);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    let q = supabase.from('services').select('*').order('created_at', { ascending: false });
    if (shopFilter) q = q.eq('shop_id', shopFilter);
    const { data, error } = await q;
    if (error) setError(error.message); else setItems(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [shopFilter]);

  const openNew = () => { setEditing(null); setForm(empty); setOpen(true); };
  const openEdit = (s: Service) => {
    setEditing(s);
    setForm({ name: s.name, description: s.description ?? '', price: String(s.price), duration_minutes: String(s.duration_minutes), category: s.category ?? '', is_active: String(s.is_active) });
    setOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = { name: form.name, description: form.description || null, price: Number(form.price), duration_minutes: Number(form.duration_minutes), category: form.category || null, is_active: form.is_active === 'true' };
    if (editing) await supabase.from('services').update(payload).eq('id', editing.id);
    else await supabase.from('services').insert(payload);
    setSaving(false); setOpen(false); load();
  };

  const del = async (id: string) => {
    if (!confirm(t('deleteThisService'))) return;
    await supabase.from('services').delete().eq('id', id); load();
  };

  return (
    <div>
      <PageHeader title={t('services')} subtitle={t('addFirstService')} action={<button onClick={openNew} className="btn-primary"><Plus className="h-4 w-4" /> {t('addService')}</button>} />

      {loading ? <div className="text-sm text-gray-500 dark:text-gray-400">{t('loading')}</div> :
       error ? <ErrorState message={error} onRetry={load} /> :
       items.length === 0 ? <EmptyState icon={Scissors} title={t('noServices')} message={t('addFirstService')} action={<button onClick={openNew} className="btn-primary"><Plus className="h-4 w-4" /> {t('addService')}</button>} /> : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 stagger">
          {items.map((s) => (
            <div key={s.id} className="card-glow">
              <div className="flex items-start justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gold-100 dark:bg-gold-900/40">
                  <Scissors className="h-5 w-5 text-gold-600 dark:text-gold-400" />
                </div>
                <Badge color={s.is_active ? 'green' : 'gray'}>{s.is_active ? t('active') : t('inactive')}</Badge>
              </div>
              <h3 className="mt-3 text-base font-bold text-gray-900 dark:text-gray-100">{s.name}</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{s.description ?? t('noDescription')}</p>
              <div className="mt-4 flex items-center justify-between">
                <div>
                  <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{formatCurrency(s.price)}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{s.duration_minutes} min</p>
                </div>
                {s.category && <Badge color="blue">{s.category}</Badge>}
              </div>
              <div className="mt-4 flex gap-2 border-t border-gray-100 dark:border-ink-700 pt-3">
                <button onClick={() => openEdit(s)} className="btn-secondary flex-1"><Pencil className="h-4 w-4" /> {t('edit')}</button>
                <button onClick={() => del(s.id)} className="btn-danger"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? t('editService') : t('addService')}>
        <form onSubmit={save} className="space-y-4">
          <div><label className="label">{t('serviceName')}</label><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" /></div>
          <div><label className="label">{t('description')}</label><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input" rows={3} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">{t('price')} ($)</label><input type="number" required value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="input" /></div>
            <div><label className="label">{t('duration')} (min)</label><input type="number" required value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })} className="input" /></div>
          </div>
          <div><label className="label">{t('category')}</label><input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="input" /></div>
          <div><label className="label">{t('status')}</label><select value={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.value })} className="input"><option value="true">{t('active')}</option><option value="false">{t('inactive')}</option></select></div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setOpen(false)} className="btn-secondary">{t('cancel')}</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? t('saving') : t('save')}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
