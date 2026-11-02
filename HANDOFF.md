# KEO Hairven · v0.20.0

The complete Next.js application, including the storefront, protected admin studio and **KEO Muse** chatbot. Start here; older batch notes are historical and may describe retired Zara features.

## Run

1. Install Node **22.18+ or 24 LTS**.
2. Run `npm ci`.
3. Copy `.env.example` to `.env.local` and add credentials from your own accounts.
4. Run `npm run check:env`. It prints configuration status, never secret values.
5. Run `npm run dev` and open the printed URL.
6. Before deployment: `npm test`, `npm run typecheck`, `npm run build`.

## Activate the admin

- Create your Firebase project, web app and Firestore database. Deploy the included `firestore.rules` (deny direct client reads/writes; Next.js uses the Admin SDK).
- Enable Email/Password and/or Google in Firebase Authentication. Add localhost and your deployed domain to authorised domains.
- Create your admin user in Firebase Authentication. Choose either:
  - Add a **verified** email to `ADMIN_OWNER_EMAILS`. Unverified emails are intentionally denied.
  - Run `npm run admin:grant -- --email you@example.com --role owner` from a trusted machine using your service-account environment. It grants claims to an existing user; it does not create a user or password.
- Sign in at `/admin/login`. Use `--role editor` to grant a limited editor account. AI settings and the launch checklist remain owner-only.
- Owner navigation includes **Launch checklist** at `/admin/launch`. It shows environment presence and published-content status, with the action needed for each item. Presence does not prove provider connectivity.

## Activate KEO Muse

Choose either setup path:

- **Environment path:** set server-only `GEMINI_API_KEY` and `GEMINI_MODEL` (default `gemini-3.1-flash-lite`). Rebuild/redeploy as needed.
- **Admin path:** set `AI_KEYS_ENCRYPTION_KEY_BASE64` to 32 random bytes encoded as base64, then add/test an encrypted Gemini connection at `/admin/ai`. Keep the encryption key stable. The highest-priority enabled, decryptable saved key is primary. The environment key is recovery when configured; otherwise the next enabled saved key is recovery. Additional saved keys are standby until priorities or enabled states change. With no saved key, the environment key is primary.

Firebase server credentials and `SESSION_CSRF_SECRET` are required for durable usage limits. Without them, Muse gives saved public answers and contact links; it does not make unmetered model calls. The default shared daily cap is 50 provider attempts, editable by the owner. Each recovery attempt and owner test reply consumes this cap. At most two connections are attempted per question, each with a 9-second provider timeout. Connection health tests consume provider quota but do not use the public conversation cap.

The widget is mounted on public routes only. An owner can switch it off, edit the welcome message, test replies and manage keys. It uses published catalogue/business/FAQ/lookbook data; it cannot place an order, take payment, confirm stock or access private admin records. New conversations clear the local transcript. Application databases store usage counters, not raw chat text. Google/hosting retention is governed by the chosen provider terms/settings.

For stronger visitor throttling, configure `AI_TRUSTED_IP_HEADER` only when your host overwrites that header, and add a host/WAF rate rule for `/api/chat`. Without a trusted header, per-session limits are advisory because visitors can reset sessions; the global transactional cap still limits paid calls. Enable Firestore TTL for the `expiresAt` field on `aiRateLimits` to remove counters after their 36-hour retention window (TTL deletion is asynchronous).

## Publish your real business content

1. Add your Cloudinary credentials and verify an upload in **Media library**.
2. Publish your real WhatsApp contact, location and delivery note in **Business details**.
3. Add actual products, specifications/options, prices and approved product photos. Save as draft, review and publish.
4. Replace campaign imagery as desired in **Website content**; the moodboard's editorial images are in `components/MoodStudio.tsx` and collection imagery in `lib/collections.ts`. These remain explicitly inspiration, not stock.
5. Review FAQs, public copy and privacy information against your operating practices.

No invented products, prices, reviews, contact numbers, or payment checkout have been added. The catalogue becomes populated when you publish real items. Contact enquiries open WhatsApp for review and sending; the website does not email messages or store completed sales.

## Deploy

Use a **Node-capable Next.js host** such as your existing Vercel setup. Import this source, set the environment variables, run the normal `npm run build` command and deploy. Do not use a static-only export: admin APIs, authentication, chat and publishing need the server.

Set `NEXT_PUBLIC_SITE_URL` to the final HTTPS origin. Rebuild after changes to `NEXT_PUBLIC_*` values. Ensure browser and server Firebase project IDs match. Use production credentials only on the correct deployment.

For trash expiry, set `TRASH_CRON_SECRET` and schedule `GET /api/cron/trash` every five minutes using `Authorization: Bearer <secret>`. No scheduler is silently registered by this source package. Deploy Firestore rules and configure TTL separately in your own Firebase account.

## Final live check

Use `/admin/launch`: sign in as owner and editor, upload/save/publish an actual product, select an option publicly, send a test WhatsApp enquiry to yourself, test a Muse reply and fallback, review mobile/keyboard behavior, and confirm scheduled cleanup. Live external-provider tests require your accounts and are not claimed by this handoff.

## Design and evidence

- `docs/KEO-MUSE-AND-LAUNCH-PLAN.md` — audit, direction, implementation plan and progress.
- `DESIGN.md` and `UX-CONTRACT.md` — visual/interaction ownership.
- `docs/V020-VERIFICATION.md` — exact verification evidence and limits.
- `docs/AI-ASSISTANT-AUDIT.md` — current assistant status and inherited-code findings.

The package excludes `.env.local`, service-account keys, dependencies, build output and QA fixtures. Nothing has been deployed to production or connected to your external accounts by this work.
