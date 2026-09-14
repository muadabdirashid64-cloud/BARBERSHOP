import { useEffect, useState } from 'react';
import { Users, Phone, Mail } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Customer } from '@/lib/supabase';
import { PageHeader, EmptyState, ErrorState } from '@/components/ui';
import { formatDate, initials } from '@/lib/utils';
import { useLanguage } from '@/context/LanguageContext';

export default function BarberCustomers() {
  const { t } = useLanguage();
  const [items, setItems] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('customers').select('*').order('created_at', { ascending: false });
    if (error) setError(error.message);
    else setItems(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  if (loading) return <div className="text-sm text-gray-500 dark:text-gray-400">{t('loading')}</div>;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div>
      <PageHeader title={t('customers')} subtitle={t('customerList')} />

      {items.length === 0 ? <EmptyState icon={Users} title={t('noCustomers')} message={t('addFirstCustomer')} /> : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 stagger">
          {items.map((c) => (
            <div key={c.id} className="card">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-gold-400 to-gold-600 text-sm font-bold text-ink-950">
                  {initials(c.full_name ?? 'C')}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-gray-900 dark:text-gray-100">{c.full_name}</p>
                  <p className="truncate text-xs text-gray-500 dark:text-gray-400">{t('customerSince')} {formatDate(c.created_at)}</p>
                </div>
              </div>
              <div className="mt-4 space-y-2 text-sm">
                {c.phone && (
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <span>{c.phone}</span>
                  </div>
                )}
                {c.email && (
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <span className="truncate">{c.email}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
