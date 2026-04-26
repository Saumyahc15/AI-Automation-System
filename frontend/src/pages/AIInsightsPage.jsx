import React, { useState, useEffect } from 'react';
import { Brain, TrendingUp, AlertCircle, CheckCircle, Search, Zap, RefreshCw, MessageSquare, Send, Bug, Sun, Lightbulb, BarChart3 } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import { aiAPI, workflowsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const AIInsightsPage = () => {
  const { user } = useAuth();
  const [suggestions, setSuggestions] = useState('');
  const [morningSummary, setMorningSummary] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('query');

  // NL Query state
  const [nlQuery, setNlQuery] = useState('');
  const [queryResult, setQueryResult] = useState(null);
  const [queryLoading, setQueryLoading] = useState(false);

  // Suggestions loading
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);

  useEffect(() => {
    fetchInsightsData();
  }, []);

  const fetchInsightsData = async () => {
    try {
      setLoading(true);
      setError(null);

      await Promise.allSettled([]);
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to load insights');
    } finally {
      setLoading(false);
    }
  };

  const fetchSuggestions = async () => {
    try {
      setSuggestionsLoading(true);
      const res = await aiAPI.getSuggestions();
      setSuggestions(res.data?.suggestions || 'No suggestions available.');
    } catch (err) {
      setSuggestions('Failed to load suggestions: ' + (err.response?.data?.detail || err.message));
    } finally {
      setSuggestionsLoading(false);
    }
  };

  const fetchMorningSummary = async () => {
    try {
      setSummaryLoading(true);
      const res = await aiAPI.getMorningSummary();
      setMorningSummary(res.data?.summary || 'No summary available.');
    } catch (err) {
      setMorningSummary('Failed to load summary: ' + (err.response?.data?.detail || err.message));
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleNlQuery = async (e) => {
    e.preventDefault();
    if (!nlQuery.trim()) return;
    try {
      setQueryLoading(true);
      setQueryResult(null);
      const res = await aiAPI.query(nlQuery);
      setQueryResult(res.data);
    } catch (err) {
      setQueryResult({ error: err.response?.data?.detail || err.message, answer: 'Query failed.' });
    } finally {
      setQueryLoading(false);
    }
  };



  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin inline-block">
              <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full"></div>
            </div>
            <p className="mt-4 text-gray-600">Loading AI insights from live data...</p>
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
                <h1 className="text-3xl font-bold text-gray-900">AI Insights</h1>
                <p className="text-gray-600 text-sm mt-1">Live anomaly detection, forecasts, NL queries & AI debugging</p>
              </div>
              <button
                onClick={fetchInsightsData}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
              >
                <RefreshCw size={18} />
                Refresh
              </button>
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

          {/* Summary Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
            <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
              <div className="text-sm text-purple-600">AI NL Queries</div>
              <div className="text-2xl font-bold text-purple-900">Active</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <div className="text-sm text-green-600">Data Source</div>
              <div className="text-2xl font-bold text-green-900">Live DB</div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6 flex-wrap">
            {[
              { id: 'query', label: '💬 Ask AI', color: 'purple' },
              { id: 'suggestions', label: '💡 Suggestions', color: 'green' },
              { id: 'summary', label: '🌅 Morning Summary', color: 'teal' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  if (tab.id === 'suggestions' && !suggestions) fetchSuggestions();
                  if (tab.id === 'summary' && !morningSummary) fetchMorningSummary();
                }}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  activeTab === tab.id
                    ? `bg-${tab.color}-600 text-white`
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
                style={
                  activeTab === tab.id
                    ? {
                        backgroundColor:
                          tab.color === 'red' ? '#dc2626' :
                          tab.color === 'blue' ? '#2563eb' :
                          tab.color === 'purple' ? '#9333ea' :
                          tab.color === 'green' ? '#16a34a' :
                          tab.color === 'teal' ? '#0d9488' :
                          '#4b5563',
                        color: 'white',
                      }
                    : {}
                }
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── NL Query Tab ── */}
          {activeTab === 'query' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <MessageSquare size={20} className="text-purple-600" />
                  Ask Your Store Anything
                </h2>
                <p className="text-gray-600 text-sm mb-4">
                  Ask questions in plain English — AI translates to SQL, runs it, and returns the answer.
                </p>
                <form onSubmit={handleNlQuery} className="flex gap-3">
                  <input
                    type="text"
                    value={nlQuery}
                    onChange={(e) => setNlQuery(e.target.value)}
                    placeholder="e.g., What was my best-selling product last week?"
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                    disabled={queryLoading}
                  />
                  <button
                    type="submit"
                    disabled={queryLoading || !nlQuery.trim()}
                    className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:bg-gray-400 flex items-center gap-2"
                  >
                    <Send size={16} />
                    {queryLoading ? 'Thinking...' : 'Ask'}
                  </button>
                </form>

                <div className="mt-3 flex flex-wrap gap-2">
                  {[
                    'What was my best-selling product last week?',
                    'How many customers bought more than twice this month?',
                    'What is the total revenue today?',
                    'Which products have zero stock?',
                  ].map((example) => (
                    <button
                      key={example}
                      onClick={() => setNlQuery(example)}
                      className="text-xs px-3 py-1 bg-purple-50 text-purple-700 rounded-full hover:bg-purple-100 transition"
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </div>

              {queryResult && (
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="font-semibold text-gray-900 mb-3">Answer</h3>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                    <p className="text-green-900 font-medium">{queryResult.answer}</p>
                  </div>
                  {queryResult.sql && (
                    <details className="mt-3">
                      <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700">
                        View generated SQL
                      </summary>
                      <pre className="mt-2 bg-gray-900 text-green-400 p-4 rounded-lg text-sm overflow-x-auto">
                        {queryResult.sql}
                      </pre>
                    </details>
                  )}
                  {queryResult.raw_result && queryResult.raw_result.length > 0 && (
                    <details className="mt-3">
                      <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700">
                        View raw data ({queryResult.raw_result.length} rows)
                      </summary>
                      <pre className="mt-2 bg-gray-50 p-4 rounded-lg text-sm overflow-x-auto border">
                        {JSON.stringify(queryResult.raw_result, null, 2)}
                      </pre>
                    </details>
                  )}
                  {queryResult.error && (
                    <div className="bg-red-50 border border-red-200 rounded p-3 mt-3">
                      <p className="text-sm text-red-800">{queryResult.error}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Suggestions Tab ── */}
          {activeTab === 'suggestions' && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Lightbulb size={20} className="text-green-600" />
                  AI Workflow Suggestions
                </h2>
                <button
                  onClick={fetchSuggestions}
                  disabled={suggestionsLoading}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:bg-gray-400 flex items-center gap-2"
                >
                  <RefreshCw size={16} className={suggestionsLoading ? 'animate-spin' : ''} />
                  {suggestionsLoading ? 'Analyzing...' : 'Get Fresh Suggestions'}
                </button>
              </div>
              <p className="text-gray-600 text-sm mb-4">
                AI analyzes your current store data and suggests automations you should set up.
              </p>
              {suggestionsLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin inline-block">
                    <div className="w-8 h-8 border-4 border-green-200 border-t-green-600 rounded-full"></div>
                  </div>
                  <p className="mt-3 text-gray-600">AI is analyzing your store data...</p>
                </div>
              ) : suggestions ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <pre className="whitespace-pre-wrap font-sans text-green-900 text-sm leading-relaxed">
                    {suggestions}
                  </pre>
                </div>
              ) : (
                <p className="text-gray-500">Click "Get Fresh Suggestions" to let AI analyze your data.</p>
              )}
            </div>
          )}

          {/* ── Morning Summary Tab ── */}
          {activeTab === 'summary' && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Sun size={20} className="text-amber-500" />
                  AI Morning Business Summary
                </h2>
                <button
                  onClick={fetchMorningSummary}
                  disabled={summaryLoading}
                  className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition disabled:bg-gray-400 flex items-center gap-2"
                >
                  <RefreshCw size={16} className={summaryLoading ? 'animate-spin' : ''} />
                  {summaryLoading ? 'Generating...' : 'Generate Summary'}
                </button>
              </div>
              <p className="text-gray-600 text-sm mb-4">
                A 5-bullet summary of how your store is doing, generated from live data.
              </p>
              {summaryLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin inline-block">
                    <div className="w-8 h-8 border-4 border-amber-200 border-t-amber-600 rounded-full"></div>
                  </div>
                  <p className="mt-3 text-gray-600">AI is summarizing your business health...</p>
                </div>
              ) : morningSummary ? (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <pre className="whitespace-pre-wrap font-sans text-amber-900 text-sm leading-relaxed">
                    {morningSummary}
                  </pre>
                </div>
              ) : (
                <p className="text-gray-500">Click "Generate Summary" to get your daily briefing.</p>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default AIInsightsPage;
