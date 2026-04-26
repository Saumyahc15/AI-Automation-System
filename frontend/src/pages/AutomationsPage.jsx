import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { workflowsAPI } from '../services/api';
import Sidebar from '../components/Sidebar';
import { Zap, Plus, Trash2, Play, Eye, CheckCircle } from 'lucide-react';

export default function AutomationsPage() {
  const navigate = useNavigate();
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [nlInput, setNlInput] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchWorkflows();
  }, []);

  const fetchWorkflows = async () => {
    try {
      setLoading(true);
      const res = await workflowsAPI.list();
      setWorkflows(res.data);
    } catch (err) {
      console.error('Failed to fetch workflows:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWorkflow = async (e) => {
    e.preventDefault();
    if (!nlInput.trim()) return;

    try {
      setCreating(true);
      await workflowsAPI.create(nlInput);
      setNlInput('');
      setShowCreateForm(false);
      fetchWorkflows();
    } catch (err) {
      console.error('Failed to create workflow:', err);
      alert('Failed to create workflow');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteWorkflow = async (workflowId) => {
    if (!confirm('Are you sure you want to delete this workflow?')) return;

    try {
      await workflowsAPI.delete(workflowId);
      fetchWorkflows();
    } catch (err) {
      console.error('Failed to delete workflow:', err);
      alert('Failed to delete workflow');
    }
  };

  const handleRunWorkflow = async (workflowId) => {
    try {
      await workflowsAPI.runNow(workflowId);
      alert('Workflow triggered successfully!');
      fetchWorkflows();
    } catch (err) {
      console.error('Failed to run workflow:', err);
      alert('Failed to run workflow');
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
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Automations</h1>
                <p className="text-gray-600 text-sm mt-1">Create and manage automated workflows</p>
              </div>
              <button
                onClick={() => setShowCreateForm(!showCreateForm)}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
              >
                <Plus className="w-5 h-5" />
                New Automation
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-8 py-8">
          {/* Create Form */}
          {showCreateForm && (
            <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Create New Automation</h2>
              <form onSubmit={handleCreateWorkflow} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Describe what you want to automate (plain English):
                  </label>
                  <textarea
                    value={nlInput}
                    onChange={(e) => setNlInput(e.target.value)}
                    placeholder="Example: When any product stock drops below 10, email the supplier and send me a Gmail alert."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    rows={4}
                    disabled={creating}
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={creating || !nlInput.trim()}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition disabled:opacity-50"
                  >
                    {creating ? 'Creating...' : 'Create Automation'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="bg-gray-200 hover:bg-gray-300 text-gray-900 px-4 py-2 rounded-lg transition"
                  >
                    Cancel
                  </button>
                </div>
              </form>

              {/* Examples */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-sm text-gray-600 font-medium mb-3">💡 Example automations:</p>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• "Alert me when any product stock drops below 5"</li>
                  <li>• "Send me a daily sales report at 9 PM by email"</li>
                  <li>• "Email customers with 30+ days inactivity with a discount coupon"</li>
                  <li>• "Notify me if a product has a 3x demand spike"</li>
                  <li>• "Send a purchase order to the supplier when stock is low"</li>
                </ul>
              </div>
            </div>
          )}

          {/* Workflows List */}
          {loading ? (
            <div className="text-center py-12">
              <p className="text-gray-600">Loading automations...</p>
            </div>
          ) : workflows.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
              <Zap className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900">No automations yet</h3>
              <p className="text-gray-600 mt-2">Create your first automation to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              {workflows.map((wf) => (
                <div
                  key={wf.workflow_id}
                  className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-bold text-gray-900">
                          {wf.natural_language_input}
                        </h3>
                        {wf.is_active ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                            <CheckCircle className="w-3 h-3" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                            Inactive
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-4 mt-4 text-sm text-gray-600">
                        <div>
                          <span className="font-medium">Trigger:</span> {wf.trigger_type}
                        </div>
                        <div>
                          <span className="font-medium">Frequency:</span> {wf.frequency}
                        </div>
                        <div>
                          <span className="font-medium">Actions:</span> {wf.actions_json?.length || 0}
                        </div>
                        {wf.last_executed_at && (
                          <div>
                            <span className="font-medium">Last run:</span>{' '}
                            {new Date(wf.last_executed_at).toLocaleDateString()}
                          </div>
                        )}
                      </div>

                      {/* Workflow Details */}
                      <div className="mt-4 grid grid-cols-2 gap-4">
                        <div className="bg-gray-50 p-3 rounded">
                          <p className="text-xs text-gray-600 font-medium">Condition</p>
                          <p className="text-sm text-gray-900 mt-1">
                            {wf.condition_json?.field} {wf.condition_json?.operator} {wf.condition_json?.value}
                          </p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded">
                          <p className="text-xs text-gray-600 font-medium">Actions</p>
                          <p className="text-sm text-gray-900 mt-1">
                            {wf.actions_json?.join(', ') || 'None'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => navigate(`/automations/${wf.workflow_id}`)}
                        className="p-2 hover:bg-purple-50 text-purple-600 rounded-lg transition"
                        title="View workflow"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleRunWorkflow(wf.workflow_id)}
                        className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition"
                        title="Run now"
                      >
                        <Play className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteWorkflow(wf.workflow_id)}
                        className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition"
                        title="Delete"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
