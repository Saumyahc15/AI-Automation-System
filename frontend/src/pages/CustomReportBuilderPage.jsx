import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Save,
  Download,
  Mail,
  Eye,
  Grid3X3,
  Calendar,
  Filter,
  Settings as SettingsIcon,
  CheckCircle,
  AlertCircle,
  Plus,
  Trash2,
} from 'lucide-react';
import Sidebar from '../components/Sidebar';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { reportsAPI } from '../services/api';

const CustomReportBuilderPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('type'); // type, metrics, filters, export, preview

  // Form state
  const [reportName, setReportName] = useState('');
  const [reportType, setReportType] = useState('sales');
  const [selectedMetrics, setSelectedMetrics] = useState([]);
  const [dateRange, setDateRange] = useState({
    startDate: '2026-04-01',
    endDate: '2026-04-23',
  });
  const [filters, setFilters] = useState({
    category: 'all',
    status: 'all',
    minValue: '',
    maxValue: '',
  });
  const [exportFormat, setExportFormat] = useState('pdf');
  const [schedule, setSchedule] = useState({
    enabled: false,
    frequency: 'weekly',
    email: user?.email || '',
  });
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);

  // Available metrics by report type
  const metricsByType = {
    sales: [
      { id: 'total_revenue', label: 'Total Revenue', icon: '💰' },
      { id: 'order_count', label: 'Total Orders', icon: '🛍️' },
      { id: 'avg_order_value', label: 'Average Order Value', icon: '📊' },
      { id: 'top_products', label: 'Top Products', icon: '⭐' },
      { id: 'repeat_customers', label: 'Repeat Customers', icon: '👥' },
      { id: 'customer_ltv', label: 'Customer Lifetime Value', icon: '💎' },
    ],
    inventory: [
      { id: 'stock_levels', label: 'Stock Levels', icon: '📦' },
      { id: 'critical_items', label: 'Critical Items', icon: '🔴' },
      { id: 'low_stock', label: 'Low Stock Count', icon: '🟡' },
      { id: 'overstock', label: 'Overstock Items', icon: '🟠' },
      { id: 'inventory_value', label: 'Total Inventory Value', icon: '💵' },
      { id: 'stockout_forecast', label: '14-Day Stockout Forecast', icon: '📉' },
      { id: 'turnover_rate', label: 'Inventory Turnover Rate', icon: '🔄' },
    ],
    customers: [
      { id: 'new_customers', label: 'New Customers', icon: '✨' },
      { id: 'active_customers', label: 'Active Customers', icon: '👤' },
      { id: 'churn_rate', label: 'Churn Rate', icon: '📉' },
      { id: 'at_risk', label: 'At-Risk Customers', icon: '⚠️' },
      { id: 'ltv_distribution', label: 'LTV Distribution', icon: '📊' },
      { id: 'retention_rate', label: 'Retention Rate', icon: '📈' },
    ],
    performance: [
      { id: 'revenue_trend', label: 'Revenue Trend', icon: '📈' },
      { id: 'growth_rate', label: 'Growth Rate (%)', icon: '🚀' },
    ],
  };

  const reportTypes = [
    { value: 'sales', label: '📈 Sales Report', description: 'Revenue, orders, customer metrics' },
    { value: 'inventory', label: '📦 Inventory Report', description: 'Stock levels, forecasts, alerts' },
    { value: 'customers', label: '👥 Customer Report', description: 'Customer segments, churn, LTV' },
    { value: 'performance', label: '🎯 Performance Report', description: 'Revenue trends, growth, ROI' },
  ];

  // Toggle metric selection
  const toggleMetric = (metricId) => {
    setSelectedMetrics((prev) =>
      prev.includes(metricId) ? prev.filter((id) => id !== metricId) : [...prev, metricId]
    );
  };

  // Get current metric options
  const currentMetrics = metricsByType[reportType] || [];

  // Generate preview data
  const generatePreviewData = () => {
    const previewMetrics = selectedMetrics
      .slice(0, 3)
      .map((id) => currentMetrics.find((m) => m.id === id));

    return previewMetrics.filter(Boolean);
  };

  const previewData = generatePreviewData();

  const [saving, setSaving] = useState(false);
  const [customResult, setCustomResult] = useState(null);

  // Handle save report — calls real backend
  const handleSaveReport = async () => {
    if (!reportName.trim()) {
      alert('Please enter a report name');
      return;
    }
    if (selectedMetrics.length === 0) {
      alert('Please select at least one metric');
      return;
    }
    try {
      setSaving(true);
      const reportConfig = {
        name: reportName,
        type: reportType,
        metrics: selectedMetrics,
        dateRange,
        filters,
        export: exportFormat,
        schedule,
        savedAsTemplate: saveAsTemplate,
      };
      const res = await reportsAPI.generateCustom(reportConfig);
      setCustomResult(res.data);
      alert('✅ Report generated from live data!');
      navigate('/reports');
    } catch (err) {
      alert('Failed: ' + (err.response?.data?.detail || err.message));
    } finally {
      setSaving(false);
    }
  };

  // Handle export — generate real report
  const handleExport = async () => {
    try {
      setSaving(true);
      await reportsAPI.generateNow(reportType);
      alert(`📤 ${exportFormat.toUpperCase()} report generated and emailed!`);
    } catch (err) {
      alert('Export failed: ' + (err.response?.data?.detail || err.message));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />

      <div className="flex-1 overflow-auto">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => navigate('/reports')}
                  className="p-2 hover:bg-gray-100 rounded-lg transition"
                >
                  <ArrowLeft className="w-6 h-6 text-gray-600" />
                </button>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Custom Report Builder</h1>
                  <p className="text-gray-600 text-sm mt-1">Create powerful, customized reports</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleExport}
                  disabled={selectedMetrics.length === 0}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2 disabled:bg-gray-400"
                >
                  <Download size={18} />
                  Export
                </button>
                <button
                  onClick={handleSaveReport}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
                >
                  <Save size={18} />
                  Save Report
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-8 py-8">
          {/* Report Name */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Report Name</label>
            <input
              type="text"
              value={reportName}
              onChange={(e) => setReportName(e.target.value)}
              placeholder="e.g., April Sales Performance"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6 border-b border-gray-200 bg-white rounded-t-lg">
            {[
              { id: 'type', label: '📊 Report Type', icon: Grid3X3 },
              { id: 'metrics', label: '✓ Metrics', icon: CheckCircle },
              { id: 'filters', label: '🔍 Filters', icon: Filter },
              { id: 'export', label: '📤 Export', icon: Download },
              { id: 'preview', label: '👁️ Preview', icon: Eye },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-3 font-medium transition border-b-2 ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="bg-white rounded-b-lg border border-gray-200 border-t-0 p-6">
            {/* Type Tab */}
            {activeTab === 'type' && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-900 mb-6">Select Report Type</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {reportTypes.map((type) => (
                    <button
                      key={type.value}
                      onClick={() => {
                        setReportType(type.value);
                        setSelectedMetrics([]);
                      }}
                      className={`p-4 rounded-lg border-2 transition text-left ${
                        reportType === type.value
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-xl font-semibold text-gray-900">{type.label}</div>
                      <p className="text-sm text-gray-600 mt-1">{type.description}</p>
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setActiveTab('metrics')}
                  className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  Continue to Metrics →
                </button>
              </div>
            )}

            {/* Metrics Tab */}
            {activeTab === 'metrics' && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">Select Metrics</h2>
                <p className="text-gray-600 text-sm mb-6">
                  Choose which metrics to include in your {reportType} report
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  {currentMetrics.map((metric) => (
                    <label
                      key={metric.id}
                      className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition"
                    >
                      <input
                        type="checkbox"
                        checked={selectedMetrics.includes(metric.id)}
                        onChange={() => toggleMetric(metric.id)}
                        className="w-4 h-4 rounded"
                      />
                      <span className="text-lg">{metric.icon}</span>
                      <span className="text-sm font-medium text-gray-900">{metric.label}</span>
                    </label>
                  ))}
                </div>

                {selectedMetrics.length > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <p className="text-sm text-blue-900">
                      ✓ {selectedMetrics.length} metric{selectedMetrics.length !== 1 ? 's' : ''} selected
                    </p>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => setActiveTab('type')}
                    className="px-6 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 transition"
                  >
                    ← Back
                  </button>
                  <button
                    onClick={() => setActiveTab('filters')}
                    disabled={selectedMetrics.length === 0}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400"
                  >
                    Continue to Filters →
                  </button>
                </div>
              </div>
            )}

            {/* Filters Tab */}
            {activeTab === 'filters' && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">Set Filters & Date Range</h2>
                <p className="text-gray-600 text-sm mb-6">Refine your report data with filters</p>

                {/* Date Range */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                    <input
                      type="date"
                      value={dateRange.startDate}
                      onChange={(e) =>
                        setDateRange((prev) => ({ ...prev, startDate: e.target.value }))
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                    <input
                      type="date"
                      value={dateRange.endDate}
                      onChange={(e) =>
                        setDateRange((prev) => ({ ...prev, endDate: e.target.value }))
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Additional Filters */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                    <select
                      value={filters.category}
                      onChange={(e) => setFilters((prev) => ({ ...prev, category: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="all">All Categories</option>
                      <option value="electronics">Electronics</option>
                      <option value="accessories">Accessories</option>
                      <option value="furniture">Furniture</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                    <select
                      value={filters.status}
                      onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="all">All Status</option>
                      <option value="active">Active</option>
                      <option value="completed">Completed</option>
                      <option value="pending">Pending</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Min Value</label>
                    <input
                      type="number"
                      value={filters.minValue}
                      onChange={(e) => setFilters((prev) => ({ ...prev, minValue: e.target.value }))}
                      placeholder="0"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Max Value</label>
                    <input
                      type="number"
                      value={filters.maxValue}
                      onChange={(e) => setFilters((prev) => ({ ...prev, maxValue: e.target.value }))}
                      placeholder="No limit"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setActiveTab('metrics')}
                    className="px-6 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 transition"
                  >
                    ← Back
                  </button>
                  <button
                    onClick={() => setActiveTab('export')}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                  >
                    Continue to Export →
                  </button>
                </div>
              </div>
            )}

            {/* Export Tab */}
            {activeTab === 'export' && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">Export & Delivery</h2>
                <p className="text-gray-600 text-sm mb-6">Choose how to export and deliver your report</p>

                {/* Export Format */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">Export Format</label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {[
                      { value: 'pdf', label: '📄 PDF', description: 'Professional PDF format' },
                      { value: 'csv', label: '📊 CSV', description: 'Spreadsheet format' },
                      { value: 'excel', label: '📈 Excel', description: 'Excel workbook' },
                    ].map((format) => (
                      <button
                        key={format.value}
                        onClick={() => setExportFormat(format.value)}
                        className={`p-4 rounded-lg border-2 transition text-left ${
                          exportFormat === format.value
                            ? 'border-blue-600 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="font-semibold text-gray-900">{format.label}</div>
                        <p className="text-xs text-gray-600 mt-1">{format.description}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Schedule Delivery */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={schedule.enabled}
                      onChange={(e) =>
                        setSchedule((prev) => ({ ...prev, enabled: e.target.checked }))
                      }
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm font-medium text-gray-900">
                      📧 Schedule for automatic delivery
                    </span>
                  </label>
                </div>

                {schedule.enabled && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Frequency</label>
                      <select
                        value={schedule.frequency}
                        onChange={(e) =>
                          setSchedule((prev) => ({ ...prev, frequency: e.target.value }))
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                      <input
                        type="email"
                        value={schedule.email}
                        onChange={(e) => setSchedule((prev) => ({ ...prev, email: e.target.value }))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                )}

                {/* Save as Template */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={saveAsTemplate}
                      onChange={(e) => setSaveAsTemplate(e.target.checked)}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm font-medium text-gray-900">
                      💾 Save as template for future use
                    </span>
                  </label>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setActiveTab('filters')}
                    className="px-6 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 transition"
                  >
                    ← Back
                  </button>
                  <button
                    onClick={() => setActiveTab('preview')}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                  >
                    Preview →
                  </button>
                </div>
              </div>
            )}

            {/* Preview Tab */}
            {activeTab === 'preview' && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-900 mb-6">Report Preview</h2>

                {/* Summary */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-xs text-gray-600 uppercase font-semibold">Report Name</p>
                    <p className="text-lg font-semibold text-gray-900 mt-1">
                      {reportName || 'Untitled Report'}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-xs text-gray-600 uppercase font-semibold">Report Type</p>
                    <p className="text-lg font-semibold text-gray-900 mt-1 capitalize">{reportType}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-xs text-gray-600 uppercase font-semibold">Date Range</p>
                    <p className="text-lg font-semibold text-gray-900 mt-1">
                      {dateRange.startDate} to {dateRange.endDate}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-xs text-gray-600 uppercase font-semibold">Export As</p>
                    <p className="text-lg font-semibold text-gray-900 mt-1 uppercase">{exportFormat}</p>
                  </div>
                </div>

                {/* Selected Metrics Preview */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <h3 className="text-sm font-semibold text-blue-900 mb-3">📊 Metrics Preview</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {previewData.map((metric) => (
                      <div key={metric.id} className="bg-white rounded p-3 border border-blue-100">
                        <p className="text-2xl">{metric.icon}</p>
                        <p className="text-xs text-gray-600 mt-2">{metric.label}</p>
                      </div>
                    ))}
                    {previewData.length < 3 && (
                      <div className="col-span-full text-xs text-gray-600">
                        + {selectedMetrics.length - 3} more metric{selectedMetrics.length > 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                </div>

                {/* Applied Filters */}
                {(filters.category !== 'all' ||
                  filters.status !== 'all' ||
                  filters.minValue ||
                  filters.maxValue) && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                    <h3 className="text-sm font-semibold text-yellow-900 mb-3">🔍 Active Filters</h3>
                    <ul className="text-sm text-yellow-800 space-y-1">
                      {filters.category !== 'all' && <li>• Category: {filters.category}</li>}
                      {filters.status !== 'all' && <li>• Status: {filters.status}</li>}
                      {filters.minValue && <li>• Min Value: ₹{filters.minValue}</li>}
                      {filters.maxValue && <li>• Max Value: ₹{filters.maxValue}</li>}
                    </ul>
                  </div>
                )}

                {/* Schedule Info */}
                {schedule.enabled && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                    <h3 className="text-sm font-semibold text-green-900 mb-3">📅 Scheduled Delivery</h3>
                    <p className="text-sm text-green-800">
                      Will be delivered {schedule.frequency} to {schedule.email}
                    </p>
                  </div>
                )}

                {saveAsTemplate && (
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
                    <h3 className="text-sm font-semibold text-purple-900 mb-1">💾 Saved as Template</h3>
                    <p className="text-sm text-purple-800">
                      You can reuse this configuration for future reports
                    </p>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => setActiveTab('export')}
                    className="px-6 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 transition"
                  >
                    ← Back
                  </button>
                  <button
                    onClick={handleSaveReport}
                    className="flex-1 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center justify-center gap-2"
                  >
                    <CheckCircle size={18} />
                    Save & Complete Report
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomReportBuilderPage;
