# Closera revenue ledger

This is a static dashboard for the Supabase `scoreboard` function. It has no build step and no external JavaScript, fonts, or analytics.

Run the representative demo locally:

```sh
cd /Users/chrispass06/Documents/Claude/closera-board
python3 -m http.server 4173
```

Open `http://127.0.0.1:4173/?demo=1`. The sample is intentionally fake and is not live data.

For the read-only live board, open `http://127.0.0.1:4173/?k=YOUR_DASH_KEY`. The key is read from the URL for that request only. The page does not persist or log it. Apply scoreboard migrations `0064` and `0065` before deploying the updated function. The small missing-form line uses the month window's `unlogged` count.
