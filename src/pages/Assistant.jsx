import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import api from "../api/client";

const QUICK_QUESTIONS = [
  "Why did sales drop recently?",
  "Which products are selling the fastest?",
  "How many inactive customers do I have?",
  "What is my total revenue this week?",
  "Which product categories are performing best?",
];

const NL_SUGGESTIONS = [
  "Notify me when any product stock falls below 5 units",
  "Send me a PDF sales report every night at 9 PM",
  "Alert me if any order is not shipped within 48 hours",
  "Send a discount coupon to customers inactive for 30 days",
];

function LoadingDots() {
  return (
    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
      {[0,1,2].map(i => (
        <div key={i} style={{
          width: 6, height: 6, borderRadius: "50%", background: "var(--text3)",
          animation: `blink 1.2s ease-in-out ${i*0.2}s infinite`
        }}/>
      ))}
      <style>{`@keyframes blink{0%,80%,100%{opacity:.2}40%{opacity:1}}`}</style>
    </div>
  );
}

function WorkflowCard({ wf }) {
  const tColors = {
    inventory_update:["#E1F5EE","#0F6E56"], cron_21_00:["#E6F1FB","#185FA5"],
    cron_09_00:["#E6F1FB","#185FA5"], scheduled_check:["#FAEEDA","#854F0B"],
    sales_update:["#EEEDFE","#534AB7"], order_created:["#FCEBEB","#A32D2D"],
  };
  const [bg, color] = tColors[wf.trigger] || ["var(--surface2)","var(--text2)"];
  return (
    <div style={{ background:"var(--surface)", border:"0.5px solid var(--border)", borderRadius:"var(--radius-lg)", padding:14, marginTop:8 }}>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
        <div>
          <div style={{ fontWeight:500, fontSize:13 }}>{wf.name}</div>
          {wf.description && <div style={{ fontSize:11, color:"var(--text2)", marginTop:2 }}>{wf.description}</div>}
        </div>
        <span style={{ background:"#EAF3DE", color:"#3B6D11", padding:"2px 9px", borderRadius:20, fontSize:11, fontWeight:500 }}>Created</span>
      </div>
      <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
        <span style={{ background:bg, color, padding:"2px 8px", borderRadius:10, fontSize:11, fontWeight:500 }}>{wf.trigger}</span>
        {wf.condition && (
          <span style={{ background:"var(--surface2)", color:"var(--text2)", padding:"2px 8px", borderRadius:10, fontSize:11, fontFamily:"DM Mono, monospace" }}>
            {wf.condition.field} {wf.condition.op} {wf.condition.value}
          </span>
        )}
        {wf.actions.map((a,i) => (
          <span key={i} style={{ background:"var(--accent-light)", color:"var(--accent-dark)", padding:"2px 8px", borderRadius:10, fontSize:11, fontWeight:500 }}>{a}</span>
        ))}
      </div>
    </div>
  );
}

