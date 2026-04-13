# Family Gallery

Private family photo app: each member has a **profile and personal gallery**, plus a **shared family album** with categories (Events, Trips, Childhood, General). Built with **Next.js (App Router)**, **Tailwind CSS v4**, **MongoDB** (Mongoose), and **cookie-based JWT** sessions (`jose` + `bcryptjs`).

REST handlers live under `src/app/api/*` (the Next.js convention for `/api`). Shared JSON types for a future mobile client are in `src/shared/api-types.ts`; route path constants are in `src/lib/api-endpoints.ts`.

## Prerequisites

- Node.js 20+
- MongoDB running locally or [MongoDB Atlas](https://www.mongodb.com/atlas)

## Setup

1. **Install dependencies**

   ```bash
   cd family-gallery
   npm install
   ```

2. **Environment**

   Copy `.env.example` to `.env.local` and set:

   | Variable | Purpose |
   |----------|---------|
   | `MONGODB_URI` | Mongo connection string |
   | `JWT_SECRET` | Long random string for signing session cookies |
   | `FAMILY_INVITE_CODE` | Optional; if set, signup requires this code (keeps the app private) |
   | `SEED_PASSWORD` | Optional; password for all seeded accounts (default: `family-gallery-demo`) |

3. **Seed the Getachew family (seven accounts + default shared folder)**

   ```bash
   npm run seed
   ```

   Same password for everyone (from `SEED_PASSWORD` or default `family-gallery-demo`). **Natan Getachew** is the **admin** (sees **Admin** in the nav and can manage people, folders, and media).

   | Name | Role label | Email |
   |------|------------|--------|
   | Getachew Agonafir | Father | `getachew@family.gallery` |
   | Aster Haile | Mother | `aster@family.gallery` |
   | Firehiwot Getachew | Sister | `firehiwot@family.gallery` |
   | Bisrat Getachew | Brother | `bisrat@family.gallery` |
   | Medal Getachew | Sister | `medal@family.gallery` |
   | Edom Getachew | Sister | `edom@family.gallery` |
   | Natan Getachew | Brother (admin) | `natan@family.gallery` |

   Profile images use deterministic [Picsum](https://picsum.photos/) seeds. Re-run `npm run seed` any time to refresh names/passwords (it upserts by email).

   > If you still have **old** demo emails (`father@family.gallery`, etc.) in MongoDB, they are separate users until you remove them or use a fresh database.

4. **Run the app**

   ```bash
   npm run dev
   ```

   Dev server binds to **`127.0.0.1:3000`** (see `package.json`). Open:

   - [http://127.0.0.1:3000](http://127.0.0.1:3000) — use this if `localhost` hangs in Chrome (IPv6/DNS quirks on Windows).
   - Or [http://localhost:3000](http://localhost:3000)

   You should be redirected to `/login` or `/dashboard` depending on the session cookie.

   **If the page never loads:** Check the terminal for the exact **Local:** URL. If you see **port 3000 is in use**, another `next dev` is still running — close that terminal or end the **Node** process in Task Manager, then run `npm run dev` again.

   **Production build:** `npm run build` uses **webpack** so it is less likely to run out of memory on Windows than Turbopack. To try Turbopack instead: `npm run build:turbo`.

## Project layout

| Path | Role |
|------|------|
| `src/app/(app)/` | Logged-in UI: dashboard, family gallery, profiles, **admin** |
| `src/app/api/` | JSON API (auth, users, albums, photos, admin, activity) |
| `src/components/` | UI: layout, gallery, providers (theme, auth, toasts) |
| `src/models/` | Mongoose schemas |
| `src/lib/` | DB connection, auth helpers, API route constants |
| `src/utils/` | Shared constants (e.g. album categories) |
| `src/shared/` | Types shaped like API responses (reuse in React Native / Expo) |
| `scripts/seed.ts` | One-shot family member seed |
| `public/uploads/photos/` | Legacy image path (older uploads) |
| `public/uploads/media/` | Current uploads: images, video, PDF (gitignored except `.gitkeep`) |
| `public/uploads/avatars/` | Admin-uploaded profile images (gitignored except `.gitkeep`) |

## Features (checklist)

- **Auth**: Login, optional gated signup (`FAMILY_INVITE_CODE`), httpOnly cookie sessions.
- **Health**: `GET /api/health` — JSON liveness + MongoDB connectivity (used from Admin → Overview).
- **Dashboard**: Family member cards, recent activity, **random family spotlight** image, memories, upload entry point.
- **Profile**: Personal grid per member; owner can upload to their gallery; anyone in the family can view (authenticated).
- **Family gallery**: Shared grid; **folders (albums)** + category + uploader filters; search; images, **video** (MP4/WebM/MOV), and **PDF** uploads.
- **Chat** (`/chat`): **Family room** (everyone) and **direct messages** between two members; messages stored in MongoDB and **polled every ~2.5s** (no WebSockets — works on typical Next.js hosting). Admins can enable/disable family chat and DMs under **Admin → Chat settings**.
- **Admin** (`/admin`, Natan by default): **Overview** (stats + health link), add/edit/delete **family members**, **upload a member’s profile photo file** (JPEG/PNG/WebP/GIF) or set avatar URL, create **family or personal folders**, browse and **delete any media**, **chat toggles**.
- **Media**: Grid + lightbox (video playback / file download); files under `public/uploads/media/`.
- **Memories**: Dashboard **“On this day”** strip — media uploaded on today’s calendar date (UTC) in any past year; opens in the lightbox with the rest of the strip as prev/next.
- **Lightbox**: Keyboard **← →** and side arrows when viewing from a grid (family, profile, or memories).
- **Nice-to-haves**: Search & filters, dark mode toggle, toast notifications after upload, activity list on dashboard.

## Mobile (Expo / React Native) later

1. Keep using the same **REST** endpoints and **session cookie** (or add a Bearer-token variant later).
2. Import or copy `src/shared/api-types.ts` into a shared package.
3. Point requests at `https://your-deployed-domain.com` using the paths in `src/lib/api-endpoints.ts`.
4. Rebuild navigation with React Navigation; reuse business rules (personal vs family, categories) from this codebase.

## Troubleshooting

### Login shows “Server error” or “Cannot connect to MongoDB”

The app **must** be able to reach MongoDB. Your `.env.local` uses a local URI by default (`mongodb://127.0.0.1:27017/...`). If nothing is listening on port **27017**, login and uploads will fail.

**Fix (pick one):**

1. **Run MongoDB on this PC**  
   - Install [MongoDB Community Server](https://www.mongodb.com/try/download/community) or start it if already installed.  
   - On Windows, start the **MongoDB** service (Services app) or run `mongod` in a terminal.  
   - Then run `npm run seed` once, and try logging in again.

2. **Use MongoDB Atlas (cloud)**  
   - Create a free cluster, get the connection string, and set `MONGODB_URI` in `.env.local` (replace username, password, and allow your IP in Atlas).  
   - Run `npm run seed` again against that database.

### “JWT_SECRET” / misconfiguration message

Copy `.env.example` to `.env.local` and set a non-empty `JWT_SECRET` (any long random string is fine for local dev).

## Production notes

- Set strong `JWT_SECRET` and `MONGODB_URI` in the host environment.
- Uploaded files on disk do not persist on ephemeral hosts (e.g. Vercel). For production, move uploads to **S3**, **Cloudinary**, or similar and store the URL in MongoDB.
- Consider restricting CORS and serving the API only from your app origin when you add a separate mobile client.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build & start |
| `npm run seed` | Seed or update the seven family accounts + default folder |
| `npm run lint` | ESLint |
