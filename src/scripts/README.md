# Scripts

Run these locally (not on Vercel) to initialize data:

## Backfill historical markets

```bash
DATABASE_URL="your-neon-url" npx tsx src/scripts/backfill-markets.ts
```

This fetches all resolved Polymarket markets and stores them for historical analysis.
Run once after setting up your database.
