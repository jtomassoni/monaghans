import type { NextConfig } from 'next'
import { isRecaptchaEnabledForDeployment } from './lib/recaptcha-policy'

const nextConfig: NextConfig = {
  env: {
    // Mirrors lib/recaptcha-policy.ts — client code must not load grecaptcha on preview/dev.
    NEXT_PUBLIC_RECAPTCHA_ENABLED: isRecaptchaEnabledForDeployment() ? 'true' : 'false',
  },
  images: {
    remotePatterns: [],
    unoptimized: false,
  },
  // Turbopack configuration (Next.js 16+ uses Turbopack by default)
  // Empty config satisfies Next.js requirement when webpack config is present
  turbopack: {},
  // Webpack config for backwards compatibility
  // Note: With Turbopack (default in Next.js 16), this config may not be used
  // If you need to use webpack instead, run: npm run build -- --webpack
  webpack: (config, { isServer }) => {
    // Mark PDF processing libraries as optional externals
    // These are optional dependencies that may not be available in all environments
    if (isServer) {
      config.externals = config.externals || [];
      // Make PDF processing libraries optional (won't cause build errors if missing)
      config.resolve.fallback = {
        ...config.resolve.fallback,
        'pdf-poppler': false,
        'pdf2pic': false,
        'canvas': false, // Optional - requires native dependencies
      };
    }
    return config;
  },
}

export default nextConfig

