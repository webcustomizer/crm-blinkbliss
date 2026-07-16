# Changes made — summary

## 🚨 Security (critical — apply/deploy this before anything else)

Fixed **11 admin API routes that had zero authentication**, including
`/api/admin/users` (anyone could create a brand-new ADMIN account) and
`/api/admin/salespersons/[id]/reset-password` (anyone could reset any
salesperson's password). Full list of routes fixed:

- `/api/admin/users` (POST)
- `/api/admin/salespersons` (POST)
- `/api/admin/salespersons/[id]` (PATCH)
- `/api/admin/salespersons/[id]/reset-password` (PATCH)
- `/api/admin/leads` (GET only — POST stays public, see note below)
- `/api/admin/leads/[id]/assign` (PATCH)
- `/api/admin/leads/[id]/followups` (POST)
- `/api/admin/customers` (GET)
- `/api/admin/reports/sales` (GET)
- `/api/admin/salespeople` (GET)
- `/api/admin/settings` (GET, PATCH)

**Two layers of defense were added:**
1. `middleware.ts` now also guards `/api/admin/:path*` and
   `/api/salesperson/:path*`, rejecting requests without a valid token/role
   before they even reach the route handler.
2. Each route above also calls the new `lib/require-auth.ts` helper
   directly, so a route is never accidentally exposed even if the
   middleware matcher is changed later.

**Important — nothing about the public lead form was broken.** The
`/form` landing page (`components/form/LeadFormCard.tsx`) posts to
`POST /api/admin/leads` and must stay unauthenticated — that's how real
visitors submit their info. This one endpoint is explicitly carved out
as public in both `middleware.ts` and the route file (with a comment
explaining why, so no one "fixes" it back into a bug later). `GET
/api/admin/leads` (the admin leads table) still requires an admin
token, as it should.

**Also fixed:** two routes (`salespersons/[id]` PATCH,
`reset-password` PATCH) were returning the user's **hashed password**
in the JSON response. Both now use a `select` that only returns safe
fields.

## ⚡ Performance

- **`/api/admin/reports/sales`** used to load *every lead row* into
  memory (`include: { leads: true }`) and count statuses with six
  `.filter()` passes in JavaScript. Rewritten to use
  `prisma.lead.groupBy()` so the database does the counting — this
  scales to a large leads table instead of getting slower as it grows.
- **`prisma/schema.prisma`**: added
  - `@@unique([phone])` on `Lead` — closes a race condition where two
    near-simultaneous submissions with the same phone could both create
    a lead, and turns the duplicate-phone check (run on every lead
    create + CSV import) into an index lookup instead of a full table
    scan.
  - `@@index([email])` — same reasoning for the duplicate-email check.
  - `@@index([nextFollowUp, status])` — speeds up the
    `TODAY_FOLLOW_UP` / `OVERDUE_FOLLOW_UP` admin filters.
  - **Before running the migration**, see "Required manual steps" below
    — if any duplicate phone numbers already exist in the database, the
    migration will fail until they're merged.
- **Bundle size**: `recharts` (used only in the reports pie chart) and
  `xlsx` (used only when importing an Excel file in Settings) were
  being bundled into the initial JS for their pages even though most
  visits never touch them.
  - `StatusChart` is now loaded via `next/dynamic` (`ssr: false`) in
    both `ReportsDashboard.tsx` and `ReportsPage.tsx`.
  - `xlsx` is now `await import("xlsx")`'d inside `parseExcelFile()` in
    `ImportLeadsSection.tsx`, only when a user actually uploads an
    Excel file.
- **`next.config.ts`**: strips `console.log`/`console.warn` from the
  production build (keeps `console.error`), disables the
  `X-Powered-By` header, and tree-shakes `lucide-react`/`recharts`
  imports via `experimental.optimizePackageImports`.
- **`app/layout.tsx`**: fonts now load with `display: "swap"` (avoids
  invisible-text-while-loading), and a proper `viewport` export with
  `theme-color` was added (helps mobile browser chrome + Lighthouse
  Best Practices).

## SEO / metadata

- `app/layout.tsx` now has a real `description`, a title template, and
  `robots: { index: false, follow: false }` — this is an internal CRM,
  so it shouldn't show up in search results. If you *do* want the
  public `/form` landing page indexed, add a page-level `metadata`
  export in `app/form/page.tsx` that overrides `robots` back to
  indexable for that route only.

## Things I could **not** verify in this sandbox

I don't have network access here, so I could not run `npm install`,
`npm run build`, `tsc`, or an actual Lighthouse pass. I manually
reviewed every changed file (brace/paren balance, logic flow) and I'm
confident nothing is syntactically broken, but please do run a real
build before deploying:

```bash
npm install
npm run build
```

If `tsc`/`next build` reports anything, it'll most likely be in one of
the files listed above — paste me the error and I'll fix it immediately.

## Required manual steps (in order)

1. `npm install`
2. **Check for duplicate phone numbers before migrating**, since the
   new `@@unique([phone])` constraint will fail to apply if any exist:
   ```bash
   DRY_RUN=true npx tsx prisma/maintenance/dedupe-lead-phones.ts
   ```
   This only prints a report, it changes nothing. If it says "No
   duplicates found", skip to step 3. If it finds duplicates and you're
   OK merging them (oldest lead kept, its follow-ups/history preserved),
   run it for real:
   ```bash
   DRY_RUN=false npx tsx prisma/maintenance/dedupe-lead-phones.ts
   ```
3. ```bash
   npx prisma migrate dev --name add_lead_indexes
   ```
4. `npm run build` — confirm it builds clean.
5. Run a real Lighthouse pass (Chrome DevTools → Lighthouse tab, or
   `npx lighthouse <url> --view`) against the deployed/staging URL and
   send me the report if anything is still under 90 — I'll target the
   specific flagged items.
6. Consider adding login rate-limiting (`/api/login` currently has
   none — not changed in this pass since it needs a Redis/Upstash-style
   store to do properly, happy to wire it up if you want).
