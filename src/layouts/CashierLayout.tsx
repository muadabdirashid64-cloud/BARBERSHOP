import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ShoppingCart, Users, DollarSign, Receipt, LogOut, Menu } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useShop } from '@/context/ShopContext';
import { ToggleBar } from '@/components/ThemeToggle';
import { RefreshButton } from '@/components/RefreshButton';
import { useRefresh } from '@/context/RefreshContext';
import { cn, initials } from '@/lib/utils';
import type { TranslationKey } from '@/lib/i18n';
import type { CashierPermissions } from '@/lib/supabase';

type NavItem = { to: string; label: TranslationKey; icon: typeof LayoutDashboard; color: string; perm?: keyof CashierPermissions };

const allNavItems: NavItem[] = [
  { to: '/cashier', label: 'dashboard', icon: LayoutDashboard, color: 'bg-blue-500' },
  { to: '/cashier/pos', label: 'pointOfSale', icon: ShoppingCart, color: 'bg-gold-500', perm: 'can_use_pos' },
  { to: '/cashier/income', label: 'income', icon: DollarSign, color: 'bg-emerald-500', perm: 'can_add_income' },
  { to: '/cashier/expenses', label: 'expenses', icon: Receipt, color: 'bg-red-500', perm: 'can_add_expense' },
  { to: '/cashier/customers', label: 'customers', icon: Users, color: 'bg-green-500', perm: 'can_add_customer' },
];

const DEFAULT_LOGO = '/ChatGPT_Image_Aug_27,_2026,_07_56_43_AM.png';

export default function CashierLayout() {
  const { profile, signOut } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { refreshKey, triggerRefresh } = useRefresh();
  const { selectedShop } = useShop();
  const [mobileOpen, setMobileOpen] = useState(false);
  const shopLogo = selectedShop?.logo_url ?? DEFAULT_LOGO;
  const shopName = selectedShop?.name ?? 'Barber Shop Management System';

  const perms = profile?.permissions ?? {};
  const navItems = allNavItems.filter(item => !item.perm || perms[item.perm] !== false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const SidebarContent = () => (
    <div className="flex h-full flex-col bg-ink-950">
      <div className="flex items-center gap-3 px-6 py-6">
        <img src={shopLogo} alt={shopName} className="h-10 w-10 rounded-xl object-contain" />
        <div>
          <h1 className="text-sm font-bold leading-tight text-white">{shopName}</h1>
          <p className="text-xs text-gray-400">{t('cashierPanel')}</p>
        </div>
      </div>

      <div className="mx-4 mb-4 flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
        </span>
        <span className="text-xs font-medium text-gray-300">{t('systemOnline')}</span>
      </div>

      <nav className="flex-1 space-y-1 px-4 py-2 scrollbar-thin">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/cashier'}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) => cn('sidebar-link', isActive ? 'sidebar-link-active' : 'sidebar-link-inactive')}
          >
            <span className={cn('flex h-8 w-8 items-center justify-center rounded-lg', item.color)}>
              <item.icon className="h-4 w-4 text-white" />
            </span>
            <span>{t(item.label)}</span>
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-white/5 p-4">
        <div className="flex items-center gap-3 rounded-xl bg-white/5 p-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-gold-400 to-gold-600 text-sm font-bold text-ink-950">
            {initials(profile?.full_name ?? 'C')}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">{profile?.full_name}</p>
            <p className="truncate text-xs text-gray-400">{t('cashier')}</p>
          </div>
          <button onClick={handleSignOut} className="rounded-lg p-1.5 text-gray-400 hover:bg-white/10 hover:text-white">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-ink-950">
      <aside className="hidden w-64 flex-shrink-0 lg:block"><SidebarContent /></aside>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink-950/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-64 animate-slide-in-right"><SidebarContent /></aside>
        </div>
      )}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="topbar">
          <div className="topbar-brand">
            <button onClick={() => setMobileOpen(true)} className="rounded-lg p-1.5 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-ink-800 lg:hidden"><Menu className="h-5 w-5" /></button>
            <div className="topbar-brand-icon overflow-hidden rounded-lg bg-white"><img src={shopLogo} alt={shopName} className="h-full w-full object-contain" /></div>
            <span className="topbar-brand-text hidden sm:block">{shopName}</span>
          </div>
          <div className="flex items-center gap-2">
            <RefreshButton onRefresh={triggerRefresh} />
            <ToggleBar />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="mx-auto max-w-7xl p-6 lg:p-8"><Outlet key={refreshKey} /></div>
        </main>
      </div>
    </div>
  );
}
