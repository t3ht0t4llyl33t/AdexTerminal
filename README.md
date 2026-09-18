# aDEX Terminal — Multi-Chain Insider Intelligence Platform

<p align="center">
  <strong>EN</strong> | <a href="#русский">РУС</a>
</p>

---

## English

### Overview

**aDEX Terminal** is a production-grade, multi-chain insider intelligence terminal built for the TON, BNB Smart Chain (BSC), and Base ecosystems. It provides real-time token flow radar, whale wallet tracking, smart-contract security auditing, an AI-powered support agent, and a referral escrow system with per-user unique referral codes — all behind a unified neon-noir interface with bilingual (EN/RU) support.

### Architecture: 6-Module Multi-Chain Layout

The terminal is organized into six independent screen modules, each with a single responsibility. All tabs share a singular static global state container (`page.tsx`) that holds language, network selection, and live data — ensuring **zero layout shifting** when toggling between tabs or switching multi-chain network filters.

| Module | Purpose | Chains |
|--------|---------|--------|
| **Radar** | Real-time token volume spikes, buy/sell pressure, LP-lock status, Pro-only advanced filters | TON, BSC, BASE |
| **Whales** | Large-wallet buy/sell alerts, sorted by freshness, min $5,000 threshold, 10 per network | TON, BSC, BASE |
| **Scanner** | Contract security audit: honeypot detection, tax analysis, dev-cluster mapping, AI audit summary | TON, BSC, BASE |
| **Profile** | Alert configuration, anti-spam sliders, subscription management, academy resources | All |
| **Partners** | Per-user unique referral codes, real-time referral stats, TON Connect wallet claiming | TON |
| **Support** | AI-powered Telegram chat agent with structured, formatted responses | — |

### Radar Module

The Radar module displays trending tokens from GeckoTerminal across TON, BSC, and BASE networks in real time.

**Free Tier:**
- Token table with symbol, address, network badge
- 24h volume, 15m volume spike, 15m buy/sell pressure delta bar
- Sortable columns (volume, spike)
- Network switcher (TON / BSC / BASE / ALL)

All volume, spike, and buy/sell pressure metrics are computed server-side from **real per-trade data** (GeckoTerminal `/trades` endpoint, 15-minute rolling window), not from simulated data. When a pool has no trades in the current 15-minute window, the previous cycle's values are kept until the next refresh (max 60 seconds) — never silently substituted with hourly or daily data.

Pools with liquidity below $1,000 and pools whose volume is dominated by a single wallet (low unique-buyer ratio) are filtered out before analysis.

**Pro Tier (locked for free users):**
- Spike threshold slider (0% — 500%)
- Minimum liquidity slider ($0 — $500K)
- Delta boundary sliders (buy pressure range 0% — 100%)

**Spike Highlight System:**
- **Purple highlight**: volume spike >= 250% (border + glow + background tint)
- **Green highlight**: volume spike >= 150% (text color change to emerald)
- Below 150%: default white text, no highlight

### Whales Module

The Whales module detects and displays large-wallet buy/sell movements from **real on-chain trades** (GeckoTerminal `/trades` per pool), cleaned by a four-stage anti-noise filter before entering the cache:

**Anti-Noise Filter Pipeline (server-side, in-memory, single pass):**
1. **Minimum threshold**: a trade must be >= **$3,000** USD (default; the Pro slider raises it further). Smaller trades never enter the whale cache.
2. **Anti-MEV / anti-arbitrage**: if the same wallet buys AND sells the same token within 60 seconds, both legs of the round-trip are removed from the cache immediately.
3. **Anti-wash-trading**: a wallet caught round-tripping is muted for 10 minutes — all its trades are ignored inside that window, so cyclic buy/sell volume farming never reaches the feed.
4. **Price impact**: only trades that moved the pool price by **>= 0.5%** (relative to the previous trade price in the same pool) are kept. The free GeckoTerminal API exposes no `price_impact_percent` field, so impact is derived from the trade price shift (`usd / token amount`). The first trade of a window is conservatively dropped (no previous price to compare).

