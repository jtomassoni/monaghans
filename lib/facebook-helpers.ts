/**
 * Facebook Graph API Helper Functions
 */

interface FacebookPostOptions {
  message: string;
  imageUrl?: string;
}

/**
 * Get a fresh page access token from user token
 */
export async function getPageAccessToken(
  userAccessToken: string,
  pageId: string
): Promise<string> {
  const pagesResponse = await fetch(
    `https://graph.facebook.com/v18.0/me/accounts?` +
    `fields=id,access_token` +
    `&access_token=${userAccessToken}`,
    { method: 'GET' }
  );

  const pagesData = await pagesResponse.json();

  if (pagesData.error) {
    throw new Error(pagesData.error.message || 'Failed to get page access token');
  }

  if (!pagesData.data || pagesData.data.length === 0) {
    throw new Error('No Facebook pages found');
  }

  // Find the page we need
  const page = pagesData.data.find((p: any) => p.id === pageId);
  
  if (!page || !page.access_token) {
    throw new Error(`Page ${pageId} not found or no access token available`);
  }

  return page.access_token;
}

/**
 * Post to Facebook page using Graph API
 * Tries multiple approaches to work around permission issues
 */
export async function postToFacebook(
  accessToken: string,
  pageId: string,
  options: FacebookPostOptions,
  userAccessToken?: string
): Promise<string> {
  const { message, imageUrl } = options;

  // Try to get a fresh page token if user token is provided
  let tokenToUse = accessToken;
  if (userAccessToken) {
    try {
      console.log('Attempting to get fresh page token from user token...');
      const freshPageToken = await getPageAccessToken(userAccessToken, pageId);
      tokenToUse = freshPageToken;
      console.log('Got fresh page token, using it for posting');
    } catch (freshTokenError) {
      console.warn('Failed to get fresh page token, using stored token:', freshTokenError);
      // Fall back to stored token
      tokenToUse = accessToken;
    }
  }

  // If we have an image, use the photos endpoint
  if (imageUrl) {
    // Check if imageUrl is a localhost URL (not publicly accessible)
    const isLocalhost = imageUrl.includes('localhost') || imageUrl.includes('127.0.0.1') || imageUrl.startsWith('/');
    if (isLocalhost) {
      throw new Error(
        'Image URL must be publicly accessible. Localhost URLs cannot be accessed by Facebook. ' +
        'Please use a publicly accessible image URL or ensure your server is accessible from the internet.'
      );
    }

    // Use Facebook Photos API to post with image
    const photoPayload: Record<string, string> = {
      message,
      url: imageUrl, // Use 'url' parameter for photos endpoint
      access_token: tokenToUse,
    };


    let photoEndpoint = `https://graph.facebook.com/v18.0/${pageId}/photos`;
    let photoResponse = await fetch(
      photoEndpoint,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(photoPayload),
      }
    );

    // If /photos fails, try /feed with url parameter
    if (!photoResponse.ok) {
      const errorData = await photoResponse.json();
      console.log('Tried /photos endpoint, got error:', errorData.error?.message);
      console.log('Falling back to /feed endpoint with url parameter...');
      
      const feedPayload: Record<string, string> = {
        message,
        url: imageUrl,
        access_token: tokenToUse,
      };

      photoEndpoint = `https://graph.facebook.com/v18.0/${pageId}/feed`;
      photoResponse = await fetch(
        photoEndpoint,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams(feedPayload),
        }
      );
    }

    const photoData = await photoResponse.json();

    if (!photoResponse.ok) {
      console.error('Facebook API error:', {
        status: photoResponse.status,
        statusText: photoResponse.statusText,
        error: photoData.error,
        fullResponse: photoData
      });
      
      const errorMessage = photoData.error?.message || `Facebook API error: ${photoResponse.statusText}`;
      const errorCode = photoData.error?.code;
      const errorType = photoData.error?.type;
      
      throw new Error(
        errorCode ? `${errorMessage} (Error ${errorCode}, Type: ${errorType})` : errorMessage
      );
    }

    // When posting a photo, Facebook may return post_id directly, or we need to get it from the photo
    // Check if post_id is in the response first
    if (photoData.post_id) {
      return photoData.post_id;
    }
    
    // If not, try to get the post ID from the photo object
    // Photos posted to pages create posts, and we can get the post ID by fetching the photo
    const photoId = photoData.id;
    if (photoId) {
      try {
        const photoDetailsResponse = await fetch(
          `https://graph.facebook.com/v18.0/${photoId}?fields=post_id&access_token=${tokenToUse}`,
          { method: 'GET' }
        );
        const photoDetails = await photoDetailsResponse.json();
        
        // If we got a post_id, use that
        if (photoDetails.post_id) {
          return photoDetails.post_id;
        }
      } catch (err) {
        console.warn('Could not fetch post_id from photo, using photo ID:', err);
      }
    }
    
    // Fallback to photo ID if we can't get post_id
    // Note: This might cause duplicates, but it's better than failing
    return photoId;
  }

  // No image - regular text post
  const payload: Record<string, string> = {
    message,
    access_token: tokenToUse,
  };

  // Post to Facebook page
  // Try using /posts endpoint first (newer API), fallback to /feed if needed
  let endpoint = `https://graph.facebook.com/v18.0/${pageId}/posts`;
  let response = await fetch(
    endpoint,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(payload),
    }
  );

  // If /posts fails, try /feed endpoint
  if (!response.ok) {
    const errorData = await response.json();
    console.log('Tried /posts endpoint, got error:', errorData.error?.message);
    console.log('Falling back to /feed endpoint...');
    
    endpoint = `https://graph.facebook.com/v18.0/${pageId}/feed`;
    response = await fetch(
      endpoint,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(payload),
      }
    );
  }

  const data = await response.json();

  if (!response.ok) {
    // Log the full error for debugging
    console.error('Facebook API error:', {
      status: response.status,
      statusText: response.statusText,
      error: data.error,
      fullResponse: data
    });
    
    // Provide a more detailed error message
    const errorMessage = data.error?.message || `Facebook API error: ${response.statusText}`;
    const errorCode = data.error?.code;
    const errorType = data.error?.type;
    
    throw new Error(
      errorCode ? `${errorMessage} (Error ${errorCode}, Type: ${errorType})` : errorMessage
    );
  }

  return data.id;
}

