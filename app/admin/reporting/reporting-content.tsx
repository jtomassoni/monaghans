'use client';

import { useState, useEffect } from 'react';
import { 
  FaChartLine, 
  FaEye, 
  FaUtensils, 
  FaStar,
  FaLightbulb,
  FaDownload,
  FaCalendarAlt,
  FaUsers,
  FaEdit,
  FaFacebook,
} from 'react-icons/fa';

interface CMSAnalytics {
  period: number;
  summary: {
    totalActivities: number;
    byType: Record<string, { create: number; update: number; delete: number }>;
  };
  trends: {
    daily: Array<{ date: string; count: number }>;
  };
  mostActive: Array<{
    entityType: string;
    entityId: string;
    entityName: string | null;
    activityCount: number;
  }>;
  byUser: Array<{
    userId: string;
    userName: string;
    activityCount: number;
  }>;
}

interface PageviewAnalytics {
  period: number;
  summary: {
    totalPageviews: number;
    uniquePaths: number;
  };
  trends: {
    daily: Array<{ date: string; count: number }>;
  };
  topPages: Array<{ path: string; count: number }>;
}

interface Insight {
  type: 'info' | 'warning' | 'success' | 'opportunity';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high';
}

interface FacebookAnalytics {
  period: number;
  summary: {
    totalPosts: number;
    totalImpressions: number;
    totalReach: number;
    totalEngagedUsers: number;
    totalReactions: number;
    totalClicks: number;
    averageImpressions: number;
    averageReach: number;
    averageEngagedUsers: number;
  };
  pageInsights: {
    fans?: number;
    impressions?: number;
    engagedUsers?: number;
  } | null;
  posts: Array<{
    id: string;
    postId: string;
    message: string;
    insights: {
      impressions?: number;
      reach?: number;
      engagedUsers?: number;
      reactions?: { total: number };
      clicks?: number;
    } | null;
  }>;
}