- **Feed limit**: 10 most recent alerts per selected network
- **Sorting**: By freshness (most recent timestamp first), not by USD amount
- **Per-alert data**: Token symbol, network, buy/sell type, real USD amount, real token amount, native currency amount, **real wallet address of the trade initiator (from `tx_from_address`)**, cross-chain tag, insider distribution warning
- **Trade links**: each alert links to the actual transaction in the chain explorer (Tonviewer / BscScan / BaseScan) and to a Mirror Trade route (STON.fi / PancakeSwap / Uniswap)
- **Auto-refresh**: Every 60 seconds
- **Pro-gated wallet address**: the whale's wallet address is visible in the card title, but **copying it requires an aDex Pro subscription** — a free user clicking the copy icon gets the Pro paywall modal instead of the clipboard; the token contract address stays free to copy.

### Scanner Module

The Scanner module audits any contract address the user pastes.

**EVM Chains (BSC, BASE) — GoPlus Security API:**
- Honeypot risk detection
- Liquidity lock status and lock percentage
- Buy/sell tax analysis
- Contract verification status
- Mintable token check
- Hidden owner detection
- Dev cluster detection
- Total holders and top holder concentration

**TON Chain:**
- Jetton admin address detection via TonAPI
- Top holder concentration analysis via TonAPI holders endpoint
- Dev cluster detection: flags if admin holds >=10% or >=3 wallets each hold >=5%
- **Architecture notice**: LP-lock verification and automated honeypot analysis are restricted by TON's core design (Jetton sharding). The scanner shows a dedicated "TON Architecture" notice instead of a false "Not Locked" failure, and the verdict is capped at `CAUTION / Limited Data` for TON tokens.
- Risk score (0 — 100)

**All Scans:**
- Risk score (0 — 100)
- Security verdict: `SAFE` / `CAUTION` / `DANGER` (TON tokens are never marked `SAFE` — always at least `CAUTION` due to limited automated data)
- Results persisted to `scanner_audit_logs` table **per user** (`telegram_user_id`)
- **Scan history**: the last 5 scans of the current user are shown at the bottom of the Security Vault screen with network badge, LP/honeypot icons, and risk score

**Ownership flag mapping (GoPlus):**
- `ownerRenounced` is derived from the real `owner_address` (zero address / 0x...dead means renounced) — never from unrelated reentrancy fields
- `canRenounce` is derived from `can_take_back_ownership`

**Failure policy**: if GoPlus returns no data for an EVM contract, the scan **fails honestly** with an error — it never invents a verdict.

**Rate Limiting:**
- Free users: 10 scans per day (rolling 24h window)
- Bonus scans earnable via referral links
- Tracked in `scan_limits` table

### Profile Module

The Profile module implements a **range-slider anti-spam pattern** for alert configuration:

- **Min Whale Tx Slider**: $3,000 — $100,000 (step $1,000). Filters whale alerts below the threshold.
- **Min Spike Velocity Slider**: 0% — 1,000% (step 50%). Filters volume-spike alerts below the threshold.
- **Safe Pools Toggle**: Auto-mutes alerts for tokens with unlocked LP.
- **Risk Auto-Mute**: Silences notifications for tokens flagged with dev-cluster or honeypot risk.

All sliders are **disabled (blurred + pointer-events-none)** for free-tier users, unlocked only for PRO subscribers.

**Subscription:**
- Free plan: Limited scans, no Pro filters, no advanced alerts
- Pro plan: $9.90/month — unlimited scans, Pro radar filters, advanced alert configuration
- Payment via TON (in Telegram Mini App) or EVM (desktop browser redirect)

### Partners Module

The Partners module implements a full referral program with per-user unique codes.

**Referral Code System:**
- Each Telegram user receives a unique referral code (format: `aDEX-XXXX`) on first access
- Codes are stored in the `referral_codes` table with a unique constraint on `telegram_user_id`
- The code is generated server-side via `/api/referral-stats` endpoint
- Referral link format: `https://t.me/aDEX_Live_Support_bot?start=aDEX-XXXX`

**Real-Time Stats (no more placeholders):**
- **Total invited**: Count of rows in `referral_claims` where `referrer_tg_id` matches the user
- **Earned rewards**: Sum from `partner_pending_balances` for the user
- **Pending payouts**: Unclaimed escrow balance from `partner_pending_balances`
- **Tier**: Automatically assigned based on referral count (New / Silver / Gold / Platinum Partner)
- **Commission rate**: 20%

