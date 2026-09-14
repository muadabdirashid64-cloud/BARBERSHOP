import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Users, Search, Headphones, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Employee, CashierPermissions } from '@/lib/supabase';
import { PageHeader, Modal, EmptyState, ErrorState, Badge } from '@/components/ui';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { useShopFilter } from '@/lib/useShopFilter';

const empty = { full_name: '', email: '', phone: '', specialization: '', salary: '0', commission_rate: '10', status: 'active' };
const emptyCashier = { full_name: '', email: '', phone: '', password: '' };
const defaultPerms: CashierPermissions = {
  can_add_income: true,
  can_add_expense: true,
  can_add_customer: true,
  can_use_pos: true,
  can_delete_income: false,
  can_delete_expense: false,
  can_edit_customer: false,
};

const permKeys: { key: keyof CashierPermissions; labelKey: 'canAddIncome' | 'canAddExpense' | 'canAddCustomer' | 'canUsePos' | 'canDeleteIncome' | 'canDeleteExpense' | 'canEditCustomer' }[] = [
  { key: 'can_add_income', labelKey: 'canAddIncome' },
  { key: 'can_add_expense', labelKey: 'canAddExpense' },
  { key: 'can_add_customer', labelKey: 'canAddCustomer' },
  { key: 'can_use_pos', labelKey: 'canUsePos' },
  { key: 'can_delete_income', labelKey: 'canDeleteIncome' },
  { key: 'can_delete_expense', labelKey: 'canDeleteExpense' },
  { key: 'can_edit_customer', labelKey: 'canEditCustomer' },
];

