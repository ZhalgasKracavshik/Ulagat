# Ulagat — DevSecOps аудит и Defense-in-Depth (по состоянию на 01.07.2026)

Стек: **Next.js 16 (App Router) на Vercel + Supabase (Postgres/GoTrue/Storage) + Stripe**. ИИ в приложении **не интегрирован** (ментор из плана не реализован, флаги `career`/`premium` выключены). Документ грунтован на реальном коде репозитория, а не на общих советах.

Легенда статусов:
- **[OK]** — уже реализовано и проверено.
- **[PATCH]** — готовый патч ниже, требует применения/тестов/зависимости.
- **[DASHBOARD]** — настраивается в панели Vercel/Supabase, кодом не покрывается.
- **[N/A]** — не относится к нашей архитектуре (делегировано платформе). Указано честно, чтобы не создавать ложное чувство защиты.

---

## Блок 0. Честная модель угроз под нашу архитектуру

Мы Serverless/BaaS. Классический «периметр сервера» (Nginx/Slowloris/TLS-конфиг) **нам не принадлежит** — им управляют Vercel и Supabase (см. блок 4). Реальная поверхность атаки:

1. **БД напрямую через PostgREST** (anon-ключ публичен) → единственный рубеж это **RLS**. Это наш главный фронт.
2. **Serverless-функции / Route Handlers / Server Actions** → авторизация в коде (BOLA/IDOR).
3. **Supabase Auth (GoTrue)** → сессии, MFA, брутфорс логина.
4. **Клиент** → XSS/CSP, кража сессии.
5. **Цепочка поставок** → npm-зависимости (недавно добавлен `exceljs`; сознательно НЕ взяли устаревший `xlsx` из-за прототип-полют CVE).

---

## Блок 1. Безопасность Supabase и защита данных (уровень БД)

### 1.1 RLS против IDOR/BOLA — наш главный рубеж [OK + PATCH-шаблон]

Единственная настоящая защита строк — RLS, потому что anon-ключ публичен и любой может дёргать PostgREST напрямую, минуя наш фронт и middleware. Проверено живыми атаками в этом проекте:

- `profiles UPDATE` имеет `with_check`, который **пиннит `role` и `external_skud_id` к текущим значениям** — самоэскалация роли и подмена СКУД на своей строке невозможны; `qual (auth.uid() = id)` режет чужие строки.
- `substitutions INSERT` — `with_check` = роль ∈ (moderator,admin) **И** `created_by = auth.uid()` (нельзя ни вставить не-стаффу, ни подделать автора).
- Найден и закрыт антипаттерн **дублирующих permissive-INSERT-политик** (лишняя политика «Auth users can create X» с проверкой только `auth.uid()=owner_id`), которая OR-комбинировалась с ролевой и позволяла любому авторизованному создавать активный контент в обход модерации (events, services).

**Канонический шаблон безопасной таблицы (копировать для новых таблиц):**

```sql
alter table public.some_entity enable row level security;
-- ВАЖНО: force RLS, чтобы даже владелец таблицы (не считая service_role) подчинялся политикам
alter table public.some_entity force row level security;

-- SELECT: только авторизованные; при необходимости сузить до владельца/класса
create policy "read_authenticated" on public.some_entity
  for select to authenticated using (true);

-- INSERT: роль-гейт + запрет подделки владельца (anti Mass-Assignment на уровне БД)
create policy "insert_owner_staff" on public.some_entity
  for insert to authenticated
  with check (
    owner_id = auth.uid()
    and exists (select 1 from public.profiles p
                where p.id = auth.uid() and p.role = any (array['moderator','admin']))
  );

-- UPDATE: только своя строка И запрет менять чувствительные поля (пример: status/owner_id)
create policy "update_own_locked" on public.some_entity
  for update to authenticated
  using (owner_id = auth.uid())
  with check (
    owner_id = auth.uid()
    and status = (select s.status from public.some_entity s where s.id = some_entity.id)
  );

create policy "delete_own_or_staff" on public.some_entity
  for delete to authenticated
  using (owner_id = auth.uid()
         or exists (select 1 from public.profiles p
                    where p.id = auth.uid() and p.role in ('moderator','admin')));
```

