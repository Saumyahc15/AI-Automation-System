import { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import { gmailAPI } from '../services/api';

export default function GmailOpsPage() {
  const [query, setQuery] = useState('newer_than:14d');
  const [messages, setMessages] = useState([]);
  const [selectedThread, setSelectedThread] = useState(null);
  const [threadMessages, setThreadMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [replyBody, setReplyBody] = useState('');
  const [replying, setReplying] = useState(false);
  const [gmailStatus, setGmailStatus] = useState(null);
  const [statusLoading, setStatusLoading] = useState(true);

  const checkGmailStatus = async () => {
    try {
      setStatusLoading(true);
      const res = await gmailAPI.checkStatus?.();
      if (res?.data) {
        setGmailStatus(res.data);
      }
    } catch (err) {
      console.error('Failed to check Gmail status:', err);
      setGmailStatus({
        authenticated: false,
        message: 'Unable to check Gmail status'
      });
    } finally {
      setStatusLoading(false);
    }
  };

  const loadMessages = async () => {
    try {
      setLoading(true);
      const res = await gmailAPI.listMessages({ query, max_results: 20 });
      setMessages(res.data.messages || []);
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to load Gmail messages');
    } finally {
      setLoading(false);
    }
  };

  const loadThread = async (threadId) => {
    try {
      const res = await gmailAPI.getThread(threadId);
      setSelectedThread(threadId);
      setThreadMessages(res.data.messages || []);
      setReplyBody('');
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to load thread');
    }
  };

  const sendReply = async () => {
    if (!selectedThread || !threadMessages.length || !replyBody.trim()) return;
    const latest = threadMessages[threadMessages.length - 1];
    const toEmail = latest.from || '';
    const subject = latest.subject?.startsWith('Re:') ? latest.subject : `Re: ${latest.subject || 'Update'}`;
    try {
      setReplying(true);
      await gmailAPI.reply({
        thread_id: selectedThread,
        to: toEmail,
        subject,
        body_html: `<p>${replyBody.replace(/\n/g, '<br/>')}</p>`,
        label_name: 'Retail-AI/Replied',
      });
      await loadThread(selectedThread);
      alert('Reply sent');
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to send reply');
    } finally {
      setReplying(false);
    }
  };

  useEffect(() => {
    checkGmailStatus();
  }, []);

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 p-6 overflow-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Gmail Threads</h1>

        {statusLoading ? (
          <div className="bg-white border rounded-lg p-4 mb-4">
            <p className="text-gray-600">Checking Gmail status...</p>
          </div>
        ) : gmailStatus && !gmailStatus.authenticated ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-red-800 font-semibold mb-2">Gmail Not Authenticated</p>
            <p className="text-red-700 mb-3">
              Gmail access is not set up yet. To use Gmail features, please authorize the app by clicking the button below.
            </p>
            <p className="text-red-700 text-sm mb-3">
              Note: A browser window will open asking you to authorize access to your Gmail account.
            </p>
            <button
              onClick={() => {
                alert('Gmail OAuth will be triggered on the next API call. Please try searching for messages.');
                loadMessages();
              }}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              Authorize Gmail
            </button>
          </div>
        ) : null}

        <div className="bg-white border rounded-lg p-4 mb-4 flex gap-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 border rounded px-3 py-2"
            placeholder="Gmail query (e.g. from:supplier@x.com newer_than:7d)"
          />
          <button onClick={loadMessages} className="bg-blue-600 text-white px-4 py-2 rounded">
            Search
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white border rounded-lg">
            <div className="p-3 border-b font-semibold">Recent Messages</div>
            <div className="max-h-[65vh] overflow-auto">
              {loading ? (
                <p className="p-4 text-gray-600">Loading...</p>
              ) : (
                messages.map((msg) => (
                  <button
                    key={msg.id}
                    onClick={() => loadThread(msg.threadId)}
                    className={`w-full text-left p-3 border-b hover:bg-gray-50 ${
                      selectedThread === msg.threadId ? 'bg-blue-50' : ''
                    }`}
                  >
                    <p className="text-sm font-semibold text-gray-900">{msg.subject || '(No Subject)'}</p>
                    <p className="text-xs text-gray-600">{msg.from}</p>
                    <p className="text-xs text-gray-500 mt-1">{msg.snippet}</p>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="bg-white border rounded-lg">
            <div className="p-3 border-b font-semibold">Thread + Reply</div>
            <div className="max-h-[45vh] overflow-auto p-3 space-y-3">
              {!selectedThread ? (
                <p className="text-gray-600">Select a message to open thread.</p>
              ) : (
                threadMessages.map((m) => (
                  <div key={m.id} className="border rounded p-3">
                    <p className="text-xs text-gray-600">{m.from}</p>
                    <p className="text-sm font-semibold text-gray-900">{m.subject}</p>
                    <p className="text-sm text-gray-700 mt-1">{m.snippet}</p>
                  </div>
                ))
              )}
            </div>

            <div className="p-3 border-t">
              <textarea
                value={replyBody}
                onChange={(e) => setReplyBody(e.target.value)}
                rows={4}
                className="w-full border rounded px-3 py-2"
                placeholder="Write reply..."
              />
              <button
                onClick={sendReply}
                disabled={!selectedThread || !replyBody.trim() || replying}
                className="mt-2 bg-green-600 text-white px-4 py-2 rounded disabled:opacity-50"
              >
                {replying ? 'Sending...' : 'Send Reply'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