export default function Employees() {
  const { t } = useLanguage();
  const { session } = useAuth();
  const shopFilter = useShopFilter();
  const [items, setItems] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [cashierOpen, setCashierOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [form, setForm] = useState<Record<string, string>>(empty);
  const [cashierForm, setCashierForm] = useState<Record<string, string>>(emptyCashier);
  const [perms, setPerms] = useState<CashierPermissions>(defaultPerms);
  const [saving, setSaving] = useState(false);
  const [cashierSaving, setCashierSaving] = useState(false);
  const [cashierError, setCashierError] = useState<string | null>(null);
  const [cashierSuccess, setCashierSuccess] = useState(false);

  const load = async () => {
    setLoading(true);
    let q = supabase.from('employees').select('*').order('created_at', { ascending: false });
    if (shopFilter) q = q.eq('shop_id', shopFilter);
    const { data, error } = await q;
    if (error) setError(error.message); else setItems(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [shopFilter]);

  const openNew = () => { setEditing(null); setForm(empty); setOpen(true); };
  const openEdit = (e: Employee) => {
    setEditing(e);
    setForm({ full_name: e.full_name, email: e.email, phone: e.phone ?? '', specialization: e.specialization ?? '', salary: String(e.salary), commission_rate: String(e.commission_rate), status: e.status });
    setOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = { full_name: form.full_name, email: form.email, phone: form.phone || null, specialization: form.specialization || null, salary: Number(form.salary), commission_rate: Number(form.commission_rate), status: form.status };
    if (editing) await supabase.from('employees').update(payload).eq('id', editing.id);
    else await supabase.from('employees').insert(payload);
    setSaving(false); setOpen(false); load();
  };

  const del = async (id: string) => {
    if (!confirm(t('deleteThisEmployee'))) return;
    await supabase.from('employees').delete().eq('id', id); load();
  };

  const openCashier = () => {
    setCashierForm(emptyCashier);
    setPerms(defaultPerms);
    setCashierError(null);
    setCashierSuccess(false);
    setCashierOpen(true);
  };

  const createCashier = async (e: React.FormEvent) => {
    e.preventDefault();
    setCashierSaving(true);
    setCashierError(null);
    setCashierSuccess(false);
    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-cashier`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          email: cashierForm.email,
          password: cashierForm.password,
          full_name: cashierForm.full_name,
          phone: cashierForm.phone || undefined,
          permissions: perms,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        const errMsg = data.error || `Failed to create cashier (HTTP ${resp.status})`;
        const detail = data.details ? ` [${data.details.name || ''} ${data.details.code || ''} ${data.details.status || ''}]`.trim() : '';
        setCashierError(errMsg + (detail ? ` — ${detail}` : ''));
        setCashierSaving(false);
        return;
      }
      setCashierSuccess(true);
      setCashierSaving(false);
      load();
    } catch (err) {
      setCashierError(err instanceof Error ? err.message : 'Network error — could not reach the server');
      setCashierSaving(false);
    }
  };

  const togglePerm = (key: keyof CashierPermissions) => {
    setPerms(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const filtered = items.filter(i => i.full_name.toLowerCase().includes(search.toLowerCase()) || i.email.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <PageHeader
        title={t('employees')}
        subtitle={t('addFirstEmployee')}
        action={
          <div className="flex gap-2">
            <button onClick={openCashier} className="btn-secondary"><Headphones className="h-4 w-4" /> {t('addCashier')}</button>
            <button onClick={openNew} className="btn-primary"><Plus className="h-4 w-4" /> {t('addEmployee')}</button>
          </div>
        }
      />

      <div className="mb-4 relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('searchEmployees')} className="input pl-10" />
      </div>

      {loading ? <div className="text-sm text-gray-500 dark:text-gray-400">{t('loading')}</div> :
       error ? <ErrorState message={error} onRetry={load} /> :
       filtered.length === 0 ? <EmptyState icon={Users} title={t('noEmployees')} message={t('addFirstEmployee')} action={<button onClick={openNew} className="btn-primary"><Plus className="h-4 w-4" /> {t('addEmployee')}</button>} /> : (
        <div className="card overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead className="table-header">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">{t('employeeName')}</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">{t('specialization')}</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">{t('salary')}</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">{t('commissionRate')}</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">{t('status')}</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">{t('hireDate')}</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600 dark:text-gray-300">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-ink-700">
              {filtered.map((e) => (
                <tr key={e.id} className="table-row">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900 dark:text-gray-100">{e.full_name}</p>
                      {e.specialization === 'Cashier' && <Badge color="blue">{t('cashier')}</Badge>}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{e.email}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{e.specialization ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{formatCurrency(e.salary)}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{e.commission_rate}%</td>
                  <td className="px-4 py-3"><Badge color={e.status === 'active' ? 'green' : 'gray'}>{e.status === 'active' ? t('active') : t('inactive')}</Badge></td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{formatDate(e.hire_date)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => openEdit(e)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-ink-800 dark:hover:text-gray-200"><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => del(e.id)} className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Employee Modal */}
      <Modal open={open} onClose={() => setOpen(false)} title={editing ? t('editEmployee') : t('addEmployee')}>
        <form onSubmit={save} className="space-y-4">
          <div><label className="label">{t('fullName')}</label><input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="input" /></div>
          <div><label className="label">{t('email')}</label><input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input" /></div>
          <div><label className="label">{t('phone')}</label><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input" /></div>
          <div><label className="label">{t('specialization')}</label><input value={form.specialization} onChange={(e) => setForm({ ...form, specialization: e.target.value })} className="input" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">{t('salary')}</label><input type="number" value={form.salary} onChange={(e) => setForm({ ...form, salary: e.target.value })} className="input" /></div>
            <div><label className="label">{t('commissionRate')}</label><input type="number" value={form.commission_rate} onChange={(e) => setForm({ ...form, commission_rate: e.target.value })} className="input" /></div>
          </div>
          <div><label className="label">{t('status')}</label><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="input"><option value="active">{t('active')}</option><option value="inactive">{t('inactive')}</option></select></div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setOpen(false)} className="btn-secondary">{t('cancel')}</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? t('saving') : t('save')}</button>
          </div>
        </form>
      </Modal>

      {/* Create Cashier Modal */}
      <Modal open={cashierOpen} onClose={() => setCashierOpen(false)} title={t('createCashierAccount')}>
        {cashierSuccess ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-xl bg-green-50 px-4 py-4 text-green-700 border border-green-200 dark:bg-green-950/40 dark:text-green-400 dark:border-green-900">
              <Check className="h-5 w-5" />
              <p className="text-sm font-medium">{t('cashierCreated')}</p>
            </div>
            <button onClick={() => setCashierOpen(false)} className="btn-primary w-full">{t('cancel')}</button>
          </div>
        ) : (
          <form onSubmit={createCashier} className="space-y-4">
            {cashierError && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 border border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900">{cashierError}</div>}
            <div><label className="label">{t('fullName')}</label><input required value={cashierForm.full_name} onChange={(e) => setCashierForm({ ...cashierForm, full_name: e.target.value })} className="input" /></div>
            <div><label className="label">{t('username')}</label><input required type="email" value={cashierForm.email} onChange={(e) => setCashierForm({ ...cashierForm, email: e.target.value })} className="input" /></div>
            <div><label className="label">{t('cashierPassword')}</label><input required type="password" minLength={6} value={cashierForm.password} onChange={(e) => setCashierForm({ ...cashierForm, password: e.target.value })} className="input" /></div>
            <div><label className="label">{t('phone')}</label><input value={cashierForm.phone} onChange={(e) => setCashierForm({ ...cashierForm, phone: e.target.value })} className="input" /></div>

            <div className="border-t border-gray-100 pt-4 dark:border-ink-700">
              <p className="mb-1 text-sm font-semibold text-gray-900 dark:text-gray-100">{t('cashierPermissions')}</p>
              <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">{t('selectPermissions')}</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {permKeys.map(({ key, labelKey }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => togglePerm(key)}
                    className={`flex items-center gap-2 rounded-xl border-2 px-3 py-2 text-sm font-medium transition ${perms[key] ? 'border-gold-500 bg-gold-50 text-gold-700 dark:bg-gold-900/30 dark:text-gold-300' : 'border-gray-200 bg-gray-50 text-gray-500 dark:border-ink-700 dark:bg-ink-800 dark:text-gray-400'}`}
                  >
                    <span className={`flex h-5 w-5 items-center justify-center rounded-md ${perms[key] ? 'bg-gold-500 text-white' : 'bg-gray-200 dark:bg-ink-700'}`}>
                      {perms[key] && <Check className="h-3 w-3" />}
                    </span>
                    {t(labelKey)}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setCashierOpen(false)} className="btn-secondary">{t('cancel')}</button>
              <button type="submit" disabled={cashierSaving} className="btn-primary">{cashierSaving ? t('creatingCashier') : t('createCashierAccount')}</button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
