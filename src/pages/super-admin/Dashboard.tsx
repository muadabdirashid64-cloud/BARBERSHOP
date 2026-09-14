import { useEffect, useState } from 'react';
import { Store, Users, Scissors, DollarSign, TrendingUp, Building2, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/context/LanguageContext';
import { useShop } from '@/context/ShopContext';
import { formatCurrency } from '@/lib/utils';
import { ErrorState } from '@/components/ui';
import { cn } from '@/lib/utils';

interface ShopStats {
  totalShops: number;
  activeShops: number;
  inactiveShops: number;
  totalAdmins: number;
  totalCashiers: number;
  totalBarbers: number;
  totalCustomers: number;
  totalRevenue: number;
  totalExpenses: number;
}

export default function SuperAdminDashboard() {
  const { t } = useLanguage();
  const { selectedShop } = useShop();
  const [stats, setStats] = useState<ShopStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const shopFilter = selectedShop ? `&shop_id=eq.${selectedShop.id}` : '';
      const [shopsRes, profilesRes, employeesRes, customersRes, revenueRes, expensesRes] = await Promise.all([
        supabase.from('barber_shops').select('id, status'),
        supabase.from('profiles').select('role'),
        supabase.from('employees').select('id, status').eq('shop_id', selectedShop?.id ?? ''),
        supabase.from('customers').select('id').eq('shop_id', selectedShop?.id ?? ''),
        supabase.from('revenue').select('amount').eq('shop_id', selectedShop?.id ?? ''),
        supabase.from('expenses').select('amount').eq('shop_id', selectedShop?.id ?? ''),
      ]);

      const shops = shopsRes.data ?? [];
      const profiles = profilesRes.data ?? [];
      const employees = employeesRes.data ?? [];
      const revenue = (revenueRes.data ?? []).map((r: any) => Number(r.amount));
      const expenses = (expensesRes.data ?? []).map((e: any) => Number(e.amount));

      setStats({
        totalShops: shops.length,
        activeShops: shops.filter((s: any) => s.status === 'active').length,
        inactiveShops: shops.filter((s: any) => s.status === 'inactive').length,
        totalAdmins: profiles.filter((p: any) => p.role === 'admin').length,
        totalCashiers: profiles.filter((p: any) => p.role === 'cashier').length,
        totalBarbers: employees.filter((e: any) => e.status === 'active').length,
        totalCustomers: customersRes.data?.length ?? 0,
        totalRevenue: revenue.reduce((s: number, a: number) => s + a, 0),
        totalExpenses: expenses.reduce((s: number, a: number) => s + a, 0),
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [selectedShop?.id]);

  if (loading) return <div className="flex items-center justify-center py-16 text-sm text-gray-500 dark:text-gray-400"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> {t('loading')}</div>;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!stats) return null;

  const cards = [
    { label: t('totalShops'), value: stats.totalShops, icon: Store, color: 'bg-blue-500', iconBg: 'bg-blue-100 dark:bg-blue-900/40', iconColor: 'text-blue-600 dark:text-blue-400' },
    { label: t('activeShops'), value: stats.activeShops, icon: CheckCircle2, color: 'bg-green-500', iconBg: 'bg-green-100 dark:bg-green-900/40', iconColor: 'text-green-600 dark:text-green-400' },
    { label: t('inactiveShops'), value: stats.inactiveShops, icon: XCircle, color: 'bg-gray-500', iconBg: 'bg-gray-100 dark:bg-gray-900/40', iconColor: 'text-gray-600 dark:text-gray-400' },
    { label: t('totalAdmins'), value: stats.totalAdmins, icon: Building2, color: 'bg-purple-500', iconBg: 'bg-purple-100 dark:bg-purple-900/40', iconColor: 'text-purple-600 dark:text-purple-400' },
    { label: t('totalCashiers'), value: stats.totalCashiers, icon: Users, color: 'bg-gold-500', iconBg: 'bg-gold-100 dark:bg-gold-900/40', iconColor: 'text-gold-600 dark:text-gold-400' },
    { label: t('totalBarbers'), value: stats.totalBarbers, icon: Scissors, color: 'bg-indigo-500', iconBg: 'bg-indigo-100 dark:bg-indigo-900/40', iconColor: 'text-indigo-600 dark:text-indigo-400' },
    { label: t('totalCustomers'), value: stats.totalCustomers, icon: Users, color: 'bg-emerald-500', iconBg: 'bg-emerald-100 dark:bg-emerald-900/40', iconColor: 'text-emerald-600 dark:text-emerald-400' },
    { label: t('totalRevenue'), value: formatCurrency(stats.totalRevenue), icon: DollarSign, color: 'bg-emerald-500', iconBg: 'bg-emerald-100 dark:bg-emerald-900/40', iconColor: 'text-emerald-600 dark:text-emerald-400' },
    { label: t('totalExpenses'), value: formatCurrency(stats.totalExpenses), icon: TrendingUp, color: 'bg-red-500', iconBg: 'bg-red-100 dark:bg-red-900/40', iconColor: 'text-red-600 dark:text-red-400' },
  ];

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('superAdminDashboard')}</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {selectedShop ? `${t('viewingShop')}: ${selectedShop.name}` : t('systemWideOverview')}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 stagger">
        {cards.map((card, i) => (
          <div key={i} className="card">
            <div className="flex items-center gap-3">
              <div className={cn('flex h-11 w-11 items-center justify-center rounded-xl', card.iconBg)}>
                <card.icon className={cn('h-5 w-5', card.iconColor)} />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{card.label}</p>
                <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{card.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="card">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/40">
              <DollarSign className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">{t('netProfit')}</h3>
          </div>
          <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(stats.totalRevenue - stats.totalExpenses)}</p>
        </div>
        <div className="card">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/40">
              <Store className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">{t('shopSummary')}</h3>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">{t('activeShops')}</span><span className="font-semibold text-green-600 dark:text-green-400">{stats.activeShops}</span></div>
            <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">{t('inactiveShops')}</span><span className="font-semibold text-gray-500">{stats.inactiveShops}</span></div>
            <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">{t('totalAdmins')}</span><span className="font-semibold text-gray-900 dark:text-gray-100">{stats.totalAdmins}</span></div>
            <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">{t('totalCashiers')}</span><span className="font-semibold text-gray-900 dark:text-gray-100">{stats.totalCashiers}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
