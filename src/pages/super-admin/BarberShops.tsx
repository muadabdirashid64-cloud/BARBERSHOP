import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Pencil, Store, MapPin, Phone, Building2, User, Mail,
  Loader2, KeyRound, Power, PowerOff, Eye, EyeOff, Check, AlertCircle,
  ImagePlus, X,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { BarberShop, BarberShopWithOwner, ShopOwner } from '@/lib/supabase';
import { PageHeader, Modal, EmptyState, ErrorState, Badge } from '@/components/ui';
import { useLanguage } from '@/context/LanguageContext';
import { useShop } from '@/context/ShopContext';
import { useAuth } from '@/context/AuthContext';
import { cn, formatDate } from '@/lib/utils';

const emptyForm = {
  shop_name: '', location: '', shop_phone: '', address: '', shop_status: 'active',
  owner_name: '', username: '', email: '', phone: '', password: '', confirm_password: '',
};
const emptyEdit = { name: '', location: '', phone: '', address: '', status: 'active' };

const DEFAULT_LOGO = '/ChatGPT_Image_Aug_27,_2026,_07_56_43_AM.png';

async function uploadShopLogo(file: File, shopId: string): Promise<string | null> {
  const ext = file.name.split('.').pop() || 'png';
  const filePath = `${shopId}/logo-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from('shop-logos').upload(filePath, file, { upsert: true });
  if (error) return null;
  const { data } = supabase.storage.from('shop-logos').getPublicUrl(filePath);
  return data?.publicUrl ?? null;
}

export default function BarberShops() {
  const { t } = useLanguage();
  const { session } = useAuth();
  const { refreshShops, setSelectedShopId } = useShop();
  const navigate = useNavigate();
  const [shops, setShops] = useState<BarberShopWithOwner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<BarberShopWithOwner | null>(null);
  const [form, setForm] = useState<Record<string, string>>(emptyForm);
  const [editForm, setEditForm] = useState<Record<string, string>>(emptyEdit);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [editLogoFile, setEditLogoFile] = useState<File | null>(null);
  const [editLogoPreview, setEditLogoPreview] = useState<string | null>(null);

  // Password reset state
  const [resetOpen, setResetOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState<ShopOwner | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [resetConfirm, setResetConfirm] = useState('');
  const [resetSaving, setResetSaving] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('barber_shops').select('*').order('created_at', { ascending: false });
    if (error) { setError(error.message); setLoading(false); return; }

    // Fetch owner profiles for each shop
    const shopIds = (data ?? []).map((s: BarberShop) => s.id);
    let owners: ShopOwner[] = [];
    if (shopIds.length > 0) {
      const { data: ownerData } = await supabase
        .from('profiles')
        .select('id, full_name, username, email, phone, is_active, shop_id, role')
        .in('shop_id', shopIds)
        .eq('role', 'admin');
      owners = (ownerData ?? []) as unknown as ShopOwner[];
    }

    const shopsWithOwners: BarberShopWithOwner[] = (data ?? []).map((shop: BarberShop) => ({
      ...shop,
      owner: owners.find((o) => o.shop_id === shop.id) ?? null,
    }));

    setShops(shopsWithOwners);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // Username uniqueness check (debounced)
  useEffect(() => {
    if (!form.username || form.username.length < 3) { setUsernameError(null); return; }
    const timer = setTimeout(async () => {
      setCheckingUsername(true);
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', form.username)
        .maybeSingle();
      if (data) setUsernameError(t('usernameTaken'));
      else setUsernameError(null);
      setCheckingUsername(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [form.username]);

  const openNew = () => {
    setForm(emptyForm);
    setUsernameError(null);
    setShowPassword(false);
    setShowConfirm(false);
    setSuccessMsg(null);
    setError(null);
    setLogoFile(null);
    setLogoPreview(null);
    setOpen(true);
  };

  const openEdit = (s: BarberShopWithOwner) => {
    setEditing(s);
    setEditForm({ name: s.name, location: s.location ?? '', phone: s.phone ?? '', address: s.address ?? '', status: s.status });
    setEditLogoFile(null);
    setEditLogoPreview(s.logo_url ?? null);
    setEditOpen(true);
  };

  const saveShop = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccessMsg(null);

    if (form.password !== form.confirm_password) {
      setError(t('passwordsDoNotMatch'));
      setSaving(false);
      return;
    }

    if (usernameError) {
      setError(usernameError);
      setSaving(false);
      return;
    }

    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-shop-admin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          shop_name: form.shop_name,
          location: form.location || undefined,
          shop_phone: form.shop_phone || undefined,
          address: form.address || undefined,
          shop_status: form.shop_status,
          owner_name: form.owner_name,
          username: form.username,
          email: form.email,
          phone: form.phone || undefined,
          password: form.password,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setError(data.error || `Failed to create (HTTP ${resp.status})`);
        setSaving(false);
        return;
      }
      // Upload logo if one was selected
      if (logoFile && data.shop_id) {
        const logoUrl = await uploadShopLogo(logoFile, data.shop_id);
        if (logoUrl) {
          await supabase.from('barber_shops').update({ logo_url: logoUrl }).eq('id', data.shop_id);
        }
      }
      setSuccessMsg(t('shopAndAdminCreated'));
      await refreshShops();
      await load();
      setSaving(false);
      setTimeout(() => { setOpen(false); setSuccessMsg(null); }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
      setSaving(false);
    }
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    // Upload new logo if one was selected
    let newLogoUrl: string | null = null;
    if (editLogoFile) {
      newLogoUrl = await uploadShopLogo(editLogoFile, editing.id);
    }
    const updateData: Record<string, string | null> = {
      name: editForm.name,
      location: editForm.location || null,
      phone: editForm.phone || null,
      address: editForm.address || null,
    };
    if (newLogoUrl) updateData.logo_url = newLogoUrl;
    const { error } = await supabase.from('barber_shops').update(updateData).eq('id', editing.id);
    if (error) { setError(error.message); setSaving(false); return; }
    // If status changed, use the RPC to cascade owner activation
    if (editForm.status !== editing.status) {
      await supabase.rpc('set_shop_status', { p_shop_id: editing.id, p_new_status: editForm.status });
    }
    await supabase.rpc('log_audit', {
      p_user_id: session?.user.id ?? null,
      p_action: 'barber_shop_updated',
      p_table_name: 'barber_shops',
      p_record_id: editing.id,
      p_new_values: { name: editForm.name, status: editForm.status } as any,
      p_shop_id: editing.id,
    });
    await refreshShops();
    await load();
    setEditOpen(false);
    setSaving(false);
  };

  const toggleShopStatus = async (shop: BarberShopWithOwner) => {
    const newStatus = shop.status === 'active' ? 'inactive' : 'active';
    const { error: toggleErr } = await supabase.rpc('set_shop_status', { p_shop_id: shop.id, p_new_status: newStatus });
    if (toggleErr) { setError(toggleErr.message); return; }
    await supabase.rpc('log_audit', {
      p_user_id: session?.user.id ?? null,
      p_action: newStatus === 'active' ? 'shop_activated' : 'shop_deactivated',
      p_table_name: 'barber_shops',
      p_record_id: shop.id,
      p_new_values: { shop_name: shop.name, status: newStatus } as any,
      p_shop_id: shop.id,
    });
    await refreshShops();
    load();
  };

  const toggleOwnerStatus = async (owner: ShopOwner) => {
    const { error: toggleErr } = await supabase.rpc('toggle_owner_active', { p_target_user_id: owner.id });
    if (toggleErr) { setError(toggleErr.message); return; }
    await supabase.rpc('log_audit', {
      p_user_id: session?.user.id ?? null,
      p_action: owner.is_active ? 'owner_account_disabled' : 'owner_account_enabled',
      p_table_name: 'profiles',
      p_record_id: owner.id,
      p_new_values: { username: owner.username, is_active: !owner.is_active } as any,
      p_shop_id: owner.shop_id,
    });
    load();
  };

  const openReset = (owner: ShopOwner) => {
    setResetTarget(owner);
    setResetPassword('');
    setResetConfirm('');
    setResetError(null);
    setResetSuccess(false);
    setShowResetPassword(false);
    setResetOpen(true);
  };

  const doReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTarget) return;
    if (resetPassword !== resetConfirm) { setResetError(t('passwordsDoNotMatch')); return; }
    if (resetPassword.length < 6) { setResetError(t('passwordTooShort')); return; }
    setResetSaving(true);
    setResetError(null);
    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reset-owner-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ user_id: resetTarget.id, new_password: resetPassword }),
      });
      const data = await resp.json();
      if (!resp.ok) { setResetError(data.error || 'Failed to reset password'); setResetSaving(false); return; }
      setResetSuccess(true);
      setResetSaving(false);
    } catch (err) {
      setResetError(err instanceof Error ? err.message : 'Network error');
      setResetSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title={t('barberShops')}
        subtitle={t('manageBarberShops')}
        action={<button onClick={openNew} className="btn-primary"><Plus className="h-4 w-4" /> {t('addBarberShop')}</button>}
      />

      {successMsg && (
        <div className="mb-4 flex items-center gap-2 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700 border border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">
          <Check className="h-4 w-4" /> {successMsg}
        </div>
      )}

      {loading ? <div className="text-sm text-gray-500 dark:text-gray-400">{t('loading')}</div> :
       error ? <ErrorState message={error} onRetry={load} /> :
       shops.length === 0 ? <EmptyState icon={Store} title={t('noBarberShops')} message={t('addFirstShop')} action={<button onClick={openNew} className="btn-primary"><Plus className="h-4 w-4" /> {t('addBarberShop')}</button>} /> : (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="table-header">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">{t('shopName')}</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">{t('ownerName')}</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">{t('username')}</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">{t('email')}</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">{t('phone')}</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">{t('location')}</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">{t('status')}</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">{t('createdDate')}</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-600 dark:text-gray-300">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-ink-700">
                {shops.map((s) => (
                  <tr key={s.id} className="table-row">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {s.logo_url ? (
                          <img src={s.logo_url} alt={s.name} className="h-8 w-8 rounded-lg object-cover" />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold-100 dark:bg-gold-900/40">
                            <Store className="h-4 w-4 text-gold-600 dark:text-gold-400" />
                          </div>
                        )}
                        <span className="font-medium text-gray-900 dark:text-gray-100">{s.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{s.owner?.full_name ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{s.owner?.username ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{s.owner?.email ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{s.phone ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{s.location ?? '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <Badge color={s.status === 'active' ? 'green' : 'gray'}>{s.status === 'active' ? t('active') : t('inactive')}</Badge>
                        {s.owner && (
                          <Badge color={s.owner.is_active ? 'green' : 'red'}>{s.owner.is_active ? t('enabled') : t('disabled')}</Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{formatDate(s.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => { setSelectedShopId(s.id); navigate('/super-admin/manage'); }} title={t('manageShop')} className="rounded-lg bg-gold-50 px-2 py-1.5 text-xs font-medium text-gold-700 hover:bg-gold-100 dark:bg-gold-900/30 dark:text-gold-400 dark:hover:bg-gold-900/50">{t('manageShop')}</button>
                        <button onClick={() => openEdit(s)} title={t('edit')} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-ink-800 dark:hover:text-gray-200"><Pencil className="h-4 w-4" /></button>
                        {s.owner && (
                          <>
                            <button onClick={() => openReset(s.owner!)} title={t('resetPassword')} className="rounded-lg p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950/40 dark:hover:text-blue-400"><KeyRound className="h-4 w-4" /></button>
                            <button onClick={() => toggleOwnerStatus(s.owner!)} title={s.owner!.is_active ? t('disableOwner') : t('enableOwner')} className={cn('rounded-lg p-1.5', s.owner!.is_active ? 'text-gray-400 hover:bg-orange-50 hover:text-orange-600 dark:hover:bg-orange-950/40 dark:hover:text-orange-400' : 'text-gray-400 hover:bg-green-50 hover:text-green-600 dark:hover:bg-green-950/40 dark:hover:text-green-400')}>
                              {s.owner!.is_active ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                            </button>
                          </>
                        )}
                        <button onClick={() => toggleShopStatus(s)} title={s.status === 'active' ? t('deactivate') : t('activate')} className={cn('rounded-lg p-1.5', s.status === 'active' ? 'text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400' : 'text-gray-400 hover:bg-green-50 hover:text-green-600 dark:hover:bg-green-950/40 dark:hover:text-green-400')}>
                          {s.status === 'active' ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Barber Shop + Owner Modal */}
      <Modal open={open} onClose={() => setOpen(false)} title={t('addBarberShop')} size="lg">
        <form onSubmit={saveShop} className="space-y-4">
          {error && <div className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800"><AlertCircle className="h-4 w-4 flex-shrink-0" /> {error}</div>}

          {/* Shop details */}
          <div className="rounded-xl border border-gray-200 p-4 dark:border-ink-700">
            <h3 className="mb-3 text-sm font-bold text-gray-900 dark:text-gray-100">{t('shopDetails')}</h3>
            <div className="space-y-3">
              <div><label className="label">{t('shopName')}</label><input required value={form.shop_name} onChange={(e) => setForm({ ...form, shop_name: e.target.value })} className="input" /></div>
              {/* Logo upload */}
              <div>
                <label className="label">{t('shopLogo')}</label>
                <div className="flex items-center gap-3">
                  {logoPreview ? (
                    <div className="relative">
                      <img src={logoPreview} alt="Logo preview" className="h-16 w-16 rounded-xl object-cover" />
                      <button type="button" onClick={() => { setLogoFile(null); setLogoPreview(null); }} className="absolute -right-1 -top-1 rounded-full bg-red-500 p-0.5 text-white"><X className="h-3 w-3" /></button>
                    </div>
                  ) : (
                    <label className="flex h-16 w-16 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-gray-300 hover:border-gold-400 dark:border-ink-600 dark:hover:border-gold-500">
                      <ImagePlus className="h-5 w-5 text-gray-400" />
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) { setLogoFile(f); setLogoPreview(URL.createObjectURL(f)); }
                      }} />
                    </label>
                  )}
                  <p className="text-xs text-gray-500 dark:text-gray-400">{t('shopLogoHint')}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">{t('location')}</label><input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="input" /></div>
                <div><label className="label">{t('shopPhone')}</label><input value={form.shop_phone} onChange={(e) => setForm({ ...form, shop_phone: e.target.value })} className="input" /></div>
              </div>
              <div><label className="label">{t('address')}</label><input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="input" /></div>
              <div><label className="label">{t('status')}</label><select value={form.shop_status} onChange={(e) => setForm({ ...form, shop_status: e.target.value })} className="input"><option value="active">{t('active')}</option><option value="inactive">{t('inactive')}</option></select></div>
            </div>
          </div>

          {/* Owner details */}
          <div className="rounded-xl border border-gray-200 p-4 dark:border-ink-700">
            <h3 className="mb-3 text-sm font-bold text-gray-900 dark:text-gray-100">{t('ownerAccount')}</h3>
            <div className="space-y-3">
              <div><label className="label">{t('ownerFullName')}</label><input required value={form.owner_name} onChange={(e) => setForm({ ...form, owner_name: e.target.value })} className="input" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">{t('username')}</label>
                  <input required minLength={3} value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} className={cn('input', usernameError && 'border-red-400')} />
                  {checkingUsername && <p className="mt-1 text-xs text-gray-400">{t('checking')}</p>}
                  {usernameError && <p className="mt-1 text-xs text-red-500">{usernameError}</p>}
                </div>
                <div><label className="label">{t('phone')}</label><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input" /></div>
              </div>
              <div><label className="label">{t('email')}</label><input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">{t('password')}</label>
                  <div className="relative">
                    <input required type={showPassword ? 'text' : 'password'} minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="input pr-10" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
                  </div>
                </div>
                <div>
                  <label className="label">{t('confirmPassword')}</label>
                  <div className="relative">
                    <input required type={showConfirm ? 'text' : 'password'} minLength={6} value={form.confirm_password} onChange={(e) => setForm({ ...form, confirm_password: e.target.value })} className="input pr-10" />
                    <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">{showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setOpen(false)} className="btn-secondary">{t('cancel')}</button>
            <button type="submit" disabled={saving || !!usernameError || checkingUsername} className="btn-primary">
              {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> {t('saving')}</> : t('createBarberShop')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Shop Modal */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title={t('editBarberShop')} size="md">
        <form onSubmit={saveEdit} className="space-y-4">
          <div><label className="label">{t('shopName')}</label><input required value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="input" /></div>
          {/* Logo upload */}
          <div>
            <label className="label">{t('shopLogo')}</label>
            <div className="flex items-center gap-3">
              {editLogoPreview ? (
                <div className="relative">
                  <img src={editLogoPreview} alt="Logo preview" className="h-16 w-16 rounded-xl object-cover" />
                  <button type="button" onClick={() => { setEditLogoFile(null); setEditLogoPreview(null); }} className="absolute -right-1 -top-1 rounded-full bg-red-500 p-0.5 text-white"><X className="h-3 w-3" /></button>
                </div>
              ) : (
                <label className="flex h-16 w-16 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-gray-300 hover:border-gold-400 dark:border-ink-600 dark:hover:border-gold-500">
                  <ImagePlus className="h-5 w-5 text-gray-400" />
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) { setEditLogoFile(f); setEditLogoPreview(URL.createObjectURL(f)); }
                  }} />
                </label>
              )}
              <p className="text-xs text-gray-500 dark:text-gray-400">{t('shopLogoHint')}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">{t('location')}</label><input value={editForm.location} onChange={(e) => setEditForm({ ...editForm, location: e.target.value })} className="input" /></div>
            <div><label className="label">{t('phone')}</label><input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} className="input" /></div>
          </div>
          <div><label className="label">{t('address')}</label><input value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} className="input" /></div>
          <div><label className="label">{t('status')}</label><select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })} className="input"><option value="active">{t('active')}</option><option value="inactive">{t('inactive')}</option></select></div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setEditOpen(false)} className="btn-secondary">{t('cancel')}</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? <><Loader2 className="h-4 w-4 animate-spin" /> {t('saving')}</> : t('save')}</button>
          </div>
        </form>
      </Modal>

      {/* Reset Password Modal */}
      <Modal open={resetOpen} onClose={() => setResetOpen(false)} title={t('resetOwnerPassword')} size="md">
        {resetSuccess ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-xl bg-green-50 px-4 py-4 text-green-700 border border-green-200 dark:bg-green-950/40 dark:text-green-400 dark:border-green-900">
              <Check className="h-5 w-5" />
              <p className="text-sm font-medium">{t('passwordResetSuccess')}</p>
            </div>
            <button onClick={() => setResetOpen(false)} className="btn-primary w-full">{t('close')}</button>
          </div>
        ) : (
          <form onSubmit={doReset} className="space-y-4">
            {resetError && <div className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800"><AlertCircle className="h-4 w-4 flex-shrink-0" /> {resetError}</div>}
            <div className="rounded-xl bg-gray-50 p-3 dark:bg-ink-800">
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('resettingPasswordFor')}</p>
              <p className="font-semibold text-gray-900 dark:text-gray-100">{resetTarget?.full_name} ({resetTarget?.username})</p>
            </div>
            <div>
              <label className="label">{t('newPassword')}</label>
              <div className="relative">
                <input required type={showResetPassword ? 'text' : 'password'} minLength={6} value={resetPassword} onChange={(e) => setResetPassword(e.target.value)} className="input pr-10" />
                <button type="button" onClick={() => setShowResetPassword(!showResetPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">{showResetPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
              </div>
            </div>
            <div><label className="label">{t('confirmPassword')}</label><input required type={showResetPassword ? 'text' : 'password'} minLength={6} value={resetConfirm} onChange={(e) => setResetConfirm(e.target.value)} className="input" /></div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setResetOpen(false)} className="btn-secondary">{t('cancel')}</button>
              <button type="submit" disabled={resetSaving} className="btn-primary">{resetSaving ? <><Loader2 className="h-4 w-4 animate-spin" /> {t('saving')}</> : t('resetPassword')}</button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
