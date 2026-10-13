# Team Assemble Unfurl Service (Vercel)

This folder is a standalone Vercel service (not part of the main React app) that provides
Slack/social link unfurling and a public, no-login CSV export of sprint planner records.

## What it does

- `GET /share?team=TEAM_ID&app=ENCODED_APP_BASE` (optional `sprint=SPRINT_ID`)
  - Resolves the sprint via `sprint` if given, otherwise the latest active sprint for `team`.
  - **Crawler detection**: when the `user-agent` header matches a known link-preview bot
    (`slack`, `facebookexternalhit`, `twitterbot`, `discordbot`, `linkedinbot`, `whatsapp`,
    `telegrambot`, `embedly`, `bot`, `preview`), it responds `200` with an HTML document
    containing OpenGraph + Twitter Card meta tags. `og:image` points at this service's own
    `/og` endpoint, and `og:url` points at the presentation link.
  - For real (non-crawler) requests it responds with a `302` redirect to
    `{app}/presentation?replay={sprintId}`.
- `GET /og?team=TEAM_ID&sprint=SPRINT_ID`
  - Returns a 1200x630 PNG Open Graph image of the sprint's role assignments
    (role name -> assigned member name), rendered with
    [`@vercel/og`](https://vercel.com/docs/functions/og-image-generation) (Satori-based,
    no native binaries). Cached with `Cache-Control: public, max-age=3600`.
- `GET /planner-csv?team=TEAM_ID&filter=...` (default: JSON)
  - Returns filtered planner records as a JSON array by default (public, no auth — uses the
    Supabase service-role key server-side). `team` is required.
  - Each item includes the sprint record plus `roles`, `members`, and `role_assignments`
    with the resolved member names and role names.
  - Add `&format=csv` to download the same result as a CSV file.

### `/planner-csv` filter grammar

The `filter` query param is a comma-separated list of `key=value` pairs. Supported keys:

| Key          | Meaning                                                                 |
| ------------ | ----------------------------------------------------------------------- |
| `start_date` | Keep records with `start_date >= value` (ISO date, e.g. `2026-08-01`).  |
| `end_date`   | Keep records with `end_date <= value`.                                  |
| `status`     | One or more of `planning`, `active`, `completed`, OR-combined with `\|`. |

Example: `start_date=2026-08-01,end_date=2026-09-01,status=completed|active`

Unknown keys and unknown status values are ignored. By default the response is JSON with an
array of matching sprint records. If `format=csv` is provided, the CSV has a header row and
columns `name, start_date, end_date, status, id, team_id`. Values are quoted and embedded
quotes are doubled, so commas/quotes/newlines are safe.

## Local development

```bash
npm install
npm run type-check   # tsc --noEmit, must pass with zero errors
vercel dev           # run the functions locally (requires env vars below)
```

> `vercel dev` and the CSV endpoint need live Supabase credentials. Without them the
> handlers return a 500 ("Missing required environment variable: ...").

## Deploy (same repository)

1. Create a new Vercel project from this repository.
2. Set **Root Directory** to `unfurl`.
3. Set environment variables in Vercel:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - Optional: `DEFAULT_APP_BASE_URL` (used when the `app` query param is missing)
4. Deploy. Vercel compiles the `api/*.ts` / `api/*.tsx` serverless functions automatically;
   the rewrites in `vercel.json` map `/share`, `/og`, and `/planner-csv` to them.

## App configuration

In the main app `.env`, set:

```env
VITE_UNFURL_BASE_URL=https://your-unfurl-service.vercel.app
```

Then the app's "Copy Slack share" buttons will copy a Vercel `/share` link instead of a
Supabase function URL. Planner CSV export (`export=true`) will also use this same Vercel
deployment when `VITE_UNFURL_BASE_URL` is configured.

## Example links

```text
https://your-unfurl-service.vercel.app/share?team=86e569a9-18f3-4c05-b4ec-f026741ed93f&app=https%3A%2F%2Fchristian-crisologo-lrn.github.io%2Fteam-assemble
```

JSON endpoint example:

```text
https://your-unfurl-service.vercel.app/planner-csv?team=86e569a9-18f3-4c05-b4ec-f026741ed93f&filter=start_date=2026-08-01,status=completed|active
```

CSV export example:

```text
https://your-unfurl-service.vercel.app/planner-csv?team=86e569a9-18f3-4c05-b4ec-f026741ed93f&filter=start_date=2026-08-01,status=completed|active&format=csv
```
