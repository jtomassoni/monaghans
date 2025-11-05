# Dive Bar Site + Living TODO

> **One-liner reminder:** Do not commit secrets or real .env; keep todo.md committed and always updated after each change.

## Project Overview
Build a simple, fast website for a neighborhood dive bar with an owner-friendly CMS for food & drink specials, events, pages, and announcements.

---

## Phase 0 — Repo Hygiene

- [x] Initialize Next.js project with TypeScript, App Router
- [x] Configure ESLint and Prettier
- [x] Setup Tailwind CSS + shadcn/ui
- [x] Add .env.example with placeholders (DATABASE_URL, NEXTAUTH_SECRET, EMAIL_SERVER*, SOCIAL_* stubs)
- [x] Add README.md with run, build, deploy instructions for non-technical collaborator
- [x] Add scripts/seed.ts to seed sample specials/events
- [x] Verify: `npm run dev` boots; lint passes; sample data script runs

**Acceptance Criteria:** Clean project structure; developer can run `npm run dev` successfully; linting configured.

**Status:** ✅ Complete

---

## Phase 1 — Data Model (Prisma)

- [x] Install Prisma + SQLite driver
- [x] Define model: `Special` (title, description, price notes, appliesOn weekdays, time window, start/end optional, image)
- [x] Define model: `Event` (title, description, start/end, venue area, recurrence RRULE string, exceptions array, isAllDay, tags)
- [x] Define model: `Announcement` (title, body rich text, heroImage, publishAt, crossPost flags)
- [x] Define model: `Page` (slug, title, content rich text/MDX-like, images)
- [x] Define model: `Setting` (hours JSON, address, phone, Google Map embed, theme options, ordering toggle)
- [x] Define model: `PostQueue` (channel, payload JSON, status, scheduledAt)
- [x] Create initial migration
- [x] Create seed script with realistic sample data
- [x] Verify: Prisma migrate runs; seed creates realistic samples

**Acceptance Criteria:** All models defined; migration successful; seed script creates test data.

**Status:** ✅ Complete

---

## Phase 2 — Admin UX (Owner-friendly)

- [ ] Build `/admin` dashboard: cards for "Today's Specials," "This Week's Events," "Draft Announcements," quick links
- [ ] Build CRUD forms for Specials with plain language help text and live previews
- [ ] Build CRUD forms for Events with plain language help text
- [ ] Build recurrence builder:
  - Radio/cards: "One-time / Daily / Weekly / Monthly (nth weekday)"
  - End conditions: "never / after N times / until date"
  - Preview list of first 6 occurrences
  - Allow date exceptions (add/remove)
- [ ] Build image picker that saves to `/public/uploads` with filename sanitizer
- [ ] Build CRUD forms for Announcements
- [ ] Build CRUD forms for Pages
- [ ] Add guardrails: confirm dialogs, unsaved-changes prompts
- [ ] Verify: Owner can add/edit specials & events without knowing tech; previews match output

**Acceptance Criteria:** Owner can create/edit all content types; forms are intuitive; previews work.

---

## Phase 3 — Public Site

- [ ] Build homepage `/`: friendly hero ("Cold drinks, warm people"), Today's Specials, Tonight's Events, Hours + Map, phone & directions buttons
- [ ] Build `/events`: calendar/list toggle; filter by week/day; shows recurrences expanded
- [ ] Build `/menu`: simple sections (Beer, Cocktails, Shots, Bar Food); editable via CMS pages
- [ ] Build `/about`: photo + short story; accessible typography
- [ ] Build `/contact`: embedded map, hours, call button, accessibility notes (ramp, parking)
- [ ] Build `/announcements`: list + detail pages
- [ ] Implement SEO: title/description per page, OG tags, sitemap.xml, robots.txt
- [ ] Verify: Pages load fast; lighthouse a11y ≥ 90; mobile tap targets comfortable

**Acceptance Criteria:** All public pages render correctly; SEO metadata present; accessibility score ≥ 90.

---

## Phase 4 — Theme & Readability

- [ ] Design high-contrast palette (dark background, off-white text, vivid accent)
- [ ] Implement "Senior-friendly" size toggle (sm/md/lg)
- [ ] Ensure large buttons for "Call," "Map," "Tonight's Specials"
- [ ] Add keyboard navigation: landmarks, skip-links
- [ ] Test screen-reader compatibility
- [ ] Verify: WCAG AA contrast; text resizes without breaking layout

**Acceptance Criteria:** WCAG AA compliance; size toggle works; layout remains usable at all sizes.

---

## Phase 5 — Social Cross-Posting Stubs

- [ ] Add CMS toggles to "Also post to Facebook/Instagram" in Announcements and Specials forms
- [ ] Create preview modal (shows caption, link, image)
- [ ] Implement PostQueue insertion with status='staged'
- [ ] Build admin page to view queue: `/admin/posts`
- [ ] Add "Simulate Post" button that changes status to sent and logs payload
- [ ] Add clear TODOs + env placeholders for real API integration
- [ ] Verify: Owner can stage posts and see what would go out

**Acceptance Criteria:** Owner can toggle cross-posting; preview shows what would be posted; queue viewable.

---

## Phase 6 — Polish & Ops

- [ ] Create friendly 404 page
- [ ] Create friendly 500 error page
- [ ] Add basic analytics (pageviews only, privacy-safe)
- [ ] Setup Vercel deployment config (`vercel.json` if needed)
- [ ] Document environment variables in README
- [ ] Add backup instructions: prisma migrate diff + DB export notes
- [ ] Verify: Deployed MVP link works; README lets non-tech owner run it

**Acceptance Criteria:** Error pages are friendly; analytics working; deployment docs clear.

---

## Phase 7 — Tests

- [ ] Setup Playwright
- [ ] Write smoke test: homepage loads
- [ ] Write smoke test: create/edit special
- [ ] Write smoke test: create recurring event
- [ ] Write smoke test: announcements list renders
- [ ] Verify: CI passes on PR (or tests run locally)

**Acceptance Criteria:** Core user flows covered by tests; tests pass.

---

## Icebox (Document but don't build)

- [ ] Online ordering (menu items with modifiers, cart, Stripe)
- [ ] Full Meta Graph posting + scheduled posts
- [ ] Multi-user roles & audit log
- [ ] External storage (S3/R2) and image CDN

---

## UX & Content Guidelines (apply throughout)

- Copy tone: friendly, local, no tech jargon
- Forms: one clear purpose per screen, hints under labels, sensible defaults
- Readability: 18px base, 1.6 line-height, max-width ~70ch
- Buttons: "Save & Preview," "Publish," "Save Draft"

---

## Progress Log

*Last updated: 2025-11-05*

### Completed
- ✅ Phase 0: Project initialized with Next.js, TypeScript, Tailwind, ESLint, Prettier
- ✅ Phase 1: Prisma schema defined with all models (Special, Event, Announcement, Page, Setting, PostQueue)
- ✅ Database migrated and seeded with sample data

### Next Steps
- Phase 2: Build admin dashboard and CRUD forms

