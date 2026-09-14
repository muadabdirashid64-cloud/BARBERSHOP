import { useEffect, useState } from 'react';
import { Calendar, DollarSign, Scissors } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import type { Service } from '@/lib/supabase';
import { PageHeader, StatCard, ErrorState } from '@/components/ui';
import { formatCurrency } from '@/lib/utils';
import { useLanguage } from '@/context/LanguageContext';

export default function CustomerDashboard() {
  const { profile } = useAuth();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [services, setServices] = useState<Service[]>([]);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('services').select('*').eq('is_active', true).limit(4);
    if (error) setError(error.message); else setServices(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  if (loading) return <div className="text-sm text-gray-500 dark:text-gray-400">{t('loading')}</div>;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div>
      <PageHeader title={`${t('welcomeBack').split(',')[0]}, ${profile?.full_name ?? 'Customer'}`} subtitle={t('bookNextAppointment')} />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3 stagger">
        <StatCard label={t('availableServices')} value={String(services.length)} icon={Scissors} iconColor="bg-gold-100 text-gold-600 dark:bg-gold-900/40 dark:text-gold-400" />
        <StatCard label={t('appointments')} value="0" icon={Calendar} iconColor="bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400" />
        <StatCard label={t('totalSpent')} value={formatCurrency(0)} icon={DollarSign} iconColor="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400" />
      </div>

      <h3 className="mb-4 text-base font-bold text-gray-900 dark:text-gray-100">{t('popularServices')}</h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 stagger">
        {services.map((s) => (
          <div key={s.id} className="card-glow">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gold-100 dark:bg-gold-900/40">
              <Scissors className="h-5 w-5 text-gold-600 dark:text-gold-400" />
            </div>
            <h3 className="mt-3 text-base font-bold text-gray-900 dark:text-gray-100">{s.name}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{s.duration_minutes} min</p>
            <p className="mt-2 text-lg font-bold text-gray-900 dark:text-gray-100">{formatCurrency(s.price)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
