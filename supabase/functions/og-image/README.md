# OG Image Edge Function

This Supabase Edge Function generates Open Graph preview images for sprint presentations.

## Deployment

To deploy this function to Supabase:

```bash
# Install Supabase CLI if you haven't already
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref YOUR_PROJECT_REF

# Deploy the function
supabase functions deploy og-image
```

## Usage

Once deployed, the function will be available at:

```
https://YOUR_PROJECT_REF.supabase.co/functions/v1/og-image?sprint=SPRINT_ID
```

This URL should be used in the `og:image` meta tag for sprint presentations.

It can also be pasted directly into Slack (alongside the replay URL) so Slack can unfurl a thumbnail for the current role assignments.

For a single-link share flow (thumbnail + redirect to presentation), use:

```
https://YOUR_PROJECT_REF.supabase.co/functions/v1/og-image?share=1&sprint=SPRINT_ID&replay=ENCODED_PRESENTATION_URL
```

## How It Works

1. Accepts a `sprint` query parameter with the sprint ID
2. Fetches the sprint data, team, roles, and members from Supabase
3. Generates a crawler-friendly SVG image at 1200x630
4. Returns `image/svg+xml` so social platforms can use it directly as a preview image
5. Optional `share=1` mode returns HTML with OG tags (pointing at the SVG URL) and redirects humans to the replay URL

## Alternative: Screenshot Service

If you prefer not to use Supabase Edge Functions, you can use a third-party OG image service like:
- Vercel OG Image (https://vercel.com/docs/concepts/functions/edge-functions/og-image-generation)
- Cloudinary (https://cloudinary.com/documentation/social_media_cards)
- img.shields.io or similar

## Local Development

To test locally:

```bash
supabase functions serve og-image --env-file ./supabase/.env.local
```

Then visit: http://localhost:54321/functions/v1/og-image?sprint=YOUR_SPRINT_ID