function PredictionPanel() {
  const [horizon, setHorizon] = useState(7);
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["prediction", horizon],
    queryFn: () => api.get(`/intelligence/predict-stockouts?horizon_days=${horizon}`).then(r => r.data),
    enabled: false,
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div style={{ background:"var(--surface)", border:"0.5px solid var(--border)", borderRadius:"var(--radius-lg)", padding:20 }}>
      <div style={{ fontWeight:500, fontSize:14, marginBottom:4 }}>Stock shortage prediction</div>
      <p style={{ fontSize:12, color:"var(--text2)", marginBottom:14 }}>
        Predicts which products will run out based on your actual sales velocity.
      </p>
      <div style={{ display:"flex", gap:10, alignItems:"center", marginBottom:14 }}>
        <select
          value={horizon}
          onChange={e => setHorizon(+e.target.value)}
          style={{ padding:"7px 10px", border:"0.5px solid var(--border2)", borderRadius:"var(--radius)", background:"var(--surface)", color:"var(--text)", fontSize:13, outline:"none" }}>
          <option value={3}>Next 3 days</option>
          <option value={7}>Next 7 days</option>
          <option value={14}>Next 14 days</option>
          <option value={30}>Next 30 days</option>
        </select>
        <button onClick={() => refetch()} disabled={isFetching} style={{
          padding:"7px 16px", borderRadius:"var(--radius)", border:"none",
          background: isFetching ? "var(--border2)" : "var(--accent)",
          color:"#fff", fontWeight:500, cursor: isFetching ? "not-allowed" : "pointer", fontSize:13
        }}>
          {isFetching ? "Predicting..." : "Run prediction"}
        </button>
      </div>

      {isFetching && (
        <div style={{ display:"flex", gap:8, alignItems:"center", padding:"12px 0", color:"var(--text2)", fontSize:13 }}>
          <LoadingDots /> Groq is analysing your sales data...
        </div>
      )}

      {data && !isFetching && (
        <div>
          <div style={{ background:"var(--surface2)", borderRadius:"var(--radius)", padding:"12px 14px", fontSize:13, lineHeight:1.7, marginBottom:14, borderLeft:"3px solid var(--accent)", borderRadius:"0 var(--radius) var(--radius) 0" }}>
            {data.narrative}
          </div>
          {data.at_risk.length === 0 ? (
            <p style={{ fontSize:13, color:"var(--accent)", fontWeight:500 }}>No products predicted to run out in {horizon} days.</p>
          ) : (
            <div>
              <div style={{ fontSize:12, color:"var(--text3)", marginBottom:8, textTransform:"uppercase", letterSpacing:".04em", fontWeight:500 }}>
                {data.at_risk.length} products at risk
              </div>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
                <thead>
                  <tr>{["Product","Stock","Daily sales","Days left","Urgency"].map(h => (
                    <th key={h} style={{ fontSize:11, color:"var(--text2)", fontWeight:500, textAlign:"left", padding:"6px 10px", borderBottom:"0.5px solid var(--border)", textTransform:"uppercase", letterSpacing:".04em" }}>{h}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {data.at_risk.map(p => (
                    <tr key={p.id}
                      onMouseEnter={e => e.currentTarget.style.background = "var(--surface2)"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <td style={{ padding:"8px 10px", borderBottom:"0.5px solid var(--border)", fontWeight:500 }}>{p.name}</td>
                      <td style={{ padding:"8px 10px", borderBottom:"0.5px solid var(--border)", color: p.stock < 10 ? "var(--danger)" : "var(--warning)", fontWeight:500 }}>{p.stock}</td>
                      <td style={{ padding:"8px 10px", borderBottom:"0.5px solid var(--border)", color:"var(--text2)" }}>{p.daily_rate}/day</td>
                      <td style={{ padding:"8px 10px", borderBottom:"0.5px solid var(--border)", fontWeight:500, color: p.days_remaining <= 2 ? "var(--danger)" : p.days_remaining <= 5 ? "var(--warning)" : "var(--text)" }}>
                        {p.days_remaining}d
                      </td>
                      <td style={{ padding:"8px 10px", borderBottom:"0.5px solid var(--border)" }}>
                        <span style={{
                          padding:"2px 8px", borderRadius:10, fontSize:11, fontWeight:500,
                          background: p.days_remaining <= 2 ? "var(--danger-light)" : p.days_remaining <= 5 ? "var(--warning-light)" : "#EAF3DE",
                          color: p.days_remaining <= 2 ? "var(--danger)" : p.days_remaining <= 5 ? "var(--warning)" : "#3B6D11"
                        }}>
                          {p.days_remaining <= 2 ? "Critical" : p.days_remaining <= 5 ? "High" : "Medium"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SuggestionsPanel({ onUseCommand }) {
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["suggestions"],
    queryFn: () => api.get("/intelligence/suggestions").then(r => r.data),
    enabled: false,
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div style={{ background:"var(--surface)", border:"0.5px solid var(--border)", borderRadius:"var(--radius-lg)", padding:20 }}>
      <div style={{ fontWeight:500, fontSize:14, marginBottom:4 }}>Smart automation suggestions</div>
      <p style={{ fontSize:12, color:"var(--text2)", marginBottom:14 }}>
        Groq analyses your store state and recommends automations you're missing.
      </p>
      <button onClick={() => refetch()} disabled={isFetching} style={{
        padding:"7px 16px", borderRadius:"var(--radius)", border:"none", marginBottom:14,
        background: isFetching ? "var(--border2)" : "var(--accent)",
        color:"#fff", fontWeight:500, cursor: isFetching ? "not-allowed" : "pointer", fontSize:13
      }}>
        {isFetching ? "Analysing store..." : "Get suggestions"}
      </button>

      {isFetching && (
        <div style={{ display:"flex", gap:8, alignItems:"center", color:"var(--text2)", fontSize:13 }}>
          <LoadingDots /> Groq is reviewing your store data...
        </div>
      )}

      {data && !isFetching && (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {data.map((s, i) => (
            <div key={i} style={{ border:"0.5px solid var(--border)", borderRadius:"var(--radius-lg)", padding:"14px 16px", display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12 }}>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:500, fontSize:13, marginBottom:3 }}>{s.title}</div>
                <div style={{ fontSize:12, color:"var(--text2)" }}>{s.reason}</div>
                <div style={{ fontSize:11, color:"var(--text3)", marginTop:4, fontStyle:"italic" }}>"{s.command}"</div>
              </div>
              <button
                onClick={() => onUseCommand(s.command)}
                style={{
                  padding:"6px 12px", borderRadius:"var(--radius)", border:"0.5px solid var(--border2)",
                  background:"var(--surface2)", color:"var(--text)", fontSize:12,
                  cursor:"pointer", flexShrink:0, fontWeight:500
                }}>
                Use this ↓
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Assistant() {
  const qc = useQueryClient();
  const [tab, setTab] = useState("create");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [qaLoading, setQaLoading] = useState(false);
  const [history, setHistory] = useState([]);

  const handleCreateWorkflow = async () => {
    if (!input.trim()) return;
    const text = input.trim();
    setInput("");
    setLoading(true);
    setHistory(h => [...h, { role:"user", text }]);
    try {
      const res = await api.post("/workflows/parse", { text });
      qc.invalidateQueries(["workflows"]);
      setHistory(h => [...h, { role:"ai", text:"Workflow created successfully.", workflow: res.data }]);
      toast.success("Workflow created!");
    } catch (err) {
      const msg = err.response?.data?.detail || "Failed to parse. Try rephrasing.";
      setHistory(h => [...h, { role:"error", text: msg }]);
      toast.error("Failed to create workflow");
    } finally {
      setLoading(false);
    }
  };

  const handleAskQuestion = async (question) => {
    const q = question || input.trim();
    if (!q) return;
    setInput("");
    setQaLoading(true);
    setHistory(h => [...h, { role:"user", text: q }]);
    try {
      const res = await api.post("/intelligence/ask", { question: q });
      setHistory(h => [...h, { role:"answer", text: res.data.answer }]);
    } catch {
      setHistory(h => [...h, { role:"error", text:"Failed to get answer." }]);
    } finally {
      setQaLoading(false);
    }
  };

  const tabStyle = (t) => ({
    padding:"8px 20px", fontSize:13, cursor:"pointer",
    border:"none", background:"none",
    color: tab === t ? "var(--text)" : "var(--text2)",
    fontWeight: tab === t ? 500 : 400,
    borderBottom: tab === t ? "2px solid var(--text)" : "2px solid transparent",
    transition:"all 0.15s"
  });

  const isWorking = loading || qaLoading;

  return (
    <div style={{ maxWidth:740 }}>
      <div style={{ marginBottom:20 }}>
        <h1 style={{ fontSize:20, fontWeight:600 }}>AI assistant</h1>
        <p style={{ color:"var(--text2)", fontSize:13, marginTop:2 }}>Predictions, insights, and automation — all powered by Groq.</p>
      </div>

      <div style={{ display:"flex", borderBottom:"0.5px solid var(--border)", marginBottom:24, gap:0 }}>
        <button style={tabStyle("create")} onClick={() => setTab("create")}>Create workflow</button>
        <button style={tabStyle("ask")} onClick={() => setTab("ask")}>Sales Q&A</button>
        <button style={tabStyle("predict")} onClick={() => setTab("predict")}>Stock prediction</button>
        <button style={tabStyle("suggest")} onClick={() => setTab("suggest")}>Suggestions</button>
      </div>

      {/* ── Tab: Create workflow ── */}
      {tab === "create" && (
        <div>
          {history.length === 0 && (
            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:11, color:"var(--text3)", marginBottom:10, textTransform:"uppercase", letterSpacing:".04em", fontWeight:500 }}>Quick commands</div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                {NL_SUGGESTIONS.map((s,i) => (
                  <button key={i} onClick={() => setInput(s)} style={{
                    padding:"7px 13px", borderRadius:20, border:"0.5px solid var(--border2)",
                    background:"var(--surface)", color:"var(--text2)", fontSize:12, cursor:"pointer"
                  }}
                  onMouseEnter={e => { e.target.style.background = "var(--surface2)"; e.target.style.color = "var(--text)"; }}
                  onMouseLeave={e => { e.target.style.background = "var(--surface)"; e.target.style.color = "var(--text2)"; }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          <ChatHistory history={history} loading={loading} />
          <ChatInput
            value={input} onChange={setInput}
            onSubmit={handleCreateWorkflow}
            disabled={isWorking}
            placeholder="e.g. Notify me when stock drops below 5 units..."
            loading={loading}
          />
        </div>
      )}

      {/* ── Tab: Sales Q&A ── */}
      {tab === "ask" && (
        <div>
          {history.length === 0 && (
            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:11, color:"var(--text3)", marginBottom:10, textTransform:"uppercase", letterSpacing:".04em", fontWeight:500 }}>Ask about your store</div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                {QUICK_QUESTIONS.map((q,i) => (
                  <button key={i} onClick={() => handleAskQuestion(q)} style={{
                    padding:"7px 13px", borderRadius:20, border:"0.5px solid var(--border2)",
                    background:"var(--surface)", color:"var(--text2)", fontSize:12, cursor:"pointer"
                  }}
                  onMouseEnter={e => { e.target.style.background = "var(--surface2)"; e.target.style.color = "var(--text)"; }}
                  onMouseLeave={e => { e.target.style.background = "var(--surface)"; e.target.style.color = "var(--text2)"; }}>
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}
          <ChatHistory history={history} loading={qaLoading} />
          <ChatInput
            value={input} onChange={setInput}
            onSubmit={() => handleAskQuestion(null)}
            disabled={isWorking}
            placeholder="e.g. Why did sales drop yesterday? Which items are trending?"
            loading={qaLoading}
          />
        </div>
      )}

      {/* ── Tab: Stock prediction ── */}
      {tab === "predict" && <PredictionPanel />}

      {/* ── Tab: Suggestions ── */}
      {tab === "suggest" && (
        <SuggestionsPanel onUseCommand={(cmd) => { setTab("create"); setInput(cmd); }} />
      )}
    </div>
  );
}

function ChatHistory({ history, loading }) {
  if (history.length === 0 && !loading) return null;
  return (
    <div style={{ marginBottom:16, display:"flex", flexDirection:"column", gap:10 }}>
      {history.map((msg, i) => (
        <div key={i} style={{ display:"flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
          {msg.role === "user" && (
            <div style={{ background:"var(--accent)", color:"#fff", padding:"10px 14px", borderRadius:"12px 12px 2px 12px", fontSize:13, maxWidth:"80%" }}>{msg.text}</div>
          )}
          {(msg.role === "ai" || msg.role === "answer") && (
            <div style={{ maxWidth:"85%" }}>
              <div style={{ background:"var(--surface)", border:"0.5px solid var(--border)", padding:"10px 14px", borderRadius:"12px 12px 12px 2px", fontSize:13, lineHeight:1.7 }}>
                {msg.text}
              </div>
              {msg.workflow && <WorkflowCard wf={msg.workflow} />}
            </div>
          )}
          {msg.role === "error" && (
            <div style={{ background:"var(--danger-light)", border:"0.5px solid #f09595", color:"var(--danger)", padding:"10px 14px", borderRadius:"12px 12px 12px 2px", fontSize:13, maxWidth:"80%" }}>
              {msg.text}
            </div>
          )}
        </div>
      ))}
      {loading && (
        <div style={{ display:"flex", gap:8, padding:"8px 0", alignItems:"center" }}>
          <LoadingDots />
          <span style={{ fontSize:12, color:"var(--text3)" }}>Groq is thinking...</span>
        </div>
      )}
    </div>
  );
}

function ChatInput({ value, onChange, onSubmit, disabled, placeholder, loading }) {
  return (
    <div>
      <div style={{ background:"var(--surface)", border:"0.5px solid var(--border2)", borderRadius:"var(--radius-lg)", padding:"12px 14px", display:"flex", gap:10, alignItems:"flex-end" }}>
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSubmit(); } }}
          placeholder={placeholder}
          rows={2}
          style={{ flex:1, border:"none", outline:"none", resize:"none", background:"transparent", color:"var(--text)", fontSize:14, fontFamily:"DM Sans, sans-serif", lineHeight:1.6 }}
        />
        <button onClick={onSubmit} disabled={disabled || !value.trim()} style={{
          padding:"8px 18px", borderRadius:"var(--radius)", border:"none",
          background: disabled || !value.trim() ? "var(--border2)" : "var(--accent)",
          color:"#fff", fontWeight:500, cursor: disabled || !value.trim() ? "not-allowed" : "pointer",
          fontSize:13, flexShrink:0
        }}>
          {loading ? "Thinking..." : "Send"}
        </button>
      </div>
      <p style={{ fontSize:11, color:"var(--text3)", marginTop:6 }}>Enter to send · Shift+Enter for new line</p>
    </div>
  );
}