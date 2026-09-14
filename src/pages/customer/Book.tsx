import { useEffect, useState } from 'react';
import { Calendar, Scissors, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Service } from '@/lib/supabase';
import { PageHeader, EmptyState, ErrorState } from '@/components/ui';
import { formatCurrency } from '@/lib/utils';
import { useLanguage } from '@/context/LanguageContext';

export default function Book() {
  const { t } = useLanguage();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('10:00');
  const [booking, setBooking] = useState(false);
  const [success, setSuccess] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('services').select('*').eq('is_active', true).order('name');
    if (error) setError(error.message); else setServices(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const book = async () => {
    if (!selected) return;
    setBooking(true);
    const svc = services.find(s => s.id === selected);
    await supabase.from('home_services').insert({ service_id: selected, service_type: svc?.name ?? 'service', customer_name: 'Customer', phone_number: '', address: 'In-shop', appointment_date: date, appointment_time: time, status: 'pending', total_amount: Number(svc?.price ?? 0) });
    setBooking(false); setSuccess(true); setSelected(null);
    setTimeout(() => setSuccess(false), 3000);
  };

  if (loading) return <div className="text-sm text-gray-500 dark:text-gray-400">{t('loading')}</div>;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div>
      <PageHeader title={t('bookAppointment')} subtitle={t('bookNextAppointment')} />

      {success && (
        <div className="mb-4 flex items-center gap-2 rounded-xl bg-green-50 px-4 py-3 text-sm font-medium text-green-700 border border-green-200 dark:bg-green-950/40 dark:text-green-400 dark:border-green-900">
          <Check className="h-4 w-4" /> {t('appointmentBooked')}
        </div>
      )}

      {services.length === 0 ? <EmptyState icon={Scissors} title={t('noServicesAvailable')} /> : (
        <>
          <h3 className="mb-4 text-base font-bold text-gray-900 dark:text-gray-100">{t('selectService')}</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 stagger">
            {services.map((s) => (
              <button key={s.id} onClick={() => setSelected(s.id)} className={`card-glow text-left transition ${selected === s.id ? 'ring-2 ring-gold-400' : ''}`}>
                <div className="flex items-start justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gold-100 dark:bg-gold-900/40">
                    <Scissors className="h-5 w-5 text-gold-600 dark:text-gold-400" />
                  </div>
                  {selected === s.id && <Check className="h-5 w-5 text-gold-500" />}
                </div>
                <h3 className="mt-3 text-base font-bold text-gray-900 dark:text-gray-100">{s.name}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{s.description ?? s.duration_minutes + ' min'}</p>
                <p className="mt-2 text-lg font-bold text-gray-900 dark:text-gray-100">{formatCurrency(s.price)}</p>
              </button>
            ))}
          </div>

          {selected && (
            <div className="mt-6 card animate-fade-in">
              <h3 className="mb-4 text-base font-bold text-gray-900 dark:text-gray-100">{t('pickDateTime')}</h3>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">{t('appointmentDate')}</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input" /></div>
                <div><label className="label">{t('appointmentTime')}</label><input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="input" /></div>
              </div>
              <div className="mt-4 flex justify-end">
                <button onClick={book} disabled={booking} className="btn-primary"><Calendar className="h-4 w-4" /> {booking ? t('booking') : t('confirmBooking')}</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
