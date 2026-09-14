import { useEffect, useState } from 'react';
import { Heart, Scissors, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Service, CustomerFavorite } from '@/lib/supabase';
import { PageHeader, EmptyState, ErrorState } from '@/components/ui';
import { formatCurrency } from '@/lib/utils';
import { useLanguage } from '@/context/LanguageContext';

export default function Favorites() {
  const { t } = useLanguage();
  const [services, setServices] = useState<Service[]>([]);
  const [favorites, setFavorites] = useState<CustomerFavorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [svc, fav] = await Promise.all([
      supabase.from('services').select('*').eq('is_active', true),
      supabase.from('customer_favorites').select('*'),
    ]);
    if (svc.error) setError(svc.error.message); else setServices(svc.data ?? []);
    setFavorites(fav.data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggleFavorite = async (serviceId: string) => {
    const existing = favorites.find(f => f.service_id === serviceId);
    if (existing) await supabase.from('customer_favorites').delete().eq('id', existing.id);
    else await supabase.from('customer_favorites').insert({ service_id: serviceId });
    load();
  };

  const isFavorite = (serviceId: string) => favorites.some(f => f.service_id === serviceId);

  if (loading) return <div className="text-sm text-gray-500 dark:text-gray-400">{t('loading')}</div>;
  if (error) return <ErrorState message={error} onRetry={load} />;

  const favServices = services.filter(s => isFavorite(s.id));

  return (
    <div>
      <PageHeader title={t('myFavorites')} subtitle={t('favoriteServices')} />

      {favServices.length > 0 && (
        <>
          <h3 className="mb-4 text-base font-bold text-gray-900 dark:text-gray-100">{t('favoriteServices')}</h3>
          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 stagger">
            {favServices.map((s) => (
              <div key={s.id} className="card-glow">
                <div className="flex items-start justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-100 dark:bg-red-900/40">
                    <Heart className="h-5 w-5 fill-red-500 text-red-500" />
                  </div>
                  <button onClick={() => toggleFavorite(s.id)} className="rounded-lg p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40">
                    <Check className="h-4 w-4" />
                  </button>
                </div>
                <h3 className="mt-3 text-base font-bold text-gray-900 dark:text-gray-100">{s.name}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{s.duration_minutes} min</p>
                <p className="mt-2 text-lg font-bold text-gray-900 dark:text-gray-100">{formatCurrency(s.price)}</p>
              </div>
            ))}
          </div>
        </>
      )}

      <h3 className="mb-4 text-base font-bold text-gray-900 dark:text-gray-100">{t('allServices')}</h3>
      {services.length === 0 ? <EmptyState icon={Scissors} title={t('noServicesAvailable')} /> : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 stagger">
          {services.map((s) => (
            <div key={s.id} className="card-glow">
              <div className="flex items-start justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gold-100 dark:bg-gold-900/40">
                  <Scissors className="h-5 w-5 text-gold-600 dark:text-gold-400" />
                </div>
                <button onClick={() => toggleFavorite(s.id)} className={`rounded-lg p-1.5 transition ${isFavorite(s.id) ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-ink-800'}`}>
                  <Heart className={`h-5 w-5 ${isFavorite(s.id) ? 'fill-red-500' : ''}`} />
                </button>
              </div>
              <h3 className="mt-3 text-base font-bold text-gray-900 dark:text-gray-100">{s.name}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{s.duration_minutes} min</p>
              <p className="mt-2 text-lg font-bold text-gray-900 dark:text-gray-100">{formatCurrency(s.price)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
