'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { translate, interpolate } from '@/lib/i18n';
import type { Language } from '@/lib/types';
import { authFetch } from '@/lib/api-client';
import { trackEvent } from '@/lib/product-events';

interface OnboardingOverlayProps {
  lang: Language;
  onDismiss: () => void;
  onStartScan: () => void;
}

const SLIDES = [
  {
    key: 'radar',
    illustration: '/Radar_icon.webp',
    titleKey: 'onboarding.slide1Title' as const,
    bodyKey: 'onboarding.slide1Body' as const,
    accent: 'from-emerald-500/20 to-transparent',
  },
  {
    key: 'whales',
    illustration: '/whale-violet.webp',
    titleKey: 'onboarding.slide2Title' as const,
    bodyKey: 'onboarding.slide2Body' as const,
    accent: 'from-sky-500/20 to-transparent',
  },
  {
    key: 'scanner',
    illustration: '/scanner-vault.webp',
    titleKey: 'onboarding.slide3Title' as const,
    bodyKey: 'onboarding.slide3Body' as const,
    accent: 'from-amber-500/20 to-transparent',
  },
];

export function OnboardingOverlay({ lang, onDismiss, onStartScan }: OnboardingOverlayProps) {
  const [step, setStep] = useState(0);
  const total = SLIDES.length;

  useEffect(() => {
    authFetch('/api/onboarding/state', {
      method: 'POST',
      body: JSON.stringify({ action: 'start' }),
    }).catch(() => {});
    trackEvent('onboarding_shown', { step: 1 });
  }, []);

  const persist = (action: 'advance' | 'skip' | 'complete', stepIndex?: number) => {
    authFetch('/api/onboarding/state', {
      method: 'POST',
      body: JSON.stringify({ action, step: stepIndex }),
    }).catch(() => {});
  };

  const handleSkip = () => {
    persist('skip');
    trackEvent('onboarding_skipped', { at_step: step + 1 });
    onDismiss();
  };

  const handleNext = () => {
    if (step < total - 1) {
      const nextStep = step + 1;
      setStep(nextStep);
      persist('advance', nextStep);
      trackEvent('onboarding_step_shown', { step: nextStep + 1 });
    } else {
      persist('complete');
      trackEvent('onboarding_completed', {});
      onDismiss();
    }
  };

  const handleStartScan = () => {
    persist('complete');
    trackEvent('onboarding_completed', { via: 'start_scan' });
    onStartScan();
    onDismiss();
  };

  const slide = SLIDES[step];
  const isLast = step === total - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md px-4 py-6">
      <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#0F0F14] shadow-2xl overflow-hidden">
        <button
          type="button"
          onClick={handleSkip}
          aria-label={translate(lang, 'onboarding.skip')}
          className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-white/70 hover:text-white hover:bg-white/10 transition"
        >
          <X className="h-4 w-4" />
        </button>

        <div className={`relative flex h-48 w-full items-center justify-center bg-gradient-to-b ${slide.accent}`}>
          <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-2xl overflow-hidden border border-fuchsia-400/50 flex items-center justify-center shadow-[0_0_14px_rgba(192,38,211,0.25)] bg-gradient-to-br from-fuchsia-400/15 to-violet-500/10">
            <Image
              src={slide.illustration}
              alt=""
              width={140}
              height={140}
              className="object-contain drop-shadow-2xl"
              priority
            />
          </div>
        </div>

        <div className="px-6 pt-5 pb-6 flex flex-col gap-4">
          <div className="text-xs uppercase tracking-wider text-white/40">
            {interpolate(translate(lang, 'onboarding.progress'), { step: String(step + 1) })}
          </div>
          <h2 className="text-xl font-semibold leading-tight text-white">
            {translate(lang, slide.titleKey)}
          </h2>
          <p className="text-sm leading-relaxed text-white/70">
            {translate(lang, slide.bodyKey)}
          </p>

          <div className="flex items-center gap-2 pt-1">
            {SLIDES.map((s, i) => (
              <span
                key={s.key}
                className={`h-1.5 flex-1 rounded-full transition-all ${
                  i <= step ? 'bg-emerald-400' : 'bg-white/10'
                }`}
              />
            ))}
          </div>

          <div className="flex flex-col gap-2 pt-2">
            {isLast ? (
              <button
                type="button"
                onClick={handleStartScan}
                className="w-full rounded-xl bg-emerald-500 py-3 text-sm font-semibold text-black transition hover:bg-emerald-400"
              >
                {translate(lang, 'onboarding.startScan')}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleNext}
                className="w-full rounded-xl bg-white py-3 text-sm font-semibold text-black transition hover:bg-white/90"
              >
                {translate(lang, 'onboarding.next')}
              </button>
            )}
            <button
              type="button"
              onClick={handleSkip}
              className="w-full rounded-xl border border-white/10 py-3 text-sm font-medium text-white/70 transition hover:bg-white/5 hover:text-white"
            >
              {translate(lang, 'onboarding.skip')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
