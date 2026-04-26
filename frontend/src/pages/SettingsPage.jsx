import React, { useEffect, useState } from 'react';
import {
  Settings as SettingsIcon,
  RefreshCw,
  Bell,
  Mail,
  Save,
  AlertCircle,
  CheckCircle,
  Loader,
  Edit2,
  X,
} from 'lucide-react';
import Sidebar from '../components/Sidebar';
import { settingsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const INTEGRATION_DEFS = [
  { key: 'gmail', name: 'Gmail', icon: 'Mail', description: 'Email alerts and reports' },
  { key: 'sheets', name: 'Google Sheets', icon: 'Sheets', description: 'Inventory sync and sheet triggers' },
  { key: 'calendar', name: 'Google Calendar', icon: 'Calendar', description: 'Workflow scheduling' },
];

const SettingsPage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);
  const [configStatus, setConfigStatus] = useState({});
  const [integrations, setIntegrations] = useState({});
  const [editingEmail, setEditingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState(user?.email || '');
  const [savingEmail, setSavingEmail] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState({
    email_alerts: true,
    email_daily_digest: true,
    email_reports: true,
    low_stock_alerts: true,
    order_alerts: true,
    customer_alerts: true,
    anomaly_alerts: true,
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError(null);

      const [configRes, integrationsRes] = await Promise.allSettled([
        settingsAPI.getSettings(),
        settingsAPI.getIntegrations(),
      ]);

      if (configRes.status === 'fulfilled') {
        setConfigStatus(configRes.value.data || {});
      }

      if (integrationsRes.status === 'fulfilled') {
        setIntegrations(integrationsRes.value.data || {});
      }
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailUpdate = async () => {
    if (!newEmail || newEmail === user?.email) {
      setEditingEmail(false);
      return;
    }

    if (!newEmail.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    try {
      setSavingEmail(true);
      setError(null);

      const response = await settingsAPI.updateUserEmail(newEmail);

      if (response.data.success) {
        setSuccess('Email updated successfully! All future emails will go to this address.');
        // Update local user data
        const updatedUser = { ...user, email: newEmail };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setEditingEmail(false);
        setTimeout(() => {
          window.location.reload(); // Refresh to update auth context
        }, 1500);
      } else {
        setError(response.data.message || 'Failed to update email');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error updating email');
    } finally {
      setSavingEmail(false);
    }
  };

  const saveNotificationSettings = () => {
    localStorage.setItem('notification_prefs', JSON.stringify(notificationSettings));
    setSuccess('Notification preferences saved.');
    setTimeout(() => setSuccess(null), 3000);
  };

  const getIntegrationStatus = (key) => {
    const integration = integrations[key];
    if (!integration) return { connected: false, detail: 'Not configured' };
    return {
      connected: integration.configured || false,
      detail: integration.status || (integration.configured ? 'Configured' : 'Not configured'),
    };
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader className="w-10 h-10 text-blue-600 animate-spin mx-auto" />
            <p className="mt-4 text-gray-600">Loading settings from backend...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />

      <div className="flex-1 overflow-auto">
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <SettingsIcon className="w-8 h-8 text-blue-600" />
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
                  <p className="text-gray-600 text-sm mt-1">System configuration and integration status</p>
                </div>
              </div>
              <button
                onClick={fetchSettings}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
              >
                <RefreshCw size={18} />
                Refresh
              </button>
            </div>
          </div>
        </div>

        <div className="px-8 py-8">
          {success && (
            <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
              <CheckCircle className="text-green-600" size={20} />
              <p className="text-green-800">{success}</p>
            </div>
          )}

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
              <AlertCircle className="text-red-600" size={20} />
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {/* User Email Section */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">User Email</h2>
            {!editingEmail ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm mb-1">Current Email</p>
                  <p className="text-lg font-semibold text-gray-900">{user?.email}</p>
                  <p className="text-xs text-gray-500 mt-2">All automation emails will be sent to this address</p>
                </div>
                <button
                  onClick={() => {
                    setNewEmail(user?.email);
                    setEditingEmail(true);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
                >
                  <Edit2 size={16} />
                  Edit Email
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">New Email Address</label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter new email"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleEmailUpdate}
                    disabled={savingEmail}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2 disabled:opacity-50"
                  >
                    <Save size={16} />
                    {savingEmail ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={() => setEditingEmail(false)}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition flex items-center gap-2"
                  >
                    <X size={16} />
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">System Health</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className={`rounded-lg p-4 border ${configStatus.database === 'connected' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                <div className="flex items-center gap-2 mb-1">
                  {configStatus.database === 'connected'
                    ? <CheckCircle size={18} className="text-green-600" />
                    : <AlertCircle size={18} className="text-red-600" />}
                  <span className="font-medium text-gray-900">Database</span>
                </div>
                <p className={`text-sm ${configStatus.database === 'connected' ? 'text-green-700' : 'text-red-700'}`}>
                  {configStatus.database || 'Unknown'}
                </p>
              </div>

              <div className={`rounded-lg p-4 border ${configStatus.groq_key ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                <div className="flex items-center gap-2 mb-1">
                  {configStatus.groq_key
                    ? <CheckCircle size={18} className="text-green-600" />
                    : <AlertCircle size={18} className="text-red-600" />}
                  <span className="font-medium text-gray-900">Groq API Key</span>
                </div>
                <p className={`text-sm ${configStatus.groq_key ? 'text-green-700' : 'text-red-700'}`}>
                  {configStatus.groq_key ? 'Configured' : 'Missing'}
                </p>
              </div>

              <div className="rounded-lg p-4 border bg-blue-50 border-blue-200">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle size={18} className="text-blue-600" />
                  <span className="font-medium text-gray-900">Logged in as</span>
                </div>
                <p className="text-sm text-blue-700">{user?.email || 'Unknown'} ({user?.role || 'user'})</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Connected Integrations</h2>
            <p className="text-sm text-gray-600 mb-4">Integrations are automatically connected to your email account</p>

            <div className="space-y-4">
              {INTEGRATION_DEFS.map((integration) => {
                const status = getIntegrationStatus(integration.key);
                return (
                  <div key={integration.key} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-green-50">
                    <div className="flex items-center gap-4">
                      <div className="text-sm font-semibold text-gray-500 uppercase tracking-wide w-20">
                        {integration.icon}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{integration.name}</h3>
                        <p className="text-xs text-gray-500">{integration.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-500">{status.detail}</span>
                      <span className="px-4 py-2 rounded-lg font-medium text-sm bg-green-100 text-green-700">
                        Connected
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Bell size={24} className="text-blue-600" />
              Notification Preferences
            </h2>

            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Mail size={18} />
                Email Notifications
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-6">
                {[
                  { key: 'email_alerts', label: 'Instant Alerts' },
                  { key: 'email_daily_digest', label: 'Daily Digest' },
                  { key: 'email_reports', label: 'Scheduled Reports' },
                  { key: 'low_stock_alerts', label: 'Low Stock Alerts' },
                  { key: 'order_alerts', label: 'Order Alerts' },
                  { key: 'customer_alerts', label: 'Customer Alerts' },
                  { key: 'anomaly_alerts', label: 'Anomaly Alerts' },
                ].map((item) => (
                  <label key={item.key} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notificationSettings[item.key]}
                      onChange={(e) => setNotificationSettings((prev) => ({ ...prev, [item.key]: e.target.checked }))}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm text-gray-700">{item.label}</span>
                  </label>
                ))}
              </div>

              <button
                onClick={saveNotificationSettings}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2 mt-4"
              >
                <Save size={18} />
                Save Preferences
              </button>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-700 mb-4">Environment Info</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-600">Frontend:</span>
                <span className="text-gray-900">React + Vite</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-600">Backend:</span>
                <span className="text-gray-900">FastAPI + PostgreSQL</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-600">AI Engine:</span>
                <span className="text-gray-900">Groq LLaMA 3</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-600">Scheduler:</span>
                <span className="text-gray-900">APScheduler</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
