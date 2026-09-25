# aDEX Terminal — Multi-Chain DEX Intelligence Platform

<p align="center">
  <strong>EN</strong> | <a href="#русский">РУС</a>
</p>

---

## English

### Overview

**aDEX Terminal** is a production-grade, Telegram-native multi-chain DEX intelligence terminal for TON, BNB Smart Chain (BSC), and Base. It provides real-time volume-spike radar, whale-trade tracking, contract security auditing, a Groq-powered support agent, and a referral escrow system with per-user unique codes — all behind a neon-noir interface with bilingual (EN/RU) support.

### Architecture

The terminal is a Next.js 14 App Router project with five screen modules (Radar, Whales, Scanner, Profile, Partners) sharing a single static state container (`app/page.tsx`). A bottom tab bar (mobile) and sidebar (desktop) switch between screens with zero layout shift.

| Module | Purpose | Chains |
|--------|---------|--------|
| **Radar** | Real-time volume spikes, buy/sell pressure, Pro filters | TON, BSC, BASE |
| **Whales** | Large-wallet buy/sell alerts, $3K+ threshold, anti-noise pipeline | TON, BSC, BASE |
| **Scanner** | Contract audit: honeypot, tax, dev-cluster, risk score | TON, BSC, BASE |
| **Profile** | Alert config, anti-spam sliders, subscription, academy links | All |
| **Partners** | Referral codes, real-time stats, TON Connect payout | TON |

### Radar Module

Displays trending tokens from GeckoTerminal across TON, BSC, and BASE. All volume, spike, and buy/sell pressure metrics are computed server-side from real per-trade data (15-minute rolling window). Pools with liquidity below $1,000 or dominated by a single wallet are filtered out.

- **Free**: token table, 24h volume, 15m spike, buy/sell delta bar, network switcher
- **Pro**: spike threshold slider, min liquidity slider, delta boundary sliders
- **Spike highlights**: purple >= 250%, green >= 150%

### Whales Module

Detects large-wallet movements from real on-chain trades, cleaned by a four-stage anti-noise filter:

1. **Min threshold**: >= $3,000 USD
2. **Anti-MEV**: round-trip within 60s removed
3. **Anti-wash**: offending wallet muted for 10 minutes
4. **Price impact**: >= 0.5% price move required

- 10 most recent alerts per network, sorted by freshness
- Each alert links to the chain explorer and a mirror-trade route
- Whale wallet address copying is Pro-gated

### Scanner Module

Audits any contract address the user pastes.

- **EVM (BSC, BASE)**: GoPlus Security API — honeypot, LP lock, buy/sell tax, mintable, hidden owner, dev cluster, holder concentration
- **TON**: TonAPI — jetton admin detection, top-holder concentration, dev-cluster flag. LP-lock and honeypot analysis are limited by TON's architecture; the scanner shows a dedicated notice and caps the verdict at CAUTION
- **Verdict**: SAFE / CAUTION / DANGER (TON tokens are never marked SAFE)
- **Rate limit**: 10 free scans per day, bonus scans via referrals
- **Failure policy**: if GoPlus returns no data, the scan fails honestly — no invented verdicts

### Profile Module

- Range-slider alert configuration (min whale tx, min spike velocity, safe pools toggle, risk auto-mute)
- Sliders disabled for free users, unlocked for Pro
- Subscription: $9.90/month via TON (in Telegram) or Telegram Stars

### Partners Module

- Each Telegram user gets a unique referral code (`aDEX-XXXX`)
- Real-time stats from `referral_claims` and `partner_pending_balances`
- 20% commission, tier system (New / Silver / Gold / Platinum)
- TON Connect wallet claiming for escrow payouts

### Support Agent

Groq LLM-powered (`openai/gpt-oss-120b` with `gpt-oss-20b` fallback). Detects Cyrillic to respond in Russian. AI-driven content moderation with automatic chat restriction. Knowledge base stored in Supabase.

### Data Pipeline

