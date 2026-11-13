# ADIPEC Lead Gen — Frontend

React 19 + TypeScript + Vite. See [PLAN.md](PLAN.md) and [FRONTEND-DEV-PLAN.md](FRONTEND-DEV-PLAN.md).

```bash
npm i
npm run dev        # mock backend on by default (.env.development)
npm test           # unit tests
npm run lint       # ESLint + Prettier check
npm run typecheck
npm run build
```

Use the real backend: run it on `:4000` and set `VITE_API_MOCK=false` (Vite proxies `/api`).
Never commit `.env` files, real contact data or CSV exports.
