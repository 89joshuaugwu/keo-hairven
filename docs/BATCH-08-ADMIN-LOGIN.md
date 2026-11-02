# Batch 08 — FAQ refinement + Admin Login

## Public refinements
- FAQ desktop category navigation now follows the category of the question being opened/read.
- Category links open the correct target question and smooth-scroll to it.
- Privacy long-form paragraphs use justified alignment with hyphenation/inter-word spacing for a cleaner reading block.

## Admin login routes
- `/admin/login`
- `/admin` (protected authentication gate only; full overview is a later batch)
- `POST /api/admin/session`
- `DELETE /api/admin/session`

## Firebase sign-in
The client uses the existing `NEXT_PUBLIC_FIREBASE_*` web configuration for Firebase Authentication.
Supported methods:
- Email + password
- Google provider
- Firebase password reset email

There is no sign-up/registration UI.

## Authorisation
Authentication alone is not enough. The server verifies the Firebase ID token and then requires either:
1. Firebase custom claims `{admin:true, role:'owner'|'editor'}`; or
2. an exact email match in server-only `ADMIN_OWNER_EMAILS` / `ADMIN_EDITOR_EMAILS`.

The allowlist is intended for bootstrap or deployments where claims have not yet been provisioned. It is never exposed to the browser.

## Session
After authorisation the server creates a five-day Firebase session cookie:
- HttpOnly
- Secure in production
- SameSite=Lax
- verified for revocation when protected server pages read it

A separate strict SameSite CSRF cookie is issued for the later admin mutation APIs. Session endpoints enforce same-origin/configured-origin checks.

## Password reset
The modal deliberately gives a generic success message even when Firebase rejects or does not recognise the submitted address. This avoids exposing account existence.

## Google setup note
Google sign-in must be enabled in Firebase Authentication and the deployed domain must be in Firebase Authentication's authorised domains. Enabling Google does not automatically grant admin access; the user must also pass the claims/allowlist check.
