'use client';

import { useState } from 'react';
import { AlertOctagon, X, Loader2, ShieldAlert, ThumbsUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { authFetch } from '@/lib/api-client';
import { formatAddress } from '@/components/shared/Format';
import type { Language } from '@/lib/types';

type ReasonCode = 'honeypot' | 'rugpull' | 'scam_socials' | 'spam' | 'other';

interface ReportTokenModalProps {
  open: boolean;
  onClose: () => void;
  lang: Language;
  network: string;
  address: string;
  tokenSymbol: string;
  riskScore: number;
  onSuccess?: (total: number) => void;
}

const REASONS: Array<{ code: ReasonCode; en: string; ru: string; desc_en: string; desc_ru: string }> = [
  {
    code: 'honeypot',
    en: 'Honeypot — cannot sell',
    ru: 'Хонейпот — нельзя продать',
    desc_en: 'Buy goes through, sell reverts or dumps to zero.',
    desc_ru: 'Покупка проходит, продажа откатывается или отдаёт ноль.',
  },
  {
    code: 'rugpull',
    ru: 'Rug pull — вывели ликвидность',
    en: 'Rug pull — liquidity removed',
    desc_en: 'Team removed LP or drained the treasury.',
    desc_ru: 'Команда сняла ликвидность или обнулила казну.',
  },
  {
    code: 'scam_socials',
    ru: 'Мошенничество в соцсетях',
    en: 'Scam in socials',
    desc_en: 'Fake Telegram/Twitter, impersonation, phishing.',
    desc_ru: 'Фейковый Telegram/Twitter, подмена, фишинг.',
  },
  {
    code: 'spam',
    ru: 'Спам / фейк проекта',
    en: 'Spam or fake project',
    desc_en: 'Copy-paste token, non-existent project.',
    desc_ru: 'Копипаст токена, несуществующий проект.',
  },
  {
    code: 'other',
    ru: 'Другое',
    en: 'Other',
    desc_en: 'Something else — describe below.',
    desc_ru: 'Другое — опишите ниже.',
  },
];

export function ReportTokenModal({
  open,
  onClose,
  lang,
  network,
  address,
  tokenSymbol,
  riskScore,
  onSuccess,
}: ReportTokenModalProps) {
  const [reason, setReason] = useState<ReasonCode>('honeypot');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ total: number; duplicated: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const isRu = lang === 'RU';

  const errorLabel = (code: string): string => {
    if (code === 'rate_limited') return isRu ? 'Слишком много жалоб — попробуйте позже.' : 'Too many reports — try again later.';
    if (code === 'scan_required') return isRu ? 'Просканируйте токен заново, чтобы отправить жалобу.' : 'Re-scan the token before reporting.';
    if (code === 'not_dangerous') return isRu ? 'Жалоба доступна только для красного вердикта.' : 'Reports are only accepted for red verdicts.';
    if (code === 'invalid_token') return isRu ? 'Неверные данные токена.' : 'Invalid token data.';
    if (code === 'invalid_reason') return isRu ? 'Выберите причину.' : 'Please choose a reason.';
    if (code === 'unauthorized') return isRu ? 'Не авторизованы.' : 'Not authorized.';
    return isRu ? 'Не получилось отправить жалобу.' : 'Could not send the report.';
  };

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await authFetch('/api/token-reports', {
        method: 'POST',
        body: JSON.stringify({
          network,
          contract_address: address,
          token_symbol: tokenSymbol,
          reason_code: reason,
          reason_text: comment,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        setError(errorLabel(String(json?.error || 'server_error')));
      } else {
        const total = Number(json.total_reports || 0);
        setResult({ total, duplicated: Boolean(json.duplicated) });
        onSuccess?.(total);
      }
    } catch {
      setError(errorLabel('server_error'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[80] bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md bg-[#0a0a0f] border border-red-400/30 rounded-t-3xl sm:rounded-2xl shadow-[0_0_40px_rgba(239,68,68,0.15)] max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 bg-[#0a0a0f]/95 backdrop-blur border-b border-red-400/20 px-5 py-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-400/10 border border-red-400/40 flex items-center justify-center">
            <AlertOctagon className="w-5 h-5 text-red-300" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-red-100">
              {isRu ? 'Пожаловаться на токен' : 'Report this token'}
            </div>
            <div className="text-[11px] font-mono text-white/40 truncate">
              {tokenSymbol} · {formatAddress(address)} · <span className="text-red-300">{riskScore}/100</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-lg border border-white/10 text-white/50 hover:text-white/90 hover:border-white/30 transition flex items-center justify-center"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {result ? (
          <div className="p-6 text-center space-y-4">
            <div className="mx-auto w-14 h-14 rounded-full bg-emerald-400/10 border border-emerald-300/40 flex items-center justify-center">
              <ThumbsUp className="w-6 h-6 text-emerald-300" />
            </div>
            <div className="text-sm font-bold text-emerald-100">
              {result.duplicated
                ? isRu ? 'Ваша жалоба уже была учтена' : 'Your report was already counted'
                : isRu ? 'Спасибо, жалоба принята' : 'Thanks — your report is in'}
            </div>
            <div className="text-xs text-white/60 leading-relaxed">
              {isRu
                ? `Всего жалоб на этот токен: ${result.total}. При накоплении жалоб токен автоматически попадает в чёрный список.`
                : `Total reports on this token: ${result.total}. Once enough users flag it, the token is auto-blacklisted.`}
            </div>
            <button
              onClick={onClose}
              className="w-full py-3 rounded-xl bg-white/5 border border-white/10 text-white/80 text-sm font-medium hover:bg-white/10 transition"
            >
              {isRu ? 'Закрыть' : 'Close'}
            </button>
          </div>
        ) : (
          <div className="p-5 space-y-4">
            <div className="rounded-xl bg-red-400/5 border border-red-400/20 px-4 py-3 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-red-300 flex-shrink-0 mt-0.5" />
              <p className="text-[11px] text-red-100/80 leading-relaxed">
                {isRu
                  ? 'Отправляйте жалобу только если вы уверены — жалобы влияют на автоматический чёрный список и репутацию токена.'
                  : 'Only report if you are sure — reports feed the auto-blacklist and the token reputation.'}
              </p>
            </div>

            <div className="space-y-2">
              <div className="text-[11px] uppercase tracking-wider text-white/40 font-mono font-bold">
                {isRu ? 'Причина' : 'Reason'}
              </div>
              <div className="space-y-2">
                {REASONS.map((r) => (
                  <label
                    key={r.code}
                    className={cn(
                      'flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition',
                      reason === r.code
                        ? 'bg-red-400/10 border-red-300/50'
                        : 'bg-white/[0.02] border-white/10 hover:bg-white/[0.04] hover:border-white/20',
                    )}
                  >
                    <input
                      type="radio"
                      name="report-reason"
                      value={r.code}
                      checked={reason === r.code}
                      onChange={() => setReason(r.code)}
                      className="mt-1 w-4 h-4 accent-red-400"
                    />
                    <div className="flex-1 min-w-0">
                      <div className={cn('text-sm font-semibold', reason === r.code ? 'text-red-100' : 'text-white/85')}>
                        {isRu ? r.ru : r.en}
                      </div>
                      <div className="text-[11px] text-white/45 leading-relaxed">
                        {isRu ? r.desc_ru : r.desc_en}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] uppercase tracking-wider font-mono font-bold">
                <span className="text-white/40">{isRu ? 'Комментарий (необязательно)' : 'Comment (optional)'}</span>
                <span className={cn('text-white/30', comment.length > 500 && 'text-red-300')}>
                  {comment.length}/500
                </span>
              </div>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value.slice(0, 500))}
                rows={3}
                placeholder={isRu ? 'Опишите, что произошло…' : 'Describe what happened…'}
                className="w-full resize-none px-4 py-3 rounded-xl bg-white/[0.03] border border-white/10 text-sm text-white/90 placeholder:text-white/25 focus:outline-none focus:border-red-300/50 focus:bg-white/[0.05] transition"
              />
            </div>

            {error && (
              <div className="rounded-xl bg-red-400/10 border border-red-400/40 px-4 py-3 text-xs text-red-200">
                {error}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={onClose}
                disabled={submitting}
                className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-white/80 text-sm font-medium hover:bg-white/10 transition disabled:opacity-50"
              >
                {isRu ? 'Отмена' : 'Cancel'}
              </button>
              <button
                onClick={submit}
                disabled={submitting}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-red-500/25 to-orange-500/25 border border-red-300/50 text-red-100 text-sm font-bold hover:from-red-500/35 hover:to-orange-500/35 hover:border-red-300/70 transition disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {isRu ? 'Отправка…' : 'Sending…'}
                  </>
                ) : (
                  <>
                    <AlertOctagon className="w-4 h-4" />
                    {isRu ? 'Отправить жалобу' : 'Send report'}
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