**Escrow System:**
- Pending commissions stored in `partner_pending_balances` table
- Users connect a TON wallet via TonConnect to claim payouts
- Claim triggers a transfer to the bonded wallet address
- Unclaimed balance banner displayed when wallet is disconnected

### Support Module (AI Agent)

An AI-powered support agent running on Groq LLM (`openai/gpt-oss-120b` with `openai/gpt-oss-20b` fallback).

**Language Detection:**
- Analyzes the user's message text for Cyrillic characters — if detected, responds in Russian
- Falls back to Telegram's `language_code` field
- Respects the user's actual message language, not just their Telegram settings

**Response Formatting:**
- Responses are structured into clearly separated sections with bold headers
- Each section header includes 1-3 relevant emojis (e.g., 📊 Radar, 🐋 Whales, 🔍 Scanner)
- Key phrases and important terms are bolded using Markdown
- Each section is 2-3 sentences maximum
- Brief intro line before the first section
- Closing line or call-to-action at the end
- Tone is engaging and professional — a knowledgeable trading companion, not a robot

**Content Moderation:**
- AI-driven moderation classifier detects: commercial spam, external hyperlinks, profanity/toxicity, prompt injection
- Automatic message deletion and chat restriction for violations
- Rate limiting: 3 messages per 10-second window, 15-minute mute on overflow

**Knowledge Base:**
- Stored in `support_knowledge_base` table (Supabase)
- Retrieved via fuzzy `ILIKE` search on content field
- Falls back to general entries if no match found
- Bilingual entries (EN/RU)

### Edge-Level DDoS Rate-Limiting Shield

The middleware (`middleware.ts`) implements an in-memory rate limiter at the Edge level:

- **Threshold**: 5 requests per second per IP (or Telegram user ID).
- **Response**: HTTP 429 with `Retry-After: 1` header and JSON error payload.
- **Scope**: All `/api/*` routes.
- **Memory Management**: The rate-limit Map auto-evicts stale entries when it exceeds 10,000 keys.
- **Key Resolution**: Uses `x-telegram-user-id` header if present, falls back to `x-forwarded-for` / `x-real-ip`.

### Environment-Aware Compliance Guard

The terminal detects its runtime environment and adapts the payment flow:

- **Telegram Mini App** (detected via `TelegramWebview` / `tgWebAppData` param): Shows in-app TON payment button for PRO subscription. Referral data is visible and claimable via TON Connect.
- **Desktop Browser**: Masks TON referral data. Shows a native EVM payment terminal redirecting to the Telegram bot for MetaMask/Coinbase Wallet checkout.

### Server-Side Data Pipeline

Server-side caching is handled by `selectors/apiConfig.ts`:

- **Source**: GeckoTerminal API v2 — `trending_pools` + per-pool `trades` endpoints for TON, BSC, and Base.
- **Refresh**: one network is refreshed per 60-second cycle (TON → BSC → Base rotation), keeping total request rate within the free-tier API limit (~30 req/min).
- **Cache chain (no mock fallback)**: live data → in-memory cache → `radar_cache` DB snapshot → empty state. If the external API is temporarily unavailable, users see the **previous real results** until the next refresh — never simulated data. Mock data arrays were fully removed from the codebase.
- **Whale retention**: 24h rolling window, max 150 alerts.
- **Client Polling**: The client polls `/api/radar` every 60s.
- **Pro API switch**: when `PRO_COINGECKO_API_KEY` is configured, the internal polling loop is disabled and the Pro endpoint serves data instead.

### Database Schema

All tables use Supabase with Row Level Security (RLS) enabled:

| Table | Purpose |
|-------|---------|
| `scanner_audit_logs` | Stores contract audit results and AI verdicts |
| `scan_limits` | Per-user daily scan count with bonus scan tracking |
| `referral_claims` | Records each referral claim (referrer + referred) |
| `referral_codes` | Unique referral code per Telegram user |
| `partner_pending_balances` | Escrow ledger for pending commission payouts |
| `scout_registrations` | Scout-pass access grants (max 10 users, expires Nov 30, 2026) |
| `user_subscriptions` | Subscription tier and Pro expiration tracking |
| `support_knowledge_base` | Bilingual KB entries for the AI support agent |
| `chat_rate_limits` | Per-user message rate limiting for the support chat |
| `radar_cache` | Server-side cache snapshot of radar/whale data |

