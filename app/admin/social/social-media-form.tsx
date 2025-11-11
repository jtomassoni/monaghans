'use client';

import { useState, useEffect, useRef, FormEvent, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { showToast } from '@/components/toast';
import ConfirmationDialog from '@/components/confirmation-dialog';
import Modal from '@/components/modal';
import SearchSortFilter, { SortOption, FilterOption } from '@/components/search-sort-filter';
import { FaFacebook, FaCheckCircle, FaTimesCircle, FaSpinner, FaPaperPlane, FaImage, FaPlug, FaQuestionCircle, FaEdit, FaTrash, FaPlus, FaCog } from 'react-icons/fa';

const ENABLE_TEST_TOKEN_TOOLS = false;

interface SocialMediaFormProps {
  initialFacebookData: any;
}

type FacebookFeedPost = {
  id: string;
  message?: string;
  permalink?: string;
  imageUrl?: string;
  link?: string | null;
  postedAt: string;
  source: 'cms' | 'facebook';
  createdBy?: string | null;
};

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
  const [posting, setPosting] = useState(false);
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showTestTokenModal, setShowTestTokenModal] = useState(false);
  const [testToken, setTestToken] = useState('');
  const [testTokenPageId, setTestTokenPageId] = useState(facebookData.pageId || '');
  const [testingToken, setTestingToken] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);
  const [posts, setPosts] = useState<FacebookFeedPost[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [filteredPosts, setFilteredPosts] = useState<FacebookFeedPost[]>([]);
  const [editingPost, setEditingPost] = useState<string | null>(null);
  const [editMessage, setEditMessage] = useState('');
  const initialEditMessageRef = useRef('');
  const [editing, setEditing] = useState(false);
  const [deletingPost, setDeletingPost] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showNewPostModal, setShowNewPostModal] = useState(false);
  const [lastTestSuccessTime, setLastTestSuccessTime] = useState<number | null>(null);
  const [expandedPosts, setExpandedPosts] = useState<Set<string>>(new Set());
  const [postInsights, setPostInsights] = useState<Map<string, any>>(new Map());
  const [loadingInsights, setLoadingInsights] = useState<Set<string>>(new Set());
  const [expandedInsights, setExpandedInsights] = useState<Set<string>>(new Set());
  const MAX_MESSAGE_LENGTH = 200; // Characters to show before "view more"
  
  // Calculate token expiration status
  const isTokenExpired = facebookData.expiresAt 
    ? new Date(facebookData.expiresAt) < new Date() 
    : false;
  const [postData, setPostData] = useState({
    message: '',
    imageUrl: '',
  });
  const initialPostDataRef = useRef(postData);
  const [validationErrors, setValidationErrors] = useState({
    imageUrl: '',
  });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showConnectionModal, setShowConnectionModal] = useState(false);

  // Helper function to validate and format URLs
  function validateAndFormatUrl(url: string, field: 'imageUrl'): string {
    if (!url.trim()) return url; // Empty is fine for optional fields
    
    let formattedUrl = url.trim();
    
    // Auto-prepend https:// if it looks like a domain without protocol
    if (!formattedUrl.match(/^https?:\/\//i)) {
      // Check if it looks like a domain (has dots and no spaces)
      if (formattedUrl.includes('.') && !formattedUrl.includes(' ')) {
        formattedUrl = `https://${formattedUrl}`;
      }
    }
    
    // Validate URL format
    try {
      new URL(formattedUrl);
      setValidationErrors(prev => ({ ...prev, [field]: '' }));
      return formattedUrl;
    } catch {
      setValidationErrors(prev => ({ 
        ...prev, 
        [field]: 'Please enter a valid URL (e.g., https://example.com)' 
      }));
      return url; // Return original if invalid
    }
  }

  function formatDateTime(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return date.toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  }

  const fetchFacebookPosts = useCallback(async () => {
    if (!facebookData.connected) {
      setPosts([]);
      return;
    }

    setPostsLoading(true);
    try {
      const response = await fetch('/api/social/facebook/posts');
      if (response.ok) {
        const data = await response.json();
        setPosts(data.posts || []);
      } else {
        const error = await response.json().catch(() => ({}));
        console.error('Error fetching Facebook posts:', error);
        showToast(
          'Failed to load Facebook posts',
          'error',
          error.error || 'Please try again.'
        );
      }
    } catch (err) {
      console.error('Error fetching Facebook posts:', err);
      showToast(
        'Failed to load Facebook posts',
        'error',
        err instanceof Error ? err.message : 'Please try again.'
      );
    } finally {
      setPostsLoading(false);
    }
  }, [facebookData.connected]);

  useEffect(() => {
    fetchFacebookPosts();
  }, [fetchFacebookPosts]);

  useEffect(() => {
    setFilteredPosts(posts);
  }, [posts]);

  // Load last test success time from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('facebook_test_success_time');
    if (stored) {
      const timestamp = parseInt(stored, 10);
      // Only use if within 24 hours
      const now = Date.now();
      const twentyFourHours = 24 * 60 * 60 * 1000;
      if (now - timestamp < twentyFourHours) {
        setLastTestSuccessTime(timestamp);
      } else {
        localStorage.removeItem('facebook_test_success_time');
      }
    }
  }, []);

  // Check if test was successful within last 24 hours
  const isTestRecentlySuccessful = useMemo(() => {
    if (!lastTestSuccessTime) return false;
    const now = Date.now();
    const twentyFourHours = 24 * 60 * 60 * 1000;
    return (now - lastTestSuccessTime) < twentyFourHours;
  }, [lastTestSuccessTime]);

  const sortOptions: SortOption<FacebookFeedPost>[] = [
    {
      label: 'Date Posted (Newest First)',
      value: 'postedAt',
      sortFn: (a, b) => {
        const aDate = new Date(a.postedAt).getTime();
        const bDate = new Date(b.postedAt).getTime();
        return bDate - aDate;
      },
    },
    {
      label: 'Date Posted (Oldest First)',
      value: 'postedAt',
      sortFn: (a, b) => {
        const aDate = new Date(a.postedAt).getTime();
        const bDate = new Date(b.postedAt).getTime();
        return aDate - bDate;
      },
    },
    { label: 'Source (CMS First)', value: 'source', sortFn: (a, b) => (a.source === 'cms' ? -1 : 1) },
    { label: 'Source (Facebook First)', value: 'source', sortFn: (a, b) => (a.source === 'facebook' ? -1 : 1) },
  ];

  const filterOptions: FilterOption<FacebookFeedPost>[] = [
    { label: 'CMS Posts Only', value: 'cms', filterFn: (item) => item.source === 'cms' },
    { label: 'Facebook Posts Only', value: 'facebook', filterFn: (item) => item.source === 'facebook' },
  ];

  // All posts are from Facebook, no filtering needed

  // Update state when initialFacebookData changes (e.g., after connection)
  useEffect(() => {
    if (initialFacebookData) {
      setFacebookData({
        connected: initialFacebookData?.connected || false,
        pageId: initialFacebookData?.pageId || '',
        pageName: initialFacebookData?.pageName || '',
        accessToken: initialFacebookData?.accessToken || '',
        expiresAt: initialFacebookData?.expiresAt || null,
      });
    }
    initialFacebookDataRef.current = facebookData;
    setIsDirty(false);
  }, [initialFacebookData?.connected, initialFacebookData?.pageId, initialFacebookData?.pageName, initialFacebookData?.accessToken, initialFacebookData?.expiresAt]);

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
            showToast('Facebook connected successfully!', 'success');
            // Force a hard refresh to get updated data
            setTimeout(() => {
              router.refresh();
              window.location.reload();
            }, 500);
          } else if (event.data.type === 'FACEBOOK_ERROR') {
            clearInterval(checkConnection);
            window.removeEventListener('message', messageHandler);
            popup?.close();
            setConnecting(false);
            showToast('Facebook connection failed', 'error', event.data.error || 'Unknown error');
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

  async function performDisconnect() {
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
        // Clear stored test success time on disconnect
        setLastTestSuccessTime(null);
        localStorage.removeItem('facebook_test_success_time');
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

  function handleDisconnectFacebook() {
    setShowDisconnectModal(true);
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
        if (data?.success) {
          showToast('Connection test successful!', 'success', 'Facebook permissions and token look good.');
          // Store successful test timestamp
          const timestamp = Date.now();
          setLastTestSuccessTime(timestamp);
          localStorage.setItem('facebook_test_success_time', timestamp.toString());
        } else {
          showToast('Connection test completed', 'error', 'Permissions may be missing. Please review connection diagnostics.');
          // Clear stored success time on failure
          setLastTestSuccessTime(null);
          localStorage.removeItem('facebook_test_success_time');
        }
        if (data?.diagnostics) {
          console.log('Facebook connection diagnostics:', data.diagnostics);
        }
      } else {
        const error = await response.json();
        const errorMessage = error.error || 'Failed to test connection';
        
        // Show more detailed error message
        if (errorMessage.includes('permission') || errorMessage.includes('pages_read_engagement') || errorMessage.includes('pages_manage_posts')) {
          showToast(
            'Permission Error', 
            'error', 
            'Facebook connection is missing required permissions. Please disconnect and reconnect to grant the necessary permissions.'
          );
        } else {
          showToast('Connection test failed', 'error', errorMessage);
        }
        // Clear stored success time on failure
        setLastTestSuccessTime(null);
        localStorage.removeItem('facebook_test_success_time');
      }
    } catch (error) {
      showToast('Connection test failed', 'error', error instanceof Error ? error.message : 'Please try again.');
      // Clear stored success time on error
      setLastTestSuccessTime(null);
      localStorage.removeItem('facebook_test_success_time');
    } finally {
      setLoading(false);
    }
  }

  async function handleTestToken() {
    if (!testToken.trim() || !testTokenPageId.trim()) {
      showToast('Please enter both token and page ID', 'error');
      return;
    }

    setTestingToken(true);
    setTestResults(null);
    try {
      const response = await fetch('/api/social/facebook/test-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: testToken.trim(),
          pageId: testTokenPageId.trim(),
        }),
      });

      const data = await response.json();
      setTestResults(data);

      if (data.summary) {
        const { tokenHasPermissions, pagesReadEngagementWorks, pagesManagePostsWorks } = data.summary;
        if (pagesReadEngagementWorks && pagesManagePostsWorks) {
          showToast('Token test successful!', 'success', 'All permissions are working.');
        } else {
          showToast('Token test completed', 'error', 'Some permissions may be missing. Check results below.');
        }
      } else {
        showToast('Token test completed', 'info', 'Check results below.');
      }
    } catch (error) {
      showToast('Token test failed', 'error', error instanceof Error ? error.message : 'Please try again.');
      setTestResults({ error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setTestingToken(false);
    }
  }

  async function handleEditPost(postId: string) {
    if (!editMessage.trim()) {
      showToast('Message cannot be empty', 'error');
      return;
    }

    setEditing(true);
    try {
      const response = await fetch(`/api/social/facebook/post/${postId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: editMessage }),
      });

      if (response.ok) {
        showToast('Post updated successfully!', 'success');
        setEditingPost(null);
        setEditMessage('');
        initialEditMessageRef.current = '';
        // Refresh posts
        await fetchFacebookPosts();
        router.refresh();
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update post');
      }
    } catch (error) {
      showToast('Failed to update post', 'error', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setEditing(false);
    }
  }

  function startEditing(post: FacebookFeedPost) {
    const initialMessage = post.message || '';
    setEditingPost(post.id);
    setEditMessage(initialMessage);
    initialEditMessageRef.current = initialMessage;
  }

  function cancelEditing() {
    setEditingPost(null);
    setEditMessage('');
    initialEditMessageRef.current = '';
  }

  async function handleDeletePost(postId: string) {
    setDeletingPost(postId);
    try {
      const response = await fetch(`/api/social/facebook/post/${postId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        showToast('Post deleted successfully!', 'success');
        setShowDeleteModal(false);
        setDeletingPost(null);
        // Refresh posts
        await fetchFacebookPosts();
        router.refresh();
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete post');
      }
    } catch (error) {
      showToast('Failed to delete post', 'error', error instanceof Error ? error.message : 'Please try again.');
      setDeletingPost(null);
    }
  }

  function startDeleting(postId: string) {
    setDeletingPost(postId);
    setShowDeleteModal(true);
  }

  function cancelDeleting() {
    setShowDeleteModal(false);
    setDeletingPost(null);
  }

  function togglePostExpanded(postId: string) {
    setExpandedPosts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(postId)) {
        newSet.delete(postId);
      } else {
        newSet.add(postId);
      }
      return newSet;
    });
  }

  const fetchPostInsights = async (postId: string) => {
    if (loadingInsights.has(postId) || postInsights.has(postId)) {
      // Toggle if already loaded
      setExpandedInsights((prev) => {
        const next = new Set(prev);
        if (next.has(postId)) {
          next.delete(postId);
        } else {
          next.add(postId);
        }
        return next;
      });
      return;
    }

    setLoadingInsights((prev) => new Set(prev).add(postId));
    try {
      const response = await fetch(`/api/social/facebook/insights?postId=${postId}`);
      if (response.ok) {
        const insights = await response.json();
        setPostInsights((prev) => {
          const next = new Map(prev);
          next.set(postId, insights);
          return next;
        });
        setExpandedInsights((prev) => new Set(prev).add(postId));
      } else {
        showToast('Failed to fetch insights', 'error');
      }
    } catch (error) {
      console.error('Failed to fetch insights:', error);
      showToast('Failed to fetch insights', 'error');
    } finally {
      setLoadingInsights((prev) => {
        const next = new Set(prev);
        next.delete(postId);
        return next;
      });
    }
  };

  function getTruncatedMessage(message: string | undefined, postId: string): { text: string; isTruncated: boolean } {
    if (!message) return { text: '(No message content)', isTruncated: false };
    const isExpanded = expandedPosts.has(postId);
    if (isExpanded || message.length <= MAX_MESSAGE_LENGTH) {
      return { text: message, isTruncated: message.length > MAX_MESSAGE_LENGTH };
    }
    return { text: message.slice(0, MAX_MESSAGE_LENGTH) + '...', isTruncated: true };
  }

  async function handleManualPost(e: FormEvent) {
    e.preventDefault();
    
    // Validate image URL if provided
    let hasErrors = false;
    const validatedData = { ...postData };
    
    if (postData.imageUrl.trim()) {
      const validatedImageUrl = validateAndFormatUrl(postData.imageUrl, 'imageUrl');
      if (validationErrors.imageUrl) {
        hasErrors = true;
      } else {
        // Check if image URL is localhost (not publicly accessible)
        const isLocalhost = validatedImageUrl.includes('localhost') || 
                           validatedImageUrl.includes('127.0.0.1') ||
                           validatedImageUrl.startsWith('/');
        if (isLocalhost) {
          showToast(
            'Image URL must be publicly accessible',
            'error',
            'Localhost URLs cannot be accessed by Facebook. Please use a publicly accessible image URL or deploy your server to make uploaded images accessible.'
          );
          hasErrors = true;
        } else {
          validatedData.imageUrl = validatedImageUrl;
        }
      }
    }
    
    if (hasErrors) {
      return;
    }
    
    setPosting(true);
    try {
      const response = await fetch('/api/social/facebook/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validatedData),
      });
      
        if (response.ok) {
        const data = await response.json();
        showToast('Post published successfully!', 'success', `Post ID: ${data.postId}`);
        const clearedData = { message: '', imageUrl: '' };
        setPostData(clearedData);
        initialPostDataRef.current = clearedData;
        setValidationErrors({ imageUrl: '' });
        setImagePreview(null);
        setShowNewPostModal(false);
        router.refresh();
        fetchFacebookPosts();
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to post to Facebook');
      }
    } catch (error) {
      showToast('Failed to post to Facebook', 'error', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setPosting(false);
    }
  }


  return (
    <>
      <ConfirmationDialog
        isOpen={showDisconnectModal}
        onClose={() => setShowDisconnectModal(false)}
        onConfirm={performDisconnect}
        title="Disconnect Facebook"
        message="Are you sure you want to disconnect Facebook? This will stop automatic posting of announcements, specials, and events to your Facebook page."
        confirmText="Disconnect"
        cancelText="Cancel"
        variant="danger"
      />

      <ConfirmationDialog
        isOpen={showDeleteModal}
        onClose={cancelDeleting}
        onConfirm={() => deletingPost && handleDeletePost(deletingPost)}
        title="Delete Facebook Post"
        message="Are you sure you want to delete this post? This action cannot be undone and the post will be permanently removed from your Facebook page."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
      
      <Modal
        isOpen={showHelpModal}
        onClose={() => setShowHelpModal(false)}
        title="Facebook Integration Help"
      >
        <div className="space-y-6">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
              How it works
            </h3>
            <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-2 list-disc list-inside">
              <li>Create posts directly from this form and publish them to Facebook immediately</li>
              <li>Create announcements and enable "Cross-post to Facebook" to post automatically</li>
              <li>Daily posts about specials and events are scheduled automatically</li>
              <li>Manage all content from this CMS - no need to log into Facebook</li>
              <li>All posts are published immediately when created or scheduled</li>
            </ul>
          </div>
          
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
              Auto-Posting Features
            </h3>
            <div className="space-y-3">
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <h4 className="font-medium text-gray-900 dark:text-white mb-1 text-sm">
                  Auto-Posting
                </h4>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Announcements with "Cross-post to Facebook" enabled will automatically post to your page when published.
                </p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <h4 className="font-medium text-gray-900 dark:text-white mb-1 text-sm">
                  Daily Posts
                </h4>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Daily specials and events are automatically formatted and posted each morning.
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
              Setup Instructions
            </h3>
            <ol className="text-sm text-gray-700 dark:text-gray-300 space-y-2 list-decimal list-inside">
              <li>Click "Connect Facebook Page" to authorize the connection</li>
              <li>Authorize the app in the Facebook popup window</li>
              <li>Select the Facebook page you want to connect</li>
              <li>Grant the necessary permissions (pages_show_list, pages_read_engagement, pages_manage_posts)</li>
              <li>Once connected, you can create posts and enable auto-posting for announcements</li>
            </ol>
            <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-200 dark:border-yellow-800">
              <p className="text-xs text-yellow-800 dark:text-yellow-200">
                <strong>Note:</strong> You need to create a Facebook App and get App ID and App Secret. Set these in your .env file as FACEBOOK_APP_ID and FACEBOOK_APP_SECRET.
              </p>
            </div>
          </div>
        </div>
      </Modal>

      {ENABLE_TEST_TOKEN_TOOLS && (
        <Modal
          isOpen={showTestTokenModal}
          onClose={() => {
            setShowTestTokenModal(false);
            setTestToken('');
            setTestResults(null);
          }}
          title="Test Facebook Token"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Access Token <span className="text-red-500">*</span>
              </label>
              <textarea
                value={testToken}
                onChange={(e) => setTestToken(e.target.value)}
                placeholder="Paste your Facebook access token here"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none font-mono text-xs"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Get this from Graph API Explorer or your Facebook App Dashboard
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Page ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={testTokenPageId}
                onChange={(e) => setTestTokenPageId(e.target.value)}
                placeholder="660246473835266"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <button
              type="button"
              onClick={handleTestToken}
              disabled={testingToken || !testToken.trim() || !testTokenPageId.trim()}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition text-white flex items-center justify-center gap-2"
            >
              {testingToken ? (
                <>
                  <FaSpinner className="animate-spin" />
                  <span>Testing Token...</span>
                </>
              ) : (
                <span>Test Token</span>
              )}
            </button>

            {testResults && (
              <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Test Results</h4>
                
                {testResults.summary && (
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Token Type: {testResults.summary.tokenType || 'Unknown'}
                      </span>
                    </div>
                    {testResults.summary.userTokenHasPermissions !== undefined && (
                      <div className="flex items-center gap-2">
                        {testResults.summary.userTokenHasPermissions ? (
                          <FaCheckCircle className="text-green-600 dark:text-green-400" />
                        ) : (
                          <FaTimesCircle className="text-red-600 dark:text-red-400" />
                        )}
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          User token has permissions: {testResults.summary.userTokenHasPermissions ? 'Yes' : 'No'}
                        </span>
                      </div>
                    )}
                    {testResults.summary.pageTokenHasPermissions !== undefined && (
                      <div className="flex items-center gap-2">
                        {testResults.summary.pageTokenHasPermissions ? (
                          <FaCheckCircle className="text-green-600 dark:text-green-400" />
                        ) : (
                          <FaTimesCircle className="text-red-600 dark:text-red-400" />
                        )}
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          Page token has permissions: {testResults.summary.pageTokenHasPermissions ? 'Yes' : 'No'}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      {testResults.summary.pagesReadEngagementWorks ? (
                        <FaCheckCircle className="text-green-600 dark:text-green-400" />
                      ) : (
                        <FaTimesCircle className="text-red-600 dark:text-red-400" />
                      )}
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        pages_read_engagement: {testResults.summary.pagesReadEngagementWorks ? 'Working ✓' : 'Failed ✗'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {testResults.summary.pagesManagePostsWorks ? (
                        <FaCheckCircle className="text-green-600 dark:text-green-400" />
                      ) : (
                        <FaTimesCircle className="text-red-600 dark:text-red-400" />
                      )}
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        pages_manage_posts: {testResults.summary.pagesManagePostsWorks ? 'Working ✓' : 'Failed ✗'}
                      </span>
                    </div>
                  </div>
                )}

                {testResults.results && (
                  <div className="space-y-3 text-xs">
                    {testResults.results.tokenInfo && (
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white mb-1">Token Info:</p>
                        <pre className="bg-gray-100 dark:bg-gray-900 p-2 rounded overflow-auto text-xs">
                          {JSON.stringify(testResults.results.tokenInfo, null, 2)}
                        </pre>
                      </div>
                    )}
                    {testResults.results.pagesReadEngagement && (
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white mb-1">pages_read_engagement:</p>
                        <pre className="bg-gray-100 dark:bg-gray-900 p-2 rounded overflow-auto text-xs">
                          {JSON.stringify(testResults.results.pagesReadEngagement, null, 2)}
                        </pre>
                      </div>
                    )}
                    {testResults.results.pagesManagePosts && (
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white mb-1">pages_manage_posts:</p>
                        <pre className="bg-gray-100 dark:bg-gray-900 p-2 rounded overflow-auto text-xs">
                          {JSON.stringify(testResults.results.pagesManagePosts, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}

                {testResults.error && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800">
                    <p className="text-sm text-red-800 dark:text-red-200">{testResults.error}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </Modal>
      )}

      <Modal
        isOpen={showNewPostModal}
        onClose={() => {
          setShowNewPostModal(false);
          const clearedData = { message: '', imageUrl: '' };
          setPostData(clearedData);
          initialPostDataRef.current = clearedData;
          setValidationErrors({ imageUrl: '' });
          setImagePreview(null);
        }}
        title="Create New Facebook Post"
      >
        <form onSubmit={handleManualPost} className="space-y-6">
          {/* Message Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Message <span className="text-red-500">*</span>
            </label>
            <textarea
              value={postData.message}
              onChange={(e) => setPostData({ ...postData, message: e.target.value })}
              placeholder="What's on your mind?"
              rows={5}
              required
              className="w-full px-4 py-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
              {postData.message.length} characters
            </p>
          </div>

          {/* Image Section */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <FaImage className="inline mr-1.5 text-xs" />
              Image URL (optional)
            </label>
            <input
              type="text"
              value={postData.imageUrl}
              onChange={(e) => {
                setPostData({ ...postData, imageUrl: e.target.value });
                if (validationErrors.imageUrl) {
                  setValidationErrors(prev => ({ ...prev, imageUrl: '' }));
                }
                // Update preview if it's a valid URL
                if (e.target.value.trim() && e.target.value.match(/^https?:\/\//i)) {
                  setImagePreview(e.target.value);
                } else if (!e.target.value.trim()) {
                  setImagePreview(null);
                }
              }}
              onBlur={(e) => {
                if (e.target.value.trim()) {
                  const formatted = validateAndFormatUrl(e.target.value, 'imageUrl');
                  setPostData({ ...postData, imageUrl: formatted });
                  if (formatted.match(/^https?:\/\//i)) {
                    setImagePreview(formatted);
                  }
                }
              }}
              placeholder="https://example.com/image.jpg"
              className={`w-full px-4 py-2.5 text-sm border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                validationErrors.imageUrl 
                  ? 'border-red-500 dark:border-red-500' 
                  : 'border-gray-300 dark:border-gray-600'
              }`}
            />
            {validationErrors.imageUrl && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-1.5">
                {validationErrors.imageUrl}
              </p>
            )}
            {postData.imageUrl && imagePreview && (
              <div className="mt-3 relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-full h-48 object-cover rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm"
                />
                <button
                  type="button"
                  onClick={() => {
                    setPostData({ ...postData, imageUrl: '' });
                    setImagePreview(null);
                  }}
                  className="absolute top-2 right-2 px-2 py-1 bg-red-500 hover:bg-red-600 text-white text-xs rounded-md font-medium transition shadow-lg"
                >
                  Remove
                </button>
              </div>
            )}
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
              Must be a publicly accessible URL (not localhost). Facebook needs to be able to fetch the image.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => {
                setShowNewPostModal(false);
                const clearedData = { message: '', imageUrl: '' };
                setPostData(clearedData);
                initialPostDataRef.current = clearedData;
                setValidationErrors({ imageUrl: '' });
                setImagePreview(null);
              }}
              disabled={
                postData.message === initialPostDataRef.current.message &&
                postData.imageUrl === initialPostDataRef.current.imageUrl
              }
              className="px-5 py-2.5 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition text-gray-900 dark:text-white text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={posting || !postData.message.trim() || !!validationErrors.imageUrl}
              className="px-5 py-2.5 bg-blue-500/90 dark:bg-blue-600/90 hover:bg-blue-600 dark:hover:bg-blue-700 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition text-white text-sm flex items-center gap-2 border border-blue-400 dark:border-blue-500 hover:scale-105 shadow-sm"
            >
              {posting ? (
                <>
                  <FaSpinner className="animate-spin" />
                  <span>Publishing...</span>
                </>
              ) : (
                <>
                  <FaPaperPlane />
                  <span>Publish</span>
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>
      
      <Modal
        isOpen={showConnectionModal}
        onClose={() => setShowConnectionModal(false)}
        title="Facebook Connection Settings"
      >
        <div className="space-y-4">
          {facebookData.connected && !isTokenExpired ? (
            <>
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3 mb-3">
                  <FaFacebook className="text-xl text-blue-600 dark:text-blue-400" />
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">Connection Status</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Connected to <span className="font-medium">{facebookData.pageName}</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400">
                  <FaCheckCircle />
                  <span>Connection active</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {ENABLE_TEST_TOKEN_TOOLS && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowConnectionModal(false);
                      setShowTestTokenModal(true);
                    }}
                    className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg font-medium cursor-pointer transition text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600"
                  >
                    <FaPlug className="inline mr-2" />
                    Test Token
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setShowConnectionModal(false);
                    setShowHelpModal(true);
                  }}
                  className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg font-medium cursor-pointer transition text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600"
                >
                  <FaQuestionCircle className="inline mr-2" />
                  Help & Information
                </button>
                <a
                  href={`https://facebook.com/${facebookData.pageId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg font-medium cursor-pointer transition text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 inline-flex items-center"
                >
                  <FaFacebook className="inline mr-2" />
                  View Facebook Page
                </a>
                <button
                  type="button"
                  onClick={handleTestPost}
                  disabled={loading}
                  className={`px-4 py-2 text-sm rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition border ${
                    isTestRecentlySuccessful
                      ? 'bg-green-500/90 dark:bg-green-600/90 hover:bg-green-600 dark:hover:bg-green-700 text-white border-green-400 dark:border-green-500'
                      : 'bg-blue-500/90 dark:bg-blue-600/90 hover:bg-blue-600 dark:hover:bg-blue-700 text-white border-blue-400 dark:border-blue-500'
                  }`}
                >
                  {loading ? (
                    <>
                      <FaSpinner className="inline mr-2 animate-spin" />
                      Testing...
                    </>
                  ) : isTestRecentlySuccessful ? (
                    <>
                      <FaCheckCircle className="inline mr-2" />
                      Test Connection
                    </>
                  ) : (
                    <>
                      <FaPlug className="inline mr-2" />
                      Test Connection
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowConnectionModal(false);
                    handleDisconnectFacebook();
                  }}
                  disabled={loading}
                  className="px-4 py-2 text-sm bg-red-500/90 dark:bg-red-600/90 hover:bg-red-600 dark:hover:bg-red-700 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition text-white border border-red-400 dark:border-red-500"
                >
                  Disconnect
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3 mb-3">
                  <FaFacebook className="text-xl text-blue-600 dark:text-blue-400" />
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">Connection Status</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {isTokenExpired ? 'Connection expired' : 'Not connected'}
                    </p>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleConnectFacebook}
                disabled={connecting}
                className="w-full px-4 py-2 text-sm bg-blue-500/90 dark:bg-blue-600/90 hover:bg-blue-600 dark:hover:bg-blue-700 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition text-white flex items-center justify-center gap-2 border border-blue-400 dark:border-blue-500"
              >
                {connecting ? (
                  <>
                    <FaSpinner className="animate-spin" />
                    <span>Connecting...</span>
                  </>
                ) : (
                  <>
                    <FaFacebook />
                    <span>Connect Facebook</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </Modal>

      <div className="space-y-2 sm:space-y-4">
        {/* Facebook Connection Status Bar - Minimal */}
        {facebookData.connected && !isTokenExpired ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-2.5 sm:p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <FaFacebook className="text-lg text-blue-600 dark:text-blue-400" />
                <div className="flex items-center gap-1.5">
                  <FaCheckCircle className="text-green-600 dark:text-green-400 text-sm" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Connected to <span className="font-medium">{facebookData.pageName}</span>
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowConnectionModal(true)}
                className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="Manage connection"
              >
                <FaCog />
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-2.5 sm:p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <FaFacebook className="text-lg text-blue-600 dark:text-blue-400" />
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {isTokenExpired ? 'Connection expired' : 'Not connected'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowConnectionModal(true)}
                className="px-3 py-1.5 text-sm bg-blue-500/90 dark:bg-blue-600/90 hover:bg-blue-600 dark:hover:bg-blue-700 rounded-lg font-medium cursor-pointer transition text-white border border-blue-400 dark:border-blue-500"
              >
                Connect
              </button>
            </div>
          </div>
        )}

        {facebookData.connected && (
          <div className="space-y-2 sm:space-y-3">
            {postsLoading ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 sm:p-8 text-center">
                <div className="flex items-center justify-center gap-2 text-gray-500 dark:text-gray-400">
                  <FaSpinner className="animate-spin" />
                  <span className="text-sm">Loading posts...</span>
                </div>
              </div>
            ) : posts.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 sm:p-8 text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">No posts found. Create your first post!</p>
                <button
                  type="button"
                  onClick={() => setShowNewPostModal(true)}
                  className="px-4 py-2.5 bg-blue-500/90 dark:bg-blue-600/90 hover:bg-blue-600 dark:hover:bg-blue-700 rounded-lg text-white font-medium text-sm transition-all duration-200 hover:scale-105 flex items-center justify-center gap-2 border border-blue-400 dark:border-blue-500 mx-auto"
                >
                  <FaPlus />
                  <span>New Post</span>
                </button>
              </div>
            ) : (
              <>
                <SearchSortFilter
                  items={posts}
                  onFilteredItemsChange={setFilteredPosts}
                  searchFields={['message']}
                  searchPlaceholder="Search posts..."
                  sortOptions={sortOptions}
                  filterOptions={filterOptions}
                  defaultSort={sortOptions[0]}
                  actionButton={
                    <button
                      type="button"
                      onClick={() => setShowNewPostModal(true)}
                      className="w-full sm:w-auto px-4 py-2 sm:py-2.5 bg-blue-500/90 dark:bg-blue-600/90 hover:bg-blue-600 dark:hover:bg-blue-700 rounded-lg text-white font-medium text-sm transition-all duration-200 hover:scale-105 flex items-center justify-center gap-2 border border-blue-400 dark:border-blue-500"
                    >
                      <FaPlus />
                      <span>New Post</span>
                    </button>
                  }
                />
                <div className="relative">
                  {/* Scrollable container with enhanced styling - Responsive height for mobile */}
                  <div 
                    className="posts-scroll-container max-h-[calc(100vh-280px)] sm:max-h-[calc(100vh-420px)] min-h-[250px] sm:min-h-[300px] overflow-y-auto overflow-x-hidden rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-gradient-to-b from-gray-50/80 to-gray-100/60 dark:from-gray-900/80 dark:to-gray-800/60 p-3 sm:p-4 shadow-inner backdrop-blur-sm"
                    style={{ scrollBehavior: 'smooth' }}
                  >
                    <div className="grid gap-3 pb-2">
                  {filteredPosts.length === 0 ? (
                    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
                      <p className="text-sm text-gray-500 dark:text-gray-400">No posts match your filters.</p>
                    </div>
                  ) : (
                    filteredPosts.map((post) => (
                      <div
                        key={post.id}
                        className={`group/item relative bg-white dark:bg-gray-800 rounded-lg border-2 border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-200 p-4 backdrop-blur-sm ${
                          post.source === 'cms' ? 'cursor-pointer' : ''
                        }`}
                      >
                        {editingPost === post.id ? (
                          <div className="space-y-3">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Edit Message
                              </label>
                              <textarea
                                value={editMessage}
                                onChange={(e) => setEditMessage(e.target.value)}
                                rows={4}
                                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                              />
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Only message text can be edited. Posts can typically only be edited within 24 hours.
                              </p>
                            </div>
                            <div className="flex gap-2 justify-end">
                              <button
                                type="button"
                                onClick={cancelEditing}
                                disabled={editing}
                                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition text-gray-900 dark:text-white text-sm"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => handleEditPost(post.id)}
                                disabled={editing || !editMessage.trim() || editMessage === initialEditMessageRef.current}
                                className="px-4 py-2 bg-blue-500/90 dark:bg-blue-600/90 hover:bg-blue-600 dark:hover:bg-blue-700 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition text-white text-sm flex items-center gap-2 border border-blue-400 dark:border-blue-500"
                              >
                                {editing ? (
                                  <>
                                    <FaSpinner className="animate-spin" />
                                    <span>Saving...</span>
                                  </>
                                ) : (
                                  <>
                                    <FaCheckCircle />
                                    <span>Save</span>
                                  </>
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => startDeleting(post.id)}
                                disabled={editing || deletingPost === post.id}
                                className="px-4 py-2 bg-red-500/90 dark:bg-red-600/90 hover:bg-red-600 dark:hover:bg-red-700 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition text-white text-sm flex items-center gap-2 border border-red-400 dark:border-red-500"
                                title="Delete post"
                              >
                                {deletingPost === post.id ? (
                                  <>
                                    <FaSpinner className="animate-spin" />
                                    <span>Deleting...</span>
                                  </>
                                ) : (
                                  <>
                                    <FaTrash />
                                    <span>Delete</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div
                              className={`flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 ${
                                post.source === 'cms' ? 'cursor-pointer' : ''
                              }`}
                              onClick={() => post.source === 'cms' && startEditing(post)}
                            >
                              <div className="flex-1 min-w-0 space-y-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span
                                    className={`px-2 py-0.5 rounded-full border text-xs font-medium ${
                                      post.source === 'cms'
                                        ? 'border-blue-500 text-blue-600 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20'
                                        : 'border-gray-400 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800'
                                    }`}
                                  >
                                    {post.source === 'cms' ? 'CMS' : 'Facebook'}
                                  </span>
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    {formatDateTime(post.postedAt)}
                                  </span>
                                </div>
                                <div className="space-y-1">
                                  <p className="text-sm text-gray-900 dark:text-white whitespace-pre-line break-words">
                                    {getTruncatedMessage(post.message, post.id).text}
                                  </p>
                                  {getTruncatedMessage(post.message, post.id).isTruncated && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        togglePostExpanded(post.id);
                                      }}
                                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
                                    >
                                      {expandedPosts.has(post.id) ? 'View less' : 'View more'}
                                    </button>
                                  )}
                                </div>
                                {post.link && (
                                  <a
                                    href={post.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline truncate block"
                                  >
                                    {post.link}
                                  </a>
                                )}
                                {post.imageUrl && (
                                  <div className="mt-2">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                      src={post.imageUrl}
                                      alt="Facebook post attachment"
                                      className="max-h-32 rounded border border-gray-200 dark:border-gray-700 object-cover"
                                    />
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                {post.source === 'cms' && (
                                  <>
                                    {/* Edit button - appears on hover */}
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 group-hover/item:opacity-100 transition-opacity duration-200">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          startEditing(post);
                                        }}
                                        className="pointer-events-auto px-4 py-2 text-sm bg-blue-500/90 dark:bg-blue-600/90 hover:bg-blue-600 dark:hover:bg-blue-700 rounded-lg text-white font-medium transition-all duration-200 hover:scale-105 z-10 border border-blue-400 dark:border-blue-500"
                                        title="Click anywhere to edit"
                                      >
                                        Edit
                                      </button>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        startDeleting(post.id);
                                      }}
                                      disabled={deletingPost === post.id}
                                      className="px-3 py-1.5 text-xs bg-red-500/90 dark:bg-red-600/90 hover:bg-red-600 dark:hover:bg-red-700 rounded-lg font-medium text-white transition-all duration-200 hover:scale-105 flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed border border-red-400 dark:border-red-500 relative z-20"
                                      title="Delete post"
                                    >
                                      {deletingPost === post.id ? (
                                        <FaSpinner className="animate-spin" />
                                      ) : (
                                        <>
                                          <FaTrash />
                                          <span className="hidden sm:inline">Delete</span>
                                        </>
                                      )}
                                    </button>
                                  </>
                                )}
                                {post.permalink && (
                                  <a
                                    href={post.permalink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="px-3 py-1.5 text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg font-medium text-gray-700 dark:text-gray-200 transition border border-gray-200 dark:border-gray-600 relative z-20"
                                    title="View on Facebook"
                                  >
                                    View
                                  </a>
                                )}
                              </div>
                            </div>
                            {/* Insights Section */}
                            {post.source === 'cms' && post.id && (
                              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    fetchPostInsights(post.id);
                                  }}
                                  disabled={loadingInsights.has(post.id)}
                                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium flex items-center gap-1"
                                >
                                  {loadingInsights.has(post.id) ? (
                                    <>
                                      <FaSpinner className="animate-spin" />
                                      Loading insights...
                                    </>
                                  ) : expandedInsights.has(post.id) ? (
                                    'Hide insights'
                                  ) : (
                                    'View insights'
                                  )}
                                </button>
                                {expandedInsights.has(post.id) && postInsights.has(post.id) && (
                                  <div className="mt-2 bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3">
                                    {(() => {
                                      const insights = postInsights.get(post.id);
                                      if (!insights || Object.keys(insights).length === 0) {
                                        return (
                                          <p className="text-xs text-gray-500 dark:text-gray-400">
                                            Insights not available for this post
                                          </p>
                                        );
                                      }
                                      return (
                                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
                                          {insights.impressions !== undefined && (
                                            <div>
                                              <div className="text-gray-500 dark:text-gray-400">Impressions</div>
                                              <div className="font-semibold text-gray-900 dark:text-white">
                                                {insights.impressions.toLocaleString()}
                                              </div>
                                            </div>
                                          )}
                                          {insights.reach !== undefined && (
                                            <div>
                                              <div className="text-gray-500 dark:text-gray-400">Reach</div>
                                              <div className="font-semibold text-gray-900 dark:text-white">
                                                {insights.reach.toLocaleString()}
                                              </div>
                                            </div>
                                          )}
                                          {insights.engagedUsers !== undefined && (
                                            <div>
                                              <div className="text-gray-500 dark:text-gray-400">Engaged Users</div>
                                              <div className="font-semibold text-gray-900 dark:text-white">
                                                {insights.engagedUsers.toLocaleString()}
                                              </div>
                                            </div>
                                          )}
                                          {insights.reactions?.total !== undefined && (
                                            <div>
                                              <div className="text-gray-500 dark:text-gray-400">Reactions</div>
                                              <div className="font-semibold text-gray-900 dark:text-white">
                                                {insights.reactions.total.toLocaleString()}
                                              </div>
                                            </div>
                                          )}
                                          {insights.clicks !== undefined && (
                                            <div>
                                              <div className="text-gray-500 dark:text-gray-400">Clicks</div>
                                              <div className="font-semibold text-gray-900 dark:text-white">
                                                {insights.clicks.toLocaleString()}
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })()}
                                  </div>
                                )}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    ))
                  )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
}

