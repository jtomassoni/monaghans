# Digital Signage Ads System - Implementation TODO

## Overview
Implement a comprehensive Digital Signage Ads system with admin-controlled feature flags, owner-accessible ad management, PDF/image ingestion, strategic ad placement, and public marketing pages.

**Note**: This system **extends** the existing digital signage infrastructure. The app already has:
- Digital signage at `/specials-tv` with custom slides management
- Signage configuration stored in Setting table (`signageConfig`)
- Custom slides management UI at `/admin/signage`
- File uploads stored locally in `/public/uploads/` (similar to `/public/pics/`)

We will build upon these existing patterns rather than creating from scratch.

---

## ⚠️ IMPORTANT: Workflow Requirements

**Between each phase, you MUST:**
1. **Run database migrations** (if any schema changes were made):
   ```bash
   npx prisma migrate dev --name <migration_name>
   ```
2. **Build the project** to catch any TypeScript/build errors:
   ```bash
   npm run build
   ```
   - Fix any errors that come up before proceeding
3. **Commit your changes**:
   ```bash
   git add .
   git commit -m "Phase X: <description>"
   ```

**This ensures the codebase stays in a working state throughout implementation and makes it easier to identify issues early.**

---

## Phase 1: Database Schema & Models

### 1.1 Extend Settings Model for Feature Flags
- [ ] **Add hierarchical feature flag structure to Setting model**
  - Store `features.digitalSignage.enabled` (top-level)
  - Store `features.digitalSignage.ads.enabledByAdmin` (admin-only sub-flag)
  - Use JSON structure in Setting.value field
  - Default: `{ features: { digitalSignage: { enabled: false, ads: { enabledByAdmin: false } } } }`

### 1.2 Create Upload Model
- [ ] **Add Upload table to schema.prisma**
  - Fields: `id`, `originalFilename`, `mimeType`, `sizeBytes`, `storageKey`, `createdByUserId`, `createdAt`, `updatedAt`
  - Relation: `createdBy User @relation(...)`
  - Index: `createdByUserId`, `createdAt`

### 1.3 Create Asset Model
- [ ] **Add Asset table to schema.prisma**
  - Fields: `id`, `uploadId`, `kind` (enum: 'IMAGE' | 'PDF_PAGE_IMAGE'), `storageKey`, `width`, `height`, `createdAt`
  - Relation: `upload Upload @relation(...)`
  - Index: `uploadId`

### 1.4 Create Slide Model
- [ ] **Add Slide table to schema.prisma**
  - Fields: `id`, `type` (enum: 'CONTENT' | 'AD_FULL' | 'AD_EMBEDDED'), `assetId`, `title`, `active`, `orderIndex`, `startAt?`, `endAt?`, `createdAt`, `updatedAt`
  - Relation: `asset Asset @relation(...)`
  - Index: `type`, `active`, `orderIndex`, `startAt`, `endAt`

### 1.5 Create AdCampaign Model
- [ ] **Add AdCampaign table to schema.prisma**
  - Fields: `id`, `name`, `tier` (enum: 'FULL_SLIDE' | 'EMBEDDED'), `active`, `weight` (default 1), `startAt?`, `endAt?`, `createdAt`, `updatedAt`
  - Index: `tier`, `active`, `startAt`, `endAt`

### 1.6 Create AdCreative Model
- [ ] **Add AdCreative table to schema.prisma**
  - Fields: `id`, `campaignId`, `assetId`, `destinationUrl?`, `qrEnabled` (bool, default false), `active`, `createdAt`, `updatedAt`
  - Relations: `campaign AdCampaign @relation(...)`, `asset Asset @relation(...)`
  - Index: `campaignId`, `assetId`, `active`

### 1.7 Create AdvertiseLead Model
- [ ] **Add AdvertiseLead table to schema.prisma**
  - Fields: `id`, `name`, `email`, `phone?`, `businessName?`, `message?`, `adType?` (enum: 'FULL_SLIDE' | 'EMBEDDED'), `status` (default 'new'), `createdAt`, `updatedAt`
  - Index: `status`, `createdAt`, `email`

### 1.8 Database Migration
- [ ] **Create and run Prisma migration**
  - Generate migration: `npx prisma migrate dev --name add_digital_signage_ads`
  - Verify migration SQL
  - Test migration on dev database

### 1.9 Phase 1 Completion Checklist
- [ ] **Run migration**: `npx prisma migrate dev --name add_digital_signage_ads`
- [ ] **Build project**: `npm run build` (fix any TypeScript errors)
- [ ] **Commit changes**: `git commit -m "Phase 1: Database schema and models for digital signage ads"`