### Security Practices

- All secret keys (Supabase service role, Telegram bot tokens, Groq API key, Pro CoinGecko key) are accessed exclusively via `process.env` — never hardcoded.
- The scanner route implements **request deduplication** via a pending-request Map.
- Webhook routes validate Telegram update payloads and apply AI-driven content moderation with automatic chat restriction.
- Supabase RLS policies are enabled on all tables with per-user ownership checks.
- Referral codes are generated server-side with uniqueness enforced by database constraint.

### Tech Stack

- **Framework**: Next.js 14 (App Router, Edge + Node.js runtimes)
- **Styling**: Tailwind CSS + shadcn/ui
- **Backend**: Supabase (Postgres, RLS, Edge Functions)
- **External APIs**: GeckoTerminal, GoPlus Security, Groq LLM, Telegram Bot API, TonAPI
- **Wallet**: TonConnect UI React
- **Language**: TypeScript (strict mode)

---

## Русский

### Обзор

**aDEX Terminal** — продакшн-платформа инсайдерской аналитики для экосистем TON, BNB Smart Chain (BSC) и Base. Предоставляет радар токенных потоков в реальном времени, отслеживание кит-кошельков, аудит безопасности смарт-контрактов, ИИ-агент поддержки и систему реферального эскроу с уникальными кодами для каждого пользователя — всё за единственным неоновым интерфейсом с поддержкой двух языков (EN/RU).

### Архитектура: 6-модульный мультичейн-лейаут

Терминал организован в шесть независимых экранов, каждый с единственной зоной ответственности. Все вкладки используют общий статический контейнер состояния (`page.tsx`), хранящий язык, выбранные сети и live-данные — что гарантирует **нулевое смещение лейаута** при переключении вкладок или сетевых фильтров.

| Модуль | Назначение | Сети |
|--------|------------|------|
| **Радар** | Объёмы и всплески токенов, давление покупок/продаж, статус LP-лока, Pro-фильтры | TON, BSC, BASE |
| **Киты** | Алерты по крупным кошелькам, сортировка по свежести, порог $5,000, 10 на сеть | TON, BSC, BASE |
| **Сканер** | Аудит безопасности: honeypot, налоги, dev-кластеры, ИИ-резюме | TON, BSC, BASE |
| **Профиль** | Настройка алертов, анти-спам слайдеры, подписка, академия | Все |
| **Партнёры** | Уникальные реферальные коды, реальные данные, TON Connect | TON |
| **Поддержка** | ИИ-агент Telegram-чата со структурированными ответами | — |

### Модуль Радар

Модуль Радар отображает трендовые токены с GeckoTerminal по сетям TON, BSC и BASE в реальном времени.

**Бесплатный тариф:**
- Таблица токенов: символ, адрес, сетевой бейдж
- Объём за 24ч, всплеск за 15м, дельта покупок/продаж за 15м
- Сортировка колонок (объём, всплеск)
- Переключатель сетей (TON / BSC / BASE / ALL)

Все метрики объёма, всплеска и давления покупок/продаж считаются на сервере из **реальных сделок** (эндпоинт `/trades` GeckoTerminal, скользящее окно 15 минут), а не из симулированных данных. Если за текущее 15-минутное окно в пуле нет сделок, сохраняется значение предыдущего цикла до следующего обновления (максимум 60 секунд) — подмены на часовые или суточные данные не происходит.

Пулы с ликвидностью ниже $1,000 и пулы, чей объём крутит один кошелёк (низкая доля уникальных покупателей), отфильтровываются до анализа.

**Pro тариф (заблокирован для бесплатных):**
- Слайдер порога всплеска (0% — 500%)
- Слайдер мин. ликвидности ($0 — $500K)
- Слайдеры границ дельты (диапазон давления покупок 0% — 100%)

**Система подсветки всплесков:**
- **Фиолетовая подсветка**: всплеск объёма >= 250% (рамка + свечение + фон)
- **Зелёная подсветка**: всплеск объёма >= 150% (цвет текста меняется на изумрудный)
- Ниже 150%: обычный белый текст без подсветки

### Модуль Киты

