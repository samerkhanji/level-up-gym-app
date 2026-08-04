# Internal Demo Build

This folder is the internal-only build of the Level Up member app. It contains
the sales-demo harness (the "Level Up OS" description panel, scenario copy, and
the "Reset demo" control) and the presentational phone-mockup frame that used to
ship to the public production build.

## Why this folder exists

The production app is deployed from web-demo/ (Vercel Root Directory = web-demo).
As of this change, web-demo/index.html, web-demo/app.js and web-demo/styles.css
no longer contain the demo panel, the ?demo=1 reveal logic, or the phone-bezel/notch
presentation at all - they were deleted from the source, not hidden with CSS. Because
Vercel only deploys the web-demo/ directory, anything placed in internal-demo/
instead is never built or served on the public production domain
(level-up-gym-app-rho.vercel.app), regardless of query string or URL path.

That folder-level separation is the build-time flag in this static-hosting setup:
there is no bundler/build step in this repo (Vercel's Framework Preset is "Other"
with no build command), so a literal LEVEL_UP_INTERNAL_DEMO=true environment
variable has nothing to conditionally compile against. Folder separation gives the
same guarantee - the internal harness physically cannot end up in the production
output - without needing a build step.

## What's in here

- index.html - the original member-app shell with the demo panel and phone
  bezel restored, loading the shared bus.js / data.js / app.js from
  ../web-demo/ by relative path so member-app logic stays in one place.
- styles.css - an unmodified snapshot of web-demo/styles.css from before the
  production hardening (commit 461500f), i.e. it still has .phone, .notch and
  .demo-note styling.

## How to use it locally

Serve the repository root with any static file server and open
/internal-demo/index.html, e.g.:

    npx serve .
    then visit http://localhost:3000/internal-demo/index.html

The demo panel is shown unconditionally here (no ?demo=1 needed) since this
build is never public.

## If you want it on a real URL instead of local-only

Create a second, separate Vercel project pointed at this same GitHub repo with
Root Directory set to the repository root (not web-demo), and open
/internal-demo/index.html on that deployment. This was intentionally not done
as part of this change - it requires adding a new Vercel project, which was
explicitly out of scope. Do not point the existing production project at this
folder.

## Regression guarantee

web-demo/ (production) is checked to contain none of: "Reset demo", "Level Up
OS", "shared demo engine", .demo-note, .phone/.notch bezel styling, or any
code path that reacts to ?demo=1.
