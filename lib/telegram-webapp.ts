'use client';

type HapticStyle = 'light' | 'medium' | 'heavy' | 'rigid' | 'soft';
type NotificationType = 'error' | 'success' | 'warning';

interface TelegramWebApp {
  initData?: string;
  ready?: () => void;
  expand?: () => void;
  themeParams?: {
    bg_color?: string;
    text_color?: string;
    hint_color?: string;
    link_color?: string;
    button_color?: string;
    button_text_color?: string;
    secondary_bg_color?: string;
  };
  colorScheme?: 'light' | 'dark';
  setHeaderColor?: (color: string) => void;
  setBackgroundColor?: (color: string) => void;
  HapticFeedback?: {
    impactOccurred?: (style: HapticStyle) => void;
    notificationOccurred?: (type: NotificationType) => void;
    selectionChanged?: () => void;
  };
}

function getWebApp(): TelegramWebApp | null {
  if (typeof window === 'undefined') return null;
  const tg = (window as unknown as { Telegram?: { WebApp?: TelegramWebApp } }).Telegram;
  return tg?.WebApp ?? null;
}

export function initTelegramWebApp(): void {
  const wa = getWebApp();
  if (!wa) return;
  try {
    wa.ready?.();
    wa.expand?.();
    wa.setHeaderColor?.('#0B0B0F');
    wa.setBackgroundColor?.('#0B0B0F');
  } catch {
    // best-effort — outside Telegram this is a no-op
  }
}

export function hapticImpact(style: HapticStyle = 'light'): void {
  const wa = getWebApp();
  wa?.HapticFeedback?.impactOccurred?.(style);
}

export function hapticSelection(): void {
  const wa = getWebApp();
  wa?.HapticFeedback?.selectionChanged?.();
}

export function hapticNotify(type: NotificationType): void {
  const wa = getWebApp();
  wa?.HapticFeedback?.notificationOccurred?.(type);
}

export function isInsideTelegram(): boolean {
  const wa = getWebApp();
  return !!(wa?.initData && wa.initData.length > 0);
}
