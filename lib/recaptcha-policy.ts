/**
 * reCAPTCHA is enforced only on the production Vercel deployment so preview URLs
 * (and local dev) avoid "invalid domain for site key" without listing every hostname.
 *
 * Non-Vercel hosts: enabled when NODE_ENV === "production" (e.g. Docker).
 */
export function isRecaptchaEnabledForDeployment(): boolean {
  if (process.env.VERCEL) {
    return process.env.VERCEL_ENV === 'production';
  }
  return process.env.NODE_ENV === 'production';
}
