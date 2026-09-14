import { useEffect, useState } from 'react';
import { Plus, Trash2, DollarSign, ArrowUpRight, Scissors } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Revenue, RevenueSource, Employee } from '@/lib/supabase';
import { PageHeader, Modal, EmptyState, ErrorState, StatCard } from '@/components/ui';
import { formatCurrency, formatDate, initials } from '@/lib/utils';
import { useLanguage } from '@/context/LanguageContext';
import { useShopFilter } from '@/lib/useShopFilter';

const sources: RevenueSource[] = ['haircut', 'beard_trim', 'hair_wash', 'hair_styling', 'facial', 'home_service', 'other'];
const empty = { source: 'haircut', amount: '0', description: '', payment_method: 'cash', transaction_date: new Date().toISOString().split('T')[0], employee_id: '', notes: '' };

export default function Income() {
  const { t } = useLanguage();
  const shopFilter = useShopFilter();
  const [items, setItems] = useState<(Revenue & { employee?: Employee | null })[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Record<string, string>>(empty);
  const [saving, setSaving] = useState(false);
  const [total, setTotal] = useState(0);

  const load = async () => {
    setLoading(true);
    let revQ = supabase.from('revenue').select('*, employee:employee_id(*)').order('transaction_date', { ascending: false });
    if (shopFilter) revQ = revQ.eq('shop_id', shopFilter);
    let empQ = supabase.from('employees').select('*').eq('status', 'active').order('full_name');
    if (shopFilter) empQ = empQ.eq('shop_id', shopFilter);
    const [rev, emp] = await Promise.all([revQ, empQ]);
    if (rev.error) setError(rev.error.message);
    else {
      const data = (rev.data ?? []) as (Revenue & { employee?: Employee | null })[];
      setItems(data);
      setTotal(data.reduce((s, r) => s + Number(r.amount), 0));
      setError(null);
    }
    if (emp.data) setEmployees(emp.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [shopFilter]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload: Record<string, unknown> = {
      source: form.source as RevenueSource,
      amount: Number(form.amount),
      description: form.description || null,
      payment_method: form.payment_method,
      transaction_date: form.transaction_date,
      notes: form.notes || null,
      employee_id: form.employee_id || null,
    };
    const { error } = await supabase.from('revenue').insert(payload);
    if (error) setError(error.message);
    setSaving(false);
    if (!error) { setOpen(false); setForm(empty); load(); }
  };

  const del = async (id: string) => {
    if (!confirm(t('deleteThisRecord'))) return;
    await supabase.from('revenue').delete().eq('id', id); load();
  };

  return (
    <div>
      <PageHeader title={t('income')} subtitle={t('addFirstIncome')} action={<button onClick={() => setOpen(true)} className="btn-primary"><Plus className="h-4 w-4" /> {t('addIncome')}</button>} />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3 stagger">
        <StatCard label={t('income')} value={formatCurrency(total)} icon={DollarSign} iconColor="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400" />
        <StatCard label={t('transactions')} value={String(items.length)} icon={ArrowUpRight} iconColor="bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400" />
        <StatCard label={t('avgPerTransaction')} value={formatCurrency(items.length ? total / items.length : 0)} icon={DollarSign} iconColor="bg-gold-100 text-gold-600 dark:bg-gold-900/40 dark:text-gold-400" />
      </div>

      {loading ? <div className="text-sm text-gray-500 dark:text-gray-400">{t('loading')}</div> :
       error ? <ErrorState message={error} onRetry={load} /> :
       items.length === 0 ? <EmptyState icon={DollarSign} title={t('noIncomeRecords')} message={t('addFirstIncome')} /> : (
        <div className="card overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead className="table-header">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">{t('transactionDate')}</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">{t('source')}</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">{t('barber')}</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">{t('description')}</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">{t('paymentMethod')}</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">{t('amount')}</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600 dark:text-gray-300">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-ink-700">
              {items.map((r) => (
                <tr key={r.id} className="table-row">
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{formatDate(r.transaction_date)}</td>
                  <td className="px-4 py-3"><span className="badge-gold">{r.source}</span></td>
                  <td className="px-4 py-3">
                    {r.employee ? (
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-gold-400 to-gold-600 text-xs font-bold text-ink-950">
                          {initials(r.employee.full_name)}
                        </div>
                        <span className="text-gray-900 dark:text-gray-100">{r.employee.full_name}</span>
                      </div>
                    ) : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{r.description ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{r.payment_method}</td>
                  <td className="px-4 py-3 font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(r.amount)}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => del(r.id)} className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"><Trash2 className="h-4 w-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={t('addIncome')}>
        <form onSubmit={save} className="space-y-4">
          <div><label className="label">{t('source')}</label><select value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} className="input">{sources.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
          <div><label className="label">{t('barber')}</label><select value={form.employee_id} onChange={(e) => setForm({ ...form, employee_id: e.target.value })} className="input"><option value="">{t('selectBarber')}</option>{employees.map(emp => <option key={emp.id} value={emp.id}>{emp.full_name}</option>)}</select></div>
          <div><label className="label">{t('amount')} ($)</label><input type="number" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="input" /></div>
          <div><label className="label">{t('description')}</label><input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">{t('paymentMethod')}</label><select value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })} className="input"><option value="cash">Cash</option><option value="card">Card</option><option value="mobile">Mobile</option></select></div>
            <div><label className="label">{t('transactionDate')}</label><input type="date" required value={form.transaction_date} onChange={(e) => setForm({ ...form, transaction_date: e.target.value })} className="input" /></div>
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
