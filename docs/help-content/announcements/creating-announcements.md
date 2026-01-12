---
title: Creating and Managing Announcements
feature: announcements
route: /admin/announcements
keywords:
  - announcements
  - create announcement
  - post announcement
  - publish
aliases:
  - post
  - publishing
relatedFeatures:
  - announcements
  - homepage
version: 1.0.0
lastUpdated: 2025-01-27
---

# Creating and Managing Announcements

Share time-sensitive info: events, promotions, updates.

## Create Announcement

1. Go to [Calendar](/admin) or use the admin menu
2. Click **"New Announcement"**
3. Fill details and save

## Announcement Details

### Required
- **Title**: Headline
- **Body**: Content (supports markdown)

### Optional
- **Publish Date**: When to show (default: immediately)
- **Expiry Date**: When to hide (default: never)
- **Call-to-Action**: Button with text and URL
- **Status**: Published (visible) or Unpublished (hidden)

## Publish & Expiry Dates

### Publish Date
Set when announcement becomes visible:
- Set future date to schedule
- Leave blank to show immediately

**Example**: Set "December 1" to schedule for month start.

### Expiry Date
Set when announcement hides:
- Set date to auto-hide
- Leave blank to show indefinitely

**Example**: Set "December 31" to auto-remove holiday announcement.

## Call-to-Action Buttons

Add button to drive action:

1. Find **Call-to-Action** section
2. Enter **CTA Text**: Button label (e.g., "Learn More", "Book Now")
3. Enter **CTA URL**: Link destination (e.g., "/menu")
4. Button appears below content

**Example**:
- Text: "View Menu"
- URL: "/menu"
- Creates button linking to menu page

## Content Formatting

Body supports markdown:
- **Bold**: `**bold**`
- *Italic*: `*italic*`
- Links: `[text](url)`
- Lists: Use `-` for bullets
- Paragraphs: Double space for breaks

## Edit Announcement

1. Go to [Calendar](/admin) or use the admin menu
2. Click the announcement
3. Update details
4. Save

## Delete Announcement

1. Go to [Calendar](/admin) or use the admin menu
2. Click delete icon (trash)
3. Confirm

## Status

- **Published**: Visible (if within publish/expiry dates)
- **Unpublished**: Hidden regardless of dates

## Display Locations

Announcements appear on:
- **Homepage** (announcements section)
- **Calendar** (during active period)
- **Modals** (if configured)

## Scheduling

Schedule in advance:

1. Create announcement
2. Set future **Publish Date**
3. Set **Expiry Date**
4. Auto-appears and disappears based on dates

**Example**: "New Year's Eve Party":
- Publish: December 15
- Expiry: January 2
- Shows Dec 15–Jan 2

## Tips

- Use attention-grabbing headlines
- Keep content brief and scannable
- Add CTAs to drive engagement
- Schedule in advance
- Always set expiry dates to avoid stale content

## Next Steps

- [Homepage display](./homepage-announcements.md)
- [Best practices](./announcement-tips.md)

