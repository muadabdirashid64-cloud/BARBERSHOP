import { ReactNode } from 'react';
import { Loader2, Inbox, AlertCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export function PageLoader() {
  return (
    <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-ink-950">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-gold-500" />
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
      </div>
    </div>
  );
}

export function EmptyState({ icon: Icon = Inbox, title, message, action }: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  message?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white py-16 px-6 text-center dark:border-ink-700 dark:bg-ink-900">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-50 dark:bg-ink-800">
        <Icon className="h-7 w-7 text-gray-400 dark:text-gray-500" />
      </div>
      <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
      {message && <p className="mt-1 max-w-sm text-sm text-gray-500 dark:text-gray-400">{message}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-red-100 bg-red-50 py-16 px-6 text-center dark:border-red-900/50 dark:bg-red-950/30">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100 dark:bg-red-900/40">
        <AlertCircle className="h-7 w-7 text-red-500 dark:text-red-400" />
      </div>
      <h3 className="text-base font-semibold text-red-900 dark:text-red-300">Something went wrong</h3>
      <p className="mt-1 max-w-sm text-sm text-red-600 dark:text-red-400">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-secondary mt-5">Try again</button>
      )}
    </div>
  );
}

export function Modal({ open, onClose, title, children, size = 'md' }: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}) {
  if (!open) return null;
  const sizes = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl' };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink-950/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className={cn('relative w-full rounded-2xl bg-white shadow-2xl animate-scale-in dark:bg-ink-900 dark:border dark:border-ink-700', sizes[size])}>
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-ink-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-ink-800 dark:hover:text-gray-200">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-6 py-5 scrollbar-thin">{children}</div>
      </div>
    </div>
  );
}

export function StatCard({ label, value, icon: Icon, iconColor, trend }: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  trend?: string;
}) {
  return (
    <div className="card-glow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>
          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
          {trend && <p className="mt-1 text-xs font-medium text-green-600 dark:text-green-400">{trend}</p>}
        </div>
        <div className={cn('flex h-11 w-11 items-center justify-center rounded-xl', iconColor)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

export function Badge({ color = 'gray', children }: { color?: 'gold' | 'green' | 'red' | 'blue' | 'gray'; children: ReactNode }) {
  const colors = {
    gold: 'badge-gold',
    green: 'badge-green',
    red: 'badge-red',
    blue: 'badge-blue',
    gray: 'badge-gray',
  };
  return <span className={colors[color]}>{children}</span>;
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
