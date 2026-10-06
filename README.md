# Learning Agent

An agentic tutor. Give it a topic and it writes a short lesson with a quiz,
has a second model call score it, revises it if needed, and saves it to
Supabase. Returning learners get lessons shaped by what they've already
studied. See [AGENTS.md](AGENTS.md) for the architecture.

## Run locally

Requires Node.js 20+.

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm run dev
```

Open http://localhost:3000.

| Variable | Purpose |
| --- | --- |
| `OPENROUTER_API_KEY` | Model calls via OpenRouter |
| `OPENROUTER_MODEL` | Model id (default `deepseek/deepseek-v4.1-flash`) |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase key used by the server |

All four are read only on the server; none reach the browser.

Before deploying, check that it builds and lints:

```bash
npm run lint
npm run build
```

## Deploy (Vercel)

1. Push the repo to GitHub and import it in Vercel.
2. Add the four environment variables above under
   **Project → Settings → Environment Variables**.
3. Deploy. `/api/learn` declares `maxDuration = 300` because one lesson can
   take several model calls; this fits Vercel's default function limit.

### Production checklist

- **Rate limiting.** The API routes include a per-IP limiter (6 lessons per
  10 minutes; 60 library reads per minute), but it is in-memory, so each
  serverless instance counts separately. For a public deployment, also add a
  rate-limit rule in Vercel Firewall for `/api/learn`, and set a spending limit
  on your OpenRouter key.
- **Supabase access.** The server uses the anon key. Make sure Row Level
  Security policies on `lessons` and `progress` allow only what the app needs
  (insert/select on `lessons`; insert/update/select on `progress`).
- **No accounts.** Learners are identified by a random 128-bit ID stored in
  the browser. It is unguessable, but anyone who has a learner's ID can read
  that learner's lessons, and clearing browser storage loses the library.
  Add real authentication before storing anything sensitive.
