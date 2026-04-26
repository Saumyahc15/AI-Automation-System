import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Trash2, AlertCircle, CheckCircle } from 'lucide-react';
import WorkflowViewer from '../components/WorkflowViewer';
import { workflowsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const WorkflowDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [workflow, setWorkflow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [running, setRunning] = useState(false);
  const [lastRunStatus, setLastRunStatus] = useState(null);

  useEffect(() => {
    fetchWorkflow();
  }, [id]);

  const fetchWorkflow = async () => {
    try {
      setLoading(true);
      const res = await workflowsAPI.list();
      const workflows = res.data || [];
      const found = workflows.find((w) => w.workflow_id.toString() === id);
      if (found) {
        setWorkflow(found);
      } else {
        setError('Workflow not found');
      }
    } catch (err) {
      setError(err.message || 'Failed to load workflow');
    } finally {
      setLoading(false);
    }
  };

  const handleRunWorkflow = async () => {
    try {
      setRunning(true);
      setLastRunStatus(null);
      await workflowsAPI.runNow(id);
      setLastRunStatus({ success: true, message: 'Workflow triggered successfully!' });
      setTimeout(() => setLastRunStatus(null), 3000);
    } catch (err) {
      setLastRunStatus({
        success: false,
        message: err.message || 'Failed to run workflow',
      });
    } finally {
      setRunning(false);
    }
  };

  const handleDeleteWorkflow = async () => {
    if (!window.confirm('Are you sure you want to delete this workflow?')) {
      return;
    }

    try {
      await workflowsAPI.delete(id);
      navigate('/automations');
    } catch (err) {
      setError(err.message || 'Failed to delete workflow');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full"></div>
        </div>
      </div>
    );
  }

  if (error || !workflow) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <button
          onClick={() => navigate('/automations')}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-4"
        >
          <ArrowLeft size={20} />
          Back to Automations
        </button>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600">
          {error || 'Workflow not found'}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      {/* Header with Back Button */}
      <button
        onClick={() => navigate('/automations')}
        className="flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-6"
      >
        <ArrowLeft size={20} />
        Back to Automations
      </button>

      {/* Title & Status */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold text-gray-900">{workflow.natural_language_input || 'Workflow'}</h1>
          <div
            className={`px-4 py-2 rounded-full text-sm font-semibold ${
              workflow.is_active
                ? 'bg-green-100 text-green-800'
                : 'bg-gray-100 text-gray-800'
            }`}
          >
            {workflow.is_active ? '🟢 Active' : '🔘 Inactive'}
          </div>
        </div>
        <p className="text-gray-600">Workflow #{workflow.workflow_id}</p>
      </div>

      {/* Last Run Status */}
      {lastRunStatus && (
        <div
          className={`mb-6 p-4 rounded-lg flex items-center gap-2 ${
            lastRunStatus.success
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {lastRunStatus.success ? (
            <CheckCircle size={20} />
          ) : (
            <AlertCircle size={20} />
          )}
          {lastRunStatus.message}
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-3 gap-8 mb-8">
        {/* Left: Workflow Details */}
        <div className="col-span-2">
          {/* Workflow Details Card */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Workflow Details</h2>

            <div className="space-y-4">
              {/* Trigger */}
              <div className="border-l-4 border-blue-500 pl-4 py-2">
                <div className="text-sm text-gray-600 font-medium">🎯 Trigger</div>
                <div className="text-lg text-gray-900 font-semibold">
                  {workflow.trigger_type}
                </div>
                <div className="text-sm text-gray-600">Frequency: {workflow.frequency}</div>
              </div>

              {/* Condition */}
              {workflow.condition_json && (
                <div className="border-l-4 border-purple-500 pl-4 py-2">
                  <div className="text-sm text-gray-600 font-medium">⚙️ Condition</div>
                  <div className="text-gray-900">
                    {workflow.condition_json.field} {workflow.condition_json.operator}{' '}
                    {workflow.condition_json.value}
                  </div>
                </div>
              )}

              {/* Actions */}
              {workflow.actions_json && Array.isArray(workflow.actions_json) && (
                <div className="border-l-4 border-green-500 pl-4 py-2">
                  <div className="text-sm text-gray-600 font-medium">✅ Actions ({workflow.actions_json.length})</div>
                  <div className="space-y-2 mt-2">
                    {workflow.actions_json.map((action, idx) => (
                      <div key={idx} className="bg-green-50 p-2 rounded text-sm">
                        <div className="font-semibold text-green-900">
                          {typeof action === 'object' ? action.type : action}
                        </div>
                        {typeof action === 'object' && action.target && (
                          <div className="text-green-700">To: {action.target}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Execution Stats */}
              <div className="bg-gray-50 p-4 rounded mt-6">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-gray-600">Last Run</div>
                    <div className="text-lg font-semibold text-gray-900">
                      {workflow.last_executed_at
                        ? new Date(workflow.last_executed_at).toLocaleDateString()
                        : 'Never'}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-600">Created</div>
                    <div className="text-lg font-semibold text-gray-900">
                      {new Date(workflow.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Visualization */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Workflow Visualization</h2>
            <WorkflowViewer workflow={workflow} />
          </div>
        </div>

        {/* Right: Action Panel */}
        <div className="col-span-1">
          <div className="bg-white rounded-lg shadow p-6 sticky top-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions</h2>

            <div className="space-y-3">
              {/* Run Button */}
              <button
                onClick={handleRunWorkflow}
                disabled={running || !workflow.is_active}
                className={`w-full py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition ${
                  running || !workflow.is_active
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                <Play size={20} />
                {running ? 'Running...' : 'Run Now'}
              </button>

              {/* Delete Button */}
              <button
                onClick={handleDeleteWorkflow}
                disabled={running}
                className="w-full py-3 rounded-lg font-semibold flex items-center justify-center gap-2 bg-red-50 text-red-600 hover:bg-red-100 transition"
              >
                <Trash2 size={20} />
                Delete
              </button>
            </div>

            {/* Info Section */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-3">Frequency</h3>
              <div className="text-sm text-gray-600">
                {workflow.frequency ? (
                  <div className="bg-blue-50 p-3 rounded">
                    <div className="font-semibold text-blue-900">
                      {workflow.frequency}
                    </div>
                  </div>
                ) : (
                  <p>On demand only</p>
                )}
              </div>
            </div>

            {/* Owner Info */}
            {user?.email && (
              <div className="mt-4 text-xs text-gray-500">
                <div>Created by: {user.email}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkflowDetailPage;