**Правила, которые уже соблюдаем и должны соблюдать всегда:**
- Ровно **одна** permissive-политика на команду на таблицу для каждой роли-набора. Две permissive-политики OR-комбинируются — это дыра. Если нужны «И»-условия, используйте `restrictive`-политики.
- Никогда не полагаться на middleware/клиент для авторизации данных — только RLS + серверная проверка. Middleware у нас read-only и его можно обойти прямым вызовом PostgREST.
- Роль-проверки внутри политики через `exists(select 1 from profiles ...)`, а не через JWT-claim (у нас роль хранится в `profiles`, не в claim — так проще и без рекурсии).

**Регулярная проверка (в CI или руками):** таблиц без RLS быть не должно.

```sql
-- Должно вернуть 0 строк:
select relname from pg_class c
join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relkind='r' and c.relrowsecurity = false;
```

### 1.2 Adversarial-тест RLS (запускать после каждой миграции политик) [OK]

Мы используем безопасный приём: `DO`-блок с `set_config('request.jwt.claims', ...)` + `SET LOCAL role authenticated`, серия атак, и `RAISE EXCEPTION` в конце — транзакция откатывается, ничего не персистится. Пример проверенной батареи (ученик атакует `profiles`):

```sql
DO $$
DECLARE v_student uuid; v_other uuid; v_res text := E'\n'; v_n int;
BEGIN
  SELECT id INTO v_student FROM profiles WHERE role='student' LIMIT 1;
  SELECT id INTO v_other  FROM profiles WHERE id <> v_student ORDER BY created_at LIMIT 1;
  PERFORM set_config('request.jwt.claims', json_build_object('sub',v_student,'role','authenticated')::text, true);
  SET LOCAL role authenticated;
  BEGIN UPDATE profiles SET role='admin' WHERE id=v_student;
        v_res := v_res||'self->admin NOT BLOCKED'||E'\n';
  EXCEPTION WHEN others THEN v_res := v_res||'self->admin BLOCKED'||E'\n'; END;
  BEGIN UPDATE profiles SET role='admin' WHERE id=v_other;
        GET DIAGNOSTICS v_n=ROW_COUNT; v_res := v_res||'other->admin rows='||v_n||E'\n';
  EXCEPTION WHEN others THEN v_res := v_res||'other->admin ERROR'||E'\n'; END;
  RESET role;
  RAISE EXCEPTION 'ROLLBACK_REPORT:%', v_res;  -- всё откатывается
END $$;
```

Ожидаемо: `self->admin BLOCKED`, `other->admin rows=0`. Именно это мы и наблюдали.

### 1.3 Service Role Key vs Anon Key — где что можно [OK]

- **`SUPABASE_SERVICE_ROLE_KEY`** — обходит RLS. Живёт только в `lib/supabase/admin.ts` (`createAdminClient`), который импортируется **исключительно** из Server Actions / Route Handlers / Server Components. `autoRefreshToken:false, persistSession:false`. Никогда не в клиентском бандле, никогда не в `NEXT_PUBLIC_*`.
  - Правило-инвариант: искать в CI `SERVICE_ROLE` в любом `"use client"`-файле и падать, если найдено (см. блок 5, CI-guard).
- **`NEXT_PUBLIC_SUPABASE_ANON_KEY`** — публичный по определению, попадает в браузер. Его «секретность» нулевая; вся защита — RLS. Использовать в `lib/supabase/client.ts` (браузер) и `server.ts` (SSR с куками пользователя).
- При использовании service-role для записи после проверки прав в коде — паттерн «authorize with request-client, write with admin-client» (мы так делаем в `updateUserRole`/`updateUserSkudId`): роль подтверждаем запрос-клиентом (RLS видит пользователя), а сам write делаем admin-клиентом, потому что RLS профилей own-row-only.

### 1.4 Шифрование PII — честная инженерная оценка [PATCH, точечно]

**Что уже есть:** Supabase шифрует данные at-rest на диске (AES-256) и in-transit (TLS). Пароли и e-mail хранятся в `auth.users` под управлением GoTrue, недоступны через наши таблицы. Наш PII в `profiles`: `full_name`, `grade`, `class_letter`, `avatar_url`, `external_skud_id`.

**Честно:** column-level шифрование через `pgcrypto` ломает `where`/индексы/`order by` и переносит управление ключом в приложение. Для имён и класса, которые нужны в фильтрах и join-ах (адресация замен по `grade+class_letter`), это **вредно** — потеряете RLS-фильтрацию и производительность. Поэтому шифруем **точечно** только то, что (а) действительно чувствительно и (б) не участвует в фильтрах.

