'use client';

import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    grecaptcha: {
      ready: (callback: () => void) => void;
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
    };
  }
}

interface ReCaptchaProps {
  siteKey: string;
  action: string;
  onVerify: (token: string) => void;
  onError?: (error: string) => void;
}

/**
 * ReCAPTCHA v3 Component
 * Invisible reCAPTCHA that executes automatically
 */
export default function ReCaptcha({ siteKey, action, onVerify, onError }: ReCaptchaProps) {
  const scriptLoaded = useRef(false);
  const scriptId = 'recaptcha-script';

  useEffect(() => {
    // Check if script is already loaded
    if (document.getElementById(scriptId) || scriptLoaded.current) {
      executeRecaptcha();
      return;
    }

    // Load the reCAPTCHA script
    const script = document.createElement('script');
    script.id = scriptId;
    script.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}`;
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      scriptLoaded.current = true;
      executeRecaptcha();
    };

    script.onerror = () => {
      if (onError) {
        onError('Failed to load reCAPTCHA script');
      }
    };

    document.head.appendChild(script);

    return () => {
      // Cleanup: remove script if component unmounts
      const existingScript = document.getElementById(scriptId);
      if (existingScript) {
        existingScript.remove();
        scriptLoaded.current = false;
      }
    };
  }, [siteKey, action]);

  const executeRecaptcha = () => {
    if (!window.grecaptcha) {
      if (onError) {
        onError('reCAPTCHA not loaded');
      }
      return;
    }

    window.grecaptcha.ready(() => {
      window.grecaptcha
        .execute(siteKey, { action })
        .then((token) => {
          onVerify(token);
        })
        .catch((error) => {
          if (onError) {
            onError(error.message || 'Failed to execute reCAPTCHA');
          }
        });
    });
  };

  // This component doesn't render anything visible
  return null;
}

/**
 * Hook to get reCAPTCHA token
 */
export function useReCaptcha(siteKey: string | undefined, action: string) {
  const getToken = (): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!siteKey) {
        reject(new Error('reCAPTCHA site key not configured'));
        return;
      }

      // Store in const so TypeScript knows it's defined
      const validSiteKey = siteKey;

      if (!window.grecaptcha) {
        // Load script if not already loaded
        const scriptId = 'recaptcha-script';
        if (!document.getElementById(scriptId)) {
          const script = document.createElement('script');
          script.id = scriptId;
          script.src = `https://www.google.com/recaptcha/api.js?render=${validSiteKey}`;
          script.async = true;
          script.defer = true;
          
          script.onload = () => {
            executeRecaptcha();
          };

          script.onerror = () => {
            reject(new Error('Failed to load reCAPTCHA script'));
          };

          document.head.appendChild(script);
        } else {
          // Script already loading, wait a bit and try again
          setTimeout(() => executeRecaptcha(), 500);
        }
      } else {
        executeRecaptcha();
      }

      function executeRecaptcha() {
        if (!window.grecaptcha) {
          reject(new Error('reCAPTCHA not loaded'));
          return;
        }

        window.grecaptcha.ready(() => {
          window.grecaptcha
            .execute(validSiteKey, { action })
            .then(resolve)
            .catch(reject);
        });
      }
    });
  };

  return { getToken };
}

