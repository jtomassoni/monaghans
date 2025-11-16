'use client';

import { useState, useEffect, useMemo } from 'react';
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
  FaDollarSign,
  FaClock,
  FaChartPie,
  FaCog,
  FaWineGlass,
  FaUserClock,
  FaSearch,
  FaTimes,
  FaChartBar,
  FaArrowUp,
  FaBrain,
  FaArrowLeft,
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
    isDeleted: boolean;
    isInactive: boolean;
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

interface FoodCostReport {
  summary: {
    totalItems: number;
    itemsWithPrices: number;
    itemsWithoutPrices: number;
    totalFoodCost: number;
    totalMenuValue: number;
    averageFoodCost: number;
    averageFoodCostPercentage: number | null;
    byStatus: {
      good: number;
      acceptable: number;
      high: number;
      unknown: number;
    };
  };
  items: Array<{
    id: string;
    name: string;
    section: { id: string; name: string; menuType: string };
    price: string | null;
    menuPrice: number | null;
    priceNotes: string | null;
    isAvailable: boolean;
    prepTimeMin: number | null;
    foodCost: number;
    foodCostPercentage: number | null;
    status: 'good' | 'acceptable' | 'high' | 'unknown';
    ingredientCount: number;
    ingredients: Array<{
      id: string;
      ingredient: { id: string; name: string; unit: string; costPerUnit: number };
      quantity: number;
      notes: string | null;
      cost: number;
    }>;
  }>;
  sortedByPercentage: Array<any>;
  byStatus: {
    good: Array<any>;
    acceptable: Array<any>;
    high: Array<any>;
    unknown: Array<any>;
  };
  sections: Array<{ id: string; name: string; menuType: string }>;
}

