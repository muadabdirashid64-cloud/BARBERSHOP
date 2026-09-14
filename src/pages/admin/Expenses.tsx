import { useEffect, useState } from 'react';
import { Plus, Trash2, Receipt, ArrowDownRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Expense, ExpenseCategory } from '@/lib/supabase';
import { PageHeader, Modal, EmptyState, ErrorState, StatCard } from '@/components/ui';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useLanguage } from '@/context/LanguageContext';
import { useShopFilter } from '@/lib/useShopFilter';

const categories: ExpenseCategory[] = ['rent', 'utilities', 'supplies', 'salaries', 'marketing', 'maintenance', 'other'];
const empty = { category: 'supplies', amount: '0', description: '', expense_date: new Date().toISOString().split('T')[0], vendor: '', notes: '' };

export default function Expenses() {
  const { t } = useLanguage();
  const shopFilter = useShopFilter();
  const [items, setItems] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Record<string, string>>(empty);
  const [saving, setSaving] = useState(false);
  const [total, setTotal] = useState(0);

  const load = async () => {
    setLoading(true);
    let q = supabase.from('expenses').select('*').order('expense_date', { ascending: false });
    if (shopFilter) q = q.eq('shop_id', shopFilter);
    const { data, error } = await q;
    if (error) setError(error.message);
    else { setItems(data ?? []); setTotal((data ?? []).reduce((s: number, e: Expense) => s + Number(e.amount), 0)); }
    setLoading(false);
  };

  useEffect(() => { load(); }, [shopFilter]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await supabase.from('expenses').insert({ category: form.category as ExpenseCategory, amount: Number(form.amount), description: form.description || null, expense_date: form.expense_date, vendor: form.vendor || null, notes: form.notes || null });
    setSaving(false); setOpen(false); setForm(empty); load();
  };

  const del = async (id: string) => {
    if (!confirm(t('deleteThisExpense'))) return;
    await supabase.from('expenses').delete().eq('id', id); load();
  };

  return (
    <div>
      <PageHeader title={t('expenses')} subtitle={t('addFirstExpense')} action={<button onClick={() => setOpen(true)} className="btn-primary"><Plus className="h-4 w-4" /> {t('addExpense')}</button>} />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3 stagger">
        <StatCard label={t('totalExpenses')} value={formatCurrency(total)} icon={Receipt} iconColor="bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400" />
        <StatCard label={t('records')} value={String(items.length)} icon={ArrowDownRight} iconColor="bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400" />
        <StatCard label={t('avgPerExpense')} value={formatCurrency(items.length ? total / items.length : 0)} icon={Receipt} iconColor="bg-gold-100 text-gold-600 dark:bg-gold-900/40 dark:text-gold-400" />
      </div>

      {loading ? <div className="text-sm text-gray-500 dark:text-gray-400">{t('loading')}</div> :
       error ? <ErrorState message={error} onRetry={load} /> :
       items.length === 0 ? <EmptyState icon={Receipt} title={t('noExpenses')} message={t('addFirstExpense')} /> : (
        <div className="card overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead className="table-header">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">{t('transactionDate')}</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">{t('expenseCategory')}</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">{t('description')}</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">{t('vendor')}</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">{t('amount')}</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600 dark:text-gray-300">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-ink-700">
              {items.map((e) => (
                <tr key={e.id} className="table-row">
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{formatDate(e.expense_date)}</td>
                  <td className="px-4 py-3"><span className="badge-red">{e.category}</span></td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{e.description ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{e.vendor ?? '—'}</td>
                  <td className="px-4 py-3 font-bold text-red-600 dark:text-red-400">{formatCurrency(e.amount)}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => del(e.id)} className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"><Trash2 className="h-4 w-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={t('addExpense')}>
        <form onSubmit={save} className="space-y-4">
          <div><label className="label">{t('expenseCategory')}</label><select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="input">{categories.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
          <div><label className="label">{t('amount')} ($)</label><input type="number" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="input" /></div>
          <div><label className="label">{t('description')}</label><input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">{t('transactionDate')}</label><input type="date" required value={form.expense_date} onChange={(e) => setForm({ ...form, expense_date: e.target.value })} className="input" /></div>
            <div><label className="label">{t('vendor')}</label><input value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })} className="input" /></div>
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
