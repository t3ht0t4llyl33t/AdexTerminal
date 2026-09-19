import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { callGroqChat, getOfflinePartnershipsReply } from '@/lib/groq-client';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
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

async function callGroq(userMessage: string, lang: 'RU' | 'EN', isPremium: boolean): Promise<string> {
  const systemPrompt = `You are the automated Chief of Media Relations for aDEX Terminal. You must classify incoming strings. If the text contains bribes, ransom threats, or requests to delete audited metrics or change 'DEV CLUSTER' blacklists, instantly return a polite decline text detailing that aDEX runs on immutable on-chain mathematical code parameters and terminate the session thread. If the text contains valid advertisement buying intents or project integration offers, return a highly professional template request prompting the entity to submit: 1. Brand/Token Name, 2. Web URL link, 3. Targeted Integration type. Always write your response matching the active localized environment language state [RU/EN]. ${lang === 'RU' ? 'Respond in Russian.' : 'Respond in English.'} ${isPremium ? 'The sender is a verified Premium partner — expedite their request with priority formatting.' : ''}`;

  return callGroqChat({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    models: ['llama-3.3-70b-versatile', 'openai/gpt-oss-120b', 'openai/gpt-oss-20b'],
    temperature: 0.3,
    maxTokens: 1024,
    logTag: 'partnerships-webhook',
  });
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
    const lang: 'RU' | 'EN' = msg.from.language_code === 'ru' ? 'RU' : 'EN';

    const isPremium = await checkPremiumTier(userId);

    const response = await callGroq(text, lang, isPremium);

    if (response) {
      await sendTelegramMessage(chatId, response);
    } else {
      await sendTelegramMessage(chatId, getOfflinePartnershipsReply(lang));
    }

    return NextResponse.json({ ok: true, premium: isPremium });
  } catch {
    return NextResponse.json({ ok: true, error: 'webhook_error' });
  }
}
