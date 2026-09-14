import { useEffect, useState } from 'react';
import { ShoppingCart, Plus, Minus, Trash2, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Service } from '@/lib/supabase';
import { PageHeader, EmptyState, ErrorState } from '@/components/ui';
import { formatCurrency } from '@/lib/utils';
import { useLanguage } from '@/context/LanguageContext';

interface CartItem { service: Service; qty: number }

export default function POS() {
  const { t } = useLanguage();
  const [services, setServices] = useState<Service[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('services').select('*').eq('is_active', true).order('name');
    if (error) setError(error.message); else setServices(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const addToCart = (s: Service) => {
    setCart(prev => {
      const existing = prev.find(c => c.service.id === s.id);
      if (existing) return prev.map(c => c.service.id === s.id ? { ...c, qty: c.qty + 1 } : c);
      return [...prev, { service: s, qty: 1 }];
    });
  };

  const updateQty = (id: string, delta: number) => {
    setCart(prev => prev.map(c => c.service.id === id ? { ...c, qty: Math.max(0, c.qty + delta) } : c).filter(c => c.qty > 0));
  };

  const removeFromCart = (id: string) => setCart(prev => prev.filter(c => c.service.id !== id));
  const total = cart.reduce((s, c) => s + Number(c.service.price) * c.qty, 0);

  const checkout = async () => {
    setProcessing(true);
    const records = cart.map(c => ({ source: 'haircut' as const, amount: Number(c.service.price) * c.qty, description: `${c.service.name} x${c.qty}`, payment_method: paymentMethod, transaction_date: new Date().toISOString().split('T')[0] }));
    await supabase.from('revenue').insert(records);
    setProcessing(false); setSuccess(true); setCart([]);
    setTimeout(() => setSuccess(false), 3000);
  };

  if (loading) return <div className="text-sm text-gray-500 dark:text-gray-400">{t('loading')}</div>;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div>
      <PageHeader title={t('pointOfSale')} subtitle={t('processTransactions')} />

      {success && (
        <div className="mb-4 flex items-center gap-2 rounded-xl bg-green-50 px-4 py-3 text-sm font-medium text-green-700 border border-green-200 dark:bg-green-950/40 dark:text-green-400 dark:border-green-900">
          <Check className="h-4 w-4" /> {t('transactionCompleted')}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h3 className="mb-4 text-base font-bold text-gray-900 dark:text-gray-100">{t('services')}</h3>
          {services.length === 0 ? <EmptyState icon={ShoppingCart} title={t('noServicesAvailable')} /> : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 stagger">
              {services.map((s) => (
                <button key={s.id} onClick={() => addToCart(s)} className="card-glow text-left">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold-100 dark:bg-gold-900/40">
                    <ShoppingCart className="h-5 w-5 text-gold-600 dark:text-gold-400" />
                  </div>
                  <h4 className="mt-2 text-sm font-bold text-gray-900 dark:text-gray-100">{s.name}</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{s.duration_minutes} min</p>
                  <p className="mt-2 text-lg font-bold text-gray-900 dark:text-gray-100">{formatCurrency(s.price)}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="card flex flex-col" style={{ maxHeight: '70vh' }}>
          <h3 className="mb-4 text-base font-bold text-gray-900 dark:text-gray-100">{t('cart')}</h3>
          {cart.length === 0 ? (
            <div className="flex flex-1 items-center justify-center py-8 text-sm text-gray-400 dark:text-gray-500">{t('cartIsEmpty')}</div>
          ) : (
            <>
              <div className="flex-1 space-y-2 overflow-y-auto scrollbar-thin">
                {cart.map((c) => (
                  <div key={c.service.id} className="flex items-center gap-2 rounded-xl border border-gray-100 p-2 dark:border-ink-700">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">{c.service.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{formatCurrency(c.service.price)} {t('each')}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => updateQty(c.service.id, -1)} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-ink-800"><Minus className="h-4 w-4" /></button>
                      <span className="w-6 text-center text-sm font-medium text-gray-900 dark:text-gray-100">{c.qty}</span>
                      <button onClick={() => updateQty(c.service.id, 1)} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-ink-800"><Plus className="h-4 w-4" /></button>
                      <button onClick={() => removeFromCart(c.service.id)} className="rounded-lg p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 space-y-3 border-t border-gray-100 pt-4 dark:border-ink-700">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">{t('totalExpenses')}</span>
                  <span className="text-xl font-bold text-gray-900 dark:text-gray-100">{formatCurrency(total)}</span>
                </div>
                <div>
                  <label className="label">{t('paymentMethod')}</label>
                  <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="input">
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="mobile">Mobile</option>
                  </select>
                </div>
                <button onClick={checkout} disabled={processing || cart.length === 0} className="btn-primary w-full">
                  {processing ? t('processing') : `${t('checkout')} · ${formatCurrency(total)}`}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
