# Team Assemble Unfurl Service (Vercel)

This folder contains a minimal Vercel-hosted unfurl service for Slack previews.

## What it does

- `GET /share?team=TEAM_ID&app=ENCODED_APP_BASE`
  - Resolves the latest active sprint for the team
  - Returns OG/Twitter meta tags for crawlers
  - Redirects users to `{app}/presentation?replay={sprintId}`
- `GET /og?team=TEAM_ID&sprint=SPRINT_ID`
  - Returns a PNG Open Graph image of current role assignments
- `GET /planner-csv?team=TEAM_ID&filter=...`
  - Returns filtered planner records as a downloadable CSV
  - Supports the same filter format as the planner page (`start_date`, `end_date`, `status=planning|active|completed`)

## Deploy (same repository)

1. Create a new Vercel project from this repository.
2. Set **Root Directory** to `unfurl`.
3. Set environment variables in Vercel:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - Optional: `DEFAULT_APP_BASE_URL` (used when `app` query param is missing)
4. Deploy.

## App configuration

In the main app `.env`, set:

```env
VITE_UNFURL_BASE_URL=https://your-unfurl-service.vercel.app
```

Then the app's "Copy Slack share" buttons will copy a Vercel `/share` link instead of a Supabase function URL.
Planner CSV export (`export=true`) will also use this same Vercel deployment when `VITE_UNFURL_BASE_URL` is configured.

## Example link

```text
https://your-unfurl-service.vercel.app/share?team=86e569a9-18f3-4c05-b4ec-f026741ed93f&app=https%3A%2F%2Fchristian-crisologo-lrn.github.io%2Fteam-assemble
```

CSV export endpoint example:

```text
https://your-unfurl-service.vercel.app/planner-csv?team=86e569a9-18f3-4c05-b4ec-f026741ed93f&filter=start_date=2026-08-01,status=completed|active
```