/**
 * Edit an existing Facebook post
 * Note: Only the message can be edited, and only within 24 hours of posting
 */
export async function editFacebookPost(
  accessToken: string,
  postId: string,
  message: string,
  userAccessToken?: string
): Promise<void> {
  // Try to get a fresh page token if user token is provided
  let tokenToUse = accessToken;
  if (userAccessToken) {
    try {
      // Extract page ID from post ID (format: {pageId}_{postId})
      const pageId = postId.split('_')[0];
      const freshPageToken = await getPageAccessToken(userAccessToken, pageId);
      tokenToUse = freshPageToken;
    } catch (freshTokenError) {
      console.warn('Failed to get fresh page token, using stored token:', freshTokenError);
      tokenToUse = accessToken;
    }
  }

  const payload = {
    message: message.trim(),
    access_token: tokenToUse,
  };

  const response = await fetch(
    `https://graph.facebook.com/v18.0/${postId}`,
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
    console.error('Facebook API error:', {
      status: response.status,
      statusText: response.statusText,
      error: data.error,
      fullResponse: data
    });
    
    const errorMessage = data.error?.message || `Facebook API error: ${response.statusText}`;
    const errorCode = data.error?.code;
    const errorType = data.error?.type;
    
    throw new Error(
      errorCode ? `${errorMessage} (Error ${errorCode}, Type: ${errorType})` : errorMessage
    );
  }

  // Facebook returns { success: true } on successful edit
  return;
}

/**
 * Delete a Facebook post
 * Note: Posts can typically only be deleted by the page admin
 */
export async function deleteFacebookPost(
  accessToken: string,
  postId: string,
  userAccessToken?: string
): Promise<void> {
  // Try to get a fresh page token if user token is provided
  let tokenToUse = accessToken;
  if (userAccessToken) {
    try {
      // Extract page ID from post ID (format: {pageId}_{postId})
      const pageId = postId.split('_')[0];
      const freshPageToken = await getPageAccessToken(userAccessToken, pageId);
      tokenToUse = freshPageToken;
    } catch (freshTokenError) {
      console.warn('Failed to get fresh page token, using stored token:', freshTokenError);
      tokenToUse = accessToken;
    }
  }

  const response = await fetch(
    `https://graph.facebook.com/v18.0/${postId}?access_token=${tokenToUse}`,
    {
      method: 'DELETE',
    }
  );

  const data = await response.json();

  if (!response.ok) {
    console.error('Facebook API error:', {
      status: response.status,
      statusText: response.statusText,
      error: data.error,
      fullResponse: data
    });
    
    const errorMessage = data.error?.message || `Facebook API error: ${response.statusText}`;
    const errorCode = data.error?.code;
    const errorType = data.error?.type;
    
    throw new Error(
      errorCode ? `${errorMessage} (Error ${errorCode}, Type: ${errorType})` : errorMessage
    );
  }

  // Facebook returns { success: true } on successful deletion
  return;
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

  // If there's a CTA URL, append it to the message since Facebook posts don't support separate link fields
  const finalMessage = ctaUrl ? `${message}\n\n${ctaUrl}` : message;

  return {
    message: finalMessage,
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

