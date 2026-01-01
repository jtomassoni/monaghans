# Analytics & SEO Tracking Setup Guide

This application includes comprehensive analytics tracking for SEO auditing and improvement. The setup includes both Google Analytics 4 (GA4) for comprehensive metrics and a privacy-safe internal tracking system as a fallback.

## Features

### SEO-Relevant Tracking
- **Page Views**: Track all public page visits with full paths
- **User Engagement**: Session duration, bounce rate, pages per session
- **Search Queries**: Track search terms used on the site
- **Custom Events**: Menu views, form submissions, CTA clicks
- **Traffic Sources**: Organic search, direct, referral, social
- **Landing Pages**: Which pages users enter the site from
- **Exit Pages**: Which pages users leave from
- **Device & Browser Data**: Mobile vs desktop usage

### Privacy-Safe Internal Tracking
- Tracks pageviews and events without cookies or personal data
- Stores aggregated data in the database
- No IP addresses or user identifiers stored

## Setup Instructions

### 1. Create a Google Analytics 4 Property

1. **Go to Google Analytics**: Visit [https://analytics.google.com/](https://analytics.google.com/)
2. **Sign in** with your Google account
3. **Create a Property** (if you don't have one):
   - Click "Admin" (gear icon) in the bottom left
   - Click "Create Property"
   - Enter property name: "Monaghan's Website"
   - Select time zone and currency
   - Click "Next" and complete the setup

4. **Get Your Measurement ID**:
   - In Admin, go to "Data Streams"
   - Click on your web stream (or create one)
   - Copy the **Measurement ID** (format: `G-XXXXXXXXXX`)

### 2. Configure Environment Variable

Add the following to your `.env` file:

```env
# Google Analytics 4
NEXT_PUBLIC_GA4_MEASUREMENT_ID=G-XXXXXXXXXX
```

Replace `G-XXXXXXXXXX` with your actual Measurement ID from Google Analytics.

**Important**: 
- The `NEXT_PUBLIC_` prefix is required for Next.js to expose this variable to the browser
- Restart your development server after adding this variable
- For production, add this to your hosting platform's environment variables (Vercel, etc.)

### 3. Verify Installation

1. **Deploy or run your site** with the environment variable set
2. **Visit your site** and navigate to a few pages
3. **Check Google Analytics**:
   - Go to Google Analytics → Reports → Realtime
   - You should see your visit appear within a few seconds
4. **Check Internal Analytics**:
   - The internal tracking will work even without GA4 configured
   - Data is stored in the database under the `analytics_pageviews` and `analytics_events` settings

## Using Custom Event Tracking

You can track custom events for SEO analysis throughout your application:

```typescript
import { trackEvent } from '@/components/analytics';

// Track menu views
trackEvent('menu_view', {
  menu_type: 'food', // or 'drink'
  section: 'appetizers'
});

// Track form submissions
trackEvent('form_submission', {
  form_type: 'private_events',
  success: true
});

// Track CTA clicks
trackEvent('cta_click', {
  cta_location: 'homepage_hero',
  cta_text: 'View Menu'
});

// Track search queries
trackEvent('search', {
  query: 'burger',
  results_count: 5
});
```

## SEO Metrics Available in GA4

Once set up, you'll have access to these SEO-relevant reports in Google Analytics:

### 1. **Acquisition Reports**
- Organic search traffic
- Search queries (when connected to Search Console)
- Referral sources
- Social media traffic

### 2. **Engagement Reports**
- Pages per session
- Average session duration
- Bounce rate
- Scroll depth
- Time on page

### 3. **Traffic Reports**
- Top landing pages
- Top exit pages
- Page views by page
- User flow through the site

### 4. **Audience Reports**
- Device category (mobile/desktop/tablet)
- Browser and OS
- Geographic location
- New vs returning visitors

### 5. **Custom Events**
- Menu interactions
- Form submissions
- CTA clicks
- Any custom events you track

## Connecting Google Search Console

For even better SEO insights, connect Google Search Console to GA4:

1. **Set up Search Console**: [https://search.google.com/search-console](https://search.google.com/search-console)
2. **Verify your site** in Search Console
3. **Link Search Console to GA4**:
   - In GA4, go to Admin → Search Console Links
   - Click "Link" and select your Search Console property
   - This will add search query data to your GA4 reports

## Internal Analytics API

The internal analytics system stores data in your database. You can access it via:

- **Pageviews**: Stored in `Setting` table with key `analytics_pageviews`
- **Events**: Stored in `Setting` table with key `analytics_events`

Data format:
```json
{
  "2025-01-27": {
    "/": 150,
    "/menu": 75,
    "/events": 30
  }
}
```

## Troubleshooting

### GA4 Not Tracking
1. **Check environment variable**: Ensure `NEXT_PUBLIC_GA4_MEASUREMENT_ID` is set correctly
2. **Check browser console**: Look for errors related to `gtag`
3. **Verify Measurement ID**: Make sure it starts with `G-` and is correct
4. **Check ad blockers**: Some ad blockers prevent GA4 from loading (this is expected)

### Internal Analytics Not Working
1. **Check API endpoint**: Visit `/api/analytics/pageview` to verify it's accessible
2. **Check database**: Verify the `Setting` table exists and is accessible
3. **Check browser console**: Look for network errors

## Privacy & Compliance

- **No cookies required**: The internal tracking system doesn't use cookies
- **No personal data**: Only paths, dates, and event names are stored
- **GDPR-friendly**: The internal system is privacy-safe
- **GA4 compliance**: Google Analytics 4 is GDPR-compliant when configured with appropriate consent (if required in your jurisdiction)

## Next Steps for SEO Improvement

1. **Monitor key metrics weekly**:
   - Organic search traffic trends
   - Top landing pages
   - Bounce rate by page
   - Average session duration

2. **Identify opportunities**:
   - Pages with high bounce rates → improve content
   - Pages with low traffic → improve internal linking
   - High-traffic pages → optimize for conversions

3. **Track improvements**:
   - Before/after comparisons for content updates
   - Monitor impact of SEO changes
   - Track custom events to measure engagement

4. **Regular audits**:
   - Review Search Console for crawl errors
   - Check for 404 errors in GA4
   - Monitor page load times
   - Review mobile vs desktop usage


