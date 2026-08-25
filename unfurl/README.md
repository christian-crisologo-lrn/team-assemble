# Team Assemble Unfurl Service (Vercel)

This folder contains a minimal Vercel-hosted unfurl service for Slack previews.

## What it does

- `GET /share?team=TEAM_ID&app=ENCODED_APP_BASE`
  - Resolves the latest active sprint for the team
  - Returns OG/Twitter meta tags for crawlers
  - Redirects users to `{app}/presentation?replay={sprintId}`
- `GET /og?team=TEAM_ID&sprint=SPRINT_ID`
  - Returns a PNG Open Graph image of current role assignments

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

## Example link

```text
https://your-unfurl-service.vercel.app/share?team=86e569a9-18f3-4c05-b4ec-f026741ed93f&app=https%3A%2F%2Fchristian-crisologo-lrn.github.io%2Fteam-assemble
```
