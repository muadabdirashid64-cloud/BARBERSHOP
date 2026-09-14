import { useEffect, useState } from 'react';
import { DollarSign, ShoppingCart, Users, Plus, Receipt, TrendingUp } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Revenue, RevenueSource, Expense, ExpenseCategory, Employee } from '@/lib/supabase';
import { PageHeader, StatCard, ErrorState, Modal } from '@/components/ui';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useLanguage } from '@/context/LanguageContext';

const sources: RevenueSource[] = ['haircut', 'beard_trim', 'hair_wash', 'hair_styling', 'facial', 'home_service', 'other'];
const categories: ExpenseCategory[] = ['rent', 'utilities', 'supplies', 'salaries', 'marketing', 'maintenance', 'other'];

const emptyIncome = { source: 'haircut', amount: '0', description: '', payment_method: 'cash', transaction_date: new Date().toISOString().split('T')[0], employee_id: '', notes: '' };
const emptyExpense = { category: 'supplies', amount: '0', description: '', expense_date: new Date().toISOString().split('T')[0], vendor: '', notes: '' };

export default function CashierDashboard() {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({ revenue: 0, transactions: 0, customers: 0, recent: [] as Revenue[] });
  const [incomeOpen, setIncomeOpen] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [incomeForm, setIncomeForm] = useState<Record<string, string>>(emptyIncome);
  const [expenseForm, setExpenseForm] = useState<Record<string, string>>(emptyExpense);
  const [saving, setSaving] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);

  const load = async () => {
    setLoading(true);
    const [rev, cust, emp] = await Promise.all([
      supabase.from('revenue').select('*').order('created_at', { ascending: false }).limit(10),
      supabase.from('customers').select('id', { count: 'exact', head: true }),
      supabase.from('employees').select('*').eq('status', 'active').order('full_name'),
    ]);
    const revData = (rev.data ?? []) as Revenue[];
    setStats({ revenue: revData.reduce((s, r) => s + Number(r.amount), 0), transactions: revData.length, customers: cust.count ?? 0, recent: revData });
    setError(rev.error ? rev.error.message : null);
    if (emp.data) setEmployees(emp.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const saveIncome = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from('revenue').insert({
      source: incomeForm.source as RevenueSource,
      amount: Number(incomeForm.amount),
      description: incomeForm.description || null,
      payment_method: incomeForm.payment_method,
      transaction_date: incomeForm.transaction_date,
      notes: incomeForm.notes || null,
      employee_id: incomeForm.employee_id || null,
    });
    setSaving(false);
    if (error) { setError(error.message); return; }
    setIncomeOpen(false); setIncomeForm(emptyIncome); load();
  };

  const saveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from('expenses').insert({
      category: expenseForm.category as ExpenseCategory,
      amount: Number(expenseForm.amount),
      description: expenseForm.description || null,
      expense_date: expenseForm.expense_date,
      vendor: expenseForm.vendor || null,
      notes: expenseForm.notes || null,
    });
    setSaving(false);
    if (error) { setError(error.message); return; }
    setExpenseOpen(false); setExpenseForm(emptyExpense); load();
  };

  if (loading) return <div className="text-sm text-gray-500 dark:text-gray-400">{t('loading')}</div>;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div>
      <PageHeader
        title={t('dashboard')}
        subtitle={t('todaysOverview')}
        action={
          <div className="flex gap-2">
            <button onClick={() => setIncomeOpen(true)} className="btn-primary"><Plus className="h-4 w-4" /> {t('addIncome')}</button>
            <button onClick={() => setExpenseOpen(true)} className="btn-secondary"><Plus className="h-4 w-4" /> {t('addExpense')}</button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 stagger">
        <StatCard label={t('todaysRevenue')} value={formatCurrency(stats.revenue)} icon={DollarSign} iconColor="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400" />
        <StatCard label={t('transactions')} value={String(stats.transactions)} icon={ShoppingCart} iconColor="bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400" />
        <StatCard label={t('customers')} value={String(stats.customers)} icon={Users} iconColor="bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400" />
      </div>

      <div className="mt-6 card">
        <h3 className="mb-4 text-lg font-bold text-gray-900 dark:text-gray-100">{t('recentTransactions')}</h3>
        {stats.recent.length === 0 ? (
          <div className="py-8 text-center text-sm text-gray-400 dark:text-gray-500">{t('noTransactionsYet')}</div>
        ) : (
          <div className="space-y-2">
            {stats.recent.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3 dark:border-ink-700">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{r.description || r.source}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{r.payment_method} · {formatDate(r.transaction_date)}</p>
                </div>
                <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">+{formatCurrency(r.amount)}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Income Modal */}
      <Modal open={incomeOpen} onClose={() => setIncomeOpen(false)} title={t('addIncome')}>
        <form onSubmit={saveIncome} className="space-y-4">
          <div><label className="label">{t('source')}</label><select value={incomeForm.source} onChange={(e) => setIncomeForm({ ...incomeForm, source: e.target.value })} className="input">{sources.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
          <div><label className="label">{t('barber')}</label><select value={incomeForm.employee_id} onChange={(e) => setIncomeForm({ ...incomeForm, employee_id: e.target.value })} className="input"><option value="">{t('selectBarber')}</option>{employees.map(emp => <option key={emp.id} value={emp.id}>{emp.full_name}</option>)}</select></div>
          <div><label className="label">{t('amount')} ($)</label><input type="number" required value={incomeForm.amount} onChange={(e) => setIncomeForm({ ...incomeForm, amount: e.target.value })} className="input" /></div>
          <div><label className="label">{t('description')}</label><input value={incomeForm.description} onChange={(e) => setIncomeForm({ ...incomeForm, description: e.target.value })} className="input" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">{t('paymentMethod')}</label><select value={incomeForm.payment_method} onChange={(e) => setIncomeForm({ ...incomeForm, payment_method: e.target.value })} className="input"><option value="cash">Cash</option><option value="card">Card</option><option value="mobile">Mobile</option></select></div>
            <div><label className="label">{t('transactionDate')}</label><input type="date" required value={incomeForm.transaction_date} onChange={(e) => setIncomeForm({ ...incomeForm, transaction_date: e.target.value })} className="input" /></div>
          </div>
          <div><label className="label">{t('notes')}</label><textarea value={incomeForm.notes} onChange={(e) => setIncomeForm({ ...incomeForm, notes: e.target.value })} className="input" rows={2} /></div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setIncomeOpen(false)} className="btn-secondary">{t('cancel')}</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? t('saving') : t('save')}</button>
          </div>
        </form>
      </Modal>

      {/* Add Expense Modal */}
      <Modal open={expenseOpen} onClose={() => setExpenseOpen(false)} title={t('addExpense')}>
        <form onSubmit={saveExpense} className="space-y-4">
          <div><label className="label">{t('expenseCategory')}</label><select value={expenseForm.category} onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })} className="input">{categories.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
          <div><label className="label">{t('amount')} ($)</label><input type="number" required value={expenseForm.amount} onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })} className="input" /></div>
          <div><label className="label">{t('description')}</label><input value={expenseForm.description} onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })} className="input" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">{t('transactionDate')}</label><input type="date" required value={expenseForm.expense_date} onChange={(e) => setExpenseForm({ ...expenseForm, expense_date: e.target.value })} className="input" /></div>
            <div><label className="label">{t('vendor')}</label><input value={expenseForm.vendor} onChange={(e) => setExpenseForm({ ...expenseForm, vendor: e.target.value })} className="input" /></div>
          </div>
          <div><label className="label">{t('notes')}</label><textarea value={expenseForm.notes} onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })} className="input" rows={2} /></div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setExpenseOpen(false)} className="btn-secondary">{t('cancel')}</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? t('saving') : t('save')}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
