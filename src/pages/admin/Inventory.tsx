import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Package, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { InventoryItem } from '@/lib/supabase';
import { PageHeader, Modal, EmptyState, ErrorState, Badge } from '@/components/ui';
import { formatCurrency } from '@/lib/utils';
import { useLanguage } from '@/context/LanguageContext';
import { useShopFilter } from '@/lib/useShopFilter';

const empty = { product_name: '', category: '', quantity: '0', unit: 'piece', unit_price: '0', supplier: '', sku: '', reorder_level: '10', is_active: 'true' };

export default function Inventory() {
  const { t } = useLanguage();
  const shopFilter = useShopFilter();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [form, setForm] = useState<Record<string, string>>(empty);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    let q = supabase.from('inventory').select('*').order('created_at', { ascending: false });
    if (shopFilter) q = q.eq('shop_id', shopFilter);
    const { data, error } = await q;
    if (error) setError(error.message); else setItems(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [shopFilter]);

  const openNew = () => { setEditing(null); setForm(empty); setOpen(true); };
  const openEdit = (i: InventoryItem) => {
    setEditing(i);
    setForm({ product_name: i.product_name, category: i.category, quantity: String(i.quantity), unit: i.unit, unit_price: String(i.unit_price), supplier: i.supplier ?? '', sku: i.sku ?? '', reorder_level: String(i.reorder_level), is_active: String(i.is_active) });
    setOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = { product_name: form.product_name, category: form.category, quantity: Number(form.quantity), unit: form.unit, unit_price: Number(form.unit_price), supplier: form.supplier || null, sku: form.sku || null, reorder_level: Number(form.reorder_level), is_active: form.is_active === 'true' };
    if (editing) await supabase.from('inventory').update(payload).eq('id', editing.id);
    else await supabase.from('inventory').insert(payload);
    setSaving(false); setOpen(false); load();
  };

  const del = async (id: string) => {
    if (!confirm(t('deleteThisItem'))) return;
    await supabase.from('inventory').delete().eq('id', id); load();
  };

  return (
    <div>
      <PageHeader title={t('inventory')} subtitle={t('addFirstProduct')} action={<button onClick={openNew} className="btn-primary"><Plus className="h-4 w-4" /> {t('addInventory')}</button>} />

      {loading ? <div className="text-sm text-gray-500 dark:text-gray-400">{t('loading')}</div> :
       error ? <ErrorState message={error} onRetry={load} /> :
       items.length === 0 ? <EmptyState icon={Package} title={t('noInventoryItems')} message={t('addFirstProduct')} action={<button onClick={openNew} className="btn-primary"><Plus className="h-4 w-4" /> {t('addInventory')}</button>} /> : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 stagger">
          {items.map((i) => {
            const lowStock = i.quantity <= i.reorder_level;
            return (
              <div key={i.id} className="card-glow">
                <div className="flex items-start justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-900/40">
                    <Package className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  {lowStock ? <Badge color="red"><AlertTriangle className="h-3 w-3" /> {t('low')}</Badge> : <Badge color="green">{t('inStock')}</Badge>}
                </div>
                <h3 className="mt-3 text-base font-bold text-gray-900 dark:text-gray-100">{i.product_name}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">{i.category}</p>
                <div className="mt-4 flex items-end justify-between">
                  <div>
                    <p className={`text-2xl font-bold ${lowStock ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-100'}`}>{i.quantity}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{i.unit} · {t('reorderAt')} {i.reorder_level}</p>
                  </div>
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{formatCurrency(i.unit_price)}</p>
                </div>
                <div className="mt-4 flex gap-2 border-t border-gray-100 dark:border-ink-700 pt-3">
                  <button onClick={() => openEdit(i)} className="btn-secondary flex-1"><Pencil className="h-4 w-4" /> {t('edit')}</button>
                  <button onClick={() => del(i.id)} className="btn-danger"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? t('editInventory') : t('addInventory')} size="lg">
        <form onSubmit={save} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">{t('productName')}</label><input required value={form.product_name} onChange={(e) => setForm({ ...form, product_name: e.target.value })} className="input" /></div>
            <div><label className="label">{t('category')}</label><input required value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="input" /></div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div><label className="label">{t('quantity')}</label><input type="number" required value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} className="input" /></div>
            <div><label className="label">{t('unit')}</label><input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="input" /></div>
            <div><label className="label">{t('unitPrice')}</label><input type="number" required value={form.unit_price} onChange={(e) => setForm({ ...form, unit_price: e.target.value })} className="input" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">{t('supplier')}</label><input value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} className="input" /></div>
            <div><label className="label">SKU</label><input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} className="input" /></div>
          </div>
          <div><label className="label">{t('reorderLevel')}</label><input type="number" value={form.reorder_level} onChange={(e) => setForm({ ...form, reorder_level: e.target.value })} className="input" /></div>
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