Модуль Киты обнаруживает и отображает движения крупных кошельков на основе **реальных on-chain сделок** (эндпоинт `/trades` GeckoTerminal по каждому пулу), очищенных четырёхступенчатым анти-шумовым фильтром до записи в кэш:

**Конвейер анти-шумовых фильтров (серверный, в памяти, один проход):**
1. **Минимальный порог**: сделка должна быть >= **$3,000** (по умолчанию; Pro-слайдер повышает порог). Мелкие сделки в кэш китов не попадают вообще.
2. **Анти-МЕВ / анти-арбитраж**: если один и тот же кошелёк покупает И продаёт один токен в пределах 60 секунд — обе стороны «туда-обратно» немедленно удаляются из кэша.
3. **Анти-накрутка объёма (wash trading)**: пойманный на «туда-обратно» кошелёк заглушается на 10 минут — все его сделки в этом окне игнорируются, цикличная накрутка объёма в ленту не попадает.
4. **Влияние на цену**: в ленту попадают только сделки, сдвинувшие цену пула минимум на **0.5%** (относительно цены предыдущей сделки того же пула). Бесплатный API GeckoTerminal не отдаёт поле `price_impact_percent`, поэтому влияние считается по сдвигу цены сделки (`usd / количество токенов`). Первая сделка окна отбрасывается консервативно (нет предыдущей цены для сравнения).

- **Лимит ленты**: 10 самых свежих алертов на выбранную сеть
- **Сортировка**: По свежести (последний timestamp первым), не по сумме в долларах
- **Данные алерта**: Символ токена, сеть, тип (покупка/продажа), реальная сумма в USD, реальное количество токенов, сумма в нативной валюте, **реальный адрес кошелька-инициатора сделки (из `tx_from_address`)**, кросс-чейн-тег, предупреждение о инсайдерском распределении
- **Ссылки**: каждый алерт ведёт на саму транзакцию в обозревателе цепочки (Tonviewer / BscScan / BaseScan) и на маршрут зеркальной торговли (STON.fi / PancakeSwap / Uniswap)
- **Авто-обновление**: Каждые 60 секунд
- **Адрес кита под Pro-замком**: адрес кошелька кита виден в заголовке карточки, но **его копирование требует подписку aDex Pro** — бесплатный пользователь по нажатию на иконку копирования видит окно покупки Pro вместо буфера обмена; адрес контракта токена остаётся бесплатным для копирования.

### Модуль Сканер

Модуль Сканер аудирует любой адрес контракта, вставленный пользователем.

**EVM-сети (BSC, BASE) — GoPlus Security API:**
- Обнаружение honeypot
- Статус и процент LP-лока
- Анализ налогов на покупку/продажу
- Статус верификации контракта
- Проверка минтабельных токенов
- Обнаружение скрытого владельца
- Обнаружение dev-кластеров
- Общее количество холдеров и концентрация топ-холдера

**Сеть TON:**
- Обнаружение адреса админа джеттона через TonAPI
- Анализ концентрации топ-холдеров через TonAPI
- Обнаружение dev-кластера: флаг если админ держит >=10% или >=3 кошельков держат >=5%
- **Особенность архитектуры**: проверка LP-лока и автоматический анализ ханипота ограничены устройством TON (шардинг джеттонов). Сканер показывает отдельную плашку «Особенность TON» вместо ложного «Не заблокировано», а вердикт для TON-токенов ограничен уровнем `CAUTION / Ограниченные данные`.
- Риск-скор (0 — 100)

**Все сканы:**
- Риск-скор (0 — 100)
- Вердикт безопасности: `SAFE` / `CAUTION` / `DANGER` (TON-токены никогда не помечаются как `SAFE` — минимум `CAUTION` из-за ограниченных автоматических данных)
- Результаты сохраняются в таблицу `scanner_audit_logs` **с привязкой к пользователю** (`telegram_user_id`)
- **История сканирований**: последние 5 сканов текущего пользователя отображаются внизу экрана Сканера с сетевым бейджем, значками LP/ханипота и риск-скор

**Привязка флагов владения (GoPlus):**
- `ownerRenounced` определяется по реальному `owner_address` (нулевой адрес / 0x...dead — значит отказ от владения) — а не по несвязанным полям реентранси
- `canRenounce` определяется по `can_take_back_ownership`

