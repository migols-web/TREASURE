# TREASURE
TREASURE is a web-based budget management system built to help class officers efficiently handle class funds. It enables real-time tracking of contributions, expenses, and overall balances, ensuring transparency and accountability within the class.

## Setup

1. Install dependencies:
   ```
   npm install
   ```
2. Copy `.env.example` to `.env` and fill in your Firebase web config values
   (Firebase Console → Project Settings → Your apps → SDK setup and config).
   `.env` is gitignored and will never be committed.
3. Run the dev server:
   ```
   npm run dev
   ```

## Deploying

```
npm run build      # builds to dist/, injecting values from .env
firebase deploy --only hosting
```

Or, in one step:
```
npm run deploy
```

Note: Firebase's client-side config values (including the "API key") are not
secret by design — they identify your project to the browser. Real protection
comes from your Firestore/Storage security rules, and optionally restricting
the API key to your domain in Google Cloud Console → APIs & Services →
Credentials. Keeping it out of `.env`/source control here is still good
hygiene (avoids leaking it in git history, makes per-environment configs
easy), but it isn't a substitute for locking down your security rules.
