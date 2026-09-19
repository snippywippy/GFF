# GFF — Gluten Free Finder

A small PWA that finds gluten-free friendly and dedicated-GF restaurants near your
current location, using the Google Places API.

## Files

    index.html        the whole app (no build step, no framework)
    api/search.js     Vercel serverless function — proxies Google Places
    manifest.json     PWA manifest (Add to Home Screen)
    sw.js             service worker — caches the shell, never the API
    icons/            app icons

## One-time Google setup

1. Go to https://console.cloud.google.com and create a project (name it GFF).
2. Enable billing on the project. A card is required even though personal use
   stays inside the free monthly credit.
3. APIs & Services -> Library -> enable **Places API (New)**.
   Note: "Places API" (the legacy one) is a different product. Enable the New one.
4. APIs & Services -> Credentials -> Create credentials -> API key. Copy it.
5. Restrict the key: Application restrictions -> None (the key is used server-side,
   not from a browser). API restrictions -> Restrict key -> Places API (New).

## Add the key to Vercel

Vercel -> the gff project -> Settings -> Environment Variables

    Key:    GOOGLE_MAPS_API_KEY
    Value:  <the key>
    Envs:   Production, Preview, Development

Then Deployments -> latest -> Redeploy. Environment variables are only picked up
on a new build.

## Install on iPhone

Open the Vercel URL in Safari -> Share -> Add to Home Screen.

## Notes

- The API key lives only in Vercel's environment, never in page source.
- "Find Me GF" opens a site-scoped Google search for that restaurant on
  findmeglutenfree.com. FMGF has no public API and blocks automated access,
  so this is the reliable way to reach their listing.
- Google has no "dedicated gluten-free" flag. The Dedicated GF toggle changes
  the search phrasing, which biases results but does not guarantee them.
  Always call ahead about cross-contact.
