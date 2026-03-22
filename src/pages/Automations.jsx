import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import api from "../api/client";
import WorkflowVisualizer from "../components/WorkflowVisualizer";

const th = { fontSize: 11, color: "var(--text2)", fontWeight: 500, textAlign: "left", padding: "8px 12px", borderBottom: "0.5px solid var(--border)", textTransform: "uppercase", letterSpacing: ".04em" };
const td = { padding: "10px 12px", borderBottom: "0.5px solid var(--border)", fontSize: 13 };

const triggerColors = {
  inventory_update: ["#E1F5EE","#0F6E56"],
  cron_21_00:       ["#E6F1FB","#185FA5"],
  cron_09_00:       ["#E6F1FB","#185FA5"],
  scheduled_check:  ["#FAEEDA","#854F0B"],
  sales_update:     ["#EEEDFE","#534AB7"],
  order_created:    ["#FCEBEB","#A32D2D"],
};

export default function Automations() {
  const qc = useQueryClient();

  const { data: workflows = [] } = useQuery({
    queryKey: ["workflows"],
    queryFn: () => api.get("/workflows").then(r => r.data),
    refetchInterval: 10000
  });

  const { data: logs = [] } = useQuery({
    queryKey: ["logs"],
    queryFn: () => api.get("/logs?limit=30").then(r => r.data),
    refetchInterval: 10000
  });

  const toggleMutation = useMutation({
    mutationFn: (id) => api.patch(`/workflows/${id}/toggle`),
    onSuccess: () => { qc.invalidateQueries(["workflows"]); toast.success("Workflow updated"); }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/workflows/${id}`),
    onSuccess: () => { qc.invalidateQueries(["workflows"]); toast.success("Workflow deleted"); }
  });

  const [selectedWf, setSelectedWf] = useState(null);
  const [debugWfId, setDebugWfId] = useState("");
  const [debugResult, setDebugResult] = useState(null);
  const [debugLoading, setDebugLoading] = useState(false);

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600 }}>Automations</h1>
        <p style={{ color: "var(--text2)", fontSize: 13, marginTop: 2 }}>
          {workflows.filter(w => w.is_active).length} active · watchers running every 30s
        </p>
      </div>

      <div style={{ background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: "var(--radius-lg)", overflow: "hidden", marginBottom: 24 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>{["Name","Trigger","Condition","Actions","Last run","Status",""].map(h => <th key={h} style={th}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {workflows.length === 0 && (
              <tr><td colSpan={7} style={{ ...td, color: "var(--text3)", textAlign: "center", padding: 32 }}>
                No workflows yet — go to AI assistant to create one.
              </td></tr>
            )}
            {workflows.map(wf => {
              const [bg, color] = triggerColors[wf.trigger] || ["var(--surface2)","var(--text2)"];
              return (
                <tr key={wf.id}
                  onClick={() => setSelectedWf(selectedWf?.id === wf.id ? null : wf)}
                  style={{ cursor:"pointer" }}
                  onMouseEnter={e => e.currentTarget.style.background = "var(--surface2)"}
                  onMouseLeave={e => e.currentTarget.style.background = selectedWf?.id === wf.id ? "var(--surface2)" : "transparent"}>
                  <td style={{ ...td, fontWeight: 500 }}>
                    <div>{wf.name}</div>
                    {wf.description && <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>{wf.description}</div>}
                  </td>
                  <td style={td}>
                    <span style={{ background: bg, color, padding: "2px 8px", borderRadius: 10, fontSize: 11, fontWeight: 500 }}>{wf.trigger}</span>
                  </td>
                  <td style={{ ...td, fontFamily: "DM Mono, monospace", fontSize: 11, color: "var(--text2)" }}>
                    {wf.condition ? `${wf.condition.field} ${wf.condition.op} ${wf.condition.value}` : "—"}
                  </td>
                  <td style={td}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                      {wf.actions.map((a, i) => (
                        <span key={i} style={{ background: "var(--accent-light)", color: "var(--accent-dark)", padding: "1px 6px", borderRadius: 8, fontSize: 10, fontWeight: 500 }}>{a}</span>
                      ))}
                    </div>
                  </td>
                  <td style={{ ...td, fontSize: 11, color: "var(--text3)" }}>
                    {wf.last_run ? new Date(wf.last_run).toLocaleString("en-IN") : "Never"}
                  </td>
                  <td style={td}>
                    <span style={{
                      background: wf.is_active ? "var(--accent-light)" : "var(--surface2)",
                      color: wf.is_active ? "var(--accent-dark)" : "var(--text3)",
                      padding: "2px 9px", borderRadius: 20, fontSize: 11, fontWeight: 500
                    }}>{wf.is_active ? "Active" : "Paused"}</span>
                  </td>
                  <td style={td}>
                    <div style={{ display: "flex", gap: 5 }}>
                      <button onClick={() => toggleMutation.mutate(wf.id)} style={{ padding: "4px 9px", fontSize: 11, borderRadius: 4, cursor: "pointer", border: "0.5px solid var(--border2)", background: "var(--surface2)", color: "var(--text)" }}>
                        {wf.is_active ? "Pause" : "Activate"}
                      </button>
                      <button onClick={() => { if (confirm(`Delete "${wf.name}"?`)) deleteMutation.mutate(wf.id); }} style={{ padding: "4px 9px", fontSize: 11, borderRadius: 4, cursor: "pointer", border: "0.5px solid #f09595", background: "var(--danger-light)", color: "var(--danger)" }}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selectedWf && (
        <div style={{ background:"var(--surface)", border:"0.5px solid var(--border)", borderRadius:12, padding:20, marginBottom:24 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
            <div style={{ fontWeight:500, fontSize:14 }}>{selectedWf.name}</div>
            <button onClick={() => setSelectedWf(null)} style={{ border:"none", background:"none", color:"var(--text3)", cursor:"pointer", fontSize:18 }}>×</button>
          </div>
          <WorkflowVisualizer workflow={selectedWf} />
        </div>
      )}

      <div style={{ background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", borderBottom: "0.5px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text2)", textTransform: "uppercase", letterSpacing: ".04em" }}>Execution log</div>
          <div style={{ fontSize: 11, color: "var(--text3)" }}>Auto-refreshes every 10s</div>
        </div>
        {logs.length === 0 ? (
          <p style={{ padding: 24, color: "var(--text3)", fontSize: 13 }}>No executions yet. Watchers fire when conditions are met.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>{["Time","Workflow","Triggered by","Status","Message"].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id}
                  onMouseEnter={e => e.currentTarget.style.background = "var(--surface2)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <td style={{ ...td, fontSize: 11, color: "var(--text3)", whiteSpace: "nowrap" }}>
                    {new Date(log.created_at).toLocaleString("en-IN")}
                  </td>
                  <td style={{ ...td, fontSize: 12 }}>#{log.workflow_id}</td>
                  <td style={{ ...td, fontFamily: "DM Mono, monospace", fontSize: 11, color: "var(--text2)" }}>{log.triggered_by}</td>
                  <td style={td}>
                    <span style={{
                      background: log.status === "success" ? "var(--accent-light)" : "var(--danger-light)",
                      color: log.status === "success" ? "var(--accent-dark)" : "var(--danger)",
                      padding: "2px 8px", borderRadius: 10, fontSize: 11, fontWeight: 500
                    }}>{log.status}</span>
                  </td>
                  <td style={{ ...td, fontSize: 11, color: "var(--text2)", maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {log.message}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* AI Debugging Panel */}
      <div style={{ background:"var(--surface)", border:"0.5px solid var(--border)", borderRadius:12, padding:20, marginTop:16 }}>
        <div style={{ fontSize:12, fontWeight:500, color:"var(--text2)", textTransform:"uppercase", letterSpacing:".04em", marginBottom:4 }}>AI workflow debugger</div>
        <p style={{ fontSize:12, color:"var(--text3)", marginBottom:14 }}>
          Ask Groq to explain why a specific workflow fired or didn't fire as expected.
        </p>
        <div style={{ display:"flex", gap:8, marginBottom:16 }}>
          <select
            value={debugWfId}
            onChange={e => { setDebugWfId(e.target.value); setDebugResult(null); }}
            style={{ padding:"7px 10px", border:"0.5px solid var(--border2)", borderRadius:8, background:"var(--surface)", color:"var(--text)", fontSize:13, outline:"none", flex:1 }}>
            <option value="">Select a workflow to debug...</option>
            {workflows.map(wf => <option key={wf.id} value={wf.id}>#{wf.id} — {wf.name}</option>)}
          </select>
          <button
            onClick={async () => {
              if (!debugWfId) return;
              setDebugLoading(true);
              setDebugResult(null);
              try {
                const res = await api.get(`/reports/debug-workflow/${debugWfId}`);
                setDebugResult(res.data);
              } catch {
                toast.error("Debug request failed");
              } finally {
                setDebugLoading(false);
              }
            }}
            disabled={!debugWfId || debugLoading}
            style={{
              padding:"7px 18px", borderRadius:8, border:"none",
              background: !debugWfId || debugLoading ? "var(--border2)" : "var(--accent)",
              color:"#fff", fontWeight:500, cursor: !debugWfId || debugLoading ? "not-allowed" : "pointer", fontSize:13
            }}>
            {debugLoading ? "Analysing..." : "Debug"}
          </button>
        </div>

        {debugResult && (
          <div>
            <div style={{ display:"flex", gap:10, marginBottom:12, flexWrap:"wrap" }}>
              <span style={{ fontSize:12, color:"var(--text2)" }}>Workflow: <strong>{debugResult.workflow_name}</strong></span>
              <span style={{ fontSize:12, color:"var(--text2)" }}>Status: <strong style={{ color: debugResult.is_active ? "var(--accent)" : "var(--danger)" }}>{debugResult.is_active ? "Active" : "Paused"}</strong></span>
              <span style={{ fontSize:12, color:"var(--text2)" }}>Executions logged: <strong>{debugResult.log_count}</strong></span>
              <span style={{ fontSize:12, color:"var(--text2)" }}>Last run: <strong>{debugResult.last_run ? new Date(debugResult.last_run).toLocaleString("en-IN") : "Never"}</strong></span>
            </div>
            <div style={{
              background:"var(--surface2)", borderRadius:8, padding:"14px 16px",
              fontSize:13, lineHeight:1.8, borderLeft:"3px solid var(--accent)",
              borderRadius:"0 8px 8px 0"
            }}>
              {debugResult.explanation}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}