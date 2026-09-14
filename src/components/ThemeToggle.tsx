import { Sun, Moon, Languages } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { cn } from '@/lib/utils';

export function ThemeToggle({ variant = 'light' }: { variant?: 'light' | 'dark' }) {
  const { theme, toggleTheme } = useTheme();
  const { t } = useLanguage();
  const isDark = theme === 'dark';

  if (variant === 'dark') {
    return (
      <button
        onClick={toggleTheme}
        className="rounded-lg p-2 text-gray-300 hover:bg-white/10 hover:text-white transition"
        title={isDark ? t('switchToLightMode') : t('switchToDarkMode')}
      >
        {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      </button>
    );
  }

  return (
    <button
      onClick={toggleTheme}
      className={cn(
        'rounded-lg p-2 transition',
        isDark
          ? 'text-gray-300 hover:bg-ink-800 hover:text-white'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      )}
      title={isDark ? t('switchToLightMode') : t('switchToDarkMode')}
    >
      {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );
}

export function LanguageToggle({ variant = 'light' }: { variant?: 'light' | 'dark' }) {
  const { lang, toggleLang } = useLanguage();

  if (variant === 'dark') {
    return (
      <button
        onClick={toggleLang}
        className="flex items-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold text-gray-300 hover:bg-white/10 hover:text-white transition"
        title={lang === 'en' ? 'Soomaali' : 'English'}
      >
        <Languages className="h-5 w-5" />
        <span>{lang === 'en' ? 'SO' : 'EN'}</span>
      </button>
    );
  }

  return (
    <button
      onClick={toggleLang}
      className={cn(
        'flex items-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold transition',
        lang === 'en'
          ? 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-ink-800 dark:hover:text-white'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-ink-800 dark:hover:text-white'
      )}
      title={lang === 'en' ? 'Soomaali' : 'English'}
    >
      <Languages className="h-5 w-5" />
      <span>{lang === 'en' ? 'SO' : 'EN'}</span>
    </button>
  );
}

export function ToggleBar({ variant = 'light' }: { variant?: 'light' | 'dark' }) {
  return (
    <div className="flex items-center gap-1">
      <LanguageToggle variant={variant} />
      <ThemeToggle variant={variant} />
    </div>
  );
}
