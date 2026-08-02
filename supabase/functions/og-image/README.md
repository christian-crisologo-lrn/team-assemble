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

## How It Works

1. Accepts a `sprint` query parameter with the sprint ID
2. Fetches the sprint data, team, roles, and members from Supabase
3. Generates an HTML page styled to look good as an OG image (1200x630px)
4. Returns the HTML which can be screenshot by social media crawlers

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
