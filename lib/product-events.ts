'use client';

import { getInitData } from '@/lib/telegram-webapp';

type EventName =
  | 'app_opened'
  | 'tab_switched'
  | 'scan_started'
  | 'scan_completed'
  | 'paywall_shown'
  | 'paywall_dismissed'
  | 'pro_upgrade_started'
  | 'pro_upgrade_completed'
  | 'watchlist_added'
  | 'watchlist_removed'
  | 'watchlist_viewed'
  | 'digest_opened'
  | 'referral_shared'
  | 'referral_claimed'
  | 'welcome_visited'
  | 'onboarding_shown'
  | 'onboarding_step_shown'
  | 'onboarding_skipped'
  | 'onboarding_completed';

export function trackEvent(
  event: EventName,
  props?: Record<string, string | number | boolean>,
  _telegramUserId?: string | null,
): void {
  if (typeof window === 'undefined') return;
  try {
    const initData = getInitData();
    const body = JSON.stringify({
      event_name: event,
      init_data: initData || undefined,
      props: props || {},
    });
    const url = '/api/track';
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: 'application/json' });
      navigator.sendBeacon(url, blob);
      return;
    }
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    // best-effort — tracking never breaks the app
  }
}
