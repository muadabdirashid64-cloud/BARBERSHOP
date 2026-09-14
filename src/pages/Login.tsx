import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ArrowLeft, User } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { ToggleBar } from '@/components/ThemeToggle';
import { supabase } from '@/lib/supabase';
import type { UserRole, Profile } from '@/lib/supabase';

const roleHome: Record<UserRole, string> = {
  super_admin: '/super-admin',
  admin: '/admin',
  cashier: '/cashier',
  barber: '/barber',
  customer: '/customer',
};

export default function Login() {
  const { signIn, resetPassword } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [loginInput, setLoginInput] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'login' | 'forgot'>('login');
  const [resetSent, setResetSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Determine if the input is an email or a username
    let loginEmail = loginInput.trim();
    if (!loginEmail.includes('@')) {
      // It's a username — look up the email
      const { data: emailResult } = await supabase.rpc('get_email_by_username', { p_username: loginEmail });
      if (!emailResult) {
        setError(t('invalidCredentials'));
        setLoading(false);
        return;
      }
      loginEmail = emailResult;
    }

    const { error } = await signIn(loginEmail, password);
    if (error) { setError(error); setLoading(false); return; }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setError('Session not established'); setLoading(false); return; }

    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .maybeSingle();

    const profile = profileData as Profile | null;
    if (!profile) {
      setError('Profile not found. Please contact an administrator.');
      await supabase.auth.signOut();
      setLoading(false);
      return;
    }
    if (!profile.is_active) {
      setError(t('accountDisabled'));
      await supabase.auth.signOut();
      setLoading(false);
      return;
    }

    // Check if the user's shop is active (non-super_admin only)
    if (profile.role !== 'super_admin' && profile.shop_id) {
      const { data: shop } = await supabase
        .from('barber_shops')
        .select('status')
        .eq('id', profile.shop_id)
        .maybeSingle();
      if (shop && shop.status !== 'active') {
        setError(t('shopInactive'));
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }
    }

    navigate(roleHome[profile.role], { replace: true });
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await resetPassword(loginInput);
    setLoading(false);
    if (error) { setError(error); return; }
    setResetSent(true);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-950 p-4">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-gold-500/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />
      </div>

      <div className="absolute right-4 top-4">
        <ToggleBar variant="dark" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="mb-8 text-center">
          <img src="/ChatGPT_Image_Aug_27,_2026,_07_56_43_AM.png" alt="Barber Shop Management System" className="mx-auto mb-4 h-24 w-24 rounded-2xl object-contain" />
          <h1 className="text-2xl font-bold text-white">
            {mode === 'forgot' ? t('resetPassword') : 'Barber Shop Management System'}
          </h1>
          <p className="mt-1 text-sm text-gray-400">
            {mode === 'forgot' ? t('resetPasswordSubtitle') : t('signInToAccount')}
          </p>
        </div>

        <form onSubmit={mode === 'forgot' ? handleReset : handleSubmit} className="glass rounded-2xl border border-white/10 p-6 shadow-2xl">
          {error && <div className="mb-4 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-400 border border-red-500/20">{error}</div>}

          {mode === 'forgot' ? (
            <>
              {resetSent ? (
                <div className="rounded-xl bg-green-500/10 px-4 py-3 text-sm text-green-400 border border-green-500/20">
                  {t('passwordResetSent')}
                </div>
              ) : (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-200">{t('email')}</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input type="email" value={loginInput} onChange={(e) => setLoginInput(e.target.value)} required placeholder="you@example.com" className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white placeholder-gray-500 outline-none transition focus:border-gold-400 focus:ring-2 focus:ring-gold-400/20" />
                  </div>
                </div>
              )}
              <button type="submit" disabled={loading} className="mt-6 w-full rounded-xl bg-gradient-to-b from-gold-400 to-gold-500 py-2.5 text-sm font-semibold text-ink-950 shadow-sm transition hover:from-gold-300 hover:to-gold-400 hover:shadow-glow-gold active:scale-[0.98] disabled:opacity-50">
                {loading ? t('signingIn') : t('sendResetLink')}
              </button>
              <button type="button" onClick={() => { setMode('login'); setResetSent(false); setError(null); }} className="mt-4 flex w-full items-center justify-center gap-2 text-sm text-gray-400 hover:text-gray-200">
                <ArrowLeft className="h-4 w-4" /> {t('backToLogin')}
              </button>
            </>
          ) : (
            <>
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-200">{t('emailOrUsername')}</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input value={loginInput} onChange={(e) => setLoginInput(e.target.value)} required placeholder="you@example.com / ownerA" className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white placeholder-gray-500 outline-none transition focus:border-gold-400 focus:ring-2 focus:ring-gold-400/20" />
                  </div>
                </div>
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label className="block text-sm font-medium text-gray-200">{t('password')}</label>
                    <button type="button" onClick={() => setMode('forgot')} className="text-xs font-medium text-gold-400 hover:text-gold-300">
                      {t('forgotPassword')}
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-10 text-sm text-white placeholder-gray-500 outline-none transition focus:border-gold-400 focus:ring-2 focus:ring-gold-400/20" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
                  </div>
                </div>
              </div>

              <button type="submit" disabled={loading} className="mt-6 w-full rounded-xl bg-gradient-to-b from-gold-400 to-gold-500 py-2.5 text-sm font-semibold text-ink-950 shadow-sm transition hover:from-gold-300 hover:to-gold-400 hover:shadow-glow-gold active:scale-[0.98] disabled:opacity-50">{loading ? t('signingIn') : t('login')}</button>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
