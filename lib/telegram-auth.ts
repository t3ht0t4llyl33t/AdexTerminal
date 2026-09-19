import crypto from 'node:crypto';

export interface VerifiedTelegramUser {
  telegramUserId: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  languageCode: string | null;
  isPremium: boolean;
  authDate: number;
}

const MAX_INIT_DATA_AGE_SECONDS = 24 * 60 * 60;

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const bufA = Buffer.from(a, 'hex');
  const bufB = Buffer.from(b, 'hex');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export function verifyInitData(initData: string, botToken: string): VerifiedTelegramUser | null {
  if (!initData || !botToken) return null;

  let params: URLSearchParams;
  try {
    params = new URLSearchParams(initData);
  } catch {
    return null;
  }

  const hash = params.get('hash');
  if (!hash || !/^[0-9a-f]{64}$/i.test(hash)) return null;

  params.delete('hash');

  const dataCheckString = Array.from(params.entries())
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');

  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const computedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  if (!timingSafeEqualHex(computedHash, hash.toLowerCase())) return null;

  const authDate = Number(params.get('auth_date'));
  if (!Number.isFinite(authDate) || authDate <= 0) return null;

  const nowSec = Math.floor(Date.now() / 1000);
  if (nowSec - authDate > MAX_INIT_DATA_AGE_SECONDS) return null;

  const userRaw = params.get('user');
  if (!userRaw) return null;

  let user: Record<string, unknown>;
  try {
    user = JSON.parse(userRaw);
  } catch {
    return null;
  }

  const rawId = user.id;
  if (typeof rawId !== 'number' && typeof rawId !== 'string') return null;
  const telegramUserId = String(rawId).trim();
  if (!/^[0-9]{1,20}$/.test(telegramUserId)) return null;

  return {
    telegramUserId,
    username: typeof user.username === 'string' ? user.username : null,
    firstName: typeof user.first_name === 'string' ? user.first_name : null,
    lastName: typeof user.last_name === 'string' ? user.last_name : null,
    languageCode: typeof user.language_code === 'string' ? user.language_code : null,
    isPremium: user.is_premium === true,
    authDate,
  };
}

export function extractUserIdUnverified(initData: string): string | null {
  if (!initData) return null;
  try {
    const params = new URLSearchParams(initData);
    const userRaw = params.get('user');
    if (!userRaw) return null;
    const user = JSON.parse(userRaw);
    const rawId = user?.id;
    if (typeof rawId !== 'number' && typeof rawId !== 'string') return null;
    const id = String(rawId).trim();
    return /^[0-9]{1,20}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}
