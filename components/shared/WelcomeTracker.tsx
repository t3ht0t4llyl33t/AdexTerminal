'use client';

import { useEffect } from 'react';
import { trackEvent } from '@/lib/product-events';

export function WelcomeTracker() {
  useEffect(() => {
    trackEvent('welcome_visited');
  }, []);
  return null;
}