- **Source**: GeckoTerminal API v2 (`trending_pools` + per-pool `trades`)
- **Refresh**: one network per 4-minute cycle (TON → BSC → Base rotation), triggered by Vercel Cron hitting `/api/cron/tick`
- **Cache chain**: live data → in-memory → `radar_cache` DB → empty state. No mock fallback — users see previous real results until next refresh
- **Whale retention**: 24h rolling window, max 150 alerts
- **Client polling**: every 60 seconds with ETag support

### Security

- All 37 Supabase tables have RLS enabled, no `USING(true)` on user tables
- Middleware enforces CSP with nonce-based script-src, rate limiting (5 req/s per IP/user)
- Server secrets (`SUPABASE_SERVICE_ROLE_KEY`, `TONAPI_KEY`, `TELEGRAM_BOT_TOKEN`, `CRON_SECRET`, `HIGHLOAD_MNEMONIC`, `GROQ_API_KEY`) live only in Vercel Environment Variables — never in the local `.env`
- Local `.env` contains only `NEXT_PUBLIC_*` keys

### Tech Stack

- **Framework**: Next.js 14 (App Router, Node.js runtime)
- **Styling**: Tailwind CSS + shadcn/ui patterns
- **Backend**: Supabase (Postgres, RLS, Edge Functions)
- **External APIs**: GeckoTerminal, GoPlus Security, Groq LLM, Telegram Bot API, TonAPI, CoinGecko
- **Wallet**: TonConnect UI React
- **Language**: TypeScript (strict mode)

### Environment Variables

| Variable | Where | Purpose |
|----------|------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | `.env` + Vercel | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `.env` + Vercel | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel only | Server-side Supabase access |
| `TELEGRAM_SUPPORT_BOT_TOKEN` | Vercel only | Bot API + alert delivery |
| `CRON_SECRET` | Vercel only | Authenticates cron requests |
| `GROQ_API_KEY` | Vercel only | Support agent LLM |
| `TONAPI_KEY` | Vercel only | TON chain data |
| `HIGHLOAD_MNEMONIC` | Vercel only | TON payout wallet |
| `MY_TONKEEPER_ADDRESS` | Vercel only | Payout destination |
| `PRO_COINGECKO_API_KEY` | Vercel (optional) | Pro data feed |

### Deployment

Deployed on Vercel. External cron (UptimeRobot or similar) hits `/api/cron/tick` every 5 minutes to refresh radar data, check alerts, and run lightning-boost. See `docs/EXTERNAL_CRON_SETUP.md` for setup instructions.

---

## Русский

### Обзор

**aDEX Terminal** — продакшн-платформа DEX-аналитики для экосистем TON, BSC и Base, работающая как Telegram Mini App. Радар всплесков объёма, отслеживание кит-сделок, аудит безопасности контрактов, ИИ-агент поддержки на Groq и реферальная система с эскроу — всё в одном неоновом интерфейсе с поддержкой EN/RU.

### Архитектура

Next.js 14 (App Router), пять экранов (Радар, Киты, Сканер, Профиль, Партнёры) с общим контейнером состояния в `app/page.tsx`. Нижняя панель вкладок (мобильные) и боковой сайдбар (десктоп) переключают экраны без смещения лейаута.

| Модуль | Назначение | Сети |
|--------|------------|------|
| **Радар** | Всплески объёма, давление покупок/продаж, Pro-фильтры | TON, BSC, BASE |
| **Киты** | Алерты по крупным сделкам, порог $3K+, анти-шум | TON, BSC, BASE |
| **Сканер** | Аудит контрактов: honeypot, налоги, dev-кластеры, риск-скор | TON, BSC, BASE |
| **Профиль** | Настройка алертов, слайдеры, подписка, академия | Все |
| **Партнёры** | Реферальные коды, реальные данные, вывод через TON Connect | TON |

### Радар

Трендовые токены с GeckoTerminal по TON, BSC и BASE. Все метрики считаются на сервере из реальных сделок (окно 15 минут). Пулы с ликвидностью ниже $1,000 или с накруткой одним кошельком отфильтровываются.

- **Бесплатно**: таблица токенов, объём 24ч, всплеск 15м, дельта, переключатель сетей
- **Pro**: слайдеры порога всплеска, мин. ликвидности, границ дельты
- **Подсветка**: фиолетовая >= 250%, зелёная >= 150%

### Киты