**Политика отказа**: если GoPlus не вернул данные по EVM-контракту, скан **честно завершается ошибкой** — вердикт не выдумывается.

**Ограничение скорости:**
- Бесплатные: 10 сканов в день (скользящее окно 24ч)
- Бонусные сканы начисляются через реферальные ссылки
- Отслеживание в таблице `scan_limits`

### Модуль Профиль

Модуль Профиль реализует **слайдерный анти-спам паттерн** для настройки алертов:

- **Слайдер мин. транзакции кита**: $3,000 — $100,000 (шаг $1,000). Фильтрует алерты ниже порога.
- **Слайдер мин. скорости всплеска**: 0% — 1,000% (шаг 50%). Фильтрует алерты по объёму.
- **Тумблер безопасных пулов**: Авто-мьют алертов для токенов с разлоченным LP.
- **Авто-мьют по риску**: Заглушает уведомления для токенов с dev-кластером или honeypot-риском.

Все слайдеры **отключены** (размыты + pointer-events-none) для бесплатных пользователей и разблокируются только для PRO-подписчиков.

**Подписка:**
- Бесплатный план: Ограниченные сканы, нет Pro-фильтров, нет расширенных алертов
- Pro план: $9.90/мес — безлимитные сканы, Pro-фильтры радара, расширенная настройка алертов
- Оплата через TON (в Telegram Mini App) или EVM (редирект с десктоп-браузера)

### Модуль Партнёры

Модуль Партнёры реализует полную реферальную программу с уникальными кодами для каждого пользователя.

**Система реферальных кодов:**
- Каждый Telegram-пользователь получает уникальный реферальный код (формат: `aDEX-XXXX`) при первом обращении
- Коды хранятся в таблице `referral_codes` с уникальным ограничением на `telegram_user_id`
- Код генерируется на сервере через эндпоинт `/api/referral-stats`
- Формат ссылки: `https://t.me/aDEX_Live_Support_bot?start=aDEX-XXXX`

**Реальные данные (без заглушек):**
- **Всего приглашено**: Количество записей в `referral_claims` где `referrer_tg_id` совпадает с пользователем
- **Заработано**: Сумма из `partner_pending_balances` для пользователя
- **Ожидает выплаты**: Незаявленный эскроу-баланс из `partner_pending_balances`
- **Тир**: Автоматически присваивается по количеству рефералов (New / Silver / Gold / Platinum Partner)
- **Комиссия**: 20%

**Система эскроу:**
- Ожидающие комиссии хранятся в таблице `partner_pending_balances`
- Пользователь подключает TON-кошелёк через TonConnect для вывода средств
- Вывод инициирует перевод на привязанный адрес кошелька
- Баннер незаявленного баланса отображается при отключённом кошельке

### Модуль Поддержки (ИИ-агент)

ИИ-агент поддержки на базе Groq LLM (`openai/gpt-oss-120b` с фолбэком на `openai/gpt-oss-20b`).

**Определение языка:**
- Анализирует текст сообщения на наличие кириллицы — если обнаружена, отвечает на русском
- Фолбэк на поле `language_code` из Telegram
- Уважает фактический язык сообщения, а не только настройки Telegram

**Форматирование ответов:**
- Ответы разбиты на чётко разделённые секции с жирными заголовками
- Каждый заголовок включает 1-3 релевантных эмодзи (📊 Радар, 🐋 Киты, 🔍 Сканер)
- Ключевые фразы и важные термины выделяются жирным через Markdown
- Каждая секция — максимум 2-3 предложения
- Краткая строка-вступление перед первой секцией
- Заключительная строка или призыв к действию в конце
- Тон — вовлекающий и профессиональный, компаньон-трейдер, а не робот

**Контент-модерация:**
- ИИ-классификатор обнаруживает: коммерческий спам, внешние ссылки, токсичность, prompt-инъекции
- Автоматическое удаление сообщений и ограничение чата при нарушениях
- Rate limiting: 3 сообщения за 10 секунд, мьют 15 минут при превышении

**База знаний:**
- Хранится в таблице `support_knowledge_base` (Supabase)
- Поиск через нечёткий `ILIKE` по полю content
- Фолбэк на общие записи при отсутствии совпадений
- Двуязычные записи (EN/RU)

