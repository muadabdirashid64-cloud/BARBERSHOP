import { useEffect, useState } from 'react';
import { DollarSign, Star, Clock, Scissors } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import type { BarberRating, Revenue, Employee } from '@/lib/supabase';
import { PageHeader, StatCard, ErrorState } from '@/components/ui';
import { formatCurrency, initials } from '@/lib/utils';
import { useLanguage } from '@/context/LanguageContext';

const samplePhotos = [
  'https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&fit=crop',
  'https://images.pexels.com/photos/1681010/pexels-photo-1681010.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&fit=crop',
  'https://images.pexels.com/photos/2613260/pexels-photo-2613260.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&fit=crop',
  'https://images.pexels.com/photos/3777931/pexels-photo-3777931.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&fit=crop',
];

export default function BarberDashboard() {
  const { profile } = useAuth();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({ earnings: 0, ratings: [] as BarberRating[], avgRating: 0 });
  const [employees, setEmployees] = useState<Employee[]>([]);

  const load = async () => {
    setLoading(true);
    const [ratings, revenue, emp] = await Promise.all([
      supabase.from('barber_ratings').select('*').order('created_at', { ascending: false }).limit(5),
      supabase.from('revenue').select('amount'),
      supabase.from('employees').select('*').eq('status', 'active').order('full_name'),
    ]);
    const ratingData = (ratings.data ?? []) as BarberRating[];
    const revData = (revenue.data ?? []) as Revenue[];
    const avg = ratingData.length ? ratingData.reduce((s, r) => s + r.rating, 0) / ratingData.length : 0;
    setStats({ earnings: revData.reduce((s, r) => s + Number(r.amount), 0), ratings: ratingData, avgRating: avg });
    setEmployees((emp.data ?? []) as Employee[]);
    setError(null);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  if (loading) return <div className="text-sm text-gray-500 dark:text-gray-400">{t('loading')}</div>;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div>
      <PageHeader title={`${t('welcomeBack').split(',')[0]}, ${profile?.full_name ?? 'Barber'}`} subtitle={t('barberDashboard')} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 stagger">
        <StatCard label={t('totalEarnings')} value={formatCurrency(stats.earnings)} icon={DollarSign} iconColor="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400" />
        <StatCard label={t('averageRating')} value={stats.avgRating.toFixed(1)} icon={Star} iconColor="bg-gold-100 text-gold-600 dark:bg-gold-900/40 dark:text-gold-400" />
        <StatCard label={t('ratings')} value={String(stats.ratings.length)} icon={Clock} iconColor="bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400" />
      </div>

      {/* Team Overview with photos */}
      <div className="mt-6 card">
        <div className="mb-4 flex items-center gap-2">
          <Scissors className="h-5 w-5 text-gold-500" />
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">{t('teamOverview')}</h3>
        </div>
        {employees.length === 0 ? (
          <div className="py-8 text-center text-sm text-gray-400 dark:text-gray-500">{t('noEmployees')}</div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {employees.map((emp, idx) => (
              <div key={emp.id} className="group flex flex-col items-center rounded-2xl border border-gray-100 p-4 text-center transition-all hover:border-gold-300 hover:shadow-md dark:border-ink-700 dark:hover:border-gold-500/40">
                <div className="relative mb-3">
                  <img
                    src={emp.avatar_url || samplePhotos[idx % samplePhotos.length]}
                    alt={emp.full_name}
                    className="h-20 w-20 rounded-full object-cover ring-2 ring-gold-400/30 transition-all group-hover:ring-gold-400/60"
                    loading="lazy"
                  />
                  <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-green-500 text-[10px] font-bold text-white ring-2 ring-white dark:ring-ink-900">✓</span>
                </div>
                <p className="truncate text-sm font-bold text-gray-900 dark:text-gray-100">{emp.full_name}</p>
                <p className="truncate text-xs text-gray-500 dark:text-gray-400">{emp.specialization ?? t('barber')}</p>
                {emp.experience && (
                  <p className="mt-1 text-xs text-gray-400">{emp.experience}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 card">
        <h3 className="mb-4 text-lg font-bold text-gray-900 dark:text-gray-100">{t('ratings')}</h3>
        {stats.ratings.length === 0 ? (
          <div className="py-8 text-center text-sm text-gray-400 dark:text-gray-500">{t('noRatingsYet')}</div>
        ) : (
          <div className="space-y-2">
            {stats.ratings.map((r) => (
              <div key={r.id} className="flex items-center gap-3 rounded-xl border border-gray-100 px-4 py-3 dark:border-ink-700">
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map(n => (
                    <Star key={n} className={`h-4 w-4 ${n <= r.rating ? 'fill-gold-400 text-gold-400' : 'text-gray-200 dark:text-ink-600'}`} />
                  ))}
                </div>
                <p className="flex-1 text-sm text-gray-600 dark:text-gray-300">{r.comment ?? t('noComment')}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
