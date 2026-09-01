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

The browser uses the configured Supabase project for public reads and server-side signup/removal operations. Apply `supabase/migrations/002_security.sql` after the base schema, deploy the Edge Functions in `supabase/functions`, then create one Supabase Auth user and add that user's UUID to `admin_users`. Admin mutations are accepted only from that authenticated user; the browser password is used only by the local demo.

For a static host, publish this folder with the supplied `supabase-config.js`. Do not put a service-role key in the browser. Keep the publishable key public, and set the Edge Function secrets through Supabase's project settings.