Кандидат №1 — `external_skud_id` (идентификатор пропуска/турникета). Паттерн через **Supabase Vault** (ключ в Vault, а не в коде):

```sql
create extension if not exists supabase_vault;         -- Vault для секретов/ключей
-- один раз кладём ключ шифрования в Vault (через Studio → Vault, не в SQL-файл в гите)
-- select vault.create_secret('base64-32-byte-key', 'skud_enc_key');

-- шифрование при записи (в SECURITY DEFINER функции, вызываемой только staff)
create or replace function public.set_skud(p_user uuid, p_plain text)
returns void language plpgsql security definer set search_path=public,vault as $$
declare k text;
begin
  if not exists (select 1 from profiles where id=auth.uid() and role='admin') then
    raise exception 'forbidden';
  end if;
  select decrypted_secret into k from vault.decrypted_secrets where name='skud_enc_key';
  update profiles
    set external_skud_id = encode(
      pgp_sym_encrypt(coalesce(p_plain,''), k), 'base64')
    where id = p_user;
end $$;
```

Для секретов приложения (Resend/Stripe/CRON) — они **не в БД**, а в Vercel Env (см. блок 2.3). Vault нужен только если хотите держать серверные ключи внутри Postgres.

**Пост-квантовая криптография [N/A на уровне приложения]:** гибридный обмен ключами (X25519MLKEM768) обеспечивает TLS-терминация Vercel/Cloudflare Edge — это уже дефолт на периметре в 2025–2026. На уровне нашего кода PQC внедрять нечего и не нужно; «шифровать PII пост-квантовыми алгоритмами в строках БД» — маркетинговый миф для нашего кейса.

---

## Блок 2. Vercel / Edge — API и сеть

### 2.1 Rate Limiting на Edge (анти ИИ-брутфорс, анти-парсинг, анти Wallet-DDoS) [PATCH]

Сейчас rate-limit **отсутствует** — это реальный пробел (брутфорс логина/инвайт-кода, парсинг `users/search`). Так как у нас нет своего сервера, лимитируем в `middleware.ts` на Edge через распределённый счётчик. Нужен стор: **Upstash Redis** (`@upstash/ratelimit`) или Vercel KV.

```bash
npm i @upstash/ratelimit @upstash/redis
# Vercel env: UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN
```

`lib/security/rate-limit.ts`:

```ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

// Разные бюджеты под разный риск. Sliding window — честнее fixed.
export const limiters = {
  // Логин/регистрация/инвайт: очень жёстко (анти ИИ-брутфорс)
  auth:  new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(8, '1 m'),  prefix: 'rl:auth',  analytics: true }),
  // Поиск/перечисление сущностей: анти-парсинг
  read:  new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(60, '1 m'), prefix: 'rl:read' }),
  // Тяжёлые/дорогие эндпоинты (будущие ИИ, письма): анти Wallet-DDoS
  spend: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(20, '1 h'), prefix: 'rl:spend' }),
};

export function clientKey(req: Request): string {
  // Vercel проставляет реальный IP; берём первый из x-forwarded-for
  const xff = req.headers.get('x-forwarded-for') ?? '';
  return xff.split(',')[0].trim() || 'unknown';
}
```

Врезка в `middleware.ts` (в начало, до ролевых проверок):

```ts
import { limiters, clientKey } from '@/lib/security/rate-limit';

const RL_RULES: { test: (p: string) => boolean; limiter: keyof typeof limiters }[] = [
  { test: p => p.startsWith('/login') || p.startsWith('/register') || p.startsWith('/api/'), limiter: 'auth' },
  { test: p => p.startsWith('/api/users/search'), limiter: 'read' },
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const rule = RL_RULES.find(r => r.test(pathname));
  if (rule) {
    const { success, limit, remaining, reset } = await limiters[rule.limiter].limit(clientKey(request));
    if (!success) {
      return new NextResponse(JSON.stringify({ error: 'Too many requests' }), {
        status: 429,
        headers: {
          'content-type': 'application/json',
          'retry-after': String(Math.ceil((reset - Date.now()) / 1000)),
          'x-ratelimit-limit': String(limit),
          'x-ratelimit-remaining': String(remaining),
        },
      });
    }
  }
  // ... существующая логика updateSession + ролевые проверки ...
}
```

