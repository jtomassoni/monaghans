# Monaghan's Restaurant Management System

A comprehensive restaurant and bar management platform for owners and managers. Handle scheduling, menu management, online ordering, events, specials, analytics, and more—all in one place.

## Overview

Monaghan's is a full-featured restaurant management system designed to handle all aspects of running a restaurant or bar. From staff scheduling and menu management to online ordering and profitability analysis, everything you need is integrated into a single platform.

## Specials TV Display

- Designed for 10–30 ft viewing on a wall-mounted TV at `/specials-tv`; renders a read-only playlist of specials, happy hour, events, and custom slides.
- Uses oversized, high-contrast typography (72–110px headlines; 40–90px supporting text) so older patrons can read at a glance.
- Strictly separate from the management UI: no forms, no controls, no admin labels—just the slideshow generated from CMS data + signage config.
- 24/7 usage: open `/specials-tv` in Chrome/Edge, enable full-screen/kiosk, disable OS sleep and browser zoom, and optionally pass `?debug=1` for a small overlay when testing. Content refreshes on page reload; no interaction is required during playback.

## Features

### Content Management

**Calendar & Events**
- Week and month calendar views for events, specials, and announcements
- Create one-time or recurring events (daily, weekly, monthly patterns)
- Set exceptions for recurring events
- Organize events by venue area (bar, stage, etc.) and tags
- Drag-and-drop event editing

**Specials Management**
- Food and drink specials with weekday scheduling
- Set date ranges and time windows (e.g., "Happy Hour 4-6pm")
- Upload images for specials
- Display specials on homepage and calendar

**Announcements**
- Rich text announcements with images
- Schedule publish and expiry dates
- Cross-post to Facebook and Instagram
- Call-to-action buttons

**Homepage Customization**
- Customize hero section and about content
- Upload images and manage homepage layout

### Staff & Scheduling

**Employee Management**
- Manage employee profiles with roles (cook, bartender, barback)
- Set hourly wages and PIN codes for timeclock
- Track hire dates and employment status

**Shift Scheduling**
- Create weekly schedules with role-based assignments
- Set shift requirements (how many of each role needed per day/shift)
- Create reusable weekly schedule templates
- Auto-generate schedules based on requirements and availability
- View schedules in weekly grid format

**Availability Tracking**
- Employees can submit availability and time-off requests
- View availability by employee and status
- Availability is checked during schedule generation

**Timeclock System**
- Clock in/out functionality for employees
- Track break times
- View clock history and hours worked
- Edit clock times (admin)

**Payroll & Labor Costs**
- Calculate hours worked and labor costs per shift
- Generate payroll reports by period
- Filter by role or employee
- Track labor cost percentages

### Menu & Operations

**Menu Management**
- Organize menu into sections (appetizers, entrees, drinks, etc.)
- Create menu items with descriptions, prices, and images
- Add modifiers (sizes, toppings, etc.)
- Set item availability (available/unavailable)
- Track prep times

**Ingredient Tracking**
- Master ingredient list with categories and units
- Set ingredient costs and link to suppliers
- Track par levels
- Link ingredients to menu items with quantities

**Food Cost Analysis**
- Calculate food cost per menu item
- View food cost percentage (food cost / menu price)
- Generate food cost reports
- Track ingredient cost changes over time

**Kitchen Display System (KDS)**
- Kitchen-friendly order management interface
- View orders by status (new, preparing, ready)
- Update order status
- Search and filter orders
- Order timing metrics

**Order Management**
- View all orders (pending, in-progress, completed, cancelled)
- Update order status
- View order details and customer information
- Order history and search

### Online Ordering

**Customer Interface**
- Browse menu by sections
- Add items to cart with modifiers
- Checkout with customer information
- Stripe payment processing
- Order confirmation

**Order Tracking**
- Real-time order status updates
- Kitchen display system integration
- Order timing metrics

### Inventory & Suppliers

**Supplier Management**
- Manage supplier database
- Link products to ingredients
- Track product catalogs

**Purchase Orders**
- Create and track purchase orders
- Match supplier products to ingredients
- Track received quantities

**Cost Tracking**
- Track ingredient costs from different suppliers
- Compare prices across suppliers
- Calculate true cost per menu item

### Analytics & Reporting

**Sales Analytics**
- Track items sold by time of day and day of week
- Identify best-selling items
- Identify slow movers
- Sales trends (daily, weekly, monthly)
- POS integration (Square) with support for Toast, Clover, Lightspeed, TouchBistro

**Food Cost Reports**
- Food cost analysis by menu item
- Food cost trends over time
- Ingredient cost tracking

**Labor Cost Reports**
- Labor cost analysis by shift, employee, and menu item
- Labor cost percentage vs. sales
- Hours worked tracking

**Profitability Analysis**
- Profit margins per menu item
- Prime cost (food cost + labor cost)
- Contribution margin analysis
- Identify high-volume, low-margin items
- Identify low-volume, high-margin items

**AI-Powered Insights**
- Automated menu optimization suggestions
- Scheduling optimization recommendations
- Predictive analytics for demand forecasting
- Ingredient ordering suggestions

### Additional Features

**Social Media Integration**
- Facebook cross-posting for announcements, events, and specials
- Post scheduling via queue system
- Facebook post analytics

**Authentication**
- Role-based access control (admin, owner)
- User activity logging
- Permission-based feature access
- Authentication via environment variables

**Settings**
- Business hours and contact information
- Timezone configuration
- Shift type configuration
- Feature flags for enabling/disabling features

**Accessibility**
- WCAG AA compliance
- Keyboard navigation
- Screen reader support
- Mobile responsive design

**SEO**
- Sitemap and robots.txt
- Meta tags and Open Graph tags

## Tech Stack

- Next.js 16 (App Router)
- TypeScript
- PostgreSQL with Prisma ORM
- Tailwind CSS
- NextAuth.js for authentication
- Stripe for payments
- Playwright for e2e testing

## Quick Start

```bash
npm install
cp .env.example .env  # Configure environment variables
npm run db:migrate
npm run dev
```

See `.env.example` for required environment variables.

## Documentation

- **`FEATURES.md`** - Detailed feature documentation
- **`TODO.md`** - Roadmap and completed phases
- **`BUG_TODO.md`** - Known bugs and test coverage gaps
- **`PARTIALLY_BUILT_FEATURES.md`** - Features needing additional work
- **`e2e/README.md`** - Testing documentation

## License

Private - All rights reserved