export default function ReportingContent() {
  const [activeTab, setActiveTab] = useState<'overview' | 'cms' | 'pageviews' | 'menu' | 'specials' | 'insights' | 'ai-insights' | 'social' | 'food-cost' | 'labor-cost' | 'profitability' | 'menu-optimization' | 'specials-optimization' | 'schedule-optimization'>('overview');
  const [period, setPeriod] = useState('30');
  const [loading, setLoading] = useState(true);
  
  const [cmsData, setCmsData] = useState<CMSAnalytics | null>(null);
  const [pageviewData, setPageviewData] = useState<PageviewAnalytics | null>(null);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [facebookData, setFacebookData] = useState<FacebookAnalytics | null>(null);
  const [foodCostData, setFoodCostData] = useState<FoodCostReport | null>(null);
  const [foodCostLoading, setFoodCostLoading] = useState(false);
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [includeInactive, setIncludeInactive] = useState(false);
  const [salesData, setSalesData] = useState<any>(null);
  const [salesLoading, setSalesLoading] = useState(false);
  const [laborCostData, setLaborCostData] = useState<any>(null);
  const [laborCostLoading, setLaborCostLoading] = useState(false);
  const [profitabilityData, setProfitabilityData] = useState<any>(null);
  const [profitabilityLoading, setProfitabilityLoading] = useState(false);
  const [menuOptimizationData, setMenuOptimizationData] = useState<any>(null);
  const [menuOptimizationLoading, setMenuOptimizationLoading] = useState(false);
  const [specialsOptimizationData, setSpecialsOptimizationData] = useState<any>(null);
  const [specialsOptimizationLoading, setSpecialsOptimizationLoading] = useState(false);
  const [scheduleOptimizationData, setScheduleOptimizationData] = useState<any>(null);
  const [scheduleOptimizationLoading, setScheduleOptimizationLoading] = useState(false);
  const [aiInsightsData, setAiInsightsData] = useState<any>(null);
  const [aiInsightsLoading, setAiInsightsLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, [period]);

  useEffect(() => {
    if (activeTab === 'food-cost') {
      fetchFoodCostData();
    } else if (activeTab === 'menu') {
      fetchSalesData();
    } else if (activeTab === 'labor-cost') {
      fetchLaborCostData();
    } else if (activeTab === 'profitability') {
      fetchProfitabilityData();
    } else if (activeTab === 'menu-optimization') {
      fetchMenuOptimizationData();
    } else if (activeTab === 'specials-optimization') {
      fetchSpecialsOptimizationData();
    } else if (activeTab === 'schedule-optimization') {
      fetchScheduleOptimizationData();
    } else if (activeTab === 'ai-insights') {
      fetchAiInsightsData();
    }
  }, [activeTab, selectedSection, includeInactive, period]);

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

  const fetchFoodCostData = async () => {
    setFoodCostLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedSection) params.append('sectionId', selectedSection);
      if (includeInactive) params.append('includeInactive', 'true');
      
      const res = await fetch(`/api/reporting/food-cost?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setFoodCostData(data);
      }
    } catch (error) {
      console.error('Failed to fetch food cost data:', error);
    } finally {
      setFoodCostLoading(false);
    }
  };

  const fetchSalesData = async () => {
    setSalesLoading(true);
    try {
      const res = await fetch(`/api/reporting/sales-analytics?period=${period}`);
      if (res.ok) {
        const data = await res.json();
        setSalesData(data);
      }
    } catch (error) {
      console.error('Failed to fetch sales data:', error);
    } finally {
      setSalesLoading(false);
    }
  };

  const fetchLaborCostData = async () => {
    setLaborCostLoading(true);
    try {
      const res = await fetch(`/api/reporting/labor-cost?period=${period}`);
      if (res.ok) {
        const data = await res.json();
        setLaborCostData(data);
      }
    } catch (error) {
      console.error('Failed to fetch labor cost data:', error);
    } finally {
      setLaborCostLoading(false);
    }
  };

  const fetchProfitabilityData = async () => {
    setProfitabilityLoading(true);
    try {
      const res = await fetch(`/api/reporting/profitability?period=${period}`);
      if (res.ok) {
        const data = await res.json();
        setProfitabilityData(data);
      }
    } catch (error) {
      console.error('Failed to fetch profitability data:', error);
    } finally {
      setProfitabilityLoading(false);
    }
  };

  const fetchMenuOptimizationData = async () => {
    setMenuOptimizationLoading(true);
    try {
      const res = await fetch(`/api/reporting/menu-optimization?period=${period}`);
      if (res.ok) {
        const data = await res.json();
        setMenuOptimizationData(data);
      }
    } catch (error) {
      console.error('Failed to fetch menu optimization data:', error);
    } finally {
      setMenuOptimizationLoading(false);
    }
  };

  const fetchSpecialsOptimizationData = async () => {
    setSpecialsOptimizationLoading(true);
    try {
      const res = await fetch(`/api/reporting/specials-optimization?period=${period}`);
      if (res.ok) {
        const data = await res.json();
        setSpecialsOptimizationData(data);
      }
    } catch (error) {
      console.error('Failed to fetch specials optimization data:', error);
    } finally {
      setSpecialsOptimizationLoading(false);
    }
  };

  const fetchScheduleOptimizationData = async () => {
    setScheduleOptimizationLoading(true);
    try {
      const res = await fetch(`/api/reporting/schedule-optimization?period=${period}`);
      if (res.ok) {
        const data = await res.json();
        setScheduleOptimizationData(data);
      }
    } catch (error) {
      console.error('Failed to fetch schedule optimization data:', error);
    } finally {
      setScheduleOptimizationLoading(false);
    }
  };

  const fetchAiInsightsData = async () => {
    setAiInsightsLoading(true);
    try {
      const res = await fetch(`/api/reporting/ai-insights?period=${period}`);
      if (res.ok) {
        const data = await res.json();
        setAiInsightsData(data);
      }
    } catch (error) {
      console.error('Failed to fetch AI insights data:', error);
    } finally {
      setAiInsightsLoading(false);
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

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const reportCategories = [
    {
      id: 'analytics',
      name: 'Analytics',
      icon: FaChartBar,
      color: 'blue',
      reports: [
        { id: 'overview', label: 'Overview', icon: FaChartLine, description: 'Quick overview of all metrics' },
        { id: 'cms', label: 'CMS Analytics', icon: FaEdit, description: 'Content management activity tracking' },
        { id: 'pageviews', label: 'Pageviews', icon: FaEye, description: 'Website traffic and page performance' },
        { id: 'social', label: 'Social Media', icon: FaFacebook, description: 'Facebook engagement and reach' },
      ],
    },
    {
      id: 'performance',
      name: 'Performance',
      icon: FaArrowUp,
      color: 'green',
      reports: [
        { id: 'menu', label: 'Menu Performance', icon: FaUtensils, description: 'Menu item sales and popularity' },
        { id: 'specials', label: 'Specials Performance', icon: FaStar, description: 'Daily specials effectiveness' },
      ],
    },
    {
      id: 'financial',
      name: 'Financial',
      icon: FaDollarSign,
      color: 'amber',
      reports: [
        { id: 'food-cost', label: 'Food Cost Analysis', icon: FaDollarSign, description: 'Ingredient costs and margins' },
        { id: 'labor-cost', label: 'Labor Cost Analysis', icon: FaClock, description: 'Staffing costs and efficiency' },
        { id: 'profitability', label: 'Profitability Analysis', icon: FaChartPie, description: 'Overall profitability metrics' },
      ],
    },
    {
      id: 'optimization',
      name: 'Optimization',
      icon: FaCog,
      color: 'purple',
      reports: [
        { id: 'menu-optimization', label: 'Menu Optimization', icon: FaCog, description: 'Menu item recommendations' },
        { id: 'specials-optimization', label: 'Specials Optimization', icon: FaWineGlass, description: 'Specials strategy insights' },
        { id: 'schedule-optimization', label: 'Schedule Optimization', icon: FaUserClock, description: 'Staffing recommendations' },
      ],
    },
    {
      id: 'insights',
      name: 'Insights',
      icon: FaBrain,
      color: 'indigo',
      reports: [
        { id: 'insights', label: 'Insights', icon: FaLightbulb, description: 'Actionable business insights' },
        { id: 'ai-insights', label: 'AI Insights', icon: FaBrain, description: 'AI-powered recommendations' },
      ],
    },
  ];

  const allReports = reportCategories.flatMap(cat => 
    cat.reports.map(report => ({ ...report, category: cat.id, categoryName: cat.name, categoryColor: cat.color }))
  );

  const filteredReports = useMemo(() => {
    let filtered = allReports;
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(report => 
        report.label.toLowerCase().includes(query) ||
        report.description.toLowerCase().includes(query) ||
        report.categoryName.toLowerCase().includes(query)
      );
    }
    
    if (selectedCategory) {
      filtered = filtered.filter(report => report.category === selectedCategory);
    }
    
    return filtered;
  }, [searchQuery, selectedCategory, allReports]);

  const tabs = allReports.map(r => ({ id: r.id, label: r.label, icon: r.icon }));

  const getColorClasses = (color: string, type: 'bg' | 'text' | 'border' = 'bg') => {
    const colors: Record<string, Record<string, string>> = {
      blue: {
        bg: 'bg-blue-50 dark:bg-blue-900/20',
        text: 'text-blue-600 dark:text-blue-400',
        border: 'border-blue-200 dark:border-blue-800',
      },
      green: {
        bg: 'bg-green-50 dark:bg-green-900/20',
        text: 'text-green-600 dark:text-green-400',
        border: 'border-green-200 dark:border-green-800',
      },
      amber: {
        bg: 'bg-amber-50 dark:bg-amber-900/20',
        text: 'text-amber-600 dark:text-amber-400',
        border: 'border-amber-200 dark:border-amber-800',
      },
      purple: {
        bg: 'bg-purple-50 dark:bg-purple-900/20',
        text: 'text-purple-600 dark:text-purple-400',
        border: 'border-purple-200 dark:border-purple-800',
      },
      indigo: {
        bg: 'bg-indigo-50 dark:bg-indigo-900/20',
        text: 'text-indigo-600 dark:text-indigo-400',
        border: 'border-indigo-200 dark:border-indigo-800',
      },
    };
    return colors[color]?.[type] || colors.blue[type];
  };

  return (
    <div className="space-y-6">
      {/* Header with Search and Period Selector */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search reports..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <FaTimes className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Period Selector */}
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
            Time Period:
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

      {/* Category Filters */}
      {!searchQuery && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedCategory === null
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            All Reports
          </button>
          {reportCategories.map((category) => {
            const Icon = category.icon;
            return (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                  selectedCategory === category.id
                    ? `${getColorClasses(category.color, 'bg')} ${getColorClasses(category.color, 'text')} border-2 ${getColorClasses(category.color, 'border')}`
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <Icon className="w-4 h-4" />
                {category.name}
              </button>
            );
          })}
        </div>
      )}

      {/* Quick Stats Overview - Only show when on overview tab and not searching */}
      {activeTab === 'overview' && !searchQuery && !loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* CMS Summary */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">CMS Activity</h3>
              <FaEdit className="w-4 h-4 text-blue-500" />
            </div>
            {cmsData ? (
              <>
                <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                  {cmsData.summary.totalActivities.toLocaleString()}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Changes in last {period} days
                </p>
              </>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">No data</p>
            )}
          </div>

          {/* Pageviews Summary */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Pageviews</h3>
              <FaEye className="w-4 h-4 text-green-500" />
            </div>
            {pageviewData ? (
              <>
                <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                  {pageviewData.summary.totalPageviews.toLocaleString()}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {pageviewData.summary.uniquePaths} unique pages
                </p>
              </>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">No data</p>
            )}
          </div>

          {/* Insights Summary */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Insights</h3>
              <FaLightbulb className="w-4 h-4 text-yellow-500" />
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              {insights.length}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Actionable recommendations
            </p>
          </div>

          {/* Social Media Summary */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Social Media</h3>
              <FaFacebook className="w-4 h-4 text-blue-600" />
            </div>
            {facebookData ? (
              <>
                <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                  {facebookData.summary.totalPosts}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {facebookData.summary.totalImpressions.toLocaleString()} impressions
                </p>
              </>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">Not connected</p>
            )}
          </div>
        </div>
      )}

      {/* Report Cards Grid - Show when on overview tab and not searching */}
      {activeTab === 'overview' && !searchQuery && (
        <div className="space-y-8">
          {reportCategories.map((category) => {
            const CategoryIcon = category.icon;
            let categoryReports = category.reports;
            
            // Apply category filter
            if (selectedCategory) {
              if (category.id !== selectedCategory) return null;
            }
            
            if (categoryReports.length === 0) return null;

            return (
              <div key={category.id} className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${getColorClasses(category.color, 'bg')}`}>
                    <CategoryIcon className={`w-5 h-5 ${getColorClasses(category.color, 'text')}`} />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">{category.name}</h2>
                  <span className="text-sm text-gray-500 dark:text-gray-400">({categoryReports.length})</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {categoryReports.map((report) => {
                    const ReportIcon = report.icon;
                    return (
                      <button
                        key={report.id}
                        onClick={() => setActiveTab(report.id as any)}
                        className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 hover:scale-[1.02] p-5 text-left group"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className={`p-2.5 rounded-lg ${getColorClasses(category.color, 'bg')}`}>
                            <ReportIcon className={`w-5 h-5 ${getColorClasses(category.color, 'text')}`} />
                          </div>
                        </div>
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-1.5 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {report.label}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                          {report.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Search Results View */}
      {activeTab === 'overview' && searchQuery && filteredReports.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Search Results ({filteredReports.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredReports.map((report) => {
              const ReportIcon = report.icon;
              const category = reportCategories.find(c => c.id === report.category);
              return (
                <button
                  key={report.id}
                  onClick={() => setActiveTab(report.id as any)}
                  className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 hover:scale-[1.02] p-5 text-left group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className={`p-2.5 rounded-lg ${getColorClasses(report.categoryColor, 'bg')}`}>
                      <ReportIcon className={`w-5 h-5 ${getColorClasses(report.categoryColor, 'text')}`} />
                    </div>
                    <span className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                      {report.categoryName}
                    </span>
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1.5 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {report.label}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                    {report.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* No Search Results */}
      {activeTab === 'overview' && searchQuery && filteredReports.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-12 text-center">
          <FaSearch className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400 mb-2">No reports found</p>
          <p className="text-sm text-gray-400 dark:text-gray-500">
            Try adjusting your search terms
          </p>
        </div>
      )}

      {/* Back Button when viewing a specific report */}
      {activeTab !== 'overview' && (
        <button
          onClick={() => {
            setActiveTab('overview');
            setSearchQuery('');
            setSelectedCategory(null);
          }}
          className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors mb-6 px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <FaArrowLeft className="w-4 h-4" />
          Back to Reports
        </button>
      )}

      {/* Content */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-500 dark:text-gray-400">Loading analytics...</p>
        </div>
      ) : (
        <div className="mt-6">
          {/* Overview content is now shown above in the report cards section */}

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
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900 dark:text-white">{user.userName}</span>
                          {user.isDeleted && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">
                              (deleted)
                            </span>
                          )}
                          {user.isInactive && !user.isDeleted && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800">
                              (inactive)
                            </span>
                          )}
                        </div>
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

          {activeTab === 'ai-insights' && (
            <div className="space-y-6">
              {aiInsightsLoading ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <p className="mt-4 text-gray-500 dark:text-gray-400">Generating AI insights...</p>
                </div>
              ) : aiInsightsData ? (
                <>
                  {/* Menu Optimizations */}
                  {aiInsightsData.menuOptimizations && aiInsightsData.menuOptimizations.length > 0 && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">AI Menu Optimizations</h3>
                        <button
                          onClick={() => exportToCSV(aiInsightsData.menuOptimizations, 'ai-menu-optimizations')}
                          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition"
                        >
                          <FaDownload className="w-4 h-4" />
                          Export
                        </button>
                      </div>
                      <div className="space-y-4">
                        {aiInsightsData.menuOptimizations.map((opt: any, index: number) => (
                          <div
                            key={index}
                            className={`border rounded-lg p-4 ${
                              opt.priority === 'high'
                                ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                                : opt.priority === 'medium'
                                ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                                : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <FaLightbulb className={`w-5 h-5 mt-0.5 ${
                                opt.priority === 'high' ? 'text-red-600 dark:text-red-400' :
                                opt.priority === 'medium' ? 'text-yellow-600 dark:text-yellow-400' :
                                'text-blue-600 dark:text-blue-400'
                              }`} />
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <h4 className={`font-semibold ${
                                    opt.priority === 'high' ? 'text-red-900 dark:text-red-100' :
                                    opt.priority === 'medium' ? 'text-yellow-900 dark:text-yellow-100' :
                                    'text-blue-900 dark:text-blue-100'
                                  }`}>
                                    {opt.title}
                                  </h4>
                                  <span className={`text-xs px-2 py-1 rounded ${
                                    opt.priority === 'high' ? 'bg-red-200 dark:bg-red-900/40 text-red-800 dark:text-red-200' :
                                    opt.priority === 'medium' ? 'bg-yellow-200 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-200' :
                                    'bg-blue-200 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200'
                                  }`}>
                                    {opt.priority} priority • {opt.confidence}% confidence
                                  </span>
                                </div>
                                <p className={`text-sm mb-2 ${
                                  opt.priority === 'high' ? 'text-red-800 dark:text-red-200' :
                                  opt.priority === 'medium' ? 'text-yellow-800 dark:text-yellow-200' :
                                  'text-blue-800 dark:text-blue-200'
                                }`}>
                                  {opt.description}
                                </p>
                                {opt.currentMetrics && (
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2 text-xs">
                                    <div>
                                      <span className="text-gray-500 dark:text-gray-400">Revenue: </span>
                                      <span className="font-medium">${opt.currentMetrics.revenue.toFixed(2)}</span>
                                    </div>
                                    <div>
                                      <span className="text-gray-500 dark:text-gray-400">Quantity: </span>
                                      <span className="font-medium">{opt.currentMetrics.quantity}</span>
                                    </div>
                                    <div>
                                      <span className="text-gray-500 dark:text-gray-400">Margin: </span>
                                      <span className="font-medium">
                                        {opt.currentMetrics.profitMargin !== null
                                          ? `${opt.currentMetrics.profitMargin.toFixed(1)}%`
                                          : 'N/A'}
                                      </span>
                                    </div>
                                    <div>
                                      <span className="text-gray-500 dark:text-gray-400">Food Cost: </span>
                                      <span className="font-medium">${opt.currentMetrics.foodCost.toFixed(2)}</span>
                                    </div>
                                  </div>
                                )}
                                <div className="mt-2 space-y-1">
                                  <p className={`text-sm font-medium ${
                                    opt.priority === 'high' ? 'text-red-900 dark:text-red-100' :
                                    opt.priority === 'medium' ? 'text-yellow-900 dark:text-yellow-100' :
                                    'text-blue-900 dark:text-blue-100'
                                  }`}>
                                    Suggested Change:
                                  </p>
                                  <p className={`text-sm ${
                                    opt.priority === 'high' ? 'text-red-800 dark:text-red-200' :
                                    opt.priority === 'medium' ? 'text-yellow-800 dark:text-yellow-200' :
                                    'text-blue-800 dark:text-blue-200'
                                  }`}>
                                    {opt.suggestedChange}
                                  </p>
                                  <p className={`text-sm font-medium mt-2 ${
                                    opt.priority === 'high' ? 'text-red-900 dark:text-red-100' :
                                    opt.priority === 'medium' ? 'text-yellow-900 dark:text-yellow-100' :
                                    'text-blue-900 dark:text-blue-100'
                                  }`}>
                                    Expected Impact:
                                  </p>
                                  <p className={`text-sm ${
                                    opt.priority === 'high' ? 'text-red-800 dark:text-red-200' :
                                    opt.priority === 'medium' ? 'text-yellow-800 dark:text-yellow-200' :
                                    'text-blue-800 dark:text-blue-200'
                                  }`}>
                                    {opt.expectedImpact}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Automated Insights */}
                  {aiInsightsData.automatedInsights && aiInsightsData.automatedInsights.length > 0 && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Automated Insights</h3>
                      <div className="space-y-3">
                        {aiInsightsData.automatedInsights.map((insight: any, index: number) => (
                          <div
                            key={index}
                            className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-900/50"
                          >
                            <div className="flex items-start gap-3">
                              <FaLightbulb className="w-5 h-5 mt-0.5 text-purple-600 dark:text-purple-400" />
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-semibold text-gray-900 dark:text-white">{insight.title}</h4>
                                  <span className={`text-xs px-2 py-1 rounded ${
                                    insight.priority === 'high' ? 'bg-red-200 dark:bg-red-900/40 text-red-800 dark:text-red-200' :
                                    insight.priority === 'medium' ? 'bg-yellow-200 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-200' :
                                    'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                                  }`}>
                                    {insight.priority}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-700 dark:text-gray-300">{insight.message}</p>
                                {insight.actionable && (
                                  <span className="inline-block mt-2 text-xs px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded">
                                    Actionable
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Demand Forecasts */}
                  {aiInsightsData.demandForecasts && aiInsightsData.demandForecasts.length > 0 && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Demand Forecasts (Next 7 Days)</h3>
                        <button
                          onClick={() => exportToCSV(aiInsightsData.demandForecasts, 'demand-forecasts')}
                          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition"
                        >
                          <FaDownload className="w-4 h-4" />
                          Export
                        </button>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50 dark:bg-gray-900">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Menu Item</th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Current Demand</th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Forecasted Demand</th>
                              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Trend</th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Confidence</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {aiInsightsData.demandForecasts.slice(0, 20).map((forecast: any) => (
                              <tr key={forecast.menuItemId}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                  {forecast.menuItemName}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white">
                                  {forecast.currentDemand.toFixed(1)} units/day
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-gray-900 dark:text-white">
                                  {forecast.forecastedDemand.toFixed(1)} units/day
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded ${
                                    forecast.trend === 'increasing'
                                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                                      : forecast.trend === 'decreasing'
                                      ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                                  }`}>
                                    {forecast.trend === 'increasing' ? '↑ Increasing' :
                                     forecast.trend === 'decreasing' ? '↓ Decreasing' :
                                     '→ Stable'}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500 dark:text-gray-400">
                                  {forecast.confidence}%
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Ingredient Forecasts */}
                  {aiInsightsData.ingredientForecasts && aiInsightsData.ingredientForecasts.length > 0 && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Ingredient Needs Forecast</h3>
                        <button
                          onClick={() => exportToCSV(aiInsightsData.ingredientForecasts, 'ingredient-forecasts')}
                          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition"
                        >
                          <FaDownload className="w-4 h-4" />
                          Export
                        </button>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50 dark:bg-gray-900">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Ingredient</th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Current Usage</th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Forecasted Usage</th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Days Until Depletion</th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Recommended Order</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Order Date</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {aiInsightsData.ingredientForecasts.slice(0, 20).map((forecast: any) => (
                              <tr key={forecast.ingredientId}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                  {forecast.ingredientName}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white">
                                  {forecast.currentUsageRate.toFixed(1)} units/day
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-gray-900 dark:text-white">
                                  {forecast.forecastedUsageRate.toFixed(1)} units/day
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                                  {forecast.daysUntilDepletion !== null ? (
                                    <span className={`font-semibold ${
                                      forecast.daysUntilDepletion < 3
                                        ? 'text-red-600 dark:text-red-400'
                                        : forecast.daysUntilDepletion < 7
                                        ? 'text-yellow-600 dark:text-yellow-400'
                                        : 'text-green-600 dark:text-green-400'
                                    }`}>
                                      {forecast.daysUntilDepletion.toFixed(1)} days
                                    </span>
                                  ) : (
                                    <span className="text-gray-500 dark:text-gray-400">N/A</span>
                                  )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white">
                                  {forecast.recommendedOrderQuantity} units
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                  {forecast.recommendedOrderDate
                                    ? new Date(forecast.recommendedOrderDate).toLocaleDateString()
                                    : 'N/A'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {(!aiInsightsData.menuOptimizations || aiInsightsData.menuOptimizations.length === 0) &&
                   (!aiInsightsData.automatedInsights || aiInsightsData.automatedInsights.length === 0) &&
                   (!aiInsightsData.demandForecasts || aiInsightsData.demandForecasts.length === 0) &&
                   (!aiInsightsData.ingredientForecasts || aiInsightsData.ingredientForecasts.length === 0) && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
                      <FaLightbulb className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500 dark:text-gray-400">No AI insights available at this time.</p>
                      <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                        AI insights require sales data and menu item information to generate recommendations.
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
                  <FaLightbulb className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">No AI insights data available</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'food-cost' && (
            <div className="space-y-6">
              {/* Filters */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Section:
                    </label>
                    <select
                      value={selectedSection}
                      onChange={(e) => setSelectedSection(e.target.value)}
                      className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">All Sections</option>
                      {foodCostData?.sections.map((section) => (
                        <option key={section.id} value={section.id}>
                          {section.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <input
                      type="checkbox"
                      checked={includeInactive}
                      onChange={(e) => setIncludeInactive(e.target.checked)}
                      className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                    />
                    Include inactive items
                  </label>
                  {foodCostData && (
                    <button
                      onClick={() => exportToCSV(foodCostData, 'food-cost-report')}
                      className="ml-auto flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      <FaDownload className="w-4 h-4" />
                      Export
                    </button>
                  )}
                </div>
              </div>

              {foodCostLoading ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <p className="mt-4 text-gray-500 dark:text-gray-400">Loading food cost data...</p>
                </div>
              ) : foodCostData ? (
                <>
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                      <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Items</div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {foodCostData.summary.totalItems}
                      </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                      <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Avg Food Cost</div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        ${foodCostData.summary.averageFoodCost.toFixed(2)}
                      </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                      <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Avg Food Cost %</div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {foodCostData.summary.averageFoodCostPercentage !== null
                          ? `${foodCostData.summary.averageFoodCostPercentage.toFixed(1)}%`
                          : 'N/A'}
                      </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                      <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Food Cost</div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        ${foodCostData.summary.totalFoodCost.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  {/* Status Breakdown */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Status Breakdown</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                        <div className="text-sm text-green-700 dark:text-green-300 mb-1">Good (&lt;30%)</div>
                        <div className="text-2xl font-bold text-green-900 dark:text-green-100">
                          {foodCostData.summary.byStatus.good}
                        </div>
                      </div>
                      <div className="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
                        <div className="text-sm text-yellow-700 dark:text-yellow-300 mb-1">Acceptable (30-35%)</div>
                        <div className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">
                          {foodCostData.summary.byStatus.acceptable}
                        </div>
                      </div>
                      <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                        <div className="text-sm text-red-700 dark:text-red-300 mb-1">High (&gt;35%)</div>
                        <div className="text-2xl font-bold text-red-900 dark:text-red-100">
                          {foodCostData.summary.byStatus.high}
                        </div>
                      </div>
                      <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600">
                        <div className="text-sm text-gray-700 dark:text-gray-300 mb-1">Unknown</div>
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">
                          {foodCostData.summary.byStatus.unknown}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Items Table */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                    <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Menu Items</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-900">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Item</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Section</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Price</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Food Cost</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Food Cost %</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Ingredients</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                          {foodCostData.items.map((item) => (
                            <tr key={item.id} className={!item.isAvailable ? 'opacity-60' : ''}>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900 dark:text-white">{item.name}</div>
                                {item.priceNotes && (
                                  <div className="text-xs text-gray-500 dark:text-gray-400">{item.priceNotes}</div>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                {item.section.name}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white">
                                {item.menuPrice !== null ? `$${item.menuPrice.toFixed(2)}` : item.price || 'N/A'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white">
                                ${item.foodCost.toFixed(2)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                                {item.foodCostPercentage !== null ? (
                                  <span
                                    className={`font-semibold ${
                                      item.status === 'good'
                                        ? 'text-green-600 dark:text-green-400'
                                        : item.status === 'acceptable'
                                        ? 'text-yellow-600 dark:text-yellow-400'
                                        : item.status === 'high'
                                        ? 'text-red-600 dark:text-red-400'
                                        : 'text-gray-600 dark:text-gray-400'
                                    }`}
                                  >
                                    {item.foodCostPercentage.toFixed(1)}%
                                  </span>
                                ) : (
                                  <span className="text-gray-500 dark:text-gray-400">N/A</span>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                {item.status !== 'unknown' && (
                                  <span
                                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded ${
                                      item.status === 'good'
                                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                                        : item.status === 'acceptable'
                                        ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                                        : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                                    }`}
                                  >
                                    {item.status === 'good' ? 'Good' : item.status === 'acceptable' ? 'Acceptable' : 'High'}
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500 dark:text-gray-400">
                                {item.ingredientCount}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              ) : (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
                  <FaDollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">No food cost data available</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'menu' && (
            <div className="space-y-6">
              {salesLoading ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <p className="mt-4 text-gray-500 dark:text-gray-400">Loading sales analytics...</p>
                </div>
              ) : salesData ? (
                <>
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                      <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Revenue</div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        ${salesData.summary.totalRevenue.toFixed(2)}
                      </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                      <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Orders</div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {salesData.summary.totalOrders.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {salesData.summary.onlineOrders} online, {salesData.summary.posSales} POS
                      </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                      <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Items Sold</div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {salesData.summary.totalQuantity.toLocaleString()}
                      </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                      <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Unique Items</div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {salesData.summary.uniqueItems}
                      </div>
                    </div>
                  </div>

                  {/* Top Items */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Top Selling Items</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-900">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Item</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Section</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Quantity</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Revenue</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Orders</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                          {salesData.topItems.map((item: any, index: number) => (
                            <tr key={item.menuItemId || item.name}>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400 w-6">
                                    #{index + 1}
                                  </span>
                                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                                    {item.name}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                {item.section}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white">
                                {item.quantity.toLocaleString()}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white font-semibold">
                                ${item.revenue.toFixed(2)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500 dark:text-gray-400">
                                <div className="flex items-center justify-center gap-2">
                                  <span>{item.orderCount}</span>
                                  <div className="flex gap-1">
                                    {item.onlineCount > 0 && (
                                      <span className="text-xs px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
                                        {item.onlineCount}O
                                      </span>
                                    )}
                                    {item.posCount > 0 && (
                                      <span className="text-xs px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded">
                                        {item.posCount}P
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Slow Movers */}
                  {salesData.slowMovers && salesData.slowMovers.length > 0 && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Slow Movers</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50 dark:bg-gray-900">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Item</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Section</th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Quantity</th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Revenue</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {salesData.slowMovers.map((item: any) => (
                              <tr key={item.menuItemId || item.name}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                  {item.name}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                  {item.section}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white">
                                  {item.quantity}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white">
                                  ${item.revenue.toFixed(2)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Sales by Hour */}
                  {salesData.salesByHour && salesData.salesByHour.length > 0 && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Sales by Hour of Day</h3>
                      <div className="space-y-2">
                        {salesData.salesByHour.map((hourData: any) => (
                          <div key={hourData.hour} className="flex items-center gap-4">
                            <div className="w-16 text-sm text-gray-600 dark:text-gray-400">
                              {hourData.hour}:00
                            </div>
                            <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-6 relative overflow-hidden">
                              <div
                                className="bg-blue-600 dark:bg-blue-500 h-full rounded-full flex items-center justify-end pr-2"
                                style={{
                                  width: `${(hourData.revenue / salesData.summary.totalRevenue) * 100}%`,
                                }}
                              >
                                {hourData.revenue > salesData.summary.totalRevenue * 0.05 && (
                                  <span className="text-xs text-white font-medium">
                                    ${hourData.revenue.toFixed(0)}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="w-20 text-sm text-right text-gray-900 dark:text-white font-medium">
                              ${hourData.revenue.toFixed(2)}
                            </div>
                            <div className="w-16 text-xs text-gray-500 dark:text-gray-400 text-right">
                              {hourData.count} orders
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Sales by Day of Week */}
                  {salesData.salesByDay && salesData.salesByDay.length > 0 && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Sales by Day of Week</h3>
                      <div className="grid grid-cols-7 gap-2">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => {
                          const dayData = salesData.salesByDay.find((d: any) => d.day === index);
                          return (
                            <div key={day} className="text-center">
                              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{day}</div>
                              <div className="text-lg font-bold text-gray-900 dark:text-white">
                                ${dayData ? dayData.revenue.toFixed(0) : '0'}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {dayData ? dayData.count : 0} orders
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
                  <FaUtensils className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">No sales data available</p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                    Connect a POS system or process online orders to see sales analytics
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'labor-cost' && (
            <div className="space-y-6">
              {laborCostLoading ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <p className="mt-4 text-gray-500 dark:text-gray-400">Loading labor cost data...</p>
                </div>
              ) : laborCostData ? (
                <>
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                      <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Labor Cost</div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        ${laborCostData.summary.totalLaborCost.toFixed(2)}
                      </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                      <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Hours</div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {laborCostData.summary.totalHours.toFixed(1)}
                      </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                      <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Labor Cost %</div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {laborCostData.summary.laborCostPercentage !== null
                          ? `${laborCostData.summary.laborCostPercentage.toFixed(1)}%`
                          : 'N/A'}
                      </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                      <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Avg Hourly Wage</div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        ${laborCostData.summary.averageHourlyWage.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  {/* By Employee */}
                  {laborCostData.byEmployee && laborCostData.byEmployee.length > 0 && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Labor Cost by Employee</h3>
                        <button
                          onClick={() => exportToCSV(laborCostData.byEmployee, 'labor-cost-by-employee')}
                          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition"
                        >
                          <FaDownload className="w-4 h-4" />
                          Export
                        </button>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50 dark:bg-gray-900">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Employee</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Role</th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Shifts</th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Hours</th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Labor Cost</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {laborCostData.byEmployee.map((emp: any) => (
                              <tr key={emp.employeeId}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                  {emp.employeeName}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 capitalize">
                                  {emp.role}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white">
                                  {emp.shifts}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white">
                                  {emp.hours.toFixed(1)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-gray-900 dark:text-white">
                                  ${emp.cost.toFixed(2)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* By Role */}
                  {laborCostData.byRole && laborCostData.byRole.length > 0 && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Labor Cost by Role</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {laborCostData.byRole.map((role: any) => (
                          <div key={role.role} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                            <div className="text-sm text-gray-500 dark:text-gray-400 mb-1 capitalize">{role.role}</div>
                            <div className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                              ${role.cost.toFixed(2)}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {role.employees} employees • {role.shifts} shifts • {role.hours.toFixed(1)} hours
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* By Menu Item */}
                  {laborCostData.byMenuItem && laborCostData.byMenuItem.length > 0 && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Labor Cost by Menu Item</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50 dark:bg-gray-900">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Item</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Section</th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Prep Time</th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Labor Cost</th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Labor Cost %</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {laborCostData.byMenuItem.slice(0, 20).map((item: any) => (
                              <tr key={item.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                  {item.name}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                  {item.section}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white">
                                  {item.prepTimeMin} min
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white">
                                  ${item.laborCost.toFixed(2)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                                  {item.laborCostPercentage !== null ? (
                                    <span className={`font-semibold ${
                                      item.laborCostPercentage < 25
                                        ? 'text-green-600 dark:text-green-400'
                                        : item.laborCostPercentage <= 30
                                        ? 'text-yellow-600 dark:text-yellow-400'
                                        : 'text-red-600 dark:text-red-400'
                                    }`}>
                                      {item.laborCostPercentage.toFixed(1)}%
                                    </span>
                                  ) : (
                                    <span className="text-gray-500 dark:text-gray-400">N/A</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Daily Trends */}
                  {laborCostData.trends && laborCostData.trends.daily && laborCostData.trends.daily.length > 0 && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Daily Labor Cost Trends</h3>
                      <div className="space-y-2">
                        {laborCostData.trends.daily.map((day: any) => (
                          <div key={day.date} className="flex items-center gap-4">
                            <div className="w-24 text-sm text-gray-600 dark:text-gray-400">
                              {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </div>
                            <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-6 relative overflow-hidden">
                              <div
                                className="bg-blue-600 dark:bg-blue-500 h-full rounded-full flex items-center justify-end pr-2"
                                style={{
                                  width: `${(day.cost / laborCostData.summary.totalLaborCost) * 100}%`,
                                }}
                              >
                                {day.cost > laborCostData.summary.totalLaborCost * 0.05 && (
                                  <span className="text-xs text-white font-medium">
                                    ${day.cost.toFixed(0)}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="w-20 text-sm text-right text-gray-900 dark:text-white font-medium">
                              ${day.cost.toFixed(2)}
                            </div>
                            <div className="w-24 text-xs text-gray-500 dark:text-gray-400 text-right">
                              {day.hours.toFixed(1)} hrs
                            </div>
                            {day.laborCostPercentage !== null && (
                              <div className="w-20 text-xs text-gray-500 dark:text-gray-400 text-right">
                                {day.laborCostPercentage.toFixed(1)}%
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
                  <FaClock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">No labor cost data available</p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                    Track employee shifts and clock in/out times to see labor cost analytics
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'profitability' && (
            <div className="space-y-6">
              {profitabilityLoading ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <p className="mt-4 text-gray-500 dark:text-gray-400">Loading profitability data...</p>
                </div>
              ) : profitabilityData ? (
                <>
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                      <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Revenue</div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        ${profitabilityData.summary.totalRevenue.toFixed(2)}
                      </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                      <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Profit Margin</div>
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                        ${profitabilityData.summary.totalProfitMargin.toFixed(2)}
                      </div>
                      {profitabilityData.summary.totalProfitMarginPercentage !== null && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {profitabilityData.summary.totalProfitMarginPercentage.toFixed(1)}% margin
                        </div>
                      )}
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                      <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total COGS</div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        ${profitabilityData.summary.totalCOGS.toFixed(2)}
                      </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                      <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Prime Cost</div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        ${profitabilityData.summary.totalPrimeCost.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  {/* Cost Percentages */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                      <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Food Cost % vs Sales</div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {profitabilityData.summary.foodCostPercentage !== null
                          ? `${profitabilityData.summary.foodCostPercentage.toFixed(1)}%`
                          : 'N/A'}
                      </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                      <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Labor Cost % vs Sales</div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {profitabilityData.summary.laborCostPercentage !== null
                          ? `${profitabilityData.summary.laborCostPercentage.toFixed(1)}%`
                          : 'N/A'}
                      </div>
                    </div>
                  </div>

                  {/* Status Breakdown */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Profitability Status Breakdown</h3>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                      <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                        <div className="text-sm text-green-700 dark:text-green-300 mb-1">Excellent (&gt;30%)</div>
                        <div className="text-2xl font-bold text-green-900 dark:text-green-100">
                          {profitabilityData.summary.byStatus.excellent}
                        </div>
                      </div>
                      <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                        <div className="text-sm text-blue-700 dark:text-blue-300 mb-1">Good (20-30%)</div>
                        <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                          {profitabilityData.summary.byStatus.good}
                        </div>
                      </div>
                      <div className="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
                        <div className="text-sm text-yellow-700 dark:text-yellow-300 mb-1">Acceptable (10-20%)</div>
                        <div className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">
                          {profitabilityData.summary.byStatus.acceptable}
                        </div>
                      </div>
                      <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                        <div className="text-sm text-red-700 dark:text-red-300 mb-1">Poor (&lt;10%)</div>
                        <div className="text-2xl font-bold text-red-900 dark:text-red-100">
                          {profitabilityData.summary.byStatus.poor}
                        </div>
                      </div>
                      <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600">
                        <div className="text-sm text-gray-700 dark:text-gray-300 mb-1">Unknown</div>
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">
                          {profitabilityData.summary.byStatus.unknown}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* High Volume, Low Margin Items */}
                  {profitabilityData.highVolumeLowMargin && profitabilityData.highVolumeLowMargin.length > 0 && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                      <div className="flex justify-between items-center mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">High Volume, Low Margin Items</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Items with high sales volume but low profit margins - consider price adjustments
                          </p>
                        </div>
                        <button
                          onClick={() => exportToCSV(profitabilityData.highVolumeLowMargin, 'high-volume-low-margin')}
                          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition"
                        >
                          <FaDownload className="w-4 h-4" />
                          Export
                        </button>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50 dark:bg-gray-900">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Item</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Section</th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Quantity</th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Revenue</th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Prime Cost</th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Profit Margin</th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Margin %</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {profitabilityData.highVolumeLowMargin.map((item: any) => (
                              <tr key={item.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                  {item.name}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                  {item.section.name}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white">
                                  {item.quantity}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white">
                                  ${item.revenue.toFixed(2)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white">
                                  ${(item.unitPrimeCost * item.quantity).toFixed(2)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white">
                                  ${item.profitMargin.toFixed(2)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                                  <span className="font-semibold text-red-600 dark:text-red-400">
                                    {item.unitProfitMarginPercentage !== null
                                      ? `${item.unitProfitMarginPercentage.toFixed(1)}%`
                                      : 'N/A'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Low Volume, High Margin Items */}
                  {profitabilityData.lowVolumeHighMargin && profitabilityData.lowVolumeHighMargin.length > 0 && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                      <div className="flex justify-between items-center mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Low Volume, High Margin Items</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Items with low sales volume but high profit margins - consider promoting these items
                          </p>
                        </div>
                        <button
                          onClick={() => exportToCSV(profitabilityData.lowVolumeHighMargin, 'low-volume-high-margin')}
                          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition"
                        >
                          <FaDownload className="w-4 h-4" />
                          Export
                        </button>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50 dark:bg-gray-900">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Item</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Section</th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Quantity</th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Revenue</th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Prime Cost</th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Profit Margin</th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Margin %</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {profitabilityData.lowVolumeHighMargin.map((item: any) => (
                              <tr key={item.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                  {item.name}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                  {item.section.name}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white">
                                  {item.quantity}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white">
                                  ${item.revenue.toFixed(2)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white">
                                  ${(item.unitPrimeCost * item.quantity).toFixed(2)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white">
                                  ${item.profitMargin.toFixed(2)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                                  <span className="font-semibold text-green-600 dark:text-green-400">
                                    {item.unitProfitMarginPercentage !== null
                                      ? `${item.unitProfitMarginPercentage.toFixed(1)}%`
                                      : 'N/A'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Top Items by Profit Margin */}
                  {profitabilityData.sortedByProfitMargin && profitabilityData.sortedByProfitMargin.length > 0 && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Top Items by Profit Margin</h3>
                        <button
                          onClick={() => exportToCSV(profitabilityData.sortedByProfitMargin, 'top-profit-margin')}
                          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition"
                        >
                          <FaDownload className="w-4 h-4" />
                          Export
                        </button>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50 dark:bg-gray-900">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Item</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Section</th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Price</th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Food Cost</th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Labor Cost</th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Prime Cost</th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Profit Margin</th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Margin %</th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Contribution Margin</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {profitabilityData.sortedByProfitMargin.slice(0, 30).map((item: any, index: number) => (
                              <tr key={item.id}>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400 w-6">
                                      #{index + 1}
                                    </span>
                                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                                      {item.name}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                  {item.section.name}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white">
                                  {item.menuPrice !== null ? `$${item.menuPrice.toFixed(2)}` : item.price || 'N/A'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white">
                                  ${item.unitFoodCost.toFixed(2)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white">
                                  ${item.unitLaborCost.toFixed(2)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white">
                                  ${item.unitPrimeCost.toFixed(2)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white font-semibold">
                                  ${item.unitProfitMargin.toFixed(2)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                                  <span
                                    className={`font-semibold ${
                                      item.unitProfitMarginPercentage !== null
                                        ? item.unitProfitMarginPercentage > 30
                                          ? 'text-green-600 dark:text-green-400'
                                          : item.unitProfitMarginPercentage >= 20
                                          ? 'text-blue-600 dark:text-blue-400'
                                          : item.unitProfitMarginPercentage >= 10
                                          ? 'text-yellow-600 dark:text-yellow-400'
                                          : 'text-red-600 dark:text-red-400'
                                        : 'text-gray-500 dark:text-gray-400'
                                    }`}
                                  >
                                    {item.unitProfitMarginPercentage !== null
                                      ? `${item.unitProfitMarginPercentage.toFixed(1)}%`
                                      : 'N/A'}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white">
                                  ${item.unitContributionMargin.toFixed(2)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
                  <FaDollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">No profitability data available</p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                    Connect a POS system or process online orders to see profitability analytics
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'specials' && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <p className="text-gray-500 dark:text-gray-400">
                Specials performance tracking coming soon. 
                This will include sales data, profitability metrics, and optimization recommendations.
              </p>
            </div>
          )}

          {activeTab === 'menu-optimization' && (
            <div className="space-y-6">
              {menuOptimizationLoading ? (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                  <p className="mt-4 text-gray-500 dark:text-gray-400">Loading menu optimization data...</p>
                </div>
              ) : menuOptimizationData ? (
                <>
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                      <div className="text-sm text-gray-500 dark:text-gray-400">Total Ingredients</div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                        {menuOptimizationData.summary.totalIngredients}
                      </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                      <div className="text-sm text-gray-500 dark:text-gray-400">High Priority Overlaps</div>
                      <div className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
                        {menuOptimizationData.summary.highPriorityOverlaps}
                      </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                      <div className="text-sm text-gray-500 dark:text-gray-400">Low Stock Items</div>
                      <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400 mt-1">
                        {menuOptimizationData.summary.lowStockItems}
                      </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                      <div className="text-sm text-gray-500 dark:text-gray-400">Overstocked Items</div>
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                        {menuOptimizationData.summary.overstockedItems}
                      </div>
                    </div>
                  </div>

                  {/* Redundant Prep Items */}
                  {menuOptimizationData.redundantPrepItems && menuOptimizationData.redundantPrepItems.length > 0 && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        Redundant Prep Items
                      </h3>
                      <div className="space-y-4">
                        {menuOptimizationData.redundantPrepItems.map((item: any, index: number) => (
                          <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <h4 className="font-semibold text-gray-900 dark:text-white">{item.title}</h4>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{item.description}</p>
                              </div>
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                item.priority === 'high' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                                item.priority === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                                'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                              }`}>
                                {item.priority.toUpperCase()}
                              </span>
                            </div>
                            <div className="mt-3">
                              <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Ingredients:</div>
                              <div className="flex flex-wrap gap-2">
                                {item.ingredients.map((ing: any, idx: number) => (
                                  <span key={idx} className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm">
                                    {ing.name} ({ing.usedIn} items)
                                  </span>
                                ))}
                              </div>
                            </div>
                            <div className="mt-3 text-sm">
                              <span className="font-semibold text-gray-900 dark:text-white">Action: </span>
                              <span className="text-gray-600 dark:text-gray-400">{item.action}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Ingredient Overlaps */}
                  {menuOptimizationData.ingredientOverlaps && menuOptimizationData.ingredientOverlaps.length > 0 && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          Ingredient Overlaps
                        </h3>
                        <button
                          onClick={() => exportToCSV(menuOptimizationData.ingredientOverlaps, 'ingredient-overlaps')}
                          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition"
                        >
                          <FaDownload className="w-4 h-4" />
                          Export
                        </button>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50 dark:bg-gray-900">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Ingredient 1</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Ingredient 2</th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Similarity</th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Shared Items</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Opportunity</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {menuOptimizationData.ingredientOverlaps.map((overlap: any, index: number) => (
                              <tr key={index}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                  {overlap.ingredient1.name}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                  {overlap.ingredient2.name}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white">
                                  {(overlap.similarity * 100).toFixed(1)}%
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white">
                                  {overlap.sharedMenuItems}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                                    overlap.consolidationOpportunity === 'high' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                                    overlap.consolidationOpportunity === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                                    'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                  }`}>
                                    {overlap.consolidationOpportunity.toUpperCase()}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Inventory Optimization */}
                  {menuOptimizationData.inventoryOptimization && menuOptimizationData.inventoryOptimization.length > 0 && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          Inventory Optimization
                        </h3>
                        <button
                          onClick={() => exportToCSV(menuOptimizationData.inventoryOptimization, 'inventory-optimization')}
                          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition"
                        >
                          <FaDownload className="w-4 h-4" />
                          Export
                        </button>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50 dark:bg-gray-900">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Ingredient</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Category</th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Current Stock</th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Par Level</th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Usage/Day</th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Days Until Depletion</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {menuOptimizationData.inventoryOptimization.map((item: any, index: number) => (
                              <tr key={index}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                  {item.ingredientName}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                  {item.category}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white">
                                  {item.currentStock !== null ? item.currentStock.toFixed(2) : 'N/A'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white">
                                  {item.parLevel !== null ? item.parLevel.toFixed(2) : 'N/A'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white">
                                  {item.usageRate.toFixed(2)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white">
                                  {item.daysUntilDepletion !== null ? item.daysUntilDepletion.toFixed(1) : 'N/A'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                                    item.status === 'low_stock' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                                    item.status === 'overstocked' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                                    item.status === 'no_data' ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200' :
                                    'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                  }`}>
                                    {item.status.replace('_', ' ').toUpperCase()}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
                  <FaCog className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">No menu optimization data available</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'specials-optimization' && (
            <div className="space-y-6">
              {specialsOptimizationLoading ? (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                  <p className="mt-4 text-gray-500 dark:text-gray-400">Loading specials optimization data...</p>
                </div>
              ) : specialsOptimizationData ? (
                <>
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                      <div className="text-sm text-gray-500 dark:text-gray-400">Total Specials</div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                        {specialsOptimizationData.summary.totalSpecials}
                      </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                      <div className="text-sm text-gray-500 dark:text-gray-400">Total Revenue</div>
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                        ${specialsOptimizationData.summary.totalRevenue.toFixed(2)}
                      </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                      <div className="text-sm text-gray-500 dark:text-gray-400">Total Profit</div>
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                        ${specialsOptimizationData.summary.totalProfit.toFixed(2)}
                      </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                      <div className="text-sm text-gray-500 dark:text-gray-400">Avg Profit Margin</div>
                      <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">
                        {specialsOptimizationData.summary.averageProfitMargin.toFixed(1)}%
                      </div>
                    </div>
                  </div>

                  {/* Suggestions */}
                  {specialsOptimizationData.suggestions && specialsOptimizationData.suggestions.length > 0 && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        Optimization Suggestions
                      </h3>
                      <div className="space-y-4">
                        {specialsOptimizationData.suggestions.map((suggestion: any, index: number) => (
                          <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <h4 className="font-semibold text-gray-900 dark:text-white">{suggestion.title}</h4>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{suggestion.description}</p>
                              </div>
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                suggestion.priority === 'high' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                                suggestion.priority === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                                'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                              }`}>
                                {suggestion.priority.toUpperCase()}
                              </span>
                            </div>
                            {suggestion.suggestedChange && (
                              <div className="mt-3 text-sm">
                                <span className="font-semibold text-gray-900 dark:text-white">Suggested: </span>
                                <span className="text-gray-600 dark:text-gray-400">{suggestion.suggestedChange}</span>
                              </div>
                            )}
                            {suggestion.expectedImpact && (
                              <div className="mt-2 text-sm">
                                <span className="font-semibold text-gray-900 dark:text-white">Expected Impact: </span>
                                <span className="text-gray-600 dark:text-gray-400">{suggestion.expectedImpact}</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Special Performance */}
                  {specialsOptimizationData.specialPerformances && specialsOptimizationData.specialPerformances.length > 0 && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          Drink Special Performance
                        </h3>
                        <button
                          onClick={() => exportToCSV(specialsOptimizationData.specialPerformances, 'specials-performance')}
                          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition"
                        >
                          <FaDownload className="w-4 h-4" />
                          Export
                        </button>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50 dark:bg-gray-900">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Special</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Days</th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Revenue</th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Orders</th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Profit</th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Margin %</th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Score</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {specialsOptimizationData.specialPerformances.map((perf: any, index: number) => (
                              <tr key={perf.specialId}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                  {perf.title}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                  {perf.appliesOn ? perf.appliesOn.join(', ') : 'All days'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white">
                                  ${perf.totalRevenue.toFixed(2)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white">
                                  {perf.totalOrders}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600 dark:text-green-400 font-semibold">
                                  ${perf.netProfit.toFixed(2)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white">
                                  {perf.profitMargin.toFixed(1)}%
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                                  <span className={`font-semibold ${
                                    perf.performanceScore >= 70 ? 'text-green-600 dark:text-green-400' :
                                    perf.performanceScore >= 40 ? 'text-yellow-600 dark:text-yellow-400' :
                                    'text-red-600 dark:text-red-400'
                                  }`}>
                                    {perf.performanceScore}/100
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
                  <FaWineGlass className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">No specials optimization data available</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'schedule-optimization' && (
            <div className="space-y-6">
              {scheduleOptimizationLoading ? (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                  <p className="mt-4 text-gray-500 dark:text-gray-400">Loading schedule optimization data...</p>
                </div>
              ) : scheduleOptimizationData ? (
                <>
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                      <div className="text-sm text-gray-500 dark:text-gray-400">Very Busy Hours</div>
                      <div className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
                        {scheduleOptimizationData.summary.veryBusyHours}
                      </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                      <div className="text-sm text-gray-500 dark:text-gray-400">Busy Hours</div>
                      <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400 mt-1">
                        {scheduleOptimizationData.summary.busyHours}
                      </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                      <div className="text-sm text-gray-500 dark:text-gray-400">Suggestions</div>
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                        {scheduleOptimizationData.summary.suggestionsCount}
                      </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                      <div className="text-sm text-gray-500 dark:text-gray-400">High Priority</div>
                      <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">
                        {scheduleOptimizationData.summary.highPrioritySuggestions}
                      </div>
                    </div>
                  </div>

                  {/* Peak Hours */}
                  {scheduleOptimizationData.summary.peakHours && scheduleOptimizationData.summary.peakHours.length > 0 && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        Peak Hours
                      </h3>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50 dark:bg-gray-900">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Day</th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Hour</th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Orders/Hour</th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Revenue</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {scheduleOptimizationData.summary.peakHours.map((hour: any, index: number) => (
                              <tr key={index}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                  {hour.day}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white">
                                  {hour.hour}:00
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white">
                                  {hour.orderCount.toFixed(1)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white">
                                  ${hour.revenue.toFixed(2)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Optimization Suggestions */}
                  {scheduleOptimizationData.suggestions && scheduleOptimizationData.suggestions.length > 0 && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        Staffing Optimization Suggestions
                      </h3>
                      <div className="space-y-4">
                        {scheduleOptimizationData.suggestions.map((suggestion: any, index: number) => (
                          <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <h4 className="font-semibold text-gray-900 dark:text-white">{suggestion.title}</h4>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{suggestion.description}</p>
                              </div>
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                suggestion.priority === 'high' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                                suggestion.priority === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                                'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                              }`}>
                                {suggestion.priority.toUpperCase()}
                              </span>
                            </div>
                            {suggestion.currentStaffing && (
                              <div className="mt-3 grid grid-cols-2 gap-4">
                                <div>
                                  <div className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Current Staffing</div>
                                  <div className="text-sm text-gray-600 dark:text-gray-400">
                                    Cooks: {suggestion.currentStaffing.cooks}, Bartenders: {suggestion.currentStaffing.bartenders}, Barbacks: {suggestion.currentStaffing.barbacks}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Recommended Staffing</div>
                                  <div className="text-sm text-gray-600 dark:text-gray-400">
                                    Cooks: {suggestion.recommendedStaffing.cooks}, Bartenders: {suggestion.recommendedStaffing.bartenders}, Barbacks: {suggestion.recommendedStaffing.barbacks}
                                  </div>
                                </div>
                              </div>
                            )}
                            <div className="mt-3 text-sm">
                              <span className="font-semibold text-gray-900 dark:text-white">Expected Impact: </span>
                              <span className="text-gray-600 dark:text-gray-400">{suggestion.expectedImpact}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
                  <FaUserClock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">No schedule optimization data available</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

