# CoParent — Backend setup (Phase 2 & 3)

The app runs fully on-device today. This wires the hosted backend that enables
real accounts, cross-device sync, stored messages/attachments, the conversational
AI assistant, and subscriptions. Publishable keys (Supabase URL + anon key,
RevenueCat public key) are safe in the app; secrets (Anthropic key) live only on
the server.

## 1. Supabase (accounts, database, storage, sync)
1. Create a free project at supabase.com.
2. **SQL editor** → paste & run [`supabase/schema.sql`](../supabase/schema.sql).
3. **Storage** → create a private `attachments` bucket (for receipts/photos).
4. **Project Settings → API** → copy the **Project URL** and **anon public key**.
5. Add them to `.env.local` (see [`.env.example`](../.env.example)):
   ```
   VITE_SUPABASE_URL=...
   VITE_SUPABASE_ANON_KEY=...
   ```
6. Send those two values to me — I'll add `@supabase/supabase-js`, wire auth to
   the existing login screen, and move the data layer from localStorage to
   Supabase (with the on-device cache as the offline layer).

## 2. Conversational AI assistant (Claude)
1. Create an Anthropic API key.
2. Store it as a Supabase secret (never in the app):
   ```
   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
   supabase functions deploy assistant
   ```
   (function source: [`supabase/functions/assistant/index.ts`](../supabase/functions/assistant/index.ts))
3. The app calls this function for free-form questions and falls back to the
   on-device engine when offline.

## 3. Subscriptions (RevenueCat → Apple IAP / Play Billing)
1. App Store Connect → create auto-renewing subscriptions:
   `coparent_yearly` ($59.99/yr), `coparent_monthly` ($7.99/mo).
2. Create a free RevenueCat account, add the products, copy the **public SDK key**.
3. Send me the key — I'll add `@revenuecat/purchases-capacitor` and replace the
   demo entitlement in `src/lib/subscription.ts` with real purchases/restore.
   (iOS requires Apple IAP for digital subscriptions — Stripe is not allowed here.)

## Order of operations
Supabase first (unlocks accounts/sync + the assistant), then RevenueCat (paywall).
