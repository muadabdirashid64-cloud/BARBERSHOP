import { useEffect, useState } from 'react';
import { FileText, Download, DollarSign, Receipt, Users, Package, Scissors, Home, TrendingUp, Calendar, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Revenue, Expense, Customer, Employee, Service, InventoryItem, HomeService } from '@/lib/supabase';
import { PageHeader, ErrorState } from '@/components/ui';
import { formatCurrency } from '@/lib/utils';
import { useLanguage } from '@/context/LanguageContext';
import type { TranslationKey } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { useShopFilter } from '@/lib/useShopFilter';

type ReportType = 'income' | 'expenses' | 'customers' | 'employees' | 'services' | 'inventory' | 'home-services' | 'summary';

interface ReportMeta {
  type: ReportType;
  labelKey: TranslationKey;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  descKey: TranslationKey;
}

const reportTypes: ReportMeta[] = [
  { type: 'summary', labelKey: 'reportSummary', icon: FileText, color: 'bg-blue-500', descKey: 'reportSummaryDesc' },
  { type: 'income', labelKey: 'reportIncome', icon: DollarSign, color: 'bg-emerald-500', descKey: 'reportIncomeDesc' },
  { type: 'expenses', labelKey: 'reportExpenses', icon: Receipt, color: 'bg-red-500', descKey: 'reportExpensesDesc' },
  { type: 'customers', labelKey: 'reportCustomers', icon: Users, color: 'bg-green-500', descKey: 'reportCustomersDesc' },
  { type: 'employees', labelKey: 'reportEmployees', icon: Scissors, color: 'bg-gold-500', descKey: 'reportEmployeesDesc' },
  { type: 'services', labelKey: 'reportServices', icon: Scissors, color: 'bg-indigo-500', descKey: 'reportServicesDesc' },
  { type: 'inventory', labelKey: 'reportInventory', icon: Package, color: 'bg-purple-500', descKey: 'reportInventoryDesc' },
  { type: 'home-services', labelKey: 'reportHomeServices', icon: Home, color: 'bg-pink-500', descKey: 'reportHomeServicesDesc' },
];

