import { existsSync } from 'node:fs';
import { cert, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
if (existsSync('.env.local')) process.loadEnvFile('.env.local');
const args = process.argv.slice(2);
const value = flag => { const index = args.indexOf(flag); return index >= 0 ? args[index+1] : undefined; };
const email = value('--email'); const role = value('--role');
if (!email || !['owner','editor'].includes(role)) {
  console.error('Usage: npm run admin:grant -- --email your-email@example.com --role owner');
  process.exit(1);
}
const { FIREBASE_PROJECT_ID:projectId, FIREBASE_CLIENT_EMAIL:clientEmail, FIREBASE_PRIVATE_KEY:sourceKey } = process.env;
if (!projectId || !clientEmail || !sourceKey) { console.error('Configure your Firebase service account in .env.local first.'); process.exit(1); }
try {
  initializeApp({credential:cert({projectId,clientEmail,privateKey:sourceKey.replace(/\\n/g,'\n')})});
  const auth = getAuth(); const user = await auth.getUserByEmail(email);
  await auth.setCustomUserClaims(user.uid,{...user.customClaims,admin:true,role});
  console.log(`Granted ${role} access to the existing Firebase user. Sign out and sign in again to refresh the token.`);
} catch (error) {
  console.error(error?.code === 'auth/user-not-found' ? 'Create this user in Firebase Authentication first, then run this command again.' : 'Unable to grant access. Check the project, service account permissions and email. No credentials were printed.');
  process.exitCode=1;
}
