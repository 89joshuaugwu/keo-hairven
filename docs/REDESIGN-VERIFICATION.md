# KEO Hairven v0.19.0 — verification

Date: 1 November 2026.

## Executed checks

| Check | Result |
| --- | --- |
| `npm ci --no-audit --no-fund` | Installed successfully. No new runtime dependencies added. |
| `npm run typecheck` | Passed. |
| `npm test` | 26 passed, 0 failed, 0 skipped. |
| `npm run build` | Passed: optimized Next.js compilation, TypeScript, 34 generated static pages and complete route manifest. |
| Frontend design static audit, strict mode | 0 reported findings. This static check does not prove runtime accessibility or integrations. |
| Fresh code review | Completed; concrete findings corrected. |
| Browser: static desktop home | Inspected settled typography, photography, header, hero, collection entry and contrast. No page overflow at 1363px. |
| Browser: static phone home | Inspected at nominal 390px and 320px iframe widths; no remaining horizontal overflow after smallest-width adjustments. |
| Browser: static tablet home | Nominal 768px iframe width; no horizontal overflow. |
| Browser: supporting public routes | Products, About, FAQ, Collections and Contact inspected at nominal 390px; no page overflow. |
| Browser: same-page collection link | Static anchor navigated to the collection edit correctly. |
| Local font/media paths | Fonts, licenses, logo and campaign assets present; browser loaded the inspected images. |

The preview iframes reserve a 10px scrollbar, so their measured content widths are 310/380/758px. This is slightly narrower than the named outer widths.

## Original test failures investigated
The untouched upload independently reproduced six failures, with 20/26 passing. Its handoff already noted stale inherited test fixtures:
- Category rename and duplicate-name cases still used the removed `wigs` product category.
- Category deletion/revision service cases also referenced that old registry entry.
- Two product lifecycle cases indexed a starter preview array that is intentionally empty for KEO.

Updated fixtures to current `bone-straight` categories. Product lifecycle tests now start with explicit in-memory published KEO fixtures and verify actual trash→purge and restore→draft→public projection behavior. They do not add products to the storefront or relax production invariants. All 26 pass.

## Review and corrections
A fresh reviewer checked menu lifecycle, motion, CSS and data preservation. Corrected the hidden-section hero anchor, missing Lookbook heading id, About video controls and a retained keyframe transform that suppressed hover. Browser inspection then found footer overflow below 360px and insufficient contrast for unconfigured Contact text; both corrected and rechecked.

## What browser QA proves
The managed preview daemon passes Vite-only `--host` and `--strictPort` options to the existing `next dev` script, which Next.js rejects. The application script was preserved. Instead, a separate disposable static QA mirror copied the successfully built HTML, CSS and public assets. Optimized image URLs were resolved to the original local assets, and application scripts were omitted. This allowed real-browser inspection of rendered composition, responsive CSS, readable text and anchor navigation without altering the delivered application.

The mirror is not shipped as the application. It cannot validate hydrated menu interaction, reveal observers, video controls, client-side filters, contact submission, dynamic gallery data, authentication, Firestore or Cloudinary. Those flows were reviewed in code and the relevant existing data tests ran, but full live end-to-end interaction coverage is **not claimed**. Reduced-motion branches were reviewed in source; an OS/browser emulation matrix was not executed.

## Runtime and deployment
Verification ran in the available Node 24.22.1 environment. The project still declares Node 22.x, as in the upload. npm reports an engine mismatch and the pre-existing native Node test runner reports a typeless-module warning; these did not prevent successful checks. No unsupported claim about a Node 22 run is made.

No production deployment was performed. No live messages, product writes, payments, admin mutations or external uploads were exercised. Continue on the existing Next.js host, restore local environment configuration, and test the live enquiry/catalogue/admin flows before production release. Authentic KEO media and verified business contact information remain launch content requirements.

## Delivery
The ZIP contains full source, font licenses, updated design context, audit/design spec, detailed plan and this evidence. It excludes `.env.local`, private key files, dependencies, build outputs, Git internals and temporary QA materials. The original upload remains unchanged.

## Final code and AI pass
Final TypeScript check and all 26 tests passed again. Local asset reference scan found no missing referenced assets. Comparison with the upload found no unexpected changes in existing API/domain implementations (only intended default editorial copy in site-content.ts). AI widget, disabled chat endpoint and admin provider implementation are byte-identical to the upload; see AI-ASSISTANT-AUDIT.md.