function escapeCsv(value: string | number | null | undefined): string {
  const s = String(value ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function downloadCsv(filename: string, headers: string[], rows: (string | number | null | undefined)[][]) {
  const csv = [headers.join(','), ...rows.map(r => r.map(escapeCsv).join(','))].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

export default function Reports() {
  const { t } = useLanguage();
  const shopFilter = useShopFilter();
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<ReportType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [data, setData] = useState<{
    revenue: Revenue[];
    expenses: Expense[];
    customers: Customer[];
    employees: Employee[];
    services: Service[];
    inventory: InventoryItem[];
    homeServices: HomeService[];
  }>({ revenue: [], expenses: [], customers: [], employees: [], services: [], inventory: [], homeServices: [] });

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      let revQ = supabase.from('revenue').select('*').order('transaction_date', { ascending: false });
      if (shopFilter) revQ = revQ.eq('shop_id', shopFilter);
      let expQ = supabase.from('expenses').select('*').order('expense_date', { ascending: false });
      if (shopFilter) expQ = expQ.eq('shop_id', shopFilter);
      let custQ = supabase.from('customers').select('*').order('created_at', { ascending: false });
      if (shopFilter) custQ = custQ.eq('shop_id', shopFilter);
      let empQ = supabase.from('employees').select('*').order('full_name');
      if (shopFilter) empQ = empQ.eq('shop_id', shopFilter);
      let svcQ = supabase.from('services').select('*').order('name');
      if (shopFilter) svcQ = svcQ.eq('shop_id', shopFilter);
      let invQ = supabase.from('inventory').select('*').eq('is_active', true).order('product_name');
      if (shopFilter) invQ = invQ.eq('shop_id', shopFilter);
      let hsQ = supabase.from('home_services').select('*').order('created_at', { ascending: false });
      if (shopFilter) hsQ = hsQ.eq('shop_id', shopFilter);
      const [rev, exp, cust, emp, svc, inv, hs] = await Promise.all([revQ, expQ, custQ, empQ, svcQ, invQ, hsQ]);
      if (rev.error) throw rev.error;
      setData({
        revenue: (rev.data ?? []) as Revenue[],
        expenses: (exp.data ?? []) as Expense[],
        customers: (cust.data ?? []) as Customer[],
        employees: (emp.data ?? []) as Employee[],
        services: (svc.data ?? []) as Service[],
        inventory: (inv.data ?? []) as InventoryItem[],
        homeServices: (hs.data ?? []) as HomeService[],
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [shopFilter]);

  const filterByDate = <T extends { transaction_date?: string; expense_date?: string; created_at: string }>(items: T[], dateField: keyof T): T[] => {
    return items.filter(item => {
      const val = item[dateField] as string | undefined;
      if (!val) return true;
      if (dateFrom && val < dateFrom) return false;
      if (dateTo && val > dateTo) return false;
      return true;
    });
  };

  const handleDownload = async (type: ReportType) => {
    setDownloading(type);
    try {
      const stamp = todayStr();
      switch (type) {
        case 'income': {
          const rows = filterByDate(data.revenue, 'transaction_date');
          downloadCsv(`income-report-${stamp}.csv`, [
            'Date', 'Source', 'Amount', 'Description', 'Payment Method', 'Notes',
          ], rows.map(r => [
            r.transaction_date, r.source, r.amount, r.description, r.payment_method, r.notes,
          ]));
          break;
        }
        case 'expenses': {
          const rows = filterByDate(data.expenses, 'expense_date');
          downloadCsv(`expenses-report-${stamp}.csv`, [
            'Date', 'Category', 'Amount', 'Description', 'Vendor', 'Recurring', 'Notes',
          ], rows.map(e => [
            e.expense_date, e.category, e.amount, e.description, e.vendor, e.is_recurring ? 'Yes' : 'No', e.notes,
          ]));
          break;
        }
        case 'customers': {
          downloadCsv(`customers-report-${stamp}.csv`, [
            'Name', 'Email', 'Phone', 'Total Visits', 'Total Spent', 'Last Visit', 'Active',
          ], data.customers.map(c => [
            c.full_name, c.email, c.phone, c.total_visits, c.total_spent, c.last_visit, c.is_active ? 'Yes' : 'No',
          ]));
          break;
        }
        case 'employees': {
          downloadCsv(`employees-report-${stamp}.csv`, [
            'Name', 'Email', 'Phone', 'Specialization', 'Salary', 'Commission Rate', 'Status', 'Hire Date',
          ], data.employees.map(e => [
            e.full_name, e.email, e.phone, e.specialization, e.salary, e.commission_rate, e.status, e.hire_date,
          ]));
          break;
        }
        case 'services': {
          downloadCsv(`services-report-${stamp}.csv`, [
            'Name', 'Category', 'Price', 'Duration (min)', 'Active',
          ], data.services.map(s => [
            s.name, s.category, s.price, s.duration_minutes, s.is_active ? 'Yes' : 'No',
          ]));
          break;
        }
        case 'inventory': {
          downloadCsv(`inventory-report-${stamp}.csv`, [
            'Product', 'Category', 'Quantity', 'Unit', 'Unit Price', 'Supplier', 'SKU', 'Reorder Level', 'Last Restocked',
          ], data.inventory.map(i => [
            i.product_name, i.category, i.quantity, i.unit, i.unit_price, i.supplier, i.sku, i.reorder_level, i.last_restocked,
          ]));
          break;
        }
        case 'home-services': {
          downloadCsv(`home-services-report-${stamp}.csv`, [
            'Customer', 'Phone', 'Address', 'Service Type', 'Date', 'Time', 'Status', 'Total Amount', 'Home Service Fee',
          ], data.homeServices.map(h => [
            h.customer_name, h.phone_number, h.address, h.service_type, h.appointment_date, h.appointment_time, h.status, h.total_amount, h.home_service_fee,
          ]));
          break;
        }
        case 'summary': {
          const filteredRev = filterByDate(data.revenue, 'transaction_date');
          const filteredExp = filterByDate(data.expenses, 'expense_date');
          const totalRev = filteredRev.reduce((s, r) => s + Number(r.amount), 0);
          const totalExp = filteredExp.reduce((s, e) => s + Number(e.amount), 0);
          downloadCsv(`summary-report-${stamp}.csv`, [
            'Metric', 'Value',
          ], [
            ['Report Period', `${dateFrom || 'All'} to ${dateTo || 'All'}`],
            ['Total Revenue', totalRev],
            ['Total Expenses', totalExp],
            ['Net Profit', totalRev - totalExp],
            ['Revenue Transactions', filteredRev.length],
            ['Expense Records', filteredExp.length],
            ['Total Customers', data.customers.length],
            ['Active Customers', data.customers.filter(c => c.is_active).length],
            ['Total Employees', data.employees.length],
            ['Active Employees', data.employees.filter(e => e.status === 'active').length],
            ['Total Services', data.services.length],
            ['Inventory Items', data.inventory.length],
            ['Low Stock Items', data.inventory.filter(i => i.quantity <= i.reorder_level).length],
            ['Home Service Requests', data.homeServices.length],
          ]);
          break;
        }
      }
    } finally {
      setDownloading(null);
    }
  };

  const filteredRev = filterByDate(data.revenue, 'transaction_date');
  const filteredExp = filterByDate(data.expenses, 'expense_date');
  const totalRev = filteredRev.reduce((s, r) => s + Number(r.amount), 0);
  const totalExp = filteredExp.reduce((s, e) => s + Number(e.amount), 0);

  return (
    <div>
      <PageHeader title={t('reports')} subtitle={t('reportsSubtitle')} />

      {/* Date filter */}
      <div className="card mb-6">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="label">{t('dateFrom')}</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="input" />
          </div>
          <div>
            <label className="label">{t('dateTo')}</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="input" />
          </div>
          <button onClick={() => { setDateFrom(''); setDateTo(''); }} className="btn-secondary">
            {t('clearDates')}
          </button>
        </div>
      </div>

      {/* Summary stats */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 stagger">
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/40">
              <DollarSign className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('income')}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{formatCurrency(totalRev)}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-100 dark:bg-red-900/40">
              <Receipt className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('totalExpenses')}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{formatCurrency(totalExp)}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/40">
              <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('netProfit')}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{formatCurrency(totalRev - totalExp)}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gold-100 dark:bg-gold-900/40">
              <Calendar className="h-5 w-5 text-gold-600 dark:text-gold-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('transactions')}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{filteredRev.length + filteredExp.length}</p>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-sm text-gray-500 dark:text-gray-400">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> {t('loading')}
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 stagger">
          {reportTypes.map((r) => (
            <div key={r.type} className="card group flex flex-col">
              <div className="flex items-start gap-3">
                <div className={cn('flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl', r.color)}>
                  <r.icon className="h-6 w-6 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">{t(r.labelKey)}</h3>
                  <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{t(r.descKey)}</p>
                </div>
              </div>
              <button
                onClick={() => handleDownload(r.type)}
                disabled={downloading === r.type}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-gray-50 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 active:scale-[0.98] disabled:opacity-50 dark:border-ink-700 dark:bg-ink-800 dark:text-gray-200 dark:hover:bg-ink-700"
              >
                {downloading === r.type ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> {t('preparing')}</>
                ) : (
                  <><Download className="h-4 w-4" /> {t('downloadCsv')}</>
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
