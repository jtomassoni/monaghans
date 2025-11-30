# Partially Built Features

This document tracks incomplete features that have UI and data models but are missing core functionality or API integrations.

## Summary

These features are partially implemented but require additional work to be fully functional. They typically have:
- UI components and user interfaces
- Database models and schemas
- Stubbed API calls or TODO comments
- Missing third-party integrations

## Open Half-Built Features

### [ID-011] [HALF-BUILT] POS Integration Stubbed

- **Area:** POS Integration
- **Severity:** Medium
- **Status:** Open
- **Type:** [HALF-BUILT]
- **Description:** POS integration system has UI and data models, but most provider integrations are stubbed with TODO comments. Square has partial implementation, but Toast, Clover, Lightspeed, and TouchBistro are not implemented.
- **Steps to Reproduce:**
  1. Navigate to POS Integrations page
  2. Attempt to connect a POS system (other than Square)
  3. Integration fails or is not functional
- **Expected Behavior:** All POS providers should be fully integrated
- **Actual Behavior:** Most providers are stubbed
- **Relevant Files/Routes:**
  - `lib/pos-helpers.ts` lines 205-214
  - `app/admin/pos-integrations/page.tsx`
- **Notes / Suggested Fix:** Implement real API integrations for each POS provider. Requires API credentials and provider-specific integration work.

### [ID-012] [HALF-BUILT] Supplier API Integration Stubbed

- **Area:** Supplier Integration
- **Severity:** Medium
- **Status:** Open
- **Type:** [HALF-BUILT]
- **Description:** Supplier integration system has UI and data models, but all supplier API calls (Sysco, US Foods, Costco) are stubbed with TODO comments. Product matching and purchase order creation work, but actual API calls are mocked.
- **Steps to Reproduce:**
  1. Navigate to Suppliers page
  2. Attempt to sync catalog from a supplier
  3. Sync fails or returns mocked data
  4. Attempt to place an order
  5. Order is not actually placed
- **Expected Behavior:** Supplier APIs should be fully integrated
- **Actual Behavior:** All supplier API calls are stubbed
- **Relevant Files/Routes:**
  - `lib/supplier-helpers.ts` (all functions)
  - `app/admin/suppliers/` pages
- **Notes / Suggested Fix:** Implement real API integrations for each supplier. Requires API credentials and supplier-specific integration work.

### [ID-013] [HALF-BUILT] Network Printing Not Implemented

- **Area:** Print System
- **Severity:** Low
- **Status:** Open
- **Type:** [HALF-BUILT]
- **Description:** Print preview system exists, but actual network printing functionality is stubbed with a TODO comment.
- **Steps to Reproduce:**
  1. Navigate to print preview
  2. Attempt to print to network printer
  3. Printing fails or is not functional
- **Expected Behavior:** Should be able to print to network printers
- **Actual Behavior:** Network printing is stubbed
- **Relevant Files/Routes:**
  - `app/api/printers/print/route.ts` line 164
- **Notes / Suggested Fix:** Implement actual network printing using a library like `node-printer` or similar. Requires printer configuration and network setup.

### [ID-014] [HALF-BUILT] Email/SMS Notifications Not Implemented

- **Area:** Order System
- **Severity:** Medium
- **Status:** Open
- **Type:** [HALF-BUILT]
- **Description:** Order confirmation page exists, but no actual email or SMS sending is implemented. Customers receive on-screen confirmation but no email/SMS notification.
- **Steps to Reproduce:**
  1. Place an order
  2. Complete checkout
  3. View confirmation page
  4. Check email/SMS - no notification received
- **Expected Behavior:** Customers should receive email/SMS confirmation
- **Actual Behavior:** No email/SMS sending implemented
- **Relevant Files/Routes:**
  - `app/order/confirmation/page.tsx`
  - No email/SMS sending code found
- **Notes / Suggested Fix:** Implement email sending using a service like SendGrid, Resend, or similar. Implement SMS using Twilio or similar. Add configuration for email/SMS providers.

### [ID-015] [HALF-BUILT] Online Ordering Disabled

- **Area:** Online Ordering
- **Severity:** Low
- **Status:** Open
- **Type:** [HALF-BUILT]
- **Description:** Online ordering system backend exists and is functional, but the UI is currently disabled on the homepage. The primary purpose of the site is currently information communication, not direct engagement. The ordering interface, checkout, and payment processing are built but not accessible to customers.
- **Steps to Reproduce:**
  1. Navigate to homepage
  2. See "Order Online" button is disabled with "Coming Soon" message
  3. Direct navigation to `/order` still works but is not linked from public pages
- **Expected Behavior:** Online ordering should be fully enabled when ready
- **Actual Behavior:** Online ordering is disabled in UI
- **Relevant Files/Routes:**
  - `app/page.tsx` - Homepage with disabled "Order Online" button
  - `app/order/page.tsx` - Ordering interface (still functional)
  - `app/order/checkout/page.tsx` - Checkout page (still functional)
- **Notes / Suggested Fix:** When ready to enable online ordering, update homepage button to link to `/order` and remove "Coming Soon" message. Consider adding feature flag for gradual rollout.