Скоринг «подозрительности» (простая эвристика без ML): отсутствие `accept-language`/нестандартный `user-agent` + всплеск 4xx с одного IP → понижаем лимит на этот ключ (второй, более узкий limiter по `rl:suspect:<ip>`). ИИ-боты часто ходят без реалистичных заголовков.

### 2.2 Заголовки безопасности и CSP [OK частично + PATCH]

Уже стоят в `next.config.ts`: `Strict-Transport-Security` (2 года, includeSubDomains, preload), `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`. **Нет CSP** — главный недостающий рубеж против XSS/кражи сессии.

Правильный способ для Next 16 App Router — **nonce-based CSP через middleware** (статический CSP ломает inline-скрипты Next). Готовый патч:

```ts
// в middleware.ts, формируем nonce и заголовки на каждый ответ
const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
const supabaseHost = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).host;
const csp = [
  `default-src 'self'`,
  `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://js.stripe.com`,
  `style-src 'self' 'unsafe-inline'`,               // Tailwind рантайм-стили; ужать позже до nonce
  `img-src 'self' data: blob: https://${supabaseHost} https://*.supabase.co`,
  `font-src 'self' data:`,
  `connect-src 'self' https://${supabaseHost} https://*.supabase.co https://api.stripe.com`,
  `frame-src https://js.stripe.com https://hooks.stripe.com`,
  `frame-ancestors 'none'`,           // сильнее X-Frame-Options
  `base-uri 'self'`,
  `form-action 'self'`,
  `object-src 'none'`,
  `upgrade-insecure-requests`,
].join('; ');

const res = /* ваш NextResponse */;
res.headers.set('content-security-policy', csp);
res.headers.set('x-nonce', nonce);   // прокидывается в layout для <Script nonce>
```

Внедрять поэтапно: сначала `content-security-policy-report-only` + отчёты, убедиться, что ничего не сломалось (Stripe, Supabase realtime, картинки), затем переключить в enforce. Требует правки `app/layout.tsx` для проброса nonce в next/script. **Не применяю автоматически — высокий риск сломать рендер, нужен прогон.**

Дополнительно (низкий риск, применяю сразу — см. блок «Применённые патчи»): `Permissions-Policy`, `X-Permitted-Cross-Domain-Policies`, `Cross-Origin-Resource-Policy`.

### 2.3 CORS [N/A/OK]

Приложение **same-origin**: фронт дёргает свои же роуты того же домена. Отдельный CORS не нужен и не настроен — это правильно (нет `Access-Control-Allow-Origin: *`). Если появится внешний потребитель API, allowlist строго по Origin:

```ts
const ALLOW = new Set(['https://ulagat.vercel.app']);
const origin = req.headers.get('origin');
if (origin && ALLOW.has(origin)) {
  res.headers.set('Access-Control-Allow-Origin', origin);   // никогда '*'
  res.headers.set('Vary', 'Origin');
}
```

Webhook Stripe (`/api/webhooks/stripe`) обязан проверять подпись `stripe-signature` (`stripe.webhooks.constructEvent`) — это не CORS, но это критичный API-рубеж; убедиться, что реализовано.

### 2.4 Env-переменные в Vercel [DASHBOARD]

- Секреты (`SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `RESEND_API_KEY`, `CRON_SECRET`, `UPSTASH_*`) — **без** префикса `NEXT_PUBLIC_`. Только `NEXT_PUBLIC_SUPABASE_URL` и `NEXT_PUBLIC_SUPABASE_ANON_KEY` публичны.
- Разделять Production / Preview / Development. Preview-деплои не должны иметь прод-ключей Stripe/Resend.
- Ротация: при любой утечке — ротировать `SERVICE_ROLE_KEY` в Supabase и Stripe-ключи; они не в гите, но могут утечь через логи.
- В логи никогда не печатать значения env.

### 2.5 «Периметр» (Nginx/TLS 1.3/Slowloris) [N/A — управляет Vercel]

