import { useEffect, useState } from 'react';
import { Save, Store } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { ShopSettings } from '@/lib/supabase';
import { PageHeader, ErrorState } from '@/components/ui';
import { useLanguage } from '@/context/LanguageContext';

export default function Settings() {
  const { t } = useLanguage();
  const [settings, setSettings] = useState<ShopSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('shop_settings').select('*').limit(1).maybeSingle();
    if (error) setError(error.message);
    else if (data) {
      setSettings(data);
      setForm({ shop_name: data.shop_name, shop_address: data.shop_address ?? '', shop_phone: data.shop_phone ?? '', shop_email: data.shop_email ?? '', opening_time: data.opening_time ?? '09:00', closing_time: data.closing_time ?? '21:00', currency: data.currency ?? 'USD', tax_rate: String(data.tax_rate ?? 0) });
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = { shop_name: form.shop_name, shop_address: form.shop_address || null, shop_phone: form.shop_phone || null, shop_email: form.shop_email || null, opening_time: form.opening_time, closing_time: form.closing_time, currency: form.currency, tax_rate: Number(form.tax_rate) };
    if (settings) await supabase.from('shop_settings').update(payload).eq('id', settings.id);
    else await supabase.from('shop_settings').insert(payload);
    setSaving(false); load();
  };

  if (loading) return <div className="text-sm text-gray-500 dark:text-gray-400">{t('loading')}</div>;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div>
      <PageHeader title={t('settings')} subtitle={t('configureShop')} />

      <form onSubmit={save} className="card max-w-2xl">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gold-100 dark:bg-gold-900/40">
            <Store className="h-5 w-5 text-gold-600 dark:text-gold-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">{t('shopInformation')}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('basicDetails')}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div><label className="label">{t('shopName')}</label><input required value={form.shop_name ?? ''} onChange={(e) => setForm({ ...form, shop_name: e.target.value })} className="input" /></div>
          <div><label className="label">{t('shopAddress')}</label><input value={form.shop_address ?? ''} onChange={(e) => setForm({ ...form, shop_address: e.target.value })} className="input" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">{t('shopPhone')}</label><input value={form.shop_phone ?? ''} onChange={(e) => setForm({ ...form, shop_phone: e.target.value })} className="input" /></div>
            <div><label className="label">{t('shopEmail')}</label><input type="email" value={form.shop_email ?? ''} onChange={(e) => setForm({ ...form, shop_email: e.target.value })} className="input" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">{t('openingTime')}</label><input type="time" value={form.opening_time ?? ''} onChange={(e) => setForm({ ...form, opening_time: e.target.value })} className="input" /></div>
            <div><label className="label">{t('closingTime')}</label><input type="time" value={form.closing_time ?? ''} onChange={(e) => setForm({ ...form, closing_time: e.target.value })} className="input" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">{t('currency')}</label><input value={form.currency ?? ''} onChange={(e) => setForm({ ...form, currency: e.target.value })} className="input" /></div>
            <div><label className="label">{t('taxRate')}</label><input type="number" value={form.tax_rate ?? ''} onChange={(e) => setForm({ ...form, tax_rate: e.target.value })} className="input" /></div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button type="submit" disabled={saving} className="btn-primary"><Save className="h-4 w-4" /> {saving ? t('saving') : t('saveSettings')}</button>
        </div>
      </form>
    </div>
  );
}
