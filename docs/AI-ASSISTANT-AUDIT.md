# KEO Muse — current status, v0.20.0

The original uploaded application contained `AskZara.tsx`, an owner Gemini settings page, encryption helpers and chat presentation code. The widget was unmounted and `/api/chat` returned unconditional 503. These conditions predated the first redesign.

The new **KEO Muse** replaces that widget and is mounted from the root layout only on public routes. `/api/chat` now validates bounded requests, reads approved public data and calls the configured Gemini provider using a server-only key header. Owner-managed encrypted connections and an optional environment connection are supported. The admin menu now exposes `/admin/ai` for owners.

`lib/muse-core.ts` owns validation, prompt boundaries, saved-answer fallback and provider orchestration. `lib/muse-server.ts` owns public-context loading, provider requests and transactional global/visitor counters. Model output cannot execute tools or supply arbitrary clickable actions. Product cards exclude previews and respect explicitly requested lengths. The assistant cannot process purchases, confirm stock or access private admin content.

No provider credentials were added or live Gemini call claimed. Configure credentials as described in HANDOFF.md, then use the owner test-reply control. Without a usable provider, the public widget remains useful through labelled saved answers and contact/catalogue links. Disabling the assistant in Admin hides the launcher and blocks model replies.

Privacy: no application chat archive; browser messages remain in component memory. Gemini receives the question, bounded history and public context for AI replies. Usage counters contain a hash and counts, not chat text; configure TTL as documented. Provider-side retention depends on service terms/account settings.
