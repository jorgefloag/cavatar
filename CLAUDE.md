# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

CAVATAR — a Next.js web app (Spanish-language, Mexico-focused) that turns a vehicle license plate into a digital mailbox. Anyone can look up a plate and read messages left for it, or send a message to a plate. Plate owners can "claim" their plate and, once approved, set a password to access their inbox. There's also a separate "verified profile" account system (email/password) that removes the anonymous rate limit on sending messages.

This codebase was originally scaffolded/edited via v0.app (see `generator: 'v0.app'` in `app/layout.tsx` and the `[v0]`-prefixed `console.log` calls scattered through client components — these are debug logs left from that workflow, not a required convention).

## Commands

```bash
pnpm dev      # start dev server (Next.js)
pnpm build    # production build
pnpm start    # run production build
pnpm lint     # eslint .
```

Package manager is pnpm (`pnpm-lock.yaml` present). There is no test suite configured in this repo.

Note: `next.config.mjs` sets `images.unoptimized: true`. `typescript.ignoreBuildErrors` is `false` (type errors fail `next build`), but running `tsc --noEmit` directly is still the faster feedback loop during development.

## Architecture

**Stack**: Next.js 16 (App Router) + React 19 + TypeScript, Tailwind CSS v4, shadcn/ui (New York style, Radix primitives under `components/ui/`), Neon (serverless Postgres) via Drizzle ORM, Clerk for the verified-profile auth system. All data access goes through Next.js Server Actions — there is no `app/api/`.

**Database**: `lib/db/schema.ts` defines the Drizzle schema (3 tables, see below); `lib/db/index.ts` exports the `db` client, built on `drizzle-orm/neon-http` + `@neondatabase/serverless` (HTTP driver — required for serverless/edge-style short-lived invocations, avoids exhausting Postgres connections). `drizzle.config.ts` at the repo root drives `drizzle-kit push` (schema is pushed directly, no migration files — deliberate while there's no production data; switch to `generate`+`migrate` once there are real users to protect). Both read `DATABASE_URL` from the environment.

**Data access pattern**: every route that needs the database defines a co-located `actions.ts` (e.g. `app/claim/actions.ts`, `app/inbox/actions.ts`, `app/send/actions.ts`, `app/verified/dashboard/actions.ts`, `app/verified/request/actions.ts`) with `"use server"` functions — one per mutation/query the page needs. Client components call these directly as async functions; nothing queries the database from the browser.

**Data model**:
- `claim_requests` — plate ownership claims: `plate_number` (unique), `email`, `vehicle_brand`, `status` (`pending` | `approved`), `password_hash` (bcrypt, null until the owner sets a password), `failed_attempts` / `locked_until` (server-side brute-force lockout on the password-entry step — 5 attempts, 5-minute lock).
- `messages` — messages sent to a plate: `plate_number`, `alias`, `message`, `contact`, `created_at`. (Column names are English throughout — an earlier Supabase-era inconsistency between `message`/`mensaje` and `contact`/`contacto` was resolved during the Neon migration; there is no bilingual column pair anymore.)
- `verified_requests` — verified-profile applications: `user_email` (unique), `full_name`, `phone`, `use_case`, `status` (`pending` | `approved` | `rejected`). Resubmitting (e.g. after a rejection) upserts on `user_email` rather than erroring.

**Auth**: Clerk handles only the "verified profile" identity (`app/verified/*` — email/password login that lifts the anonymous send rate limit). It does **not** touch the plate+password inbox-access mechanism, which is a per-resource secret, not a user account, and stays fully custom (hashed server-side, verified in `app/inbox/actions.ts`, never sent to the client). `proxy.ts` (Next.js's renamed `middleware.ts` convention) runs `clerkMiddleware()` so `auth()`/`currentUser()` work anywhere in the app; `lib/auth/current-email.ts` wraps that into a single `getCurrentUserEmail()` helper used by every Server Action that needs to know who's logged in — the client never supplies its own email to a mutation. Login/register (`app/verified/login`, `app/verified/register`) are built on Clerk's classic hook API imported from `@clerk/nextjs/legacy` (the package's newer default export switched to a "Signals" API in the version installed here; the legacy import path keeps the documented `useSignIn`/`useSignUp`/`isLoaded`/`setActive` shape) so the existing custom-styled forms didn't need to be rebuilt around Clerk's prebuilt UI. Registration has an extra email-verification-code step that the old fake-auth flow didn't have, because Clerk requires it by default.

**Three independent flows, all under `app/`**:
1. **Inbox flow** (`app/inbox/page.tsx`, client component + `app/inbox/actions.ts`): plate lookup → claim status branching (`no_claim` / `pending` / `setup_password` / `enter_password` / `inbox`) → message list. Wrapped in `Suspense` because it reads `useSearchParams` (supports deep-linking via `?plate=` from the hero form and `?focus=plate`).
2. **Claim flow** (`app/claim/page.tsx` + `app/claim/actions.ts`): plate + email + vehicle brand → inserted into `claim_requests` as `pending`, reviewed out-of-band (no admin UI in this repo — see Roadmap below).
3. **Send flow** (`app/send/page.tsx` + `app/send/actions.ts`): plate + optional alias/contact + message → inserted into `messages`. Anonymous senders are still rate-limited client-side to 3 messages/hour via `localStorage["cavatar_send_timestamps"]` (unchanged by the migration — still easily bypassed by clearing storage, still no server enforcement). Verified users bypass the limit; verification is checked server-side via `checkVerifiedStatus()`, which resolves identity through Clerk rather than trusting anything from the browser. Redirects to `/verified/login?returnTo=/send` and restores in-flight form data from `sessionStorage` after login (also unchanged).

The **verified-profile flow** (`app/verified/*`) is separate from the inbox/claim flow: `/verified` (landing) → `/verified/register` or `/verified/login` (Clerk-backed) → `/verified/request` (submit `verified_requests` application — a Server Component that gates on `auth()` and passes the Clerk-confirmed email down to a client form) → `/verified/dashboard` (Server Component that fetches application status server-side, renders a client view with a Clerk `signOut()` logout button).

**Styling**: `app/globals.css` is the active stylesheet (imported from `app/layout.tsx`, referenced by `components.json`'s `tailwind.css`). It defines a dark-first, bold/urban design system with a strong yellow accent (`--primary: #FFD600`) as CSS custom properties consumed by Tailwind v4's `@theme`. **`styles/globals.css` is dead code** — a leftover default shadcn/ui light theme that nothing imports; don't edit it expecting it to take effect, and prefer deleting it if doing cleanup.

Fonts: Inter (`--font-inter`, body/sans) and Roboto Mono (`--font-roboto-mono`, used for plate numbers, headings with `font-mono`, and UI labels), loaded via `next/font/google` in `app/layout.tsx`.

`components/ui/` is the shadcn/ui component library (57 generated primitives) — treat as vendored code; prefer composing over hand-editing unless fixing a real bug. `components/*.tsx` (hero, explanation, features, faq, footer) are the marketing landing-page sections composed in `app/page.tsx`.

Path alias: `@/*` maps to the repo root (see `tsconfig.json` and `components.json` aliases: `@/components`, `@/lib`, `@/ui`, `@/hooks`).

## Roadmap / known gaps

- **No admin panel.** Both `claim_requests` (plate ownership claims) and `verified_requests` (verified-profile applications) are approved out-of-band today — there's no UI in this repo for reviewing or approving/rejecting either one; it's done by hand directly against the database. Building an admin panel for both is a known pending feature, not part of the Supabase→Neon/Drizzle/Clerk migration.
