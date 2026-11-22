# Flyer Builder

Password-protected web app for making weekly / seasonal sale flyers for five Alberta liquor stores.
Staff pick a theme, sale dates and store, fill in the item slots, and export a print PDF (Letter or 11x17)
and social PNGs (1080x1080, 1080x1350).

- **Front end:** Next.js 15 (App Router), React 19, TypeScript, plain CSS
- **Server:** Next.js route handlers (deployed by Netlify as Netlify Functions) + one dedicated Netlify Function for exports
- **Storage:** Netlify Blobs (flyers, product library, store settings, staff logins, uploaded images)
- **Exports:** headless Chromium (`puppeteer-core` + `@sparticuz/chromium`) renders the same `<Flyer>` component the preview uses.
  PDFs keep text as vector text with embedded fonts. If the export function fails, the browser falls back to
  making the PNG itself, or opening a print window for "Save as PDF".

---

## Environment variables

Set these in Netlify: **Site configuration > Environment variables**. Never commit them.

| Variable | Required | What it does |
|---|---|---|
| `SESSION_SECRET` | Yes | Long random string (32+ characters) used to sign login cookies. |
| `STAFF_PASSWORD` | Yes | Password for the shared login `staff`. |
| `ADMIN_PASSWORD` | Yes | Password for the login `admin` (opens Settings). |
| `LIQUORCONNECT_API_URL`, `LIQUORCONNECT_USERNAME`, `LIQUORCONNECT_PASSWORD` or `LIQUORCONNECT_API_KEY` | No | AGLC Liquor Connect lookup (stub, see below). Skipped when not set. |
| `BDL_API_URL`, `BDL_USERNAME`, `BDL_PASSWORD` or `BDL_API_KEY` | No | Connect Logistics / BDL lookup (stub). Skipped when not set. |
| `GOOGLE_CSE_API_KEY`, `GOOGLE_CSE_ID` | No | Fallback public product search (Google Programmable Search). Skipped when not set. |
| `GOOGLE_CSE_QUERY_SUFFIX` | No | Extra words added to the public search (default `Alberta liquor`). |
| `EXPORT_ORIGIN` | No | Only if exports must load the site from a different URL than the one the request came in on. |

Generate a session secret with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

---

## Deploy to Netlify (from GitHub)

1. Push this repository to GitHub.
2. In Netlify: **Add new site > Import an existing project > GitHub**, pick the repo, branch `main`.
   Netlify reads `netlify.toml` (build command `npm run build`, Next.js plugin, export function settings).
3. Add the three required environment variables above.
4. Deploy. Every push to `main` deploys automatically.
5. Open the site and sign in as `admin`. In **Settings**, fill in the store details marked as placeholders
   (hours for Stony Plain and Wainwright, newsletter QR links, logos, SkipTheDishes on/off) and click **Save settings**.

Netlify Blobs needs no setup; it is created on first use.

**Export function timing.** Headless Chromium takes a few seconds to start. Netlify's default function timeout is
10 seconds. If exports time out, ask Netlify to raise the function timeout (up to 26 s on paid plans). Staff are
never blocked: the app falls back to a browser-made PNG, or a print window for the PDF.

---

## Local setup

Requires Node.js 20+ and a local Chrome or Chromium for exports.

```bash
npm install
cp .env.example .env.local
# edit .env.local: set SESSION_SECRET, STAFF_PASSWORD, ADMIN_PASSWORD, and for exports:
#   CHROME_PATH=/path/to/chrome   (e.g. /Applications/Google Chrome.app/Contents/MacOS/Google Chrome)
#   NEXT_PUBLIC_EXPORT_ENDPOINT=/api/dev-export
npm run dev
```

Open http://localhost:3000 and sign in with username `staff` (or `admin`).
In development, data is stored in `.data/` instead of Netlify Blobs. To use the local store with
`npm run build && npm start`, also set `FLYER_STORAGE=local` and `ALLOW_DEV_EXPORT=1`.

---

## How it works

### Logins
- `staff` signs in with `STAFF_PASSWORD`. The admin can add more staff logins (e.g. `sukhdeep`) or set a new
  password for `staff` in **Settings > Staff logins**. Once a password for `staff` is set there, it replaces the
  environment password.
- `admin` signs in with `ADMIN_PASSWORD` and is the only login that can open Settings.
- Sessions are signed, HTTP-only cookies (12 hours). `middleware.ts` checks every page and API route;
  route handlers and the export function check again.

### Homepage flow
1. Season / theme (changes colours, background art and the headline ribbon only)
2. Sale dates ("To" cannot be before "From"; fills "Sale prices in effect from ... to ...")
3. Store (fills header and footer from Settings; missing details print as red "admin to set" placeholders)
4. Item slots (default 20, set by admin; add, remove, reorder, duplicate, clear)

The preview updates as you type. Unsaved work is autosaved in the browser and restored after a refresh.

### Item lookup
`lib/lookup/` has one provider interface tried in order:
1. **Product library** (every product in a saved flyer, by item number)
2. **AGLC Liquor Connect**: `lib/lookup/liquorConnect.ts`. Stub: reads env vars; fill in `fetchProduct()` when access is available.
3. **Connect Logistics / BDL**: `lib/lookup/bdl.ts`. Same approach.
4. **Public search**: `lib/lookup/publicSearch.ts` (Google Programmable Search). Results can be wrong for retailer SKUs, so staff should check what it fills in.

Lookups only fill empty fields; staff can override everything. Found images are copied into Netlify Blobs.

### Layout
- `components/Flyer.tsx` is the only flyer renderer (preview and exports).
- `lib/layout.ts` packs the grid. 4 L, 24, 30 and 36 packs take two columns; rows are filled in order and short
  rows stretch, so there are no gaps. The column count is chosen per export size so each layout stays readable.
- `components/fit.ts` shrinks each text box to fit and never goes below a minimum; anything still too long is cut
  with an ellipsis instead of overflowing.
- Theme art (`components/ThemeArt.tsx`) is original SVG. Admin can upload replacement art per theme.

### Images
Uploads accept PNG, JPG, WebP up to 10 MB. The browser resizes them (max 1600 px for products) before upload.
"Remove white background" is a simple in-browser flood fill from the image edges (no paid service); it works best on
product photos shot on white and can be turned off to restore the original.

### Sample flyer
On first run the app creates **"SAMPLE DATA: Camrose Thanksgiving test flyer"** and adds its products (item numbers
`SAMPLE01` to `SAMPLE20`) to the product library. Brand names and prices are placeholders, not real products.
Delete it from **My flyers** once real flyers exist.

---

## Project layout

```
app/                 pages (/, /flyers, /settings, /login, /print) and API routes (app/api/*)
components/          Flyer renderer, editor, slot editor, theme art
lib/                 types, themes, sizes, storage, data access, auth, lookup providers, export renderer
netlify/functions/   export.mts (PDF/PNG renderer)
middleware.ts        login check for every page and API route
```