Обнаружение крупных сделок из реальных on-chain данных, четырёхступенчатый анти-шум:

1. Минимальный порог $3,000
2. Анти-МЕВ: round-trip за 60с удаляется
3. Анти-накрутка: кошелёк заглушается на 10 минут
4. Влияние на цену >= 0.5%

10 свежих алертов на сеть, ссылки на обозреватели и зеркальную торговлю. Копирование адреса кита — под Pro.

### Сканер

Аудит любого контракта.

- **EVM (BSC, BASE)**: GoPlus — honeypot, LP-лок, налоги, минт, скрытый владелец, dev-кластер, холдеры
- **TON**: TonAPI — админ джеттона, топ-холдеры, dev-кластер. LP-лок и honeypot ограничены архитектурой TON; вердикт не выше CAUTION
- **Вердикт**: SAFE / CAUTION / DANGER (TON — минимум CAUTION)
- **Лимит**: 10 бесплатных сканов в день, бонусные за рефералы
- При отсутствии данных от GoPlus скан честно завершается ошибкой

### Профиль

Слайдеры алертов (мин. сделка кита, мин. всплеск, безопасные пулы, авто-мьют по риску). Отключены для бесплатных пользователей. Подписка $9.90/мес через TON или Telegram Stars.

### Партнёры

Уникальные реферальные коды (`aDEX-XXXX`), реальные данные из `referral_claims` и `partner_pending_balances`. Комиссия 20%, тир-система (New / Silver / Gold / Platinum). Вывод через TON Connect.

### Поддержка

ИИ-агент на Groq LLM. Определение кириллицы для ответа на русском. AI-модерация с авто-ограничением чата. База знаний в Supabase.

### Конвейер данных

- **Источник**: GeckoTerminal API v2 (`trending_pools` + `trades`)
- **Обновление**: одна сеть за 4-минутный цикл (ротация TON → BSC → Base), запускается внешним кроном через `/api/cron/tick`
- **Цепочка кэша**: живые данные → память → `radar_cache` БД → пусто. Без мок-фоллбэка
- **Удержание китов**: 24ч, максимум 150 алертов
- **Клиентский поллинг**: каждые 60с с ETag

### Безопасность

- Все 37 таблиц Supabase с RLS, без `USING(true)` на пользовательских таблицах
- CSP с nonce-based script-src, rate limiting 5 req/s
- Серверные секреты только в Vercel Environment Variables
- Локальный `.env` содержит только `NEXT_PUBLIC_*` ключи

### Технологии

- **Фреймворк**: Next.js 14 (App Router, Node.js)
- **Стили**: Tailwind CSS + shadcn/ui
- **Бэкенд**: Supabase (Postgres, RLS)
- **API**: GeckoTerminal, GoPlus, Groq, Telegram Bot API, TonAPI, CoinGecko
- **Кошелёк**: TonConnect UI React
- **Язык**: TypeScript (strict)

### Переменные окружения

| Переменная | Где | Назначение |
|------------|-----|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | `.env` + Vercel | URL проекта Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `.env` + Vercel | Anon-ключ Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Только Vercel | Серверный доступ к Supabase |
| `TELEGRAM_SUPPORT_BOT_TOKEN` | Только Vercel | Bot API + доставка алертов |
| `CRON_SECRET` | Только Vercel | Авторизация cron-запросов |
| `GROQ_API_KEY` | Только Vercel | LLM агента поддержки |
| `TONAPI_KEY` | Только Vercel | Данные TON |
| `HIGHLOAD_MNEMONIC` | Только Vercel | Кошелёк для выплат |
| `MY_TONKEEPER_ADDRESS` | Только Vercel | Адрес получения выплат |
| `PRO_COINGECKO_API_KEY` | Vercel (опц.) | Pro-источник данных |

### Деплой

Vercel. Внешний крон (UptimeRobot или аналог) дёргает `/api/cron/tick` каждые 5 минут — обновление радара, проверка алертов, lightning-boost. Инструкция в `docs/EXTERNAL_CRON_SETUP.md`.

---

<p align="center">
  <sub>aDEX Terminal — Built for TON Foundation & BNB Chain Builder Grant programs.</sub>
</p>