TLS 1.3, отключение старых версий, защита от Slowloris/медленных атак и терминация PQC — это Vercel Edge (на базе Cloudflare). Своего reverse-proxy у нас нет, конфиг Nginx/Envoy писать некуда и не нужно. Что в нашей власти: HSTS+preload (есть), домен в [hstspreload.org](https://hstspreload.org), включить в Vercel «Attack Challenge Mode» при инциденте.

---

## Блок 3. Безопасность интегрированного ИИ [N/A сейчас + PATCH на будущее]

**Честно: в приложении сейчас нет ни одного ИИ-эндпоинта** (в `package.json` нет `@ai-sdk`/`anthropic`/`openai`; ментор из плана не реализован). Поэтому Prompt Injection/джейлбрейк/утечка системного промпта сейчас **неприменимы** — защищать нечего. Ниже — готовый guard-модуль на момент, когда ИИ появится, чтобы не внедрять его «на живую» без защиты.

```ts
// lib/ai/guard.ts — применять ДО и ПОСЛЕ вызова модели
const INJECTION = [
  /ignore (all|previous) instructions/i,
  /system prompt|developer message/i,
  /reveal (your )?(instructions|prompt|system)/i,
  /\bDAN\b|jailbreak/i,
];

export function screenUserInput(text: string): { ok: boolean; reason?: string } {
  if (text.length > 8000) return { ok: false, reason: 'too_long' };
  for (const re of INJECTION) if (re.test(text)) return { ok: false, reason: 'injection_pattern' };
  return { ok: true };
}

// Выход модели НИКОГДА не рендерить как HTML. Всегда как текст.
// Если нужен markdown → рендерить санитайзером с allowlist, без raw HTML,
// и с той же CSP (никаких inline-обработчиков из ответа модели).
export function sanitizeModelOutput(text: string): string {
  return text
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*')/gi, '')  // on* handlers
    .replace(/javascript:/gi, '');
}
```

Ключевые правила будущего ИИ (Defense in Depth):
- **Никогда** не подставлять пользовательский текст в системный промпт; данные — только в отдельном user-message, инструкции — только серверные.
- Модель не имеет прямого доступа к БД. Любой tool-call проходит те же RLS/серверные проверки прав, что и обычный запрос (ИИ не привилегированный субъект).
- Выход модели = недоверенные данные (Indirect XSS): рендер только как текст/санитайзенный markdown, под CSP.
- Rate-limit `spend` (блок 2.1) для защиты от Wallet-DDoS (выжигание токенов).
- Логировать `input_tokens`/`output_tokens`, `refusal`, аномальные всплески (блок 5).

---

## Блок 4. Аутентификация и сессии (Supabase Auth) [DASHBOARD + OK + PATCH]

**Честно про пароли:** хеширование паролей выполняет Supabase GoTrue (bcrypt), а не наш код. Мы **не задаём** параметры Argon2id (`memory`/`parallelism`/`work factor`) — это возможно только при self-host GoTrue, а мы на управляемом Supabase. Поэтому «внедрить Argon2id с точными параметрами» в нашем кейсе — неверная постановка; правильные рычаги ниже.

- **[DASHBOARD] Leaked Password Protection** (Pwned Passwords / HaveIBeenPwned) — сейчас **выключено** (advisor `auth_leaked_password_protection`). Включить: Supabase → Auth → Passwords. Плюс min length ≥ 8/10.
- **[DASHBOARD] Токены:** Access JWT — короткий TTL (1 час), Refresh — с **ротацией** и reuse-detection (Supabase → Auth → Sessions): при повторном использовании отозванного refresh — инвалидация всей сессии (защита от кражи токена).
- **[OK] Куки:** через `@supabase/ssr` (`lib/supabase/server.ts` + `session.ts`) — `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`. `HttpOnly` защищает от кражи через XSS. `SameSite=Strict` теоретически строже, но ломает возвраты с внешних редиректов (OAuth/подтверждение почты) — для нашего email/pass-флоу `Lax` — верный дефолт; `Strict` вводить только осознанно.
  - **`Partitioned`/CHIPS [N/A]** — нужен только для сторонних куки в чужих iframe. Мы first-party, встраивания нет — не требуется.
- **[PATCH] MFA/2FA (TOTP) для admin/moderator** — Supabase Auth умеет из коробки. Enrollment:

```ts
// enroll
const { data } = await supabase.auth.mfa.enroll({ factorType: 'totp' });
// показать data.totp.qr_code; затем verify введённым кодом:
await supabase.auth.mfa.verify({ factorId: data.id, challengeId, code });
```

Энфорс AAL2 для админ-зоны (в `middleware.ts` для `/admin`):

```ts
const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
if (pathname.startsWith('/admin') && aal?.currentLevel !== 'aal2') {
  return NextResponse.redirect(new URL('/settings/security?mfa=required', request.url));
}
```

MFA для персонала — самая рентабельная мера против захвата админ-аккаунта (после включённого leaked-password protection).

---

## Блок 5. Цепочка поставок и мониторинг (DevSecOps)

### 5.1 SCA в CI/CD [PATCH — применяю сразу]

`.github/dependabot.yml` (авто-PR на уязвимые зависимости) + `.github/workflows/security.yml` (`npm audit` + запрет service-role в клиенте). Полные файлы — в применённых патчах ниже. Политика: PR блокируется при уязвимости уровня high/critical; Dependabot — еженедельно.

Дополнительно: `npm ci` с локфайлом (детерминированные сборки), периодически `npm audit signatures` (проверка подписей провенанса npm), не добавлять зависимости без проверки (кейс `xlsx` → `exceljs`).

### 5.2 Структурные security-логи для SIEM/WAF [PATCH — применяю сразу]

Единый JSON-логгер критических событий **без утечки PII** (id вместо email, хеш вместо значения). Пример события «подозрительная смена email»:

```json
{
  "ts": "2026-07-01T09:31:22.104Z",
  "level": "warn",
  "type": "security",
  "event": "email_change_attempt",
  "actor_id": "a1b2c3d4",
  "actor_role": "student",
  "ip": "203.0.113.7",
  "ua_hash": "9f2e...",
  "outcome": "flagged",
  "reason": "new_email_domain_mismatch",
  "request_id": "req_7fa1"
}
```

Никаких паролей, токенов, полных email, тел писем. Модуль-логгер — в применённых патчах ниже; вывод идёт в stdout (Vercel собирает в Log Drains → можно направить в SIEM/Datadog/Better Stack).

### 5.3 Топ-10 чек-лист перед публичным релизом (Vercel + Supabase, лето 2026)

1. **Supabase Advisors = 0 errors.** Сейчас: 0 ошибок, ~108 warn. Разобрать варны: включить **leaked-password protection**, проверить `public_bucket_allows_listing` (публичные бакеты позволяют листинг файлов — ограничить, если там не только публичные картинки).
2. **RLS включён на всех таблицах** (SQL-проверка из 1.1) + **force RLS** на таблицах с чувствительными данными.
3. **Service Role Key** только на сервере; CI-guard, что его нет в клиентских бандлах; ключ не в гите/логах.
4. **MFA включена и энфорсится** для admin/moderator (блок 4).
5. **Rate limiting** на `/login`, `/register`, инвайт, `/api/*` (блок 2.1).
6. **CSP** в enforce после прогона report-only; заголовки безопасности проверены (securityheaders.com рейтинг A).
7. **Env**: прод-секреты отделены от Preview; `CRON_SECRET` задан (иначе cron 500); Stripe в live-режиме с проверкой подписи вебхука; `RESEND_FROM_EMAIL` на верифицированном домене.
8. **Первый admin назначен вручную**, публичная саморегистрация роли ограничена `student|parent` (у нас так — enum в `signup` + триггер `handle_new_user` зажимает роль).
9. **Storage-политики**: бакеты (avatars/club-logos/lost-found/...) — публичное чтение только там, где нужно; запись — только владелец/staff; лимит размера/типа файла.
10. **Логи и алерты**: security-логи включены; Vercel Log Drains → SIEM; алерт на всплеск 401/403/429 и на `role_change`/`email_change`.

---

## Приложение: приоритеты внедрения

| Приоритет | Мера | Статус |
|---|---|---|
| P0 | Leaked-password protection + MFA для admin | [DASHBOARD] + [PATCH] |
| P0 | Rate limiting (login/invite/api) | [PATCH] нужен Upstash/KV |
| P1 | CSP (report-only → enforce) | [PATCH] нужен прогон |
| P1 | SCA в CI + security-логи | [PATCH] применены |
| P2 | Точечное шифрование `external_skud_id` через Vault | [PATCH] |
| P2 | Разбор Storage-политик и public-bucket listing | [DASHBOARD] |

RLS/BOLA-рубеж, разделение ключей, cron-секрет, HSTS/заголовки, ограничение саморегистрации роли — **уже [OK]** и проверены живыми атаками.
