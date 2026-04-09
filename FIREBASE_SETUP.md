# Firebase Setup — Jardim do Lago

This app uses **Firebase Firestore** (real-time database) and **Firebase Auth**
(email/password) so the schedule syncs across every device. Follow these steps
once, then never again.

---

## 1. Create the Firebase project

1. Go to https://console.firebase.google.com
2. Click **Add project** → name it `jardim-do-lago` (or anything you like)
3. Disable Google Analytics (you don't need it) → **Create project**

## 2. Enable Firestore

1. Left sidebar → **Build → Firestore Database**
2. **Create database**
3. Choose **Production mode** (we'll set rules in step 5)
4. Region: `southamerica-east1` (São Paulo) for lowest latency in Brazil
5. **Enable**

## 3. Enable Email/Password Authentication

1. Left sidebar → **Build → Authentication**
2. **Get started**
3. **Sign-in method** tab → click **Email/Password** → toggle **Enable** → **Save**
4. **Users** tab → **Add user**
   - Email: `ana@jardimdolago.local`
   - Password: choose a strong one (you'll use this to log in)
5. Click **Add user**

> **Important:** the email *must* be exactly `ana@jardimdolago.local`. The app
> hard-codes this value (see `src/firebase.js → ADMIN_EMAIL`). If you want a
> different email, change it in both places.

## 4. Register the web app

1. Project Overview (home icon) → click the **Web** icon `</>`
2. App nickname: `Jardim do Lago Web`
3. **Don't** enable Firebase Hosting (we host wherever)
4. **Register app**
5. Copy the `firebaseConfig` snippet — you'll paste it into `.env` next

## 5. Set Firestore Security Rules

1. Firestore Database → **Rules** tab
2. Replace the contents with:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /escalas/main {
      // Anyone can READ — the consultoras need this to view the schedule
      // via the public link without logging in.
      allow read: if true;

      // Only the admin (Ana) can WRITE.
      allow write: if request.auth != null
                   && request.auth.token.email == 'ana@jardimdolago.local';
    }

    // Block everything else by default.
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

3. Click **Publish**

## 6. Create the local `.env` file

In the project root, copy `.env.example` to `.env` and paste the values from
the Firebase config you copied in step 4:

```bash
cp .env.example .env
```

Then edit `.env`:

```
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=jardim-do-lago.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=jardim-do-lago
VITE_FIREBASE_STORAGE_BUCKET=jardim-do-lago.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

> The `.env` file is in `.gitignore` and never gets committed. ✅

## 7. Install dependencies + run

```bash
npm install
npm run dev
```

Open http://localhost:5173, log in as **Ana** with the password you set in
step 3.4. The first time you log in, the document is auto-created with the
default 2026 holidays.

## 8. (Optional) Restore the previous backup

If you have a backup JSON exported from the old localStorage version
(`backup-escalas-YYYY-MM-DD.json`), use the **Restaurar** button in the
sidebar. It will upload the entire payload to Firestore and overwrite the
defaults.

---

## Deploy to production

Make sure to set the `VITE_FIREBASE_*` environment variables in your hosting
provider (Vercel, Netlify, Firebase Hosting, etc.) — they're baked into the
client bundle at build time.

| Host | Where to set env vars |
|------|-----------------------|
| Vercel | Project → Settings → Environment Variables |
| Netlify | Site → Site settings → Build & deploy → Environment |
| Firebase Hosting | `.env` is read at build time, no extra step |

---

## Costs

The free **Spark plan** is more than enough for this use case:
- 50,000 reads/day
- 20,000 writes/day
- 1 GiB storage

The whole app uses ~1 read per consultora per session and a handful of writes
per day from the admin. You will not hit the limits.