export default function ReportingContent() {
  const [activeTab, setActiveTab] = useState<'overview' | 'cms' | 'pageviews' | 'menu' | 'specials' | 'insights' | 'social'>('overview');
  const [period, setPeriod] = useState('30');
  const [loading, setLoading] = useState(true);
  
  const [cmsData, setCmsData] = useState<CMSAnalytics | null>(null);
  const [pageviewData, setPageviewData] = useState<PageviewAnalytics | null>(null);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [facebookData, setFacebookData] = useState<FacebookAnalytics | null>(null);

  useEffect(() => {
    fetchData();
  }, [period]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [cmsRes, pageviewRes, insightsRes, facebookRes] = await Promise.all([
        fetch(`/api/reporting/cms-analytics?period=${period}`),
        fetch(`/api/reporting/pageviews?period=${period}`),
        fetch('/api/reporting/insights'),
        fetch(`/api/reporting/facebook-analytics?period=${period}`),
      ]);

      if (cmsRes.ok) {
        const data = await cmsRes.json();
        setCmsData(data);
      }

      if (pageviewRes.ok) {
        const data = await pageviewRes.json();
        setPageviewData(data);
      }

      if (insightsRes.ok) {
        const data = await insightsRes.json();
        setInsights(data.insights || []);
      }

      if (facebookRes.ok) {
        const data = await facebookRes.json();
        setFacebookData(data);
      } else if (facebookRes.status === 400) {
        // Facebook not connected - that's okay
        setFacebookData(null);
      }
    } catch (error) {
      console.error('Failed to fetch reporting data:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = (data: any, filename: string) => {
    // Simple CSV export - can be enhanced later
    const csv = JSON.stringify(data, null, 2);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.json`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: FaChartLine },
    { id: 'cms', label: 'CMS Analytics', icon: FaEdit },
    { id: 'pageviews', label: 'Pageviews', icon: FaEye },
    { id: 'menu', label: 'Menu Performance', icon: FaUtensils },
    { id: 'specials', label: 'Specials Performance', icon: FaStar },
    { id: 'social', label: 'Social Media', icon: FaFacebook },
    { id: 'insights', label: 'Insights', icon: FaLightbulb },
  ];

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Period:
          </label>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="365">Last year</option>
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-8 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-500 dark:text-gray-400">Loading analytics...</p>
        </div>
      ) : (
        <div className="mt-6">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* CMS Summary */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">CMS Activity</h3>
                  <FaEdit className="w-5 h-5 text-blue-500" />
                </div>
                {cmsData ? (
                  <>
                    <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                      {cmsData.summary.totalActivities}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Total changes in last {period} days
                    </p>
                  </>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400">No data available</p>
                )}
              </div>

              {/* Pageviews Summary */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Pageviews</h3>
                  <FaEye className="w-5 h-5 text-green-500" />
                </div>
                {pageviewData ? (
                  <>
                    <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                      {pageviewData.summary.totalPageviews.toLocaleString()}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {pageviewData.summary.uniquePaths} unique pages
                    </p>
                  </>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400">No data available</p>
                )}
              </div>

              {/* Insights Summary */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Insights</h3>
                  <FaLightbulb className="w-5 h-5 text-yellow-500" />
                </div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  {insights.length}
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Actionable recommendations
                </p>
              </div>
            </div>
          )}

          {activeTab === 'cms' && cmsData && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Activity by Type</h3>
                  <button
                    onClick={() => exportToCSV(cmsData, 'cms-analytics')}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition"
                  >
                    <FaDownload className="w-4 h-4" />
                    Export
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(cmsData.summary.byType).map(([type, counts]) => (
                    <div key={type} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 dark:text-white mb-2 capitalize">{type}</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500 dark:text-gray-400">Created:</span>
                          <span className="font-medium text-green-600 dark:text-green-400">{counts.create}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500 dark:text-gray-400">Updated:</span>
                          <span className="font-medium text-blue-600 dark:text-blue-400">{counts.update}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500 dark:text-gray-400">Deleted:</span>
                          <span className="font-medium text-red-600 dark:text-red-400">{counts.delete}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Most Active Content</h3>
                <div className="space-y-2">
                  {cmsData.mostActive.slice(0, 10).map((item, index) => (
                    <div key={item.entityId} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400 w-6">#{index + 1}</span>
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">{item.entityName || 'Unnamed'}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 capitalize">{item.entityType}</div>
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">{item.activityCount} changes</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Activity by User</h3>
                <div className="space-y-2">
                  {cmsData.byUser.map((user) => (
                    <div key={user.userId} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                      <div className="flex items-center gap-3">
                        <FaUsers className="w-5 h-5 text-gray-400" />
                        <span className="font-medium text-gray-900 dark:text-white">{user.userName}</span>
                      </div>
                      <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">{user.activityCount} changes</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'pageviews' && pageviewData && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Pageview Summary</h3>
                  <button
                    onClick={() => exportToCSV(pageviewData, 'pageviews')}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition"
                  >
                    <FaDownload className="w-4 h-4" />
                    Export
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                      {pageviewData.summary.totalPageviews.toLocaleString()}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Total pageviews</p>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                      {pageviewData.summary.uniquePaths}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Unique pages</p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Top Pages</h3>
                <div className="space-y-2">
                  {pageviewData.topPages.map((page, index) => (
                    <div key={page.path} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400 w-6">#{index + 1}</span>
                        <span className="font-medium text-gray-900 dark:text-white">{page.path || '/'}</span>
                      </div>
                      <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">{page.count.toLocaleString()} views</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'social' && (
            <div className="space-y-6">
              {!facebookData ? (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
                  <FaFacebook className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400 mb-2">Facebook not connected</p>
                  <p className="text-sm text-gray-400 dark:text-gray-500">
                    Connect Facebook in the Social Media section to view analytics
                  </p>
                </div>
              ) : (
                <>
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                      <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Posts</div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {facebookData.summary.totalPosts}
                      </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                      <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Impressions</div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {facebookData.summary.totalImpressions.toLocaleString()}
                      </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                      <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Reach</div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {facebookData.summary.totalReach.toLocaleString()}
                      </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                      <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Reactions</div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {facebookData.summary.totalReactions.toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {/* Page Insights */}
                  {facebookData.pageInsights && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Page Insights</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {facebookData.pageInsights.fans !== undefined && (
                          <div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">Page Fans</div>
                            <div className="text-xl font-bold text-gray-900 dark:text-white">
                              {facebookData.pageInsights.fans.toLocaleString()}
                            </div>
                          </div>
                        )}
                        {facebookData.pageInsights.impressions !== undefined && (
                          <div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">Page Impressions</div>
                            <div className="text-xl font-bold text-gray-900 dark:text-white">
                              {facebookData.pageInsights.impressions.toLocaleString()}
                            </div>
                          </div>
                        )}
                        {facebookData.pageInsights.engagedUsers !== undefined && (
                          <div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">Engaged Users</div>
                            <div className="text-xl font-bold text-gray-900 dark:text-white">
                              {facebookData.pageInsights.engagedUsers.toLocaleString()}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Average Metrics */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Average Performance</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">Avg Impressions</div>
                        <div className="text-xl font-bold text-gray-900 dark:text-white">
                          {facebookData.summary.averageImpressions.toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">Avg Reach</div>
                        <div className="text-xl font-bold text-gray-900 dark:text-white">
                          {facebookData.summary.averageReach.toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">Avg Engaged Users</div>
                        <div className="text-xl font-bold text-gray-900 dark:text-white">
                          {facebookData.summary.averageEngagedUsers.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Top Posts */}
                  {facebookData.posts.length > 0 && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Posts</h3>
                        <button
                          onClick={() => exportToCSV(facebookData, 'facebook-analytics')}
                          className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm flex items-center gap-2"
                        >
                          <FaDownload className="w-3 h-3" />
                          Export
                        </button>
                      </div>
                      <div className="space-y-3">
                        {facebookData.posts.slice(0, 10).map((post) => (
                          <div
                            key={post.id}
                            className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                          >
                            <div className="text-sm text-gray-900 dark:text-white mb-2 line-clamp-2">
                              {post.message || 'No message'}
                            </div>
                            {post.insights ? (
                              <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
                                <div>
                                  <div className="text-gray-500 dark:text-gray-400">Impressions</div>
                                  <div className="font-semibold text-gray-900 dark:text-white">
                                    {post.insights.impressions?.toLocaleString() || '0'}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-gray-500 dark:text-gray-400">Reach</div>
                                  <div className="font-semibold text-gray-900 dark:text-white">
                                    {post.insights.reach?.toLocaleString() || '0'}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-gray-500 dark:text-gray-400">Engaged</div>
                                  <div className="font-semibold text-gray-900 dark:text-white">
                                    {post.insights.engagedUsers?.toLocaleString() || '0'}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-gray-500 dark:text-gray-400">Reactions</div>
                                  <div className="font-semibold text-gray-900 dark:text-white">
                                    {post.insights.reactions?.total.toLocaleString() || '0'}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-gray-500 dark:text-gray-400">Clicks</div>
                                  <div className="font-semibold text-gray-900 dark:text-white">
                                    {post.insights.clicks?.toLocaleString() || '0'}
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="text-xs text-gray-400 dark:text-gray-500">
                                Insights not available
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {activeTab === 'insights' && (
            <div className="space-y-4">
              {insights.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
                  <FaLightbulb className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">No insights available at this time.</p>
                </div>
              ) : (
                insights.map((insight, index) => {
                  const colors = {
                    info: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
                    warning: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
                    success: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
                    opportunity: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800',
                  };
                  
                  const textColors = {
                    info: 'text-blue-800 dark:text-blue-200',
                    warning: 'text-yellow-800 dark:text-yellow-200',
                    success: 'text-green-800 dark:text-green-200',
                    opportunity: 'text-purple-800 dark:text-purple-200',
                  };

                  return (
                    <div
                      key={index}
                      className={`border rounded-lg p-4 ${colors[insight.type]}`}
                    >
                      <div className="flex items-start gap-3">
                        <FaLightbulb className={`w-5 h-5 mt-0.5 ${textColors[insight.type]}`} />
                        <div className="flex-1">
                          <h4 className={`font-semibold mb-1 ${textColors[insight.type]}`}>
                            {insight.title}
                          </h4>
                          <p className={`text-sm ${textColors[insight.type]} opacity-90`}>
                            {insight.message}
                          </p>
                          <span className={`inline-block mt-2 text-xs px-2 py-1 rounded ${
                            insight.priority === 'high' ? 'bg-red-200 dark:bg-red-900/40 text-red-800 dark:text-red-200' :
                            insight.priority === 'medium' ? 'bg-yellow-200 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-200' :
                            'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                          }`}>
                            {insight.priority} priority
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {(activeTab === 'menu' || activeTab === 'specials') && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <p className="text-gray-500 dark:text-gray-400">
                {activeTab === 'menu' ? 'Menu' : 'Specials'} performance tracking coming soon. 
                This will include sales data, profitability metrics, and optimization recommendations 
                when online ordering and inventory systems are implemented.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

