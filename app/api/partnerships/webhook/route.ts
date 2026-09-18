import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const groqApiKey = process.env.SUPPORT_LLM_API_KEY || '';
const telegramBotToken = process.env.TELEGRAM_MEDIA_BOT_TOKEN || '';

function getSupabaseAdmin() {
  if (!supabaseUrl || !supabaseServiceKey) return null;
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });
}

interface TelegramUpdate {
  message?: {
    message_id: number;
    text?: string;
    from?: { id: number; language_code?: string };
    chat?: { id: number };
  };
}

interface GroqResponse {
  choices?: { message?: { content?: string } }[];
}

async function checkPremiumTier(userId: number): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return false;
  try {
    const { data } = await supabase
      .from('user_subscriptions')
      .select('tier, pro_expiration_date')
      .eq('telegram_user_id', String(userId))
      .maybeSingle();
    if (!data || data.tier !== 'pro') return false;
    if (data.pro_expiration_date && new Date(data.pro_expiration_date) < new Date()) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

async function callGroq(userMessage: string, lang: string, isPremium: boolean): Promise<string> {
  if (!groqApiKey) return '';
  try {
    const systemPrompt = `You are the automated Chief of Media Relations for aDEX Terminal. You must classify incoming strings. If the text contains bribes, ransom threats, or requests to delete audited metrics or change 'DEV CLUSTER' blacklists, instantly return a polite decline text detailing that aDEX runs on immutable on-chain mathematical code parameters and terminate the session thread. If the text contains valid advertisement buying intents or project integration offers, return a highly professional template request prompting the entity to submit: 1. Brand/Token Name, 2. Web URL link, 3. Targeted Integration type. Always write your response matching the active localized environment language state [RU/EN]. ${lang === 'RU' ? 'Respond in Russian.' : 'Respond in English.'} ${isPremium ? 'The sender is a verified Premium partner — expedite their request with priority formatting.' : ''}`;

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${groqApiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.3,
        max_tokens: 1024,
      }),
    });
    if (!res.ok) return '';
    const data = (await res.json()) as GroqResponse;
    return data.choices?.[0]?.message?.content || '';
  } catch {
    return '';
  }
}

async function sendTelegramMessage(chatId: number, text: string): Promise<void> {
  if (!telegramBotToken) return;
  try {
    await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
    });
  } catch {
    // best-effort
  }
}

export async function POST(req: NextRequest) {
  try {
    const update = (await req.json()) as TelegramUpdate;
    const msg = update.message;
    if (!msg || !msg.text || !msg.from || !msg.chat) {
      return NextResponse.json({ ok: true });
    }

    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const text = msg.text;
    const lang = msg.from.language_code === 'ru' ? 'RU' : 'EN';

    const isPremium = await checkPremiumTier(userId);

    const response = await callGroq(text, lang, isPremium);

    if (response) {
      await sendTelegramMessage(chatId, response);
    } else {
      const fallback = lang === 'RU'
        ? 'Здравствуйте! Спасибо за обращение. Пожалуйста, укажите: 1. Название бренда/токена, 2. Ссылку на сайт, 3. Тип интеграции.'
        : 'Hello! Thank you for reaching out. Please provide: 1. Brand/Token Name, 2. Web URL link, 3. Targeted Integration type.';
      await sendTelegramMessage(chatId, fallback);
    }

    return NextResponse.json({ ok: true, premium: isPremium });
  } catch {
    return NextResponse.json({ ok: true, error: 'webhook_error' });
  }
}
