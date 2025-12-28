# reCAPTCHA Setup Guide

This application uses Google reCAPTCHA v3 to protect public forms from spam and abuse. reCAPTCHA v3 is invisible to users and provides a better user experience than traditional captcha challenges.

## Forms Protected

The following forms are protected with reCAPTCHA:

1. **Private Events Form** (`/private-events`) - Contact form for private event inquiries
2. **Order Checkout** (`/order/checkout`) - Online ordering checkout form
3. **Demo Payment** - Demo payment processing (when Stripe is not configured)

## Setup Instructions

### 1. Get reCAPTCHA Keys

**Step-by-step:**

1. **Visit the Admin Console**: Go to [https://www.google.com/recaptcha/admin](https://www.google.com/recaptcha/admin)
   - Sign in with your Google account (or create one if needed)

2. **Create a New Site**: Click the "+" button or "Create" button

3. **Configure the Site**:
   - **Label**: Give it a name like "Monaghan's Website"
   - **reCAPTCHA type**: Select **"reCAPTCHA v3"** (NOT v2 - v2 shows checkboxes)
   - **Domains**: Add your domains:
     - `localhost` (for local development)
     - Your production domain: `monaghans.com` (and `www.monaghans.com` if you use www)
   - **Accept the Terms of Service**: Check the box

4. **Submit**: Click "Submit" button

5. **Copy Your Keys**: After creation, you'll see:
   - **Site Key** (starts with `6L...`) - This is your `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`
   - **Secret Key** (starts with `6L...`) - This is your `RECAPTCHA_SECRET_KEY`
   
   ⚠️ **Important**: Copy both keys immediately - you can view the secret key only once!

**Visual Guide**: The keys will look something like:
- Site Key: `6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI`
- Secret Key: `6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe`

### 2. Configure Environment Variables

Add the following environment variables to your `.env` file:

```env
# reCAPTCHA Configuration
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=your_site_key_here
RECAPTCHA_SECRET_KEY=your_secret_key_here
```

**Important Notes:**
- `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` must start with `NEXT_PUBLIC_` because it's used in client-side code
- `RECAPTCHA_SECRET_KEY` is server-side only and should never be exposed to the client
- Never commit these keys to version control

### 3. Verify Setup

1. Restart your development server after adding the environment variables
2. Submit a form (private events or order checkout)
3. Check the browser console for any reCAPTCHA errors
4. In production, verify that forms work correctly

## How It Works

### Why reCAPTCHA v3 is Effective Against Spam

reCAPTCHA v3 is **highly effective** at preventing spam because:

1. **Behavioral Analysis**: It analyzes user behavior patterns:
   - Mouse movements and clicks
   - Typing patterns and speed
   - Scrolling behavior
   - Time spent on page
   - Browser characteristics
   - Previous interactions with Google services

2. **Machine Learning**: Uses Google's ML models trained on billions of interactions to distinguish humans from bots

3. **Risk Scoring**: Assigns a score from 0.0 (definitely a bot) to 1.0 (definitely human)
   - Scores below 0.5 are rejected (configurable)
   - This happens **invisibly** - no user interaction needed

4. **Continuous Monitoring**: Analyzes behavior throughout the session, not just at form submission

**Effectiveness**: 
- ✅ Blocks 90-95% of automated spam bots
- ✅ Better user experience (no checkboxes or puzzles)
- ✅ Works in the background
- ⚠️ Not 100% foolproof (sophisticated bots may still get through)

**For even stronger protection**, consider combining with:
- Rate limiting (limit submissions per IP)
- Honeypot fields (hidden fields that bots fill)
- Email verification for critical forms
- Manual review queue for low-score submissions

### Technical Flow

**Client-Side (Forms)**

1. When a user submits a form, the `useReCaptcha` hook automatically:
   - Loads the reCAPTCHA script (if not already loaded)
   - Executes reCAPTCHA v3 to get a token (analyzes user behavior)
   - Includes the token in the form submission

2. The token is sent to the server along with the form data

**Server-Side (API Routes)**

1. API routes receive the reCAPTCHA token in the request body
2. The server verifies the token with Google's reCAPTCHA API
3. The server checks:
   - Token validity (not expired, not reused)
   - Score (0.0 to 1.0) - scores below 0.5 are rejected
   - Action matches the expected action
   - Domain matches registered domains

4. If verification fails, the request is rejected with an error message

## Development vs Production

### Development

- reCAPTCHA is optional in development
- If keys are not configured, forms will still work (with a console warning)
- This allows development without setting up reCAPTCHA

### Production

- reCAPTCHA is **required** in production if `RECAPTCHA_SECRET_KEY` is set
- Forms will be rejected if:
  - No token is provided
  - Token verification fails
  - Score is too low (< 0.5)

## Troubleshooting

### Forms Not Working

1. **Check environment variables are set correctly**
   ```bash
   echo $NEXT_PUBLIC_RECAPTCHA_SITE_KEY
   echo $RECAPTCHA_SECRET_KEY
   ```

2. **Check browser console for errors**
   - Look for reCAPTCHA script loading errors
   - Check for token generation errors

3. **Check server logs**
   - Look for reCAPTCHA verification errors
   - Check for score threshold failures

### "Security verification failed" Error

This error appears when:
- reCAPTCHA token is missing
- Token verification fails
- Score is below threshold (0.5)

**Solutions:**
- Ensure reCAPTCHA keys are correctly configured
- Check that your domain is registered in reCAPTCHA admin console
- Verify network connectivity to Google's reCAPTCHA API

### Low Scores

reCAPTCHA v3 assigns scores based on user behavior:
- **0.9 - 1.0**: Very likely a legitimate user
- **0.7 - 0.9**: Likely a legitimate user
- **0.5 - 0.7**: Suspicious but acceptable
- **0.0 - 0.5**: Likely a bot (rejected)

If legitimate users are getting low scores:
- Check for browser extensions that might interfere
- Ensure the reCAPTCHA script is loading correctly
- Consider adjusting the score threshold (currently 0.5)

## Customization

### Adjusting Score Threshold

The score threshold is set in `lib/recaptcha-verify.ts`:

```typescript
const scoreThreshold = 0.5; // Adjust this value (0.0 to 1.0)
```

Lower values = more permissive (may allow more bots)
Higher values = more strict (may block legitimate users)

### Adding reCAPTCHA to New Forms

1. Import the hook in your form component:
   ```typescript
   import { useReCaptcha } from '@/components/recaptcha';
   ```

2. Initialize the hook:
   ```typescript
   const recaptchaSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
   const { getToken } = useReCaptcha(recaptchaSiteKey, 'your_action_name');
   ```

3. Get token before submitting:
   ```typescript
   const token = await getToken();
   // Include token in your API request
   ```

4. Verify on server:
   ```typescript
   import { verifyRecaptcha } from '@/lib/recaptcha-verify';
   
   const verification = await verifyRecaptcha(
     recaptchaToken,
     process.env.RECAPTCHA_SECRET_KEY
   );
   ```

## Security Notes

- Never expose the secret key to the client
- Always verify tokens on the server
- Use HTTPS in production (required by reCAPTCHA)
- Monitor reCAPTCHA scores to detect abuse patterns
- Consider implementing rate limiting in addition to reCAPTCHA

## Additional Resources

- [Google reCAPTCHA Documentation](https://developers.google.com/recaptcha/docs/v3)
- [reCAPTCHA Admin Console](https://www.google.com/recaptcha/admin)
- [reCAPTCHA Best Practices](https://developers.google.com/recaptcha/docs/v3#best_practices)

