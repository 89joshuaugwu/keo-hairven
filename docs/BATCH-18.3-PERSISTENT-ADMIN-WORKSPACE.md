# Batch 18.3 — Persistent Admin workspace

## Why this change was needed
The Admin shell was previously rendered separately inside each page. Although most navigation used `next/link`, moving to another Admin route replaced the entire page tree, so the header/sidebar visibly remounted and felt like a full-page reload.

## Architecture
- `app/admin/layout.tsx` keeps shared admin metadata only.
- `app/admin/login/page.tsx` remains outside the workspace shell.
- `app/admin/(workspace)/layout.tsx` verifies the admin session and renders `AdminWorkspaceShell` once for the authenticated workspace.
- All normal Admin pages live under the `(workspace)` route group; route groups do not change the public URLs.
- Route-specific `loading.tsx` and `error.tsx` files stay beneath the workspace layout, so only the main content swaps/streams while the shell remains mounted.

## Navigation
All normal internal Admin navigation uses Next.js `Link`, which enables App Router client navigation and prefetching in production. Full document redirects are retained only at login/logout, where a clean authentication/session transition is intentional.
