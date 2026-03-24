# Hands Up Web Deployment

## Clip Page Routing

The clip viewer lives at `web/clip.html`. To serve it at `handsuplive.com/clip/:id`, configure your web server with a rewrite rule so any `/clip/SOME_ID` request is served by `clip.html` (which then extracts the ID from the URL path via JS).

### Vercel (recommended)

Add to `vercel.json` in the project root:

```json
{
  "rewrites": [
    { "source": "/clip/:id", "destination": "/clip.html" }
  ]
}
```

### Nginx

```nginx
location ~ ^/clip/(.+)$ {
  try_files $uri /clip.html;
}
```

### Netlify

Add a `_redirects` file to the `web/` directory:

```
/clip/*  /clip.html  200
```

### Apache

Add to `.htaccess`:

```apache
RewriteEngine On
RewriteRule ^clip/(.+)$ /clip.html [L]
```

---

## Environment

`clip.html` uses the Supabase **public anon key** (read-only) to fetch clip data directly from the browser. This is safe — the anon key only has SELECT access to approved clips via Row Level Security policies.

The key is embedded directly in `clip.html`. It is the same key exposed by the Expo app at runtime and is safe to commit.

---

## OG / Social Sharing

OG meta tags (`og:title`, `og:image`, etc.) are updated client-side by JavaScript after the clip loads. For proper social preview cards (Twitter, iMessage, Slack), you'll need **server-side rendering** of those tags, since crawlers don't execute JavaScript.

**Recommended approach:** Use a serverless function or edge middleware to pre-render OG tags for `/clip/:id` routes before returning `clip.html`.

Example with Vercel Edge Middleware:
- Intercept requests matching `/clip/:id`
- Fetch clip data from Supabase
- Inject `<meta>` tags into the HTML before streaming to the client

Until then, the page will work correctly for users — just social preview images/titles will show the default fallback values.
