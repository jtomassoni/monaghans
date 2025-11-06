'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { showToast } from '@/components/toast';
import { FaFacebook, FaCheckCircle, FaTimesCircle, FaSpinner } from 'react-icons/fa';

interface SocialMediaFormProps {
  initialFacebookData: any;
}

export default function SocialMediaForm({ initialFacebookData }: SocialMediaFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [facebookData, setFacebookData] = useState({
    connected: initialFacebookData?.connected || false,
    pageId: initialFacebookData?.pageId || '',
    pageName: initialFacebookData?.pageName || '',
    accessToken: initialFacebookData?.accessToken || '',
    expiresAt: initialFacebookData?.expiresAt || null,
  });

  const initialFacebookDataRef = useRef(facebookData);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    initialFacebookDataRef.current = facebookData;
    setIsDirty(false);
  }, [initialFacebookData?.connected, initialFacebookData?.pageId, initialFacebookData?.pageName]);

  useEffect(() => {
    setIsDirty(JSON.stringify(facebookData) !== JSON.stringify(initialFacebookDataRef.current));
  }, [facebookData]);

  async function handleConnectFacebook() {
    setConnecting(true);
    try {
      // Redirect to Facebook OAuth flow
      const response = await fetch('/api/social/facebook/connect', {
        method: 'POST',
      });
      
      const data = await response.json();
      
      if (data.success && data.authUrl) {
        // Open Facebook OAuth in a popup window
        const width = 600;
        const height = 700;
        const left = window.screen.width / 2 - width / 2;
        const top = window.screen.height / 2 - height / 2;
        
        const popup = window.open(
          data.authUrl,
          'Facebook Connect',
          `width=${width},height=${height},left=${left},top=${top}`
        );

        // Listen for connection success message from popup
        const checkConnection = setInterval(async () => {
          if (popup?.closed) {
            clearInterval(checkConnection);
            setConnecting(false);
            // Refresh the page to get updated connection status
            router.refresh();
          }
        }, 1000);

        // Also listen for postMessage from popup
        const messageHandler = (event: MessageEvent) => {
          if (event.data.type === 'FACEBOOK_CONNECTED') {
            clearInterval(checkConnection);
            window.removeEventListener('message', messageHandler);
            popup?.close();
            setConnecting(false);
            router.refresh();
            showToast('Facebook connected successfully!', 'success');
          }
        };
        window.addEventListener('message', messageHandler);
      } else {
        throw new Error(data.error || 'Failed to initiate Facebook connection');
      }
    } catch (error) {
      showToast('Failed to connect Facebook', 'error', error instanceof Error ? error.message : 'Please try again.');
      setConnecting(false);
    }
  }

  async function handleDisconnectFacebook() {
    if (!confirm('Are you sure you want to disconnect Facebook? This will stop automatic posting.')) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/social/facebook/disconnect', {
        method: 'POST',
      });
      
      if (response.ok) {
        setFacebookData({
          connected: false,
          pageId: '',
          pageName: '',
          accessToken: '',
          expiresAt: null,
        });
        router.refresh();
        showToast('Facebook disconnected successfully', 'success');
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to disconnect Facebook');
      }
    } catch (error) {
      showToast('Failed to disconnect Facebook', 'error', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleTestPost() {
    setLoading(true);
    try {
      const response = await fetch('/api/social/facebook/test-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Test post from Monaghan\'s CMS',
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        showToast('Test post sent successfully!', 'success', `Post ID: ${data.postId}`);
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send test post');
      }
    } catch (error) {
      showToast('Failed to send test post', 'error', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const isTokenExpired = facebookData.expiresAt 
    ? new Date(facebookData.expiresAt) < new Date() 
    : false;

  return (
    <div className="space-y-4">
      {/* Facebook Connection */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-300 dark:border-gray-600 shadow-md">
        <div className="flex items-center gap-3 mb-4">
          <FaFacebook className="text-2xl text-blue-600 dark:text-blue-400" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Facebook</h2>
        </div>

        {facebookData.connected && !isTokenExpired ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <FaCheckCircle />
              <span className="font-medium">Connected</span>
            </div>
            
            {facebookData.pageName && (
              <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  <span className="font-medium">Page:</span> {facebookData.pageName}
                </p>
                {facebookData.pageId && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    ID: {facebookData.pageId}
                  </p>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleTestPost}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition text-white text-sm"
              >
                {loading ? (
                  <>
                    <FaSpinner className="inline animate-spin mr-2" />
                    Testing...
                  </>
                ) : (
                  'Send Test Post'
                )}
              </button>
              <button
                type="button"
                onClick={handleDisconnectFacebook}
                disabled={loading}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition text-white text-sm"
              >
                Disconnect
              </button>
            </div>

            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
              <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                How it works:
              </h3>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
                <li>When you create an announcement with "Cross-post to Facebook" enabled, it will automatically post to your Facebook page</li>
                <li>Daily posts about specials and events will be scheduled automatically</li>
                <li>You can manage all content from this CMS without logging into Meta's interfaces</li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {isTokenExpired && (
              <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 mb-4">
                <FaTimesCircle />
                <span className="font-medium">Connection expired</span>
              </div>
            )}
            
            <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded">
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                Connect your Facebook page to enable automatic posting of announcements, specials, and events.
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                You'll be redirected to Facebook to authorize the connection. Make sure you have admin access to the Facebook page you want to connect.
              </p>
            </div>

            <button
              type="button"
              onClick={handleConnectFacebook}
              disabled={connecting}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition text-white flex items-center gap-2"
            >
              {connecting ? (
                <>
                  <FaSpinner className="animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <FaFacebook />
                  Connect Facebook Page
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Info Section */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-300 dark:border-gray-600 shadow-md">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
          Setup Instructions
        </h3>
        <ol className="text-sm text-gray-700 dark:text-gray-300 space-y-2 list-decimal list-inside">
          <li>Click "Connect Facebook Page" above</li>
          <li>Authorize the app in the Facebook popup window</li>
          <li>Select the Facebook page you want to connect</li>
          <li>Grant the necessary permissions (pages_show_list, pages_read_engagement, pages_manage_posts)</li>
          <li>Once connected, announcements with "Cross-post to Facebook" enabled will automatically post to your page</li>
        </ol>
        <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-200 dark:border-yellow-800">
          <p className="text-xs text-yellow-800 dark:text-yellow-200">
            <strong>Note:</strong> You need to create a Facebook App and get App ID and App Secret. Set these in your .env file as FACEBOOK_APP_ID and FACEBOOK_APP_SECRET.
          </p>
        </div>
      </div>
    </div>
  );
}