### Edge-уровневый DDoS-щит

Мидлварь (`middleware.ts`) реализует in-memory rate limiter на уровне Edge:

- **Порог**: 5 запросов в секунду на IP (или Telegram user ID).
- **Ответ**: HTTP 429 с заголовком `Retry-After: 1` и JSON-пейлоадом.
- **Область**: Все `/api/*` маршруты.
- **Управление памятью**: Rate-limit Map авто-очищает устаревшие записи при превышении 10,000 ключей.
- **Идентификация**: Использует `x-telegram-user-id`, при отсутствии — `x-forwarded-for` / `x-real-ip`.

### Комплаенс-гард по окружению

Терминал определяет среду запуска и адаптирует платёжный поток:

- **Telegram Mini App**: Показывает кнопку оплаты TON для PRO-подписки. Реферальные данные видны и выводимы через TON Connect.
- **Десктоп-браузер**: Скрывает реферальные данные TON. Показывает нативный EVM-платёжный терминал с редиректом в Telegram-бота для оплаты через MetaMask/Coinbase Wallet.

### Серверный конвейер данных

Серверный кэш управляется `selectors/apiConfig.ts`:

- **Источник**: GeckoTerminal API v2 — эндпоинты `trending_pools` + `trades` по пулам для TON, BSC и Base.
- **Обновление**: одна сеть за 60-секундный цикл (ротация TON → BSC → Base), суммарная частота запросов остаётся в лимите бесплатного API (~30 запросов/мин).
- **Цепочка кэша (без мок-фоллбэка)**: живые данные → кэш в памяти → снимок БД `radar_cache` → пустое состояние. При временной недоступности внешнего API пользователь видит **предыдущие реальные результаты** до следующего обновления — симулированные данные не показываются никогда. Массивы мок-данных полностью удалены из кодовой базы.
- **Удержание китов**: скользящее окно 24ч, максимум 150 алертов.
- **Клиентский поллинг**: Клиент опрашивает `/api/radar` каждые 60с.
- **Переключение на Pro API**: при наличии `PRO_COINGECKO_API_KEY` внутренний цикл опроса отключается и данные отдаёт Pro-эндпоинт.

### Схема базы данных

Все таблицы используют Supabase с включённым Row Level Security (RLS):

| Таблица | Назначение |
|---------|-----------|
| `scanner_audit_logs` | Хранит результаты аудита контрактов и ИИ-вердикты |
| `scan_limits` | Дневной лимит сканов на пользователя с бонус-сканами |
| `referral_claims` | Записи о реферальных claim-ах (реферер + реферал) |
| `referral_codes` | Уникальный реферальный код на Telegram-пользователя |
| `partner_pending_balances` | Эскроу-леджер ожидающих комиссионных выплат |
| `scout_registrations` | Доступ scout-pass (макс 10 пользователей, до 30 ноя 2026) |
| `user_subscriptions` | Тир подписки и срок действия Pro |
| `support_knowledge_base` | Двуязычные записи БД для ИИ-агента |
| `chat_rate_limits` | Ограничение скорости сообщений для чата поддержки |
| `radar_cache` | Серверный снимок кэша радар/кит-данных |

### Безопасность

- Все секреты (Supabase service role, Telegram bot tokens, Groq API key, Pro CoinGecko key) доступны только через `process.env`.
- Сканер реализует **дедупликацию запросов** через pending-request Map.
- Вебхуки валидируют Telegram-пейлоады и применяют AI-модерацию с авто-ограничением чата.
- RLS-политики включены на всех таблицах с проверкой владельца.
- Реферальные коды генерируются на сервере с уникальностью, гарантируемой ограничением БД.

### Технологии

- **Фреймворк**: Next.js 14 (App Router, Edge + Node.js)
- **Стили**: Tailwind CSS + shadcn/ui
- **Бэкенд**: Supabase (Postgres, RLS, Edge Functions)
- **Внешние API**: GeckoTerminal, GoPlus Security, Groq LLM, Telegram Bot API, TonAPI
- **Кошелёк**: TonConnect UI React
- **Язык**: TypeScript (strict mode)

---

<p align="center">
  <sub>aDEX Terminal — Built for TON Foundation & BNB Chain Builder Grant programs.</sub>
</p>
