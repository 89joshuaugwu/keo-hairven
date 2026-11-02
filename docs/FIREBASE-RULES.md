# Firebase / Firestore rules

The project includes `firestore.rules` and `firebase.json`.

The current architecture intentionally denies every direct browser Firestore read/write because:

- public data is resolved server-side;
- Admin CRUD uses protected Next.js API routes;
- server operations use Firebase Admin, which bypasses Firestore client rules;
- the browser uses Firebase directly only for Authentication.

Deploy once, and again whenever the rules file changes:

```bash
firebase deploy --only firestore:rules
```

Firebase Storage rules are not required because website media is managed through Cloudinary rather than Firebase Storage.
