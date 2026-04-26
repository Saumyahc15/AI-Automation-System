import React, { useState, useEffect } from 'react';
import { FileText, Mail, Download, Trash2, Plus, Clock, CheckCircle, AlertCircle, Eye, EyeOff, Wand2, RefreshCw, Loader, Play } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import { useNavigate } from 'react-router-dom';
import { reportsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const ReportsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [metrics, setMetrics] = useState({ total_reports: 0, scheduled: 0, sent_today: 0, failed: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [expandedReport, setExpandedReport] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [generating, setGenerating] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [showTemplates, setShowTemplates] = useState(false);

  useEffect(() => {
    fetchReportsData();
  }, []);

  const fetchReportsData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [reportsRes, metricsRes, templatesRes] = await Promise.allSettled([
        reportsAPI.getAll(),
        reportsAPI.getMetrics(),
        reportsAPI.getTemplates(),
      ]);

      if (reportsRes.status === 'fulfilled') {
        setReports(reportsRes.value.data || []);
      }
      if (metricsRes.status === 'fulfilled') {
        setMetrics(metricsRes.value.data || { total_reports: 0, scheduled: 0, sent_today: 0, failed: 0 });
      }
      if (templatesRes.status === 'fulfilled') {
        setTemplates(templatesRes.value.data || []);
      }
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateNow = async (reportType = 'sales') => {
    try {
      setGenerating(true);
      const res = await reportsAPI.generateNow(reportType);
      alert(`✅ Report generated and sent! Status: ${res.data?.status || 'success'}`);
      fetchReportsData();
    } catch (err) {
      alert('Failed to generate report: ' + (err.response?.data?.detail || err.message));
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateTemplate = async (tpl) => {
    if (!window.confirm(`Generate and email ${tpl.name} report?`)) return;
    try {
      setGenerating(true);
      await reportsAPI.generateCustom(tpl);
      alert(`✅ Template "${tpl.name}" successfully generated and sent to your email!`);
    } catch (err) {
      alert('Failed to generate template: ' + (err.response?.data?.detail || err.message));
    } finally {
      setGenerating(false);
    }
  };

  // Filter reports
  const filteredReports = reports.filter((r) => {
    if (filterStatus === 'all') return true;
    return r.status === filterStatus;
  });

  // Get status badge
  const getStatusBadge = (status) => {
    const statusConfig = {
      scheduled: { color: 'bg-blue-100 text-blue-800', label: '⏱️ Scheduled' },
      sent: { color: 'bg-green-100 text-green-800', label: '✓ Sent' },
      failed: { color: 'bg-red-100 text-red-800', label: '✗ Failed' },
    };
    return statusConfig[status] || statusConfig.scheduled;
  };

  // Get report type badge
  const getTypeColor = (type) => {
    const typeConfig = {
      sales: 'bg-purple-100 text-purple-800',
      inventory: 'bg-yellow-100 text-yellow-800',
      customers: 'bg-blue-100 text-blue-800',
      returns: 'bg-red-100 text-red-800',
      summary: 'bg-green-100 text-green-800',
      auto: 'bg-gray-100 text-gray-800',
    };
    return typeConfig[type] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader className="w-10 h-10 text-blue-600 animate-spin mx-auto" />
            <p className="mt-4 text-gray-600">Loading reports from backend...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />

      <div className="flex-1 overflow-auto">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
                <p className="text-gray-600 text-sm mt-1">Live report data from workflow executions</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={fetchReportsData}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition flex items-center gap-2"
                >
                  <RefreshCw size={18} />
                  Refresh
                </button>
                <button
                  onClick={() => navigate('/reports/builder')}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition flex items-center gap-2"
                >
                  <Wand2 size={18} />
                  Custom Report
                </button>
                <button
                  onClick={() => handleGenerateNow('sales')}
                  disabled={generating}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2 disabled:bg-gray-400"
                >
                  <Play size={18} />
                  {generating ? 'Generating...' : 'Generate Sales Report'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-8 py-8">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600 mb-8">
              {error}
            </div>
          )}

          {/* Metrics Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="text-sm text-gray-600">Total Executions</div>
              <div className="text-2xl font-bold text-gray-900">{metrics.total_reports}</div>
            </div>

            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <div className="text-sm text-blue-600">Active Workflows</div>
              <div className="text-2xl font-bold text-blue-900">{metrics.scheduled}</div>
            </div>

            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <div className="text-sm text-green-600">Sent Today</div>
              <div className="text-2xl font-bold text-green-900">{metrics.sent_today}</div>
            </div>

            <div className="bg-red-50 rounded-lg p-4 border border-red-200">
              <div className="text-sm text-red-600">Failed (7d)</div>
              <div className="text-2xl font-bold text-red-900">{metrics.failed}</div>
            </div>
          </div>

          {/* Filter Buttons */}
          <div className="flex gap-2 mb-6 flex-wrap">
            {['all', 'scheduled', 'sent', 'failed'].map((status) => (
              <button
                key={status}
                onClick={() => { setShowTemplates(false); setFilterStatus(status); }}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  !showTemplates && filterStatus === status
                    ? status === 'failed' ? 'bg-red-600 text-white' :
                      status === 'sent' ? 'bg-green-600 text-white' :
                      'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {status === 'all' ? `All (${reports.length})` :
                 status === 'scheduled' ? `⏱️ Scheduled (${reports.filter(r => r.status === 'scheduled').length})` :
                 status === 'sent' ? `✓ Sent (${reports.filter(r => r.status === 'sent').length})` :
                 `✗ Failed (${reports.filter(r => r.status === 'failed').length})`}
              </button>
            ))}
            <button
                onClick={() => setShowTemplates(true)}
                className={`px-4 py-2 rounded-lg font-medium transition ml-auto flex items-center gap-2 ${
                  showTemplates
                    ? 'bg-purple-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                💾 Saved Templates ({templates.length})
              </button>
          </div>

          {/* Reports Table */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {showTemplates ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Template Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Metrics</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Custom</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {templates.map(tpl => (
                      <tr key={tpl.id} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-4 font-medium text-gray-900">{tpl.name}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getTypeColor(tpl.type)}`}>
                            {tpl.type.charAt(0).toUpperCase() + tpl.type.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {tpl.metrics.length} metrics selected
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {tpl.isCustom ? 'Yes' : 'Built-in'}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => handleGenerateTemplate(tpl)}
                            disabled={generating}
                            className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition disabled:bg-gray-400 text-sm flex items-center gap-1 mx-auto"
                          >
                            <Play size={14} />
                            Generate
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : filteredReports.length === 0 ? (
              <div className="p-12 text-center">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 text-lg font-medium">No reports found</p>
                <p className="text-gray-500 text-sm mt-1">
                  Create a workflow with report generation actions to see reports here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Report</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Frequency</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Last Sent</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredReports.map((report) => {
                      const isExpanded = expandedReport === report.id;
                      const statusConfig = getStatusBadge(report.status);

                      return (
                        <React.Fragment key={report.id}>
                          <tr className="hover:bg-gray-50 transition">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <FileText className="w-5 h-5 text-gray-400" />
                                <div>
                                  <div className="font-medium text-gray-900 truncate max-w-xs">{report.name}</div>
                                  <div className="text-xs text-gray-500">{report.id}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getTypeColor(report.type)}`}>
                                {report.type.charAt(0).toUpperCase() + report.type.slice(1)}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-gray-600 text-sm">
                              <div className="flex items-center gap-2">
                                <Clock size={16} className="text-gray-400" />
                                {report.frequency}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${statusConfig.color}`}>
                                {statusConfig.label}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-gray-600 text-sm">{report.last_sent || '—'}</td>
                            <td className="px-6 py-4 text-center">
                              <button
                                onClick={() => setExpandedReport(isExpanded ? null : report.id)}
                                className="text-blue-600 hover:text-blue-800"
                              >
                                {isExpanded ? <EyeOff size={18} /> : <Eye size={18} />}
                              </button>
                            </td>
                          </tr>

                          {/* Expanded Details */}
                          {isExpanded && (
                            <tr className="bg-blue-50 border-t-2 border-blue-200">
                              <td colSpan="6" className="px-6 py-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  <div>
                                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Recipients</h4>
                                    <div className="space-y-2">
                                      {(report.recipients || []).length > 0 ? (
                                        report.recipients.map((email) => (
                                          <div key={email} className="flex items-center gap-2 text-sm text-gray-600">
                                            <Mail size={14} className="text-gray-400" />
                                            {email}
                                          </div>
                                        ))
                                      ) : (
                                        <p className="text-sm text-gray-500">Sent to manager email from .env</p>
                                      )}
                                    </div>
                                  </div>

                                  <div>
                                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Actions Included</h4>
                                    <div className="space-y-2">
                                      {(report.metrics_included || []).map((metric, idx) => (
                                        <div key={idx} className="flex items-center gap-2 text-sm text-gray-600">
                                          <CheckCircle size={14} className="text-green-500" />
                                          {metric}
                                        </div>
                                      ))}
                                    </div>
                                  </div>

                                  <div>
                                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Report Info</h4>
                                    <div className="space-y-1 text-sm text-gray-600">
                                      <p>Format: <span className="font-medium text-gray-900">{report.format}</span></p>
                                      <p>Created: <span className="font-medium text-gray-900">{report.created_at}</span></p>
                                      <p>Enabled: <span className="font-medium text-gray-900">{report.enabled ? 'Yes' : 'No'}</span></p>
                                      {report.workflow_id && (
                                        <p>Workflow ID: <span className="font-medium text-gray-900">#{report.workflow_id}</span></p>
                                      )}
                                    </div>
                                  </div>

                                  {report.status === 'failed' && report.error_message && (
                                    <div className="bg-red-100 rounded p-3 border border-red-300">
                                      <h4 className="text-sm font-semibold text-red-900 mb-2">Error Details</h4>
                                      <p className="text-sm text-red-800">{report.error_message}</p>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;
