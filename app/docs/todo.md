# Daily Reflection App – Implementation Status

Status legend: ✅ Done · ⚠️ In Progress/Partial · ⭕ Not Started

## Navigation & Layout
- ✅ **Global header & week strip** – Month label opens calendar, chevron navigation and Today chip present, week strip reflects selected week with entry markers.
- ⚠️ **Full calendar view** – Sticky headers, gradient nav bar, and stacked months with previous/next prefetch now match spec; still consider long-list virtualization/momentum tweaks for final polish.

## Core Journaling Flows
- ✅ **One-sentence entry** – 220 grapheme limit enforced with live counter; save/upsert wired via `EntryStore`; status messaging (“Saved/Syncing/Offline”) in place.
- ✅ **Long-form entry (Premium/Trial)** – Extra section appears for premium plans, paywall fallback for free users, separate edit actions.
- ⚠️ **Paywall experience** – Basic route exists but needs content aligned with final copy/design and integration with billing/trial prompts.

## AI Feedback
- ✅ **Triggering & queueing** – Saving one-liner launches the Supabase function with loading/delayed states, jitter protection, and self-harm fallback; still keep an eye on retry timing during QA.
- ✅ **Content requirements** – Edge function enriches prompts with streak/mood context, enforces JSON schema, and trims to ≤320 chars; monitor real-model output for tone tune-ups.
- ✅ **Skeleton & “will appear shortly” UX** – Insight card now shows multi-row shimmer placeholders and improved delay messaging aligned with spec.

## Calendar & History
- ✅ **Week strip indicators** – Uses summaries with hasShort/hasLong markers.
- ✅ **Month summaries prefetch** – Calendar now loads previous/current/next month summaries up front to keep markers stable while scrolling.
- ⚠️ **Today highlight & accessibility** – Ensure aria labels announce “today / has entry”; confirm contrast tokens with design system.

## Account / Profile Area
- ✅ **Layout & navigation** – Plan card links into plan screen with logout confirmation modal; notifications route now reachable.
- ✅ **Name edit flow** – Supabase metadata updates with success/error states and cancel/back handling in place.
- ✅ **Email update flow** – Supabase change email flow wired with confirmation messaging and error handling.
- ⚠️ **Password update flow** – Re-auth + Supabase password update implemented; add strength meter, rate limiting UX, and analytics.
- ✅ **Profile refresh UX** – Auth store refreshes after edits and global success toasts confirm updates.
- ⚠️ **Notifications screen & logic** – UI scaffold exists; hook into Capacitor Local Notifications / email fallback.

## Billing & Entitlements
- ⚠️ **Plan gating** – Client checks `plan.canUseLongForm` & `plan.canRequestFeedback`; requires real profile data (trial countdown, upgrade CTA) and paywall integration.
- ⭕ **Upgrade / Restore flows** – Stripe / StoreKit interactions, RevenueCat integration, and plan card states not implemented.

## Offline & Sync
- ✅ **IndexedDB cache & queue** – Safe get/set with DOMException handling, optimistic updates, retry backoff, and online listeners implemented.
- ⚠️ **Conflict messaging** – Need user-facing notice for sync conflicts per SRS and persistence of losing versions for recovery.

## Export & Account Deletion
- ⭕ **Export data** – No UI or backend hook for signed URL generation yet.
- ⭕ **Delete account** – Missing confirmation flow and Supabase RPC wiring.

## Notifications & Reminders
- ⭕ **Reminder scheduling** – No logic for local notifications/email cron, anti-spam rules, or preference persistence.

## Analytics & Monitoring
- ⭕ **Instrumentation** – PostHog/Amplitude/Sentry events not wired.

## Accessibility & i18n
- ⚠️ **Localization** – Day/month labels use `Intl`, but copy isn’t internationalized; need i18n framework and RTL audit.
- ⚠️ **Focus/ARIA** – Basic aria-live on AI card; ensure all interactive elements have focus states ≥44px targets and screen reader labels (day chips currently rely on button + label but need explicit aria-label with entry status).

## Visual Polish (per Figma)
- ⚠️ **Spacing & tokens** – Many components approximate Figma but still require token audit (colors, rounding, typography).
- ⚠️ **Animations/micro-interactions** – Chevron transitions, calendar modal motion, AI card fade-ins still to do.

## Outstanding Technical Integrations
- ⚠️ **Supabase Edge function (generateFeedback)** – Function implemented with moderation, JSON response, and stale-write guard; needs production validation and error monitoring.
- ✅ **React refresh-ready contexts** – Context providers split from hooks/utilities so lint passes under fast refresh.
- ⭕ **Capacitor wrappers** – Mobile builds not configured; need plugin setup for storage, notifications, secure tokens.
- ⭕ **Testing & QA** – No automated unit/e2e coverage yet; tests specified in SRS pending.
