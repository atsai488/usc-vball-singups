# Sideout

A lightweight weekly volleyball signup, team balancing, and Elo leaderboard app.

## Run locally

Open `index.html` in a browser. The demo persists data in `localStorage`, so it works without a build step or account.

## Included

- Position-specific weekly caps and automatic waitlisting
- Elo-balanced fixed-position team generation
- Public leaderboard
- Players can build a multi-position history while choosing only one position per week
- Password-gated organizer board for week status, caps, team generation, and full reset
- `supabase/schema.sql` with the relational production schema

## Supabase deployment

The browser uses the configured Supabase project for public reads and authenticated signup/removal operations. Apply `supabase/migrations/002_security.sql` and `supabase/migrations/003_google_identity.sql` after the base schema, deploy the Edge Functions in `supabase/functions`, then create one Supabase Auth user and add that user's UUID to `admin_users`. Admin mutations are accepted only from that authenticated user; the browser password is used only by the local demo.

### Google sign-in setup

In Supabase, open Authentication → Providers → Google and add a Google OAuth client ID and secret. Google’s authorized redirect URI must be `https://ywohyfmljrzdsphylvsi.supabase.co/auth/v1/callback`. In Authentication → URL Configuration, set the Site URL to the Cloudflare Pages address and add that address to the allowed redirect URLs. The app then maps one Google account to one player, accepts first and last name for each signup, permits one position per week, and shows the player’s position history separated by commas. See the [Supabase Google login guide](https://supabase.com/docs/guides/auth/social-login/auth-google).

The live remove button uses the signed-in Google account instead of a PIN; the server only removes a signup owned by that account. `supabase/cleanup-test-data.sql` clears app rows while preserving weeks, admin membership, and Auth accounts.

Do not put a Google client secret in this repository or in Cloudflare Pages frontend variables. Enter it only in Supabase Authentication → Providers → Google. See `supabase/google-oauth-setup.md` for the exact redirect URLs.

For a static host, publish this folder with the supplied `supabase-config.js`. Do not put a service-role key in the browser. Keep the publishable key public, and set the Edge Function secrets through Supabase's project settings.
