import { useEffect, useState } from 'react';
import { Star, MessageSquare } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import type { BarberRating } from '@/lib/supabase';
import { PageHeader, EmptyState, ErrorState, StatCard } from '@/components/ui';
import { timeAgo } from '@/lib/utils';
import { useLanguage } from '@/context/LanguageContext';

export default function Ratings() {
  const { profile } = useAuth();
  const { t } = useLanguage();
  const [ratings, setRatings] = useState<BarberRating[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data: emp } = await supabase.from('employees').select('*').eq('email', profile?.email ?? '').maybeSingle();
    const { data, error } = await supabase.from('barber_ratings').select('*').eq('barber_id', emp?.id).order('created_at', { ascending: false });
    if (error) setError(error.message); else setRatings(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  if (loading) return <div className="text-sm text-gray-500 dark:text-gray-400">{t('loading')}</div>;
  if (error) return <ErrorState message={error} onRetry={load} />;

  const avg = ratings.length ? ratings.reduce((s, r) => s + r.rating, 0) / ratings.length : 0;

  return (
    <div>
      <PageHeader title={t('myRatings')} subtitle={t('customerFeedback')} />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 stagger">
        <StatCard label={t('averageRating')} value={avg.toFixed(1)} icon={Star} iconColor="bg-gold-100 text-gold-600 dark:bg-gold-900/40 dark:text-gold-400" />
        <StatCard label={t('totalReviews')} value={String(ratings.length)} icon={MessageSquare} iconColor="bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400" />
      </div>

      {ratings.length === 0 ? <EmptyState icon={Star} title={t('noRatingsYet')} message={t('customerFeedback')} /> : (
        <div className="space-y-3 stagger">
          {ratings.map((r) => (
            <div key={r.id} className="card-glow">
              <div className="flex items-start justify-between">
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map(n => (
                    <Star key={n} className={`h-5 w-5 ${n <= r.rating ? 'fill-gold-400 text-gold-400' : 'text-gray-200 dark:text-ink-600'}`} />
                  ))}
                </div>
                <span className="text-xs text-gray-400 dark:text-gray-500">{timeAgo(r.created_at)}</span>
              </div>
              {r.comment && <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{r.comment}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
