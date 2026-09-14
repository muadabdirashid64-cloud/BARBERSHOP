import { useEffect, useState } from 'react';
import {
  DollarSign, Users, Scissors, Package, TrendingUp, AlertTriangle,
  ArrowUpRight,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Revenue, Expense, InventoryItem } from '@/lib/supabase';
import { StatCard, PageHeader, ErrorState } from '@/components/ui';
import { formatCurrency } from '@/lib/utils';
import { useLanguage } from '@/context/LanguageContext';
import { useShopFilter } from '@/lib/useShopFilter';
import { useShop } from '@/context/ShopContext';

const DEFAULT_LOGO = '/ChatGPT_Image_Aug_27,_2026,_07_56_43_AM.png';

export default function AdminDashboard() {
  const { t } = useLanguage();
  const shopFilter = useShopFilter();
  const { selectedShop } = useShop();
  const shopLogo = selectedShop?.logo_url ?? DEFAULT_LOGO;
  const shopName = selectedShop?.name ?? 'Barber Shop';
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    revenue: 0, expenses: 0, customers: 0, employees: 0, services: 0,
    lowStock: [] as InventoryItem[], recentRevenue: [] as Revenue[],
  });
  const [chartData, setChartData] = useState<{ day: string; revenue: number; expenses: number }[]>([]);

  useEffect(() => { loadDashboard(); }, [shopFilter]);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      let revQ = supabase.from('revenue').select('amount, transaction_date').order('transaction_date', { ascending: false }).limit(50);
      if (shopFilter) revQ = revQ.eq('shop_id', shopFilter);
      let expQ = supabase.from('expenses').select('amount, expense_date').order('expense_date', { ascending: false }).limit(50);
      if (shopFilter) expQ = expQ.eq('shop_id', shopFilter);
      let custQ = supabase.from('customers').select('id', { count: 'exact', head: true });
      if (shopFilter) custQ = custQ.eq('shop_id', shopFilter);
      let empQ = supabase.from('employees').select('id', { count: 'exact', head: true });
      if (shopFilter) empQ = empQ.eq('shop_id', shopFilter);
      let svcQ = supabase.from('services').select('id', { count: 'exact', head: true });
      if (shopFilter) svcQ = svcQ.eq('shop_id', shopFilter);
      let invQ = supabase.from('inventory').select('*').eq('is_active', true);
      if (shopFilter) invQ = invQ.eq('shop_id', shopFilter);
      let recentRevQ = supabase.from('revenue').select('*').order('created_at', { ascending: false }).limit(5);
      if (shopFilter) recentRevQ = recentRevQ.eq('shop_id', shopFilter);
      const [rev, exp, cust, emp, svc, inv, recentRev] = await Promise.all([revQ, expQ, custQ, empQ, svcQ, invQ, recentRevQ]);
      const revData = (rev.data ?? []) as Revenue[];
      const expData = (exp.data ?? []) as Expense[];
      const totalRev = revData.reduce((s, r) => s + Number(r.amount), 0);
      const totalExp = expData.reduce((s, e) => s + Number(e.amount), 0);
      const days: { day: string; revenue: number; expenses: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const dayRev = revData.filter(r => r.transaction_date === dateStr).reduce((s, r) => s + Number(r.amount), 0);
        const dayExp = expData.filter(e => e.expense_date === dateStr).reduce((s, e) => s + Number(e.amount), 0);
        days.push({ day: d.toLocaleDateString('en-US', { weekday: 'short' }), revenue: dayRev, expenses: dayExp });
      }
      const lowStock = ((inv.data ?? []) as InventoryItem[]).filter(i => i.quantity <= i.reorder_level);
      setStats({ revenue: totalRev, expenses: totalExp, customers: cust.count ?? 0, employees: emp.count ?? 0, services: svc.count ?? 0, lowStock, recentRevenue: (recentRev.data ?? []) as Revenue[] });
      setChartData(days);
      setError(null);
    } catch { setError(t('failedToLoadDashboard')); }
    finally { setLoading(false); }
  };

  if (loading) return <div className="text-sm text-gray-500 dark:text-gray-400">{t('loadingDashboard')}</div>;
  if (error) return <ErrorState message={error} onRetry={loadDashboard} />;

  const profit = stats.revenue - stats.expenses;
  const maxVal = Math.max(...chartData.map(d => Math.max(d.revenue, d.expenses)), 1);

  return (
    <div>
      <PageHeader title={t('dashboard')} subtitle={t('welcomeBack')} />

      {/* Shop logo banner */}
      <div className="mb-6 flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-4 dark:border-ink-700 dark:bg-ink-900">
        <img src={shopLogo} alt={shopName} className="h-14 w-14 rounded-xl object-contain" />
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">{shopName}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('shopDetails')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 stagger">
        <StatCard label={t('income')} value={formatCurrency(stats.revenue)} icon={DollarSign} iconColor="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400" trend={`+12.5% ${t('fromLastWeek')}`} />
        <StatCard label={t('totalExpenses')} value={formatCurrency(stats.expenses)} icon={TrendingUp} iconColor="bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400" trend={`-3.2% ${t('fromLastWeek')}`} />
        <StatCard label={t('netProfit')} value={formatCurrency(profit)} icon={ArrowUpRight} iconColor="bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400" />
        <StatCard label={t('customers')} value={String(stats.customers)} icon={Users} iconColor="bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">{t('revenueVsExpenses')}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('last7Days')}</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />{t('income')}</span>
              <span className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400"><span className="h-2.5 w-2.5 rounded-full bg-red-400" />{t('expenses')}</span>
            </div>
          </div>
          <div className="flex h-56 items-end justify-between gap-3">
            {chartData.map((d, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-2">
                <div className="flex h-full w-full items-end justify-center gap-1.5">
                  <div className="w-1/2 max-w-[24px] rounded-t-md bg-gradient-to-t from-emerald-500 to-emerald-400 transition-all duration-500 hover:from-emerald-400 hover:to-emerald-300" style={{ height: `${(d.revenue / maxVal) * 100}%`, minHeight: d.revenue > 0 ? '4px' : '0' }} title={`Revenue: ${formatCurrency(d.revenue)}`} />
                  <div className="w-1/2 max-w-[24px] rounded-t-md bg-gradient-to-t from-red-500 to-red-400 transition-all duration-500 hover:from-red-400 hover:to-red-300" style={{ height: `${(d.expenses / maxVal) * 100}%`, minHeight: d.expenses > 0 ? '4px' : '0' }} title={`Expenses: ${formatCurrency(d.expenses)}`} />
                </div>
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{d.day}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">{t('lowStockAlert')}</h3>
            <span className="badge-red">{stats.lowStock.length}</span>
          </div>
          {stats.lowStock.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-400 dark:text-gray-500">{t('allItemsWellStocked')}</div>
          ) : (
            <div className="space-y-3">
              {stats.lowStock.slice(0, 5).map((item) => (
                <div key={item.id} className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 dark:bg-red-950/40">
                    <AlertTriangle className="h-4 w-4 text-red-500 dark:text-red-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">{item.product_name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{item.category}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-red-600 dark:text-red-400">{item.quantity}</p>
                    <p className="text-xs text-gray-400">/ {item.reorder_level}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          <h3 className="mb-4 text-lg font-bold text-gray-900 dark:text-gray-100">{t('recentTransactions')}</h3>
          {stats.recentRevenue.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-400 dark:text-gray-500">{t('noTransactionsYet')}</div>
          ) : (
            <div className="space-y-2">
              {stats.recentRevenue.map(r => (
                <div key={r.id} className="flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3 dark:border-ink-700">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/40">
                      <ArrowUpRight className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{r.description || r.source}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{r.payment_method} · {r.transaction_date}</p>
                    </div>
                  </div>
                  <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">+{formatCurrency(r.amount)}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="card-glow">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-100 dark:bg-purple-900/40">
                <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('employees')}</p>
                <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{stats.employees}</p>
              </div>
            </div>
          </div>
          <div className="card-glow">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gold-100 dark:bg-gold-900/40">
                <Scissors className="h-5 w-5 text-gold-600 dark:text-gold-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('services')}</p>
                <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{stats.services}</p>
              </div>
            </div>
          </div>
          <div className="card-glow">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-900/40">
                <Package className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('inventory')}</p>
                <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{stats.lowStock.length} {t('low')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
