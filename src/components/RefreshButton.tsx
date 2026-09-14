import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

export function RefreshButton({ onRefresh }: { onRefresh: () => void }) {
  const { t } = useLanguage();
  const [spinning, setSpinning] = useState(false);

  const handleClick = () => {
    setSpinning(true);
    onRefresh();
    window.setTimeout(() => setSpinning(false), 600);
  };

  return (
    <button
      onClick={handleClick}
      title={t('refresh')}
      aria-label={t('refresh')}
      className="group flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 shadow-sm transition-all hover:border-gold-300 hover:bg-gold-50 hover:text-gold-700 dark:border-ink-700 dark:bg-ink-800 dark:text-gray-300 dark:hover:border-gold-500/40 dark:hover:bg-gold-500/10 dark:hover:text-gold-300"
    >
      <RefreshCw className={`h-4 w-4 ${spinning ? 'animate-spin' : 'transition-transform group-hover:rotate-180'}`} />
      <span className="hidden sm:inline">{t('refresh')}</span>
    </button>
  );
}
