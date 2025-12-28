/**
 * Server-side reCAPTCHA verification
 */

interface ReCaptchaVerificationResponse {
  success: boolean;
  challenge_ts?: string;
  hostname?: string;
  'error-codes'?: string[];
  score?: number;
  action?: string;
}

/**
 * Verify reCAPTCHA token on the server
 * @param token - The reCAPTCHA token from the client
 * @param secretKey - The reCAPTCHA secret key
 * @returns Promise with verification result
 */
export async function verifyRecaptcha(
  token: string,
  secretKey: string
): Promise<{ success: boolean; score?: number; error?: string }> {
  if (!token) {
    return { success: false, error: 'reCAPTCHA token is missing' };
  }

  if (!secretKey) {
    return { success: false, error: 'reCAPTCHA secret key not configured' };
  }

  try {
    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `secret=${encodeURIComponent(secretKey)}&response=${encodeURIComponent(token)}`,
    });

    const data: ReCaptchaVerificationResponse = await response.json();

    if (!data.success) {
      const errors = data['error-codes'] || [];
      return {
        success: false,
        error: errors.join(', ') || 'reCAPTCHA verification failed',
      };
    }

    // For reCAPTCHA v3, check the score (0.0 to 1.0)
    // Lower scores indicate bot-like behavior
    // Typically, scores above 0.5 are considered legitimate
    const score = data.score || 0;
    const scoreThreshold = 0.5;

    if (score < scoreThreshold) {
      return {
        success: false,
        score,
        error: `reCAPTCHA score too low: ${score.toFixed(2)} (threshold: ${scoreThreshold})`,
      };
    }

    return {
      success: true,
      score,
    };
  } catch (error) {
    console.error('Error verifying reCAPTCHA:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to verify reCAPTCHA',
    };
  }
}

