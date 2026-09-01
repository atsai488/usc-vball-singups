# Google sign-in setup

The Google client secret must not be added to this repository, `app.js`, `supabase-config.js`, or any Cloudflare Pages environment variable that is exposed to the browser.

## Supabase dashboard

1. Open the Supabase project.
2. Go to **Authentication → Providers → Google**.
3. Enter the Google OAuth **Client ID** and the newly rotated **Client Secret** there.
4. Save the provider.

Google Cloud should use this authorized redirect URI:

```text
https://ywohyfmljrzdsphylvsi.supabase.co/auth/v1/callback
```

## Redirect URLs

In **Supabase → Authentication → URL Configuration**, set the Site URL to the deployed Cloudflare Pages URL and add it to the allowed redirect URLs:

```text
https://usc-vball-singups.pages.dev
```

The browser only needs the public values in `supabase-config.js`: the Supabase project URL and publishable key. The provider secret stays inside Supabase Auth.
