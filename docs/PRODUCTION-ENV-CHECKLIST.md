# Production ENV checklist

The app intentionally separates **infrastructure/bootstrap secrets** from **editable business/AI content**.

## Keep in Vercel ENV / `.env.local`

These values are infrastructure credentials and should not be stored in editable Firestore settings:

- `NEXT_PUBLIC_SITE_URL` — final public origin used by canonicals, sitemap and generated enquiry links.
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `CLOUDINARY_UPLOAD_PRESET` — optional.
- `AI_KEYS_ENCRYPTION_KEY_BASE64` — must remain stable or saved Gemini connections cannot be decrypted.
- `SESSION_CSRF_SECRET`
- `ADMIN_OWNER_EMAILS` / `ADMIN_EDITOR_EMAILS` — optional bootstrap fallback when custom claims are not yet used.

## Manage from Admin instead of ENV

These can change without redeploying:

- Gemini connection/API keys → `/admin/ai`
- Gemini model IDs → `/admin/ai`
- daily AI request cap → `/admin/ai`
- Ask Zara visibility/welcome message → `/admin/ai`
- brand/contact/location/waybill/social values → `/admin/settings`
- Homepage/About/CTA/FAQ copy and media → `/admin/content`
- products/gallery/services/media → their Admin workspaces.

## Before production launch

1. Set `NEXT_PUBLIC_SITE_URL` to the final deployed domain.
2. Confirm Firebase Authentication enables Email/Password and Google.
3. Confirm the owner account has the Firebase custom claim or is in `ADMIN_OWNER_EMAILS`.
4. Keep the Firebase Admin service account JSON out of Git; Vercel ENV credentials are preferred in production.
5. Confirm Cloudinary credentials are production values.
6. Keep `AI_KEYS_ENCRYPTION_KEY_BASE64` unchanged after AI connections have been saved.
7. Deploy `firestore.rules` with `firebase deploy --only firestore:rules`.