---

## Phase 2: Feature Flag System & Settings API

### 2.1 Settings API - GET /api/settings/features
- [ ] **Create GET /api/settings/features route**
  - Read user role from session
  - Fetch feature flags from Setting table
  - **Admin users**: Return full feature tree including `ads.enabledByAdmin`
  - **Owner users**: Return feature tree but **omit** `ads.enabledByAdmin` entirely (don't include field)
  - Server-side enforcement (not just UI hiding)
  - Return structure: `{ features: { digitalSignage: { enabled: boolean, ads?: { enabledByAdmin: boolean } } } }`

### 2.2 Settings API - PATCH /api/settings/features
- [ ] **Create PATCH /api/settings/features route**
  - Require authentication
  - Check user role
  - **Admin only**: Allow patching `features.digitalSignage.enabled` and `features.digitalSignage.ads.enabledByAdmin`
  - **Owner users**: Return 403 if attempting to patch anything under `features.digitalSignage.ads.*`
  - Validate structure before saving
  - Update Setting record with JSON stringified value
  - Log activity via ActivityLog

### 2.3 Feature Flag Helper Functions
- [ ] **Create lib/feature-flags-ads.ts**
  - `getFeatureFlags(userRole: 'admin' | 'owner')` - returns filtered flags based on role
  - `isDigitalSignageEnabled()` - check top-level flag
  - `isAdsEnabledByAdmin()` - check admin-only flag (admin only, returns false for owners)
  - `canManageAdsSettings(userRole)` - check if user can modify ads.enabledByAdmin

### 2.4 Phase 2 Completion Checklist
- [ ] **Build project**: `npm run build` (fix any TypeScript errors)
- [ ] **Commit changes**: `git commit -m "Phase 2: Feature flag system and settings API"`

---

## Phase 3: Upload & PDF Conversion Pipeline

### 3.1 Upload API - POST /api/signage/uploads
- [ ] **Create POST /api/signage/uploads route**
  - Require authentication (owners + admins)
  - Accept multipart/form-data
  - Validate file types: `png`, `jpg/jpeg`, `webp`, `gif`, `pdf`
  - Validate file size (max 10MB for images, 20MB for PDFs)
  - **Store files locally in repo**: `/public/uploads/{uploadId}/{originalFilename}` (same pattern as existing `/public/pics/` and `/public/uploads/`)
  - Files are committed to repo (not external storage) - we handle hosting manually like public pics
  - Create Upload record in database
  - Return upload metadata

### 3.2 PDF Processing Service
- [ ] **Create lib/pdf-processor.ts**
  - Install PDF processing library (e.g., `pdf-poppler`, `pdfjs-dist`, or `pdf2pic`)
  - Function: `convertPdfToImages(pdfPath: string, uploadId: string)`
  - Convert each PDF page to image (webp format preferred)
  - **Save page images locally in repo**: `/public/uploads/{uploadId}/pages/{pageNumber}.webp`
  - Files are committed to repo (same pattern as existing uploads)
  - Return array of page image paths with dimensions
  - Handle errors gracefully

### 3.3 Asset Creation from Uploads
- [ ] **Create lib/asset-processor.ts**
  - Function: `createAssetFromUpload(uploadId: string, filePath: string, kind: 'IMAGE' | 'PDF_PAGE_IMAGE')`
  - For images: Extract dimensions using sharp or similar
  - For PDF pages: Use dimensions from PDF processor
  - Create Asset record with storageKey, width, height
  - Return Asset object

### 3.4 Upload Processing Workflow
- [ ] **Update POST /api/signage/uploads to handle processing**
  - After saving original file:
    - If PDF: Call PDF processor → create Asset for each page
    - If image: Create single Asset record
  - Return: `{ uploadId, assets: Asset[] }`
  - Handle errors and cleanup on failure

### 3.5 Package Dependencies
- [ ] **Add required packages to package.json**
  - PDF processing: `pdf-poppler` or `pdfjs-dist` or `pdf2pic`
  - Image processing: `sharp` (if not already present)
  - Update package-lock.json
  - Run `npm install` to install new dependencies

### 3.6 Phase 3 Completion Checklist
- [ ] **Build project**: `npm run build` (fix any TypeScript errors)
- [ ] **Commit changes**: `git commit -m "Phase 3: Upload and PDF conversion pipeline"`

---

## Phase 4: Ad/Slide Management API

### 4.1 Slides API - CRUD
- [ ] **Create GET /api/signage/slides route**
  - Require authentication (owners + admins)
  - Return all slides (CONTENT, AD_FULL, AD_EMBEDDED)
  - Filter by `type` query param if provided
  - Filter by `active` query param if provided
  - Include asset information
  - Order by `orderIndex`

- [ ] **Create POST /api/signage/slides route**
  - Require authentication (owners + admins)
  - Accept: `type`, `assetId`, `title`, `active`, `orderIndex`, `startAt?`, `endAt?`
  - Validate asset exists
  - Create Slide record
  - Return created slide

- [ ] **Create PATCH /api/signage/slides/[id] route**
  - Require authentication (owners + admins)
  - Update slide fields
  - Validate asset if assetId changed
  - Return updated slide

- [ ] **Create DELETE /api/signage/slides/[id] route**
  - Require authentication (owners + admins)
  - Soft delete or hard delete (decide based on repo patterns)
  - Return success

### 4.2 Ad Campaigns API - CRUD
- [ ] **Create GET /api/signage/campaigns route**
  - Require authentication (owners + admins)
  - Return all campaigns
  - Filter by `tier`, `active` query params
  - Include related creatives count

- [ ] **Create POST /api/signage/campaigns route**
  - Require authentication (owners + admins)
  - Accept: `name`, `tier`, `active`, `weight`, `startAt?`, `endAt?`
  - Validate tier enum
  - Create AdCampaign record
  - Return created campaign

- [ ] **Create PATCH /api/signage/campaigns/[id] route**
  - Require authentication (owners + admins)
  - Update campaign fields
  - Return updated campaign

- [ ] **Create DELETE /api/signage/campaigns/[id] route**
  - Require authentication (owners + admins)
  - Check for related creatives (warn or cascade)
  - Delete campaign
  - Return success

### 4.3 Ad Creatives API - CRUD
- [ ] **Create GET /api/signage/creatives route**
  - Require authentication (owners + admins)
  - Return all creatives
  - Filter by `campaignId`, `active` query params
  - Include asset and campaign information

- [ ] **Create POST /api/signage/creatives route**
  - Require authentication (owners + admins)
  - Accept: `campaignId`, `assetId`, `destinationUrl?`, `qrEnabled`, `active`
  - Validate campaign and asset exist
  - Create AdCreative record
  - Return created creative

- [ ] **Create PATCH /api/signage/creatives/[id] route**
  - Require authentication (owners + admins)
  - Update creative fields
  - Return updated creative

- [ ] **Create DELETE /api/signage/creatives/[id] route**
  - Require authentication (owners + admins)
  - Delete creative
  - Return success

### 4.4 Slide Reordering API
- [ ] **Create PATCH /api/signage/slides/reorder route**
  - Require authentication (owners + admins)
  - Accept: `{ slides: [{ id, orderIndex }] }`
  - Bulk update orderIndex for multiple slides
  - Validate all slides exist
  - Return success

### 4.5 Phase 4 Completion Checklist
- [ ] **Build project**: `npm run build` (fix any TypeScript errors)
- [ ] **Commit changes**: `git commit -m "Phase 4: Ad/slide management API endpoints"`

---

## Phase 5: Admin UI - Feature Flag Management

### 5.1 Admin Settings Page - Digital Signage Section
- [ ] **Create or extend app/admin/settings/page.tsx**
  - Add "Digital Signage" section (admin-only visibility)
  - Check user role server-side, only render for admins
  - Toggle: "Digital Signage Enabled" → `features.digitalSignage.enabled`
  - Toggle: "Ads Enabled (Billing)" → `features.digitalSignage.ads.enabledByAdmin`
  - Use existing toggle component patterns
  - Call PATCH /api/settings/features on change
  - Show success/error toasts

### 5.2 Settings Component
- [ ] **Create components/digital-signage-settings.tsx**
  - Client component for admin settings
  - Fetch current feature flags on mount
  - Handle toggle changes
  - Display loading states
  - Error handling

### 5.3 Phase 5 Completion Checklist
- [ ] **Build project**: `npm run build` (fix any TypeScript errors)
- [ ] **Commit changes**: `git commit -m "Phase 5: Admin UI for feature flag management"`

---

## Phase 6: Owner UI - Ad/Slide Management

**Note**: The app already has signage management at `/admin/signage` with custom slides. We will extend this existing infrastructure.

### 6.1 Signage Management Page
- [ ] **Extend existing app/admin/signage/page.tsx**
  - Server component, require authentication (already exists)
  - Accessible to both owners and admins (already configured)
  - **Extend** to fetch new ad-related data: campaigns, creatives, and new Slide model records
  - **Add tabs or sections** alongside existing custom slides: "Content Slides", "Ad Campaigns", "Ad Creatives"
  - Show notice if ads disabled: "Ads are currently not active on the live display." (non-sensitive)
  - Do NOT reveal `enabledByAdmin` flag state
  - Keep existing custom slides functionality intact

### 6.2 Content Slides Management
- [ ] **Create app/admin/signage/content-slides.tsx** (new component)
  - **Extend** existing custom slides pattern but use new Slide model (type: CONTENT)
  - List all CONTENT type slides from database (separate from existing customSlides in config)
  - Upload new images/PDFs (reuse existing upload patterns)
  - Create slides from assets
  - Reorder slides (similar to existing moveSlide functionality in SignageForm)
  - Activate/deactivate slides
  - Schedule slides (startAt/endAt)
  - Edit/delete slides
  - Preview slides
  - **Note**: This complements (does not replace) existing custom slides in signageConfig

### 6.3 Ad Campaigns Management
- [ ] **Create app/admin/signage/ad-campaigns.tsx**
  - List all campaigns
  - Create new campaign (name, tier: FULL_SLIDE or EMBEDDED, weight, dates)
  - Edit/delete campaigns
  - Show related creatives count
  - Activate/deactivate campaigns

### 6.4 Ad Creatives Management
- [ ] **Create app/admin/signage/ad-creatives.tsx**
  - List all creatives (grouped by campaign)
  - Upload images/PDFs for creatives
  - Create creative from asset
  - Attach to campaign
  - Set destination URL (optional)
  - Enable/disable QR code generation
  - Activate/deactivate creatives
  - Preview creatives

### 6.5 Upload Modal Component
- [ ] **Create components/signage-upload-modal.tsx**
  - File input (accept: images + PDFs)
  - Drag-and-drop support
  - Progress indicator during upload
  - Show processing status (for PDFs)
  - Display created assets
  - Allow selecting assets to create slides/creatives

### 6.6 Preview Mode
- [ ] **Add preview toggle to signage management UI**
  - Client-side preview toggle (not tied to enabledByAdmin)
  - When enabled, show preview of signage with ads included
  - Use existing SignageRotator component
  - Build preview playlist with ads (even if enabledByAdmin is false)
  - Do not leak actual enabledByAdmin state

### 6.7 Phase 6 Completion Checklist
- [ ] **Build project**: `npm run build` (fix any TypeScript errors)
- [ ] **Commit changes**: `git commit -m "Phase 6: Owner UI for ad/slide management"`

---

## Phase 7: Signage Rendering Logic

### 7.1 Playlist Builder with Ads
- [ ] **Extend existing app/specials-tv/slide-builder.ts or create lib/signage-playlist-builder.ts**
  - **Build upon existing `buildSlides()` function** that already handles specials, events, and custom slides
  - Function: `buildSignagePlaylistWithAds(options: { includeAds: boolean, ...existingBuildSlidesParams })`
  - Fetch active CONTENT slides from new Slide model (within schedule window)
  - **Integrate with existing slide building** - ads are inserted into the existing playlist
  - If `includeAds` is true:
    - Fetch active FULL_SLIDE ad slides
    - Insert every N content slides (default N=4, configurable)
    - Weight-based selection for ad slides
  - Return ordered playlist array (combines existing slides + new CONTENT slides + ads)
  - Respect schedule windows (startAt/endAt)
  - **Preserve existing slide ordering and custom slides functionality**

### 7.2 AdZone Component
- [ ] **Create components/ad-zone.tsx**
  - Props: `placement: 'embedded-middle'`, `ads: AdCreative[]`, `enabled: boolean`
  - If `enabled` is false, return null (no rendering, no timers)
  - If `enabled` is true:
    - Render embedded ads in "dead space" zone
    - Rotate ads every 12-15 seconds
    - Use object-fit: contain, center alignment
    - Handle QR code rendering if `qrEnabled` is true
  - Clean up timers on unmount

### 7.3 Update SignageRotator Component
- [ ] **Modify components/signage-rotator.tsx**
  - Accept `adsEnabled: boolean` prop
  - Accept `embeddedAds: AdCreative[]` prop
  - Integrate `<AdZone />` component in slide rendering
  - Only render AdZone if `adsEnabled` is true
  - Position AdZone in "middle dead space" area
  - Do not start ad timers if `adsEnabled` is false

### 7.4 Update SpecialsTvPage
- [ ] **Extend existing app/specials-tv/page.tsx**
  - **Keep existing functionality intact** (specials, events, custom slides from config)
  - Fetch feature flags (check user role for filtering)
  - Check `features.digitalSignage.enabled` (if false, show disabled message)
  - Check `features.digitalSignage.ads.enabledByAdmin` (admin-only check)
  - Fetch active ad campaigns and creatives
  - Fetch CONTENT slides from new Slide model (in addition to existing customSlides)
  - Build playlist using playlist builder (integrates with existing buildSlides function)
  - Pass `adsEnabled` and `embeddedAds` to SignageRotator
  - Gate ad insertion based on `enabledByAdmin` flag
  - **Ensure existing custom slides from signageConfig still work**

### 7.5 Ad Insertion Logic
- [ ] **Implement strategic ad insertion**
  - Default: Insert FULL_SLIDE ad every 4 content slides
  - Weight-based selection for which ad to show
  - Respect campaign active dates and weights
  - Ensure ads don't cluster at start/end of playlist

### 7.6 Embedded Ad Rotation
- [ ] **Implement embedded ad rotation**
  - Rotate embedded ads independently from slide rotation
  - Default rotation: 12-15 seconds per ad
  - Weight-based selection
  - Smooth transitions
  - Respect campaign active dates

### 7.7 Phase 7 Completion Checklist
- [ ] **Build project**: `npm run build` (fix any TypeScript errors)
- [ ] **Commit changes**: `git commit -m "Phase 7: Signage rendering with ad integration"`

---

## Phase 8: Public Marketing Pages

### 8.1 Advertise Landing Page
- [ ] **Create app/advertise/page.tsx**
  - Public page (no auth required)
  - Hero section explaining advertising opportunity
  - Two options: "Embedded Sponsor" and "Full Slide Sponsor"
  - Benefits: Hours (8am-2am), always-on presence, month-to-month
  - CTA: Contact form
  - Design: Professional, geared to local businesses

### 8.2 Advertise Specs Page
- [ ] **Create app/advertise/specs/page.tsx**
  - Public page
  - Technical specifications for ad creatives
  - Image dimensions, formats, file size limits
  - PDF requirements
  - Design guidelines
  - Examples/preview images

### 8.3 Advertise Thank You Page
- [ ] **Create app/advertise/thank-you/page.tsx**
  - Public page
  - Thank you message after form submission
  - Next steps information
  - Contact information

### 8.4 Lead Capture API
- [ ] **Create POST /api/advertise-leads route**
  - Public endpoint (no auth required, but consider rate limiting)
  - Accept: `name`, `email`, `phone?`, `businessName?`, `message?`, `adType?`
  - Validate required fields
  - Create AdvertiseLead record
  - Send notification email (if email system exists)
  - Return success

### 8.5 Lead Capture Form Component
- [ ] **Create components/advertise-lead-form.tsx**
  - Form fields: name, email, phone, business name, message, ad type selection
  - Validation
  - Submit to POST /api/advertise-leads
  - Show success/error messages
  - Redirect to thank-you page on success

### 8.6 House Slide Template
- [ ] **Create "Advertise Here" content slide template**
  - Pre-designed slide pointing to /advertise
  - Owners can enable/disable like any other content slide
  - Include in default content slides if desired

### 8.7 Phase 8 Completion Checklist
- [ ] **Build project**: `npm run build` (fix any TypeScript errors)
- [ ] **Commit changes**: `git commit -m "Phase 8: Public marketing pages and lead capture"`

---

## Phase 9: Testing

### 9.1 Unit Tests - Feature Flags
- [ ] **Test GET /api/settings/features**
  - Admin receives `ads.enabledByAdmin` field
  - Owner does NOT receive `ads.enabledByAdmin` field (omitted entirely)
  - Verify field is not in response JSON for owners

- [ ] **Test PATCH /api/settings/features**
  - Admin can set `ads.enabledByAdmin`
  - Owner receives 403 when attempting to patch `ads.enabledByAdmin`
  - Owner can still access other endpoints (ad management)

### 9.2 Integration Tests - Signage Rendering
- [ ] **Test signage playlist with ads disabled**
  - When `enabledByAdmin` is false:
    - Playlist contains NO FULL_SLIDE ad slides
    - AdZone component returns null
    - No ad timers/intervals start
    - Only CONTENT slides in playlist

- [ ] **Test signage playlist with ads enabled**
  - When `enabledByAdmin` is true:
    - FULL_SLIDE ads inserted every N content slides
    - AdZone renders embedded ads
    - Ad rotation timers active
    - Weight-based ad selection works

### 9.3 E2E Tests
- [ ] **Create e2e/digital-signage-ads.spec.ts**
  - Test admin can enable/disable ads flag
  - Test owner cannot see or modify ads flag
  - Test owner can manage ad campaigns/creatives regardless of flag
  - Test upload and PDF conversion
  - Test ad rendering in signage (when enabled)
  - Test ad rendering is absent (when disabled)
  - Test public advertise pages

### 9.4 Phase 9 Completion Checklist
- [ ] **Build project**: `npm run build` (fix any TypeScript errors)
- [ ] **Run tests**: Verify all tests pass
- [ ] **Commit changes**: `git commit -m "Phase 9: Testing for digital signage ads"`

---

## Phase 10: Documentation

### 10.1 README Updates
- [ ] **Update README.md with Digital Signage Ads section**
  - How admins enable ads for billing
  - How owners manage slides/ads
  - How preview works
  - Upload requirements
  - API endpoints documentation

### 10.2 Code Comments
- [ ] **Add JSDoc comments to key functions**
  - Feature flag helpers
  - Playlist builder
  - PDF processor
  - Ad insertion logic

### 10.3 Phase 10 Completion Checklist
- [ ] **Build project**: `npm run build` (fix any TypeScript errors)
- [ ] **Final commit**: `git commit -m "Phase 10: Documentation for digital signage ads"`

---

## Implementation Notes

### Critical Requirements
1. **Server-side enforcement**: All permission checks must be on the server, not just UI hiding
2. **No flag leakage**: Owners must never see `ads.enabledByAdmin` in API responses or logs
3. **Owner access**: Owners can manage ads even when flag is disabled (only rendering is gated)
4. **Multi-tenant ready**: Schema supports tenant scoping if needed later (currently single-tenant)
5. **Extend, don't replace**: Build upon existing signage infrastructure. Keep existing custom slides and signage config working.
6. **Local file storage**: All uploaded files (images, PDFs, converted pages) are stored in `/public/uploads/` and committed to the repo, just like existing `/public/pics/`. No external storage needed.

### Technical Decisions Needed
1. **PDF Library**: Choose `pdf-poppler`, `pdfjs-dist`, or `pdf2pic` based on deployment environment
2. **Image Format**: Use webp for converted PDF pages (or png if webp not supported)
3. **Storage**: **Files stored locally in repo** at `/public/uploads/` (same pattern as existing `/public/pics/`). Files are committed to git and hosted manually. No external storage needed.
4. **Ad Insertion Frequency**: Default N=4 (every 4 content slides), make configurable later
5. **Embedded Ad Rotation**: Default 12-15 seconds, make configurable later
6. **Existing Custom Slides**: Keep existing `customSlides` in `signageConfig` working alongside new Slide model. New CONTENT slides are additional, not replacements.

### Dependencies to Add
- PDF processing library (TBD based on deployment)
- QR code generation library (if QR codes needed)
- Image processing library (sharp, if not already present)

---

## Phase Order Recommendation
1. **Phase 1** (Database) - Foundation
2. **Phase 2** (Feature Flags) - Permission system
3. **Phase 3** (Upload Pipeline) - File handling
4. **Phase 4** (Management API) - CRUD operations
5. **Phase 5** (Admin UI) - Settings
6. **Phase 6** (Owner UI) - Management interface
7. **Phase 7** (Rendering) - Signage integration
8. **Phase 8** (Public Pages) - Marketing
9. **Phase 9** (Testing) - Quality assurance
10. **Phase 10** (Documentation) - Final polish

---

## Estimated Complexity
- **Database**: Medium (6 new models, migrations)
- **Feature Flags**: Medium (role-based filtering, server enforcement)
- **Upload Pipeline**: High (PDF conversion, error handling)
- **Management API**: Medium (standard CRUD, multiple endpoints)
- **Admin UI**: Low (simple toggles)
- **Owner UI**: High (complex management interface)
- **Rendering Logic**: High (playlist building, ad insertion, rotation)
- **Public Pages**: Low (static pages + form)
- **Testing**: Medium (comprehensive coverage needed)

**Total Estimated Time**: 3-4 weeks for full implementation

