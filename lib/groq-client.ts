const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';

const DEFAULT_MODELS = ['openai/gpt-oss-120b', 'openai/gpt-oss-20b'] as const;

interface GroqMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface GroqResponse {
  choices?: { message?: { content?: string } }[];
}

export interface GroqChatOptions {
  messages: GroqMessage[];
  models?: readonly string[];
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
  logTag?: string;
}

function collectKeys(): string[] {
  const keys: string[] = [];
  const primary = process.env.SUPPORT_LLM_API_KEY || '';
  if (primary) keys.push(primary);
  for (let i = 2; i <= 6; i++) {
    const extra = process.env[`SUPPORT_LLM_API_KEY_${i}`] || '';
    if (extra && !keys.includes(extra)) keys.push(extra);
  }
  return keys;
}

// A small module-level counter so consecutive callers within one instance
// don't always start from the same key. It's a soft round-robin per instance;
// coverage across instances doesn't need to be exact.
let rotationCursor = 0;

function orderKeys(keys: string[]): string[] {
  if (keys.length <= 1) return keys;
  const start = rotationCursor % keys.length;
  rotationCursor = (rotationCursor + 1) % keys.length;
  return [...keys.slice(start), ...keys.slice(0, start)];
}

export async function callGroqChat(opts: GroqChatOptions): Promise<string> {
  const keys = collectKeys();
  if (keys.length === 0) return '';

  const models = opts.models && opts.models.length > 0 ? opts.models : DEFAULT_MODELS;
  const timeoutMs = opts.timeoutMs ?? 30_000;
  const tag = opts.logTag || 'groq';

  const orderedKeys = orderKeys(keys);

  for (const key of orderedKeys) {
    for (const model of models) {
      try {
        const res = await fetch(GROQ_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${key}`,
          },
          body: JSON.stringify({
            model,
            messages: opts.messages,
            temperature: opts.temperature ?? 0.3,
            max_tokens: opts.maxTokens ?? 1024,
          }),
          signal: AbortSignal.timeout(timeoutMs),
        });

        if (res.ok) {
          const data = (await res.json()) as GroqResponse;
          const content = data.choices?.[0]?.message?.content?.trim() || '';
          if (content) return content;
          // Empty content — try next model/key
          continue;
        }

        const status = res.status;
        const errText = (await res.text().catch(() => '')).slice(0, 300);
        console.error(`[${tag}] Groq ${status} (${model}, key#${orderedKeys.indexOf(key)}): ${errText}`);

        // 429 or 5xx → try next key entirely; 4xx (auth/param) → skip this key.
        if (status === 429 || status >= 500) break;
        if (status === 401 || status === 403) break;
        // For other 4xx (e.g. bad model), try next model with same key.
        continue;
      } catch (err) {
        console.error(`[${tag}] Groq fetch failed (${model}, key#${orderedKeys.indexOf(key)}):`, err);
        break; // network/timeout → next key
      }
    }
  }

  return '';
}

export async function callGroqJson<T>(
  opts: GroqChatOptions,
  fallback: T,
): Promise<T> {
  const raw = await callGroqChat(opts);
  if (!raw) return fallback;
  try {
    const cleaned = raw.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
    return JSON.parse(cleaned) as T;
  } catch {
    return fallback;
  }
}

export function getOfflineSupportReply(lang: 'RU' | 'EN'): string {
  if (lang === 'RU') {
    return [
      '*Служба поддержки временно перегружена*',
      '',
      'Я не могу ответить прямо сейчас, но вот быстрая справка:',
      '',
      '*Radar* — тренды по TON, BSC, BASE (Gecko Terminal).',
      '*Whales* — крупные покупки и продажи, отфильтрованные от MEV.',
      '*Scanner* — аудит контракта (GoPlus для EVM, TonAPI для TON). 10 бесплатных сканов в день.',
      '*Profile* — TonConnect, план подписки, алерты.',
      '*Partners* — реферальная программа: 20% с оплаты.',
      '',
      'Если вопрос срочный — напишите @aDex_Terminal_Official, ответим лично.',
    ].join('\n');
  }
  return [
    '*Support is temporarily overloaded*',
    '',
    "I can't reply right now, but here's a quick reference:",
    '',
    '*Radar* — trending tokens on TON, BSC, BASE (Gecko Terminal).',
    '*Whales* — large buys and sells, filtered from MEV noise.',
    '*Scanner* — contract audit (GoPlus for EVM, TonAPI for TON). 10 free scans daily.',
    '*Profile* — TonConnect wallet, subscription tier, alert config.',
    '*Partners* — referral program: 20% commission on paid subscriptions.',
    '',
    'For urgent questions, message @aDex_Terminal_Official directly.',
  ].join('\n');
}

export function getOfflinePartnershipsReply(lang: 'RU' | 'EN'): string {
  if (lang === 'RU') {
    return [
      '*Здравствуйте — служба по партнёрствам*',
      '',
      'Наш авто-ассистент временно недоступен, но чтобы ускорить обработку, пришлите одним сообщением:',
      '',
      '1. Название бренда / токена',
      '2. Ссылку на сайт или проект',
      '3. Тип интеграции (реклама, листинг, коллаба)',
      '',
      'Менеджер вернётся с ответом в течение 24 часов.',
    ].join('\n');
  }
  return [
    '*Hello — Partnerships desk*',
    '',
    "Our auto-assistant is temporarily unavailable. To speed things up, reply in one message with:",
    '',
    '1. Brand / Token name',
    '2. Website or project link',
    '3. Integration type (advertising, listing, collaboration)',
    '',
    'A manager will get back to you within 24 hours.',
  ].join('\n');
}

export function hasGroqKeys(): boolean {
  return collectKeys().length > 0;
}
