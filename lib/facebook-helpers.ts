/**
 * Facebook Graph API Helper Functions
 */

interface FacebookPostOptions {
  message: string;
  link?: string;
  imageUrl?: string;
}

/**
 * Post to Facebook page using Graph API
 */
export async function postToFacebook(
  accessToken: string,
  pageId: string,
  options: FacebookPostOptions
): Promise<string> {
  const { message, link, imageUrl } = options;

  // Build the post payload
  const payload: Record<string, string> = {
    message,
    access_token: accessToken,
  };

  if (link) {
    payload.link = link;
  }

  if (imageUrl) {
    // For images, we need to upload them separately first
    // For now, we'll use the link method if imageUrl is provided
    payload.link = imageUrl;
  }

  // Post to Facebook page
  const response = await fetch(
    `https://graph.facebook.com/v18.0/${pageId}/feed`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(payload),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.error?.message || `Facebook API error: ${response.statusText}`
    );
  }

  return data.id;
}

/**
 * Upload image to Facebook and get attachment ID
 */
export async function uploadImageToFacebook(
  accessToken: string,
  pageId: string,
  imageUrl: string
): Promise<string> {
  // First, download the image
  const imageResponse = await fetch(imageUrl);
  if (!imageResponse.ok) {
    throw new Error('Failed to download image');
  }

  const imageBuffer = await imageResponse.arrayBuffer();
  const imageBlob = new Blob([imageBuffer]);

  // Upload to Facebook
  const formData = new FormData();
  formData.append('url', imageUrl);
  formData.append('access_token', accessToken);

  const response = await fetch(
    `https://graph.facebook.com/v18.0/${pageId}/photos`,
    {
      method: 'POST',
      body: formData,
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.error?.message || `Facebook API error: ${response.statusText}`
    );
  }

  return data.id;
}

/**
 * Format announcement content for Facebook post
 */
export function formatAnnouncementForFacebook(
  title: string,
  body: string,
  heroImage?: string | null,
  ctaUrl?: string | null
): FacebookPostOptions {
  // Strip HTML tags and markdown for Facebook
  const plainBody = body
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // Remove markdown links
    .replace(/\*\*([^\*]+)\*\*/g, '$1') // Remove bold markdown
    .replace(/\*([^\*]+)\*/g, '$1') // Remove italic markdown
    .trim();

  // Truncate if too long (Facebook has a limit)
  const maxLength = 5000;
  const truncatedBody = plainBody.length > maxLength 
    ? plainBody.substring(0, maxLength - 3) + '...'
    : plainBody;

  const message = `${title}\n\n${truncatedBody}`;

  return {
    message,
    link: ctaUrl || undefined,
    imageUrl: heroImage ? `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}${heroImage}` : undefined,
  };
}

/**
 * Format specials/events for daily Facebook post
 */
export function formatDailySpecialsForFacebook(
  specials: Array<{ title: string; description?: string | null; timeWindow?: string | null }>,
  events: Array<{ title: string; description?: string | null; startDateTime: string }>
): string {
  const today = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  let message = `📅 What's happening at Monaghan's today (${today}):\n\n`;

  if (specials.length > 0) {
    message += '🍽️ Today\'s Specials:\n';
    specials.forEach((special) => {
      message += `• ${special.title}`;
      if (special.description) {
        message += ` - ${special.description}`;
      }
      if (special.timeWindow) {
        message += ` (${special.timeWindow})`;
      }
      message += '\n';
    });
    message += '\n';
  }

  if (events.length > 0) {
    message += '🎉 Events:\n';
    events.forEach((event) => {
      const eventTime = new Date(event.startDateTime).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      });
      message += `• ${event.title} at ${eventTime}`;
      if (event.description) {
        message += ` - ${event.description}`;
      }
      message += '\n';
    });
  }

  message += '\nSee you there! 🍺';

  return message;
}

