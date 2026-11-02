# Firebase Rules and Initial Content Migration

## Firebase rules

The project intentionally blocks direct browser Firestore access. Public/admin data access goes through Next.js server routes using Firebase Admin after the appropriate session checks.

Deploy the supplied rules with:

```bash
firebase deploy --only firestore:rules
```

Firebase Admin bypasses these client rules, so protected Admin APIs continue to read/write Firestore.

## Initial site data

The old archive-style backup workflow has been replaced by **Use current site content** in Admin → Business Details. That one-time action turns the content already shipped on the website into normal editable Firestore/Admin records and copies packaged media to Cloudinary when possible.

See `docs/CURRENT-SITE-CONTENT-IMPORT.md` for the migration behavior.
